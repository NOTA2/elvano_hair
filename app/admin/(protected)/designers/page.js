import ModalDialog from "@/components/ModalDialog";
import { requireBranchManagerSession } from "@/lib/auth";
import {
  listBranches,
  listDesigners
} from "@/lib/db";
import { BRANCH_MASTER_ROLE } from "@/lib/roles";

export default async function DesignersPage() {
  const session = await requireBranchManagerSession();
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const branches = await listBranches({ activeOnly: true, branchId });
  const designers = await listDesigners({ branchId });
  const activeDesigners = designers.filter((designer) => designer.is_active).length;

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Designer Setup</div>
            <h2 className="panel-title">디자이너 관리</h2>
            <p className="panel-copy">
              문서 발급 시 선택할 담당자를 지점별로 등록합니다. 지점 마스터는 자기
              지점의 디자이너만 관리할 수 있습니다.
            </p>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">전체 {designers.length}</span>
            <span className="metric-pill">활성 {activeDesigners}</span>
          </div>
        </div>

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
          <div className="form-actions admin-form-actions">
            <button type="submit">디자이너 추가</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Registered Designers</div>
            <h2 className="panel-title">등록된 디자이너</h2>
          </div>
        </div>

        {designers.length === 0 ? (
          <div className="empty-state">등록된 디자이너가 없습니다.</div>
        ) : (
          <div className="stack-list">
            {designers.map((designer) => (
              <div key={designer.id} className="list-row-card">
                <div className="list-row-copy">
                  <div className="list-row-title">{designer.name}</div>
                  <div className="list-row-meta">
                    {designer.branch_name || "-"} · {designer.description || "메모 없음"}
                  </div>
                </div>
                <div className="list-row-actions">
                  <span className={`status-chip ${designer.is_active ? "positive" : "neutral"}`}>
                    {designer.is_active ? "사용 중" : "중지"}
                  </span>
                  <ModalDialog
                    title={`${designer.name} 수정`}
                    description="지점, 이름, 상태, 메모를 수정할 수 있습니다."
                    triggerLabel="수정"
                  >
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
                      <div className="form-actions admin-form-actions">
                        <button type="submit">디자이너 저장</button>
                      </div>
                    </form>
                    <form action="/api/admin/designers" method="post" className="modal-danger-zone">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={designer.id} />
                      <button type="submit" className="danger">
                        디자이너 삭제
                      </button>
                    </form>
                  </ModalDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
