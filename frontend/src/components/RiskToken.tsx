import { useState } from "react";
import { useStore } from "../state/store";
import { useDrag, type Pos } from "./useDrag";
import { pct, minutes, clockZ, utilSeverity } from "../lib/format";

// Risk Queue as a compact draggable token. Collapsed = count + top risk.
export default function RiskToken({ initial, z }: { initial: Pos; z: React.MutableRefObject<number> }) {
  const { state, selectedRiskId, selectRisk, loadSectorDetail } = useStore();
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const [open, setOpen] = useState(false);
  const risks = state?.risks ?? [];
  const top = risks[0];

  return (
    <div ref={containerRef} className={`panel-token ${open ? "open" : ""}`} style={{ ...style, width: 240 }}>
      <div className="token-handle" {...handleProps}>
        <span className="th-title">Risk Queue · {risks.length}</span>
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
        {risks.length === 0 && <p className="text-dim">No active risks.</p>}

        {!open && top && (
          <div className="risk-line">
            <span>
              <span className={`status-dot ${utilSeverity(top.utilization_pct)}`} /> {top.sector_id}
            </span>
            <span className="monospace text-accent">{pct(top.utilization_pct)}</span>
          </div>
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
                  <span>peak {clockZ(r.peak_time)}</span>
                  <span>
                    {r.affected_flight_count} fl · {minutes(r.projected_delay_minutes)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
