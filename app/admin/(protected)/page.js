import DashboardPeriodControls from "@/components/DashboardPeriodControls";
import LazyDashboardBarChart from "@/components/LazyDashboardBarChart";
import LazyDashboardLineChart from "@/components/LazyDashboardLineChart";
import {
  isIntegratedMaster,
  requireAdminSession
} from "@/lib/auth";
import {
  countDocuments,
  listAdminUsers,
  listBranches,
  listDesigners,
  listDocumentsForDashboard,
  listDocumentsPage
} from "@/lib/db";

const PERIOD_OPTIONS = [
  { value: "6m", label: "전체 6개월" },
  { value: "3m", label: "전체 3개월" },
  { value: "1m", label: "전체 1달" },
  { value: "1w", label: "전체 1주일" }
];

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

function buildSignedTrend({ documents, period }) {
  const buckets = buildTrendBuckets(period);

  documents.forEach((document) => {
    if (document.status !== "signed") {
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
  const periodStartIso = periodStart.toISOString();
  const activityQueryBranchId = integratedMaster
    ? activityBranchId || undefined
    : branchId;
  const trendQueryBranchId = integratedMaster
    ? trendBranchId || undefined
    : branchId;
  const [
    recentDocumentsPage,
    signedCount,
    pendingCount,
    admins,
    branches,
    designers,
    activityDocuments,
    trendDocuments
  ] = await Promise.all([
    listDocumentsPage({ branchId, page: 1, pageSize: 4 }),
    countDocuments({ branchId, status: "signed" }),
    countDocuments({ branchId, status: "pending" }),
    listAdminUsers({ branchId }),
    listBranches({ branchId }),
    listDesigners({ branchId }),
    listDocumentsForDashboard({
      branchId: activityQueryBranchId,
      createdSince: periodStartIso
    }),
    listDocumentsForDashboard({
      branchId: trendQueryBranchId,
      status: "signed",
      signedSince: periodStartIso
    })
  ]);
  const totalDocuments = recentDocumentsPage.totalCount;
  const signRate =
    totalDocuments === 0 ? 0 : Math.round((signedCount / totalDocuments) * 100);
  const recentDocuments = recentDocumentsPage.items;
  const activityBranches = activityBranchId
    ? branches.filter((branch) => Number(branch.id) === Number(activityBranchId))
    : branches;
  const branchChartItems = buildBranchChartItems({
    branches: activityBranches,
    documents: activityDocuments,
    fallbackBranchName: session.branch_name || ""
  });
  const trendItems = buildSignedTrend({
    documents: trendDocuments,
    period
  });
  const trendBranchName = trendBranchId
    ? branches.find((branch) => Number(branch.id) === Number(trendBranchId))?.name || "-"
    : "전체 지점";
  const hasBranchChartItems = branchChartItems.length > 0;

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Dashboard</div>
            <h2 className="panel-title">운영 현황</h2>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">서명 완료율 {signRate}%</span>
            <span className="metric-pill">대기 문서 {pendingCount}</span>
          </div>
        </div>

        <div className="admin-stats-grid compact">
          <div className="stat-card">
            <span className="stat-label">발급 문서</span>
            <div className="stat-value">{totalDocuments}</div>
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

          {!hasBranchChartItems ? (
            <div className="empty-state">선택한 기간의 서명 완료 문서가 없습니다.</div>
          ) : (
            <LazyDashboardBarChart items={branchChartItems} />
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Signed Trend</div>
            <h2 className="panel-title">기간별 서명 완료 추이</h2>
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

        {trendItems.length > 0 ? (
          <LazyDashboardLineChart
            branchName={trendBranchName}
            totalCount={trendItems.reduce((sum, item) => sum + item.count, 0)}
            items={trendItems}
          />
        ) : (
          <div className="empty-state">선택한 기간의 서명 완료 문서가 없습니다.</div>
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
