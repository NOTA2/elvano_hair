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
  countAdminUsers,
  getLoginAttemptByKakaoId,
  listAdminUsersPage,
  listAdminUsersSlice,
  listBranches
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
  INTEGRATED_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const USER_SORT_OPTIONS = [
  { value: "updated_at", label: "최근 수정일" },
  { value: "role", label: "권한" },
  { value: "nickname", label: "닉네임" },
  { value: "kakao_user_id", label: "카카오 ID" },
  { value: "branch_name", label: "지점" }
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

function buildSystemMaster(loginAttempt) {
  return {
    id: `system:${MASTER_KAKAO_ID}`,
    kakao_user_id: String(MASTER_KAKAO_ID),
    nickname: loginAttempt?.nickname || "하드코딩 통합 마스터",
    role: INTEGRATED_MASTER_ROLE,
    branch_id: null,
    branch_name: null,
    memo: "시스템 고정 계정",
    updated_at: loginAttempt?.last_attempt_at || null,
    is_system_master: true
  };
}

async function buildUsersPage({
  viewerIsIntegratedMaster,
  branchId,
  currentPage,
  pageSize,
  sortKey,
  direction
}) {
  if (!viewerIsIntegratedMaster) {
    return await listAdminUsersPage({
      branchId,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    });
  }

  const [systemMasterAttempt, storedUsersCount] = await Promise.all([
    getLoginAttemptByKakaoId(String(MASTER_KAKAO_ID)),
    countAdminUsers({ excludeKakaoUserIds: [MASTER_KAKAO_ID] })
  ]);
  const totalCount = storedUsersCount + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const storedOffset = safePage === 1 ? 0 : (safePage - 1) * pageSize - 1;
  const storedLimit = safePage === 1 ? Math.max(pageSize - 1, 0) : pageSize;
  const storedUsers = await listAdminUsersSlice({
    offset: storedOffset,
    limit: storedLimit,
    sortKey,
    direction,
    excludeKakaoUserIds: [MASTER_KAKAO_ID]
  });

  return {
    items: safePage === 1 ? [buildSystemMaster(systemMasterAttempt), ...storedUsers] : storedUsers,
    totalCount,
    currentPage: safePage,
    totalPages,
    pageSize
  };
}

export default async function AdminUsersPage({ searchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireBranchManagerSession(),
    searchParams
  ]);
  const viewerIsIntegratedMaster = isIntegratedMaster(session);
  const viewerIsBranchMaster = isBranchMaster(session);
  const branchId = viewerIsBranchMaster ? session.branch_id : undefined;
  const usersSort = parseSort(resolvedSearchParams, "usersSort", "updated_at");
  const usersDirection = parseDirection(
    resolvedSearchParams,
    "usersDirection",
    "desc"
  );
  const usersPageSize = parsePageSize(
    resolvedSearchParams,
    "usersPageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const usersCurrentPage = parsePage(resolvedSearchParams, "usersPage");
  const [branches, branchMasterCount, usersPage] = await Promise.all([
    listBranches({ activeOnly: true, branchId }),
    countAdminUsers({ branchId, role: BRANCH_MASTER_ROLE }),
    buildUsersPage({
      viewerIsIntegratedMaster,
      branchId,
      currentPage: usersCurrentPage,
      pageSize: usersPageSize,
      sortKey: usersSort,
      direction: usersDirection
    })
  ]);
  const allowedRoles = roleOptionsForSession(session);

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Allowed Admins"
        title="권한 관리"
        description={
          <>
            허용된 관리자 목록을 보고,
            <br />
            모달에서 권한과 지점을 수정합니다.
          </>
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {usersPage.totalCount}</span>
              <span className="metric-pill">지점 마스터 {branchMasterCount}</span>
            </div>
          </div>
          <div className="panel-actions">
            <ListQueryControls
              pageParam="usersPage"
              pageSizeParam="usersPageSize"
              sortParam="usersSort"
              directionParam="usersDirection"
              currentPageSize={usersPageSize}
              currentSort={usersSort}
              currentDirection={usersDirection}
              sortOptions={USER_SORT_OPTIONS}
            />
          </div>
        </div>
        {usersPage.items.length === 0 ? (
          <div className="empty-state">등록된 허용 관리자가 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {usersPage.items.map((user) => (
                <div key={user.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{user.nickname || user.kakao_user_id}</div>
                    <div className="list-row-meta">{user.kakao_user_id}</div>
                    <div className="list-row-meta">
                      {ROLE_LABELS[user.role] || user.role}
                      {user.branch_name ? ` · ${user.branch_name}` : ""}
                      {user.memo ? ` · ${user.memo}` : ""}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className="status-chip brand">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {user.branch_name ? (
                      <span className="status-chip soft">{user.branch_name}</span>
                    ) : null}
                    {user.is_system_master ? (
                      <span className="status-chip soft">시스템 고정</span>
                    ) : (
                      <>
                        <ModalDialog
                          title={`${user.nickname || user.kakao_user_id} 권한 수정`}
                          description={
                            <>
                              역할과 지점을 수정합니다.
                            </>
                          }
                          triggerLabel="수정"
                        >
                          <AdminUserRoleForm
                            action="/api/admin/admin-users"
                            intent="create"
                            kakaoUserId={user.kakao_user_id}
                            nickname={user.nickname || ""}
                            memo={user.memo || ""}
                            initialRole={user.role}
                            initialBranchId={user.branch_id || ""}
                            branches={branches}
                            availableRoles={allowedRoles}
                            fixedBranchId={viewerIsBranchMaster ? session.branch_id : ""}
                            fixedBranchName={viewerIsBranchMaster ? session.branch_name || "" : ""}
                            submitLabel="변경 저장"
                          />
                        </ModalDialog>
                        {viewerIsIntegratedMaster ? (
                          <form action="/api/admin/admin-users" method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={user.id} />
                            <button type="submit" className="danger">
                              권한 삭제
                            </button>
                          </form>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={usersPage.currentPage}
              totalPages={usersPage.totalPages}
              pageParam="usersPage"
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
