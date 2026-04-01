const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

function resolveTopicArn() {
  return process.env.ALERT_SNS_TOPIC_ARN || process.env.SNS_TOPIC_ARN || process.env.AWS_SNS_TOPIC_ARN || null;
}

function buildClientConfig() {
  const hasKeys = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  if (!region) return null;
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

function canUseSns() {
  return Boolean(buildClientConfig() && resolveTopicArn());
}

function getSnsStatus() {
  const topicArn = resolveTopicArn();
  return {
    configured: canUseSns(),
    topicArn: topicArn || null,
  };
}

/**
 * Format anomaly alert in the required format.
 * @param {string} severity - low | medium | high
 * @param {string} service - detected service name
 * @param {string} logText - raw log line
 * @returns {string}
 */
function formatAnomalyAlert(severity, service, logText) {
  const sev = (severity || "medium").toUpperCase();
  return `🚨 [${sev}] anomaly detected in [${service}]: ${logText}`;
}

/**
 * Publish a message to the configured SNS topic.
 */
async function publishSnsAlert(message, subject = "AI DevOps Anomaly Alert") {
  const topicArn = resolveTopicArn();
  const config = buildClientConfig();
  if (!config) {
    return { skipped: true, reason: "AWS region not configured" };
  }
  if (!topicArn) {
    return { skipped: true, reason: "SNS topic not configured" };
  }

  const snsClient = new SNSClient(config);
  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: message,
    Subject: subject,
  });

  try {
    const response = await snsClient.send(command);
    return { skipped: false, success: true, messageId: response.MessageId };
  } catch (error) {
    return { skipped: false, success: false, error: error.message };
  }
}

module.exports = {
  publishSnsAlert,
  formatAnomalyAlert,
  canUseSns,
  getSnsStatus,
};
