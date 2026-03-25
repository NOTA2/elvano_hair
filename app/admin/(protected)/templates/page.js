import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import TemplateVariableGuide from "@/components/TemplateVariableGuide";
import { requireBranchManagerSession } from "@/lib/auth";
import { listBranches, listTemplates } from "@/lib/db";
import { paginateItems, parsePage } from "@/lib/pagination";
import { BRANCH_MASTER_ROLE } from "@/lib/roles";

const PAGE_SIZE = 10;

function branchField(session, branches, defaultBranchId) {
  if (session.role === BRANCH_MASTER_ROLE) {
    return (
      <>
        <input type="hidden" name="branch_id" value={session.branch_id} />
        <label className="field">
          <span className="field-label">지점</span>
          <input value={session.branch_name || ""} disabled readOnly />
        </label>
      </>
    );
  }

  return (
    <label className="field">
      <span className="field-label">지점</span>
      <select name="branch_id" defaultValue={defaultBranchId || ""} required>
        <option value="">선택</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function templateStatusLabel(template) {
  if (template.status === "deleted") {
    return "삭제";
  }

  return template.is_active ? "사용 중" : "중지";
}

function templateStatusClass(template) {
  if (template.status === "deleted") {
    return "soft";
  }

  return template.is_active ? "positive" : "neutral";
}

export default async function AdminTemplatesPage({ searchParams }) {
  const session = await requireBranchManagerSession();
  const resolvedSearchParams = await searchParams;
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const templates = await listTemplates({ branchId, includeDeleted: true });
  const branches = await listBranches({ activeOnly: true, branchId });
  const activeCount = templates.filter((template) => template.status === "active").length;
  const inactiveCount = templates.filter((template) => template.status === "inactive").length;
  const deletedCount = templates.filter((template) => template.status === "deleted").length;
  const pagination = paginateItems(templates, parsePage(resolvedSearchParams), PAGE_SIZE);

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Document Template Studio</div>
            <h2 className="panel-title">문서 템플릿 관리</h2>
            <p className="panel-copy">
              등록된 문서 템플릿 목록을 먼저 보고, 추가와 수정은 모달에서 처리합니다.
              안내문 본문은 고객 문서 발급 시 치환값으로 완성됩니다.
            </p>
          </div>
          <div className="panel-actions">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {templates.length}</span>
              <span className="metric-pill">활성 {activeCount}</span>
              <span className="metric-pill">중지 {inactiveCount}</span>
              <span className="metric-pill">삭제 {deletedCount}</span>
            </div>
            <ModalDialog
              title="문서 템플릿 추가"
              description="새 안내문 템플릿을 등록합니다. 본문은 문서 발급 시 실제 고객 데이터로 치환됩니다."
              triggerLabel="템플릿 추가"
              size="wide"
            >
              <TemplateVariableGuide />
              <form action="/api/admin/templates" method="post">
                <input type="hidden" name="intent" value="create" />
                <div className="form-grid">
                  {branchField(session, branches)}
                  <label className="field">
                    <span className="field-label">템플릿명</span>
                    <input name="name" required />
                  </label>
                  <label className="field">
                    <span className="field-label">설명</span>
                    <input name="description" />
                  </label>
                  <label className="field-full">
                    <span className="field-label">안내문 본문</span>
                    <textarea name="content" required />
                  </label>
                  <label className="field">
                    <span className="field-label">상태</span>
                    <select name="status" defaultValue="active">
                      <option value="active">사용</option>
                      <option value="inactive">중지</option>
                    </select>
                  </label>
                </div>
                <div className="form-actions admin-form-actions">
                  <button type="submit">템플릿 저장</button>
                </div>
              </form>
            </ModalDialog>
          </div>
        </div>

        {pagination.items.length === 0 ? (
          <div className="empty-state">등록된 템플릿이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {pagination.items.map((template) => (
                <div key={template.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{template.name}</div>
                    <div className="list-row-meta">
                      {template.branch_name || "-"} · {template.description || "설명 없음"}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className={`status-chip ${templateStatusClass(template)}`}>
                      {templateStatusLabel(template)}
                    </span>
                    <ModalDialog
                      title={`${template.name} 수정`}
                      description="문서 템플릿 본문과 상태를 수정할 수 있습니다. 삭제 상태로 두면 새 문서 발급에는 나오지 않지만 기존 문서는 그대로 유지됩니다."
                      triggerLabel="수정"
                      size="wide"
                    >
                      <TemplateVariableGuide />
                      <form action="/api/admin/templates" method="post">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={template.id} />
                        <div className="form-grid">
                          {branchField(session, branches, template.branch_id)}
                          <label className="field">
                            <span className="field-label">템플릿명</span>
                            <input name="name" defaultValue={template.name} required />
                          </label>
                          <label className="field">
                            <span className="field-label">설명</span>
                            <input
                              name="description"
                              defaultValue={template.description || ""}
                            />
                          </label>
                          <label className="field-full">
                            <span className="field-label">본문</span>
                            <textarea name="content" defaultValue={template.content} required />
                          </label>
                          <label className="field">
                            <span className="field-label">상태</span>
                            <select name="status" defaultValue={template.status}>
                              <option value="active">사용</option>
                              <option value="inactive">중지</option>
                              <option value="deleted">삭제</option>
                            </select>
                          </label>
                        </div>
                        <div className="form-actions admin-form-actions">
                          <button type="submit">수정 저장</button>
                        </div>
                      </form>
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
