import { headers } from "next/headers";
import {
  canManageBranchSettings,
  getRouteSession
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
    await createTemplate({
      branch_id: null,
      name: formData.get("name"),
      description: formData.get("description"),
      content: formData.get("content"),
      status: resolveTemplateStatus(formData)
    });
  }

  if (intent === "update") {
    const template = await getTemplateById(Number(formData.get("id")));

    if (!template) {
      return redirectBack(headerStore);
    }

    await updateTemplate(Number(formData.get("id")), {
      branch_id: null,
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

    await deleteTemplate(Number(formData.get("id")));
  }

  return redirectBack(headerStore);
}
