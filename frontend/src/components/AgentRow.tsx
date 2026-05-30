import type { AgentName, Severity } from "../lib/types";

type Props = {
  agent: AgentName;
  metric?: string;
  detail: string;
  evidence?: string[];
  severity?: Severity;
  delayIndex?: number;
};

// Severity drives a square dot + label (color is never the only signal).
const severityLabel: Record<Severity, string> = {
  info: "INFO",
  watch: "WATCH",
  alert: "ALERT",
};

export default function AgentRow({
  agent,
  metric,
  detail,
  evidence,
  severity = "info",
  delayIndex = 0,
}: Props) {
  return (
    <div
      className="agent-row"
      style={{ animationDelay: `${delayIndex * 80}ms` }}
    >
      <div className="info-block-row">
        <h3 style={{ margin: 0 }}>{agent}</h3>
        {metric && <span className="text-accent monospace">{metric}</span>}
      </div>
      <p className="agent-detail">{detail}</p>
      <div className="info-block-row" style={{ marginTop: 8, marginBottom: 0 }}>
        <span className="monospace text-dim">
          <span className={`status-dot ${severity}`} />
          {severityLabel[severity]}
        </span>
      </div>
      {evidence && evidence.length > 0 && (
        <ul className="agent-evidence">
          {evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
