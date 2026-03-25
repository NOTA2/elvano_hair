import AdminUserRoleForm from "@/components/AdminUserRoleForm";
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
  listAdminUsers,
  listBranches,
  listLoginAttempts
} from "@/lib/db";
import {
  paginateItems,
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort,
  sortItems
} from "@/lib/pagination";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const PENDING_SORT_OPTIONS = [
  { value: "last_attempt_at", label: "최근 시도일" },
  { value: "attempt_count", label: "시도 횟수" },
  { value: "nickname", label: "닉네임" },
  { value: "kakao_user_id", label: "카카오 ID" }
];

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

function buildSystemMaster(loginAttempts) {
  const matchingAttempt = loginAttempts.find(
    (attempt) => String(attempt.kakao_user_id) === String(MASTER_KAKAO_ID)
  );

  return {
    id: `system:${MASTER_KAKAO_ID}`,
    kakao_user_id: String(MASTER_KAKAO_ID),
    nickname: matchingAttempt?.nickname || "하드코딩 통합 마스터",
    role: INTEGRATED_MASTER_ROLE,
    branch_id: null,
    branch_name: null,
    memo: "시스템 고정 계정",
    updated_at: matchingAttempt?.last_attempt_at || null,
    is_system_master: true
  };
}

export default async function AdminUsersPage({ searchParams }) {
  const session = await requireBranchManagerSession();
  const resolvedSearchParams = await searchParams;
  const viewerIsIntegratedMaster = isIntegratedMaster(session);
  const viewerIsBranchMaster = isBranchMaster(session);
  const branchId = viewerIsBranchMaster ? session.branch_id : undefined;
  const branches = await listBranches({ activeOnly: true, branchId });
  const loginAttempts = await listLoginAttempts();
  const storedUsers = await listAdminUsers({ branchId });
  const allowedRoles = roleOptionsForSession(session);
  const userMap = new Map(storedUsers.map((user) => [String(user.kakao_user_id), user]));
  const pendingLoginAttempts = loginAttempts.filter(
    (attempt) =>
      attempt.kakao_user_id &&
      String(attempt.kakao_user_id) !== String(MASTER_KAKAO_ID) &&
      !userMap.has(String(attempt.kakao_user_id))
  );
  const allowedUsers = viewerIsIntegratedMaster
    ? [buildSystemMaster(loginAttempts), ...storedUsers.filter((user) => String(user.kakao_user_id) !== String(MASTER_KAKAO_ID))]
    : storedUsers;
  const branchMasterCount = allowedUsers.filter((user) => user.role === BRANCH_MASTER_ROLE).length;

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
  const sortedPending = sortItems(
    pendingLoginAttempts,
    pendingSort,
    pendingDirection,
    {
      last_attempt_at: (item) => item.last_attempt_at,
      attempt_count: (item) => Number(item.attempt_count || 0),
      nickname: (item) => item.nickname || "",
      kakao_user_id: (item) => item.kakao_user_id
    }
  );
  const pendingPagination = paginateItems(
    sortedPending,
    parsePage(resolvedSearchParams, "pendingPage"),
    pendingPageSize
  );

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
  const sortedUsers = sortItems(
    allowedUsers,
    usersSort,
    usersDirection,
    {
      updated_at: (item) => item.updated_at,
      role: (item) => ROLE_LABELS[item.role] || item.role,
      nickname: (item) => item.nickname || "",
      kakao_user_id: (item) => item.kakao_user_id,
      branch_name: (item) => item.branch_name || ""
    }
  );
  const usersPagination = paginateItems(
    sortedUsers,
    parsePage(resolvedSearchParams, "usersPage"),
    usersPageSize
  );

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Pending Approval</div>
            <h2 className="panel-title">로그인 시도 계정</h2>
            <p className="panel-copy">
              권한이 없는 카카오 로그인 시도 계정을 목록으로 보고, 모달에서 권한을
              부여합니다.
            </p>
          </div>
          <div className="panel-actions">
            <div className="panel-kpi-row">
              <span className="metric-pill">권한 대기 {pendingLoginAttempts.length}</span>
              <span className="metric-pill">허용 관리자 {allowedUsers.length}</span>
              <span className="metric-pill">지점 마스터 {branchMasterCount}</span>
            </div>
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
        {pendingPagination.items.length === 0 ? (
          <div className="empty-state">권한 대기 중인 로그인 시도 계정이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {pendingPagination.items.map((attempt) => (
                <div key={attempt.kakao_user_id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{attempt.nickname || "-"}</div>
                    <div className="list-row-meta">{attempt.kakao_user_id}</div>
                    <div className="list-row-meta">
                      시도 {attempt.attempt_count}회 · 최근 {String(attempt.last_attempt_at).slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className="status-chip soft">{attempt.last_status}</span>
                    <ModalDialog
                      title={`${attempt.nickname || attempt.kakao_user_id} 권한 부여`}
                      description="역할과 지점을 선택해 관리자 권한을 부여합니다."
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
              currentPage={pendingPagination.currentPage}
              totalPages={pendingPagination.totalPages}
              pageParam="pendingPage"
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Allowed Admins</div>
            <h2 className="panel-title">허용된 관리자</h2>
            <p className="panel-copy">
              허용된 관리자 목록을 보고 모달에서 권한과 지점을 수정합니다.
            </p>
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
        {usersPagination.items.length === 0 ? (
          <div className="empty-state">등록된 허용 관리자가 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {usersPagination.items.map((user) => (
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
                          description="역할과 지점을 수정합니다."
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
                              제거
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
              currentPage={usersPagination.currentPage}
              totalPages={usersPagination.totalPages}
              pageParam="usersPage"
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
