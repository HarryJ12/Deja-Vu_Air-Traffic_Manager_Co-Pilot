import { useState } from "react";
import { useStore } from "../state/store";
import { useDrag, type Pos } from "./useDrag";
import { pct, minutes, count, clockZ } from "../lib/format";
import ActionCards from "./ActionCards";
import ConfidenceBar from "./ConfidenceBar";
import { SkeletonLine } from "./Skeletons";

// Situation Brief as a draggable token. Collapsed = 1-2 sentence headline.
// Expands to "detailed" (cause/impact) then "full" (action + confidence).
export default function BriefToken({ initial, z }: { initial: Pos; z: React.MutableRefObject<number> }) {
  const { briefing, briefingStatus, openMeetingRoom } = useStore();
  const { containerRef, style, handleProps } = useDrag(initial, z);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);

  const alert = briefing ? briefing.primary_risk.utilization_pct >= 100 : false;

  return (
    <div
      ref={containerRef}
      className={`panel-token ${open ? "open" : ""}`}
      style={{ ...style, width: open ? 320 : 240 }}
    >
      <div className="token-handle" {...handleProps}>
        <span className="th-title">
          <span className={`status-dot ${alert ? "alert" : "watch"}`} />
          Situation Brief
        </span>
        <button
          className="th-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "–" : "+"}
        </button>
      </div>

      <div className="panel-token-body">
        {briefingStatus.loading && (
          <>
            <SkeletonLine width="95%" />
            <SkeletonLine width="80%" />
          </>
        )}

        {!briefingStatus.loading && !briefing && (
          <p className="text-dim">No briefing yet.</p>
        )}

        {!briefingStatus.loading && briefing && (
          <>
            {/* 1-2 sentence headline, always visible */}
            <p>{briefing.headline}</p>

            {!open && (
              <button
                className="ghost-btn block-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(true)}
              >
                Show detail
              </button>
            )}

            {open && (
              <>
                <div className="mode-toggle" style={{ marginTop: 8 }}>
                  <button
                    className={!full ? "active" : ""}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setFull(false)}
                  >
                    Detailed
                  </button>
                  <button
                    className={full ? "active" : ""}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setFull(true)}
                  >
                    Full
                  </button>
                </div>

                <p className="text-dim" style={{ marginTop: 8 }}>
                  {briefing.summary}
                </p>

                <h3 style={{ marginTop: 8 }}>Cause</h3>
                <ul>
                  {briefing.primary_risk.causes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>

                <h3 style={{ marginTop: 8 }}>Impact</h3>
                <ul>
                  <li>{count(briefing.primary_risk.affected_flight_count)} affected flights.</li>
                  <li>{minutes(briefing.primary_risk.projected_delay_minutes)} delay (heuristic).</li>
                  <li>
                    Peak {pct(briefing.primary_risk.utilization_pct)} at{" "}
                    {clockZ(briefing.primary_risk.peak_time)}.
                  </li>
                </ul>

                <button
                  className="ghost-btn block-btn"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    openMeetingRoom(
                      `What's the risk on ${briefing.primary_risk.sector_id} and what should I do?`
                    )
                  }
                >
                  Ask the room
                </button>

                {full && (
                  <div onPointerDown={(e) => e.stopPropagation()}>
                    <ActionCards />
                    <ConfidenceBar confidence={briefing.confidence} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
