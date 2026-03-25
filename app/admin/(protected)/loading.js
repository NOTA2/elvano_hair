function SkeletonLine({ className = "" }) {
  return <div className={`loading-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export default function ProtectedAdminLoading() {
  return (
    <div className="section-stack" aria-busy="true" aria-live="polite">
      <section className="panel admin-loading-panel">
        <div className="panel-head">
          <div className="section-stack">
            <SkeletonLine className="loading-skeleton-eyebrow" />
            <SkeletonLine className="loading-skeleton-title" />
            <SkeletonLine className="loading-skeleton-copy" />
          </div>
          <div className="panel-kpi-row admin-loading-kpis">
            <SkeletonLine className="loading-skeleton-pill" />
            <SkeletonLine className="loading-skeleton-pill" />
            <SkeletonLine className="loading-skeleton-pill" />
          </div>
        </div>

        <div className="admin-loading-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="stat-card">
              <SkeletonLine className="loading-skeleton-label" />
              <SkeletonLine className="loading-skeleton-value" />
              <SkeletonLine className="loading-skeleton-meta" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel admin-loading-panel">
        <div className="section-stack">
          <SkeletonLine className="loading-skeleton-title short" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="record-card compact">
              <SkeletonLine className="loading-skeleton-label" />
              <SkeletonLine className="loading-skeleton-copy" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
