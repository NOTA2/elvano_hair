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
  const resolvedSearchParams = await searchParams;

  if (session) {
    redirect("/admin");
  }

  const errorMessage =
    resolvedSearchParams?.error === "pending_approval"
      ? "로그인 시도는 저장되었습니다. 통합 마스터가 계정을 확인한 뒤 권한을 추가할 수 있습니다."
      : "";

  return (
    <main className="login-shell admin-login-shell">
      <div className="login-card hero-card login-card-standalone">
        <div className="brand-kicker">Admin Login</div>
        <h2 className="login-card-title">카카오톡 로그인</h2>
        <p className="muted">
          허용된 관리자만 접근할 수 있습니다.
        </p>
        {errorMessage ? <p className="login-error">{errorMessage}</p> : null}
        <div className="form-actions" style={{ marginTop: 24 }}>
          <Link className="kakao-login-button" href="/api/auth/kakao/start">
            <KakaoSymbol />
            <span>카카오 로그인</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
