"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const LOADING_START_EVENT = "global-loading:start";
const LOADING_STOP_EVENT = "global-loading:stop";

function emitLoadingEvent(name) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(name));
}

export function startGlobalLoading() {
  emitLoadingEvent(LOADING_START_EVENT);
}

export function stopGlobalLoading() {
  emitLoadingEvent(LOADING_STOP_EVENT);
}

export default function GlobalLoadingOverlay() {
  const dialogRef = useRef(null);
  const pendingCountRef = useRef(0);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = useMemo(() => searchParams?.toString() || "", [searchParams]);

  function syncPendingCount(nextCount) {
    const normalized = Math.max(0, nextCount);
    pendingCountRef.current = normalized;
    setPendingCount(normalized);
  }

  useEffect(() => {
    function handleStart() {
      syncPendingCount(pendingCountRef.current + 1);
    }

    function handleStop() {
      syncPendingCount(pendingCountRef.current - 1);
    }

    window.addEventListener(LOADING_START_EVENT, handleStart);
    window.addEventListener(LOADING_STOP_EVENT, handleStop);

    return () => {
      window.removeEventListener(LOADING_START_EVENT, handleStart);
      window.removeEventListener(LOADING_STOP_EVENT, handleStop);
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      startGlobalLoading();

      try {
        return await originalFetch(...args);
      } finally {
        stopGlobalLoading();
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    function handleSubmit(event) {
      if (event.defaultPrevented) {
        return;
      }

      if (!(event.target instanceof HTMLFormElement)) {
        return;
      }

      startGlobalLoading();
    }

    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("submit", handleSubmit);
    };
  }, []);

  useEffect(() => {
    syncPendingCount(0);
  }, [pathname, searchKey]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (pendingCount > 0) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [pendingCount]);

  return (
    <dialog
      ref={dialogRef}
      className="global-loading-dialog"
      onCancel={(event) => {
        event.preventDefault();
      }}
    >
      <div className="global-loading-panel" role="status" aria-live="polite" aria-busy="true">
        <div className="global-loading-spinner" aria-hidden="true" />
        <div className="global-loading-title">처리 중입니다</div>
        <div className="global-loading-copy">잠시만 기다려 주세요.</div>
      </div>
    </dialog>
  );
}
