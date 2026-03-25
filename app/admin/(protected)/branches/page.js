import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import { requireBranchManagerSession } from "@/lib/auth";
import { listBranches } from "@/lib/db";
import { paginateItems, parsePage } from "@/lib/pagination";
import { BRANCH_MASTER_ROLE, INTEGRATED_MASTER_ROLE } from "@/lib/roles";

const PAGE_SIZE = 10;

export default async function BranchesPage({ searchParams }) {
  const session = await requireBranchManagerSession();
  const resolvedSearchParams = await searchParams;
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const branches = await listBranches({ branchId });
  const canCreateBranch = session.role === INTEGRATED_MASTER_ROLE;
  const activeBranches = branches.filter((branch) => branch.is_active).length;
  const pagination = paginateItems(branches, parsePage(resolvedSearchParams), PAGE_SIZE);

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Branch Control</div>
            <h2 className="panel-title">지점 관리</h2>
            <p className="panel-copy">
              지점은 문서, 디자이너, 지점 마스터 권한의 기준 단위입니다. 목록을 먼저
              확인하고 필요할 때만 모달에서 추가 또는 수정합니다.
            </p>
          </div>
          <div className="panel-actions">
            <div className="panel-kpi-row">
              <span className="metric-pill">지점 {branches.length}</span>
              <span className="metric-pill">활성 {activeBranches}</span>
            </div>
            {canCreateBranch ? (
              <ModalDialog
                title="지점 추가"
                description="새 지점을 등록하면 디자이너, 템플릿, 지점 마스터 권한의 기준으로 사용할 수 있습니다."
                triggerLabel="지점 추가"
              >
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
                  <div className="form-actions admin-form-actions">
                    <button type="submit">지점 저장</button>
                  </div>
                </form>
              </ModalDialog>
            ) : null}
          </div>
        </div>

        {!canCreateBranch ? (
          <div className="empty-state" style={{ marginBottom: 18 }}>
            지점 마스터는 본인 지점의 정보만 수정할 수 있습니다.
          </div>
        ) : null}

        {pagination.items.length === 0 ? (
          <div className="empty-state">등록된 지점이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {pagination.items.map((branch) => (
                <div key={branch.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{branch.name}</div>
                    <div className="list-row-meta">{branch.description || "설명 없음"}</div>
                  </div>
                  <div className="list-row-actions">
                    <span className={`status-chip ${branch.is_active ? "positive" : "neutral"}`}>
                      {branch.is_active ? "사용 중" : "중지"}
                    </span>
                    <ModalDialog
                      title={`${branch.name} 지점 수정`}
                      description="지점명, 상태, 설명을 수정할 수 있습니다."
                      triggerLabel="수정"
                    >
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
                            <textarea
                              name="description"
                              defaultValue={branch.description || ""}
                            />
                          </label>
                        </div>
                        <div className="form-actions admin-form-actions">
                          <button type="submit">지점 저장</button>
                        </div>
                      </form>
                      {canCreateBranch ? (
                        <form action="/api/admin/branches" method="post" className="modal-danger-zone">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={branch.id} />
                          <button type="submit" className="danger">
                            지점 삭제
                          </button>
                        </form>
                      ) : null}
                    </ModalDialog>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
