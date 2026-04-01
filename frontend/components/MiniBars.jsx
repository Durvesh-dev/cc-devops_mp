export default function MiniBars({ points }) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="space-y-3">
      {points.map((point, index) => (
        <div key={`${point.label}-${point.value}-${index}`} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{point.label}</span>
            <span>{point.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900/80">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-sky-300"
              style={{ width: `${Math.max((point.value / max) * 100, 5)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
