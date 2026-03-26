"use client";

import { useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildTooltipPosition(event, container) {
  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  const x = clamp(event.clientX - rect.left, 24, rect.width - 24);
  const y = clamp(event.clientY - rect.top, 24, rect.height - 8);

  return { x, y };
}

export default function DashboardLineChart({
  branchName,
  totalCount,
  chartWidth,
  chartHeight,
  chartPaddingX,
  chartPaddingTop,
  chartPaddingBottom,
  chart
}) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const plotTop = chartPaddingTop;
  const plotBottom = chartHeight - chartPaddingBottom;

  function showTooltip(event, label) {
    const position = buildTooltipPosition(event, containerRef.current);

    if (!position) {
      return;
    }

    setTooltip({
      ...position,
      label
    });
  }

  function showTooltipFromElement(element, label) {
    if (!containerRef.current || !element) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const x = clamp(
      rect.left - containerRect.left + rect.width / 2,
      24,
      containerRect.width - 24
    );
    const y = clamp(rect.top - containerRect.top + 12, 24, containerRect.height - 8);

    setTooltip({ x, y, label });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <div ref={containerRef} className="dashboard-chart-shell">
      {tooltip ? (
        <div className="dashboard-chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.label}
        </div>
      ) : null}

      <div className="dashboard-line-chart-card">
        <div className="dashboard-line-chart-meta">
          <span className="metric-pill">{branchName}</span>
          <span className="metric-pill">완료 {totalCount}건</span>
        </div>
        <svg
          className="dashboard-line-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${branchName} 서명 완료 추이`}
        >
          {chart.guideValues.map((value, index) => {
            const y =
              chartPaddingTop +
              (chartHeight - chartPaddingTop - chartPaddingBottom) -
              ((chartHeight - chartPaddingTop - chartPaddingBottom) * value) /
                Math.max(1, chart.maxValue);

            return (
              <g key={`guide-${index}-${value}`}>
                <line
                  x1={chartPaddingX}
                  x2={chartWidth - chartPaddingX}
                  y1={y}
                  y2={y}
                  className="dashboard-line-guide"
                />
                <text x={8} y={y + 4} className="dashboard-line-guide-label">
                  {value}
                </text>
              </g>
            );
          })}

          <path d={chart.path} className="dashboard-line-path" />

          {chart.points.map((point, index) => {
            const prevPoint = chart.points[index - 1];
            const nextPoint = chart.points[index + 1];
            const leftBoundary = prevPoint ? (prevPoint.x + point.x) / 2 : chartPaddingX;
            const rightBoundary = nextPoint
              ? (point.x + nextPoint.x) / 2
              : chartWidth - chartPaddingX;
            const label = `${point.label} · ${point.count}건`;

            return (
            <g key={point.key}>
              <rect
                x={leftBoundary}
                y={plotTop}
                width={Math.max(24, rightBoundary - leftBoundary)}
                height={plotBottom - plotTop}
                className="dashboard-line-hitband"
                tabIndex={0}
                onMouseEnter={(event) => showTooltip(event, label)}
                onMouseMove={(event) => showTooltip(event, label)}
                onMouseLeave={hideTooltip}
                onFocus={(event) => showTooltipFromElement(event.currentTarget, label)}
                onBlur={hideTooltip}
              />
              <circle cx={point.x} cy={point.y} r="5" className="dashboard-line-point" />
              {point.showLabel ? (
                <text
                  x={point.x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  className="dashboard-line-axis-label"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
