import { isBranchMaster, requireAdminSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  listBranches,
  listDesigners,
  listDocuments,
  listTemplates
} from "@/lib/db";

function statusClass(status) {
  if (status === "signed") return "signed";
  if (status === "failed") return "failed";
  return "pending";
}

export default async function AdminDocumentsPage() {
  const session = await requireAdminSession();
  const branchId = isBranchMaster(session) ? session.branch_id : undefined;
  const branches = await listBranches({ activeOnly: true, branchId });
  const templates = await listTemplates({ activeOnly: true, branchId });
  const designers = await listDesigners({ activeOnly: true, branchId });
  const documents = await listDocuments({ branchId });
  const baseUrl = getBaseUrl();

  return (
    <div>
      <section className="panel">
        <h2>서명 문서 발급</h2>
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
                <select name="branch_id" required>
                  <option value="">선택</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span className="field-label">템플릿</span>
              <select name="template_id" required>
                <option value="">선택</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.branch_name ? `${template.branch_name} · ` : ""}
                    {template.name}
                  </option>
                ))}
              </select>
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
              <select name="designer_id" required>
                <option value="">선택</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.branch_name ? `${designer.branch_name} · ` : ""}
                    {designer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">알림톡 즉시 발송</span>
              <select name="send_alimtalk" defaultValue="0">
                <option value="0">아니오</option>
                <option value="1">예</option>
              </select>
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="submit">문서 생성</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>발급된 문서 목록</h2>
        {documents.length === 0 ? (
          <div className="empty-state">발급된 문서가 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>문서</th>
                  <th>고객</th>
                  <th>링크</th>
                  <th>알림톡</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <span className={`badge ${statusClass(document.status)}`}>
                        {document.status}
                      </span>
                    </td>
                    <td>
                      <strong>{document.branch_name}</strong>
                      <div>{document.document_title}</div>
                      <div className="muted">{document.template_name}</div>
                      <div className="muted">{document.designer_name}</div>
                    </td>
                    <td>
                      <strong>{document.customer_name}</strong>
                      <div className="muted">{document.phone_last4}</div>
                    </td>
                    <td>
                      <a
                        href={`${baseUrl}/s/${document.token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {`${baseUrl}/s/${document.token}`}
                      </a>
                    </td>
                    <td>
                      <div>{document.bizgo_status || "-"}</div>
                      <div className="muted">{document.recipient_phone || "-"}</div>
                    </td>
                    <td>
                      <div>{String(document.created_at).slice(0, 10)}</div>
                      <div className="muted">
                        {document.signed_at ? `서명 ${String(document.signed_at).slice(0, 10)}` : ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
