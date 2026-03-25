"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

function getInitials(value) {
  return String(value || "?").trim().slice(0, 2).toUpperCase();
}

function formatBranchName(branchName) {
  if (!branchName) {
    return "";
  }

  return String(branchName).endsWith("점") ? String(branchName) : `${branchName}점`;
}

function profileRoleText(session) {
  const roleLabel = ROLE_LABELS[session.role] || "어드민";

  if (session.role === INTEGRATED_MASTER_ROLE) {
    return roleLabel;
  }

  const branchLabel = formatBranchName(session.branch_name);
  return branchLabel ? `${roleLabel} · ${branchLabel}` : roleLabel;
}

function NavIcon({ kind }) {
  if (kind === "dashboard") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h7V4H4v9Zm9 7h7v-5h-7v5Zm0-9h7V4h-7v7ZM4 20h7v-5H4v5Z" />
      </svg>
    );
  }

  if (kind === "branches") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h16v-2H4v2Zm2-4h4V4H6v12Zm8 0h4V9h-4v7Z" />
      </svg>
    );
  }

  if (kind === "templates") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h9l5 5v11H6V4Zm8 1.5V10h4.5" />
      </svg>
    );
  }

  if (kind === "alimtalk") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (kind === "designers") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 18a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      </svg>
    );
  }

  if (kind === "documents") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v13H7V3Zm3 12h6m-6-4h6m-6 8h4" />
      </svg>
    );
  }

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
    </svg>
  );
}

function getNavGroups(session) {
  const groups = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "대시보드", icon: "dashboard" },
        { href: "/admin/documents", label: "서명 문서", icon: "documents" }
      ]
    }
  ];

  if (
    session.role === INTEGRATED_MASTER_ROLE ||
    session.role === BRANCH_MASTER_ROLE
  ) {
    groups.push({
      label: "Manage",
      items: [
        { href: "/admin/branches", label: "지점 관리", icon: "branches" },
        { href: "/admin/designers", label: "디자이너 관리", icon: "designers" },
        { href: "/admin/templates", label: "문서 템플릿", icon: "templates" },
        { href: "/admin/notification-templates", label: "알림톡 템플릿", icon: "alimtalk" }
      ]
    });
  }

  if (
    session.role === INTEGRATED_MASTER_ROLE ||
    session.role === BRANCH_MASTER_ROLE
  ) {
    groups.push({
      label: "Access",
      items: [{ href: "/admin/admin-users", label: "권한 관리", icon: "users" }]
    });
  }

  return groups;
}

export default function AdminNav({ session }) {
  const pathname = usePathname();
  const navGroups = getNavGroups(session);
  const identity = session.nickname || session.kakao_user_id;

  return (
    <div className="admin-nav">
      <div className="admin-nav-inner">
        <div className="admin-profile">
          <div className="admin-avatar">{getInitials(identity)}</div>
          <div className="admin-profile-copy">
            <div className="admin-brand-line">Elvano Admin</div>
            <h2 className="admin-profile-name">{identity}</h2>
            <p className="admin-profile-role">{profileRoleText(session)}</p>
          </div>
        </div>

        <div className="admin-nav-groups">
          {navGroups.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <div className="admin-nav-label">{group.label}</div>
              <div className="admin-nav-list">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-link ${pathname === item.href ? "active" : ""}`}
                  >
                    <NavIcon kind={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <form action="/api/auth/logout" method="post" className="admin-sidebar-actions">
          <button className="secondary admin-logout-button" type="submit">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
