import Link from "next/link";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import ActionTooltip from "@/components/ActionTooltip";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import StatusFilterChips, {
  LIFECYCLE_STATUS_OPTIONS,
  parseStatusFilters
} from "@/components/StatusFilterChips";
import { requireBranchManagerSession } from "@/lib/auth";
import { summarizeBizgoTemplateStructure } from "@/lib/bizgo";
import {
  countNotificationTemplates,
  listNotificationTemplatesPage
} from "@/lib/db";
import {
  inspectionStatusLabel,
  notificationLifecycleLabel
} from "@/lib/notificationTemplates";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";

const BIZGO_TEMPLATE_CONSOLE_URL =
  "https://www.bizgo.io/console/team/2815/kakao/template/alimtalk";
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "updated_at", label: "최근 수정일" },
  { value: "template_name", label: "템플릿명" },
  { value: "template_code", label: "템플릿 코드" },
  { value: "inspection_status", label: "검수 상태" }
];
const STATUS_PARAM = "status";
const ERROR_MESSAGES = {
  sender_key_missing: "환경변수 `BIZGO_SENDER_KEY`가 없습니다.",
  template_code_required: "템플릿 코드를 입력해야 합니다.",
  template_lookup_failed:
    "Bizgo 조회 결과가 없어 등록할 수 없습니다. Bizgo 콘솔에서 템플릿 코드와 발신 프로필 키를 먼저 확인해 주세요.",
  duplicate_template_code: "이미 등록된 알림톡 템플릿 코드입니다."
};

function lifecycleClass(template) {
  if (template.status === "deleted") {
    return "soft";
  }

  return template.is_active ? "positive" : "neutral";
}

function inspectionClass(status) {
  if (status === "APR") {
    return "positive";
  }

  if (status === "REJ") {
    return "neutral";
  }

  if (status === "REQ") {
    return "brand";
  }

  return "soft";
}

function canSyncTemplate(template) {
  return template.inspection_status !== "APR";
}

function trimPreview(text, maxLength = 120) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Bizgo 조회 결과가 아직 없습니다.";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function NotificationTemplateForm() {
  return (
    <>
      <form action="/api/admin/notification-templates" method="post">
        <input type="hidden" name="intent" value="create" />
        <div className="form-grid">
          <label className="field">
            <span className="field-label">템플릿 코드</span>
            <input
              name="template_code"
              placeholder="Bizgo에 등록된 템플릿 코드"
              required
            />
          </label>
        </div>
        <div className="form-actions admin-form-actions">
          <button type="submit">템플릿 코드 등록</button>
        </div>
      </form>
    </>
  );
}

export default async function NotificationTemplatesPage({ searchParams }) {
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
  const sortKey = parseSort(resolvedSearchParams, "sort", "updated_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const statusFilters = parseStatusFilters({
    searchParams: resolvedSearchParams,
    param: STATUS_PARAM
  });
  const [
    templatesPage,
    activeCount,
    inactiveCount,
    deletedCount,
    approvedCount,
    requestedCount
  ] =
    await Promise.all([
      listNotificationTemplatesPage({
        statusFilters,
        page: currentPage,
        pageSize,
        sortKey,
        direction
      }),
      countNotificationTemplates({ status: "active" }),
      countNotificationTemplates({ status: "inactive" }),
      countNotificationTemplates({ status: "deleted" }),
      countNotificationTemplates({ includeDeleted: true, inspectionStatus: "APR" }),
      countNotificationTemplates({ includeDeleted: true, inspectionStatus: "REQ" })
    ]);
  const statusCounts = {
    active: activeCount,
    inactive: inactiveCount,
    deleted: deletedCount
  };
  const errorMessage =
    String(resolvedSearchParams?.message || "").trim() ||
    ERROR_MESSAGES[String(resolvedSearchParams?.error || "")] ||
    "";

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Quick Help"
        title="알림톡 템플릿 준비"
        actions={
          <>
            <Link className="button secondary" href="/admin/manual">
              메뉴얼 보기
            </Link>
            <a
              className="button secondary"
              href={BIZGO_TEMPLATE_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Bizgo 콘솔 열기
            </a>
          </>
        }
      />
      <AdminSectionIntro
        eyebrow="Alimtalk Template Center"
        title="알림톡 템플릿 관리"
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <StatusFilterChips
              pathname="/admin/notification-templates"
              searchParams={resolvedSearchParams}
              selectedStatuses={statusFilters}
              counts={statusCounts}
              options={LIFECYCLE_STATUS_OPTIONS}
              param={STATUS_PARAM}
            />
            <div className="panel-kpi-row">
              <span className="metric-pill">승인 {approvedCount}</span>
              <span className="metric-pill">검수 요청 {requestedCount}</span>
            </div>
          </div>
          <div className="panel-actions">
            <ListQueryControls
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={SORT_OPTIONS}
            />
            <div className="inline-actions">
              <ModalDialog
                title="알림톡 템플릿 코드 등록"
                triggerLabel="템플릿 코드 등록"
                size="wide"
              >
                <NotificationTemplateForm />
              </ModalDialog>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {templatesPage.items.length === 0 ? (
          <div className="empty-state">등록된 알림톡 템플릿이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {templatesPage.items.map((template) => (
                <div key={template.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">
                      {template.template_name || template.template_code}
                    </div>
                    <div className="list-row-meta">{template.template_code}</div>
                    <div className="list-row-meta">{trimPreview(template.message)}</div>
                    <div className="list-row-meta">
                      {summarizeBizgoTemplateStructure(template)}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className={`status-chip ${lifecycleClass(template)}`}>
                      {notificationLifecycleLabel(template)}
                    </span>
                    <span className={`status-chip ${inspectionClass(template.inspection_status)}`}>
                      {inspectionStatusLabel(template.inspection_status || "REG")}
                    </span>
                    {template.remote_block ? <span className="status-chip neutral">차단</span> : null}
                    {template.remote_dormant ? <span className="status-chip neutral">휴면</span> : null}
                    {template.status !== "deleted" ? (
                      <>
                        {canSyncTemplate(template) ? (
                          <form action="/api/admin/notification-templates" method="post">
                            <input type="hidden" name="intent" value="sync" />
                            <input type="hidden" name="id" value={template.id} />
                            <button type="submit" className="secondary">
                              템플릿 조회
                            </button>
                          </form>
                        ) : null}
                        <ActionTooltip label="목록에서 삭제">
                          <ModalDialog
                            title={`${template.template_name || template.template_code} 삭제`}
                            description="정말 이 알림톡 템플릿을 목록에서 삭제하시겠습니까? 기존 발급 문서는 유지되지만 새 연결 목록에서는 숨겨집니다."
                            triggerLabel="🗑️"
                            triggerAriaLabel={`${template.template_name || template.template_code} 삭제`}
                            triggerTitle="목록에서 삭제"
                            triggerClassName="danger icon-action-button table-action-button negative"
                          >
                            <form
                              action="/api/admin/notification-templates"
                              method="post"
                              className="modal-danger-zone"
                            >
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="id" value={template.id} />
                              <div className="form-actions admin-form-actions">
                                <button type="submit" className="danger">
                                  네, 삭제합니다
                                </button>
                              </div>
                            </form>
                          </ModalDialog>
                        </ActionTooltip>
                      </>
                    ) : null}
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
