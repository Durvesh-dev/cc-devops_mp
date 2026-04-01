"use client";

import { AlertTriangle, BellRing, Database, ShieldCheck } from "lucide-react";
import AppShell from "../../components/AppShell";
import ActivityTimeline from "../../components/ActivityTimeline";
import MetricCard from "../../components/MetricCard";
import MiniBars from "../../components/MiniBars";
import StatusPill from "../../components/StatusPill";
import { useDevopsData } from "../../lib/useDevopsData";

export default function DashboardRoute() {
  const { metrics, logs, status, message, pipelineEvents, sseConnected, isLoading } = useDevopsData();
  const totalAnalyses = Math.max(Number(metrics.totalAnalyses || 0), 0);
  const totalAlerts = Math.max(Number(metrics.alertCount || 0), 0);
  const healedIncidents = Math.min(Math.max(Number(metrics.autoHealingCount || 0), 0), totalAlerts);

  const anomalyRate = totalAnalyses > 0
    ? Math.round((Math.max(Number(metrics.anomalyCount || 0), 0) / totalAnalyses) * 100)
    : 0;
  const healedCoverage = totalAlerts > 0 ? Math.round((healedIncidents / totalAlerts) * 100) : 0;
  const openIncidentRate = totalAlerts > 0 ? Math.max(100 - healedCoverage, 0) : 0;

  const latestLatency = logs.slice(0, 6).map((log, index) => ({
    label: log?.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : `Entry ${index + 1}`,
    value: Number(log.responseTimeMs || 0),
  }));

  const analysisMix = [
    { label: "Anomaly rate", value: anomalyRate },
    { label: "Healed coverage", value: healedCoverage },
    { label: "Open incident rate", value: openIncidentRate },
  ];

  return (
    <AppShell
      title="Autonomous Reliability Studio"
      subtitle={message}
      statusBadge={<StatusPill label={status?.system?.health || "unknown"} />}
    >
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-amber-500/15 via-orange-500/5 to-sky-500/10 px-4 py-4 shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-200">System Snapshot</p>
        <p className="mt-1 text-sm text-slate-200">Live reliability posture, trend signals, and autonomous recovery context in one operational view.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Logs"
          value={metrics.totalLogs}
          description="Ingestion throughput"
          delta="Auto-streamed from watcher + generator"
          icon={<Database size={16} />}
          isLoading={isLoading}
          animationDelay="0ms"
        />
        <MetricCard
          title="Anomalies"
          value={metrics.anomalyCount}
          description="AI risk detections"
          delta="AI Detected Anomalies"
          tone="danger"
          icon={<AlertTriangle size={16} />}
          tooltip="Count of logs classified as anomalous by ML + rule-fallback engine."
          isLoading={isLoading}
          animationDelay="60ms"
        />
        <MetricCard
          title="Alerts"
          value={metrics.alertCount}
          description="Incident notifications"
          delta="Published to SNS for ERROR/CRITICAL"
          tone="warning"
          icon={<BellRing size={16} />}
          tooltip="Alerts generated from anomalies and routed to notification channels."
          isLoading={isLoading}
          animationDelay="120ms"
        />
        <MetricCard
          title="Auto-Healing"
          value={metrics.autoHealingCount}
          description="Recovery workflows"
          delta="Service-specific remediation actions"
          icon={<ShieldCheck size={16} />}
          tooltip="Automated recovery actions executed after anomalies (restart, retry, recover)."
          isLoading={isLoading}
          animationDelay="180ms"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-panel/70 p-4 shadow-panel">
          <p className="mb-3 text-sm text-slate-200">Latency trend</p>
          <MiniBars points={latestLatency.length ? latestLatency : [{ label: "No data", value: 0 }]} />
        </article>
        <article className="rounded-3xl border border-white/10 bg-panel/70 p-4 shadow-panel">
          <p className="mb-3 text-sm text-slate-200">Operational quality mix (%)</p>
          <MiniBars points={analysisMix} />
        </article>
      </section>

      <ActivityTimeline events={pipelineEvents} sseConnected={sseConnected} />
    </AppShell>
  );
}
