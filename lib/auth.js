import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MASTER_KAKAO_ID } from "@/lib/config";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";
import {
  createSession,
  deleteSession,
  getAdminUserByKakaoId,
  getBranchById,
  getSession
} from "@/lib/db";

const SESSION_COOKIE = "admin_session";
const SESSION_PREVIEW_COOKIE = "admin_session_preview";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

const getSessionByToken = cache(async (sessionToken) => {
  if (!sessionToken) {
    return null;
  }

  return await getSession(sessionToken);
});

async function readCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await getSession(token);
  return await applySessionPreview(session, cookieStore);
}

const getCachedCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const session = await getSessionByToken(token || "");
  return await applySessionPreview(session, cookieStore);
});

function parsePreviewCookie(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const role = String(parsed?.role || "");
    const branchId = parsed?.branchId ? Number(parsed.branchId) : null;

    if (![INTEGRATED_MASTER_ROLE, BRANCH_MASTER_ROLE, ADMIN_ROLE].includes(role)) {
      return null;
    }

    if (role !== INTEGRATED_MASTER_ROLE && (!branchId || Number.isNaN(branchId))) {
      return null;
    }

    return {
      role,
      branchId: role === INTEGRATED_MASTER_ROLE ? null : branchId
    };
  } catch {
    return null;
  }
}

async function applySessionPreview(session, cookieStore) {
  if (!session) {
    return null;
  }

  const isSystemMaster = String(session.kakao_user_id) === String(MASTER_KAKAO_ID);

  if (!isSystemMaster) {
    return {
      ...session,
      is_system_master: false,
      is_preview_mode: false,
      original_role: session.role,
      original_branch_id: session.branch_id || null,
      original_branch_name: session.branch_name || null
    };
  }

  const preview = parsePreviewCookie(cookieStore.get(SESSION_PREVIEW_COOKIE)?.value);

  if (!preview || preview.role === INTEGRATED_MASTER_ROLE) {
    return {
      ...session,
      is_master: true,
      is_system_master: true,
      is_preview_mode: false,
      original_role: INTEGRATED_MASTER_ROLE,
      original_branch_id: null,
      original_branch_name: null
    };
  }

  const branch = preview.branchId ? await getBranchById(preview.branchId) : null;

  return {
    ...session,
    role: preview.role,
    branch_id: branch?.id || null,
    branch_name: branch?.name || null,
    is_master: false,
    is_system_master: true,
    is_preview_mode: true,
    original_role: INTEGRATED_MASTER_ROLE,
    original_branch_id: null,
    original_branch_name: null
  };
}

export function isIntegratedMaster(session) {
  return session?.role === INTEGRATED_MASTER_ROLE;
}

export function isBranchMaster(session) {
  return session?.role === BRANCH_MASTER_ROLE;
}

export function canManageBranchSettings(session) {
  return isIntegratedMaster(session) || isBranchMaster(session);
}

export async function getCurrentSession() {
  return await readCurrentSession();
}

export async function requireAdminSession() {
  const session = await getCachedCurrentSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireMasterSession() {
  const session = await requireAdminSession();

  if (!session.is_master) {
    redirect("/admin");
  }

  return session;
}

export async function getRouteSession() {
  return await getCurrentSession();
}

export async function canAccessAdmin(kakaoUserId) {
  if (String(kakaoUserId) === String(MASTER_KAKAO_ID)) {
    return {
      allowed: true,
      isMaster: true,
      role: INTEGRATED_MASTER_ROLE,
      branchId: null,
      branchName: null
    };
  }

  const adminUser = await getAdminUserByKakaoId(String(kakaoUserId));

  if (!adminUser) {
    return { allowed: false, isMaster: false, role: null, branchId: null, branchName: null };
  }

  return {
    allowed: true,
    isMaster: adminUser.role === INTEGRATED_MASTER_ROLE,
    role: adminUser.role,
    branchId: adminUser.branch_id || null,
    branchName: adminUser.branch_name || null
  };
}

export async function requireIntegratedMasterSession() {
  const session = await requireAdminSession();

  if (!isIntegratedMaster(session)) {
    redirect("/admin");
  }

  return session;
}

export async function requireBranchManagerSession() {
  const session = await requireAdminSession();

  if (!canManageBranchSettings(session)) {
    redirect("/admin");
  }

  return session;
}

export async function createAdminSession({ kakaoUserId, nickname, isMaster, role, branchId }) {
  const cookieStore = await cookies();
  const sessionToken = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await createSession({
    session_token: sessionToken,
    kakao_user_id: String(kakaoUserId),
    nickname: nickname || "",
    role,
    branch_id: branchId || null,
    is_master: isMaster,
    expires_at: expiresAt
  });

  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function setAdminSessionPreview({ role, branchId }) {
  const cookieStore = await cookies();

  if (role === INTEGRATED_MASTER_ROLE) {
    cookieStore.delete(SESSION_PREVIEW_COOKIE);
    return;
  }

  cookieStore.set(
    SESSION_PREVIEW_COOKIE,
    JSON.stringify({
      role,
      branchId: branchId || null
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  );
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SESSION_PREVIEW_COOKIE);
}
