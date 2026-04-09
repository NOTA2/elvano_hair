import { headers } from "next/headers";
import {
  getRouteSession,
  isIntegratedMaster
} from "@/lib/auth";
import { getBaseUrl, MASTER_KAKAO_ID } from "@/lib/config";
import {
  createAdminUser,
  deleteAdminUser,
  deleteSessionsByKakaoUserId,
  getAdminUserById,
  getAdminUserByKakaoId,
  getLoginAttemptByKakaoId
} from "@/lib/db";
import {
  ADMIN_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/admin-users", 302);
}

export async function POST(request) {
  const session = await getRouteSession();
  if (!session || !isIntegratedMaster(session)) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }
  const headerStore = await headers();
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const kakaoUserId = String(formData.get("kakao_user_id"));
    const role = String(formData.get("role") || ADMIN_ROLE);
    const requestedBranchId = formData.get("branch_id")
      ? Number(formData.get("branch_id"))
      : null;

    const allowedRoles = [INTEGRATED_MASTER_ROLE, ADMIN_ROLE];

    if (!allowedRoles.includes(role)) {
      return redirectBack(headerStore);
    }

    const branchId =
      role === INTEGRATED_MASTER_ROLE
        ? null
        : requestedBranchId;

    if (role !== INTEGRATED_MASTER_ROLE && !branchId) {
      return redirectBack(headerStore);
    }

    const existingAdminUser = await getAdminUserByKakaoId(kakaoUserId, {
      includeInactive: true
    });
    const loginAttempt = await getLoginAttemptByKakaoId(kakaoUserId);

    if (
      !existingAdminUser &&
      !loginAttempt &&
      String(kakaoUserId) !== String(MASTER_KAKAO_ID)
    ) {
      return redirectBack(headerStore);
    }

    await createAdminUser({
      kakao_user_id: kakaoUserId,
      nickname: formData.get("nickname"),
      memo: formData.get("memo"),
      role,
      branch_id: branchId,
      is_active: true
    });
  }

  if (intent === "delete") {
    const adminUser = await getAdminUserById(Number(formData.get("id")));

    if (!adminUser) {
      return redirectBack(headerStore);
    }

    await Promise.all([
      deleteAdminUser(adminUser.id),
      deleteSessionsByKakaoUserId(adminUser.kakao_user_id)
    ]);
  }

  return redirectBack(headerStore);
}
