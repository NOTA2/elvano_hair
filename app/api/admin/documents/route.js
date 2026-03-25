import { headers } from "next/headers";
import {
  getRouteSession,
  isBranchMaster
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

function redirectBack(headerStore) {
  return Response.redirect(headerStore.get("referer") || "/admin/documents", 302);
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

  const resolvedBranchId = isBranchMaster(session)
    ? Number(session.branch_id)
    : Number(formData.get("branch_id"));

  if (!resolvedBranchId) {
    return redirectBack(headerStore);
  }

  const branch = await getBranchById(resolvedBranchId);
  const template = await getTemplateById(Number(formData.get("template_id")));
  const notificationTemplate = await getNotificationTemplateById(
    Number(formData.get("notification_template_id"))
  );
  const designer = await getDesignerById(Number(formData.get("designer_id")));

  if (!branch || !template || !notificationTemplate || !designer) {
    return redirectBack(headerStore);
  }

  if (!template.is_active || template.deleted_at) {
    return redirectBack(headerStore);
  }

  if (!notificationTemplate.is_active || notificationTemplate.deleted_at) {
    return redirectBack(headerStore);
  }

  if (Number(designer.branch_id) !== Number(resolvedBranchId)) {
    return redirectBack(headerStore);
  }

  if (isBranchMaster(session) && Number(session.branch_id) !== Number(resolvedBranchId)) {
    return redirectBack(headerStore);
  }

  const values = buildDocumentValues({
    branch_name: branch.name,
    document_title: formData.get("document_title"),
    document_date: formData.get("document_date"),
    customer_name: formData.get("customer_name"),
    phone_last4: formData.get("phone_last4"),
    recipient_phone: formData.get("recipient_phone"),
    designer_name: designer.name
  });

  const token = createDocumentToken();
  const document = await createDocument({
    token,
    template_id: template.id,
    notification_template_id: notificationTemplate.id,
    branch_id: branch.id,
    branch_name: branch.name,
    designer_id: designer.id,
    document_title: values.document_title,
    document_date: values.date,
    customer_name: values.customer_name,
    phone_last4: values.phone_last4,
    recipient_phone: formData.get("recipient_phone"),
    designer_name: designer.name,
    notification_template_name: notificationTemplate.template_name,
    rendered_content: fillTemplate(template.content, {
      ...values,
      document_url: `${getBaseUrl()}/s/${token}`
    })
  });

  if (formData.get("send_alimtalk") === "1") {
    try {
      const bizgoResponse = await sendBizgoAlimtalk({
        notificationTemplate,
        document
      });
      await updateDocumentBizgo(document.token, "sent", bizgoResponse);
    } catch (error) {
      await updateDocumentBizgo(document.token, "failed", { message: error.message });
    }
  }

  return redirectBack(headerStore);
}
