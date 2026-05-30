import { useState } from "react";
import { useStore } from "../state/store";
import AgentToken from "./AgentToken";
import BriefToken from "./BriefToken";
import RiskToken from "./RiskToken";
import type { Pos } from "./useDrag";

const TOPBAR = 48;

// Distinct zones so nothing overlaps by default:
//  - Brief token: top-left      - Risk token: bottom-left
//  - Agents: across the top (above the flight cluster) and down the right edge
function agentSpot(i: number, w: number, h: number): Pos {
  const spots: Pos[] = [
    { x: Math.round(w * 0.27), y: 46 },
    { x: Math.round(w * 0.46), y: 46 },
    { x: Math.round(w * 0.65), y: 46 },
    { x: Math.round(w - 200), y: Math.round(h * 0.42) },
    { x: Math.round(w - 200), y: Math.round(h * 0.68) },
    { x: Math.round(w * 0.5), y: Math.round(h - 110) },
  ];
  return spots[i % spots.length];
}

// Window-based sizing is reliable at mount (a measured ref can be stale on the
// first paint and collapse every token into the corner).
export default function OverlayLayer() {
  const agents = useStore((s) => s.briefing?.agents ?? []);
  const z = useState(() => ({ current: 10 }))[0];
  const [dim] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight - TOPBAR,
  }));

  if (agents.length === 0) return null;

  return (
    <div className="overlay-layer">
      {agents.map((a, i) => (
        <AgentToken key={a.agent} finding={a} initial={agentSpot(i, dim.w, dim.h)} z={z} />
      ))}
      <BriefToken initial={{ x: 12, y: 44 }} z={z} />
      <RiskToken initial={{ x: 12, y: Math.max(44, dim.h - 132) }} z={z} />
    </div>
  );
}
