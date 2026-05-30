import type { AgentFinding } from "../lib/types";
import { agentFace, agentRole } from "./agentFaces";
import { useStore } from "../state/store";
import { useDrag, type Pos } from "./useDrag";

type Props = {
  finding: AgentFinding;
  initial: Pos;
  z: React.MutableRefObject<number>;
};

export default function AgentToken({ finding, initial, z }: Props) {
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const openMeetingRoom = useStore((s) => s.openMeetingRoom);

  const alert = finding.severity === "alert";
  const line1 = finding.metric ?? finding.title;
  const line2 = finding.evidence[0] ?? finding.detail.slice(0, 22);

  return (
    <div
      ref={containerRef}
      className={`agent-token ${alert ? "alert" : ""}`}
      style={style}
      {...handleProps}
      onDoubleClick={() => openMeetingRoom(`What does ${finding.agent} see?`)}
      title="Drag to move · double-click to enter the room"
    >
      <span className="token-face">{agentFace(finding.agent)}</span>
      <div className="token-meta">
        <div className="token-name">{finding.agent}</div>
        <div className="token-role">{agentRole(finding.agent)}</div>
        <div className="token-out">
          {line1}
          <br />
          {line2}
        </div>
      </div>
    </div>
  );
}
