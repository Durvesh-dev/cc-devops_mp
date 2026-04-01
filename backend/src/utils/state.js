const EventEmitter = require("events");

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(50);

const state = {
  lastPrediction: null,
  lastLogAt: null,
  health: "healthy",
  recentLogs: [],
  recentAlerts: [],
  autoHealingActions: [],
  logWatcher: {
    status: "stopped",
    filePath: null,
    linesProcessed: 0,
    lastProcessedAt: null,
  },
  metrics: {
    totalLogs: 0,
    totalAnalyses: 0,
  },
};

function pushCapped(list, value, max = 10) {
  list.unshift(value);
  if (list.length > max) {
    list.pop();
  }
}

function registerLog(logRecord) {
  state.lastLogAt = logRecord.timestamp;
  state.metrics.totalLogs += 1;
  pushCapped(state.recentLogs, logRecord, 50);
}

function registerPrediction(prediction, options = {}) {
  state.lastPrediction = prediction;
  state.metrics.totalAnalyses += 1;
}

/**
 * Emit an SSE event to all connected clients.
 * @param {string} type - Event type (log, alert, prediction, status)
 * @param {object} data - Event payload
 */
function emitEvent(type, data) {
  sseEmitter.emit("event", { type, data, timestamp: new Date().toISOString() });
}

module.exports = {
  state,
  sseEmitter,
  pushCapped,
  registerLog,
  registerPrediction,
  emitEvent,
};
