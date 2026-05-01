import Link from "next/link";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import ActionTooltip from "@/components/ActionTooltip";
import AlertOnMount from "@/components/AlertOnMount";
import DocumentsListControls from "@/components/DocumentsListControls";
import DocumentsSearchControls from "@/components/DocumentsSearchControls";
import LazyAdminDocumentIssueForm from "@/components/LazyAdminDocumentIssueForm";
import ModalDialog from "@/components/ModalDialog";
import PaginationControls from "@/components/PaginationControls";
import { parseStatusFilters } from "@/components/StatusFilterChips";
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
import { extractBizgoMsgKey } from "@/lib/bizgo";
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
const STATUS_PARAM = "status";
const DOCUMENT_STATUS_OPTIONS = [
  { value: "signed", label: "완료" },
  { value: "pending", label: "대기" }
];
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
const BIZGO_STATUS_REFRESH_STEPS = JSON.stringify([
  {
    label: "발송 이력을 확인하고 있습니다",
    description: "문서에 저장된 Bizgo 발송 키를 기준으로 조회를 준비하고 있습니다."
  },
  {
    label: "Bizgo 실제 발송 상태를 조회하고 있습니다",
    description: "알림톡의 최종 발송 여부를 다시 확인하고 있습니다."
  },
  {
    label: "최신 상태를 문서 목록에 반영하고 있습니다",
    description: "확인된 결과를 저장한 뒤 현재 목록으로 돌아갑니다."
  }
]);
const PDF_DISABLED_TOOLTIP = "아직 서명이 완료되지 않아 PDF 생성이 불가합니다.";
const CREATED_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const CREATED_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true
});

function formatCreatedAt(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return {
      date: "-",
      time: ""
    };
  }

  return {
    date: CREATED_DATE_FORMATTER.format(date),
    time: CREATED_TIME_FORMATTER.format(date)
  };
}

function normalizeSearchParams(searchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          params.append(key, String(item));
        }
      });

      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

function isAllStatusFilterActive(selectedStatuses) {
  return (
    selectedStatuses.length === 0 ||
    DOCUMENT_STATUS_OPTIONS.every((option) => selectedStatuses.includes(option.value))
  );
}

function buildDocumentStatusHref({ searchParams, selectedStatuses, nextStatus, pageParam = "page" }) {
  const params = normalizeSearchParams(searchParams);
  params.delete(pageParam);

  if (nextStatus === "all") {
    params.delete(STATUS_PARAM);
    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  const isAllActive = isAllStatusFilterActive(selectedStatuses);
  const isCurrentlySelected =
    !isAllActive && selectedStatuses.length === 1 && selectedStatuses[0] === nextStatus;

  if (isCurrentlySelected) {
    params.delete(STATUS_PARAM);
  } else {
    params.set(STATUS_PARAM, nextStatus);
  }

  const query = params.toString();
  return query ? `?${query}` : "?";
}

function documentFilterChipClassName(isActive, extraClassName = "") {
  return `metric-pill status-filter-chip ${extraClassName} ${isActive ? "active" : ""}`.trim();
}

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

function getBizgoStatusPresentation(document) {
  const status = String(document?.bizgo_status || "").trim().toLowerCase();

  if (status === "sent") {
    return {
      label: "발송 완료",
      className: "positive"
    };
  }

  if (status === "requested") {
    return {
      label: "확인 중",
      className: "neutral"
    };
  }

  if (status === "failed") {
    return {
      label: "발송 실패",
      className: "negative"
    };
  }

  if (document?.notification_template_id) {
    return {
      label: "상태 확인",
      className: "soft"
    };
  }

  return {
    label: "미설정",
    className: "soft"
  };
}

function BizgoStatusAction({ document }) {
  const bizgoStatus = getBizgoStatusPresentation(document);
  const msgKey = extractBizgoMsgKey(document.bizgo_response);
  const isSent = String(document?.bizgo_status || "").trim().toLowerCase() === "sent";
  const canRefresh = Boolean(document.notification_template_id && msgKey);

  if (!document.notification_template_id) {
    return <span className={`status-chip ${bizgoStatus.className}`}>{bizgoStatus.label}</span>;
  }

  if (isSent) {
    return <span className={`status-chip ${bizgoStatus.className}`}>{bizgoStatus.label}</span>;
  }

  if (!canRefresh) {
    return (
      <ActionTooltip label="발송 이력 정보가 없어 알림톡 상태를 다시 확인할 수 없습니다.">
        <span className={`status-chip ${bizgoStatus.className}`}>{bizgoStatus.label}</span>
      </ActionTooltip>
    );
  }

  return (
    <ActionTooltip label="실제 알림톡 발송 상태 다시 확인">
      <form
        action="/api/admin/documents"
        method="post"
        data-loading-title="알림톡 발송 상태를 확인하고 있습니다"
        data-loading-copy="Bizgo에 저장된 실제 발송 결과를 다시 조회하고 있습니다."
        data-loading-steps={BIZGO_STATUS_REFRESH_STEPS}
        data-loading-step-interval="1100"
        data-loading-toast-delay="1400"
        data-loading-card="hidden"
      >
        <input type="hidden" name="intent" value="sync_bizgo_status" />
        <input type="hidden" name="token" value={document.token} />
        <button
          type="submit"
          className={`status-chip bizgo-status-chip-button ${bizgoStatus.className}`}
          aria-label={`알림톡 상태 다시 확인: ${bizgoStatus.label}`}
        >
          <span>{bizgoStatus.label}</span>
          <span className="bizgo-status-chip-refresh-mark" aria-hidden="true">
            ↻
          </span>
        </button>
      </form>
    </ActionTooltip>
  );
}

function pdfDownloadStatus(document) {
  if (document.status !== "signed") {
    return {
      icon: "📥",
      label: PDF_DISABLED_TOOLTIP,
      className: "neutral",
      disabled: true
    };
  }

  return {
    icon: "📥",
    label: "PDF 다운로드",
    className: "positive",
    href: `/api/admin/documents/${document.token}/pdf`,
    disabled: false
  };
}

function DrivePdfAction({ document }) {
  const status = pdfDownloadStatus(document);

  if (status.href && !status.disabled) {
    return (
      <ActionTooltip label={status.label}>
        <a
          className={`icon-action-button pdf-icon-action ${status.className}`}
          href={status.href}
          aria-label={status.label}
          download
        >
          {status.icon}
        </a>
      </ActionTooltip>
    );
  }

  return (
    <ActionTooltip label={status.label}>
      <button
        type="button"
        className={`icon-action-button pdf-icon-action ${status.className} is-disabled`}
        aria-label={status.label}
        disabled
      >
        {status.icon}
      </button>
    </ActionTooltip>
  );
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
  const statusFilters = parseStatusFilters({
    searchParams: resolvedSearchParams,
    param: STATUS_PARAM,
    options: DOCUMENT_STATUS_OPTIONS,
    defaultStatuses: []
  });
  const isAllStatusesActive = isAllStatusFilterActive(statusFilters);
  const activeStatus =
    !isAllStatusesActive && statusFilters.length === 1 ? statusFilters[0] : undefined;
  const requestedBranchId = Number(resolvedSearchParams.branchId);
  const branchId =
    integratedMaster && Number.isFinite(requestedBranchId) && requestedBranchId > 0
      ? requestedBranchId
      : session.branch_id || undefined;
  const [
    branchOptions,
    totalCount,
    documentsPage,
    signedCount,
    pendingCount,
    failedCount
  ] = await Promise.all([
    listBranches({
      activeOnly: true,
      branchId: integratedMaster ? undefined : session.branch_id || undefined
    }),
    countDocuments({ branchId, searchTerm: keyword }),
    listDocumentsPage({
      branchId,
      status: activeStatus,
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
      <section className="panel documents-panel">
        <div className="documents-toolbar">
          <div className="documents-toolbar-main">
            <div className="panel-kpi-row">
              <Link
                href={buildDocumentStatusHref({
                  searchParams: resolvedSearchParams,
                  selectedStatuses: statusFilters,
                  nextStatus: "all"
                })}
                className={documentFilterChipClassName(isAllStatusesActive)}
                aria-pressed={isAllStatusesActive}
              >
                전체 {totalCount}
              </Link>
              <Link
                href={buildDocumentStatusHref({
                  searchParams: resolvedSearchParams,
                  selectedStatuses: statusFilters,
                  nextStatus: "signed"
                })}
                className={documentFilterChipClassName(
                  !isAllStatusesActive && statusFilters.includes("signed")
                )}
                aria-pressed={!isAllStatusesActive && statusFilters.includes("signed")}
              >
                완료 {signedCount}
              </Link>
              <Link
                href={buildDocumentStatusHref({
                  searchParams: resolvedSearchParams,
                  selectedStatuses: statusFilters,
                  nextStatus: "pending"
                })}
                className={documentFilterChipClassName(
                  !isAllStatusesActive && statusFilters.includes("pending")
                )}
                aria-pressed={!isAllStatusesActive && statusFilters.includes("pending")}
              >
                대기 {pendingCount}
              </Link>
              {failedCount > 0 ? <span className="metric-pill soft">실패 {failedCount}</span> : null}
            </div>
          </div>
          <div className="documents-toolbar-side">
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
          </div>
          <div className="documents-toolbar-actions">
            <ModalDialog
              title="서명 문서 발급"
              triggerLabel="문서 발급"
              triggerClassName="documents-issue-button"
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
        <div className="documents-search-row">
          <DocumentsSearchControls currentSearchTerm={keyword} />
        </div>
        {documentsPage.items.length === 0 ? (
          <div className="empty-state">발급된 문서가 없습니다.</div>
        ) : (
          <>
            <div className="documents-mobile-list">
              {documentsPage.items.map((document) => {
                const isExpired = isDocumentExpired(document);
                const isEditDisabled = document.status === "signed" || isExpired;
                const createdAt = formatCreatedAt(document.created_at);
                const editDisabledReason =
                  document.status === "signed"
                    ? "서명 완료된 문서는 수정할 수 없습니다."
                    : "서명 기한이 지난 문서는 수정할 수 없습니다.";

                return (
                  <article key={document.id} className="document-mobile-card">
                    <div className="document-mobile-card-head">
                      <div className="document-mobile-head-copy">
                        <div className="document-mobile-title-row">
                          <div className="document-mobile-title">{document.document_title}</div>
                          <div className="document-mobile-status-row">
                            <span className={`badge ${statusClass(document.status)}`}>
                              {statusLabel(document.status)}
                            </span>
                            <BizgoStatusAction document={document} />
                            {isExpired ? (
                              <span className="status-chip negative">기한 만료</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="document-mobile-customer-line">
                          <span className="document-mobile-summary-strong">
                            {document.customer_name} 고객님
                          </span>
                          <span className="document-mobile-customer-phone">
                            {maskKoreanPhoneNumber(document.recipient_phone)}
                          </span>
                        </div>
                        <div className="document-mobile-meta-line">
                          {integratedMaster ? <span>{document.branch_name || "-"}</span> : null}
                          <span>{document.designer_name || "-"}</span>
                          <span>{createdAt.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="document-mobile-actions">
                      <ActionTooltip label="문서 보기">
                        <a
                          className="icon-action-button document-mobile-view-button"
                          href={`${baseUrl}/s/${document.token}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="문서 보기"
                        >
                          📄
                        </a>
                      </ActionTooltip>
                      <DrivePdfAction document={document} />
                      {!isEditDisabled ? (
                        <ActionTooltip label="문서 수정">
                          <ModalDialog
                            title="발급 문서 수정"
                            triggerLabel="✏️"
                            triggerAriaLabel="문서 수정"
                            triggerTitle="문서 수정"
                            triggerClassName="secondary icon-action-button document-mobile-action-button"
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
                        </ActionTooltip>
                      ) : (
                        <ActionTooltip label={editDisabledReason}>
                          <button
                            type="button"
                            className="secondary icon-action-button document-mobile-action-button"
                            disabled
                            aria-label={editDisabledReason}
                          >
                            ✏️
                          </button>
                        </ActionTooltip>
                      )}
                      {document.notification_template_id ? (
                        <ActionTooltip label="알림톡 재발송">
                          <form
                            action="/api/admin/documents"
                            method="post"
                            data-loading-title="알림톡을 재발송하고 있습니다"
                            data-loading-copy="검수 상태 확인이 포함되면 평소보다 조금 더 걸릴 수 있습니다."
                            data-loading-steps={RESEND_LOADING_STEPS}
                            data-loading-step-interval="1200"
                            data-loading-toast-delay="1800"
                            data-loading-card="hidden"
                          >
                            <input type="hidden" name="intent" value="resend" />
                            <input type="hidden" name="token" value={document.token} />
                            <button
                              type="submit"
                              className="secondary icon-action-button document-mobile-action-button"
                              aria-label="알림톡 재발송"
                            >
                              💬
                            </button>
                          </form>
                        </ActionTooltip>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="table-wrap documents-desktop-table">
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
                    <th>PDF</th>
                    <th>열람</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsPage.items.map((document) => {
                    const isExpired = isDocumentExpired(document);
                    const isEditDisabled = document.status === "signed" || isExpired;
                    const createdAt = formatCreatedAt(document.created_at);
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
                          {createdAt.date}
                        </div>
                        {createdAt.time ? (
                          <div className="table-cell-copy">{createdAt.time}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="documents-bizgo-cell">
                          <BizgoStatusAction document={document} />
                        </div>
                      </td>
                      <td>
                        <DrivePdfAction document={document} />
                      </td>
                      <td>
                        <div className="inline-actions">
                          <ActionTooltip label="문서 보기">
                            <a
                              className="secondary icon-action-button table-action-button"
                              href={`${baseUrl}/s/${document.token}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="문서 보기"
                            >
                              📄
                            </a>
                          </ActionTooltip>
                          {!isEditDisabled ? (
                            <ActionTooltip label="문서 수정">
                              <ModalDialog
                                title="발급 문서 수정"
                                triggerLabel="✏️"
                                triggerAriaLabel="문서 수정"
                                triggerTitle="문서 수정"
                                triggerClassName="secondary icon-action-button table-action-button"
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
                            </ActionTooltip>
                          ) : (
                            <ActionTooltip label={editDisabledReason}>
                              <button
                                type="button"
                                className="secondary icon-action-button table-action-button"
                                disabled
                                aria-label={editDisabledReason}
                              >
                                ✏️
                              </button>
                            </ActionTooltip>
                          )}
                          {document.notification_template_id ? (
                            <ActionTooltip label="알림톡 재발송">
                              <form
                                action="/api/admin/documents"
                                method="post"
                                data-loading-title="알림톡을 재발송하고 있습니다"
                                data-loading-copy="검수 상태 확인이 포함되면 평소보다 조금 더 걸릴 수 있습니다."
                                data-loading-steps={RESEND_LOADING_STEPS}
                                data-loading-step-interval="1200"
                                data-loading-toast-delay="1800"
                                data-loading-card="hidden"
                              >
                                <input type="hidden" name="intent" value="resend" />
                                <input type="hidden" name="token" value={document.token} />
                                <button
                                  type="submit"
                                  className="secondary icon-action-button table-action-button"
                                  aria-label="알림톡 재발송"
                                >
                                  💬
                                </button>
                              </form>
                            </ActionTooltip>
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
      </section>
    </div>
  );
}
