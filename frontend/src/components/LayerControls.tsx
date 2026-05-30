import { useStore } from "../state/store";

const LAYERS: { key: "flights" | "weather" | "towers" | "labels"; label: string }[] = [
  { key: "flights", label: "Flights" },
  { key: "weather", label: "Weather" },
  { key: "towers", label: "Towers" },
  { key: "labels", label: "Labels" },
];

export default function LayerControls() {
  const { layers, toggleLayer } = useStore();
  return (
    <div className="map-overlay-bl">
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
  );
}
