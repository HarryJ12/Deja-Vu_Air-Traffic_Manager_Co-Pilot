import type { ConfidenceBlock } from "../lib/types";
import { pct } from "../lib/format";

export default function ConfidenceBar({ confidence }: { confidence: ConfidenceBlock }) {
  return (
    <div className="info-block">
      <div className="info-block-row">
        <h3 style={{ margin: 0 }}>Confidence</h3>
        <span className="monospace">{pct(confidence.overall_pct)}</span>
      </div>
      <div className="conf-track" role="meter" aria-valuenow={confidence.overall_pct}>
        <div className="conf-fill" style={{ width: `${confidence.overall_pct}%` }} />
      </div>

      {confidence.support.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>Support</h3>
          <ul>
            {confidence.support.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}

      {confidence.weaknesses.length > 0 && (
        <>
          <h3 style={{ marginTop: 8 }}>Risko Caveats</h3>
          <ul>
            {confidence.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}

      {confidence.divergence_alarm?.is_active && (
        <div className="info-block accent risko-divergence">
          <strong>Risko divergence</strong>
          <p className="text-dim">{confidence.divergence_alarm.reason}</p>
        </div>
      )}
    </div>
  );
}
