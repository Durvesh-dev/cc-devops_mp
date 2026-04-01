"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchLogs, fetchStats, fetchStatus, getEventsUrl } from "./api";

const PIPELINE_EVENTS_STORAGE_KEY = "devops.pipelineEvents.v1";
const MAX_PIPELINE_EVENTS = 60;

const fallbackSummary = {
  totalLogs: 0,
  totalAnalyses: 0,
  anomalyCount: 0,
  alertCount: 0,
  autoHealingCount: 0,
};

export function useDevopsData() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Connecting to autonomous pipeline...");
  const [pipelineEvents, setPipelineEvents] = useState(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.sessionStorage.getItem(PIPELINE_EVENTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_PIPELINE_EVENTS) : [];
    } catch (_error) {
      return [];
    }
  });
  const [latestDecision, setLatestDecision] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef(null);

  const pushPipelineEvent = useCallback((event) => {
    setPipelineEvents((prev) => {
      const next = [event, ...prev].slice(0, MAX_PIPELINE_EVENTS);
      return next;
    });
  }, []);

  const applyStatsToStatus = useCallback((statsData) => {
    setStatus((prev) => ({
      ...prev,
      summary: {
        ...(prev?.summary || {}),
        totalLogs: statsData?.totalLogs || 0,
        anomalyCount: statsData?.totalAnomalies || 0,
        alertCount: statsData?.totalAlerts || 0,
        autoHealingCount: statsData?.totalAutoHealing || 0,
      },
    }));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchStats();
      applyStatsToStatus(statsData);
    } catch (_error) {
      // Keep existing values if stats endpoint is temporarily unavailable.
    }
  }, [applyStatsToStatus]);

  const loadData = useCallback(async () => {
    try {
      const [statusData, logsData, statsData] = await Promise.all([fetchStatus(), fetchLogs(), fetchStats()]);

      statusData.summary = {
        ...(statusData.summary || {}),
        totalLogs: statsData?.totalLogs || 0,
        anomalyCount: statsData?.totalAnomalies || 0,
        alertCount: statsData?.totalAlerts || 0,
        autoHealingCount: statsData?.totalAutoHealing || 0,
      };

      setStatus(statusData);
      setLogs(logsData.logs || []);

      setPipelineEvents((prev) => {
        if (prev.length) return prev;

        const nowIso = new Date().toISOString();
        const seedAlerts = (statusData?.alerts || []).slice(0, 20).map((alert, index) => ({
          id: alert.id || `status-alert-${index}`,
          kind: "alerts",
          title: "Issue found",
          message: alert.message || "An issue was detected and alert workflow was triggered",
          service: alert.service || "core-service",
          severity: alert.severity || "warning",
          source: alert?.sns?.skipped ? "local-fallback" : "snapshot",
          time: alert.time || nowIso,
        }));

        const seedHealing = (statusData?.autoHealingActions || []).slice(0, 20).map((item, index) => ({
          id: item.id || `status-heal-${index}`,
          kind: "healing",
          title: "Issue healed",
          message: item.message || item.action || "Recovery workflow applied",
          service: item.service || "core-service",
          severity: item.severity || "info",
          source: "self-heal",
          time: item.time || nowIso,
        }));

        const seedLogs = (logsData?.logs || []).slice(0, 20).map((item, index) => ({
          id: item.id || `status-log-${index}`,
          kind: "logs",
          title: "Log ingested",
          message: (item.log || "").substring(0, 110),
          service: item.service || "core-service",
          severity: item.severity || item.level || "info",
          source: item.source || "snapshot",
          time: item.timestamp || nowIso,
        }));

        const seen = new Set();
        const merged = [...seedHealing, ...seedAlerts, ...seedLogs].filter((event) => {
          const key = event.id || `${event.kind}-${event.time}-${event.service}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return merged.slice(0, MAX_PIPELINE_EVENTS);
      });

      const aws = statusData?.system?.aws;
      const watcher = statusData?.system?.logWatcher;
      const watcherStatus = watcher?.status === "running" ? "🟢 Watcher active" : "⚪ Watcher idle";

      if (aws) {
        const regionText = aws.region || "no-region";
        const s3Text = aws.s3?.configured ? "S3:on" : "S3:off";
        const snsText = aws.sns?.configured ? "SNS:on" : "SNS:off";
        setMessage(`${watcherStatus} | AWS ${regionText} | ${s3Text} ${snsText}`);
      } else {
        setMessage(`${watcherStatus} | Autonomous mode`);
      }
    } catch (error) {
      setMessage(`Connection error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSystemHealth = useCallback(async () => {
    try {
      const statusData = await fetchStatus();
      setStatus((prev) => ({
        ...prev,
        system: {
          ...(prev?.system || {}),
          health: statusData?.system?.health,
          healthFactors: statusData?.system?.healthFactors,
          logWatcher: statusData?.system?.logWatcher || prev?.system?.logWatcher,
        },
      }));
    } catch (_error) {
      // Keep previous health state if status refresh fails.
    }
  }, []);

  // SSE subscription for real-time updates
  useEffect(() => {
    const eventsUrl = getEventsUrl();
    let es = null;

    function connect() {
      es = new EventSource(eventsUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.type === "snapshot") {
            // Initial state snapshot from server
            if (parsed.data?.metrics) {
              setStatus((prev) => ({
                ...prev,
                summary: parsed.data.metrics,
                system: { ...prev?.system, health: parsed.data.health, logWatcher: parsed.data.logWatcher },
                alerts: parsed.data.recentAlerts || prev?.alerts || [],
              }));
            }
            if (Array.isArray(parsed.data?.recentAlerts) && parsed.data.recentAlerts.length) {
              setPipelineEvents((prev) => {
                if (prev.length) return prev;
                return parsed.data.recentAlerts.slice(0, 20).map((alert, index) => ({
                  id: alert.id || `snapshot-alert-${index}`,
                  kind: "alerts",
                  title: "Issue found",
                  message: alert.message || "An issue was detected and alert workflow was triggered",
                  service: alert.service || "core-service",
                  severity: alert.severity || "warning",
                  source: "snapshot",
                  time: alert.time || parsed.timestamp,
                }));
              });
            }
          } else if (parsed.type === "status") {
            setStatus((prev) => ({
              ...prev,
              system: {
                ...prev?.system,
                health: parsed.data?.health || prev?.system?.health,
              },
            }));
          } else if (parsed.type === "log") {
            // New log from file watcher
            setLogs((prev) => [parsed.data, ...prev].slice(0, 100));
            pushPipelineEvent({
              id: parsed.data?.id || `log-${parsed.timestamp}`,
              kind: "logs",
              title: "Log ingested",
              message: (parsed.data?.log || "").substring(0, 110),
              service: parsed.data?.service || "core-service",
              severity: parsed.data?.severity || parsed.data?.level || "info",
              source: "watcher",
              time: parsed.timestamp,
            });
            void loadStats();
            void refreshSystemHealth();
          } else if (parsed.type === "prediction") {
            // ML prediction result
            const decision = parsed.data?.decision || null;
            setLatestDecision(decision);
            setStatus((prev) => {
              if (!prev) return prev;
              const summary = {
                ...prev.summary,
                totalAnalyses: (prev.summary?.totalAnalyses || 0) + 1,
              };
              return {
                ...prev,
                summary,
                system: { ...prev.system, lastPrediction: parsed.data },
              };
            });
            pushPipelineEvent({
              id: `prediction-${parsed.timestamp}-${decision?.service || "service"}`,
              kind: parsed.data.is_anomaly ? "alerts" : "logs",
              title: parsed.data.is_anomaly ? "Issue found" : "Analysis complete",
              message: parsed.data.is_anomaly
                ? `Potential issue detected: ${decision?.issueType || "unexpected behavior"}`
                : "Log classified as normal",
              service: decision?.service || "core-service",
              severity: decision?.severity || "info",
              source: "ml-engine",
              time: parsed.timestamp,
            });
            void loadStats();
            void refreshSystemHealth();
          } else if (parsed.type === "alert") {
            // SNS alert triggered
            setStatus((prev) => {
              if (!prev) return prev;
              const alerts = [parsed.data, ...(prev.alerts || [])].slice(0, 20);
              return { ...prev, alerts };
            });
            pushPipelineEvent({
              id: parsed.data?.id || `alert-${parsed.timestamp}`,
              kind: "alerts",
              title: "Healing initiated",
              message: parsed.data?.message || "Issue alert sent and remediation flow initiated",
              service: parsed.data?.service || "core-service",
              severity: parsed.data?.severity || "warning",
              source: parsed.data?.sns?.skipped ? "local-fallback" : "sns",
              time: parsed.data?.time || parsed.timestamp,
            });
            void loadStats();
            void refreshSystemHealth();
          } else if (parsed.type === "healing") {
            pushPipelineEvent({
              id: parsed.data?.id || `heal-${parsed.timestamp}`,
              kind: "healing",
              title: "Issue healed",
              message: parsed.data?.message || parsed.data?.action || "Recovery workflow applied",
              service: parsed.data?.service || "core-service",
              severity: parsed.data?.severity || "info",
              source: "self-heal",
              time: parsed.data?.time || parsed.timestamp,
            });
            void loadStats();
            void refreshSystemHealth();
          }
        } catch (_error) {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [loadStats, pushPipelineEvent, refreshSystemHealth]);

  // Polling fallback at 15s (SSE handles real-time)
  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(
        PIPELINE_EVENTS_STORAGE_KEY,
        JSON.stringify(pipelineEvents.slice(0, MAX_PIPELINE_EVENTS)),
      );
    } catch (_error) {
      // Ignore storage write errors in private mode / quota limits.
    }
  }, [pipelineEvents]);

  const metrics = useMemo(() => status?.summary || fallbackSummary, [status]);

  return {
    status,
    logs,
    metrics,
    isLoading,
    message,
    pipelineEvents,
    latestDecision,
    sseConnected,
  };
}
