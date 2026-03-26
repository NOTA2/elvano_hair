import Link from "next/link";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import { requireBranchManagerSession } from "@/lib/auth";
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
  const [templatesPage, activeCount, deletedCount, approvedCount, requestedCount] =
    await Promise.all([
      listNotificationTemplatesPage({
        includeDeleted: true,
        page: currentPage,
        pageSize,
        sortKey,
        direction
      }),
      countNotificationTemplates({ status: "active" }),
      countNotificationTemplates({ status: "deleted" }),
      countNotificationTemplates({ includeDeleted: true, inspectionStatus: "APR" }),
      countNotificationTemplates({ includeDeleted: true, inspectionStatus: "REQ" })
    ]);
  const errorMessage =
    String(resolvedSearchParams?.message || "").trim() ||
    ERROR_MESSAGES[String(resolvedSearchParams?.error || "")] ||
    "";

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Quick Help"
        title="알림톡 템플릿 준비가 처음이신가요?"
        description={
          <>
            메뉴얼에서 준비 순서와 Bizgo에 넣는 자동 입력 문구를 먼저 확인할 수
            있습니다.
            <br />
            알림톡 템플릿은 Bizgo 콘솔에서 만든 뒤, 이 화면에서는 코드만 등록합니다.
          </>
        }
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
        description={
          <>
            Bizgo 콘솔에서 만든 알림톡을 여기에서 연결해 사용합니다.
            <br />
            템플릿 코드를 등록하면 목록에서 승인 상태와 사용 여부를 함께 확인할 수
            있습니다.
          </>
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {templatesPage.totalCount}</span>
              <span className="metric-pill">사용 {activeCount}</span>
              <span className="metric-pill">승인 {approvedCount}</span>
              <span className="metric-pill">검수 요청 {requestedCount}</span>
              <span className="metric-pill">삭제 {deletedCount}</span>
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
                description={
                  <>
                    Bizgo 콘솔에 이미 등록된 알림톡 템플릿 코드를 로컬 목록에
                    연결합니다.
                  </>
                }
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
                        <form action="/api/admin/notification-templates" method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={template.id} />
                          <button type="submit" className="danger">
                            목록에서 삭제
                          </button>
                        </form>
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
