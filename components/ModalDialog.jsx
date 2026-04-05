"use client";

import { useEffect, useRef, useState } from "react";
import ReadableText from "@/components/ReadableText";

export default function ModalDialog({
  title,
  description,
  triggerLabel = "수정",
  triggerClassName = "secondary",
  size = "default",
  lazy = true,
  children
}) {
  const dialogRef = useRef(null);
  const [hasOpened, setHasOpened] = useState(!lazy);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function openDialog() {
    if (!hasOpened) {
      setHasOpened(true);
    }

    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={openDialog}>
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className={`modal-dialog ${size === "wide" ? "wide" : ""}`}
        onClose={() => {
          setIsOpen(false);
        }}
        onClick={handleBackdropClick}
      >
        <div className="modal-card">
          <div className="modal-head">
            <div>
              <div className="panel-title modal-title">{title}</div>
              {description ? (
                <ReadableText className="panel-copy modal-copy">{description}</ReadableText>
              ) : null}
            </div>
            <button type="button" className="secondary modal-close-button" onClick={closeDialog}>
              닫기
            </button>
          </div>
          <div className="modal-body">{hasOpened ? children : null}</div>
        </div>
      </dialog>
    </>
  );
}
