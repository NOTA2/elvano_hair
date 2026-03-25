import { headers } from "next/headers";
import {
  getRouteSession,
  isBranchMaster,
  isIntegratedMaster
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  createBranch,
  deleteBranch,
  getBranchById,
  updateBranch
} from "@/lib/db";

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/branches", 302);
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session || (!isIntegratedMaster(session) && !isBranchMaster(session))) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const headerStore = await headers();
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    if (!isIntegratedMaster(session)) {
      return redirectBack(headerStore);
    }

    await createBranch({
      name: formData.get("name"),
      phone: formData.get("phone"),
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });
  }

  if (intent === "update") {
    const branchId = Number(formData.get("id"));
    const branch = await getBranchById(branchId);

    if (!branch) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(session.branch_id) !== branchId) {
      return redirectBack(headerStore);
    }

    await updateBranch(branchId, {
      name: formData.get("name"),
      phone: formData.get("phone"),
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });
  }

  if (intent === "delete") {
    if (!isIntegratedMaster(session)) {
      return redirectBack(headerStore);
    }

    await deleteBranch(Number(formData.get("id")));
  }

  return redirectBack(headerStore);
}
