import { useStore } from "../state/store";
import { pct, signedMinutes } from "../lib/format";

export default function ActionCards() {
  const {
    briefing,
    preview,
    previewStatus,
    actionStatus,
    previewAction,
    decideAction,
    clearPreview,
  } = useStore();

  if (!briefing || briefing.recommendations.length === 0) return null;

  return (
    <>
      <h2 style={{ marginTop: 8 }}>Recommended Action</h2>
      {briefing.recommendations.map((rec) => {
        const showingPreview = preview?.recommendation_id === rec.id;
        return (
          <div className="info-block" key={rec.id}>
            <div className="info-block-row">
              <strong>{rec.title}</strong>
            </div>
            <div className="info-block-row text-dim monospace">
              <span>Confidence</span>
              <span>{pct(rec.confidence_pct)}</span>
            </div>
            <p className="text-dim" style={{ marginTop: 8 }}>
              {rec.summary}
            </p>
            <p className="text-dim" style={{ marginTop: 8 }}>
              Expected impact: {rec.expected_impact}
            </p>
            {rec.risks.length > 0 && (
              <p className="text-dim" style={{ marginTop: 8 }}>
                <strong>Operational risks:</strong> {rec.risks.join(" ")}
              </p>
            )}

            {showingPreview && (
              <div
                className="info-block"
                style={{ marginTop: 12, borderLeft: "2px solid var(--accent-red)" }}
              >
                <h3>Preview · forecast simulation</h3>
                <div className="info-block-row monospace">
                  <span className="text-dim">Max utilization</span>
                  <span>
                    {pct(preview!.before.max_utilization_pct)} →{" "}
                    {pct(preview!.after.max_utilization_pct)}
                  </span>
                </div>
                <div className="info-block-row monospace">
                  <span className="text-dim">Overloaded sectors</span>
                  <span>
                    {preview!.before.overloaded_sector_count} →{" "}
                    {preview!.after.overloaded_sector_count}
                  </span>
                </div>
                <div className="info-block-row monospace">
                  <span className="text-dim">Projected delay</span>
                  <span>
                    {signedMinutes(
                      preview!.after.projected_delay_minutes -
                        preview!.before.projected_delay_minutes
                    )}
                  </span>
                </div>
                <p className="text-dim" style={{ marginTop: 8 }}>
                  {preview!.narrative}
                </p>
              </div>
            )}

            <div className="btn-group">
              <button
                className="btn"
                onClick={() => {
                  clearPreview();
                  decideAction(rec.id, "reject");
                }}
              >
                Reject
              </button>
              <button
                className="btn"
                disabled={actionStatus.loading}
                onClick={() => decideAction(rec.id, "modify", `Modify ${rec.title}`)}
              >
                Modify
              </button>
              <button
                className="btn primary"
                disabled={previewStatus.loading}
                onClick={() => previewAction(rec.id)}
              >
                {previewStatus.loading ? "Simulating…" : showingPreview ? "Re-run" : "Preview"}
              </button>
              <button
                className="btn primary"
                disabled={actionStatus.loading}
                onClick={() => decideAction(rec.id, "accept")}
              >
                Accept
              </button>
            </div>
            {previewStatus.error && (
              <p className="text-accent monospace" style={{ marginTop: 8 }}>
                Preview failed: {previewStatus.error}
              </p>
            )}
            {actionStatus.error && (
              <p className="text-accent monospace" style={{ marginTop: 8 }}>
                Action failed: {actionStatus.error}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
