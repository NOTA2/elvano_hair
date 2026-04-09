"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SelectField from "@/components/SelectField";
import {
  ADMIN_ROLE,
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

function getRoleEmoji(role) {
  if (role === INTEGRATED_MASTER_ROLE) {
    return "👑";
  }

  return "🧑‍💼";
}

const NAV_ICON_MAP = {
  branches: "🏬",
  templates: "📄",
  alimtalk: "💬",
  designers: "💇",
  documents: "🧾",
  approval: "✅",
  manual: "📚",
  users: "👥"
};

function NavIcon({ kind }) {
  return (
    <span className="nav-icon" aria-hidden="true">
      {NAV_ICON_MAP[kind] || "👤"}
    </span>
  );
}

function getNavGroups(session) {
  const groups = [
    {
      label: "Overview",
      items: [{ href: "/admin/documents", label: "서명 문서", icon: "documents" }]
    }
  ];

  if (session.role === INTEGRATED_MASTER_ROLE) {
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

  if (session.role === INTEGRATED_MASTER_ROLE) {
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

function getCurrentPageLabel(navGroups, pathname) {
  const navItems = navGroups
    .flatMap((group) => group.items)
    .sort((left, right) => right.href.length - left.href.length);

  const currentItem = navItems.find((item) => {
    if (item.href === "/admin") {
      return pathname === item.href;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  return currentItem?.label || "고객 안내문 운영";
}

export default function AdminNav({ session, branchOptions = [] }) {
  const pathname = usePathname();
  const navGroups = getNavGroups(session);
  const currentPageLabel = getCurrentPageLabel(navGroups, pathname);
  const identity = session.nickname || session.kakao_user_id;
  const roleEmoji = getRoleEmoji(session.role);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRole, setPreviewRole] = useState(session.role || INTEGRATED_MASTER_ROLE);
  const [previewBranchId, setPreviewBranchId] = useState(
    session.branch_id ? String(session.branch_id) : String(branchOptions[0]?.id || "")
  );
  const needsBranchSelection = previewRole === ADMIN_ROLE;

  useEffect(() => {
    setIsPreviewOpen(false);
    setPreviewRole(session.role || INTEGRATED_MASTER_ROLE);
    setPreviewBranchId(
      session.branch_id ? String(session.branch_id) : String(branchOptions[0]?.id || "")
    );
  }, [session.role, session.branch_id, branchOptions]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavOpen]);

  return (
    <div className={`admin-nav ${isMobileNavOpen ? "mobile-open" : ""}`}>
      <div className="admin-mobile-gnb">
        <div className="admin-mobile-gnb-copy">
          <div className="admin-mobile-gnb-brand">Elvano Admin</div>
          <div className="admin-mobile-gnb-title">{currentPageLabel}</div>
        </div>
        <button
          type="button"
          className={`secondary admin-mobile-gnb-toggle ${isMobileNavOpen ? "open" : ""}`}
          aria-expanded={isMobileNavOpen}
          aria-controls="admin-nav-drawer"
          aria-label={isMobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => {
            setIsMobileNavOpen((current) => !current);
          }}
        >
          <span className="sr-only">{isMobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}</span>
          <span className="admin-mobile-gnb-toggle-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
      <button
        type="button"
        className="admin-nav-backdrop"
        aria-label="메뉴 닫기"
        onClick={() => {
          setIsMobileNavOpen(false);
        }}
      />
      <div className="admin-nav-drawer" id="admin-nav-drawer">
        <div className="admin-nav-inner">
          <div className="admin-profile">
            <div className="admin-avatar-shell">
              <div className="admin-avatar">{getInitials(identity)}</div>
            </div>
            <div className="admin-profile-copy">
              <div className="admin-brand-line">Elvano Admin</div>
              <h2 className="admin-profile-name">{identity}</h2>
              <div className="admin-profile-row">
                <div className="admin-role-pill">
                  <span className="admin-role-emoji" aria-hidden="true">
                    {roleEmoji}
                  </span>
                  <span>{profileRoleText(session)}</span>
                </div>
                {session.is_system_master ? (
                  <button
                    type="button"
                    className="secondary admin-preview-toggle"
                    aria-expanded={isPreviewOpen}
                    aria-controls="admin-preview-panel"
                    aria-label={isPreviewOpen ? "권한 미리보기 닫기" : "권한 미리보기 열기"}
                    title={isPreviewOpen ? "권한 미리보기 닫기" : "권한 미리보기 열기"}
                    onClick={() => {
                      setIsPreviewOpen((current) => !current);
                    }}
                  >
                    <span aria-hidden="true">✨</span>
                  </button>
                ) : null}
              </div>
              {session.is_system_master ? (
                <form
                  action="/api/auth/preview-role"
                  method="post"
                  className={`admin-preview-form ${isPreviewOpen ? "open" : ""}`}
                  id="admin-preview-panel"
                  hidden={!isPreviewOpen}
                >
                  <div className="admin-preview-label">권한 미리보기</div>
                  <div className="admin-preview-controls">
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
                    <button type="submit" className="admin-preview-button">
                      적용
                    </button>
                  </div>
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
                      onClick={() => {
                        setIsMobileNavOpen(false);
                      }}
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
    </div>
  );
}
