import type { AgentName } from "../lib/types";

// SVG persona faces ported from dejavu_agents.html. currentColor follows token state.
const svgProps = {
  className: "face",
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const FACES: Record<string, JSX.Element> = {
  "Air Marshal": (
    <svg {...svgProps}>
      <path d="M13 25 Q32 13 51 25" />
      <path d="M27 19 l5 -4 l5 4" />
      <circle cx="32" cy="37" r="19" />
      <circle cx="25" cy="35" r="1.6" fill="currentColor" />
      <circle cx="39" cy="35" r="1.6" fill="currentColor" />
      <path d="M25 47 H39" />
    </svg>
  ),
  "Weather Boy": (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="19" />
      <path d="M33 15 l-5 8 h5 l-4 8" />
      <circle cx="25" cy="34" r="1.6" fill="currentColor" />
      <circle cx="39" cy="34" r="1.6" fill="currentColor" />
      <path d="M24 47 q4 -4 8 0 t8 0" />
    </svg>
  ),
  Domino: (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="19" />
      <path d="M32 28 V44" strokeWidth={1.5} />
      <circle cx="25" cy="31" r="1.5" fill="currentColor" />
      <circle cx="25" cy="38" r="1.5" fill="currentColor" />
      <circle cx="39" cy="30" r="1.5" fill="currentColor" />
      <circle cx="39" cy="34" r="1.5" fill="currentColor" />
      <circle cx="39" cy="38" r="1.5" fill="currentColor" />
      <path d="M26 48 H38" />
    </svg>
  ),
  Historian: (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="19" />
      <circle cx="25" cy="34" r="1.6" fill="currentColor" />
      <circle cx="40" cy="34" r="5.5" />
      <path d="M45 39 q4 5 -1 8" strokeWidth={1.5} />
      <path d="M24 45 q8 5 15 0" />
    </svg>
  ),
  Jarvis: (
    <svg {...svgProps}>
      <circle cx="32" cy="34" r="19" />
      <circle cx="32" cy="34" r="9" strokeWidth={1.5} />
      <circle cx="32" cy="34" r="2" fill="currentColor" />
      <path d="M32 6 V12 M32 56 V62 M6 34 H12 M52 34 H58" />
    </svg>
  ),
};

const ROLES: Record<string, string> = {
  "Air Marshal": "Capacity",
  "Weather Boy": "Met Impact",
  Domino: "Network",
  Historian: "Precedent",
  Jarvis: "Moderator",
};

export function agentFace(agent: AgentName): JSX.Element {
  return FACES[agent] ?? FACES.Jarvis;
}

export function agentRole(agent: AgentName): string {
  return ROLES[agent] ?? "Agent";
}
