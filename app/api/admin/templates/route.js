import { headers } from "next/headers";
import {
  canManageBranchSettings,
  getRouteSession,
  isBranchMaster
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  updateTemplate
} from "@/lib/db";

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/templates", 302);
}

function resolveTemplateStatus(formData) {
  const status = String(formData.get("status") || "");

  if (status === "active" || status === "inactive" || status === "deleted") {
    return status;
  }

  return formData.get("is_active") === "1" ? "active" : "inactive";
}

export async function POST(request) {
  const session = await getRouteSession();
  if (!session || !canManageBranchSettings(session)) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }
  const headerStore = await headers();
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const resolvedBranchId = isBranchMaster(session)
      ? session.branch_id
      : Number(formData.get("branch_id"));

    if (!resolvedBranchId) {
      return redirectBack(headerStore);
    }

    await createTemplate({
      branch_id: resolvedBranchId,
      name: formData.get("name"),
      description: formData.get("description"),
      content: formData.get("content"),
      status: resolveTemplateStatus(formData)
    });
  }

  if (intent === "update") {
    const resolvedBranchId = isBranchMaster(session)
      ? session.branch_id
      : Number(formData.get("branch_id"));

    if (!resolvedBranchId) {
      return redirectBack(headerStore);
    }

    const template = await getTemplateById(Number(formData.get("id")));

    if (!template) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(template.branch_id) !== Number(session.branch_id)) {
      return redirectBack(headerStore);
    }

    await updateTemplate(Number(formData.get("id")), {
      branch_id: resolvedBranchId,
      name: formData.get("name"),
      description: formData.get("description"),
      content: formData.get("content"),
      status: resolveTemplateStatus(formData)
    });
  }

  if (intent === "delete") {
    const template = await getTemplateById(Number(formData.get("id")));

    if (!template) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(template.branch_id) !== Number(session.branch_id)) {
      return redirectBack(headerStore);
    }

    await deleteTemplate(Number(formData.get("id")));
  }

  return redirectBack(headerStore);
}
