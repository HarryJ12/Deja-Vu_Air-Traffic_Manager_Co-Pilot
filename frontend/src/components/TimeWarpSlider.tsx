import { useStore } from "../state/store";
import { binIndexById } from "../lib/time";

export default function TimeWarpSlider() {
  const { summary, timeBinId, setTimeBin, summaryStatus } = useStore();
  const bins = summary?.time_bins ?? [];
  const index = binIndexById(bins, timeBinId);

  if (summaryStatus.loading || bins.length === 0) {
    return (
      <div className="timeline-controls">
        <span className="monospace text-dim">NOW</span>
        <div className="skeleton" style={{ width: 280, height: 6 }} />
        <span className="monospace text-dim">+— MIN</span>
      </div>
    );
  }

  const current = bins[index];
  const label = current?.label ?? "NOW";

  return (
    <div className="timeline-controls">
      <span className="monospace text-dim">NOW</span>
      <input
        type="range"
        className="slider"
        min={0}
        max={bins.length - 1}
        step={1}
        value={index}
        aria-label="Time Warp"
        onChange={(e) => {
          const i = Number(e.target.value);
          const bin = bins[i];
          if (bin) setTimeBin(bin.id);
        }}
      />
      <span className="monospace text-dim">{label}</span>
    </div>
  );
}
