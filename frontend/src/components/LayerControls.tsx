import { useStore } from "../state/store";
import type { AltitudeLens } from "../state/store";

const LAYERS: { key: "flights" | "weather" | "towers" | "labels"; label: string }[] = [
  { key: "flights", label: "Planes" },
  { key: "weather", label: "Storms" },
  { key: "towers", label: "Airports" },
  { key: "labels", label: "Names" },
];

const ALTITUDE_LENSES: { value: AltitudeLens; label: string }[] = [
  { value: "ALL", label: "All planes" },
  { value: "LOW", label: "Below 35k ft" },
  { value: "HIGH", label: "35k ft+" },
];

export default function LayerControls() {
  const { layers, toggleLayer, timeWarpControls, setTimeWarpControl } = useStore();
  return (
    <div className="map-overlay-bl">
      <div className="layer-chip-row">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            className={`layer-chip ${layers[l.key] ? "on" : ""}`}
            aria-pressed={layers[l.key]}
            onClick={() => toggleLayer(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="warp-control-panel">
        <div className="control-panel-title monospace">Simulation controls</div>
        <div className="control-row">
          <span>Risk trigger</span>
          <input
            type="range"
            min={70}
            max={120}
            step={5}
            value={timeWarpControls.capacityThresholdPct}
            aria-label="How full an airspace area must be before it is highlighted"
            onChange={(e) =>
              setTimeWarpControl("capacityThresholdPct", Number(e.target.value))
            }
          />
          <b>{timeWarpControls.capacityThresholdPct}%</b>
        </div>

        <div className="control-row">
          <span>Storm cutoff</span>
          <input
            type="range"
            min={20}
            max={60}
            step={5}
            value={timeWarpControls.weatherDbzThreshold}
            aria-label="Minimum storm intensity shown on the radar"
            onChange={(e) =>
              setTimeWarpControl("weatherDbzThreshold", Number(e.target.value))
            }
          />
          <b>{timeWarpControls.weatherDbzThreshold} dBZ</b>
        </div>

        <div className="control-row">
          <span>What-if strength</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={timeWarpControls.interventionIntensityPct}
            aria-label="How aggressive the recommended fix should be"
            onChange={(e) =>
              setTimeWarpControl("interventionIntensityPct", Number(e.target.value))
            }
          />
          <b>{timeWarpControls.interventionIntensityPct}%</b>
        </div>

        <div className="lens-row" aria-label="Plane altitude filter">
          {ALTITUDE_LENSES.map((lens) => (
            <button
              key={lens.value}
              type="button"
              className={`layer-chip ${timeWarpControls.altitudeLens === lens.value ? "on" : ""}`}
              aria-pressed={timeWarpControls.altitudeLens === lens.value}
              onClick={() => setTimeWarpControl("altitudeLens", lens.value)}
            >
              {lens.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
