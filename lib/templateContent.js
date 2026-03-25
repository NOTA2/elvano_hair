function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export function normalizeTemplateContent(content) {
  const raw = String(content || "").trim();

  if (!raw) {
    return "";
  }

  if (HTML_TAG_PATTERN.test(raw)) {
    return raw;
  }

  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function sanitizeTemplateContent(content) {
  return String(content || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .trim();
}

export function toHtmlTemplateValues(values) {
  return Object.fromEntries(
    Object.entries(values || {}).map(([key, value]) => [key, escapeHtml(value)])
  );
}
