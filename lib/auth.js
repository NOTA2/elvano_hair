import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MASTER_KAKAO_ID } from "@/lib/config";
import {
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";
import {
  createSession,
  deleteSession,
  getAdminUserByKakaoId,
  getSession
} from "@/lib/db";

const SESSION_COOKIE = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return await getSession(token);
}

export async function requireAdminSession() {
  const session = await getCurrentSession();

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

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
}
