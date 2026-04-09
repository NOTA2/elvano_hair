export const INTEGRATED_MASTER_ROLE = "integrated_master";
export const BRANCH_MASTER_ROLE = "branch_master";
export const ADMIN_ROLE = "admin";

export const ROLE_LABELS = {
  [INTEGRATED_MASTER_ROLE]: "통합 마스터",
  [BRANCH_MASTER_ROLE]: "일반 어드민",
  [ADMIN_ROLE]: "일반 어드민"
};

export function normalizeAdminRole(role) {
  const normalizedRole = String(role || "").trim();

  if (normalizedRole === INTEGRATED_MASTER_ROLE) {
    return INTEGRATED_MASTER_ROLE;
  }

  if (normalizedRole === BRANCH_MASTER_ROLE || normalizedRole === ADMIN_ROLE) {
    return ADMIN_ROLE;
  }

  return normalizedRole;
}
