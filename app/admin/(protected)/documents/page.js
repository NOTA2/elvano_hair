import AdminSectionIntro from "@/components/AdminSectionIntro";
import AlertOnMount from "@/components/AlertOnMount";
import DocumentsListControls from "@/components/DocumentsListControls";
import DocumentsSearchControls from "@/components/DocumentsSearchControls";
import LazyAdminDocumentIssueForm from "@/components/LazyAdminDocumentIssueForm";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import {
  isIntegratedMaster,
  requireAdminSession
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  countDocuments,
  listBranches,
  listDocumentsPage
} from "@/lib/db";
import { isDocumentExpired } from "@/lib/documents";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";
import { maskKoreanPhoneNumber } from "@/lib/phone";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const MASTER_SORT_OPTIONS = [
  { value: "created_at", label: "생성일" },
  { value: "signed_at", label: "서명일" },
  { value: "document_title", label: "문서 제목" },
  { value: "branch_name", label: "지점" },
  { value: "status", label: "상태" }
];
const BRANCH_SORT_OPTIONS = MASTER_SORT_OPTIONS.filter((option) => option.value !== "branch_name");
const RESEND_LOADING_STEPS = JSON.stringify([
  {
    label: "재발송 대상을 확인하고 있습니다",
    description: "문서와 연결된 알림톡 템플릿 정보를 불러오고 있습니다."
  },
  {
    label: "알림톡 템플릿 상태를 확인하고 있습니다",
    description: "최신 검수 상태와 발송 가능 여부를 다시 확인하고 있습니다."
  },
  {
    label: "알림톡 재발송을 요청하고 있습니다",
    description: "발송 결과를 저장한 뒤 문서 목록으로 돌아갑니다."
  }
]);

function statusClass(status) {
  if (status === "signed") return "signed";
  if (status === "failed") return "failed";
  return "pending";
}

function statusLabel(status) {
  if (status === "signed") return "완료";
  if (status === "failed") return "실패";
  return "대기";
}

function bizgoIndicator(status) {
  return status === "sent"
    ? { label: "✅", className: "success" }
    : { label: "❌", className: "failed" };
}

function parseKeyword(searchParams, key = "keyword") {
  const value = searchParams?.[key];
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

export default async function AdminDocumentsPage({ searchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireAdminSession(),
    searchParams
  ]);
  const integratedMaster = isIntegratedMaster(session);
  const pageSize = parsePageSize(
    resolvedSearchParams,
    "pageSize",
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE
  );
  const currentPage = parsePage(resolvedSearchParams);
  const sortOptions = integratedMaster ? MASTER_SORT_OPTIONS : BRANCH_SORT_OPTIONS;
  const requestedSortKey = parseSort(resolvedSearchParams, "sort", "created_at");
  const sortKey = sortOptions.some((option) => option.value === requestedSortKey)
    ? requestedSortKey
    : "created_at";
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const keyword = parseKeyword(resolvedSearchParams);
  const requestedBranchId = Number(resolvedSearchParams.branchId);
  const branchId =
    integratedMaster && Number.isFinite(requestedBranchId) && requestedBranchId > 0
      ? requestedBranchId
      : session.branch_id || undefined;
  const [
    branchOptions,
    documentsPage,
    signedCount,
    pendingCount,
    failedCount
  ] = await Promise.all([
    listBranches({
      activeOnly: true,
      branchId: integratedMaster ? undefined : session.branch_id || undefined
    }),
    listDocumentsPage({
      branchId,
      searchTerm: keyword,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    }),
    countDocuments({ branchId, status: "signed", searchTerm: keyword }),
    countDocuments({ branchId, status: "pending", searchTerm: keyword }),
    countDocuments({ branchId, status: "failed", searchTerm: keyword })
  ]);
  const baseUrl = getBaseUrl();
  const pageMessage = String(resolvedSearchParams?.message || "").trim();
  const rawMessageType = String(resolvedSearchParams?.messageType || "").trim();
  const pageMessageType =
    rawMessageType === "success" || rawMessageType === "info" ? rawMessageType : "error";

  return (
    <div className="section-stack">
      {pageMessage ? <AlertOnMount message={pageMessage} type={pageMessageType} /> : null}
      <AdminSectionIntro
        eyebrow="Issued Documents"
        title="발급된 문서 목록"
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-primary">
            <div className="panel-kpi-row">
              <span className="metric-pill">전체 {documentsPage.totalCount}</span>
              <span className="metric-pill">완료 {signedCount}</span>
              <span className="metric-pill">대기 {pendingCount}</span>
              {failedCount > 0 ? <span className="metric-pill">실패 {failedCount}</span> : null}
            </div>
          </div>
          <div className="panel-actions">
            <DocumentsListControls
              currentBranchId={branchId ? String(branchId) : ""}
              branchOptions={branchOptions}
              branchDisabled={!integratedMaster}
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={sortOptions}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
            <ModalDialog
              title="서명 문서 발급"
              triggerLabel="문서 발급"
              size="wide"
              closeOnBackdrop={false}
            >
              <LazyAdminDocumentIssueForm
                branchLocked={!integratedMaster}
                branchId={session.branch_id}
                branchName={session.branch_name || ""}
              />
            </ModalDialog>
          </div>
        </div>
        {documentsPage.items.length === 0 ? (
          <div className="empty-state">발급된 문서가 없습니다.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>상태</th>
                    {integratedMaster ? <th>지점</th> : null}
                    <th>담당 디자이너</th>
                    <th>고객 이름</th>
                    <th>문서 제목</th>
                    <th>생성일</th>
                    <th>알림톡</th>
                    <th>열람</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsPage.items.map((document) => {
                    const bizgoIndicatorState = bizgoIndicator(document.bizgo_status);
                    const isExpired = isDocumentExpired(document);
                    const isEditDisabled = document.status === "signed" || isExpired;
                    const editDisabledReason =
                      document.status === "signed"
                        ? "서명 완료된 문서는 수정할 수 없습니다."
                        : "서명 기한이 지난 문서는 수정할 수 없습니다.";

                    return (
                      <tr key={document.id}>
                      <td>
                        <span className={`badge ${statusClass(document.status)}`}>
                          {statusLabel(document.status)}
                        </span>
                      </td>
                      {integratedMaster ? (
                        <td>
                          <div className="table-cell-title">{document.branch_name || "-"}</div>
                        </td>
                      ) : null}
                      <td>
                        <div className="table-cell-title">{document.designer_name || "-"}</div>
                      </td>
                      <td>
                        <div className="table-cell-title">{document.customer_name}</div>
                        <div className="table-cell-copy">
                          {maskKoreanPhoneNumber(document.recipient_phone)}
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-title">{document.document_title}</div>
                      </td>
                      <td>
                        <div className="table-cell-title">
                          {String(document.created_at).slice(0, 10)}
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-title">
                          <span className={`bizgo-indicator ${bizgoIndicatorState.className}`}>
                            {bizgoIndicatorState.label}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="inline-actions">
                          <a
                            className="button secondary table-action-button"
                            href={`${baseUrl}/s/${document.token}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            문서 보기
                          </a>
                          {!isEditDisabled ? (
                            <ModalDialog
                              title="발급 문서 수정"
                              triggerLabel="문서 수정"
                              triggerClassName="secondary table-action-button"
                              size="wide"
                              closeOnBackdrop={false}
                            >
                              <LazyAdminDocumentIssueForm
                                mode="edit"
                                documentToken={document.token}
                                branchLocked={!integratedMaster}
                                branchId={session.branch_id}
                                branchName={document.branch_name || session.branch_name || ""}
                              />
                            </ModalDialog>
                          ) : (
                            <span
                              className="table-action-tooltip"
                              data-tooltip={editDisabledReason}
                              title={editDisabledReason}
                              tabIndex={0}
                            >
                              <button
                                type="button"
                                className="secondary table-action-button"
                                disabled
                                aria-label={editDisabledReason}
                              >
                                문서 수정
                              </button>
                            </span>
                          )}
                          {document.notification_template_id ? (
                            <form
                              action="/api/admin/documents"
                              method="post"
                              data-loading-title="알림톡을 재발송하고 있습니다"
                              data-loading-copy="검수 상태 확인이 포함되면 평소보다 조금 더 걸릴 수 있습니다."
                              data-loading-steps={RESEND_LOADING_STEPS}
                              data-loading-step-interval="1200"
                              data-loading-toast-delay="320"
                              data-loading-card="hidden"
                            >
                              <input type="hidden" name="intent" value="resend" />
                              <input type="hidden" name="token" value={document.token} />
                              <button type="submit" className="secondary table-action-button">
                                재발송
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={documentsPage.currentPage}
              totalPages={documentsPage.totalPages}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
        <DocumentsSearchControls currentSearchTerm={keyword} />
      </section>
    </div>
  );
}
