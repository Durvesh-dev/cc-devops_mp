const { readRecentLogs, readRecentAnomalies } = require("./dynamoStore");

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function computeSystemHealth() {
  const logWindow = toPositiveInt(process.env.HEALTH_LOG_WINDOW, 100);
  const anomalyWindow = toPositiveInt(process.env.HEALTH_ANOMALY_WINDOW, 50);
  const warnErrorThreshold = toPositiveInt(process.env.HEALTH_WARN_ERROR_THRESHOLD, 8);

  const [recentLogs, recentAnomalies] = await Promise.all([
    readRecentLogs(logWindow),
    readRecentAnomalies(anomalyWindow),
  ]);

  const criticalAnomalies = recentAnomalies.filter((item) => String(item?.severity || "").toLowerCase() === "high").length;
  const warnOrErrorLogs = recentLogs.filter((item) => {
    const level = String(item?.level || "").toUpperCase();
    return level === "WARN" || level === "ERROR";
  }).length;

  let health = "healthy";
  if (criticalAnomalies > 0) {
    health = "critical";
  } else if (warnOrErrorLogs >= warnErrorThreshold) {
    health = "degraded";
  }

  return {
    health,
    factors: {
      criticalAnomalies,
      warnOrErrorLogs,
      warnErrorThreshold,
      logWindow,
      anomalyWindow,
    },
  };
}

module.exports = {
  computeSystemHealth,
};
