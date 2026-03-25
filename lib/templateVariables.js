export const TEMPLATE_VARIABLES = [
  { key: "branch_name", label: "지점명" },
  { key: "document_title", label: "문서 제목" },
  { key: "date", label: "날짜" },
  { key: "customer_name", label: "고객 이름" },
  { key: "phone_last4", label: "휴대폰 뒷자리 4자리" },
  { key: "phone_full", label: "휴대폰 전체번호" },
  { key: "designer_name", label: "담당 디자이너 이름" },
  { key: "document_url", label: "문서 링크" }
];

export function buildTemplateValues(input) {
  const phoneFull = input.phone_full || input.recipient_phone || "";

  return {
    branch_name: input.branch_name,
    document_title: input.document_title,
    date: input.document_date,
    customer_name: input.customer_name,
    phone_last4: input.phone_last4,
    phone_full: phoneFull,
    recipient_phone: phoneFull,
    designer_name: input.designer_name,
    document_url: input.document_url || ""
  };
}
