const AWS = require("aws-sdk");

const region = process.env.AWS_REGION || "ap-south-1";

AWS.config.update({
  region,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const cloudwatchlogs = new AWS.CloudWatchLogs({ region });

let sequenceToken = null;
let isInitialized = false;
let initPromise = null;
let sendQueue = Promise.resolve();

function getConfig() {
  const logGroupName = process.env.LOG_GROUP;
  const logStreamName = process.env.LOG_STREAM;

  if (!logGroupName || !logStreamName) {
    throw new Error("Missing CloudWatch config: LOG_GROUP and LOG_STREAM are required");
  }

  return { logGroupName, logStreamName };
}

function extractExpectedToken(error) {
  if (error?.expectedSequenceToken) {
    return error.expectedSequenceToken;
  }

  const message = String(error?.message || "");
  const match = message.match(/(?:next\s+)?expected\s+sequenceToken\s+is:?\s*([A-Za-z0-9\/_\-]+)/i);
  return match ? match[1] : null;
}

async function refreshSequenceToken(logGroupName, logStreamName) {
  const describeParams = {
    logGroupName,
    logStreamNamePrefix: logStreamName,
    limit: 50,
  };

  const described = await cloudwatchlogs.describeLogStreams(describeParams).promise();
  const stream = (described.logStreams || []).find((item) => item.logStreamName === logStreamName);

  if (!stream) {
    return null;
  }

  return stream.uploadSequenceToken || null;
}

async function ensureLogStream() {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const { logGroupName, logStreamName } = getConfig();

    try {
      sequenceToken = await refreshSequenceToken(logGroupName, logStreamName);
    } catch (error) {
      if (error.code === "AccessDeniedException" || error.code === "UnrecognizedClientException") {
        console.warn("[CloudWatch] DescribeLogStreams not allowed; proceeding without initial sequence token");
        sequenceToken = null;
        isInitialized = true;
        return;
      }

      if (error.code !== "ResourceNotFoundException") {
        throw error;
      }

      await cloudwatchlogs.createLogGroup({ logGroupName }).promise().catch((createErr) => {
        if (createErr.code !== "ResourceAlreadyExistsException") {
          throw createErr;
        }
      });

      await cloudwatchlogs.createLogStream({ logGroupName, logStreamName }).promise().catch((createErr) => {
        if (createErr.code !== "ResourceAlreadyExistsException") {
          throw createErr;
        }
      });

      sequenceToken = await refreshSequenceToken(logGroupName, logStreamName);
    }

    isInitialized = true;
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

async function putLogEventWithRetry(message, retryCount = 2) {
  const { logGroupName, logStreamName } = getConfig();

  const params = {
    logGroupName,
    logStreamName,
    logEvents: [
      {
        message,
        timestamp: Date.now(),
      },
    ],
  };

  if (sequenceToken) {
    params.sequenceToken = sequenceToken;
  }

  try {
    const res = await cloudwatchlogs.putLogEvents(params).promise();
    sequenceToken = res.nextSequenceToken || sequenceToken;
    console.log(`[CloudWatch] Sent log to ${logGroupName}/${logStreamName}`);
    return res;
  } catch (err) {
    const retriable = err.code === "InvalidSequenceTokenException" || err.code === "DataAlreadyAcceptedException";
    if (retriable && retryCount > 0) {
      const expected = extractExpectedToken(err);
      if (expected) {
        sequenceToken = expected;
      } else {
        try {
          sequenceToken = await refreshSequenceToken(logGroupName, logStreamName);
        } catch (tokenError) {
          if (tokenError.code === "AccessDeniedException") {
            throw new Error(
              "Missing CloudWatch permission: logs:DescribeLogStreams. Add permission or ensure InvalidSequenceTokenException includes expected token.",
            );
          }
          throw tokenError;
        }
      }
      return putLogEventWithRetry(message, retryCount - 1);
    }

    if (err.code === "ResourceNotFoundException" && retryCount > 0) {
      isInitialized = false;
      await ensureLogStream();
      return putLogEventWithRetry(message, retryCount - 1);
    }

    throw err;
  }
}

async function sendLog(message) {
  // Serialize sends so sequenceToken always stays in sync.
  sendQueue = sendQueue.catch(() => undefined).then(async () => {
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    console.log(`[CloudWatch] Sending log: ${payload}`);

    await ensureLogStream();

    try {
      return await putLogEventWithRetry(payload);
    } catch (err) {
      console.error(`[CloudWatch] Failed to send log: ${err.code || "Error"} ${err.message}`);
      throw err;
    }
  });

  return sendQueue;
}

module.exports = {
  sendLog,
};
