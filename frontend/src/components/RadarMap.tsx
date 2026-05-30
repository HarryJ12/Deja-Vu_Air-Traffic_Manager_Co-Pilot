import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { VIEW } from "../lib/projection";
import { AIRPORTS, airportName, airportCity, flightDisplayName } from "../lib/airports";
import type { FlightDetailResponse, FlightPosition, MapInspectionResponse } from "../lib/types";
import LayerControls from "./LayerControls";

const GREEN = "#2fe06a";
const GREEN_DIM = "#155e33";
const GREEN_RING = "#1f7d44";

type Hit = { id: string; x: number; y: number };

// Geographic -> radar scope. North up, bounding box scaled to fit inside the circle.
function radarProject(lon: number, lat: number, cx: number, cy: number, R: number) {
  const lonMid = (VIEW.lonMin + VIEW.lonMax) / 2;
  const latMid = (VIEW.latMin + VIEW.latMax) / 2;
  const nx = (lon - lonMid) / ((VIEW.lonMax - VIEW.lonMin) / 2);
  const ny = (lat - latMid) / ((VIEW.latMax - VIEW.latMin) / 2);
  return { x: cx + nx * R * 0.72, y: cy - ny * R * 0.72 };
}

function radarUnproject(x: number, y: number, cx: number, cy: number, R: number) {
  const lonMid = (VIEW.lonMin + VIEW.lonMax) / 2;
  const latMid = (VIEW.latMin + VIEW.latMax) / 2;
  const nx = (x - cx) / (R * 0.72);
  const ny = (cy - y) / (R * 0.72);
  return {
    lon: lonMid + nx * ((VIEW.lonMax - VIEW.lonMin) / 2),
    lat: latMid + ny * ((VIEW.latMax - VIEW.latMin) / 2),
  };
}

function drawPlane(ctx: CanvasRenderingContext2D, angle: number, color: string) {
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -9); // nose
  ctx.lineTo(0, 7); // fuselage
  ctx.moveTo(-8, 0); // wings
  ctx.lineTo(8, 0);
  ctx.moveTo(-4, 7); // tail
  ctx.lineTo(4, 7);
  ctx.stroke();
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.rect(-4, -9, 8, 6); // cab
  ctx.moveTo(0, -3); // mast
  ctx.lineTo(0, 7);
  ctx.moveTo(-6, 7); // base
  ctx.lineTo(6, 7);
  ctx.stroke();
  ctx.beginPath(); // antenna
  ctx.moveTo(0, -9);
  ctx.lineTo(0, -13);
  ctx.stroke();
}

export default function RadarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flightHits = useRef<Hit[]>([]);
  const towerHits = useRef<Hit[]>([]);
  const sweep = useRef(0);
  const raf = useRef(0);

  const {
    state,
    stateStatus,
    layers,
    selectedFlightId,
    selectedTowerId,
    mapInspection,
    flightDetail,
    inspectionStatus,
    selectFlight,
    selectTower,
    inspectMap,
    loadFlightDetail,
    clearInspection,
  } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastW = 0;
    let lastH = 0;

    const towersFromFlights = (): { icao: string; lon: number; lat: number }[] => {
      const set = new Set<string>();
      for (const f of state?.flights ?? []) {
        if (AIRPORTS[f.origin]) set.add(f.origin);
        if (AIRPORTS[f.destination]) set.add(f.destination);
      }
      return [...set].map((icao) => ({ icao, lon: AIRPORTS[icao].lon, lat: AIRPORTS[icao].lat }));
    };

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w !== lastW || h !== lastH) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        lastW = w;
        lastH = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) / 2 - 28;
      if (R <= 0) {
        raf.current = requestAnimationFrame(render);
        return;
      }

      // Range rings
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.strokeStyle = i === 4 ? GREEN_RING : GREEN_DIM;
        ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Crosshair
      ctx.strokeStyle = GREEN_DIM;
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.stroke();

      // Bearing ticks + labels every 30°
      ctx.fillStyle = GREEN_RING;
      ctx.font = "10px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let deg = 0; deg < 360; deg += 30) {
        const a = (deg - 90) * (Math.PI / 180);
        const x1 = cx + Math.cos(a) * R;
        const y1 = cy + Math.sin(a) * R;
        const x2 = cx + Math.cos(a) * (R - 8);
        const y2 = cy + Math.sin(a) * (R - 8);
        ctx.strokeStyle = GREEN_RING;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const lx = cx + Math.cos(a) * (R - 18);
        const ly = cy + Math.sin(a) * (R - 18);
        ctx.fillText(String(deg).padStart(3, "0"), lx, ly);
      }

      // Sweep beam
      sweep.current = (sweep.current + 0.012) % (Math.PI * 2);
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(sweep.current - 0.5, cx, cy)
        : null;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sweep.current - 0.45, sweep.current);
      ctx.closePath();
      if (grad) {
        grad.addColorStop(0, "rgba(47,224,106,0)");
        grad.addColorStop(0.08, "rgba(47,224,106,0.28)");
        grad.addColorStop(0.1, "rgba(47,224,106,0)");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = "rgba(47,224,106,0.16)";
      }
      ctx.fill();
      ctx.restore();
      // Leading edge line
      ctx.strokeStyle = "rgba(125,255,176,0.7)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep.current) * R, cy + Math.sin(sweep.current) * R);
      ctx.stroke();

      // Clip artifacts to the scope circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const conflictIds = new Set((state?.weather_conflicts ?? []).map((c) => c.flight_id));

      // Weather cells
      if (layers.weather) {
        const weatherPoints =
          state?.weather_tiles?.[0]?.points ??
          (state?.weather_conflicts ?? []).map((c) => ({
            lat: c.lat,
            lon: c.lon,
            refc_dbz: c.refc_dbz,
            retop_ft: c.retop_ft,
          }));
        for (const p of weatherPoints) {
          const { x, y } = radarProject(p.lon, p.lat, cx, cy, R);
          const a = Math.max(0.12, Math.min(0.5, (p.refc_dbz - 30) / 50));
          const size = 10 + (p.refc_dbz - 40) * 0.4;
          ctx.fillStyle = `rgba(211,47,47,${a})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }

      // Towers
      towerHits.current = [];
      if (layers.towers) {
        for (const t of towersFromFlights()) {
          const { x, y } = radarProject(t.lon, t.lat, cx, cy, R);
          towerHits.current.push({ id: t.icao, x, y });
          const selected = t.icao === selectedTowerId;
          ctx.save();
          ctx.translate(x, y);
          drawTower(ctx, selected ? "#ffffff" : GREEN_RING);
          ctx.restore();
          if (layers.labels) {
            ctx.fillStyle = selected ? "#ffffff" : GREEN_RING;
            ctx.font = "9px ui-monospace, Menlo, monospace";
            ctx.textAlign = "center";
            ctx.fillText(t.icao, x, y + 22);
          }
        }
      }

      // Flights
      flightHits.current = [];
      if (layers.flights) {
        for (const f of state?.flights ?? []) {
          const { x, y } = radarProject(f.lon, f.lat, cx, cy, R);
          flightHits.current.push({ id: f.flight_id, x, y });

          // Heading toward destination if known
          let angle = 0;
          const dest = AIRPORTS[f.destination];
          if (dest) {
            const d = radarProject(dest.lon, dest.lat, cx, cy, R);
            angle = Math.atan2(d.y - y, d.x - x) + Math.PI / 2;
          }
          const conflict = conflictIds.has(f.flight_id);
          const selected = f.flight_id === selectedFlightId;
          const color = selected ? "#ffffff" : conflict ? "#ff5a5a" : GREEN;
          ctx.save();
          ctx.translate(x, y);
          drawPlane(ctx, angle, color);
          ctx.restore();

          if (layers.labels) {
            ctx.fillStyle = color;
            ctx.font = "9px ui-monospace, Menlo, monospace";
            ctx.textAlign = "left";
            ctx.fillText(f.flight_number, x + 11, y + 3);
          }
        }
      }

      ctx.restore(); // unclip
      raf.current = requestAnimationFrame(render);
    };

    raf.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf.current);
  }, [state, layers, selectedFlightId, selectedTowerId]);

  const onClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const near = (h: Hit) => Math.hypot(h.x - px, h.y - py) < 14;

    const f = flightHits.current.find(near);
    if (f) {
      selectFlight(f.id === selectedFlightId ? null : f.id);
      clearInspection();
      if (f.id !== selectedFlightId) loadFlightDetail(f.id);
      return;
    }
    const t = towerHits.current.find(near);
    if (t) {
      selectTower(t.id === selectedTowerId ? null : t.id);
      return;
    }
    selectFlight(null);
    selectTower(null);
    clearInspection();
    const w = container.clientWidth;
    const h = container.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 28;
    if (R > 0 && Math.hypot(px - cx, py - cy) <= R) {
      const point = radarUnproject(px, py, cx, cy, R);
      inspectMap(point.lat, point.lon);
    }
  };

  const selFlight = state?.flights.find((f) => f.flight_id === selectedFlightId) ?? null;
  const selTower = selectedTowerId ? AIRPORTS[selectedTowerId] : null;

  return (
    <main className="radar-container" ref={containerRef}>
      <canvas ref={canvasRef} className="map-canvas" onClick={onClick} />

      <LayerControls />

      {selFlight && (
        <FlightCard
          f={selFlight}
          detail={flightDetail}
          loading={inspectionStatus.loading}
          onClose={() => {
            selectFlight(null);
            clearInspection();
          }}
        />
      )}
      {selTower && (
        <TowerCard
          icao={selTower.icao}
          flightCount={
            state?.flights.filter(
              (f) => f.origin === selTower.icao || f.destination === selTower.icao
            ).length ?? 0
          }
          onClose={() => selectTower(null)}
        />
      )}

      {stateStatus.loading && (
        <div className="radar-loading monospace">[ acquiring tracks… ]</div>
      )}
      {mapInspection && (
        <InspectionCard inspection={mapInspection} onClose={clearInspection} />
      )}
    </main>
  );
}

function FlightCard({
  f,
  detail,
  loading,
  onClose,
}: {
  f: FlightPosition;
  detail: FlightDetailResponse | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="radar-card">
      <div className="info-block-row">
        <strong>{flightDisplayName(f.flight_number)}</strong>
        <button className="ghost-btn radar-card-x" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="text-dim monospace" style={{ marginBottom: 6 }}>
        {f.flight_number}
      </div>
      <div className="text-dim" style={{ fontSize: 12 }}>
        {airportCity(f.origin)} → {airportCity(f.destination)}
      </div>
      <div className="text-dim monospace" style={{ marginTop: 6 }}>
        {f.origin} → {f.destination}
        <br />
        FL{Math.round(f.altitude_ft / 100)} · {f.speed_kt} KT
      </div>
      {loading && <div className="text-dim monospace" style={{ marginTop: 8 }}>[ inspecting flight… ]</div>}
      {detail && (
        <div className="text-dim monospace" style={{ marginTop: 8 }}>
          Sector {detail.sector_id ?? "outside sector"}
          <br />
          WX {detail.weather.severity.toUpperCase()} · {detail.route.length} route pts
        </div>
      )}
    </div>
  );
}

function InspectionCard({
  inspection,
  onClose,
}: {
  inspection: MapInspectionResponse;
  onClose: () => void;
}) {
  const sector = inspection.sectors[0];
  return (
    <div className="radar-card" style={{ left: 18, right: "auto" }}>
      <div className="info-block-row">
        <strong>Scope Inspect</strong>
        <button className="ghost-btn radar-card-x" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-dim" style={{ marginTop: 6 }}>
        {inspection.narrative}
      </p>
      <div className="text-dim monospace" style={{ marginTop: 8 }}>
        {sector ? `${sector.sector_id} · ${Math.round(sector.utilization_pct)}%` : "No sector"}
        <br />
        WX {inspection.weather.severity.toUpperCase()}
        <br />
        {inspection.nearby_flights.length} nearby flights
      </div>
    </div>
  );
}

function TowerCard({
  icao,
  flightCount,
  onClose,
}: {
  icao: string;
  flightCount: number;
  onClose: () => void;
}) {
  return (
    <div className="radar-card">
      <div className="info-block-row">
        <strong>{icao}</strong>
        <button className="ghost-btn radar-card-x" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="text-dim" style={{ fontSize: 12 }}>
        {airportName(icao)}
      </div>
      <div className="text-dim monospace" style={{ marginTop: 6 }}>
        {airportCity(icao)}
        <br />
        {flightCount} tracked flights to/from
      </div>
    </div>
  );
}
