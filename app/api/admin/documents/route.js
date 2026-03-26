import { headers } from "next/headers";
import {
  getRouteSession,
  isIntegratedMaster
} from "@/lib/auth";
import {
  resolveBizgoNotificationTemplateForSend,
  sendBizgoAlimtalk
} from "@/lib/bizgo";
import { getBaseUrl } from "@/lib/config";
import {
  createDocument,
  getBranchById,
  getDocumentByToken,
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

function redirectBack(headerStore, params = {}) {
  const url = new URL(headerStore.get("referer") || "/admin/documents", getBaseUrl());

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return Response.redirect(url.toString(), 302);
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

  if (intent === "resend") {
    const token = String(formData.get("token") || "").trim();
    const document = token ? await getDocumentByToken(token) : null;

    if (!document || !document.notification_template_id) {
      return redirectBack(headerStore, {
        message: "재발송할 알림톡 템플릿이 없습니다.",
        messageType: "error"
      });
    }

    if (!isIntegratedMaster(session) && Number(session.branch_id) !== Number(document.branch_id)) {
      return redirectBack(headerStore, {
        message: "해당 문서에 재발송할 권한이 없습니다.",
        messageType: "error"
      });
    }

    const branch = await getBranchById(document.branch_id);
    const notificationTemplate = await getNotificationTemplateById(
      document.notification_template_id
    );

    if (!branch || !notificationTemplate || !notificationTemplate.is_active || notificationTemplate.deleted_at) {
      return redirectBack(headerStore, {
        message: "재발송에 사용할 알림톡 템플릿을 찾을 수 없습니다.",
        messageType: "error"
      });
    }

    try {
      const resolvedNotificationTemplate = await resolveBizgoNotificationTemplateForSend(
        notificationTemplate
      );
      const bizgoResponse = await sendBizgoAlimtalk({
        notificationTemplate: resolvedNotificationTemplate,
        document: {
          ...document,
          branch_phone: branch.phone || ""
        }
      });

      await updateDocumentBizgo(document.token, bizgoResponse.status, bizgoResponse.response);
      return redirectBack(headerStore, {
        message: bizgoResponse.message,
        messageType: bizgoResponse.status === "sent" ? "success" : "info"
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알림톡 재발송 중 오류가 발생했습니다.";

      await updateDocumentBizgo(document.token, "failed", { message });
      return redirectBack(headerStore, { message, messageType: "error" });
    }
  }

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

  let resolvedNotificationTemplate = notificationTemplate;

  if (sendAlimtalk && notificationTemplate) {
    try {
      resolvedNotificationTemplate = await resolveBizgoNotificationTemplateForSend(
        notificationTemplate
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알림톡 템플릿 상태를 확인하지 못해 문서 발급을 중단했습니다.";

      return redirectBack(headerStore, { message, messageType: "error" });
    }
  }

  const token = createDocumentToken();
  const document = await createDocument({
    token,
    template_id: template.id,
    notification_template_id: resolvedNotificationTemplate?.id || null,
    branch_id: branch.id,
    branch_name: branch.name,
    designer_id: designer.id,
    document_title: values.document_title,
    document_date: values.date,
    customer_name: values.customer_name,
    phone_last4: values.phone_last4,
    recipient_phone: recipientPhone,
    designer_name: designer.name,
    notification_template_name: resolvedNotificationTemplate?.template_name || null,
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

  if (sendAlimtalk && resolvedNotificationTemplate) {
    try {
      const bizgoResponse = await sendBizgoAlimtalk({
        notificationTemplate: resolvedNotificationTemplate,
        document: {
          ...document,
          branch_phone: branch.phone || "",
          limit_date: values.limit_date
        }
      });
      await updateDocumentBizgo(document.token, bizgoResponse.status, bizgoResponse.response);
      return redirectBack(headerStore, {
        message: bizgoResponse.message,
        messageType: bizgoResponse.status === "sent" ? "success" : "info"
      });
    } catch (error) {
      await updateDocumentBizgo(document.token, "failed", { message: error.message });
      return redirectBack(headerStore, {
        message: error.message,
        messageType: "error"
      });
    }
  }

  return redirectBack(headerStore, { message: "", messageType: "" });
}
