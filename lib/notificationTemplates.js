export const SENDER_KEY_TYPE_OPTIONS = [
  { value: "S", label: "발신 프로필 (S)" },
  { value: "G", label: "그룹 발신 프로필 (G)" }
];

export const TEMPLATE_MESSAGE_TYPE_OPTIONS = [
  { value: "BA", label: "기본형 (BA)" },
  { value: "EX", label: "부가 정보형 (EX)" },
  { value: "AD", label: "채널 추가형 (AD)" },
  { value: "MI", label: "복합형 (MI)" }
];

export const TEMPLATE_EMPHASIZE_TYPE_OPTIONS = [
  { value: "NONE", label: "강조 없음 (NONE)" },
  { value: "TEXT", label: "텍스트 강조 (TEXT)" },
  { value: "IMAGE", label: "이미지 강조 (IMAGE)" },
  { value: "ITEM_LIST", label: "아이템 리스트 (ITEM_LIST)" }
];

export const BUTTON_TYPE_OPTIONS = [
  { value: "WL", label: "웹 링크 (WL)" },
  { value: "AL", label: "앱 링크 (AL)" },
  { value: "TN", label: "전화 걸기 (TN)" },
  { value: "AC", label: "채널 추가 (AC)" }
];

export const INSPECTION_STATUS_LABELS = {
  REG: "등록",
  REQ: "검수 요청",
  APR: "승인",
  REJ: "반려"
};

export function inspectionStatusLabel(status) {
  return INSPECTION_STATUS_LABELS[status] || status || "미동기화";
}

export function notificationLifecycleLabel(item) {
  if (item.status === "deleted") {
    return "삭제";
  }

  return item.is_active ? "사용" : "중지";
}
