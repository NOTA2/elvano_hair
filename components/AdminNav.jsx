"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SelectField from "@/components/SelectField";
import {
  ADMIN_ROLE,
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

  if (kind === "approval") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M4.5 19a4.5 4.5 0 0 1 9 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </svg>
    );
  }

  if (kind === "manual") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2H20v17H8.5A2.5 2.5 0 0 0 6 21.5V4.5Z" />
        <path d="M6 4.5A2.5 2.5 0 0 0 3.5 2H2v17h1.5A2.5 2.5 0 0 1 6 21.5" />
        <path d="M9 7h7" />
        <path d="M9 11h7" />
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
      items: [
        { href: "/admin/access-requests", label: "권한 부여", icon: "approval" },
        { href: "/admin/admin-users", label: "권한 관리", icon: "users" }
      ]
    });
  }

  groups.push({
    label: "Guide",
    items: [{ href: "/admin/manual", label: "메뉴얼", icon: "manual" }]
  });

  return groups;
}

export default function AdminNav({ session, branchOptions = [] }) {
  const pathname = usePathname();
  const navGroups = getNavGroups(session);
  const identity = session.nickname || session.kakao_user_id;
  const [previewRole, setPreviewRole] = useState(session.role || INTEGRATED_MASTER_ROLE);
  const [previewBranchId, setPreviewBranchId] = useState(
    session.branch_id ? String(session.branch_id) : String(branchOptions[0]?.id || "")
  );
  const needsBranchSelection =
    previewRole === BRANCH_MASTER_ROLE || previewRole === ADMIN_ROLE;

  useEffect(() => {
    setPreviewRole(session.role || INTEGRATED_MASTER_ROLE);
    setPreviewBranchId(
      session.branch_id ? String(session.branch_id) : String(branchOptions[0]?.id || "")
    );
  }, [session.role, session.branch_id, branchOptions]);

  return (
    <div className="admin-nav">
      <div className="admin-nav-inner">
        <div className="admin-profile">
          <div className="admin-avatar">{getInitials(identity)}</div>
          <div className="admin-profile-copy">
            <div className="admin-brand-line">Elvano Admin</div>
            <h2 className="admin-profile-name">{identity}</h2>
            <p className="admin-profile-role">{profileRoleText(session)}</p>
            {session.is_system_master ? (
              <form action="/api/auth/preview-role" method="post" className="admin-preview-form">
                <div className="admin-preview-label">권한 미리보기</div>
                <SelectField
                  name="preview_role"
                  value={previewRole}
                  onChange={(event) => {
                    const nextRole = event.target.value;
                    setPreviewRole(nextRole);

                    if (
                      nextRole !== INTEGRATED_MASTER_ROLE &&
                      !previewBranchId &&
                      branchOptions[0]?.id
                    ) {
                      setPreviewBranchId(String(branchOptions[0].id));
                    }
                  }}
                  wrapperClassName="admin-preview-select"
                >
                  <option value={INTEGRATED_MASTER_ROLE}>통합 마스터</option>
                  <option value={BRANCH_MASTER_ROLE}>지점 마스터</option>
                  <option value={ADMIN_ROLE}>일반 어드민</option>
                </SelectField>
                {needsBranchSelection ? (
                  <SelectField
                    name="preview_branch_id"
                    value={previewBranchId}
                    onChange={(event) => {
                      setPreviewBranchId(event.target.value);
                    }}
                    wrapperClassName="admin-preview-select"
                    placeholder="지점 선택"
                  >
                    {branchOptions.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </SelectField>
                ) : (
                  <input type="hidden" name="preview_branch_id" value="" />
                )}
                <button type="submit" className="secondary admin-preview-button">
                  적용
                </button>
              </form>
            ) : null}
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
