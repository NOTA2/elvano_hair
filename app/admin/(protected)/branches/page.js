import { requireBranchManagerSession } from "@/lib/auth";
import {
  listBranches,
  listDesigners
} from "@/lib/db";
import { BRANCH_MASTER_ROLE, INTEGRATED_MASTER_ROLE } from "@/lib/roles";

export default async function BranchesPage() {
  const session = await requireBranchManagerSession();
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const branches = await listBranches({ branchId });
  const designers = await listDesigners({ branchId });
  const canCreateBranch = session.role === INTEGRATED_MASTER_ROLE;

  return (
    <div>
      <section className="panel">
        <h2>지점 관리</h2>
        {canCreateBranch ? (
          <form action="/api/admin/branches" method="post">
            <input type="hidden" name="intent" value="create" />
            <div className="form-grid">
              <label className="field">
                <span className="field-label">지점명</span>
                <input name="name" required />
              </label>
              <label className="field">
                <span className="field-label">사용 여부</span>
                <select name="is_active" defaultValue="1">
                  <option value="1">사용</option>
                  <option value="0">중지</option>
                </select>
              </label>
              <label className="field-full">
                <span className="field-label">설명</span>
                <textarea name="description" />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="submit">지점 추가</button>
            </div>
          </form>
        ) : (
          <div className="muted">지점 마스터는 본인 지점 정보만 수정할 수 있습니다.</div>
        )}
      </section>

      <section className="panel">
        <h2>등록된 지점</h2>
        {branches.length === 0 ? (
          <div className="empty-state">등록된 지점이 없습니다.</div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="panel" style={{ padding: 18 }}>
              <form action="/api/admin/branches" method="post">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={branch.id} />
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">지점명</span>
                    <input name="name" defaultValue={branch.name} required />
                  </label>
                  <label className="field">
                    <span className="field-label">사용 여부</span>
                    <select name="is_active" defaultValue={branch.is_active ? "1" : "0"}>
                      <option value="1">사용</option>
                      <option value="0">중지</option>
                    </select>
                  </label>
                  <label className="field-full">
                    <span className="field-label">설명</span>
                    <textarea name="description" defaultValue={branch.description || ""} />
                  </label>
                </div>
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button type="submit">지점 저장</button>
                </div>
              </form>
              {canCreateBranch ? (
                <form action="/api/admin/branches" method="post" style={{ marginTop: 8 }}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={branch.id} />
                  <button type="submit" className="danger">
                    삭제
                  </button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>디자이너 관리</h2>
        <form action="/api/admin/designers" method="post">
          <input type="hidden" name="intent" value="create" />
          <div className="form-grid">
            {session.role === BRANCH_MASTER_ROLE ? (
              <>
                <input type="hidden" name="branch_id" value={session.branch_id} />
                <label className="field">
                  <span className="field-label">지점</span>
                  <input value={session.branch_name || ""} disabled readOnly />
                </label>
              </>
            ) : (
              <label className="field">
                <span className="field-label">지점</span>
                <select name="branch_id" required>
                  <option value="">선택</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span className="field-label">디자이너명</span>
              <input name="name" required />
            </label>
            <label className="field">
              <span className="field-label">사용 여부</span>
              <select name="is_active" defaultValue="1">
                <option value="1">사용</option>
                <option value="0">중지</option>
              </select>
            </label>
            <label className="field-full">
              <span className="field-label">메모</span>
              <textarea name="description" />
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="submit">디자이너 추가</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>등록된 디자이너</h2>
        {designers.length === 0 ? (
          <div className="empty-state">등록된 디자이너가 없습니다.</div>
        ) : (
          designers.map((designer) => (
            <div key={designer.id} className="panel" style={{ padding: 18 }}>
              <form action="/api/admin/designers" method="post">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={designer.id} />
                <div className="form-grid">
                  {session.role === BRANCH_MASTER_ROLE ? (
                    <>
                      <input type="hidden" name="branch_id" value={session.branch_id} />
                      <label className="field">
                        <span className="field-label">지점</span>
                        <input value={session.branch_name || ""} disabled readOnly />
                      </label>
                    </>
                  ) : (
                    <label className="field">
                      <span className="field-label">지점</span>
                      <select name="branch_id" defaultValue={designer.branch_id} required>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="field">
                    <span className="field-label">디자이너명</span>
                    <input name="name" defaultValue={designer.name} required />
                  </label>
                  <label className="field">
                    <span className="field-label">사용 여부</span>
                    <select name="is_active" defaultValue={designer.is_active ? "1" : "0"}>
                      <option value="1">사용</option>
                      <option value="0">중지</option>
                    </select>
                  </label>
                  <label className="field-full">
                    <span className="field-label">메모</span>
                    <textarea
                      name="description"
                      defaultValue={designer.description || ""}
                    />
                  </label>
                </div>
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button type="submit">디자이너 저장</button>
                </div>
              </form>
              <div className="muted" style={{ marginTop: 8 }}>
                지점: {designer.branch_name || "-"}
              </div>
              <form action="/api/admin/designers" method="post" style={{ marginTop: 8 }}>
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={designer.id} />
                <button type="submit" className="danger">
                  삭제
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
