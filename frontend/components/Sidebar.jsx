import { Activity, AlertTriangle, BrainCircuit, LayoutDashboard, ScrollText } from "lucide-react";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "logs", icon: ScrollText, label: "Logs" },
  { key: "alerts", icon: AlertTriangle, label: "Alerts" },
  { key: "insights", icon: BrainCircuit, label: "ML Insights" },
];

export default function Sidebar({ activeSection, onJump }) {
  return (
    <aside className="sticky top-4 h-fit rounded-3xl border border-white/10 bg-panel/80 p-4 shadow-panel backdrop-blur-xl">
      <div className="mb-7 flex items-center gap-3">
        <div className="rounded-xl bg-accent/20 p-2 text-accent">
          <Activity size={18} />
        </div>
        <div>
          <p className="font-display text-sm text-ink">AI DevOps</p>
          <p className="text-xs text-slate-400">Self-Healing Cloud</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeSection;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onJump(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                active ? "bg-accent/20 text-accent" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
