import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import SelectField from "@/components/SelectField";
import TemplateVariableGuide from "@/components/TemplateVariableGuide";
import { requireBranchManagerSession } from "@/lib/auth";
import { listBranches, listNotificationTemplates } from "@/lib/db";
import {
  BUTTON_TYPE_OPTIONS,
  inspectionStatusLabel,
  notificationLifecycleLabel,
  SENDER_KEY_TYPE_OPTIONS,
  TEMPLATE_EMPHASIZE_TYPE_OPTIONS,
  TEMPLATE_MESSAGE_TYPE_OPTIONS
} from "@/lib/notificationTemplates";
import {
  paginateItems,
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort,
  sortItems
} from "@/lib/pagination";
import { BRANCH_MASTER_ROLE } from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "updated_at", label: "최근 수정일" },
  { value: "template_name", label: "템플릿명" },
  { value: "template_code", label: "템플릿 코드" },
  { value: "inspection_status", label: "검수 상태" },
  { value: "branch_name", label: "지점" }
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

function canRequestApproval(template) {
  return template.status !== "deleted" && (template.inspection_status || "REG") === "REG";
}

function canCancelApproval(template) {
  return template.status !== "deleted" && ["REQ", "APR"].includes(template.inspection_status || "");
}

function NotificationTemplateForm({
  session,
  branches,
  template = null,
  intent
}) {
  const actionLabel = intent === "create" ? "알림톡 템플릿 등록" : "알림톡 템플릿 저장";

  return (
    <>
      <TemplateVariableGuide
        title="알림톡 템플릿 치환값 안내"
        description="비즈고 알림톡 텍스트, 버튼 URL 등에 아래 영문 치환값을 그대로 사용할 수 있습니다."
      />
      <form action="/api/admin/notification-templates" method="post">
        <input type="hidden" name="intent" value={intent} />
        {template ? <input type="hidden" name="id" value={template.id} /> : null}
        <div className="form-grid">
          {branchField(session, branches, template?.branch_id)}
          <label className="field">
            <span className="field-label">발신 프로필 키</span>
            <input name="sender_key" defaultValue={template?.sender_key || ""} required />
          </label>
          <label className="field">
            <span className="field-label">발신키 타입</span>
            <SelectField
              name="sender_key_type"
              defaultValue={template?.sender_key_type || "S"}
            >
              {SENDER_KEY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">템플릿 코드</span>
            <input name="template_code" defaultValue={template?.template_code || ""} required />
          </label>
          <label className="field">
            <span className="field-label">템플릿명</span>
            <input name="template_name" defaultValue={template?.template_name || ""} required />
          </label>
          <label className="field">
            <span className="field-label">메시지 유형</span>
            <SelectField
              name="template_message_type"
              defaultValue={template?.template_message_type || "BA"}
            >
              {TEMPLATE_MESSAGE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">강조 유형</span>
            <SelectField
              name="template_emphasize_type"
              defaultValue={template?.template_emphasize_type || "NONE"}
            >
              {TEMPLATE_EMPHASIZE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">카테고리 코드</span>
            <input name="category_code" defaultValue={template?.category_code || ""} />
          </label>
          <label className="field">
            <span className="field-label">보안 템플릿 여부</span>
            <SelectField
              name="security_flag"
              defaultValue={template?.security_flag ? "1" : "0"}
            >
              <option value="0">아니오</option>
              <option value="1">예</option>
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">내부 메모</span>
            <input name="description" defaultValue={template?.description || ""} />
          </label>
          <label className="field">
            <span className="field-label">운영 상태</span>
            <SelectField name="status" defaultValue={template?.is_active ? "active" : "inactive"}>
              <option value="active">사용</option>
              <option value="inactive">중지</option>
            </SelectField>
          </label>
          <label className="field-full">
            <span className="field-label">알림톡 본문</span>
            <textarea name="message" defaultValue={template?.message || ""} required />
          </label>
          <label className="field">
            <span className="field-label">강조 제목</span>
            <input name="title" defaultValue={template?.title || ""} />
          </label>
          <label className="field">
            <span className="field-label">강조 부제</span>
            <input name="subtitle" defaultValue={template?.subtitle || ""} />
          </label>
          <label className="field">
            <span className="field-label">헤더</span>
            <input name="header" defaultValue={template?.header || ""} />
          </label>
          <label className="field">
            <span className="field-label">버튼명</span>
            <input name="button_name" defaultValue={template?.button_name || ""} />
          </label>
          <label className="field">
            <span className="field-label">버튼 타입</span>
            <SelectField name="button_type" defaultValue={template?.button_type || "WL"}>
              <option value="">선택 안 함</option>
              {BUTTON_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">버튼 모바일 URL</span>
            <input
              name="button_url_mobile"
              defaultValue={template?.button_url_mobile || ""}
              placeholder="{{document_url}}"
            />
          </label>
          <label className="field">
            <span className="field-label">버튼 PC URL</span>
            <input
              name="button_url_pc"
              defaultValue={template?.button_url_pc || ""}
              placeholder="{{document_url}}"
            />
          </label>
          <label className="field">
            <span className="field-label">IOS Scheme</span>
            <input
              name="button_scheme_ios"
              defaultValue={template?.button_scheme_ios || ""}
            />
          </label>
          <label className="field">
            <span className="field-label">Android Scheme</span>
            <input
              name="button_scheme_android"
              defaultValue={template?.button_scheme_android || ""}
            />
          </label>
          <label className="field">
            <span className="field-label">전화번호 버튼용 번호</span>
            <input name="button_tel_number" defaultValue={template?.button_tel_number || ""} />
          </label>
        </div>
        <div className="form-actions admin-form-actions">
          <button type="submit">{actionLabel}</button>
        </div>
      </form>
    </>
  );
}

export default async function NotificationTemplatesPage({ searchParams }) {
  const session = await requireBranchManagerSession();
  const resolvedSearchParams = await searchParams;
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const branches = await listBranches({ activeOnly: true, branchId });
  const templates = await listNotificationTemplates({ branchId, includeDeleted: true });
  const activeCount = templates.filter((template) => template.status === "active").length;
  const deletedCount = templates.filter((template) => template.status === "deleted").length;
  const approvedCount = templates.filter((template) => template.inspection_status === "APR").length;
  const requestedCount = templates.filter((template) => template.inspection_status === "REQ").length;
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const sortKey = parseSort(resolvedSearchParams, "sort", "updated_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const sortedTemplates = sortItems(templates, sortKey, direction, {
    updated_at: (template) => template.updated_at,
    template_name: (template) => template.template_name,
    template_code: (template) => template.template_code,
    inspection_status: (template) => template.inspection_status,
    branch_name: (template) => template.branch_name
  });
  const pagination = paginateItems(
    sortedTemplates,
    parsePage(resolvedSearchParams),
    pageSize
  );

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Alimtalk Template Center</div>
            <h2 className="panel-title">알림톡 템플릿 관리</h2>
            <p className="panel-copy">
              비즈고 알림톡 템플릿은 로컬 목록으로 관리하고, 등록/수정/삭제/검수 요청은
              Bizgo 관리 API에 바로 반영합니다. 조회는 단건 동기화 방식으로 처리합니다.
            </p>
          </div>
          <div className="panel-actions">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {templates.length}</span>
              <span className="metric-pill">사용 {activeCount}</span>
              <span className="metric-pill">승인 {approvedCount}</span>
              <span className="metric-pill">검수 요청 {requestedCount}</span>
              <span className="metric-pill">삭제 {deletedCount}</span>
            </div>
            <ListQueryControls
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={SORT_OPTIONS}
            />
            <ModalDialog
              title="알림톡 템플릿 등록"
              description="등록 시 Bizgo 알림톡 관리 API에 템플릿을 생성하고, 성공하면 로컬 목록에 저장합니다."
              triggerLabel="알림톡 템플릿 추가"
              size="wide"
            >
              <NotificationTemplateForm
                session={session}
                branches={branches}
                intent="create"
              />
            </ModalDialog>
          </div>
        </div>

        {pagination.items.length === 0 ? (
          <div className="empty-state">등록된 알림톡 템플릿이 없습니다.</div>
        ) : (
          <>
            <div className="stack-list">
              {pagination.items.map((template) => (
                <div key={template.id} className="list-row-card">
                  <div className="list-row-copy">
                    <div className="list-row-title">{template.template_name}</div>
                    <div className="list-row-meta">
                      {template.branch_name} · {template.sender_key} · {template.template_code}
                    </div>
                    <div className="list-row-meta">
                      {template.last_synced_at
                        ? `마지막 동기화 ${String(template.last_synced_at).slice(0, 16).replace("T", " ")}`
                        : "아직 원격 조회 이력이 없습니다."}
                    </div>
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
                            원격 조회
                          </button>
                        </form>
                        <ModalDialog
                          title={`${template.template_name} 수정`}
                          description="수정 시 Bizgo 원격 템플릿과 로컬 카탈로그를 함께 갱신합니다."
                          triggerLabel="수정"
                          size="wide"
                        >
                          <NotificationTemplateForm
                            session={session}
                            branches={branches}
                            template={template}
                            intent="update"
                          />
                        </ModalDialog>
                        {canRequestApproval(template) ? (
                          <ModalDialog
                            title="검수 요청"
                            description="검수 요청 시 선택적으로 의견 또는 문의 사항을 남길 수 있습니다."
                            triggerLabel="검수 요청"
                          >
                            <form action="/api/admin/notification-templates" method="post">
                              <input type="hidden" name="intent" value="request_approval" />
                              <input type="hidden" name="id" value={template.id} />
                              <label className="field-full">
                                <span className="field-label">의견 또는 문의 사항</span>
                                <textarea name="comment" />
                              </label>
                              <div className="form-actions admin-form-actions">
                                <button type="submit">검수 요청 전송</button>
                              </div>
                            </form>
                          </ModalDialog>
                        ) : null}
                        {canCancelApproval(template) ? (
                          <form action="/api/admin/notification-templates" method="post">
                            <input type="hidden" name="intent" value="cancel_approval" />
                            <input type="hidden" name="id" value={template.id} />
                            <button type="submit" className="secondary">
                              검수 요청 취소
                            </button>
                          </form>
                        ) : null}
                        <form action="/api/admin/notification-templates" method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={template.id} />
                          <button type="submit" className="danger">
                            원격 삭제
                          </button>
                        </form>
                      </>
                    ) : null}
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
