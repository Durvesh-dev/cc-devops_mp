"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, BrainCircuit, ScrollText } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/insights", label: "ML Insights", icon: BrainCircuit },
];

export default function AppShell({ title, subtitle, children, statusBadge }) {
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen px-4 py-5 md:px-6">
      <div className="devops-bg" />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-4 h-fit rounded-3xl border border-white/10 bg-panel/85 p-4 shadow-panel backdrop-blur-xl">
          <div className="mb-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="rounded-xl bg-accent/20 p-2 text-accent shadow-[0_0_22px_rgba(255,122,24,0.35)]">
              <Activity size={18} />
            </div>
            <div>
              <p className="font-display text-sm text-ink">Ops Control</p>
              <p className="text-xs text-slate-400">Autonomous Reliability</p>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    active
                      ? "border-accent/35 bg-accent/18 text-orange-100"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <header className="rounded-3xl border border-white/10 bg-panel/70 p-5 shadow-panel backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.23em] text-amber-200">Autonomous AI DevOps Engineer</p>
            <h1 className="mt-2 font-display text-3xl text-ink md:text-4xl">{title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {statusBadge}
              <span className="font-mono text-xs text-slate-400">{subtitle}</span>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
