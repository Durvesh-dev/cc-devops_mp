const SERVICE_PATTERNS = [
  { key: "transaction", service: "payment-service" },
  { key: "payment", service: "payment-service" },
  { key: "checkout", service: "checkout-service" },
  { key: "auth", service: "auth-service" },
  { key: "inventory", service: "inventory-service" },
  { key: "cache", service: "cache-service" },
  { key: "db", service: "database-service" },
  { key: "database", service: "database-service" },
  { key: "server", service: "app-service" },
  { key: "app-service", service: "app-service" },
  { key: "api", service: "api-gateway" },
];

const ISSUE_PATTERNS = [
  { type: "transaction-failure", keywords: ["transaction failure", "transaction failed", "payment failed", "payment decline"] },
  { type: "disk-failure", keywords: ["disk failure", "i/o", "corrupt", "storage"] },
  { type: "database-connection", keywords: ["db", "database", "connection refused", "sql"] },
  { type: "timeout", keywords: ["timeout", "timed out", "latency spike"] },
  { type: "memory-pressure", keywords: ["memory", "out of memory", "oom"] },
  { type: "auth-failure", keywords: ["auth", "unauthorized", "forbidden", "token"] },
  { type: "network-failure", keywords: ["unreachable", "network", "dns", "socket"] },
];

const CRITICAL_KEYWORDS = [
  "critical",
  "disk failure",
  "corrupt",
  "out of memory",
  "service down",
  "panic",
  "crash",
  "data loss",
];

const ERROR_KEYWORDS = ["error", "failure", "failed", "exception", "timeout", "refused", "unreachable"];
const WARN_KEYWORDS = ["warn", "warning", "degraded", "retry"];

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectService(text) {
  const match = SERVICE_PATTERNS.find(({ key }) => text.includes(key));
  return match ? match.service : "app-service";
}

function detectIssueType(text) {
  const match = ISSUE_PATTERNS.find(({ keywords }) => includesAny(text, keywords));
  return match ? match.type : "general-event";
}

function detectLevel(text) {
  if (includesAny(text, CRITICAL_KEYWORDS)) return "CRITICAL";
  if (includesAny(text, ["unauthorized", "forbidden", "denied", "invalid token", "token expired"])) return "ERROR";
  if (includesAny(text, ERROR_KEYWORDS)) return "ERROR";
  if (includesAny(text, WARN_KEYWORDS)) return "WARN";
  return "INFO";
}

function inferStatusCode(level, issueType) {
  if (issueType === "auth-failure") return 401;
  if (level === "CRITICAL" || level === "ERROR") return 500;
  if (level === "WARN") return 429;
  return 200;
}

function inferLogMeta(rawText = "") {
  const text = String(rawText).toLowerCase();
  const issueType = detectIssueType(text);
  const level = detectLevel(text);
  return {
    level,
    service: detectService(text),
    issueType,
    statusCode: inferStatusCode(level, issueType),
  };
}

module.exports = {
  inferLogMeta,
};
