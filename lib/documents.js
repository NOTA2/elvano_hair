import crypto from "node:crypto";
import { buildTemplateValues } from "@/lib/templateVariables";

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

export function serializePublicDocument(document) {
  if (!document) {
    return null;
  }

  return {
    token: document.token,
    branch_name: document.branch_name,
    document_title: document.document_title,
    document_date: document.document_date,
    customer_name: document.customer_name,
    phone_last4: document.phone_last4,
    designer_name: document.designer_name,
    rendered_content: document.rendered_content,
    status: document.status,
    signed_at: document.signed_at || null,
    signature_data_url: document.signature_data_url || null
  };
}
