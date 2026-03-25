import AdminNav from "@/components/AdminNav";
import { requireAdminSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

export default async function ProtectedAdminLayout({ children }) {
  const session = await requireAdminSession();
  const roleLabel = ROLE_LABELS[session.role] || "어드민";

  return (
    <main className="page-shell admin-shell">
      <div className="admin-layout admin-workbench">
        <aside className="admin-sidebar">
          <AdminNav session={session} />
        </aside>
        <section className="admin-main">
          <div className="admin-header">
            <div className="admin-header-copy">
              <div className="admin-header-eyebrow">Elvano Hair Operations</div>
              <h1 className="admin-header-title">고객 안내문 운영 센터</h1>
              <p className="admin-header-body">
                문서 템플릿, 알림톡 템플릿, 지점 운영, 고객 서명 문서를 한 흐름으로
                관리하는 내부 운영 공간입니다.
              </p>
            </div>
            <div className="admin-header-meta">
              <div className="admin-session-card">
                <span className="field-label">현재 세션</span>
                <strong>{session.nickname || session.kakao_user_id}</strong>
                <p className="muted">
                  {session.branch_name
                    ? `${session.branch_name} 지점 기준으로 접근 중`
                    : "전체 지점 기준으로 접근 중"}
                </p>
              </div>
              <div className="chip-row">
                <span className="status-chip brand">{roleLabel}</span>
                <span className="status-chip soft">
                  {session.is_master ? "Integrated Master" : "Verified Session"}
                </span>
              </div>
            </div>
          </div>
          <div className="admin-content">{children}</div>
        </section>
      </div>
    </main>
  );
}
