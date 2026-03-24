import { getBaseUrl, requireEnv } from "@/lib/config";
import { fillTemplate } from "@/lib/documents";

export async function sendBizgoAlimtalk({ template, document }) {
  const apiKey = requireEnv("BIZGO_API_KEY");
  const baseUrl = process.env.BIZGO_BASE_URL || "https://api.bizgo.io";

  if (!document.recipient_phone) {
    throw new Error("알림톡 발송을 위해 수신 전화번호가 필요합니다.");
  }

  if (!template.bizgo_template_code || !template.bizgo_sender_key || !template.bizgo_message) {
    throw new Error("템플릿에 Bizgo 발신키, 템플릿 코드, 메시지를 모두 입력해야 합니다.");
  }

  const documentUrl = `${getBaseUrl()}/s/${document.token}`;
  const messageText = fillTemplate(template.bizgo_message, {
    branch_name: document.branch_name,
    document_title: document.document_title,
    date: document.document_date,
    customer_name: document.customer_name,
    phone_last4: document.phone_last4,
    designer_name: document.designer_name,
    document_url: documentUrl
  });

  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: template.bizgo_sender_key,
          msgType: "AT",
          templateCode: template.bizgo_template_code,
          text: messageText,
          attachment: {
            button: [
              {
                name: template.bizgo_button_name || "서명하기",
                type: "WL",
                urlPc: documentUrl,
                urlMobile: documentUrl
              }
            ]
          }
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

  const response = await fetch(`${baseUrl}/v1/send/omni`, {
    method: "POST",
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Bizgo 발송 실패: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

