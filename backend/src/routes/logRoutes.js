const express = require("express");
const { analyzeLog } = require("../services/mlService");
const { handleAnomaly } = require("../services/healingService");
const { computeSystemHealth } = require("../services/healthService");
const { appendLog } = require("../services/logStore");
const { state, registerPrediction } = require("../utils/state");
const { buildDecision } = require("../services/decisionEngine");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    const log = typeof req.body?.log === "string" ? req.body.log.trim() : "";

    if (!log) {
      return res.status(400).json({
        success: false,
        message: "Provide 'log' in request body",
      });
    }

    const prediction = await analyzeLog(log);
    const decision = buildDecision(log, prediction);
    const logRecord = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      service: decision.service,
      level: decision.level,
      issueType: decision.issueType,
      severity: decision.severity,
      confidence: decision.confidence,
      anomaly: decision.anomaly,
      statusCode: decision.statusCode,
      responseTimeMs: 0,
      source: "manual-analyze",
      log,
    };

    await appendLog(logRecord);

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
      anomalyWorkflow = await handleAnomaly(
        {
          ...logRecord,
        },
        finalPrediction,
      );
    }

    const healthState = await computeSystemHealth();
    state.health = healthState.health;

    res.json({
      success: true,
      prediction: finalPrediction,
      decision,
      anomalyWorkflow,
    });
  } catch (err) {
    const message = String(err.message || err);
    const statusCode = message.toLowerCase().includes("model") ? 503 : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
});

module.exports = router;