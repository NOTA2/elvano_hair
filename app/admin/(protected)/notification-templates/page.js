import AdminSectionIntro from "@/components/AdminSectionIntro";
import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import TemplateVariableGuide from "@/components/TemplateVariableGuide";
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

function trimPreview(text, maxLength = 120) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Bizgo 조회 결과가 아직 없습니다.";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function buttonSummary(template) {
  if (!template.button_name || !template.button_type) {
    return "버튼 없음";
  }

  const urls = [
    template.button_url_mobile,
    template.button_url_pc,
    template.button_scheme_android,
    template.button_scheme_ios,
    template.button_tel_number
  ].filter(Boolean);

  return `${template.button_name} (${template.button_type})${urls.length ? ` · ${urls[0]}` : ""}`;
}

function NotificationTemplateDetails({ template }) {
  if (!template) {
    return null;
  }

  return (
    <div className="section-stack">
      <div className="record-card compact">
        <div className="record-title">Bizgo 조회 결과</div>
        <div className="record-meta">
          템플릿명: {template.template_name || "-"}
          <br />
          템플릿 코드: {template.template_code || "-"}
          <br />
          검수 상태: {inspectionStatusLabel(template.inspection_status || "REG")}
          <br />
          마지막 동기화:{" "}
          {template.last_synced_at
            ? String(template.last_synced_at).slice(0, 16).replace("T", " ")
            : "-"}
        </div>
      </div>
      <div className="record-card compact">
        <div className="record-title">본문 미리보기</div>
        <div className="record-meta preformatted-copy">{template.message || "본문 없음"}</div>
      </div>
      <div className="record-card compact">
        <div className="record-title">버튼 설정</div>
        <div className="record-meta">{buttonSummary(template)}</div>
      </div>
    </div>
  );
}

function NotificationTemplateForm({
  template = null,
  intent
}) {
  const actionLabel = intent === "create" ? "템플릿 코드 등록" : "등록 정보 저장";

  return (
    <>
      <form action="/api/admin/notification-templates" method="post">
        <input type="hidden" name="intent" value={intent} />
        <input
          type="hidden"
          name="status"
          value={template?.status === "inactive" ? "inactive" : "active"}
        />
        {template ? <input type="hidden" name="id" value={template.id} /> : null}
        <div className="form-grid">
          <label className="field">
            <span className="field-label">템플릿 코드</span>
            <input
              name="template_code"
              defaultValue={template?.template_code || ""}
              placeholder="Bizgo에 등록된 템플릿 코드"
              required
            />
          </label>
        </div>
        <div className="form-actions admin-form-actions">
          <button type="submit">{actionLabel}</button>
        </div>
      </form>
      <NotificationTemplateDetails template={template} />
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
        eyebrow="Bizgo Guide"
        title="알림톡 치환값 안내"
        description="Bizgo 콘솔에서 알림톡 템플릿을 직접 등록한 뒤, 이 화면에서는 템플릿 코드만 연결합니다. 버튼 URL의 문서 링크는 프로토콜이 빠진 값으로 치환됩니다."
        actions={
          <a
            className="button secondary"
            href={BIZGO_TEMPLATE_CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
          >
            Bizgo 콘솔 열기
          </a>
        }
      />
      <section className="panel">
        <TemplateVariableGuide
          title="알림톡 템플릿 치환값 안내"
          description="지점명/문서제목/고객명 같은 값을 한글 의미와 영문 변수명으로 함께 안내합니다."
        />
        <div className="record-card compact">
          <div className="record-meta">
            Bizgo 콘솔에서는 위 <code className="code">{"{{branch_name}}"}</code> 대신{" "}
            <code className="code">{"#{branch_name}"}</code> 형식으로 입력하세요.
            버튼 URL의 문서 링크는 <code className="code">{"https://#{document_url}"}</code>{" "}
            형태로 등록하면 되고, 실제 치환값 <code className="code">document_url</code>
            에는 프로토콜이 포함되지 않습니다.
          </div>
        </div>
      </section>
      <AdminSectionIntro
        eyebrow="Alimtalk Template Center"
        title="알림톡 템플릿 관리"
        description="알림톡 템플릿은 Bizgo 콘솔에서 직접 등록하고, 여기서는 템플릿 코드를 공용 목록에 연결해 사용합니다. 저장 시 템플릿 조회 API로 원격 정보를 확인해 로컬 목록에 동기화합니다."
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
                description="Bizgo 콘솔에 이미 등록된 알림톡 템플릿 코드를 로컬 목록에 연결합니다."
                triggerLabel="템플릿 코드 등록"
                size="wide"
              >
                <NotificationTemplateForm intent="create" />
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
                      검수 {inspectionStatusLabel(template.inspection_status || "REG")}
                    </span>
                    {template.remote_block ? <span className="status-chip neutral">차단</span> : null}
                    {template.remote_dormant ? <span className="status-chip neutral">휴면</span> : null}
                    {template.status !== "deleted" ? (
                      <>
                        <form action="/api/admin/notification-templates" method="post">
                          <input type="hidden" name="intent" value="sync" />
                          <input type="hidden" name="id" value={template.id} />
                          <button type="submit" className="secondary">
                            템플릿 조회
                          </button>
                        </form>
                        <ModalDialog
                          title={`${template.template_name || template.template_code} 수정`}
                          description="Bizgo 콘솔에서 템플릿을 바꿨다면 템플릿 조회로 최신 내용을 다시 동기화하세요."
                          triggerLabel="수정"
                          size="wide"
                        >
                          <NotificationTemplateForm template={template} intent="update" />
                        </ModalDialog>
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
