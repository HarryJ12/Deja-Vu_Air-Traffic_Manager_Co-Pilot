import { useEffect } from "react";
import type { AgentFinding } from "../lib/types";
import { useStore } from "../state/store";
import { useDrag, type Pos } from "./useDrag";
import { agentFace, agentRole } from "./agentFaces";

type Props = {
  finding: AgentFinding;
  initial: Pos;
  z: React.MutableRefObject<number>;
  onClose: () => void;
};

export default function AgentChatPanel({ finding, initial, z, onClose }: Props) {
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const {
    agentChat,
    openAgentChat,
    closeAgentChat,
    setAgentQuestion,
    askAgentChat,
  } = useStore();
  const active = agentChat.open && agentChat.agent === finding.agent;
  const messages = active ? agentChat.history : [];
  const featured = finding.agent === "Historian";

  useEffect(() => {
    openAgentChat(finding.agent, `What should ${finding.agent} look at next?`);
    return () => closeAgentChat();
  }, [closeAgentChat, finding.agent, openAgentChat]);

  return (
    <section
      ref={containerRef}
      className={[
        "panel-token",
        "agent-chat-panel",
        featured ? "agent-chat-panel--featured" : "agent-chat-panel--neutral",
        active ? "active" : "",
        finding.severity === "alert" ? "alert" : "",
      ].join(" ")}
      style={{ ...style, width: 380, zIndex: 1000 }}
    >
      <div className="token-handle agent-chat-handle" {...handleProps}>
        <div className="agent-chat-title">
          <span className="agent-chat-face">{agentFace(finding.agent)}</span>
          <div>
            <strong>{finding.agent}</strong>
            <span className="agent-chat-subtitle">{agentRole(finding.agent)}</span>
          </div>
        </div>
        <button
          className="ghost-btn radar-card-x"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            closeAgentChat();
            onClose();
          }}
        >
          x
        </button>
      </div>

      <div className="agent-chat-body">
        <div className="agent-chat-status">
          {active ? "Solo specialist channel" : "Opening channel"}
        </div>
        <div className="agent-chat-summary">
          <strong>{finding.title}</strong>
          <p>{finding.detail}</p>
          {finding.evidence.length > 0 && (
            <ul>
              {finding.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        {messages.length > 0 && (
          <div className="agent-chat-thread">
            {messages.map((message, index) => (
              <div
                key={`${message.agent ?? "operator"}-${index}`}
                className={`agent-chat-message ${message.agent ? "agent" : "operator"} ${message.severity}`}
              >
                <span className="agent-chat-speaker">{message.agent ?? "You"}</span>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        )}
        {agentChat.error && <p className="voice-error">{agentChat.error}</p>}
      </div>

      <form
        className="agent-chat-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          void askAgentChat(agentChat.question);
        }}
      >
        <input
          className="room-input"
          value={agentChat.question}
          onChange={(event) => setAgentQuestion(event.target.value)}
          placeholder={`Ask ${finding.agent}`}
          disabled={agentChat.loading}
        />
        <button className="btn primary" disabled={agentChat.loading || !agentChat.question.trim()}>
          {agentChat.loading ? "..." : "Send"}
        </button>
      </form>
    </section>
  );
}
