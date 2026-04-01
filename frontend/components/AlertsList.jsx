export default function AlertsList({ alerts }) {
  return (
    <div className="space-y-3">
      {alerts.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-panel/70 p-4 text-sm text-slate-400">
          No active alerts.
        </div>
      )}
      {alerts.map((alert, index) => (
        <div key={`${alert.time}-${index}`} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full bg-rose-500/25 px-2 py-1 text-xs uppercase tracking-[0.15em] text-rose-200">
              {alert.severity || "high"}
            </span>
            <span className="text-xs text-slate-300">{new Date(alert.time).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-100">{alert.message.split("\n")[0]}</p>
          <p className="mt-1 text-xs text-slate-300">{alert.service || "service-unknown"}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{alert.issueType || "general-event"}</p>
        </div>
      ))}
    </div>
  );
}
