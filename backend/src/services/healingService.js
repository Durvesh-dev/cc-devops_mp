const fs = require("fs/promises");
const path = require("path");
const { publishSnsAlert, formatAnomalyAlert } = require("./snsService");
const { appendAnomaly, appendAlert, appendAutoHealing } = require("./dynamoStore");
const { state, pushCapped } = require("../utils/state");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const LOCAL_ALERTS_LOG = path.resolve(PROJECT_ROOT, "backend/logs/alerts.log");

const criticalIssueTypes = new Set(["disk-failure", "memory-pressure", "database-connection", "network-failure"]);

const LEVELS = new Set(["INFO", "WARN", "ERROR", "CRITICAL"]);

function resolveSeverity(logRecord) {
  // Use decision engine severity if available
  if (logRecord?.severity) return logRecord.severity;
  if (logRecord?.level === "CRITICAL") return "high";
  if (criticalIssueTypes.has(logRecord?.issueType)) return "high";
  if (logRecord?.level === "ERROR") return "medium";
  return "low";
}

function buildHealingPlan(serviceName = "") {
  const service = String(serviceName || "").toLowerCase();

  if (service.includes("database")) {
    return {
      action: "restart DB",
      reason: "Database anomaly detected",
      message: "Database service restarted automatically",
    };
  }

  if (service.includes("auth")) {
    return {
      action: "restart auth service",
      reason: "Authentication anomaly detected",
      message: "Auth service recovered",
    };
  }

  if (service.includes("payment")) {
    return {
      action: "retry transaction",
      reason: "Payment anomaly detected",
      message: "Payment transaction retried automatically",
    };
  }

  return {
    action: "restart app service",
    reason: "Service anomaly detected",
    message: "Application service recovered automatically",
  };
}

function normalizeSnsSeverity(logRecord, derivedSeverity) {
  const level = String(logRecord?.level || "").toUpperCase();
  if (LEVELS.has(level)) {
    return level;
  }

  if (derivedSeverity === "high") return "CRITICAL";
  if (derivedSeverity === "medium") return "ERROR";
  if (derivedSeverity === "low") return "WARN";
  return "INFO";
}

function shouldTriggerSns(snsSeverity) {
  return snsSeverity === "ERROR" || snsSeverity === "CRITICAL";
}

async function handleAnomaly(logRecord, prediction) {
  const severity = resolveSeverity(logRecord);
  const healingPlan = buildHealingPlan(logRecord.service);
  const snsSeverity = normalizeSnsSeverity(logRecord, severity);
  const timestamp = new Date().toISOString();
  const issueType = logRecord.issueType || "general-event";
  const incidentId = `${Date.now()}-incident-${Math.floor(Math.random() * 10000)}`;

  // Use the required alert format: 🚨 [SEVERITY] anomaly detected in [SERVICE]: [LOG]
  const alertText = formatAnomalyAlert(severity, logRecord.service, logRecord.log);

  const snsPayload = {
    service: logRecord.service,
    severity: snsSeverity,
    message: logRecord.log,
    timestamp,
  };

  let snsResult = { skipped: true, reason: `SNS trigger skipped for ${snsSeverity}` };
  if (shouldTriggerSns(snsSeverity)) {
    snsResult = await publishSnsAlert(
      JSON.stringify(snsPayload),
      `AI DevOps ${snsSeverity} Alert`,
    );
  }

  if (snsResult?.skipped || snsResult?.success === false) {
    await fs.mkdir(path.dirname(LOCAL_ALERTS_LOG), { recursive: true });
    await fs.appendFile(
      LOCAL_ALERTS_LOG,
      `${new Date().toISOString()} ${alertText}${snsResult?.reason ? ` | reason=${snsResult.reason}` : ""}\n`,
      "utf8",
    );
  }

  const action = {
    id: `${Date.now()}-heal-${Math.floor(Math.random() * 10000)}`,
    incidentId,
    action: healingPlan.action,
    reason: healingPlan.reason,
    message: healingPlan.message,
    service: logRecord.service,
    issueType,
    severity,
    time: timestamp,
  };

  pushCapped(state.autoHealingActions, action, 20);

  const alert = {
    id: `${Date.now()}-alert-${Math.floor(Math.random() * 10000)}`,
    incidentId,
    severity,
    service: logRecord.service,
    issueType,
    message: alertText,
    snsPayload,
    sns: snsResult,
    time: timestamp,
  };

  const anomalyRecord = {
    id: `${Date.now()}-anomaly-${Math.floor(Math.random() * 10000)}`,
    incidentId,
    logId: logRecord.id || `${Date.now()}-log`,
    service: logRecord.service,
    severity,
    confidence: prediction?.confidence ?? prediction?.anomaly_score ?? 0.5,
    issueType,
    timestamp,
  };

  await appendAnomaly(anomalyRecord);
  await appendAlert(alert);
  await appendAutoHealing(action);

  pushCapped(state.recentAlerts, alert, 20);

  return {
    alert,
    action,
  };
}

module.exports = {
  handleAnomaly,
};
