import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { agentFace, agentRole } from "./agentFaces";
import type { AgentName, ChatMessage } from "../lib/types";
import VoiceButton from "./VoiceButton";

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
  { agent: "Domino", pos: { left: "3%", top: "58%" } },
  { agent: "Risko", pos: { left: "50%", bottom: "4%", transform: "translateX(-50%)" } },
  { agent: "Historian", pos: { right: "3%", top: "58%" } },
];

const SEAT_CLASS: Record<Exclude<AgentName, "Jarvis">, string> = {
  "Air Marshal": "air-marshal",
  "Weather Boy": "weather",
  Domino: "domino",
  Risko: "risko",
  Historian: "historian",
};

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

  const { question, loading, error, responses, history } = meetingRoom;
  const submit = () => question.trim() && askMeetingRoom(question, true);

  const conversation = history.length > 0 ? history : responses?.messages ?? [];
  const byAgent = new Map<string, ChatMessage>();
  conversation
    .filter((m) => m.role === "agent" && m.agent && m.agent !== "Jarvis")
    .forEach((m) => byAgent.set(m.agent!, m));
  let jarvisMessage: ChatMessage | undefined;
  conversation.forEach((m) => {
    if (m.agent === "Jarvis") jarvisMessage = m;
  });

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

          <div className="room-transcript" aria-live="polite">
            {conversation.length === 0 && (
              <p className="room-transcript-empty">The room transcript appears here.</p>
            )}
            {conversation.map((message, index) => (
              <div
                key={`${message.agent ?? "operator"}-${message.source ?? "turn"}-${index}`}
                className={`room-transcript-line ${message.role}`}
              >
                <span>{message.agent ?? "You"}</span>
                <p>{message.content}</p>
              </div>
            ))}
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
            const isHistorian = agent === "Historian";
            const alert = r?.severity === "alert";
            return (
              <div
                key={agent}
                className={[
                  "seat",
                  `seat--${SEAT_CLASS[agent]}`,
                  isHistorian ? "seat--featured" : "seat--neutral",
                  alert ? "alert" : "",
                ].join(" ")}
                style={pos}
              >
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

        {history.length > 0 && (
          <div className="room-thread" aria-label="Meeting room conversation">
            {history.map((message, index) => (
              <p
                key={`${message.agent ?? "operator"}-${message.source ?? "message"}-${index}`}
                className={message.agent === "Historian" ? "historian" : ""}
              >
                <b>{message.agent ?? "You"}:</b> {message.content}
              </p>
            ))}
          </div>
        )}

        {!responses && !loading && (
          <div className="room-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => {
                  setMeetingQuestion(s);
                  askMeetingRoom(s, true);
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
            placeholder="Hold M to cut in, or type a question..."
            onChange={(e) => setMeetingQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <VoiceButton mode="meeting_room" className="room-voice" />
          <button className="ptt-button" onClick={submit} disabled={!question.trim()}>
            {loading ? "Interrupt" : "Ask all"}
          </button>
        </div>
      </div>
    </div>
  );
}
