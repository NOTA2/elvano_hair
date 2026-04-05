"use client";

import dynamic from "next/dynamic";
import DashboardChartPlaceholder from "@/components/DashboardChartPlaceholder";

const DashboardBarChart = dynamic(() => import("@/components/DashboardBarChart"), {
  ssr: false,
  loading: () => (
    <DashboardChartPlaceholder
      title="지점별 완료 비교"
      copy="지점별 완료 현황 차트를 준비하고 있습니다."
      pillCount={2}
      surface="bar"
    />
  )
});

export default function LazyDashboardBarChart(props) {
  return <DashboardBarChart {...props} />;
}
