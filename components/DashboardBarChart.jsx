"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const BAR_COLORS = ["#78a7ff", "#7fc8b2", "#f3bc68", "#9b8cf2", "#f08f84", "#66b9d9"];

function shortenLabel(value = "") {
  const label = String(value || "").trim();

  if (label.length <= 8) {
    return label;
  }

  return `${label.slice(0, 8)}…`;
}

function DashboardBarTooltip({ active, payload }) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="dashboard-recharts-tooltip">
      <div className="dashboard-recharts-tooltip-label">{item.name}</div>
      <div className="dashboard-recharts-tooltip-value">서명 완료 {item.completed}건</div>
    </div>
  );
}

export default function DashboardBarChart({ items = [] }) {
  const data = items.map((item, index) => ({
    ...item,
    fill: BAR_COLORS[index % BAR_COLORS.length]
  }));
  const chartMinWidth = Math.max(560, data.length * 88);
  const topBranch = [...data].sort((left, right) => right.completed - left.completed)[0];
  const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);

  return (
    <div className="dashboard-chart-panel">
      <div className="dashboard-chart-caption">
        <div>
          <div className="dashboard-chart-caption-title">지점별 완료 비교</div>
          <div className="dashboard-chart-caption-copy">
            완료 수 기준 상위 지점과 전체 흐름을 한 번에 확인합니다.
          </div>
        </div>
        <div className="dashboard-chart-legend">
          <span className="metric-pill">총 완료 {totalCompleted}건</span>
          {topBranch ? <span className="metric-pill soft">최고 {topBranch.name}</span> : null}
        </div>
      </div>

      <div className="dashboard-bar-chart-wrap">
        <div className="dashboard-bar-chart-inner" style={{ minWidth: chartMinWidth }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              margin={{ top: 16, right: 18, left: 0, bottom: 8 }}
              barCategoryGap={18}
            >
              <CartesianGrid vertical={false} stroke="#dde6f0" strokeDasharray="4 6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={12}
                tick={{ fill: "#7c8798", fontSize: 11, fontWeight: 700 }}
                tickFormatter={shortenLabel}
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
                cursor={{ fill: "rgba(120, 167, 255, 0.09)" }}
                content={<DashboardBarTooltip />}
              />
              <Bar dataKey="completed" radius={[14, 14, 6, 6]} maxBarSize={34}>
                {data.map((item) => (
                  <Cell key={`${item.id}-${item.name}`} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
