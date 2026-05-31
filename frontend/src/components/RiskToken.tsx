import { useState } from "react";
import { filterRisksForControls, useStore } from "../state/store";
import { useDrag, type Pos } from "./useDrag";
import { pct, minutes, clockZ, utilSeverity } from "../lib/format";

// Problem List as a compact draggable token. Collapsed = count + top problem.
export default function RiskToken({ initial, z }: { initial: Pos; z: React.MutableRefObject<number> }) {
  const { state, timeWarpControls, selectedRiskId, selectRisk, loadSectorDetail } = useStore();
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const [open, setOpen] = useState(false);
  const risks = filterRisksForControls(state?.risks ?? [], timeWarpControls);
  const top = risks[0];
  const planeFilter =
    timeWarpControls.altitudeLens === "ALL"
      ? "all planes"
      : timeWarpControls.altitudeLens === "HIGH"
        ? "above 35k ft"
        : "below 35k ft";
  const predictionSource =
    "Predicted from airspace crowding, storm intersections, downstream delay pressure, similar past cases, and confidence checks.";

  return (
    <div ref={containerRef} className={`panel-token ${open ? "open" : ""}`} style={{ ...style, width: 240 }}>
      <div className="token-handle" {...handleProps}>
        <span className="th-title">
          Problem List · {risks.length}
          <span className="token-filter-note">
            {planeFilter} · {timeWarpControls.capacityThresholdPct}%+ full
          </span>
        </span>
        <button
          className="th-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "–" : "+"}
        </button>
      </div>

      <div className="panel-token-body">
        <p className="text-dim risk-source-note">{predictionSource}</p>

        {risks.length === 0 && (
          <p className="text-dim">No predicted problems above the active fullness and altitude filters.</p>
        )}

        {!open && top && (
          <>
            <div className="risk-line">
              <span>
                <span className={`status-dot ${utilSeverity(top.utilization_pct)}`} /> {top.sector_id}
              </span>
              <span className="monospace text-accent">{pct(top.utilization_pct)}</span>
            </div>
            <p className="text-dim risk-source-note">
              Top prediction combines {top.affected_flight_count} planes, {minutes(top.projected_delay_minutes)} delay, storm conflicts, and similar past cases.
            </p>
          </>
        )}

        {open &&
          risks.map((r) => {
            const sev = utilSeverity(r.utilization_pct);
            const selected = r.id === selectedRiskId;
            return (
              <div
                key={r.id}
                className={`risk-item ${sev === "alert" ? "alert" : ""} ${selected ? "selected" : ""}`}
                style={{ marginTop: 8 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  selectRisk(selected ? null : r.id);
                  if (!selected) loadSectorDetail(r.sector_id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectRisk(selected ? null : r.id);
                    if (!selected) loadSectorDetail(r.sector_id);
                  }
                }}
              >
                <div className="info-block-row" style={{ marginBottom: 4 }}>
                  <strong>{r.sector_id}</strong>
                  <span className={sev === "alert" ? "text-accent monospace" : "monospace"}>
                    {pct(r.utilization_pct)}
                  </span>
                </div>
                <div className="info-block-row monospace text-dim" style={{ marginBottom: 0 }}>
                  <span>at {clockZ(r.peak_time)}</span>
                  <span>
                    {r.affected_flight_count} planes · {minutes(r.projected_delay_minutes)}
                  </span>
                </div>
                <p className="text-dim risk-source-note">
                  Prediction signal: {pct(r.utilization_pct)} full, storm pressure when present, downstream delay estimate, and similar past cases.
                </p>
              </div>
            );
          })}
      </div>
    </div>
  );
}
