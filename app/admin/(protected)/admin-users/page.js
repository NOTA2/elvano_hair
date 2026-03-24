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

  return (
    <div>
      <section className="panel">
        <h2>권한 직접 추가</h2>
        <p className="muted">
          통합 마스터 카카오 ID는 <span className="code">{MASTER_KAKAO_ID}</span> 로 고정됩니다.
        </p>
        <form action="/api/admin/admin-users" method="post">
          <input type="hidden" name="intent" value="create" />
          <div className="form-grid">
            <label className="field">
              <span className="field-label">카카오 사용자 ID</span>
              <input name="kakao_user_id" required />
            </label>
            <label className="field">
              <span className="field-label">닉네임</span>
              <input name="nickname" />
            </label>
            <label className="field">
              <span className="field-label">권한</span>
              <select name="role" defaultValue={ADMIN_ROLE}>
                <option value={ADMIN_ROLE}>{ROLE_LABELS[ADMIN_ROLE]}</option>
                <option value={BRANCH_MASTER_ROLE}>{ROLE_LABELS[BRANCH_MASTER_ROLE]}</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">지점</span>
              <select name="branch_id" defaultValue="">
                <option value="">선택 안 함</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-full">
              <span className="field-label">메모</span>
              <textarea name="memo" />
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="submit">권한 저장</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>로그인 시도 계정</h2>
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
                  <th>현재 권한</th>
                  <th>권한 부여</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoginAttempts.map((attempt) => {
                  return (
                    <tr key={attempt.kakao_user_id}>
                      <td>{attempt.kakao_user_id}</td>
                      <td>{attempt.nickname || "-"}</td>
                      <td>{attempt.attempt_count}</td>
                      <td>
                        <div>{attempt.last_status}</div>
                        <div className="muted">
                          {String(attempt.last_attempt_at).slice(0, 16).replace("T", " ")}
                        </div>
                      </td>
                      <td>
                        -
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>허용된 관리자</h2>
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
                    <td>{user.kakao_user_id}</td>
                    <td>{user.nickname || "-"}</td>
                    <td>{ROLE_LABELS[user.role] || user.role}</td>
                    <td>{user.branch_name || "-"}</td>
                    <td>{user.memo || "-"}</td>
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
                      <form action="/api/admin/admin-users" method="post" style={{ marginTop: 8 }}>
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
