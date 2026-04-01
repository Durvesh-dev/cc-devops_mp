const express = require("express");
const { uploadLogToS3, getAwsIntegrationStatus, getModelSyncStatus } = require("../services/awsService");
const { appendLog, readRecentLogs, countLogs } = require("../services/logStore");
const {
  readRecentAlerts,
  readRecentAutoHealing,
  countAnomalies,
  countAlerts,
  countAutoHealing,
} = require("../services/dynamoStore");
const { predictLog } = require("../services/mlService");
const { handleAnomaly } = require("../services/healingService");
const { computeSystemHealth } = require("../services/healthService");
const { state, sseEmitter, registerLog, registerPrediction } = require("../utils/state");
const { buildDecision } = require("../services/decisionEngine");

const router = express.Router();

function buildLogRecord(payload) {
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  const logText = typeof payload?.log === "string" ? payload.log.trim() : message;

  if (!logText) {
    return null;
  }

  const decision = buildDecision(logText);

  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    service: decision.service,
    level: decision.level,
    issueType: decision.issueType,
    severity: decision.severity,
    confidence: decision.confidence,
    anomaly: decision.anomaly,
    statusCode: Number.isFinite(payload?.statusCode) ? payload.statusCode : decision.statusCode,
    responseTimeMs: Number.isFinite(payload?.responseTimeMs) ? payload.responseTimeMs : 100,
    log: logText,
    timestamp: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// SSE endpoint for real-time dashboard updates
// ──────────────────────────────────────────────
router.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);

  // Send current state snapshot
  res.write(`data: ${JSON.stringify({
    type: "snapshot",
    data: {
      metrics: state.metrics,
      health: state.health,
      logWatcher: state.logWatcher,
      recentLogs: state.recentLogs.slice(0, 10),
      recentAlerts: state.recentAlerts.slice(0, 5),
    },
    timestamp: new Date().toISOString(),
  })}\n\n`);

  // Forward all SSE events
  const onEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  sseEmitter.on("event", onEvent);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Clean up on disconnect
  req.on("close", () => {
    sseEmitter.off("event", onEvent);
    clearInterval(heartbeat);
  });
});

// ──────────────────────────────────────────────
// Existing endpoints (backward compatible)
// ──────────────────────────────────────────────
router.post("/logs", async (req, res, next) => {
  try {
    const logRecord = buildLogRecord(req.body);
    if (!logRecord) {
      return res.status(400).json({
        success: false,
        message: "Provide either 'log' or 'message' in request body",
      });
    }

    await appendLog(logRecord);
    registerLog(logRecord);
    const s3 = await uploadLogToS3(logRecord);

    return res.json({
      success: true,
      message: "Log received",
      logRecord,
      storage: { local: true, s3 },
      retraining: "managed externally",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/analyze", async (req, res, next) => {
  try {
    const logRecord = buildLogRecord(req.body);
    if (!logRecord) {
      return res.status(400).json({
        success: false,
        message: "Provide either 'log' or 'message' in request body",
      });
    }

    await appendLog(logRecord);
    registerLog(logRecord);

    const prediction = await predictLog(logRecord.log);
    const decision = buildDecision(logRecord.log, prediction);
    const finalPrediction = {
      ...prediction,
      is_anomaly: decision.anomaly,
      anomaly: decision.anomaly ? 1 : 0,
      confidence: decision.confidence,
      decision,
      service: decision.service,
      severity: decision.severity,
      issueType: decision.issueType,
    };
    registerPrediction(finalPrediction, { anomalyOverride: decision.anomaly });

    let anomalyWorkflow = null;
    if (decision.anomaly) {
      anomalyWorkflow = await handleAnomaly({ ...logRecord, ...decision }, finalPrediction);
    }

    const healthState = await computeSystemHealth();
    state.health = healthState.health;

    return res.json({
      success: true,
      prediction: finalPrediction,
      decision,
      anomalyWorkflow,
    });
  } catch (error) {
    const message = String(error.message || error);
    const statusCode = message.toLowerCase().includes("model") ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [totalLogs, totalAnomalies, totalAlerts, totalAutoHealing] = await Promise.all([
      countLogs(),
      countAnomalies(),
      countAlerts(),
      countAutoHealing(),
    ]);

    return res.json({
      success: true,
      totalLogs,
      totalAnomalies,
      totalAlerts,
      totalAutoHealing,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/status", async (_req, res, next) => {
  try {
    const [
      persistedLogsCount,
      persistedAnomaliesCount,
      persistedAlertsCount,
      persistedAutoHealingCount,
      persistedRecentLogs,
      persistedRecentAlerts,
      persistedAutoHealingActions,
    ] = await Promise.all([
      countLogs(),
      countAnomalies(),
      countAlerts(),
      countAutoHealing(),
      readRecentLogs(50),
      readRecentAlerts(20),
      readRecentAutoHealing(20),
    ]);

    const healthState = await computeSystemHealth();
    state.health = healthState.health;

    return res.json({
    success: true,
    summary: {
      totalLogs: persistedLogsCount,
      totalAnalyses: state.metrics.totalAnalyses,
      anomalyCount: persistedAnomaliesCount,
      alertCount: persistedAlertsCount,
      autoHealingCount: persistedAutoHealingCount,
    },
    system: {
      health: state.health,
      healthFactors: healthState.factors,
      lastLogAt: state.lastLogAt,
      lastPrediction: state.lastPrediction,
      logWatcher: state.logWatcher,
      aws: getAwsIntegrationStatus(),
      modelSync: getModelSyncStatus(),
    },
    logs: persistedRecentLogs,
    alerts: persistedRecentAlerts,
    autoHealingActions: persistedAutoHealingActions,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/logs", async (_req, res, next) => {
  try {
    const logs = await readRecentLogs(100);
    return res.json({ success: true, logs });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
