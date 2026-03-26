"use client";

import { useRef, useState } from "react";

const ITEM_WIDTH = 86;
const ITEM_GAP = 22;
const CHART_HEIGHT = 280;
const PADDING_TOP = 24;
const PADDING_RIGHT = 18;
const PADDING_BOTTOM = 56;
const PADDING_LEFT = 34;

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

function shortenLabel(value = "") {
  const label = String(value || "").trim();

  if (label.length <= 10) {
    return label;
  }

  return `${label.slice(0, 10)}…`;
}

export default function DashboardBarChart({ items = [], maxValue = 1 }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const guideValues = Array.from(new Set([maxValue, Math.round(maxValue / 2), 0]));

  const chartWidth = Math.max(
    560,
    PADDING_LEFT + PADDING_RIGHT + items.length * ITEM_WIDTH + Math.max(0, items.length - 1) * ITEM_GAP
  );
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

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

      <div className="dashboard-bar-svg-shell">
        <svg
          className="dashboard-bar-svg"
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          role="img"
          aria-label="지점별 발급 현황"
        >
          <line
            x1={PADDING_LEFT}
            y1={CHART_HEIGHT - PADDING_BOTTOM}
            x2={chartWidth - PADDING_RIGHT}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className="dashboard-bar-axis"
          />

          {guideValues.map((value, index) => {
            const y =
              PADDING_TOP + chartInnerHeight - (chartInnerHeight * value) / Math.max(1, maxValue);

            return (
              <g key={`guide-${index}-${value}`}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={chartWidth - PADDING_RIGHT}
                  y2={y}
                  className="dashboard-bar-guide"
                />
                <text x={6} y={y + 4} className="dashboard-bar-guide-label">
                  {value}
                </text>
              </g>
            );
          })}

          {items.map((item, index) => {
            const groupX = PADDING_LEFT + index * (ITEM_WIDTH + ITEM_GAP);
            const completedHeight = (chartInnerHeight * item.completed) / Math.max(1, maxValue);
            const barX = groupX + 31;
            const barBottom = CHART_HEIGHT - PADDING_BOTTOM;
            const summaryLabel = `${item.name || "-"} · 완료 ${item.completed}건`;

            return (
              <g key={`${item.id}-${item.name}`}>
                <rect
                  x={groupX}
                  y={PADDING_TOP}
                  width={ITEM_WIDTH}
                  height={chartInnerHeight}
                  className="dashboard-bar-hitarea"
                  tabIndex={0}
                  onMouseEnter={(event) => showTooltip(event, summaryLabel)}
                  onMouseMove={(event) => showTooltip(event, summaryLabel)}
                  onMouseLeave={hideTooltip}
                  onFocus={(event) => showTooltip(event, summaryLabel)}
                  onBlur={hideTooltip}
                />

                <rect
                  x={barX}
                  y={barBottom - completedHeight}
                  width="24"
                  height={Math.max(6, completedHeight)}
                  rx="10"
                  className="dashboard-bar-svg-bar signed"
                  onMouseEnter={(event) =>
                    showTooltip(event, `${item.name || "-"} · 완료 ${item.completed}건`)
                  }
                  onMouseMove={(event) =>
                    showTooltip(event, `${item.name || "-"} · 완료 ${item.completed}건`)
                  }
                />

                <text
                  x={groupX + ITEM_WIDTH / 2}
                  y={CHART_HEIGHT - 18}
                  textAnchor="middle"
                  className="dashboard-bar-axis-label"
                >
                  {shortenLabel(item.name || "-")}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="dashboard-bar-summary-row">
        <span className="metric-pill">완료</span>
      </div>
    </div>
  );
}
