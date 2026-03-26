import { getCurrentSession, setAdminSessionPreview } from "@/lib/auth";
import { getBaseUrl, MASTER_KAKAO_ID } from "@/lib/config";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";

function redirectToAdmin() {
  return Response.redirect(`${getBaseUrl()}/admin`, 302);
}

export async function POST(request) {
  const session = await getCurrentSession();

  if (!session || String(session.kakao_user_id) !== String(MASTER_KAKAO_ID)) {
    return redirectToAdmin();
  }

  const formData = await request.formData();
  const role = String(formData.get("preview_role") || "");
  const branchId = Number(formData.get("preview_branch_id") || 0);

  if (![INTEGRATED_MASTER_ROLE, BRANCH_MASTER_ROLE, ADMIN_ROLE].includes(role)) {
    return redirectToAdmin();
  }

  if (role !== INTEGRATED_MASTER_ROLE && (!branchId || Number.isNaN(branchId))) {
    return redirectToAdmin();
  }

  await setAdminSessionPreview({
    role,
    branchId: role === INTEGRATED_MASTER_ROLE ? null : branchId
  });

  return redirectToAdmin();
}
