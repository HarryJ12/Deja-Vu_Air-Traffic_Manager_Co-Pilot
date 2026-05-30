// lat/lon -> screen projection for the custom Canvas map.
// Equirectangular, matching the weather grid bounds in scaffolding.md (CONUS view).

export const WEATHER_GRID = {
  rows: 256,
  cols: 358,
  latMin: 21.943,
  latMax: 55.7765,
  lonMin: -135.0,
  lonMax: -67.5,
};

// Tighter view box around CONUS so the demo isn't mostly empty ocean.
export const VIEW = {
  latMin: 24.0,
  latMax: 50.0,
  lonMin: -125.0,
  lonMax: -66.5,
};

export type Projector = (lon: number, lat: number) => { x: number; y: number };

// Build a projector for a given canvas size with padding (device px aware via dpr upstream).
export function makeProjector(
  width: number,
  height: number,
  pad = 16
): Projector {
  const w = Math.max(1, width - pad * 2);
  const h = Math.max(1, height - pad * 2);
  const lonSpan = VIEW.lonMax - VIEW.lonMin;
  const latSpan = VIEW.latMax - VIEW.latMin;
  return (lon: number, lat: number) => {
    const x = pad + ((lon - VIEW.lonMin) / lonSpan) * w;
    // lat increases upward -> invert y
    const y = pad + (1 - (lat - VIEW.latMin) / latSpan) * h;
    return { x, y };
  };
}
