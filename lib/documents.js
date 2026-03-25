import crypto from "node:crypto";

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
  return {
    branch_name: input.branch_name,
    document_title: input.document_title,
    date: input.document_date,
    customer_name: input.customer_name,
    phone_last4: input.phone_last4,
    designer_name: input.designer_name
  };
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
