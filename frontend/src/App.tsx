import { useEffect } from "react";
import { useStore } from "./state/store";
import TopBar from "./components/TopBar";
import RadarMap from "./components/RadarMap";
import OverlayLayer from "./components/OverlayLayer";
import MeetingRoom from "./components/MeetingRoom";
import StoryMode from "./components/StoryMode";

export default function App() {
  const init = useStore((s) => s.init);
  const toast = useStore((s) => s.toast);
  const scenariosError = useStore((s) => s.scenariosStatus.error);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app">
      <TopBar />

      {scenariosError ? (
        <div className="state-msg error" style={{ margin: 24 }}>
          Could not load scenarios: {scenariosError}
        </div>
      ) : (
        <div className="stage">
          <RadarMap />
          <OverlayLayer />
        </div>
      )}

      <MeetingRoom />
      {!scenariosError && <StoryMode />}

      {toast && <div className="toast">{toast.message}</div>}
    </div>
  );
}
