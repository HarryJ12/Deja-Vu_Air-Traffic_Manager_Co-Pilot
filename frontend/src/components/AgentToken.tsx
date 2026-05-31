import { useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import type { AgentFinding } from "../lib/types";
import { agentFace, agentRole } from "./agentFaces";
import AgentChatPanel from "./AgentChatPanel";
import { useDrag, type Pos } from "./useDrag";

type Props = {
  finding: AgentFinding;
  initial: Pos;
  z: MutableRefObject<number>;
};

const TOKEN_CLASS: Record<AgentFinding["agent"], string> = {
  Jarvis: "jarvis",
  "Weather Boy": "weather",
  "Air Marshal": "air-marshal",
  Domino: "domino",
  Risko: "risko",
  Historian: "historian",
};

const SEVERITY_LABEL: Record<AgentFinding["severity"], string> = {
  info: "Info",
  watch: "Watch",
  alert: "Alert",
};

export default function AgentToken({ finding, initial, z }: Props) {
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const [chatOpen, setChatOpen] = useState(false);
  const pointerStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const isHistorian = finding.agent === "Historian";
  const blurb = finding.metric ? `${finding.metric} · ${finding.title}` : finding.title;
  const className = [
    "agent-token",
    `agent-token--${TOKEN_CLASS[finding.agent]}`,
    isHistorian ? "agent-token--featured" : "agent-token--neutral",
    `severity-${finding.severity}`,
  ].join(" ");
  const panelInitial = {
    x: Math.max(12, Math.round((window.innerWidth - 380) / 2)),
    y: Math.max(72, Math.round((window.innerHeight - 520) / 2)),
  };

  const dragProps = {
    ...handleProps,
    onPointerDown: (e: PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY, moved: false };
      handleProps.onPointerDown(e);
    },
    onPointerMove: (e: PointerEvent) => {
      if (pointerStart.current) {
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        if (dx > 4 || dy > 4) pointerStart.current.moved = true;
      }
      handleProps.onPointerMove(e);
    },
    onPointerUp: () => {
      handleProps.onPointerUp();
    },
    onPointerCancel: () => {
      pointerStart.current = null;
      handleProps.onPointerCancel();
    },
  };

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={style}
        {...dragProps}
        onClick={() => {
          if (!pointerStart.current?.moved) setChatOpen(true);
          pointerStart.current = null;
        }}
        onDoubleClick={() => setChatOpen(true)}
        aria-label={`${finding.agent}, ${agentRole(finding.agent)}, ${finding.title}`}
        title="Drag to move · click to open this agent"
      >
        <span className="token-face">{agentFace(finding.agent)}</span>
        <div className="token-meta">
          <div className="token-heading">
            <div className="token-name">{finding.agent}</div>
            <div className="token-status">{SEVERITY_LABEL[finding.severity]}</div>
          </div>
          <div className="token-role">{agentRole(finding.agent)}</div>
          <div className="token-out">{blurb}</div>
        </div>
      </div>

      {chatOpen && (
        <AgentChatPanel
          finding={finding}
          initial={panelInitial}
          z={z}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
