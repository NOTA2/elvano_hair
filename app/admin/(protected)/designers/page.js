import AdminSectionIntro from "@/components/AdminSectionIntro";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import SelectField from "@/components/SelectField";
import { requireBranchManagerSession } from "@/lib/auth";
import {
  countDesigners,
  listBranches,
  listDesignersPage
} from "@/lib/db";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";
import { BRANCH_MASTER_ROLE } from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "updated_at", label: "최근 수정일" },
  { value: "name", label: "디자이너명" },
  { value: "branch_name", label: "지점" },
  { value: "is_active", label: "사용 여부" }
];

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
      <SelectField name="branch_id" defaultValue={defaultBranchId || ""} required>
        <option value="">선택</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </SelectField>
    </label>
  );
}

export default async function DesignersPage({ searchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireBranchManagerSession(),
    searchParams
  ]);
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const currentPage = parsePage(resolvedSearchParams);
  const sortKey = parseSort(resolvedSearchParams, "sort", "updated_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const [branches, designersPage, activeDesigners] = await Promise.all([
    listBranches({ activeOnly: true, branchId }),
    listDesignersPage({
      branchId,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    }),
    countDesigners({ branchId, activeOnly: true })
  ]);

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Designer Setup"
        title="디자이너 관리"
        description="문서 발급 시 선택할 담당자를 지점별로 등록합니다. 목록을 기본으로 보여주고, 추가와 수정은 모두 모달에서 처리합니다."
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {designersPage.totalCount}</span>
              <span className="metric-pill">활성 {activeDesigners}</span>
            </div>
          </div>
          <div className="panel-actions">
            <ListQueryControls
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={SORT_OPTIONS}
            />
            <ModalDialog
              title="디자이너 추가"
              description="새 디자이너를 등록하면 문서 발급 시 담당 디자이너로 선택할 수 있습니다."
              triggerLabel="디자이너 추가"
            >
              <form action="/api/admin/designers" method="post">
                <input type="hidden" name="intent" value="create" />
                <div className="form-grid">
                  {branchField(session, branches)}
                  <label className="field">
                    <span className="field-label">디자이너명</span>
                    <input name="name" required />
                  </label>
                  <label className="field">
                    <span className="field-label">사용 여부</span>
                    <SelectField name="is_active" defaultValue="1">
                      <option value="1">사용</option>
                      <option value="0">중지</option>
                    </SelectField>
                  </label>
                  <label className="field-full">
                    <span className="field-label">메모</span>
                    <textarea name="description" />
                  </label>
                </div>
                <div className="form-actions admin-form-actions">
                  <button type="submit">디자이너 저장</button>
                </div>
              </form>
              </ModalDialog>
            </div>
        </div>

        {designersPage.items.length === 0 ? (
          <div className="empty-state">등록된 디자이너가 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {designersPage.items.map((designer) => (
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
                          {branchField(session, branches, designer.branch_id)}
                          <label className="field">
                            <span className="field-label">디자이너명</span>
                            <input name="name" defaultValue={designer.name} required />
                          </label>
                          <label className="field">
                            <span className="field-label">사용 여부</span>
                            <SelectField name="is_active" defaultValue={designer.is_active ? "1" : "0"}>
                              <option value="1">사용</option>
                              <option value="0">중지</option>
                            </SelectField>
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
            <PaginationControls
              currentPage={designersPage.currentPage}
              totalPages={designersPage.totalPages}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
