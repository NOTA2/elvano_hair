"use client";

import dynamic from "next/dynamic";
import DashboardChartPlaceholder from "@/components/DashboardChartPlaceholder";

const DashboardLineChart = dynamic(() => import("@/components/DashboardLineChart"), {
  ssr: false,
  loading: () => (
    <DashboardChartPlaceholder
      title="서명 완료 추이"
      copy="완료 추이 차트를 준비하고 있습니다."
      pillCount={3}
      surface="line"
    />
  )
});

export default function LazyDashboardLineChart(props) {
  return <DashboardLineChart {...props} />;
}
