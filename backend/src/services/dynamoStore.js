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

function envTruthy(value) {
  if (value == null) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(value).trim().toLowerCase());
}

function shouldUseMemoryStore() {
  return envTruthy(process.env.USE_IN_MEMORY_STORE) || envTruthy(process.env.LOCAL_MODE);
}

function shouldFallbackToMemoryOnError() {
  if (process.env.DYNAMO_FALLBACK_TO_MEMORY != null) {
    return envTruthy(process.env.DYNAMO_FALLBACK_TO_MEMORY);
  }
  return String(process.env.NODE_ENV || "development").toLowerCase() !== "production";
}

let mode = shouldUseMemoryStore() ? "memory" : "dynamo";
let dynamoClients = null;
let memoryTables = null;

function getDynamoClients() {
  if (dynamoClients) return dynamoClients;
  const ddbClient = new DynamoDBClient(buildClientConfig());
  const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
  dynamoClients = { ddbClient, docClient };
  return dynamoClients;
}

function getMemoryTables() {
  if (memoryTables) return memoryTables;
  memoryTables = {
    [TABLES.logs]: new Map(),
    [TABLES.anomalies]: new Map(),
    [TABLES.alerts]: new Map(),
    [TABLES.autoHealing]: new Map(),
  };
  return memoryTables;
}

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
  const { ddbClient } = getDynamoClients();
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
  const { ddbClient } = getDynamoClients();
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
  if (mode === "memory") {
    getMemoryTables();
    console.log("[Store] Using in-memory tables (DynamoDB disabled)");
    return;
  }

  const tableNames = Object.values(TABLES);
  try {
    for (const tableName of tableNames) {
      await ensureTable(tableName);
    }
    console.log(`[DynamoDB] Tables ready: ${tableNames.join(", ")}`);
  } catch (error) {
    if (!shouldFallbackToMemoryOnError()) {
      throw error;
    }

    console.warn(`[DynamoDB] Unavailable (${error.message}); falling back to in-memory store`);
    mode = "memory";
    getMemoryTables();
  }
}

async function putItem(tableName, item) {
  if (mode === "memory") {
    const tables = getMemoryTables();
    const table = tables[tableName] || (tables[tableName] = new Map());
    table.set(item.id, { ...item });
    return;
  }

  const { docClient } = getDynamoClients();
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
  if (mode === "memory") {
    const tables = getMemoryTables();
    const table = tables[tableName];
    const items = table ? Array.from(table.values()) : [];
    return items
      .sort((a, b) => getTimeValue(b) - getTimeValue(a))
      .slice(0, limit);
  }

  const { docClient } = getDynamoClients();
  const items = [];
  let lastEvaluatedKey;

  do {
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (response.Items?.length) {
      items.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

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
  if (mode === "memory") {
    const tables = getMemoryTables();
    const table = tables[tableName];
    return table ? table.size : 0;
  }

  const { docClient } = getDynamoClients();
  let total = 0;
  let lastEvaluatedKey;

  do {
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        Select: "COUNT",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    total += response.Count || 0;
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return total;
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
