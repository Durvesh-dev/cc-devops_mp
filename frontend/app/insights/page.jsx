"use client";

import AppShell from "../../components/AppShell";
import StatusPill from "../../components/StatusPill";
import { useDevopsData } from "../../lib/useDevopsData";

export default function InsightsRoute() {
  const { status, message, latestDecision } = useDevopsData();
  const aws = status?.system?.aws;
  const watcher = status?.system?.logWatcher;
  const decision = latestDecision || status?.system?.lastPrediction?.decision;

  const confidencePct = Math.round(Number((decision?.confidence || 0) * 100));
  const prettyService = decision?.service
    ? decision.service.replace("-service", "").replace("app", "server")
    : "System";

  const confidenceLabel = confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low";

  const healthLabel = (status?.system?.health || "healthy").toLowerCase();
  const healthTone = healthLabel.includes("critical")
    ? "bg-rose-500/20 text-rose-200 border-rose-500/30"
    : healthLabel.includes("degraded")
    ? "bg-amber-500/20 text-amber-200 border-amber-500/30"
    : "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";

  const severityTone = decision?.severity === "high"
    ? "bg-rose-500/20 text-rose-200 border-rose-500/30"
    : decision?.severity === "medium"
    ? "bg-amber-500/20 text-amber-200 border-amber-500/30"
    : "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";

  const issueTitle = decision?.issueTitle || (decision?.anomaly
    ? `⚠️ ${prettyService.charAt(0).toUpperCase() + prettyService.slice(1)} Service Issue Detected`
    : "✅ System Operating Normally");

  const suggestedActions = Array.isArray(decision?.suggestedActions) && decision.suggestedActions.length
    ? decision.suggestedActions
    : ["Check service logs for details", "Verify infrastructure health"];

  return (
    <AppShell
      title="ML Insights"
      subtitle={message}
      statusBadge={<StatusPill label={status?.system?.health || "unknown"} />}
    >
      {/* Autonomous Pipeline Status */}
      <section className="rounded-2xl border border-white/10 bg-panel/70 p-4">
        <h2 className="mb-3 font-display text-xl">Autonomous Pipeline Status</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Log Watcher</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                watcher?.status === "running"
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                  : "bg-slate-500"
              }`} />
              <span className="text-sm font-semibold text-cyan-100 capitalize">{watcher?.status || "unknown"}</span>
            </div>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Lines Processed</p>
            <p className="mt-1 text-sm font-semibold text-cyan-100">{watcher?.linesProcessed || 0}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Monitored File</p>
            <p className="mt-1 truncate text-sm font-semibold text-cyan-100 font-mono">{watcher?.filePath || "N/A"}</p>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-panel/70 p-4">
          <h2 className="mb-3 font-display text-xl">Latest AI Decision</h2>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-base font-semibold text-cyan-100">{issueTitle}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
              <span className={`rounded-full border px-3 py-1 ${healthTone}`}>
                {healthLabel.includes("critical") ? "Critical" : healthLabel.includes("degraded") ? "Warning" : "Healthy"}
              </span>
              <span className={`rounded-full border px-3 py-1 ${severityTone}`}>
                Severity: {decision?.severity || "normal"}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                Confidence: {confidenceLabel}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Service:</span> <span className="font-semibold capitalize text-slate-100">{prettyService}</span></p>
              <p><span className="text-slate-400">Confidence Score:</span> <span className="font-semibold text-slate-100">{confidencePct}%</span></p>
              <p><span className="text-slate-400">Detected Pattern:</span> <span className="font-semibold text-slate-100">{decision?.issueType || "general-event"}</span></p>
              <p><span className="text-slate-400">Severity:</span> <span className="font-semibold text-slate-100">{decision?.severity || "normal"}</span></p>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/45 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Suggested Action</p>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                {suggestedActions.map((action, index) => (
                  <p key={`${action}-${index}`}>• {action}</p>
                ))}
              </div>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-panel/70 p-4">
          <h2 className="mb-3 font-display text-xl">Auto-Healing Events</h2>
          <div className="space-y-2">
            {(status?.autoHealingActions || []).slice(0, 6).map((item, idx) => (
              <div key={`${item.time}-${idx}`} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-slate-200">
                <p className="font-medium text-cyan-100">{item.message || item.action}</p>
                <p className="text-xs text-slate-400">Action: {item.action}</p>
                <p className="text-xs text-slate-400">{item.service} | {item.severity} | {new Date(item.time).toLocaleString()}</p>
              </div>
            ))}
            {(status?.autoHealingActions || []).length === 0 && (
              <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-slate-400">No auto-healing actions yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel/70 p-4">
        <h2 className="mb-2 font-display text-xl">AWS Integration</h2>
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Region</p>
            <p className="mt-1 font-semibold text-cyan-100">{aws?.region || "Not configured"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">S3</p>
            <p className="mt-1 font-semibold text-cyan-100">{aws?.s3?.configured ? "Configured" : "Not configured"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">SNS</p>
            <p className="mt-1 font-semibold text-cyan-100">{aws?.sns?.configured ? "Configured" : "Local logging fallback"}</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
