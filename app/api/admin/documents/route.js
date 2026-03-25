import { headers } from "next/headers";
import {
  getRouteSession,
  isIntegratedMaster
} from "@/lib/auth";
import { sendBizgoAlimtalk } from "@/lib/bizgo";
import { getBaseUrl } from "@/lib/config";
import {
  createDocument,
  getBranchById,
  getDesignerById,
  getNotificationTemplateById,
  getTemplateById,
  updateDocumentBizgo
} from "@/lib/db";
import { buildDocumentValues, createDocumentToken, fillTemplate } from "@/lib/documents";
import {
  normalizeTemplateContent,
  sanitizeTemplateContent,
  toHtmlTemplateValues
} from "@/lib/templateContent";

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/documents", 302);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const headerStore = await headers();
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "create") {
    return redirectBack(headerStore);
  }

  const resolvedBranchId =
    !isIntegratedMaster(session) && session.branch_id
      ? Number(session.branch_id)
      : Number(formData.get("branch_id"));

  if (!resolvedBranchId) {
    return redirectBack(headerStore);
  }

  const branch = await getBranchById(resolvedBranchId);
  const template = await getTemplateById(Number(formData.get("template_id")));
  const designer = await getDesignerById(Number(formData.get("designer_id")));
  const sendAlimtalk = formData.get("send_alimtalk") === "1";
  const notificationTemplateId = Number(formData.get("notification_template_id"));
  const notificationTemplate = notificationTemplateId
    ? await getNotificationTemplateById(notificationTemplateId)
    : null;

  if (!branch || !template || !designer) {
    return redirectBack(headerStore);
  }

  if (sendAlimtalk && !notificationTemplate) {
    return redirectBack(headerStore);
  }

  if (!template.is_active || template.deleted_at) {
    return redirectBack(headerStore);
  }

  if (
    notificationTemplate &&
    (!notificationTemplate.is_active || notificationTemplate.deleted_at)
  ) {
    return redirectBack(headerStore);
  }

  if (Number(designer.branch_id) !== Number(resolvedBranchId)) {
    return redirectBack(headerStore);
  }

  if (!isIntegratedMaster(session) && Number(session.branch_id) !== Number(resolvedBranchId)) {
    return redirectBack(headerStore);
  }

  const recipientPhone = normalizePhone(formData.get("recipient_phone"));

  if (recipientPhone.length < 8) {
    return redirectBack(headerStore);
  }

  const phoneLast4 = recipientPhone.slice(-4);
  const content = normalizeTemplateContent(
    sanitizeTemplateContent(formData.get("content"))
  ) || template.content;
  const issuedAt = new Date();
  const values = buildDocumentValues({
    issued_at: issuedAt,
    branch_name: branch.name,
    branch_phone: branch.phone,
    document_title: formData.get("document_title") || template.document_title || template.name,
    document_date: formData.get("document_date"),
    customer_name: formData.get("customer_name"),
    phone_last4: phoneLast4,
    recipient_phone: recipientPhone,
    designer_name: designer.name
  });

  const token = createDocumentToken();
  const document = await createDocument({
    token,
    template_id: template.id,
    notification_template_id: notificationTemplate?.id || null,
    branch_id: branch.id,
    branch_name: branch.name,
    designer_id: designer.id,
    document_title: values.document_title,
    document_date: values.date,
    customer_name: values.customer_name,
    phone_last4: values.phone_last4,
    recipient_phone: recipientPhone,
    designer_name: designer.name,
    notification_template_name: notificationTemplate?.template_name || null,
    rendered_content: normalizeTemplateContent(
      fillTemplate(
        content,
        toHtmlTemplateValues({
          ...values,
          document_url: `${getBaseUrl()}/s/${token}`
        })
      )
    )
  });

  if (sendAlimtalk && notificationTemplate) {
    try {
      const bizgoResponse = await sendBizgoAlimtalk({
        notificationTemplate,
        document: {
          ...document,
          branch_phone: branch.phone || "",
          limit_date: values.limit_date
        }
      });
      await updateDocumentBizgo(document.token, "sent", bizgoResponse);
    } catch (error) {
      await updateDocumentBizgo(document.token, "failed", { message: error.message });
    }
  }

  return redirectBack(headerStore);
}
