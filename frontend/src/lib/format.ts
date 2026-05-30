// Display formatting helpers. Keep operational and terse.

export const pct = (n: number): string => `${Math.round(n)}%`;

export const minutes = (n: number): string => `${Math.round(n)} MIN`;

export const signedMinutes = (n: number): string =>
  `${n >= 0 ? "+" : ""}${Math.round(n)} MIN`;

export const feet = (n: number): string =>
  `${Math.round(n).toLocaleString("en-US")} FT`;

export const count = (n: number): string => n.toLocaleString("en-US");

// Utilization -> severity band (scaffolding thresholds).
export const utilSeverity = (utilization_pct: number): "good" | "watch" | "alert" =>
  utilization_pct >= 100 ? "alert" : utilization_pct >= 85 ? "watch" : "good";

// Clock label from an ISO timestamp, UTC (operational clock).
export const clockZ = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
};
