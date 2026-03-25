export const TEMPLATE_VARIABLES = [
  { key: "branch_name", label: "지점명" },
  { key: "branch_phone", label: "지점 전화번호" },
  { key: "document_title", label: "문서 제목" },
  { key: "date", label: "날짜" },
  { key: "customer_name", label: "고객 이름" },
  { key: "phone_last4", label: "휴대폰 뒷자리 4자리" },
  { key: "phone_full", label: "휴대폰 전체번호" },
  { key: "designer_name", label: "담당 디자이너 이름" },
  { key: "limit_date", label: "서명 기한" },
  { key: "document_url", label: "문서 링크" }
];

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function resolveLimitDate(input) {
  if (input.limit_date) {
    return String(input.limit_date).slice(0, 10);
  }

  const base = input.created_at || input.issued_at || new Date();
  const baseDate = new Date(base);

  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  return KST_DATE_FORMATTER.format(
    new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  );
}

export function buildTemplateValues(input) {
  const phoneFull = input.phone_full || input.recipient_phone || "";

  return {
    branch_name: input.branch_name,
    branch_phone: input.branch_phone || "",
    document_title: input.document_title,
    date: input.document_date,
    customer_name: input.customer_name,
    phone_last4: input.phone_last4,
    phone_full: phoneFull,
    recipient_phone: phoneFull,
    designer_name: input.designer_name,
    limit_date: resolveLimitDate(input),
    document_url: input.document_url || ""
  };
}
