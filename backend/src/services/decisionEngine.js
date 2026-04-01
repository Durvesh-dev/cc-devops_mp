const { inferLogMeta } = require("../utils/logClassifier");

/**
 * Severity mapping from detected level to alert severity.
 */
const SEVERITY_MAP = {
  CRITICAL: "high",
  ERROR: "medium",
  WARN: "low",
  INFO: "normal",
};

const RULE_KEYWORDS = ["error", "failed", "timeout", "crash"];

const ISSUE_TITLES = {
  "database-connection": "⚠️ Database Connection Issue Detected",
  timeout: "⚠️ Service Timeout Pattern Detected",
  "memory-pressure": "⚠️ Memory Pressure Issue Detected",
  "disk-failure": "🚨 Disk Failure Risk Detected",
  "network-failure": "⚠️ Network Connectivity Issue Detected",
  "auth-failure": "⚠️ Authentication Issue Detected",
  "transaction-failure": "⚠️ Payment Transaction Issue Detected",
  "general-event": "⚠️ Unusual System Behavior Detected",
};

const ISSUE_ACTIONS = {
  "database-connection": ["Restart database service", "Check connection pool"],
  timeout: ["Scale service replicas", "Inspect upstream latency"],
  "memory-pressure": ["Restart impacted pod/service", "Review memory usage trend"],
  "disk-failure": ["Failover to healthy node", "Run storage integrity checks"],
  "network-failure": ["Validate DNS and routing", "Check security group/network ACL rules"],
  "auth-failure": ["Validate token service", "Check auth provider connectivity"],
  "transaction-failure": ["Retry payment queue safely", "Check payment processor status"],
  "general-event": ["Inspect recent logs for context", "Validate service health checks"],
};

function toNumber(value, fallback = 0.5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function hasRuleBasedAnomaly(logText) {
  const text = String(logText || "").toLowerCase();
  return RULE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function buildConfidence(mlSignal, ruleSignal, level) {
  const baseByLevel = {
    CRITICAL: 0.95,
    ERROR: 0.8,
    WARN: 0.55,
    INFO: 0.25,
  };

  if (mlSignal || ruleSignal) {
    const mlConfidence = mlSignal ? 0.86 : 0.52;
    const ruleBoost = ruleSignal ? 0.1 : 0;
    return clamp01(mlConfidence + ruleBoost);
  }

  return baseByLevel[level] || 0.35;
}

function getIssueTitle(issueType, service, anomaly) {
  if (!anomaly) {
    return "✅ System Operating Normally";
  }

  if (ISSUE_TITLES[issueType]) {
    return ISSUE_TITLES[issueType];
  }

  const readableService = String(service || "service")
    .replace("-service", "")
    .replace("app", "server");

  return `⚠️ ${readableService.charAt(0).toUpperCase() + readableService.slice(1)} Service Issue Detected`;
}

function getSuggestedActions(issueType, anomaly) {
  if (!anomaly) {
    return ["Continue monitoring", "No immediate action needed"];
  }

  return ISSUE_ACTIONS[issueType] || [
    "Check service logs for details",
    "Verify infrastructure health",
  ];
}

/**
 * Autonomous log classification — no user input needed.
 * Detects service, severity, and issueType from raw log text.
 *
 * @param {string} logText - Raw log line
 * @returns {{ service: string, severity: string, issueType: string, level: string, statusCode: number }}
 */
function classifyLog(logText) {
  const meta = inferLogMeta(logText);
  return {
    service: meta.service,
    severity: SEVERITY_MAP[meta.level] || "low",
    issueType: meta.issueType,
    level: meta.level,
    statusCode: meta.statusCode,
  };
}

/**
 * Build final autonomous decision from log text + ML output + rule fallback.
 * anomaly = ML OR rule-based
 */
function buildDecision(logText, mlPrediction = null) {
  const classified = classifyLog(logText);
  const mlSignal = Boolean(mlPrediction?.is_anomaly || mlPrediction?.anomaly === 1);
  const ruleSignal = hasRuleBasedAnomaly(logText);
  const anomaly = mlSignal || ruleSignal;

  const confidence = clamp01(
    Math.max(
      buildConfidence(mlSignal, ruleSignal, classified.level),
      toNumber(mlPrediction?.anomaly_score, 0),
    ),
  );

  return {
    service: classified.service,
    severity: classified.severity,
    issueType: classified.issueType,
    confidence,
    anomaly,
    issueTitle: getIssueTitle(classified.issueType, classified.service, anomaly),
    suggestedActions: getSuggestedActions(classified.issueType, anomaly),
    level: classified.level,
    statusCode: classified.statusCode,
    signals: {
      ml: mlSignal,
      rule: ruleSignal,
    },
  };
}

module.exports = {
  classifyLog,
  buildDecision,
  hasRuleBasedAnomaly,
};
