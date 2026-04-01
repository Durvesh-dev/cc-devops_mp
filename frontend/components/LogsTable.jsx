export default function LogsTable({ logs, onViewDetails }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-5 text-slate-400">
                  No logs received yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3">{log.service}</td>
                <td className="px-4 py-3 text-slate-300">{log.issueType || "general-event"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      log.level === "CRITICAL"
                        ? "bg-fuchsia-500/20 text-fuchsia-300"
                        : log.level === "ERROR"
                        ? "bg-rose-500/20 text-rose-300"
                        : log.level === "WARN"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    {log.level}
                  </span>
                </td>
                <td className="px-4 py-3">{log.statusCode}</td>
                <td className="px-4 py-3">{log.responseTimeMs}ms</td>
                <td className="max-w-[420px] truncate px-4 py-3 text-slate-300">{log.log}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(log)}
                    className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/20"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
