import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { agentFace, agentRole } from "./agentFaces";
import type { AgentName, ChatMessage } from "../lib/types";

const SUGGESTIONS = [
  "What's the risk on HIGH_142 and what should I do?",
  "Why is confidence reduced?",
  "What happens in 30 minutes if I do nothing?",
  "Which flights should I reroute first?",
];

// Seats around the table. Jarvis sits at the head (top center).
const SEATS: { agent: Exclude<AgentName, "Jarvis">; pos: React.CSSProperties }[] = [
  { agent: "Air Marshal", pos: { left: "3%", top: "26%" } },
  { agent: "Weather Boy", pos: { right: "3%", top: "26%" } },
  { agent: "Domino", pos: { left: "3%", top: "62%" } },
  { agent: "Historian", pos: { right: "3%", top: "62%" } },
];

export default function MeetingRoom() {
  const {
    meetingRoom,
    closeMeetingRoom,
    setMeetingQuestion,
    askMeetingRoom,
    briefing,
    showToast,
    previewAction,
  } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!meetingRoom.open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMeetingRoom();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [meetingRoom.open, closeMeetingRoom]);

  if (!meetingRoom.open) return null;

  const { question, loading, error, responses } = meetingRoom;
  const submit = () => question.trim() && askMeetingRoom(question);

  const byAgent = new Map<string, ChatMessage>();
  responses?.messages
    .filter((m) => m.role === "agent" && m.agent && m.agent !== "Jarvis")
    .forEach((m) => byAgent.set(m.agent!, m));
  const jarvisMessage = responses?.messages.find((m) => m.agent === "Jarvis");

  const synthRecId = responses?.briefing.recommendations[0]?.id ?? null;
  const recExists = !!briefing?.recommendations.find((r) => r.id === synthRecId);

  const seatBody = (agent: Exclude<AgentName, "Jarvis">) => {
    const r = byAgent.get(agent);
    if (loading) return <div className="skeleton skeleton-line" style={{ width: "90%" }} />;
    if (r) return <p className="seat-line">{r.content}</p>;
    return <p className="seat-line text-dim">Standing by…</p>;
  };

  return (
    <div
      className="room-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && closeMeetingRoom()}
    >
      <div className="room-scene" role="dialog" aria-label="Agent Meeting Room">
        <div className="room-topbar">
          <span className="room-title">Agent Meeting Room</span>
          <button className="ghost-btn" onClick={closeMeetingRoom}>
            Close
          </button>
        </div>

        <div className="room-floor">
          {/* The table */}
          <div className="room-table">
            <span className="room-table-label monospace">DĒJÅ VŪ // ROUNDTABLE</span>
          </div>

          {/* Jarvis at the head */}
          <div className={`seat seat-head ${responses ? "active" : ""}`}>
            <span className="seat-face jarvis">{agentFace("Jarvis")}</span>
            <div className="seat-meta">
              <div className="seat-name">Jarvis</div>
              <div className="seat-role">{agentRole("Jarvis")}</div>
            </div>
            <div className="seat-bubble jarvis-bubble">
              {loading && <div className="skeleton skeleton-line" style={{ width: "80%" }} />}
              {!loading && responses && <p className="seat-line">{jarvisMessage?.content ?? responses.note}</p>}
              {!loading && !responses && <p className="seat-line text-dim">Ask the room to begin.</p>}
              {!loading && responses && synthRecId && (
                <button
                  className="btn primary"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    if (recExists) {
                      previewAction(synthRecId);
                      closeMeetingRoom();
                      showToast("Previewing recommended action");
                    } else {
                      showToast("Linked recommendation not in current briefing");
                    }
                  }}
                >
                  View action →
                </button>
              )}
            </div>
          </div>

          {/* Specialists around the table */}
          {SEATS.map(({ agent, pos }) => {
            const r = byAgent.get(agent);
            const alert = r?.severity === "alert";
            return (
              <div key={agent} className={`seat ${alert ? "alert" : ""}`} style={pos}>
                <span className="seat-face">{agentFace(agent)}</span>
                <div className="seat-meta">
                  <div className="seat-name">{agent}</div>
                  <div className="seat-role">{agentRole(agent)}</div>
                </div>
                <div className="seat-bubble">{seatBody(agent)}</div>
              </div>
            );
          })}
        </div>

        {error && <div className="state-msg error room-error">Meeting room failed: {error}</div>}

        {!responses && !loading && (
          <div className="room-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => {
                  setMeetingQuestion(s);
                  askMeetingRoom(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="room-bar">
          <input
            ref={inputRef}
            className="room-input"
            value={question}
            placeholder="Speak to the room…"
            onChange={(e) => setMeetingQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button className="ptt-button" onClick={submit} disabled={loading || !question.trim()}>
            {loading ? "Asking…" : "Ask all"}
          </button>
        </div>
      </div>
    </div>
  );
}
