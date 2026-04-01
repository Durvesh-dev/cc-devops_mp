export default function StatusPill({ label }) {
  const value = (label || "unknown").toLowerCase();

  let tone = "border border-slate-500/40 bg-slate-700/40 text-slate-200";
  if (value.includes("healthy")) tone = "border border-emerald-400/35 bg-emerald-500/20 text-emerald-200";
  if (value.includes("degraded")) tone = "border border-amber-400/35 bg-amber-500/20 text-amber-100";
  if (value.includes("critical")) tone = "border border-rose-400/35 bg-rose-500/20 text-rose-100";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {label || "Unknown"}
    </span>
  );
}
