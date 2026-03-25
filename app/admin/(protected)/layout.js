import AdminNav from "@/components/AdminNav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }) {
  const session = await requireAdminSession();

  return (
    <main className="page-shell admin-shell">
      <div className="admin-layout admin-workbench">
        <aside className="admin-sidebar">
          <AdminNav session={session} />
        </aside>
        <section className="admin-main">
          <div className="admin-main-inner">
            <div className="admin-header">
              <div className="admin-header-copy">
                <div className="admin-header-eyebrow">Elvano Hair Operations</div>
                <h1 className="admin-header-title">고객 안내문 운영</h1>
              </div>
            </div>
            <div className="admin-content">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
