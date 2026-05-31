import { useEffect, useMemo } from "react";
import { useStore } from "../state/store";
import { binIndexById } from "../lib/time";

const MAX_HORIZON_MINUTES = 18 * 60;

function minutesFrom(baseIso: string, valueIso: string) {
  return Math.max(0, Math.round((Date.parse(valueIso) - Date.parse(baseIso)) / 60000));
}

export default function TimeWarpSlider() {
  const {
    summary,
    timeBinId,
    setTimeBin,
    summaryStatus,
    stateStatus,
    nextState,
    timeWarpControls,
    setTimeWarpControl,
  } = useStore();
  const bins = summary?.time_bins ?? [];
  const base = bins.find((bin) => bin.id === summary?.initial_time_bin_id) ?? bins[0];
  const visibleBins = useMemo(() => {
    if (!base) return bins;
    return bins.filter(
      (bin) => minutesFrom(base.valid_from, bin.valid_from) <= timeWarpControls.horizonMinutes
    );
  }, [base, bins, timeWarpControls.horizonMinutes]);
  const activeBins = visibleBins.length > 0 ? visibleBins : bins;
  const index = binIndexById(activeBins, timeBinId);

  useEffect(() => {
    if (!timeBinId || activeBins.length === 0) return;
    if (!activeBins.some((bin) => bin.id === timeBinId)) {
      void setTimeBin(activeBins[activeBins.length - 1].id);
    }
  }, [activeBins, setTimeBin, timeBinId]);

  const current = activeBins[index];
  const label = current?.label ?? "NOW";
  const nextBin = activeBins[index + 1] ?? null;
  const maxHorizon = Math.max(
    60,
    base && bins.length ? minutesFrom(base.valid_from, bins[bins.length - 1].valid_from) : MAX_HORIZON_MINUTES
  );
  const cappedHorizon = Math.min(MAX_HORIZON_MINUTES, maxHorizon);

  useEffect(() => {
    if (!timeWarpControls.subBinMotion || !nextState || stateStatus.loading) return;
    const timer = window.setTimeout(() => {
      if (timeWarpControls.subBinOffsetMinutes >= 14) {
        setTimeWarpControl("subBinOffsetMinutes", 0);
        if (nextBin) {
          void setTimeBin(nextBin.id);
        } else {
          setTimeWarpControl("subBinMotion", false);
        }
        return;
      }
      setTimeWarpControl(
        "subBinOffsetMinutes",
        timeWarpControls.subBinOffsetMinutes + 1
      );
    }, 550);
    return () => window.clearTimeout(timer);
  }, [
    nextBin,
    nextState,
    setTimeBin,
    setTimeWarpControl,
    stateStatus.loading,
    timeWarpControls.subBinMotion,
    timeWarpControls.subBinOffsetMinutes,
  ]);

  if (summaryStatus.loading || bins.length === 0) {
    return (
      <div className="timeline-stack">
        <div className="timeline-controls">
          <span className="monospace text-dim">Start</span>
          <div className="skeleton" style={{ width: 280, height: 6 }} />
          <span className="monospace text-dim">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-stack">
      <div className="timeline-controls">
        <button
          type="button"
          className="timeline-reset monospace"
          onClick={() => {
            setTimeWarpControl("subBinOffsetMinutes", 0);
            if (base) void setTimeBin(base.id);
          }}
        >
          Start
        </button>
        <input
          type="range"
          className="slider"
          min={0}
          max={activeBins.length - 1}
          step={1}
          value={index}
          aria-label="Forecast time"
          onChange={(e) => {
            const i = Number(e.target.value);
            const bin = activeBins[i];
            setTimeWarpControl("subBinOffsetMinutes", 0);
            if (bin) void setTimeBin(bin.id);
          }}
        />
        <span className="monospace text-dim">{stateStatus.loading ? "Loading" : label}</span>
      </div>

      <div className="timeline-options">
        <label className="mini-control">
          <span>Range shown</span>
          <input
            type="range"
            min={60}
            max={cappedHorizon}
            step={15}
            value={Math.min(timeWarpControls.horizonMinutes, cappedHorizon)}
            aria-label="How far forward the timeline can go"
            onChange={(e) =>
              setTimeWarpControl("horizonMinutes", Number(e.target.value))
            }
          />
          <b>+{Math.round(Math.min(timeWarpControls.horizonMinutes, cappedHorizon) / 60)}h</b>
        </label>

        <button
          className={`layer-chip ${timeWarpControls.subBinMotion ? "on" : ""}`}
          type="button"
          aria-pressed={timeWarpControls.subBinMotion}
          disabled={!nextState && !nextBin}
          onClick={() => {
            const next = !timeWarpControls.subBinMotion;
            setTimeWarpControl("subBinMotion", next);
            if (!next) setTimeWarpControl("subBinOffsetMinutes", 0);
          }}
        >
          {timeWarpControls.subBinMotion ? "Pause motion" : "Play motion"}
        </button>

        <label className="mini-control subbin-control">
          <span>+{timeWarpControls.subBinOffsetMinutes} min</span>
          <input
            type="range"
            min={0}
            max={14}
            step={1}
            value={timeWarpControls.subBinOffsetMinutes}
            disabled={!timeWarpControls.subBinMotion || !nextState}
            aria-label="Minute offset inside the selected forecast step"
            onChange={(e) =>
              setTimeWarpControl("subBinOffsetMinutes", Number(e.target.value))
            }
          />
        </label>
      </div>
    </div>
  );
}
