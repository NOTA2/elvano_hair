"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function toReadableAlertMessage(message) {
  const normalized = String(message || "").trim();

  if (!normalized) {
    return "";
  }

  if (/Bizgo API 실패|Bizgo 발송 실패|authCode|authResult|Internal Server Error|A500/i.test(normalized)) {
    return "카카오톡 알림 서비스에 문제가 생겨 요청이 지연되었을 수 있습니다. 실제로 카카오톡이 발송되었는지 먼저 확인해 주시고, 발송되지 않았다면 알림톡 재발송(💬) 버튼만 눌러 다시 보내 주세요.";
  }

  if (
    /TypeError|ReferenceError|SyntaxError|PageNotFoundError|Cannot find module|Unexpected token|fetch failed/i.test(
      normalized
    )
  ) {
    return "우리 시스템에서 요청을 처리하는 중 문제가 발생했습니다. 문제가 계속되면 개발 관리자에게 알려 주세요.";
  }

  return normalized;
}

export default function AlertOnMount({ message, type = "error" }) {
  const dialogRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const nextUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("message");
    params.delete("messageType");

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!message || dismissed) {
      return;
    }

    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [dismissed, message]);

  function closeDialog() {
    const dialog = dialogRef.current;

    if (dialog?.open) {
      dialog.close();
    }

    setDismissed(true);
    router.replace(nextUrl, { scroll: false });
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  if (!message || dismissed) {
    return null;
  }

  const readableMessage = toReadableAlertMessage(message);
  const normalizedType = type === "success" || type === "info" ? type : "error";
  const title =
    normalizedType === "success"
      ? "처리가 완료되었습니다"
      : normalizedType === "info"
        ? "결과를 확인해 주세요"
        : "확인이 필요합니다";

  return (
    <dialog
      ref={dialogRef}
      className="floating-alert-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={handleBackdropClick}
    >
      <div className={`floating-alert-card ${normalizedType}`}>
        <div className="floating-alert-badge">
          {normalizedType === "success" ? "완료" : normalizedType === "info" ? "확인" : "안내"}
        </div>
        <div className="floating-alert-title">{title}</div>
        <div className="floating-alert-copy">{readableMessage}</div>
        <div className="floating-alert-actions">
          <button type="button" onClick={closeDialog}>
            확인
          </button>
        </div>
      </div>
    </dialog>
  );
}
