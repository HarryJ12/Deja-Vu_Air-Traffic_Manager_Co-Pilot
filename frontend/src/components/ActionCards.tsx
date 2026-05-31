import { useState } from "react";
import { useStore } from "../state/store";
import { pct, signedMinutes } from "../lib/format";

type PendingDecision = "accept" | "modify" | "reject";

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
  const [pendingPreviewId, setPendingPreviewId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    decision: PendingDecision;
  } | null>(null);

  if (!briefing || briefing.recommendations.length === 0) return null;

  return (
    <>
      <h2 style={{ marginTop: 8 }}>Recommended Action</h2>
      {briefing.recommendations.map((rec) => {
        const showingPreview = preview?.recommendation_id === rec.id;
        const previewing = previewStatus.loading && pendingPreviewId === rec.id;
        const deciding = actionStatus.loading && pendingDecision?.id === rec.id;
        const decisionLabel = (decision: PendingDecision, label: string, loading: string) =>
          deciding && pendingDecision?.decision === decision ? loading : label;
        const runPreview = async () => {
          setPendingPreviewId(rec.id);
          try {
            await previewAction(rec.id);
          } finally {
            setPendingPreviewId(null);
          }
        };
        const runDecision = async (decision: PendingDecision, note?: string) => {
          setPendingDecision({ id: rec.id, decision });
          if (decision === "reject") clearPreview();
          try {
            await decideAction(rec.id, decision, note);
          } finally {
            setPendingDecision(null);
          }
        };

        return (
          <div className="info-block action-card" key={rec.id}>
            <div className="info-block-row">
              <strong className="action-title">{rec.title}</strong>
            </div>
            <div className="info-block-row text-dim monospace">
              <span>Confidence</span>
              <span>{pct(rec.confidence_pct)}</span>
            </div>
            <p className="text-dim action-copy">
              {rec.summary}
            </p>
            <p className="text-dim action-copy">
              Expected impact: {rec.expected_impact}
            </p>
            {rec.risks.length > 0 && (
              <p className="text-dim action-copy">
                <strong>Operational risks:</strong> {rec.risks.join(" ")}
              </p>
            )}

            {showingPreview && (
              <div className="info-block action-preview">
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

            <div className="action-button-grid" aria-busy={previewing || deciding}>
              <button
                className="btn"
                disabled={actionStatus.loading}
                onClick={() => void runDecision("reject")}
              >
                {decisionLabel("reject", "Reject", "Rejecting...")}
              </button>
              <button
                className="btn"
                disabled={actionStatus.loading}
                onClick={() => void runDecision("modify", `Modify ${rec.title}`)}
              >
                {decisionLabel("modify", "Modify", "Modifying...")}
              </button>
              <button
                className="btn primary"
                disabled={previewStatus.loading}
                onClick={() => void runPreview()}
              >
                {previewing ? "Simulating..." : showingPreview ? "Re-run" : "Preview"}
              </button>
              <button
                className="btn primary"
                disabled={actionStatus.loading}
                onClick={() => void runDecision("accept")}
              >
                {decisionLabel("accept", "Accept", "Accepting...")}
              </button>
            </div>
            {previewStatus.error && (
              <details className="action-error">
                <summary>Preview failed</summary>
                <span>{previewStatus.error}</span>
              </details>
            )}
            {actionStatus.error && (
              <details className="action-error">
                <summary>Action failed</summary>
                <span>{actionStatus.error}</span>
              </details>
            )}
          </div>
        );
      })}
    </>
  );
}
