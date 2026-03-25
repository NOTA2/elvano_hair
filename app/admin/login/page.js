import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

function KakaoSymbol() {
  return (
    <svg
      className="kakao-login-symbol"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3C6.48 3 2 6.62 2 11.05C2 13.85 3.82 16.32 6.58 17.73L5.46 21L9.08 18.9C10.01 19.1 10.99 19.2 12 19.2C17.52 19.2 22 15.58 22 11.05C22 6.62 17.52 3 12 3Z"
        fill="#000000"
      />
    </svg>
  );
}

export default async function AdminLoginPage({ searchParams }) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/admin");
  }

  const errorMessage =
    searchParams?.error === "pending_approval"
      ? "로그인 시도는 저장되었습니다. 통합 마스터가 계정을 확인한 뒤 권한을 추가할 수 있습니다."
      : "";

  return (
    <main className="login-shell admin-login-shell">
      <div className="login-layout">
        <div className="login-showcase hero-card">
          <div className="admin-header-eyebrow">Elvano Hair Admin</div>
          <h1 className="login-showcase-title">지점 운영과 전자서명 흐름을 하나로 묶는 관리자 화면</h1>
          <p className="hero-copy">
            지점별 템플릿, 디자이너, 권한, 고객 서명 문서를 한 화면에서 운영할 수 있도록
            설계된 관리자 전용 진입점입니다.
          </p>
          <div className="login-feature-grid">
            <div className="stat-card">
              <span className="stat-label">권한 모델</span>
              <div className="table-cell-title">통합 마스터 / 지점 마스터 / 일반 어드민</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">승인 프로세스</span>
              <div className="table-cell-title">로그인 시도 저장 후 마스터 승인</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">문서 보안</span>
              <div className="table-cell-title">휴대폰 뒷자리 확인 후 서명</div>
            </div>
          </div>
        </div>

        <div className="login-card hero-card">
          <div className="brand-kicker">Admin Login</div>
          <h2 className="login-card-title">카카오톡 로그인</h2>
          <p className="muted">
            마스터가 허용한 관리자만 접근할 수 있습니다. 허용되지 않은 계정도 로그인
            시도 이력에 저장되어 이후 권한 부여가 가능합니다.
          </p>
          {errorMessage ? <p className="login-error">{errorMessage}</p> : null}
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Link className="kakao-login-button" href="/api/auth/kakao/start">
              <KakaoSymbol />
              <span>카카오 로그인</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
