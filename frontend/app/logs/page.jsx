"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import LogsTable from "../../components/LogsTable";
import StatusPill from "../../components/StatusPill";
import { useDevopsData } from "../../lib/useDevopsData";

export default function LogsRoute() {
  const { status, logs, message, sseConnected } = useDevopsData();
  const [selectedLog, setSelectedLog] = useState(null);

  const selectedPrediction = useMemo(() => {
    if (!selectedLog) return null;

    if (selectedLog.prediction && typeof selectedLog.prediction === "object") {
      return selectedLog.prediction;
    }
    if (selectedLog.mlPrediction && typeof selectedLog.mlPrediction === "object") {
      return selectedLog.mlPrediction;
    }

    if (typeof selectedLog.anomaly === "boolean" || typeof selectedLog.confidence === "number") {
      return {
        is_anomaly: Boolean(selectedLog.anomaly),
        confidence: selectedLog.confidence,
      };
    }

    return null;
  }, [selectedLog]);

  useEffect(() => {
    if (!selectedLog) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedLog(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedLog]);

  return (
    <AppShell
      title="Live Log Stream"
      subtitle={message}
      statusBadge={<StatusPill label={status?.system?.health || "unknown"} />}
    >
      <section className="rounded-2xl border border-white/10 bg-panel/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Incoming Logs</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${sseConnected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]"}`} />
              <span className="text-xs text-slate-300">{sseConnected ? "Live" : "Reconnecting..."}</span>
            </span>
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
              📁 File Monitor
            </span>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Logs are automatically monitored from <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">logs/app.log</code> — no manual input needed.
          Lines appended to the file are detected, classified, and analyzed by the ML pipeline in real-time.
        </p>
        <LogsTable logs={logs.slice(0, 50)} onViewDetails={setSelectedLog} />
      </section>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-[1px]"
          onClick={() => setSelectedLog(null)}
          role="presentation"
        >
          <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl animate-[slideInRight_220ms_ease-out]">
            <div
              className="h-full w-full overflow-y-auto border-l border-white/10 bg-[#0b1820] p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Log details drawer"
            >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-cyan-100">Log Details</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Timestamp</p>
                <p className="mt-1 break-all text-cyan-100">{selectedLog.timestamp || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Service</p>
                <p className="mt-1 text-cyan-100">{selectedLog.service || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Level</p>
                <p className="mt-1 text-cyan-100">{selectedLog.level || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Issue Type</p>
                <p className="mt-1 text-cyan-100">{selectedLog.issueType || "general-event"}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Full Message</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-200">{selectedLog.log || "N/A"}</p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">ML Prediction</p>
              {!selectedPrediction && (
                <p className="mt-1 text-slate-300">Not available for this log.</p>
              )}
              {selectedPrediction && (
                <div className="mt-1 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <p className="text-slate-200">
                    Anomaly: <span className="font-semibold">{selectedPrediction.is_anomaly ? "YES" : "NO"}</span>
                  </p>
                  <p className="text-slate-200">
                    Confidence: <span className="font-semibold">{selectedPrediction.confidence != null ? `${Math.round(Number(selectedPrediction.confidence) * 100)}%` : "N/A"}</span>
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 text-[11px] text-slate-500">Tip: press Esc or click outside to close.</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </AppShell>
  );
}
