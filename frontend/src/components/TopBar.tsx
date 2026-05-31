import { useStore } from "../state/store";
import TimeWarpSlider from "./TimeWarpSlider";
import VoiceButton from "./VoiceButton";
import MeetingRoomButton from "./MeetingRoomButton";

export default function TopBar() {
  const { scenarios, scenarioId, selectScenario } = useStore();

  return (
    <header className="header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1>DĒJÅ VŪ</h1>
        <select
          className="scenario-select"
          aria-label="Scenario"
          value={scenarioId ?? ""}
          onChange={(e) => selectScenario(e.target.value)}
          disabled={scenarios.length === 0}
        >
          {scenarios.length === 0 && <option>loading…</option>}
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.asked_at.replace("T", " ").replace("Z", "Z")} · {s.flight_count.toLocaleString()} fl
            </option>
          ))}
        </select>
      </div>

      <TimeWarpSlider />

      <div className="header-right">
        <MeetingRoomButton />
        <VoiceButton />
      </div>
    </header>
  );
}
