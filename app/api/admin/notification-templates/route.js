import { headers } from "next/headers";
import {
  canManageBranchSettings,
  getRouteSession,
  isBranchMaster
} from "@/lib/auth";
import {
  cancelBizgoTemplateApproval,
  createBizgoNotificationTemplate,
  deleteBizgoNotificationTemplate,
  getBizgoNotificationTemplate,
  mapBizgoTemplateToLocal,
  requestBizgoTemplateApproval,
  updateBizgoNotificationTemplate
} from "@/lib/bizgo";
import { getBaseUrl } from "@/lib/config";
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplateById,
  updateNotificationTemplate
} from "@/lib/db";

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/notification-templates", 302);
}

function normalizeString(formData, name) {
  const value = formData.get(name);
  return value === null ? null : String(value).trim();
}

function resolveBranchId(formData, session) {
  return isBranchMaster(session) ? Number(session.branch_id) : Number(formData.get("branch_id"));
}

function buildTemplateInput(formData, branchId, { includeDeletedStatus = false } = {}) {
  const status = String(formData.get("status") || "active");

  return {
    branch_id: branchId,
    description: normalizeString(formData, "description"),
    sender_key: normalizeString(formData, "sender_key"),
    sender_key_type: normalizeString(formData, "sender_key_type") || "S",
    template_code: normalizeString(formData, "template_code"),
    template_name: normalizeString(formData, "template_name"),
    template_message_type: normalizeString(formData, "template_message_type") || "BA",
    template_emphasize_type:
      normalizeString(formData, "template_emphasize_type") || "NONE",
    category_code: normalizeString(formData, "category_code"),
    security_flag: formData.get("security_flag") === "1",
    message: normalizeString(formData, "message"),
    title: normalizeString(formData, "title"),
    subtitle: normalizeString(formData, "subtitle"),
    header: normalizeString(formData, "header"),
    button_name: normalizeString(formData, "button_name"),
    button_type: normalizeString(formData, "button_type"),
    button_url_mobile: normalizeString(formData, "button_url_mobile"),
    button_url_pc: normalizeString(formData, "button_url_pc"),
    button_scheme_ios: normalizeString(formData, "button_scheme_ios"),
    button_scheme_android: normalizeString(formData, "button_scheme_android"),
    button_tel_number: normalizeString(formData, "button_tel_number"),
    status:
      includeDeletedStatus && status === "deleted"
        ? "deleted"
        : status === "inactive"
          ? "inactive"
          : "active"
  };
}

async function syncRemoteState(templateId, currentTemplate) {
  const remoteTemplate = await getBizgoNotificationTemplate({
    senderKey: currentTemplate.sender_key,
    templateCode: currentTemplate.template_code
  });

  if (!remoteTemplate) {
    return null;
  }

  return await updateNotificationTemplate(templateId, {
    branch_id: currentTemplate.branch_id,
    description: currentTemplate.description,
    status: currentTemplate.status,
    ...mapBizgoTemplateToLocal(remoteTemplate)
  });
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session || !canManageBranchSettings(session)) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const headerStore = await headers();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "create") {
    const branchId = resolveBranchId(formData, session);

    if (!branchId) {
      return redirectBack(headerStore);
    }

    const input = buildTemplateInput(formData, branchId);
    const remoteTemplate = await createBizgoNotificationTemplate(input);

    await createNotificationTemplate({
      ...input,
      ...mapBizgoTemplateToLocal(remoteTemplate)
    });

    return redirectBack(headerStore);
  }

  const templateId = Number(formData.get("id"));
  const currentTemplate = await getNotificationTemplateById(templateId);

  if (!currentTemplate) {
    return redirectBack(headerStore);
  }

  if (isBranchMaster(session) && Number(currentTemplate.branch_id) !== Number(session.branch_id)) {
    return redirectBack(headerStore);
  }

  if (intent === "update") {
    const branchId = resolveBranchId(formData, session);

    if (!branchId) {
      return redirectBack(headerStore);
    }

    const input = buildTemplateInput(formData, branchId);
    const remoteTemplate = await updateBizgoNotificationTemplate(input);

    await updateNotificationTemplate(templateId, {
      ...input,
      ...mapBizgoTemplateToLocal(remoteTemplate)
    });

    return redirectBack(headerStore);
  }

  if (intent === "sync") {
    await syncRemoteState(templateId, currentTemplate);
    return redirectBack(headerStore);
  }

  if (intent === "request_approval") {
    await requestBizgoTemplateApproval({
      senderKey: currentTemplate.sender_key,
      senderKeyType: currentTemplate.sender_key_type,
      templateCode: currentTemplate.template_code,
      comment: normalizeString(formData, "comment")
    });
    await syncRemoteState(templateId, currentTemplate);
    return redirectBack(headerStore);
  }

  if (intent === "cancel_approval") {
    await cancelBizgoTemplateApproval({
      senderKey: currentTemplate.sender_key,
      templateCode: currentTemplate.template_code
    });
    await syncRemoteState(templateId, currentTemplate);
    return redirectBack(headerStore);
  }

  if (intent === "delete") {
    await deleteBizgoNotificationTemplate({
      senderKey: currentTemplate.sender_key,
      templateCode: currentTemplate.template_code
    });
    await deleteNotificationTemplate(templateId);
  }

  return redirectBack(headerStore);
}
