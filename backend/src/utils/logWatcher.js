const fs = require("fs");
const path = require("path");
const { buildDecision } = require("../services/decisionEngine");
const { predictLog } = require("../services/mlService");
const { handleAnomaly } = require("../services/healingService");
const { computeSystemHealth } = require("../services/healthService");
const { appendLog } = require("../services/logStore");
const { state, registerLog, registerPrediction, emitEvent } = require("./state");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const DEFAULT_LOG_PATH = path.resolve(PROJECT_ROOT, "backend/logs/app.log");

let watchAbortController = null;
let currentOffset = 0;
let partialLineBuffer = "";

/**
 * Build a log record from a raw log line using the decision engine.
 */
function buildLogRecord(logText, decision) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    service: decision.service,
    level: decision.level,
    issueType: decision.issueType,
    severity: decision.severity,
    confidence: decision.confidence,
    anomaly: decision.anomaly,
    statusCode: decision.statusCode,
    responseTimeMs: 0,
    log: logText,
    timestamp: new Date().toISOString(),
    source: "file-watcher",
  };
}

/**
 * Process a single log line through the full autonomous pipeline:
 * classify → store → ML predict → anomaly handling → SSE push
 */
async function processLogLine(logText) {
  try {
    const mlPrediction = await predictLog(logText);
    const decision = buildDecision(logText, mlPrediction);
    const finalPrediction = {
      ...mlPrediction,
      is_anomaly: decision.anomaly,
      anomaly: decision.anomaly ? 1 : 0,
      confidence: decision.confidence,
      decision,
      service: decision.service,
      severity: decision.severity,
      issueType: decision.issueType,
    };

    const logRecord = buildLogRecord(logText, decision);

    // Store log
    await appendLog(logRecord);
    registerLog(logRecord);

    // Emit log event to SSE clients
    emitEvent("log", logRecord);

    // ML prediction
    registerPrediction(finalPrediction, { anomalyOverride: decision.anomaly });
    emitEvent("prediction", { ...finalPrediction, logId: logRecord.id });

    // Handle anomaly
    if (decision.anomaly) {
      const workflow = await handleAnomaly(logRecord, finalPrediction);
      emitEvent("alert", workflow.alert);
      if (workflow?.action) {
        emitEvent("healing", workflow.action);
      }
      console.log(`🚨 Anomaly detected: ${logText.substring(0, 80)}...`);
    }

    const healthState = await computeSystemHealth();
    state.health = healthState.health;
    emitEvent("status", { health: state.health, factors: healthState.factors });

    state.logWatcher.linesProcessed += 1;
    state.logWatcher.lastProcessedAt = new Date().toISOString();
  } catch (error) {
    console.error(`[LogWatcher] Error processing line: ${error.message}`);
  }
}

/**
 * Read and process only the new bytes appended since last read.
 */
function readNewLines(filePath) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (fileSize < currentOffset) {
    currentOffset = 0;
    partialLineBuffer = "";
  }

  if (fileSize <= currentOffset) {
    return;
  }

  const buffer = Buffer.alloc(fileSize - currentOffset);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buffer, 0, buffer.length, currentOffset);
  fs.closeSync(fd);

  currentOffset = fileSize;

  const newContent = partialLineBuffer + buffer.toString("utf8");
  const parts = newContent.split(/\r?\n/);
  partialLineBuffer = parts.pop() || "";

  const lines = parts.map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    void processLogLine(line);
  }
}

/**
 * Start watching the log file for new appended lines.
 */
function startLogWatcher() {
  const logFilePath = process.env.LOG_FILE_PATH
    ? path.resolve(PROJECT_ROOT, process.env.LOG_FILE_PATH)
    : DEFAULT_LOG_PATH;

  // Ensure the log file and its directory exist
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "", "utf8");
  }

  // Set initial offset to current file size (skip existing content)
  const stat = fs.statSync(logFilePath);
  currentOffset = stat.size;

  state.logWatcher.status = "running";
  state.logWatcher.filePath = logFilePath;

  console.log(`[LogWatcher] Monitoring: ${logFilePath}`);
  console.log(`[LogWatcher] Starting from offset: ${currentOffset} bytes`);

  // Use fs.watch for efficient file monitoring
  watchAbortController = new AbortController();

  const watcher = fs.watch(logFilePath, { signal: watchAbortController.signal }, (eventType) => {
    if (eventType === "change") {
      try {
        readNewLines(logFilePath);
      } catch (error) {
        console.error(`[LogWatcher] Error reading file: ${error.message}`);
      }
    }
  });

  watcher.on("error", (error) => {
    if (error.name !== "AbortError") {
      console.error(`[LogWatcher] Watcher error: ${error.message}`);
      state.logWatcher.status = "error";
    }
  });

  console.log("[LogWatcher] File watcher active — autonomous pipeline ready");
  emitEvent("status", { logWatcher: "running", filePath: logFilePath });

  return watcher;
}

/**
 * Stop the log watcher gracefully.
 */
function stopLogWatcher() {
  if (watchAbortController) {
    watchAbortController.abort();
    watchAbortController = null;
  }
  state.logWatcher.status = "stopped";
  console.log("[LogWatcher] Stopped");
}

module.exports = {
  startLogWatcher,
  stopLogWatcher,
};
