import AdminUserRoleForm from "@/components/AdminUserRoleForm";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import {
  isBranchMaster,
  isIntegratedMaster,
  requireBranchManagerSession
} from "@/lib/auth";
import { MASTER_KAKAO_ID } from "@/lib/config";
import {
  countLoginAttempts,
  listAdminUserKakaoIds,
  listBranches,
  listLoginAttemptsPage
} from "@/lib/db";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const PENDING_SORT_OPTIONS = [
  { value: "last_attempt_at", label: "최근 시도일" },
  { value: "attempt_count", label: "시도 횟수" },
  { value: "nickname", label: "닉네임" },
  { value: "kakao_user_id", label: "카카오 ID" }
];

function roleOptionsForSession(session) {
  if (isIntegratedMaster(session)) {
    return [INTEGRATED_MASTER_ROLE, BRANCH_MASTER_ROLE, ADMIN_ROLE];
  }

  if (isBranchMaster(session)) {
    return [BRANCH_MASTER_ROLE, ADMIN_ROLE];
  }

  return [];
}

export default async function AccessRequestsPage({ searchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireBranchManagerSession(),
    searchParams
  ]);
  const viewerIsBranchMaster = isBranchMaster(session);
  const branchId = viewerIsBranchMaster ? session.branch_id : undefined;
  const pendingSort = parseSort(
    resolvedSearchParams,
    "pendingSort",
    "last_attempt_at"
  );
  const pendingDirection = parseDirection(
    resolvedSearchParams,
    "pendingDirection",
    "desc"
  );
  const pendingPageSize = parsePageSize(
    resolvedSearchParams,
    "pendingPageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const pendingCurrentPage = parsePage(resolvedSearchParams, "pendingPage");
  const [branches, activeAdminKakaoIds] = await Promise.all([
    listBranches({ activeOnly: true, branchId }),
    listAdminUserKakaoIds()
  ]);
  const pendingExcludedKakaoIds = Array.from(
    new Set([...activeAdminKakaoIds, String(MASTER_KAKAO_ID)])
  );
  const [pendingPage, pendingCount] = await Promise.all([
    listLoginAttemptsPage({
      page: pendingCurrentPage,
      pageSize: pendingPageSize,
      sortKey: pendingSort,
      direction: pendingDirection,
      excludeKakaoUserIds: pendingExcludedKakaoIds
    }),
    countLoginAttempts({ excludeKakaoUserIds: pendingExcludedKakaoIds })
  ]);
  const allowedRoles = roleOptionsForSession(session);

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Pending Approval"
        title="권한 부여"
        description={
          <>
            권한이 없는 카카오 로그인 시도 계정을 확인하고,
            <br />
            필요한 계정에만 관리자 권한을 부여합니다.
          </>
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <div className="panel-kpi-row">
              <span className="metric-pill">권한 대기 {pendingCount}</span>
            </div>
          </div>
          <div className="panel-actions">
            <ListQueryControls
              pageParam="pendingPage"
              pageSizeParam="pendingPageSize"
              sortParam="pendingSort"
              directionParam="pendingDirection"
              currentPageSize={pendingPageSize}
              currentSort={pendingSort}
              currentDirection={pendingDirection}
              sortOptions={PENDING_SORT_OPTIONS}
            />
          </div>
        </div>
        {pendingPage.items.length === 0 ? (
          <div className="empty-state">권한 대기 중인 로그인 시도 계정이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {pendingPage.items.map((attempt) => (
                <div key={attempt.kakao_user_id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{attempt.nickname || "-"}</div>
                    <div className="list-row-meta">{attempt.kakao_user_id}</div>
                    <div className="list-row-meta">
                      시도 {attempt.attempt_count}회 · 최근{" "}
                      {String(attempt.last_attempt_at).slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className="status-chip soft">{attempt.last_status}</span>
                    <ModalDialog
                      title={`${attempt.nickname || attempt.kakao_user_id} 권한 부여`}
                      description={
                        <>
                          역할과 지점을 선택해 관리자 권한을 부여합니다.
                        </>
                      }
                      triggerLabel="권한 부여"
                    >
                      <AdminUserRoleForm
                        action="/api/admin/admin-users"
                        intent="create"
                        kakaoUserId={attempt.kakao_user_id}
                        nickname={attempt.nickname || ""}
                        branches={branches}
                        availableRoles={allowedRoles}
                        fixedBranchId={viewerIsBranchMaster ? session.branch_id : ""}
                        fixedBranchName={viewerIsBranchMaster ? session.branch_name || "" : ""}
                        submitLabel="권한 저장"
                      />
                    </ModalDialog>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={pendingPage.currentPage}
              totalPages={pendingPage.totalPages}
              pageParam="pendingPage"
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
