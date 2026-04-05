"use client";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function getLabelStep(length) {
  if (length > 20) {
    return 5;
  }

  if (length > 10) {
    return 2;
  }

  return 1;
}

function DashboardLineTooltip({ active, payload }) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="dashboard-recharts-tooltip">
      <div className="dashboard-recharts-tooltip-label">{item.label}</div>
      <div className="dashboard-recharts-tooltip-value">서명 완료 {item.count}건</div>
    </div>
  );
}

export default function DashboardLineChart({ branchName, totalCount, items = [] }) {
  const labelStep = getLabelStep(items.length);
  const peakPoint = [...items].sort((left, right) => right.count - left.count)[0];

  return (
    <div className="dashboard-chart-panel">
      <div className="dashboard-chart-caption">
        <div>
          <div className="dashboard-chart-caption-title">서명 완료 추이</div>
          <div className="dashboard-chart-caption-copy">
            기간별 완료 흐름을 부드러운 추이선으로 확인합니다.
          </div>
        </div>
        <div className="dashboard-chart-legend">
          <span className="metric-pill">{branchName}</span>
          <span className="metric-pill soft">총 {totalCount}건</span>
          {peakPoint ? (
            <span className="metric-pill soft">
              최고 {peakPoint.label} {peakPoint.count}건
            </span>
          ) : null}
        </div>
      </div>

      <div className="dashboard-line-chart-surface">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={items} margin={{ top: 18, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="dashboard-line-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#78a7ff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#78a7ff" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#dde6f0" strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={8}
              tickMargin={12}
              tick={{ fill: "#7c8798", fontSize: 11, fontWeight: 700 }}
              tickFormatter={(value, index) =>
                index % labelStep === 0 || index === items.length - 1 ? value : ""
              }
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              domain={[0, (dataMax) => Math.max(1, Number(dataMax) || 0)]}
              width={34}
              tick={{ fill: "#7c8798", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ stroke: "#cad7ea", strokeDasharray: "4 4" }}
              content={<DashboardLineTooltip />}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="none"
              fill="url(#dashboard-line-area)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6e98d4"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: "#6e98d4", strokeWidth: 3 }}
              activeDot={{ r: 6, fill: "#6e98d4", stroke: "#ffffff", strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
