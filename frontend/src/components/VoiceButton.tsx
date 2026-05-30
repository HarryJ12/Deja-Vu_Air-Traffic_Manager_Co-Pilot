import { useState } from "react";
import { useStore } from "../state/store";

// Push-to-talk. MVP: hold shows LISTENING; on release we open the Meeting Room
// with a typed fallback (no live STT yet).
export default function VoiceButton() {
  const [listening, setListening] = useState(false);
  const openMeetingRoom = useStore((s) => s.openMeetingRoom);

  const stop = (open: boolean) => {
    setListening(false);
    if (open) openMeetingRoom();
  };

  return (
    <button
      className={`ptt-button ${listening ? "listening" : ""}`}
      onMouseDown={() => setListening(true)}
      onMouseUp={() => stop(true)}
      onMouseLeave={() => listening && stop(false)}
      aria-pressed={listening}
    >
      {listening ? "Listening…" : "Hold to talk: Jarvis"}
    </button>
  );
}
