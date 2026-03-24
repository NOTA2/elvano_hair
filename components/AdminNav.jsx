"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

function getNavItems(session) {
  const items = [{ href: "/admin", label: "대시보드" }];

  if (
    session.role === INTEGRATED_MASTER_ROLE ||
    session.role === BRANCH_MASTER_ROLE
  ) {
    items.push({ href: "/admin/branches", label: "지점/디자이너" });
    items.push({ href: "/admin/templates", label: "문서 템플릿" });
  }

  items.push({ href: "/admin/documents", label: "서명 문서" });

  if (session.role === INTEGRATED_MASTER_ROLE) {
    items.push({ href: "/admin/admin-users", label: "권한 관리" });
  }

  return items;
}

export default function AdminNav({ session }) {
  const pathname = usePathname();
  const navItems = getNavItems(session);
  const roleLabel = ROLE_LABELS[session.role] || "어드민";

  return (
    <div className="admin-nav hero-card">
      <div className="brand-kicker">Admin</div>
      <h2 style={{ marginTop: 10 }}>{session.nickname || session.kakao_user_id}</h2>
      <p className="muted">
        {roleLabel}
        {session.branch_name ? ` · ${session.branch_name}` : ""}
      </p>
      <div style={{ marginTop: 20 }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <form action="/api/auth/logout" method="post" style={{ marginTop: 18 }}>
        <button className="secondary" type="submit">
          로그아웃
        </button>
      </form>
    </div>
  );
}
