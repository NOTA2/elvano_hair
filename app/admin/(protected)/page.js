import DashboardPeriodControls from "@/components/DashboardPeriodControls";
import DashboardBarChart from "@/components/DashboardBarChart";
import DashboardLineChart from "@/components/DashboardLineChart";
import {
  isIntegratedMaster,
  requireAdminSession
} from "@/lib/auth";
import {
  listAdminUsers,
  listBranches,
  listDesigners,
  listDocuments
} from "@/lib/db";

const PERIOD_OPTIONS = [
  { value: "6m", label: "전체 6개월" },
  { value: "3m", label: "전체 3개월" },
  { value: "1m", label: "전체 1달" },
  { value: "1w", label: "전체 1주일" }
];
const CHART_WIDTH = 760;
const CHART_HEIGHT = 240;
const CHART_PADDING_X = 28;
const CHART_PADDING_TOP = 24;
const CHART_PADDING_BOTTOM = 42;

function statusClass(status) {
  if (status === "signed") return "signed";
  if (status === "failed") return "failed";
  return "pending";
}

function statusLabel(status) {
  if (status === "signed") return "완료";
  if (status === "failed") return "실패";
  return "대기";
}

function resolvePeriod(searchParams) {
  const value = String(searchParams?.period || "").trim();
  return PERIOD_OPTIONS.some((option) => option.value === value) ? value : "6m";
}

function resolveTrendBranchId(searchParams, { integratedMaster, session }) {
  if (!integratedMaster) {
    return session.branch_id ? Number(session.branch_id) : null;
  }

  const value = Number(searchParams?.trendBranchId);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveActivityBranchId(searchParams, { integratedMaster, session }) {
  if (!integratedMaster) {
    return session.branch_id ? Number(session.branch_id) : null;
  }

  const value = Number(searchParams?.activityBranchId);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function periodStartDate(period) {
  const now = new Date();
  const date = new Date(now);

  if (period === "1w") {
    date.setDate(date.getDate() - 7);
    return date;
  }

  if (period === "1m") {
    date.setMonth(date.getMonth() - 1);
    return date;
  }

  if (period === "3m") {
    date.setMonth(date.getMonth() - 3);
    return date;
  }

  date.setMonth(date.getMonth() - 6);
  return date;
}

function buildBranchChartItems({ branches, documents, fallbackBranchName }) {
  const counts = new Map();

  branches.forEach((branch) => {
    counts.set(Number(branch.id), {
      id: Number(branch.id),
      name: branch.name,
      completed: 0
    });
  });

  documents.forEach((document) => {
    const key = Number(document.branch_id || 0);
    const existing = counts.get(key) || {
      id: key,
      name: document.branch_name || fallbackBranchName || "지점 미지정",
      completed: 0
    };

    if (document.status === "signed") {
      existing.completed += 1;
    }

    counts.set(key, existing);
  });

  return Array.from(counts.values()).sort((left, right) => {
    if (right.completed !== left.completed) {
      return right.completed - left.completed;
    }

    return String(left.name || "").localeCompare(String(right.name || ""), "ko");
  });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function formatBucketLabel(date, period) {
  if (period === "6m") {
    return `${date.getMonth() + 1}월`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildTrendBuckets(period, referenceDate = new Date()) {
  const today = startOfDay(referenceDate);

  if (period === "6m") {
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return Array.from({ length: 6 }, (_, index) => {
      const start = addMonths(currentMonthStart, index - 5);
      const end = addMonths(start, 1);

      return {
        key: `${start.getFullYear()}-${start.getMonth() + 1}`,
        label: formatBucketLabel(start, period),
        start,
        end,
        count: 0
      };
    });
  }

  if (period === "3m") {
    const start = addDays(today, -83);
    return Array.from({ length: 12 }, (_, index) => {
      const bucketStart = addDays(start, index * 7);
      const bucketEnd = addDays(bucketStart, 7);

      return {
        key: bucketStart.toISOString(),
        label: formatBucketLabel(bucketStart, period),
        start: bucketStart,
        end: bucketEnd,
        count: 0
      };
    });
  }

  if (period === "1m") {
    const start = addDays(today, -29);
    return Array.from({ length: 30 }, (_, index) => {
      const bucketStart = addDays(start, index);
      const bucketEnd = addDays(bucketStart, 1);

      return {
        key: bucketStart.toISOString(),
        label: formatBucketLabel(bucketStart, period),
        start: bucketStart,
        end: bucketEnd,
        count: 0
      };
    });
  }

  const start = addDays(today, -6);
  return Array.from({ length: 7 }, (_, index) => {
    const bucketStart = addDays(start, index);
    const bucketEnd = addDays(bucketStart, 1);

    return {
      key: bucketStart.toISOString(),
      label: formatBucketLabel(bucketStart, period),
      start: bucketStart,
      end: bucketEnd,
      count: 0
    };
  });
}

function buildSignedTrend({
  documents,
  period,
  branchId
}) {
  const buckets = buildTrendBuckets(period);

  documents.forEach((document) => {
    if (document.status !== "signed") {
      return;
    }

    if (branchId && Number(document.branch_id) !== Number(branchId)) {
      return;
    }

    const signedAt = new Date(document.signed_at || document.updated_at || document.created_at);

    if (Number.isNaN(signedAt.getTime())) {
      return;
    }

    const bucket = buckets.find((item) => signedAt >= item.start && signedAt < item.end);

    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets;
}

function buildLineChartModel(items = []) {
  const innerWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const maxValue = Math.max(1, ...items.map((item) => item.count));
  const denominator = Math.max(1, items.length - 1);
  const labelInterval = items.length > 18 ? 5 : items.length > 10 ? 2 : 1;

  const points = items.map((item, index) => {
    const x = CHART_PADDING_X + (innerWidth * index) / denominator;
    const y =
      CHART_PADDING_TOP + innerHeight - (innerHeight * item.count) / maxValue;

    return {
      ...item,
      x,
      y,
      showLabel: index % labelInterval === 0 || index === items.length - 1
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return {
    points,
    path,
    maxValue,
    guideValues: Array.from(new Set([maxValue, Math.round(maxValue / 2), 0]))
  };
}

export default async function AdminDashboardPage({ searchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireAdminSession(),
    searchParams
  ]);
  const integratedMaster = isIntegratedMaster(session);
  const branchId = integratedMaster ? undefined : session.branch_id || undefined;
  const period = resolvePeriod(resolvedSearchParams);
  const activityBranchId = resolveActivityBranchId(resolvedSearchParams, {
    integratedMaster,
    session
  });
  const trendBranchId = resolveTrendBranchId(resolvedSearchParams, {
    integratedMaster,
    session
  });
  const periodStart = periodStartDate(period);
  const [documents, admins, branches, designers] = await Promise.all([
    listDocuments({ branchId }),
    listAdminUsers({ branchId }),
    listBranches({ branchId }),
    listDesigners({ branchId })
  ]);

  const signedCount = documents.filter((item) => item.status === "signed").length;
  const pendingCount = documents.filter((item) => item.status === "pending").length;
  const signRate = documents.length === 0 ? 0 : Math.round((signedCount / documents.length) * 100);
  const recentDocuments = documents.slice(0, 4);
  const periodDocuments = documents.filter((document) => {
    const createdAt = new Date(document.created_at);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= periodStart;
  });
  const activityBranches = activityBranchId
    ? branches.filter((branch) => Number(branch.id) === Number(activityBranchId))
    : branches;
  const activityDocuments = activityBranchId
    ? periodDocuments.filter((document) => Number(document.branch_id) === Number(activityBranchId))
    : periodDocuments;
  const branchChartItems = buildBranchChartItems({
    branches: activityBranches,
    documents: activityDocuments,
    fallbackBranchName: session.branch_name || ""
  });
  const trendItems = buildSignedTrend({
    documents,
    period,
    branchId: trendBranchId
  });
  const trendChart = buildLineChartModel(trendItems);
  const trendBranchName = trendBranchId
    ? branches.find((branch) => Number(branch.id) === Number(trendBranchId))?.name || "-"
    : "전체 지점";
  const maxChartValue = Math.max(
    1,
    ...branchChartItems.map((item) => item.completed)
  );

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Dashboard</div>
            <h2 className="panel-title">운영 현황을 빠르게 확인</h2>
            <p className="panel-copy">
              {session.branch_name ? `${session.branch_name} 지점` : "전체 지점"} 기준으로
              최근 문서 발급, 서명 완료율, 관리자 구성을 한 번에 확인할 수 있습니다.
            </p>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">서명 완료율 {signRate}%</span>
            <span className="metric-pill">대기 문서 {pendingCount}</span>
          </div>
        </div>

        <div className="admin-stats-grid compact">
          <div className="stat-card">
            <span className="stat-label">발급 문서</span>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-meta">누적 전자서명 요청</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">서명 완료</span>
            <div className="stat-value">{signedCount}</div>
            <div className="stat-meta">고객 확인 완료 문서</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">지점</span>
            <div className="stat-value">{branches.length}</div>
            <div className="stat-meta">현재 조회 범위</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">디자이너</span>
            <div className="stat-value">{designers.length}</div>
            <div className="stat-meta">발급 가능한 담당자</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">관리자</span>
            <div className="stat-value">{admins.length}</div>
            <div className="stat-meta">현재 권한 보유 계정</div>
          </div>
        </div>
      </section>

      {integratedMaster ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Branch Activity</div>
              <h2 className="panel-title">지점별 서명 완료 현황</h2>
              <p className="panel-copy">
                선택한 기간 안에서 지점별 서명 완료 건수를 비교해서 볼 수 있습니다.
              </p>
            </div>
            <div className="panel-actions">
              <DashboardPeriodControls
                currentPeriod={period}
                options={PERIOD_OPTIONS}
                currentBranchId={activityBranchId ? String(activityBranchId) : ""}
                branchParam="activityBranchId"
                branchOptions={branches}
                includeAllBranchesOption
              />
            </div>
          </div>

          {branchChartItems.length === 0 ? (
            <div className="empty-state">선택한 기간의 문서가 없습니다.</div>
          ) : (
            <DashboardBarChart items={branchChartItems} maxValue={maxChartValue} />
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Signed Trend</div>
            <h2 className="panel-title">기간별 서명 완료 추이</h2>
            <p className="panel-copy">
              선택한 기간 동안 서명 완료가 어떻게 변했는지 선 그래프로 확인할 수
              있습니다. 점 위에 마우스를 올리면 해당 구간의 완료 건수가 보입니다.
            </p>
          </div>
          <div className="panel-actions">
            <DashboardPeriodControls
              currentPeriod={period}
              options={PERIOD_OPTIONS}
              periodParam="period"
              branchParam="trendBranchId"
              currentBranchId={trendBranchId ? String(trendBranchId) : ""}
              branchOptions={branches}
              branchDisabled={!integratedMaster}
              includeAllBranchesOption={integratedMaster}
            />
          </div>
        </div>

        {trendChart.points.length === 0 ? (
          <div className="empty-state">선택한 기간의 서명 완료 문서가 없습니다.</div>
        ) : (
          <DashboardLineChart
            branchName={trendBranchName}
            totalCount={trendItems.reduce((sum, item) => sum + item.count, 0)}
            chartWidth={CHART_WIDTH}
            chartHeight={CHART_HEIGHT}
            chartPaddingX={CHART_PADDING_X}
            chartPaddingTop={CHART_PADDING_TOP}
            chartPaddingBottom={CHART_PADDING_BOTTOM}
            chart={trendChart}
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Recent Activity</div>
            <h2 className="panel-title">최근 발급 문서</h2>
          </div>
        </div>
        {recentDocuments.length === 0 ? (
          <div className="empty-state">최근 발급 문서가 없습니다.</div>
        ) : (
          <div className="stack-list">
            {recentDocuments.map((document) => (
              <div key={document.id} className="record-card compact">
                <div className="record-head">
                  <div>
                    <div className="record-title">{document.document_title}</div>
                    <div className="record-meta">
                      {integratedMaster ? `${document.branch_name} · ` : ""}
                      {document.customer_name} · {document.designer_name}
                    </div>
                  </div>
                  <span className={`badge ${statusClass(document.status)}`}>
                    {statusLabel(document.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
