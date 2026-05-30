// Time-bin helpers for the Time Warp slider.

import type { TimeBin } from "./types";

// "+N MIN" label relative to the first bin (NOW).
export function relativeLabel(bins: TimeBin[], index: number): string {
  if (index <= 0) return "NOW";
  const base = new Date(bins[0].valid_from).getTime();
  const t = new Date(bins[index].valid_from).getTime();
  const mins = Math.round((t - base) / 60000);
  return `+${mins} MIN`;
}

export function binIndexById(bins: TimeBin[], id: string | null): number {
  if (!id) return 0;
  const i = bins.findIndex((b) => b.id === id);
  return i < 0 ? 0 : i;
}
