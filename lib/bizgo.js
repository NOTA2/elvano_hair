import { getBaseUrl, getBizgoSenderKey, requireEnv } from "@/lib/config";
import { fillTemplate } from "@/lib/documents";
import { buildTemplateValues } from "@/lib/templateVariables";

function getBizgoBaseUrl() {
  return "https://mars.ibapi.kr/api/comm";
}

function buildBizgoUrl(path, query) {
  const url = new URL(String(path || "").replace(/^\/+/, ""), `${getBizgoBaseUrl()}/`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

function getBizgoAuthorizationValue() {
  const apiKey = requireEnv("BIZGO_API_KEY").trim();

  if (/^bearer\s+/i.test(apiKey)) {
    return apiKey;
  }

  return apiKey.replace(/^apikey\s+/i, "");
}

function getBizgoHeaders(contentType = "application/json") {
  return {
    Authorization: getBizgoAuthorizationValue(),
    "Content-Type": contentType
  };
}

async function bizgoRequest(path, { method = "GET", query, body } = {}) {
  const url = buildBizgoUrl(path, query);

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

function looksLikeAlimtalkTemplate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return false;
  }

  return Boolean(
    candidate.templateCode ||
      candidate.templateName ||
      candidate.senderKey ||
      candidate.text
  );
}

function extractAlimtalk(payload) {
  const candidates = [
    payload?.data?.data?.alimtalk,
    payload?.data?.alimtalk,
    payload?.data?.data,
    payload?.data,
    payload?.alimtalk,
    payload
  ];

  return candidates.find(looksLikeAlimtalkTemplate) || null;
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function stripProtocol(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(String(url));
    return `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return String(url).replace(/^https?:\/\//i, "");
  }
}

function sanitizeReplaceWords(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function resolveTemplateTextForSend(text, values) {
  if (!text) {
    return text;
  }

  return /#\{\s*[a-zA-Z0-9_]+\s*\}/.test(String(text))
    ? text
    : fillTemplate(text, values);
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
    document_url: stripProtocol(`${getBaseUrl()}/s/${document.token}`)
  });
}

function buildButtonFromTemplate(template, values, { fillValues = true } = {}) {
  if (!template.button_name || !template.button_type) {
    return null;
  }

  const button = {
    name: template.button_name,
    type: template.button_type
  };

  if (template.button_url_mobile) {
    button.urlMobile = fillValues
      ? fillTemplate(template.button_url_mobile, values)
      : resolveTemplateTextForSend(template.button_url_mobile, values);
  }

  if (template.button_url_pc) {
    button.urlPc = fillValues
      ? fillTemplate(template.button_url_pc, values)
      : resolveTemplateTextForSend(template.button_url_pc, values);
  }

  if (template.button_scheme_ios) {
    button.schemeIos = fillValues
      ? fillTemplate(template.button_scheme_ios, values)
      : resolveTemplateTextForSend(template.button_scheme_ios, values);
  }

  if (template.button_scheme_android) {
    button.schemeAndroid = fillValues
      ? fillTemplate(template.button_scheme_android, values)
      : resolveTemplateTextForSend(template.button_scheme_android, values);
  }

  if (template.button_tel_number) {
    button.telNumber = fillValues
      ? fillTemplate(template.button_tel_number, values)
      : resolveTemplateTextForSend(template.button_tel_number, values);
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
    sender_key: toNullableString(apiTemplate?.senderKey) || getBizgoSenderKey(),
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
    button_url_pc: toNullableString(firstButton?.urlPc || firstButton?.urlPC),
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
      senderKey: senderKey || getBizgoSenderKey(),
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

  if (!template?.template_code || !template?.message) {
    throw new Error("알림톡 템플릿에 템플릿 코드와 메시지가 모두 필요합니다.");
  }

  const values = templateValuesFromDocument(document);
  const button = buildButtonFromTemplate(template, values, { fillValues: false });
  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: getBizgoSenderKey(),
          msgType: template.template_emphasize_type === "IMAGE" ? "AI" : "AT",
          templateCode: template.template_code,
          text: resolveTemplateTextForSend(template.message, values),
          ...(template.title
            ? { title: resolveTemplateTextForSend(template.title, values) }
            : {}),
          ...(template.subtitle
            ? { subTitle: resolveTemplateTextForSend(template.subtitle, values) }
            : {}),
          ...(template.header
            ? { header: resolveTemplateTextForSend(template.header, values) }
            : {}),
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
        to: document.recipient_phone,
        replaceWords: sanitizeReplaceWords(values)
      }
    ],
    ref: `document:${document.token}`
  };

  const response = await fetch(buildBizgoUrl("v1/send/omni").toString(), {
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
