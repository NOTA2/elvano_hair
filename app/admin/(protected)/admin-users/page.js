import { requireIntegratedMasterSession } from "@/lib/auth";
import { MASTER_KAKAO_ID } from "@/lib/config";
import {
  listAdminUsers,
  listBranches,
  listLoginAttempts
} from "@/lib/db";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

export default async function AdminUsersPage() {
  await requireIntegratedMasterSession();
  const users = await listAdminUsers();
  const branches = await listBranches({ activeOnly: true });
  const loginAttempts = await listLoginAttempts();
  const userMap = new Map(users.map((user) => [user.kakao_user_id, user]));
  const pendingLoginAttempts = loginAttempts.filter(
    (attempt) =>
      attempt.kakao_user_id &&
      attempt.kakao_user_id !== MASTER_KAKAO_ID &&
      !userMap.has(attempt.kakao_user_id)
  );
  const branchMasterCount = users.filter((user) => user.role === BRANCH_MASTER_ROLE).length;

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Pending Approval</div>
            <h2 className="panel-title">로그인 시도 계정</h2>
            <p className="panel-copy">
              이미 권한이 있는 계정과 통합 마스터 계정은 제외됩니다. 여기에는 아직
              승인되지 않은 카카오 계정만 표시됩니다.
            </p>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">권한 대기 {pendingLoginAttempts.length}</span>
            <span className="metric-pill">허용 관리자 {users.length}</span>
            <span className="metric-pill">지점 마스터 {branchMasterCount}</span>
          </div>
        </div>
        <div className="empty-state" style={{ marginBottom: 18 }}>
          통합 마스터 카카오 ID는 <span className="code">{MASTER_KAKAO_ID}</span> 로
          고정됩니다.
        </div>
        {pendingLoginAttempts.length === 0 ? (
          <div className="empty-state">권한 대기 중인 로그인 시도 계정이 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>카카오 ID</th>
                  <th>닉네임</th>
                  <th>시도 횟수</th>
                  <th>최근 상태</th>
                  <th>권한 부여</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoginAttempts.map((attempt) => (
                  <tr key={attempt.kakao_user_id}>
                    <td>
                      <div className="table-cell-title">{attempt.kakao_user_id}</div>
                    </td>
                    <td>
                      <div className="table-cell-title">{attempt.nickname || "-"}</div>
                    </td>
                    <td>
                      <div className="table-cell-title">{attempt.attempt_count}</div>
                    </td>
                    <td>
                      <div className="table-cell-title">{attempt.last_status}</div>
                      <div className="table-cell-copy">
                        {String(attempt.last_attempt_at).slice(0, 16).replace("T", " ")}
                      </div>
                    </td>
                    <td>
                      <form action="/api/admin/admin-users" method="post">
                        <input type="hidden" name="intent" value="create" />
                        <input
                          type="hidden"
                          name="kakao_user_id"
                          value={attempt.kakao_user_id}
                        />
                        <input
                          type="hidden"
                          name="nickname"
                          value={attempt.nickname || ""}
                        />
                        <div className="inline-actions">
                          <select name="role" defaultValue={ADMIN_ROLE}>
                            <option value={ADMIN_ROLE}>{ROLE_LABELS[ADMIN_ROLE]}</option>
                            <option value={BRANCH_MASTER_ROLE}>
                              {ROLE_LABELS[BRANCH_MASTER_ROLE]}
                            </option>
                          </select>
                          <select name="branch_id" defaultValue="">
                            <option value="">선택 안 함</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit">권한 저장</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Allowed Admins</div>
            <h2 className="panel-title">허용된 관리자</h2>
          </div>
        </div>
        {users.length === 0 ? (
          <div className="empty-state">등록된 허용 관리자가 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>카카오 ID</th>
                  <th>닉네임</th>
                  <th>권한</th>
                  <th>지점</th>
                  <th>메모</th>
                  <th>수정</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="table-cell-title">{user.kakao_user_id}</div>
                    </td>
                    <td>
                      <div className="table-cell-title">{user.nickname || "-"}</div>
                    </td>
                    <td>
                      <span className="status-chip soft">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <div className="table-cell-title">{user.branch_name || "-"}</div>
                    </td>
                    <td>
                      <div className="table-cell-copy">{user.memo || "-"}</div>
                    </td>
                    <td>
                      <form action="/api/admin/admin-users" method="post">
                        <input type="hidden" name="intent" value="create" />
                        <input type="hidden" name="kakao_user_id" value={user.kakao_user_id} />
                        <input type="hidden" name="nickname" value={user.nickname || ""} />
                        <input type="hidden" name="memo" value={user.memo || ""} />
                        <div className="inline-actions">
                          <select name="role" defaultValue={user.role}>
                            <option value={ADMIN_ROLE}>{ROLE_LABELS[ADMIN_ROLE]}</option>
                            <option value={BRANCH_MASTER_ROLE}>
                              {ROLE_LABELS[BRANCH_MASTER_ROLE]}
                            </option>
                          </select>
                          <select name="branch_id" defaultValue={user.branch_id || ""}>
                            <option value="">선택 안 함</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit">저장</button>
                        </div>
                      </form>
                      <form action="/api/admin/admin-users" method="post" style={{ marginTop: 10 }}>
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={user.id} />
                        <button type="submit" className="danger">
                          제거
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
