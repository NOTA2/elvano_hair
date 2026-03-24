import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <div className="hero-card">
          <div className="brand-kicker">Elvano Hair</div>
          <h1 className="hero-title">고객 전자서명 운영 도구</h1>
          <p className="hero-copy">
            공개 링크로 고객 서명을 받고, 관리자 영역에서 문서 템플릿과 발송 이력을 관리합니다.
          </p>
          <div className="form-actions" style={{ marginTop: 18 }}>
            <Link className="button" href="/admin/login">
              관리자 로그인
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

