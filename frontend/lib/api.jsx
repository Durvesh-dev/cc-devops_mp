const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

export async function fetchStatus() {
  const response = await fetch(`${API_BASE}/status`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to fetch status");
  return response.json();
}

export async function fetchLogs() {
  const response = await fetch(`${API_BASE}/logs`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to fetch logs");
  return response.json();
}

export async function fetchStats() {
  const response = await fetch(`${API_BASE}/stats`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to fetch stats");
  return response.json();
}

/**
 * Returns the SSE events URL for real-time streaming.
 */
export function getEventsUrl() {
  return `${API_BASE}/events`;
}
