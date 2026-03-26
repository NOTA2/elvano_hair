import AdminDocumentIssueForm from "@/components/AdminDocumentIssueForm";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import AlertOnMount from "@/components/AlertOnMount";
import DocumentsListControls from "@/components/DocumentsListControls";
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
  listDesigners,
  listDocumentsPage,
  listNotificationTemplates,
  listTemplates
} from "@/lib/db";
import {
  parseDirection,
  parsePage,
  parsePageSize,
  parseSort
} from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const MASTER_SORT_OPTIONS = [
  { value: "created_at", label: "생성일" },
  { value: "signed_at", label: "서명일" },
  { value: "document_title", label: "문서 제목" },
  { value: "customer_name", label: "고객명" },
  { value: "branch_name", label: "지점" },
  { value: "status", label: "상태" }
];
const BRANCH_SORT_OPTIONS = MASTER_SORT_OPTIONS.filter((option) => option.value !== "branch_name");

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

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "-";
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return String(value || "-");
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
  const sortKey = parseSort(resolvedSearchParams, "sort", "created_at");
  const direction = parseDirection(resolvedSearchParams, "direction", "desc");
  const requestedBranchId = Number(resolvedSearchParams.branchId);
  const branchId =
    integratedMaster && Number.isFinite(requestedBranchId) && requestedBranchId > 0
      ? requestedBranchId
      : session.branch_id || undefined;
  const [
    allBranches,
    documentTemplates,
    notificationTemplates,
    designers,
    documentsPage,
    signedCount,
    pendingCount,
    failedCount
  ] = await Promise.all([
    listBranches({ activeOnly: true }),
    listTemplates({ activeOnly: true }),
    listNotificationTemplates({ activeOnly: true }),
    listDesigners({
      activeOnly: true,
      branchId: integratedMaster ? undefined : session.branch_id
    }),
    listDocumentsPage({
      branchId,
      page: currentPage,
      pageSize,
      sortKey,
      direction
    }),
    countDocuments({ branchId, status: "signed" }),
    countDocuments({ branchId, status: "pending" }),
    countDocuments({ branchId, status: "failed" })
  ]);
  const branches = integratedMaster
    ? allBranches
    : allBranches.filter((branch) => Number(branch.id) === Number(session.branch_id));
  const baseUrl = getBaseUrl();
  const pageMessage = String(resolvedSearchParams?.message || "").trim();

  return (
    <div className="section-stack">
      {pageMessage ? <AlertOnMount message={pageMessage} /> : null}
      <AdminSectionIntro
        eyebrow="Issued Documents"
        title="발급된 문서 목록"
        description="최근에 생성된 순서대로 표시합니다. 새 문서 발급은 추가 버튼을 눌러 모달에서 진행합니다."
      />
      <section className="panel">
        {pageMessage ? <p className="form-error">{pageMessage}</p> : null}
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
              branchOptions={allBranches}
              branchDisabled={!integratedMaster}
              currentPageSize={pageSize}
              currentSort={sortKey}
              currentDirection={direction}
              sortOptions={sortOptions}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
            <ModalDialog
              title="서명 문서 발급"
              description="문서 템플릿과 알림톡 템플릿을 각각 선택해 고객 안내문을 발급합니다. 필요하면 Bizgo 알림톡으로 바로 전송할 수 있습니다."
              triggerLabel="문서 발급"
              size="wide"
            >
              <AdminDocumentIssueForm
                branchLocked={!integratedMaster}
                branchId={session.branch_id}
                branchName={session.branch_name || ""}
                branches={branches}
                designers={designers}
                documentTemplates={documentTemplates}
                notificationTemplates={notificationTemplates}
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
                    <th>열람</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsPage.items.map((document) => (
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
                          {formatPhoneNumber(document.recipient_phone)}
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
                        <a
                          className="button secondary table-action-button"
                          href={`${baseUrl}/s/${document.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          문서 보기
                        </a>
                      </td>
                    </tr>
                  ))}
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
