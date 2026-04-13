import AdminSectionIntro from "@/components/AdminSectionIntro";
import LazyRichTextEditor from "@/components/LazyRichTextEditor";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import SelectField from "@/components/SelectField";
import StatusFilterChips, {
  LIFECYCLE_STATUS_OPTIONS,
  parseStatusFilters
} from "@/components/StatusFilterChips";
import { requireBranchManagerSession } from "@/lib/auth";
import { countTemplates, listTemplatesPage } from "@/lib/db";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "sort_order", label: "선택 순서" },
  { value: "updated_at", label: "최근 수정일" },
  { value: "name", label: "템플릿명" },
  { value: "document_title", label: "문서 제목" },
  { value: "status", label: "상태" }
];
const STATUS_PARAM = "status";

function isDefaultActiveOnly(selectedStatuses) {
  return selectedStatuses.length === 1 && selectedStatuses[0] === "active";
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
  const [resolvedSearchParams] = await Promise.all([
    searchParams,
    requireBranchManagerSession()
  ]);
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const currentPage = parsePage(resolvedSearchParams);
  const sortKey = parseSort(resolvedSearchParams, "sort", "sort_order");
  const direction = parseDirection(resolvedSearchParams, "direction", "asc");
  const statusFilters = parseStatusFilters({
    searchParams: resolvedSearchParams,
    param: STATUS_PARAM
  });
  const [templatesPage, activeCount, inactiveCount, deletedCount] = await Promise.all([
    listTemplatesPage({
      activeOnly: isDefaultActiveOnly(statusFilters),
      includeDeleted: false,
      statusFilters,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    }),
    countTemplates({ status: "active" }),
    countTemplates({ status: "inactive" }),
    countTemplates({ status: "deleted" })
  ]);
  const statusCounts = {
    active: activeCount,
    inactive: inactiveCount,
    deleted: deletedCount
  };

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Document Template Studio"
        title="문서 템플릿 관리"
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <StatusFilterChips
              pathname="/admin/templates"
              searchParams={resolvedSearchParams}
              selectedStatuses={statusFilters}
              counts={statusCounts}
              options={LIFECYCLE_STATUS_OPTIONS}
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
              title="문서 템플릿 추가"
              triggerLabel="템플릿 추가"
              size="wide"
              closeOnBackdrop={false}
            >
              <form action="/api/admin/templates" method="post">
                <input type="hidden" name="intent" value="create" />
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">템플릿명</span>
                    <input name="name" required />
                  </label>
                  <label className="field-full">
                    <span className="field-label">문서 제목</span>
                    <input name="document_title" required />
                  </label>
                  <div className="field-full">
                    <span className="field-label">안내문 본문</span>
                    <LazyRichTextEditor name="content" />
                  </div>
                  <label className="field">
                    <span className="field-label">상태</span>
                    <SelectField name="status" defaultValue="active">
                      <option value="active">사용</option>
                      <option value="inactive">중지</option>
                    </SelectField>
                  </label>
                  <label className="field">
                    <span className="field-label">선택 순서</span>
                    <input
                      type="number"
                      name="sort_order"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      defaultValue="0"
                    />
                    <span className="field-help">낮은 숫자일수록 먼저 나옵니다.</span>
                  </label>
                </div>
                <div className="form-actions admin-form-actions">
                  <button type="submit">템플릿 저장</button>
                </div>
              </form>
            </ModalDialog>
          </div>
        </div>
        {templatesPage.items.length === 0 ? (
          <div className="empty-state">등록된 템플릿이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {templatesPage.items.map((template) => (
                <div key={template.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{template.name}</div>
                    <div className="list-row-meta">
                      {template.document_title || "문서 제목 없음"}
                    </div>
                    <div className="list-row-meta">선택 순서 {template.sort_order}</div>
                  </div>
                  <div className="list-row-actions">
                    <span className={`status-chip ${templateStatusClass(template)}`}>
                      {templateStatusLabel(template)}
                    </span>
                    <ModalDialog
                      title={`${template.name} 수정`}
                      description={
                        <>삭제 상태로 두면 새 문서 발급에는 나오지 않지만 기존 문서는 그대로 유지됩니다.</>
                      }
                      triggerLabel="수정"
                      size="wide"
                      closeOnBackdrop={false}
                    >
                      <form action="/api/admin/templates" method="post">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={template.id} />
                        <div className="form-grid">
                          <label className="field">
                            <span className="field-label">템플릿명</span>
                            <input name="name" defaultValue={template.name} required />
                          </label>
                          <label className="field-full">
                            <span className="field-label">문서 제목</span>
                            <input
                              name="document_title"
                              defaultValue={template.document_title || ""}
                              required
                            />
                          </label>
                          <div className="field-full">
                            <span className="field-label">본문</span>
                            <LazyRichTextEditor name="content" defaultValue={template.content} />
                          </div>
                          <label className="field">
                            <span className="field-label">상태</span>
                            <SelectField name="status" defaultValue={template.status}>
                              <option value="active">사용</option>
                              <option value="inactive">중지</option>
                              <option value="deleted">삭제</option>
                            </SelectField>
                          </label>
                          <label className="field">
                            <span className="field-label">선택 순서</span>
                            <input
                              type="number"
                              name="sort_order"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              defaultValue={template.sort_order}
                            />
                            <span className="field-help">낮은 숫자일수록 먼저 나옵니다.</span>
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
              currentPage={templatesPage.currentPage}
              totalPages={templatesPage.totalPages}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </section>
    </div>
  );
}
