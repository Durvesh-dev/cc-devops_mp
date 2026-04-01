import { CircleHelp } from "lucide-react";

export default function MetricCard({
  title,
  value,
  delta,
  tone = "normal",
  icon,
  description,
  tooltip,
  isLoading = false,
  animationDelay = "0ms",
}) {
  const color =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warning"
      ? "text-amber-200"
      : "text-sky-200";

  const iconTone =
    tone === "danger"
      ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-100 border-amber-500/30"
      : "bg-sky-500/15 text-sky-100 border-sky-500/30";

  return (
    <div
      className="metric-card animate-card-in rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-4 shadow-panel"
      style={{ animationDelay }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${iconTone}`}>
              {icon}
            </span>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{title}</p>
            {description && <p className="mt-1 text-[11px] text-slate-500">{description}</p>}
          </div>
        </div>

        {tooltip && (
          <div className="group relative">
            <button type="button" className="text-slate-500 transition hover:text-amber-200" aria-label={`${title} info`}>
              <CircleHelp size={15} />
            </button>
            <div className="pointer-events-none absolute right-0 top-6 z-20 hidden w-52 rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-2 text-[11px] leading-relaxed text-slate-200 shadow-xl group-hover:block">
              {tooltip}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
          <div className="h-3 w-40 animate-pulse rounded-md bg-white/5" />
        </div>
      ) : (
        <>
          <p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p>
          <p className="mt-2 text-xs text-slate-400">{delta}</p>
        </>
      )}
    </div>
  );
}
