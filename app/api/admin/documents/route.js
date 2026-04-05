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
  updateDocument,
  updateDocumentBizgo
} from "@/lib/db";
import { buildDocumentValues, createDocumentToken, fillTemplate } from "@/lib/documents";
import {
  normalizeTemplateContent,
  sanitizeTemplateContent,
  toHtmlTemplateValues
} from "@/lib/templateContent";
import {
  isValidKoreanMobilePhone,
  normalizeKoreanMobilePhone
} from "@/lib/phone";

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

function toErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const [headerStore, formData] = await Promise.all([headers(), request.formData()]);
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

    const [branch, notificationTemplate] = await Promise.all([
      getBranchById(document.branch_id),
      getNotificationTemplateById(document.notification_template_id)
    ]);

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
      const message = toErrorMessage(error, "알림톡 재발송 중 오류가 발생했습니다.");

      await updateDocumentBizgo(document.token, "failed", { message });
      return redirectBack(headerStore, { message, messageType: "error" });
    }
  }

  if (intent === "update") {
    const token = String(formData.get("token") || "").trim();
    const document = token ? await getDocumentByToken(token) : null;

    if (!document) {
      return redirectBack(headerStore, {
        message: "수정할 문서를 찾을 수 없습니다.",
        messageType: "error"
      });
    }

    if (!isIntegratedMaster(session) && Number(session.branch_id) !== Number(document.branch_id)) {
      return redirectBack(headerStore, {
        message: "해당 문서를 수정할 권한이 없습니다.",
        messageType: "error"
      });
    }

    if (document.status === "signed") {
      return redirectBack(headerStore, {
        message: "서명이 완료된 문서는 수정할 수 없습니다.",
        messageType: "error"
      });
    }

    const resolvedBranchId =
      !isIntegratedMaster(session) && session.branch_id
        ? Number(session.branch_id)
        : Number(formData.get("branch_id"));

    if (!resolvedBranchId) {
      return redirectBack(headerStore, {
        message: "지점 정보를 확인할 수 없습니다.",
        messageType: "error"
      });
    }

    const designerId = Number(formData.get("designer_id"));
    const requestedNotificationTemplateId = Number(formData.get("notification_template_id"));
    const notificationTemplateId =
      Number.isFinite(requestedNotificationTemplateId) && requestedNotificationTemplateId > 0
        ? requestedNotificationTemplateId
        : null;
    const [branch, designer, notificationTemplate] = await Promise.all([
      getBranchById(resolvedBranchId),
      getDesignerById(designerId),
      notificationTemplateId ? getNotificationTemplateById(notificationTemplateId) : Promise.resolve(null)
    ]);

    if (!branch || !designer) {
      return redirectBack(headerStore, {
        message: "문서 수정에 필요한 지점 또는 담당자 정보를 찾을 수 없습니다.",
        messageType: "error"
      });
    }

    if (
      notificationTemplate &&
      (!notificationTemplate.is_active || notificationTemplate.deleted_at)
    ) {
      return redirectBack(headerStore, {
        message: "사용할 알림톡 템플릿을 찾을 수 없습니다.",
        messageType: "error"
      });
    }

    if (Number(designer.branch_id) !== Number(resolvedBranchId)) {
      return redirectBack(headerStore, {
        message: "선택한 지점과 담당 디자이너가 맞지 않습니다.",
        messageType: "error"
      });
    }

    const rawRecipientPhone = formData.get("recipient_phone");

    if (!isValidKoreanMobilePhone(rawRecipientPhone)) {
      return redirectBack(headerStore, {
        message: "한국 휴대폰번호를 정확히 입력해야 합니다.",
        messageType: "error"
      });
    }

    const recipientPhone = normalizeKoreanMobilePhone(rawRecipientPhone);

    const renderedContent = normalizeTemplateContent(
      sanitizeTemplateContent(formData.get("content"))
    ) || document.rendered_content;

    await updateDocument(token, {
      template_id: document.template_id,
      notification_template_id: notificationTemplate?.id || null,
      branch_id: branch.id,
      branch_name: branch.name,
      designer_id: designer.id,
      document_title: String(formData.get("document_title") || document.document_title || "").trim(),
      document_date: formData.get("document_date") || document.document_date,
      customer_name: String(formData.get("customer_name") || document.customer_name || "").trim(),
      phone_last4: recipientPhone.slice(-4),
      recipient_phone: recipientPhone,
      designer_name: designer.name,
      notification_template_name: notificationTemplate?.template_name || null,
      rendered_content: renderedContent
    });

    return redirectBack(headerStore, {
      message: "문서를 수정했습니다.",
      messageType: "success"
    });
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

  const templateId = Number(formData.get("template_id"));
  const designerId = Number(formData.get("designer_id"));
  const requestedNotificationTemplateId = Number(formData.get("notification_template_id"));
  const notificationTemplateId =
    Number.isFinite(requestedNotificationTemplateId) && requestedNotificationTemplateId > 0
      ? requestedNotificationTemplateId
      : null;
  const [branch, template, designer, notificationTemplate] = await Promise.all([
    getBranchById(resolvedBranchId),
    getTemplateById(templateId),
    getDesignerById(designerId),
    notificationTemplateId
      ? getNotificationTemplateById(notificationTemplateId)
      : Promise.resolve(null)
  ]);

  if (!branch || !template || !designer) {
    return redirectBack(headerStore);
  }

  if (!notificationTemplateId || !notificationTemplate) {
    return redirectBack(headerStore, {
      message: "알림톡 템플릿을 선택해야 합니다.",
      messageType: "error"
    });
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

  const rawRecipientPhone = formData.get("recipient_phone");

  if (!isValidKoreanMobilePhone(rawRecipientPhone)) {
    return redirectBack(headerStore, {
      message: "한국 휴대폰번호를 정확히 입력해야 합니다.",
      messageType: "error"
    });
  }

  const recipientPhone = normalizeKoreanMobilePhone(rawRecipientPhone);

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

  try {
    resolvedNotificationTemplate = await resolveBizgoNotificationTemplateForSend(
      notificationTemplate
    );
  } catch (error) {
    const message = toErrorMessage(
      error,
      "알림톡 템플릿 상태를 확인하지 못해 문서 발급을 중단했습니다."
    );

    return redirectBack(headerStore, { message, messageType: "error" });
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
    const message = toErrorMessage(error, "알림톡 발송 중 오류가 발생했습니다.");
    await updateDocumentBizgo(document.token, "failed", { message });
    return redirectBack(headerStore, {
      message,
      messageType: "error"
    });
  }
}
