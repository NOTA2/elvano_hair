"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
        <div className="floating-alert-copy">{message}</div>
        <div className="floating-alert-actions">
          <button type="button" onClick={closeDialog}>
            확인
          </button>
        </div>
      </div>
    </dialog>
  );
}
