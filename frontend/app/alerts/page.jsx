"use client";

import AlertsList from "../../components/AlertsList";
import AppShell from "../../components/AppShell";
import StatusPill from "../../components/StatusPill";
import { useDevopsData } from "../../lib/useDevopsData";

export default function AlertsRoute() {
  const { status, message } = useDevopsData();

  return (
    <AppShell
      title="Alert Center"
      subtitle={message}
      statusBadge={<StatusPill label={status?.system?.health || "unknown"} />}
    >
      <section className="rounded-2xl border border-white/10 bg-panel/70 p-4">
        <h2 className="mb-3 font-display text-xl">Active and Recent Alerts</h2>
        <AlertsList alerts={status?.alerts || []} />
      </section>
    </AppShell>
  );
}
