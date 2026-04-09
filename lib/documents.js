import crypto from "node:crypto";
import { getDocumentSignatureUrl } from "@/lib/signatures";
import { buildTemplateValues } from "@/lib/templateVariables";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_IN_MS = 9 * 60 * 60 * 1000;

export function fillTemplate(text, values) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function createDocumentToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function buildDocumentValues(input) {
  return buildTemplateValues(input);
}

export function getDocumentLimitDate(document) {
  if (!document) {
    return "";
  }

  return buildDocumentValues({
    limit_date: document.limit_date,
    created_at: document.created_at,
    issued_at: document.created_at
  }).limit_date;
}

function getKstDayStart(dateString) {
  const [year, month, day] = String(dateString || "")
    .split("-")
    .map((value) => Number(value));

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_IN_MS);
}

export function isDocumentExpired(document, nowValue = new Date()) {
  if (!document) {
    return false;
  }

  const limitDate = getDocumentLimitDate(document);
  const limitDayStart = getKstDayStart(limitDate);

  if (!limitDayStart) {
    return false;
  }

  return nowValue.getTime() >= limitDayStart.getTime() + DAY_IN_MS;
}

export function serializePublicDocument(document) {
  if (!document) {
    return null;
  }

  const limitDate = getDocumentLimitDate(document);
  const isExpired = isDocumentExpired(document);

  return {
    token: document.token,
    branch_name: document.branch_name,
    document_title: document.document_title,
    document_date: document.document_date,
    customer_name: document.customer_name,
    recipient_phone: document.recipient_phone || "",
    phone_last4: document.phone_last4,
    designer_name: document.designer_name,
    rendered_content: document.rendered_content,
    status: document.status,
    limit_date: limitDate,
    is_expired: isExpired,
    signed_at: document.signed_at || null,
    signature_url: getDocumentSignatureUrl(document.signature_storage_path)
  };
}
