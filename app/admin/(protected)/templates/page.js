import { requireBranchManagerSession } from "@/lib/auth";
import { listBranches, listTemplates } from "@/lib/db";
import { BRANCH_MASTER_ROLE } from "@/lib/roles";

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
      <select name="branch_id" defaultValue={defaultBranchId || ""} required>
        <option value="">선택</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminTemplatesPage() {
  const session = await requireBranchManagerSession();
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const templates = await listTemplates({ branchId });
  const branches = await listBranches({ activeOnly: true, branchId });

  return (
    <div>
      <section className="panel">
        <h2>템플릿 등록</h2>
        <p className="muted">
          본문에서는 <span className="code">{`{{branch_name}}`}</span>,{" "}
          <span className="code">{`{{document_title}}`}</span>,{" "}
          <span className="code">{`{{date}}`}</span>,{" "}
          <span className="code">{`{{customer_name}}`}</span>,{" "}
          <span className="code">{`{{phone_last4}}`}</span>,{" "}
          <span className="code">{`{{designer_name}}`}</span>,{" "}
          <span className="code">{`{{document_url}}`}</span> 치환값을 사용할 수 있습니다.
        </p>
        <form action="/api/admin/templates" method="post">
          <input type="hidden" name="intent" value="create" />
          <div className="form-grid">
            {branchField(session, branches)}
            <label className="field">
              <span className="field-label">템플릿명</span>
              <input name="name" required />
            </label>
            <label className="field">
              <span className="field-label">설명</span>
              <input name="description" />
            </label>
            <label className="field">
              <span className="field-label">Bizgo 템플릿 코드</span>
              <input name="bizgo_template_code" />
            </label>
            <label className="field">
              <span className="field-label">Bizgo 발신 프로필 키</span>
              <input name="bizgo_sender_key" />
            </label>
            <label className="field-full">
              <span className="field-label">안내문 본문</span>
              <textarea name="content" required />
            </label>
            <label className="field-full">
              <span className="field-label">알림톡 메시지</span>
              <textarea name="bizgo_message" />
            </label>
            <label className="field">
              <span className="field-label">알림톡 버튼명</span>
              <input name="bizgo_button_name" placeholder="서명하기" />
            </label>
            <label className="field">
              <span className="field-label">사용 여부</span>
              <select name="is_active" defaultValue="1">
                <option value="1">사용</option>
                <option value="0">중지</option>
              </select>
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="submit">템플릿 저장</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>등록된 템플릿</h2>
        {templates.length === 0 ? (
          <div className="empty-state">등록된 템플릿이 없습니다.</div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="panel" style={{ padding: 18 }}>
              <form action="/api/admin/templates" method="post">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={template.id} />
                <div className="form-grid">
                  {branchField(session, branches, template.branch_id)}
                  <label className="field">
                    <span className="field-label">템플릿명</span>
                    <input name="name" defaultValue={template.name} required />
                  </label>
                  <label className="field">
                    <span className="field-label">설명</span>
                    <input name="description" defaultValue={template.description || ""} />
                  </label>
                  <label className="field">
                    <span className="field-label">Bizgo 템플릿 코드</span>
                    <input
                      name="bizgo_template_code"
                      defaultValue={template.bizgo_template_code || ""}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Bizgo 발신키</span>
                    <input
                      name="bizgo_sender_key"
                      defaultValue={template.bizgo_sender_key || ""}
                    />
                  </label>
                  <label className="field-full">
                    <span className="field-label">본문</span>
                    <textarea name="content" defaultValue={template.content} required />
                  </label>
                  <label className="field-full">
                    <span className="field-label">알림톡 메시지</span>
                    <textarea
                      name="bizgo_message"
                      defaultValue={template.bizgo_message || ""}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">알림톡 버튼명</span>
                    <input
                      name="bizgo_button_name"
                      defaultValue={template.bizgo_button_name || ""}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">사용 여부</span>
                    <select name="is_active" defaultValue={template.is_active ? "1" : "0"}>
                      <option value="1">사용</option>
                      <option value="0">중지</option>
                    </select>
                  </label>
                </div>
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button type="submit">수정 저장</button>
                </div>
              </form>
              <div className="muted" style={{ marginTop: 8 }}>
                지점: {template.branch_name || "-"}
              </div>
              <form action="/api/admin/templates" method="post" style={{ marginTop: 8 }}>
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={template.id} />
                <button type="submit" className="danger">
                  삭제
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
