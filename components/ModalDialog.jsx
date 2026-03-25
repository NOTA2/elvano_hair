"use client";

import { useRef, useState } from "react";

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

  function openDialog() {
    if (!hasOpened) {
      setHasOpened(true);
    }

    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
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
        onClick={handleBackdropClick}
      >
        <div className="modal-card">
          <div className="modal-head">
            <div>
              <div className="panel-title modal-title">{title}</div>
              {description ? <p className="panel-copy modal-copy">{description}</p> : null}
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
