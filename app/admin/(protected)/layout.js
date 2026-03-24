import AdminNav from "@/components/AdminNav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }) {
  const session = await requireAdminSession();

  return (
    <main className="page-shell">
      <div className="container">
        <div className="hero-card">
          <div className="brand-kicker">Protected Admin</div>
          <h1 className="hero-title" style={{ fontSize: "44px" }}>
            관리자 문서 센터
          </h1>
          <p className="hero-copy">
            카카오 로그인 후 허용된 관리자만 접근할 수 있습니다.
          </p>
        </div>
        <div className="admin-grid">
          <AdminNav session={session} />
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
