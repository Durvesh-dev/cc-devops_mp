const fs = require("fs/promises");
const path = require("path");
const { sendLog } = require("../services/cloudwatchService");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const DEFAULT_LOG_PATH = path.resolve(PROJECT_ROOT, "backend/logs/app.log");

const LEVELS = ["INFO", "WARN", "ERROR", "CRITICAL"];

const SERVICE_CATALOG = [
  {
    key: "database",
    serviceName: "database-service",
    messages: {
      INFO: ["query completed in 42ms", "read replica sync complete"],
      WARN: ["slow query detected (p95=840ms)", "connection pool nearing capacity"],
      ERROR: ["connection refused", "query execution failed"],
      CRITICAL: ["primary node crash detected", "storage engine corrupt pages detected"],
    },
  },
  {
    key: "auth",
    serviceName: "auth-service",
    messages: {
      INFO: ["token issued for session refresh", "login request validated"],
      WARN: ["token refresh timeout threshold exceeded", "multiple failed login attempts"],
      ERROR: ["token validation failed", "authentication service timeout"],
      CRITICAL: ["auth service crash loop detected", "identity provider unreachable"],
    },
  },
  {
    key: "payment",
    serviceName: "payment-service",
    messages: {
      INFO: ["payment authorization accepted", "settlement batch processed"],
      WARN: ["gateway retry due to latency", "transaction queue delayed"],
      ERROR: ["payment failed with processor timeout", "transaction failed: connection reset"],
      CRITICAL: ["payment processor crash detected", "critical settlement mismatch"],
    },
  },
  {
    key: "server",
    serviceName: "app-service",
    messages: {
      INFO: ["health check passed", "request served successfully"],
      WARN: ["high memory usage warning", "worker restart recommended"],
      ERROR: ["internal server error during request", "upstream timeout on dependency"],
      CRITICAL: ["application server crash", "kernel panic signal received"],
    },
  },
];

let timer = null;
let isRunning = false;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randomInt(0, list.length - 1)];
}

function pickLevel() {
  const roll = Math.random();
  if (roll < 0.55) return "INFO";
  if (roll < 0.78) return "WARN";
  if (roll < 0.94) return "ERROR";
  return "CRITICAL";
}

function buildLogLine() {
  const selectedService = pick(SERVICE_CATALOG);
  const level = pickLevel();
  const messagePool = selectedService.messages[level] || selectedService.messages.INFO;
  const message = pick(messagePool);

  return `${new Date().toISOString()} ${level} [${selectedService.serviceName}] ${message}`;
}

async function ensureLogFile(logFilePath) {
  const logDir = path.dirname(logFilePath);
  await fs.mkdir(logDir, { recursive: true });
  try {
    await fs.access(logFilePath);
  } catch (_error) {
    await fs.writeFile(logFilePath, "", "utf8");
  }
}

async function appendGeneratedLog(logFilePath) {
  const line = buildLogLine();

  // 1. Save locally (existing)
  await fs.appendFile(logFilePath, line + "\n", "utf8");

  // 2. Send to CloudWatch (NEW)
  try {
    console.log(`[CloudWatch] Preparing to send generated log: ${line}`);
    await sendLog(line);
    console.log("[CloudWatch] Generated log sent successfully");
  } catch (error) {
    console.error(`[CloudWatch] Failed to send log: ${error.message}`);
  }
}

function scheduleNext(logFilePath) {
  if (!isRunning) {
    return;
  }

  const delayMs = randomInt(3000, 5000);
  timer = setTimeout(async () => {
    try {
      await appendGeneratedLog(logFilePath);
    } catch (error) {
      console.error(`[LogGenerator] Failed to append log: ${error.message}`);
    } finally {
      scheduleNext(logFilePath);
    }
  }, delayMs);
}

async function startLogGenerator() {
  if (isRunning) {
    return { started: false, reason: "already-running" };
  }

  const logFilePath = process.env.LOG_FILE_PATH
    ? path.resolve(PROJECT_ROOT, process.env.LOG_FILE_PATH)
    : DEFAULT_LOG_PATH;

  await ensureLogFile(logFilePath);
  isRunning = true;
  scheduleNext(logFilePath);

  console.log(`[LogGenerator] Autonomous log generation active: ${logFilePath}`);
  return { started: true, filePath: logFilePath };
}

function stopLogGenerator() {
  if (!isRunning) {
    return;
  }
  isRunning = false;
  clearTimeout(timer);
  timer = null;
  console.log("[LogGenerator] Stopped");
}

module.exports = {
  startLogGenerator,
  stopLogGenerator,
};
