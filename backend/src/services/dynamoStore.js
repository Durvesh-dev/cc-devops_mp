const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION || "ap-south-1";

const TABLES = {
  logs: process.env.LOGS_TABLE || "LogsTable",
  anomalies: process.env.ANOMALIES_TABLE || "AnomaliesTable",
  alerts: process.env.ALERTS_TABLE || "AlertsTable",
  autoHealing: process.env.AUTO_HEALING_TABLE || "AutoHealingTable",
};

function buildClientConfig() {
  const hasKeys = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
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

const ddbClient = new DynamoDBClient(buildClientConfig());
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

function nowIso() {
  return new Date().toISOString();
}

function getTimeValue(item) {
  return new Date(item?.timestamp || item?.time || 0).getTime();
}

function buildCreateTableCommand(tableName) {
  return new CreateTableCommand({
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH",
      },
    ],
  });
}

async function waitForTableActive(tableName, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const described = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
      if (described?.Table?.TableStatus === "ACTIVE") {
        return;
      }
    } catch (_error) {
      // no-op while waiting for eventual consistency
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for table to become ACTIVE: ${tableName}`);
}

async function ensureTable(tableName) {
  try {
    const described = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
    if (described?.Table?.TableStatus !== "ACTIVE") {
      await waitForTableActive(tableName);
    }
    return;
  } catch (error) {
    if (error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  await ddbClient.send(buildCreateTableCommand(tableName));
  await waitForTableActive(tableName);
}

async function ensureDynamoTables() {
  const tableNames = Object.values(TABLES);
  for (const tableName of tableNames) {
    await ensureTable(tableName);
  }
  console.log(`[DynamoDB] Tables ready: ${tableNames.join(", ")}`);
}

async function putItem(tableName, item) {
  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

async function appendLog(logRecord) {
  const item = {
    id: logRecord.id,
    timestamp: logRecord.timestamp || nowIso(),
    service: logRecord.service,
    level: logRecord.level,
    message: logRecord.log,
    issueType: logRecord.issueType,
    severity: logRecord.severity,
    confidence: logRecord.confidence,
    anomaly: logRecord.anomaly,
    statusCode: logRecord.statusCode,
    responseTimeMs: logRecord.responseTimeMs,
    source: logRecord.source,
  };

  await putItem(TABLES.logs, item);
}

async function appendAnomaly(anomalyRecord) {
  const item = {
    id: anomalyRecord.id,
    logId: anomalyRecord.logId,
    service: anomalyRecord.service,
    severity: anomalyRecord.severity,
    confidence: anomalyRecord.confidence,
    issueType: anomalyRecord.issueType,
    timestamp: anomalyRecord.timestamp || nowIso(),
  };

  await putItem(TABLES.anomalies, item);
}

async function appendAlert(alertRecord) {
  const item = {
    id: alertRecord.id,
    service: alertRecord.service,
    severity: alertRecord.severity,
    message: alertRecord.message,
    time: alertRecord.time || nowIso(),
    issueType: alertRecord.issueType,
    sns: alertRecord.sns,
    snsPayload: alertRecord.snsPayload,
  };

  await putItem(TABLES.alerts, item);
}

async function appendAutoHealing(autoHealingRecord) {
  const item = {
    id: autoHealingRecord.id,
    service: autoHealingRecord.service,
    action: autoHealingRecord.action,
    message: autoHealingRecord.message,
    reason: autoHealingRecord.reason,
    time: autoHealingRecord.time || nowIso(),
    severity: autoHealingRecord.severity,
  };

  await putItem(TABLES.autoHealing, item);
}

async function readRecentFromTable(tableName, limit = 50) {
  const response = await docClient.send(new ScanCommand({ TableName: tableName }));
  const items = response.Items || [];

  return items
    .sort((a, b) => getTimeValue(b) - getTimeValue(a))
    .slice(0, limit);
}

async function readRecentLogs(limit = 100) {
  const items = await readRecentFromTable(TABLES.logs, limit);
  return items.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    service: item.service,
    level: item.level,
    issueType: item.issueType,
    severity: item.severity,
    confidence: item.confidence,
    anomaly: item.anomaly,
    statusCode: item.statusCode,
    responseTimeMs: item.responseTimeMs,
    source: item.source,
    log: item.message,
  }));
}

async function readRecentAlerts(limit = 20) {
  return readRecentFromTable(TABLES.alerts, limit);
}

async function readRecentAnomalies(limit = 50) {
  return readRecentFromTable(TABLES.anomalies, limit);
}

async function readRecentAutoHealing(limit = 20) {
  return readRecentFromTable(TABLES.autoHealing, limit);
}

async function countTable(tableName) {
  const response = await docClient.send(new ScanCommand({ TableName: tableName, Select: "COUNT" }));
  return response.Count || 0;
}

async function countLogs() {
  return countTable(TABLES.logs);
}

async function countAnomalies() {
  return countTable(TABLES.anomalies);
}

async function countAlerts() {
  return countTable(TABLES.alerts);
}

async function countAutoHealing() {
  return countTable(TABLES.autoHealing);
}

module.exports = {
  TABLES,
  ensureDynamoTables,
  appendLog,
  appendAnomaly,
  appendAlert,
  appendAutoHealing,
  readRecentLogs,
  readRecentAlerts,
  readRecentAnomalies,
  readRecentAutoHealing,
  countLogs,
  countAnomalies,
  countAlerts,
  countAutoHealing,
};
