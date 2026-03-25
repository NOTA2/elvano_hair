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

function hasBizgoConfig(template) {
  return Boolean(
    template.bizgo_template_code &&
      template.bizgo_sender_key &&
      template.bizgo_message
  );
}

export default async function AdminTemplatesPage() {
  const session = await requireBranchManagerSession();
  const branchId = session.role === BRANCH_MASTER_ROLE ? session.branch_id : undefined;
  const templates = await listTemplates({ branchId });
  const branches = await listBranches({ activeOnly: true, branchId });
  const activeCount = templates.filter((template) => template.is_active).length;
  const bizgoConnectedCount = templates.filter(hasBizgoConfig).length;

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Template Studio</div>
            <h2 className="panel-title">템플릿 등록</h2>
            <p className="panel-copy">
              안내문 본문과 Bizgo 메시지를 같이 관리합니다. 치환값은 문서 발급 시점에
              실제 고객 정보로 반영됩니다.
            </p>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">전체 {templates.length}</span>
            <span className="metric-pill">활성 {activeCount}</span>
            <span className="metric-pill">Bizgo 연결 {bizgoConnectedCount}</span>
          </div>
        </div>

        <div className="chip-row">
          <span className="status-chip soft">{`{{branch_name}}`}</span>
          <span className="status-chip soft">{`{{document_title}}`}</span>
          <span className="status-chip soft">{`{{date}}`}</span>
          <span className="status-chip soft">{`{{customer_name}}`}</span>
          <span className="status-chip soft">{`{{phone_last4}}`}</span>
          <span className="status-chip soft">{`{{designer_name}}`}</span>
          <span className="status-chip soft">{`{{document_url}}`}</span>
        </div>

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
          <div className="form-actions admin-form-actions">
            <button type="submit">템플릿 저장</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Template Library</div>
            <h2 className="panel-title">등록된 템플릿</h2>
          </div>
        </div>
        {templates.length === 0 ? (
          <div className="empty-state">등록된 템플릿이 없습니다.</div>
        ) : (
          <div className="stack-list">
            {templates.map((template) => (
              <div key={template.id} className="record-card">
                <div className="record-head">
                  <div>
                    <div className="record-title">{template.name}</div>
                    <div className="record-meta">
                      {template.branch_name || "-"} · {template.description || "설명 없음"}
                    </div>
                  </div>
                  <div className="chip-row">
                    <span className={`status-chip ${template.is_active ? "positive" : "neutral"}`}>
                      {template.is_active ? "사용 중" : "중지"}
                    </span>
                    <span className={`status-chip ${hasBizgoConfig(template) ? "brand" : "soft"}`}>
                      {hasBizgoConfig(template) ? "Bizgo 연결" : "Bizgo 미설정"}
                    </span>
                  </div>
                </div>
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
                      <input
                        name="description"
                        defaultValue={template.description || ""}
                      />
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
                  <div className="form-actions admin-form-actions">
                    <button type="submit">수정 저장</button>
                  </div>
                </form>
                <form action="/api/admin/templates" method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={template.id} />
                  <button type="submit" className="danger">
                    삭제
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
