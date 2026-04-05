function MetricPillSkeleton() {
  return <span className="loading-skeleton loading-skeleton-pill" aria-hidden="true" />;
}

export default function DashboardChartPlaceholder({
  title,
  copy,
  pillCount = 2,
  surface = "line"
}) {
  const surfaceClassName =
    surface === "bar" ? "dashboard-bar-chart-inner" : "dashboard-line-chart-surface";

  return (
    <div className="dashboard-chart-panel admin-loading-panel" aria-hidden="true">
      <div className="dashboard-chart-caption">
        <div className="dashboard-chart-copy-skeleton">
          <div className="loading-skeleton loading-skeleton-label" />
          <div className="loading-skeleton loading-skeleton-title short" />
          <div className="loading-skeleton loading-skeleton-copy" />
        </div>
        <div className="dashboard-chart-legend admin-loading-kpis">
          {Array.from({ length: pillCount }).map((_, index) => (
            <MetricPillSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className={surface === "bar" ? "dashboard-bar-chart-wrap" : undefined}>
        <div className={surfaceClassName}>
          <div className={`dashboard-chart-loading-surface ${surface}`}>
            <div className="dashboard-chart-loading-grid" />
            <div className="dashboard-chart-loading-bars">
              {Array.from({ length: surface === "bar" ? 6 : 7 }).map((_, index) => (
                <span
                  key={index}
                  className={`dashboard-chart-loading-bar ${surface}`}
                  style={{
                    height:
                      surface === "bar"
                        ? `${44 + (index % 4) * 40}px`
                        : `${18 + (index % 3) * 10}px`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">
        {title} 영역을 불러오는 중입니다. {copy}
      </span>
    </div>
  );
}
