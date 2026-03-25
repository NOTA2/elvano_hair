import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell home-shell">
      <div className="home-workbench">
        <aside className="home-rail">
          <div className="home-brand">
            <div className="home-brand-mark">E</div>
            <div>
              <div className="home-brand-name">elvano</div>
              <div className="home-brand-sub">signature desk</div>
            </div>
          </div>

          <nav className="home-nav">
            <div className="home-nav-item active">Home</div>
            <div className="home-nav-item">Documents</div>
            <div className="home-nav-item">Templates</div>
            <div className="home-nav-item">Branches</div>
          </nav>

          <div className="home-rail-card">
            <div className="field-label">Admin Access</div>
            <strong>허용된 관리자만 진입</strong>
            <p className="muted">
              카카오 로그인 이후 통합 마스터 승인 기반으로 관리자 권한이 부여됩니다.
            </p>
            <Link className="button home-rail-button" href="/admin/login">
              관리자 로그인
            </Link>
          </div>
        </aside>

        <section className="home-main">
          <div className="home-main-hero">
            <div>
              <div className="home-eyebrow">Elvano Hair Workflow</div>
              <h1 className="home-title">고객 안내문과 전자서명을 한 화면의 흐름으로 운영합니다</h1>
              <p className="home-copy">
                지점별 디자이너와 템플릿을 관리하고, 고객에게 링크를 보내고, 서명 완료된
                문서를 일관된 운영 화면에서 추적할 수 있습니다.
              </p>
            </div>
            <div className="home-date-pill">Operations Board</div>
          </div>

          <div className="home-stats-grid">
            <div className="home-stat-card">
              <span className="stat-label">Flow</span>
              <div className="stat-value">1</div>
              <div className="stat-meta">템플릿 등록부터 서명 완료까지 하나의 시스템</div>
            </div>
            <div className="home-stat-card">
              <span className="stat-label">Access</span>
              <div className="stat-value">3</div>
              <div className="stat-meta">통합 마스터, 지점 마스터, 일반 어드민 권한 구분</div>
            </div>
            <div className="home-stat-card">
              <span className="stat-label">Verification</span>
              <div className="stat-value">4</div>
              <div className="stat-meta">고객은 휴대폰 뒷자리 4자리 확인 후 서명</div>
            </div>
          </div>

          <div className="home-content-grid">
            <section className="home-panel">
              <div className="panel-head">
                <div>
                  <div className="panel-eyebrow">Main Features</div>
                  <h2 className="panel-title">관리 화면에서 할 수 있는 일</h2>
                </div>
              </div>
              <div className="mini-list">
                <div className="mini-list-item">
                  <div className="mini-list-title">문서 템플릿 관리</div>
                  <div className="mini-list-copy">
                    지점별 안내문 본문, Bizgo 알림톡 메시지, 버튼 구성을 관리합니다.
                  </div>
                </div>
                <div className="mini-list-item">
                  <div className="mini-list-title">서명 문서 발급</div>
                  <div className="mini-list-copy">
                    고객 정보와 담당 디자이너를 기준으로 문서를 만들고, 즉시 링크를
                    발송할 수 있습니다.
                  </div>
                </div>
                <div className="mini-list-item">
                  <div className="mini-list-title">권한 승인</div>
                  <div className="mini-list-copy">
                    로그인 시도 계정을 저장하고, 통합 마스터가 검토 후 권한을 부여합니다.
                  </div>
                </div>
              </div>
            </section>

            <aside className="home-side-panel">
              <div className="home-profile-card">
                <div className="home-profile-avatar">EH</div>
                <div className="home-profile-name">Elvano Hair</div>
                <div className="home-profile-handle">@signature-center</div>
                <div className="chip-row" style={{ justifyContent: "center", marginTop: 18 }}>
                  <span className="status-chip brand">Admin Ready</span>
                  <span className="status-chip soft">Supabase</span>
                </div>
              </div>

              <div className="home-activity-card">
                <div className="panel-eyebrow">Overview</div>
                <div className="mini-list">
                  <div className="mini-list-item">
                    <div className="mini-list-title">템플릿, 지점, 디자이너 관리</div>
                    <div className="mini-list-copy">
                      지점 구조와 템플릿 자산을 한 흐름에서 유지합니다.
                    </div>
                  </div>
                  <div className="mini-list-item">
                    <div className="mini-list-title">알림톡 + 공개 링크</div>
                    <div className="mini-list-copy">
                      Bizgo로 링크를 발송하고 고객이 모바일에서 바로 서명할 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
