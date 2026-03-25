import ListQueryControls from "@/components/ListQueryControls";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import SelectField from "@/components/SelectField";
import { isBranchMaster, requireAdminSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  listBranches,
  listDesigners,
  listDocuments,
  listNotificationTemplates,
  listTemplates
} from "@/lib/db";
import {
  paginateItems,
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort,
  sortItems
} from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_OPTIONS = [
  { value: "created_at", label: "생성일" },
  { value: "signed_at", label: "서명일" },
  { value: "document_title", label: "문서 제목" },
  { value: "customer_name", label: "고객명" },
  { value: "branch_name", label: "지점" },
  { value: "status", label: "상태" }
];

function statusClass(status) {
  if (status === "signed") return "signed";
  if (status === "failed") return "failed";
  return "pending";
}

export default async function AdminDocumentsPage({ searchParams }) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await searchParams;
  const branchId = isBranchMaster(session) ? session.branch_id : undefined;
  const branches = await listBranches({ activeOnly: true, branchId });
  const documentTemplates = await listTemplates({ activeOnly: true, branchId });
  const notificationTemplates = await listNotificationTemplates({ activeOnly: true, branchId });
  const designers = await listDesigners({ activeOnly: true, branchId });
  const documents = await listDocuments({ branchId });
  const baseUrl = getBaseUrl();
  const signedCount = documents.filter((document) => document.status === "signed").length;
  const pendingCount = documents.filter((document) => document.status === "pending").length;
  const failedCount = documents.filter((document) => document.status === "failed").length;
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const sortKey = parseSort(resolvedSearchParams, "sort", "created_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const sortedDocuments = sortItems(documents, sortKey, direction, {
    created_at: (document) => document.created_at,
    signed_at: (document) => document.signed_at,
    document_title: (document) => document.document_title,
    customer_name: (document) => document.customer_name,
    branch_name: (document) => document.branch_name,
    status: (document) => document.status
  });
  const pagination = paginateItems(
    sortedDocuments,
    parsePage(resolvedSearchParams),
    pageSize
  );

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Issued Documents</div>
            <h2 className="panel-title">발급된 문서 목록</h2>
            <p className="panel-copy">
              최근에 생성된 순서대로 표시합니다. 새 문서 발급은 추가 버튼을 눌러 모달에서
              진행합니다.
            </p>
          </div>
          <div className="panel-actions">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {documents.length}</span>
              <span className="metric-pill">완료 {signedCount}</span>
              <span className="metric-pill">대기 {pendingCount}</span>
              {failedCount > 0 ? <span className="metric-pill">실패 {failedCount}</span> : null}
            </div>
            <ListQueryControls
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={SORT_OPTIONS}
            />
            <ModalDialog
              title="서명 문서 발급"
              description="문서 템플릿과 알림톡 템플릿을 각각 선택해 고객 안내문을 발급합니다. 필요하면 Bizgo 알림톡으로 바로 전송할 수 있습니다."
              triggerLabel="문서 발급"
              size="wide"
            >
              <form action="/api/admin/documents" method="post">
                <input type="hidden" name="intent" value="create" />
                <div className="form-grid">
                  {isBranchMaster(session) ? (
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
                      <SelectField name="branch_id" required>
                        <option value="">선택</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </SelectField>
                    </label>
                  )}
                  <label className="field">
                    <span className="field-label">문서 템플릿</span>
                    <SelectField name="template_id" required>
                      <option value="">선택</option>
                      {documentTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.branch_name ? `${template.branch_name} · ` : ""}
                          {template.name}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="field">
                    <span className="field-label">알림톡 템플릿</span>
                    <SelectField name="notification_template_id" required>
                      <option value="">선택</option>
                      {notificationTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.branch_name ? `${template.branch_name} · ` : ""}
                          {template.template_name} ({template.template_code})
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="field">
                    <span className="field-label">문서 제목</span>
                    <input name="document_title" placeholder="멤버십 안내문" required />
                  </label>
                  <label className="field">
                    <span className="field-label">날짜</span>
                    <input type="date" name="document_date" required />
                  </label>
                  <label className="field">
                    <span className="field-label">고객 이름</span>
                    <input name="customer_name" required />
                  </label>
                  <label className="field">
                    <span className="field-label">휴대폰 뒷자리 4자리</span>
                    <input name="phone_last4" pattern="\d{4}" maxLength={4} required />
                  </label>
                  <label className="field">
                    <span className="field-label">전체 수신 휴대폰 번호</span>
                    <input name="recipient_phone" placeholder="01012345678" />
                  </label>
                  <label className="field">
                    <span className="field-label">담당 디자이너</span>
                    <SelectField name="designer_id" required>
                      <option value="">선택</option>
                      {designers.map((designer) => (
                        <option key={designer.id} value={designer.id}>
                          {designer.branch_name ? `${designer.branch_name} · ` : ""}
                          {designer.name}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="field">
                    <span className="field-label">알림톡 즉시 발송</span>
                    <SelectField name="send_alimtalk" defaultValue="0">
                      <option value="0">아니오</option>
                      <option value="1">예</option>
                    </SelectField>
                  </label>
                </div>
                <div className="form-actions admin-form-actions">
                  <button type="submit">문서 생성</button>
                  <span className="pill-note">
                    알림톡 즉시 발송을 켜면 선택한 알림톡 템플릿으로 Bizgo 발송을 시도합니다.
                  </span>
                </div>
              </form>
            </ModalDialog>
          </div>
        </div>

        {pagination.items.length === 0 ? (
          <div className="empty-state">발급된 문서가 없습니다.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>상태</th>
                    <th>문서</th>
                    <th>고객</th>
                    <th>열람</th>
                    <th>알림톡</th>
                    <th>생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <span className={`badge ${statusClass(document.status)}`}>
                          {document.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-cell-title">{document.document_title}</div>
                        <div className="table-cell-copy">
                          {document.branch_name} · 문서 {document.template_name || "-"} · 알림톡 {document.notification_template_name || "-"} · {document.designer_name}
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-title">{document.customer_name}</div>
                        <div className="table-cell-copy">{document.phone_last4}</div>
                      </td>
                      <td>
                        <a
                          className="button secondary table-action-button"
                          href={`${baseUrl}/s/${document.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          문서 보기
                        </a>
                      </td>
                      <td>
                        <div className="table-cell-title">{document.bizgo_status || "-"}</div>
                        <div className="table-cell-copy">{document.recipient_phone || "-"}</div>
                      </td>
                      <td>
                        <div className="table-cell-title">
                          {String(document.created_at).slice(0, 10)}
                        </div>
                        <div className="table-cell-copy">
                          {document.signed_at ? `서명 ${String(document.signed_at).slice(0, 10)}` : ""}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
