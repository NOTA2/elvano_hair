import { headers } from "next/headers";
import {
  getRouteSession,
  isBranchMaster,
  isIntegratedMaster
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  createDesigner,
  deleteDesigner,
  getDesignerById,
  updateDesigner
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
  const resolvedBranchId = isBranchMaster(session)
    ? Number(session.branch_id)
    : Number(formData.get("branch_id"));

  if (intent === "create") {
    if (!resolvedBranchId) {
      return redirectBack(headerStore);
    }

    await createDesigner({
      branch_id: resolvedBranchId,
      name: formData.get("name"),
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });
  }

  if (intent === "update") {
    const designer = await getDesignerById(Number(formData.get("id")));

    if (!designer) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(designer.branch_id) !== Number(session.branch_id)) {
      return redirectBack(headerStore);
    }

    await updateDesigner(Number(formData.get("id")), {
      branch_id: resolvedBranchId || designer.branch_id,
      name: formData.get("name"),
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });
  }

  if (intent === "delete") {
    const designer = await getDesignerById(Number(formData.get("id")));

    if (!designer) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(designer.branch_id) !== Number(session.branch_id)) {
      return redirectBack(headerStore);
    }

    await deleteDesigner(Number(formData.get("id")));
  }

  return redirectBack(headerStore);
}
