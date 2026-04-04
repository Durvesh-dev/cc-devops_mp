"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileText, ShieldCheck, SlidersHorizontal } from "lucide-react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "alerts", label: "Alerts" },
  { id: "healing", label: "Healing" },
  { id: "logs", label: "Logs" },
];

function normalizeKind(eventKind) {
  const kind = String(eventKind || "").toLowerCase();
  if (kind === "alert" || kind === "alerts" || kind === "anomaly") return "alerts";
  if (kind === "heal" || kind === "healing" || kind === "resolved") return "healing";
  if (kind === "log" || kind === "logs") return "logs";
  return "logs";
}

function normalizeSeverity(severityValue, kind) {
  if (kind === "healing") return "resolved";

  const severity = String(severityValue || "info").toLowerCase();
  if (severity.includes("critical") || severity.includes("high")) return "critical";
  if (severity.includes("error") || severity.includes("medium") || severity.includes("warn")) return "warning";
  return "info";
}

function bucketLabel(isoTimestamp) {
  const ts = new Date(isoTimestamp || Date.now());
  if (Number.isNaN(ts.getTime())) {
    return "Unknown time";
  }

  const now = new Date();
  const sameDay = ts.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dayLabel = sameDay ? "Today" : ts.toDateString() === yesterday.toDateString() ? "Yesterday" : ts.toLocaleDateString();
  const minuteLabel = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dayLabel} - ${minuteLabel}`;
}

function iconForKind(kind) {
  if (kind === "alerts") return <AlertTriangle size={14} />;
  if (kind === "healing") return <ShieldCheck size={14} />;
  return <FileText size={14} />;
}

export default function ActivityTimeline({ events, sseConnected }) {
  const [filter, setFilter] = useState("all");

  const normalizedEvents = useMemo(() => {
    const seenIds = new Map();

    return (events || []).map((event, index) => {
      const kind = normalizeKind(event.kind || event.type);
      const severity = normalizeSeverity(event.severity, kind);
      const baseId = event.id || `${event.time || "evt"}-${kind}-${event.service || "core-service"}`;
      const occurrence = seenIds.get(baseId) || 0;
      seenIds.set(baseId, occurrence + 1);

      return {
        id: occurrence === 0 ? baseId : `${baseId}-${occurrence}`,
        incidentId: event.incidentId || null,
        kind,
        severity,
        title: event.title || "Pipeline update",
        message: event.message || "No details available",
        service: event.service || "core-service",
        issueType: event.issueType || "general-event",
        source: event.source || "watcher",
        time: event.time || new Date().toISOString(),
      };
    });
  }, [events]);

  const counts = useMemo(() => {
    const tally = { all: normalizedEvents.length, alerts: 0, healing: 0, logs: 0 };
    for (const event of normalizedEvents) {
      if (event.kind === "alerts") tally.alerts += 1;
      else if (event.kind === "healing") tally.healing += 1;
      else tally.logs += 1;
    }
    return tally;
  }, [normalizedEvents]);

  const groupedRows = useMemo(() => {
    const visible = filter === "all" ? normalizedEvents : normalizedEvents.filter((event) => event.kind === filter);

    const rows = [];
    const seen = new Map();

    for (const event of visible) {
      const key = bucketLabel(event.time);
      if (!seen.has(key)) {
        const row = { key, items: [] };
        seen.set(key, row);
        rows.push(row);
      }
      seen.get(key).items.push(event);
    }

    return rows;
  }, [filter, normalizedEvents]);

  return (
    <section className="rounded-3xl border border-white/10 bg-panel/70 p-4 shadow-panel backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Live Pipeline Activity</h2>
          <p className="text-xs text-slate-400">Grouped incident stream with context chips and severity-aware motion.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${
            sseConnected
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/15 text-rose-200"
          }`}>
            <span className={`inline-block h-2 w-2 rounded-full ${sseConnected ? "bg-emerald-300" : "bg-rose-300"}`} />
            {sseConnected ? "Live stream" : "Reconnecting"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-slate-300">
            <SlidersHorizontal size={12} />
            Filter
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? "border-accent/60 bg-accent/20 text-ink"
                  : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20 hover:text-slate-100"
              }`}
            >
              {option.label}
              <span className="rounded-full bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                {counts[option.id] || 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {groupedRows.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-slate-400">
            Waiting for pipeline events. Autonomous generation and analysis are active.
          </p>
        )}

        {groupedRows.map((group) => (
          <div key={group.key} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{group.key}</p>

            <div className="space-y-2">
              {group.items.map((event) => (
                <article
                  key={event.id}
                  className={`timeline-row rounded-xl border p-3 ${
                    event.kind === "healing" || event.severity === "resolved"
                      ? "border-emerald-500/25 bg-emerald-500/10"
                      : event.severity === "critical"
                      ? "severity-critical border-rose-500/30 bg-rose-500/10"
                      : event.severity === "warning"
                      ? "severity-warning border-amber-400/30 bg-amber-500/10"
                      : "border-cyan-400/25 bg-cyan-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        event.kind === "healing" || event.severity === "resolved"
                          ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                          : event.severity === "critical"
                          ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                          : event.severity === "warning"
                          ? "border-amber-300/40 bg-amber-500/20 text-amber-100"
                          : "border-cyan-300/40 bg-cyan-500/20 text-cyan-100"
                      }`}
                    >
                      {iconForKind(event.kind)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-100">{event.title}</p>
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                          {event.kind}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-300">{event.message}</p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {event.service}
                        </span>
                        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {event.issueType}
                        </span>
                        {event.incidentId && (
                          <span className="rounded-md border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-100">
                            incident:{String(event.incidentId).slice(-6)}
                          </span>
                        )}
                        <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase ${
                          event.kind === "healing" || event.severity === "resolved"
                            ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                            : event.severity === "critical"
                            ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                            : event.severity === "warning"
                            ? "border-amber-400/40 bg-amber-500/20 text-amber-100"
                            : "border-cyan-300/40 bg-cyan-500/20 text-cyan-100"
                        }`}>
                          {event.severity}
                        </span>
                        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {event.source}
                        </span>
                        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {new Date(event.time).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
