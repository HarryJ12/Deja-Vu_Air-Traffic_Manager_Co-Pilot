export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <div className="skeleton skeleton-line" style={{ width }} />;
}

export function SkeletonBlock({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-block" style={{ marginBottom: 8 }} />
      ))}
    </>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-msg error">
      <div style={{ marginBottom: 8 }}>Data unavailable.</div>
      <div className="text-dim monospace" style={{ marginBottom: onRetry ? 8 : 0 }}>
        {message}
      </div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="state-msg">{message}</div>;
}
