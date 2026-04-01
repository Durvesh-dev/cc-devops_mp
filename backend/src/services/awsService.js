const path = require("path");
const fs = require("fs/promises");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

// Re-export SNS functions from snsService for backward compatibility
const { publishSnsAlert, formatAnomalyAlert, getSnsStatus } = require("./snsService");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const bucketName = process.env.S3_BUCKET_NAME;
const topicArn = process.env.SNS_TOPIC_ARN;
const modelBucketName = process.env.MODEL_S3_BUCKET || bucketName;
const modelKey = process.env.MODEL_S3_KEY;
const localModelPath = process.env.MODEL_PATH
  ? path.resolve(PROJECT_ROOT, process.env.MODEL_PATH)
  : path.resolve(PROJECT_ROOT, "ml-model/model/model.pkl");

const modelSyncState = {
  status: "not-started",
  source: "local",
  localPath: localModelPath,
  bucket: modelBucketName || null,
  key: modelKey || null,
  lastSyncedAt: null,
  error: null,
};

function buildClientConfig() {
  const hasKeys = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

  if (!region) {
    return null;
  }

  if (hasKeys) {
    return {
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
  }

  return { region };
}

function canUseAws() {
  return Boolean(buildClientConfig());
}

function getAwsIntegrationStatus() {
  return {
    enabled: canUseAws(),
    region: region || null,
    s3: {
      configured: Boolean(bucketName),
      bucketName: bucketName || null,
    },
    sns: getSnsStatus(),
    modelStore: {
      configured: Boolean(modelBucketName && modelKey),
      bucketName: modelBucketName || null,
      key: modelKey || null,
      localPath: localModelPath,
    },
  };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function syncModelFromS3() {
  if (!canUseAws()) {
    modelSyncState.status = "skipped";
    modelSyncState.source = "local";
    modelSyncState.error = "AWS region not configured";
    return { skipped: true, reason: modelSyncState.error };
  }

  if (!modelBucketName || !modelKey) {
    modelSyncState.status = "skipped";
    modelSyncState.source = "local";
    modelSyncState.error = "MODEL_S3_BUCKET or MODEL_S3_KEY not configured";
    return { skipped: true, reason: modelSyncState.error };
  }

  const s3Client = new S3Client(buildClientConfig());
  const command = new GetObjectCommand({
    Bucket: modelBucketName,
    Key: modelKey,
  });

  try {
    const response = await s3Client.send(command);
    const bodyBuffer = await streamToBuffer(response.Body);

    await fs.mkdir(path.dirname(localModelPath), { recursive: true });
    await fs.writeFile(localModelPath, bodyBuffer);

    modelSyncState.status = "ready";
    modelSyncState.source = "s3";
    modelSyncState.error = null;
    modelSyncState.lastSyncedAt = new Date().toISOString();

    return {
      skipped: false,
      success: true,
      source: "s3",
      bucket: modelBucketName,
      key: modelKey,
      localPath: localModelPath,
      lastSyncedAt: modelSyncState.lastSyncedAt,
    };
  } catch (error) {
    modelSyncState.status = "error";
    modelSyncState.source = "local";
    modelSyncState.error = error.message;
    return {
      skipped: false,
      success: false,
      source: "local",
      error: error.message,
      localPath: localModelPath,
    };
  }
}

function getModelSyncStatus() {
  return { ...modelSyncState };
}

async function uploadLogToS3(logPayload) {
  if (!canUseAws()) {
    return { skipped: true, reason: "AWS region not configured" };
  }

  if (!bucketName) {
    return { skipped: true, reason: "S3 bucket not configured" };
  }

  const s3Client = new S3Client(buildClientConfig());
  const key = `logs/${new Date().toISOString()}.json`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: JSON.stringify(logPayload),
    ContentType: "application/json",
  });

  try {
    await s3Client.send(command);
    return { skipped: false, success: true, key };
  } catch (error) {
    return {
      skipped: false,
      success: false,
      error: error.message,
      key,
    };
  }
}

module.exports = {
  uploadLogToS3,
  publishSnsAlert,
  formatAnomalyAlert,
  getAwsIntegrationStatus,
  syncModelFromS3,
  getModelSyncStatus,
};
