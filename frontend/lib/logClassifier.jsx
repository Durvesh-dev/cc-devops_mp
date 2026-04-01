const servicePatterns = [
  { key: "transaction", service: "payment-service" },
  { key: "payment", service: "payment-service" },
  { key: "checkout", service: "checkout-service" },
  { key: "auth", service: "auth-service" },
  { key: "inventory", service: "inventory-service" },
  { key: "cache", service: "cache-service" },
  { key: "db", service: "database-service" },
  { key: "database", service: "database-service" },
  { key: "api", service: "api-gateway" },
];

const issuePatterns = [
  { type: "transaction-failure", keywords: ["transaction failure", "transaction failed", "payment failed", "payment decline"] },
  { type: "disk-failure", keywords: ["disk failure", "i/o", "corrupt", "storage"] },
  { type: "database-connection", keywords: ["db", "database", "connection refused", "sql"] },
  { type: "timeout", keywords: ["timeout", "timed out", "latency spike"] },
  { type: "memory-pressure", keywords: ["memory", "out of memory", "oom"] },
  { type: "auth-failure", keywords: ["auth", "unauthorized", "forbidden", "token"] },
  { type: "network-failure", keywords: ["unreachable", "network", "dns", "socket"] },
];

const criticalKeywords = ["critical", "disk failure", "corrupt", "out of memory", "service down", "panic", "crash", "data loss"];
const errorKeywords = ["error", "failure", "failed", "exception", "timeout", "refused", "unreachable"];
const warnKeywords = ["warn", "warning", "degraded", "retry"];

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferStatusCode(level, issueType) {
  if (issueType === "auth-failure") return 401;
  if (level === "CRITICAL" || level === "ERROR") return 500;
  if (level === "WARN") return 429;
  return 200;
}

export function inferLogMeta(rawText = "") {
  const text = String(rawText).toLowerCase();
  const service = servicePatterns.find(({ key }) => text.includes(key))?.service || "app-service";
  const issueType = issuePatterns.find(({ keywords }) => includesAny(text, keywords))?.type || "general-event";

  let level = "INFO";
  if (includesAny(text, criticalKeywords)) level = "CRITICAL";
  else if (includesAny(text, ["unauthorized", "forbidden", "denied", "invalid token", "token expired"])) level = "ERROR";
  else if (includesAny(text, errorKeywords)) level = "ERROR";
  else if (includesAny(text, warnKeywords)) level = "WARN";

  return {
    service,
    issueType,
    level,
    statusCode: inferStatusCode(level, issueType),
  };
}
