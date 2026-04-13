import AdminSectionIntro from "@/components/AdminSectionIntro";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import SelectField from "@/components/SelectField";
import StatusFilterChips, {
  ACTIVE_STATUS_OPTIONS,
  parseStatusFilters
} from "@/components/StatusFilterChips";
import { requireIntegratedMasterSession } from "@/lib/auth";
import { countBranches, listBranchesPage } from "@/lib/db";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "updated_at", label: "최근 수정일" },
  { value: "name", label: "지점명" },
  { value: "created_at", label: "생성일" },
  { value: "is_active", label: "사용 여부" }
];
const STATUS_PARAM = "status";
const ERROR_MESSAGES = {
  phone_required: "지점 전화번호를 입력해 주세요.",
  phone_invalid:
    "지점 전화번호는 02-123-4567 또는 031-1234-5678 형식으로 입력해 주세요."
};

export default async function BranchesPage({ searchParams }) {
  const [resolvedSearchParams] = await Promise.all([
    searchParams,
    requireIntegratedMasterSession()
  ]);
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const currentPage = parsePage(resolvedSearchParams);
  const sortKey = parseSort(resolvedSearchParams, "sort", "updated_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const statusFilters = parseStatusFilters({
    searchParams: resolvedSearchParams,
    param: STATUS_PARAM,
    options: ACTIVE_STATUS_OPTIONS
  });
  const [branchesPage, activeBranches, inactiveBranches] = await Promise.all([
    listBranchesPage({
      statusFilters,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    }),
    countBranches({ activeOnly: true }),
    countBranches({ statusFilters: ["inactive"] })
  ]);
  const statusCounts = {
    active: activeBranches,
    inactive: inactiveBranches
  };
  const errorMessage =
    String(resolvedSearchParams?.message || "").trim() ||
    ERROR_MESSAGES[String(resolvedSearchParams?.error || "")] ||
    "";

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Branch Control"
        title="지점 관리"
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <StatusFilterChips
              pathname="/admin/branches"
              searchParams={resolvedSearchParams}
              selectedStatuses={statusFilters}
              counts={statusCounts}
              options={ACTIVE_STATUS_OPTIONS}
              param={STATUS_PARAM}
            />
          </div>
          <div className="panel-actions">
            <ListQueryControls
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={SORT_OPTIONS}
            />
            <ModalDialog
              title="지점 추가"
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
                    <span className="field-label">지점 전화번호</span>
                    <input
                      name="phone"
                      placeholder="02-123-4567 / 031-1234-5678"
                      inputMode="tel"
                      pattern="0[0-9]{1,2}-[0-9]{3,4}-[0-9]{3,4}"
                      title="지점 전화번호는 02-123-4567 또는 031-1234-5678 형식으로 입력해 주세요."
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">사용 여부</span>
                    <SelectField name="is_active" defaultValue="1">
                      <option value="1">사용</option>
                      <option value="0">중지</option>
                    </SelectField>
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
          </div>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {branchesPage.items.length === 0 ? (
          <div className="empty-state">등록된 지점이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {branchesPage.items.map((branch) => (
                <div key={branch.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{branch.name}</div>
                    <div className="list-row-meta">
                      {branch.phone || "전화번호 없음"} · {branch.description || "설명 없음"}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className={`status-chip ${branch.is_active ? "positive" : "neutral"}`}>
                      {branch.is_active ? "사용 중" : "중지"}
                    </span>
                    <ModalDialog
                      title={`${branch.name} 지점 수정`}
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
                            <span className="field-label">지점 전화번호</span>
                            <input
                              name="phone"
                              defaultValue={branch.phone || ""}
                              placeholder="02-123-4567 / 031-1234-5678"
                              inputMode="tel"
                              pattern="0[0-9]{1,2}-[0-9]{3,4}-[0-9]{3,4}"
                              title="지점 전화번호는 02-123-4567 또는 031-1234-5678 형식으로 입력해 주세요."
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">사용 여부</span>
                            <SelectField name="is_active" defaultValue={branch.is_active ? "1" : "0"}>
                              <option value="1">사용</option>
                              <option value="0">중지</option>
                            </SelectField>
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
                    </ModalDialog>
                    <ModalDialog
                      title={`${branch.name} 지점 삭제`}
                      description="정말 이 지점을 삭제하시겠습니까? 삭제 후에는 연결된 설정과 목록에 영향이 있을 수 있습니다."
                      triggerLabel="삭제"
                      triggerClassName="danger"
                    >
                      <form
                        action="/api/admin/branches"
                        method="post"
                        className="modal-danger-zone"
                      >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={branch.id} />
                        <div className="form-actions admin-form-actions">
                          <button type="submit" className="danger">
                            네, 삭제합니다
                          </button>
                        </div>
                      </form>
                    </ModalDialog>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={branchesPage.currentPage}
              totalPages={branchesPage.totalPages}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
