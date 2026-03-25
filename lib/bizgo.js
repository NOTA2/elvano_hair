import { requireEnv } from "@/lib/config";
import { fillTemplate } from "@/lib/documents";
import { buildTemplateValues } from "@/lib/templateVariables";

function getBizgoBaseUrl() {
  return (process.env.BIZGO_BASE_URL || "https://api.bizgo.io").replace(/\/$/, "");
}

function getBizgoHeaders(contentType = "application/json") {
  return {
    Authorization: `ApiKey ${requireEnv("BIZGO_API_KEY")}`,
    "Content-Type": contentType
  };
}

async function bizgoRequest(path, { method = "GET", query, body } = {}) {
  const url = new URL(path, `${getBizgoBaseUrl()}/`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method,
    headers: getBizgoHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Bizgo API 실패: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function extractAlimtalk(payload) {
  return payload?.data?.data?.alimtalk || payload?.data?.alimtalk || null;
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function templateValuesFromDocument(document) {
  return buildTemplateValues({
    branch_name: document.branch_name,
    document_title: document.document_title,
    document_date: document.document_date,
    customer_name: document.customer_name,
    phone_last4: document.phone_last4,
    recipient_phone: document.recipient_phone,
    designer_name: document.designer_name,
    document_url: `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/s/${document.token}`
  });
}

function buildButtonFromTemplate(template, values) {
  if (!template.button_name || !template.button_type) {
    return null;
  }

  const button = {
    name: template.button_name,
    type: template.button_type
  };

  if (template.button_url_mobile) {
    button.urlMobile = fillTemplate(template.button_url_mobile, values);
  }

  if (template.button_url_pc) {
    button.urlPc = fillTemplate(template.button_url_pc, values);
  }

  if (template.button_scheme_ios) {
    button.schemeIos = fillTemplate(template.button_scheme_ios, values);
  }

  if (template.button_scheme_android) {
    button.schemeAndroid = fillTemplate(template.button_scheme_android, values);
  }

  if (template.button_tel_number) {
    button.telNumber = fillTemplate(template.button_tel_number, values);
  }

  return button;
}

function buildNotificationTemplateBody(template, { fillValues } = {}) {
  const values = fillValues || {};
  const button = buildButtonFromTemplate(template, values);
  const alimtalk = {
    senderKey: template.sender_key,
    senderKeyType: template.sender_key_type || "S",
    templateCode: template.template_code,
    templateName: template.template_name,
    templateMessageType: template.template_message_type || "BA",
    templateEmphasizeType: template.template_emphasize_type || "NONE",
    text: fillValues ? fillTemplate(template.message, values) : template.message
  };

  if (template.category_code) {
    alimtalk.categoryCode = template.category_code;
  }

  if (template.security_flag) {
    alimtalk.securityFlag = "true";
  }

  if (template.title) {
    alimtalk.title = fillValues ? fillTemplate(template.title, values) : template.title;
  }

  if (template.subtitle) {
    alimtalk.subTitle = fillValues
      ? fillTemplate(template.subtitle, values)
      : template.subtitle;
  }

  if (template.header) {
    alimtalk.header = fillValues ? fillTemplate(template.header, values) : template.header;
  }

  if (button) {
    alimtalk.attachment = {
      button: [button]
    };
  }

  return { alimtalk };
}

export function mapBizgoTemplateToLocal(apiTemplate) {
  const firstButton = apiTemplate?.attachment?.button?.[0] || null;

  return {
    sender_key: toNullableString(apiTemplate?.senderKey),
    sender_key_type: toNullableString(apiTemplate?.senderKeyType) || "S",
    template_code: toNullableString(apiTemplate?.templateCode),
    template_name: toNullableString(apiTemplate?.templateName),
    template_message_type: toNullableString(apiTemplate?.templateMessageType) || "BA",
    template_emphasize_type:
      toNullableString(apiTemplate?.templateEmphasizeType) || "NONE",
    category_code: toNullableString(apiTemplate?.categoryCode),
    security_flag:
      String(apiTemplate?.securityFlag || "").toLowerCase() === "true",
    message: toNullableString(apiTemplate?.text) || "",
    title: toNullableString(apiTemplate?.title),
    subtitle: toNullableString(apiTemplate?.subTitle),
    header: toNullableString(apiTemplate?.header),
    button_name: toNullableString(firstButton?.name),
    button_type: toNullableString(firstButton?.type),
    button_url_mobile: toNullableString(firstButton?.urlMobile),
    button_url_pc: toNullableString(firstButton?.urlPc),
    button_scheme_ios: toNullableString(firstButton?.schemeIos),
    button_scheme_android: toNullableString(firstButton?.schemeAndroid),
    button_tel_number: toNullableString(firstButton?.telNumber),
    inspection_status: toNullableString(apiTemplate?.inspectionStatus),
    remote_block: String(apiTemplate?.block || "").toLowerCase() === "true",
    remote_dormant: String(apiTemplate?.dormant || "").toLowerCase() === "true",
    remote_created_at: toNullableString(apiTemplate?.createAt),
    remote_modified_at: toNullableString(apiTemplate?.modifiedAt),
    remote_payload: apiTemplate || null,
    last_synced_at: new Date().toISOString()
  };
}

export async function getBizgoNotificationTemplate({ senderKey, templateCode }) {
  const payload = await bizgoRequest("/v1/center/alimtalk/template", {
    query: {
      senderKey,
      templateCode
    }
  });

  return extractAlimtalk(payload);
}

export async function createBizgoNotificationTemplate(template) {
  const payload = await bizgoRequest("/v1/center/alimtalk/template", {
    method: "POST",
    body: buildNotificationTemplateBody(template)
  });

  return extractAlimtalk(payload);
}

export async function updateBizgoNotificationTemplate(template) {
  const payload = await bizgoRequest("/v1/center/alimtalk/template", {
    method: "PUT",
    body: buildNotificationTemplateBody(template)
  });

  return extractAlimtalk(payload);
}

export async function deleteBizgoNotificationTemplate({ senderKey, templateCode }) {
  return await bizgoRequest(
    `/v1/center/alimtalk/template/senderKey/${encodeURIComponent(senderKey)}/templateCode/${encodeURIComponent(templateCode)}`,
    {
      method: "DELETE"
    }
  );
}

export async function requestBizgoTemplateApproval({
  senderKey,
  senderKeyType,
  templateCode,
  comment
}) {
  return await bizgoRequest("/v1/center/alimtalk/template/request", {
    method: "POST",
    body: {
      alimtalk: {
        senderKey,
        senderKeyType: senderKeyType || "S",
        templateCode,
        comment: toNullableString(comment)
      }
    }
  });
}

export async function cancelBizgoTemplateApproval({ senderKey, templateCode }) {
  return await bizgoRequest("/v1/center/alimtalk/template/request/cancel", {
    method: "POST",
    body: {
      senderKey,
      templateCode
    }
  });
}

export async function sendBizgoAlimtalk({ notificationTemplate, document }) {
  const template = notificationTemplate;

  if (!document.recipient_phone) {
    throw new Error("알림톡 발송을 위해 수신 전화번호가 필요합니다.");
  }

  if (!template?.sender_key || !template?.template_code || !template?.message) {
    throw new Error("알림톡 템플릿에 발신키, 템플릿 코드, 메시지가 모두 필요합니다.");
  }

  const values = templateValuesFromDocument(document);
  const button = buildButtonFromTemplate(template, values);
  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: template.sender_key,
          msgType: template.template_emphasize_type === "IMAGE" ? "AI" : "AT",
          templateCode: template.template_code,
          text: fillTemplate(template.message, values),
          ...(button
            ? {
                attachment: {
                  button: [button]
                }
              }
            : {})
        }
      }
    ],
    destinations: [
      {
        to: document.recipient_phone
      }
    ],
    ref: `document:${document.token}`
  };

  const response = await fetch(`${getBizgoBaseUrl()}/v1/send/omni`, {
    method: "POST",
    headers: getBizgoHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Bizgo 발송 실패: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}
