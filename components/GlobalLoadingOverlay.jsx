"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const LOADING_START_EVENT = "global-loading:start";
const LOADING_STOP_EVENT = "global-loading:stop";
const LONG_TASK_DELAY_MS = 1200;
const MIN_VISIBLE_MS = 240;
const COMPLETE_ANIMATION_MS = 220;
const MAX_PROGRESS = 0.9;
const DEFAULT_STEP_INTERVAL_MS = 1100;
const DEFAULT_LOADING_STATE = {
  title: "처리 중입니다",
  copy: "잠시만 기다려 주세요.",
  steps: [],
  stepIntervalMs: DEFAULT_STEP_INTERVAL_MS,
  toastDelayMs: LONG_TASK_DELAY_MS,
  showCard: true
};
const ROUTE_LOADING_STATE = {
  title: "페이지를 불러오고 있습니다",
  copy: "새 화면을 준비하고 있습니다.",
  steps: [],
  stepIntervalMs: DEFAULT_STEP_INTERVAL_MS,
  toastDelayMs: 900,
  showCard: true
};

function emitLoadingEvent(name, detail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function normalizeLoadingDetail(detail) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return null;
  }

  const normalizedSteps = Array.isArray(detail.steps)
    ? detail.steps
        .map((step) => {
          if (!step || typeof step !== "object" || Array.isArray(step)) {
            return null;
          }

          const label = String(step.label || "").trim();
          const description = String(step.description || "").trim();

          if (!label && !description) {
            return null;
          }

          return {
            label: label || DEFAULT_LOADING_STATE.title,
            description: description || DEFAULT_LOADING_STATE.copy
          };
        })
        .filter(Boolean)
    : [];

  const stepIntervalMs = Number(detail.stepIntervalMs);
  const toastDelayMs = Number(detail.toastDelayMs);
  const showCard = detail.showCard !== false;

  return {
    title: String(detail.title || "").trim() || DEFAULT_LOADING_STATE.title,
    copy: String(detail.copy || "").trim() || DEFAULT_LOADING_STATE.copy,
    steps: normalizedSteps,
    stepIntervalMs:
      Number.isFinite(stepIntervalMs) && stepIntervalMs > 0
        ? stepIntervalMs
        : DEFAULT_STEP_INTERVAL_MS,
    toastDelayMs:
      Number.isFinite(toastDelayMs) && toastDelayMs >= 0
        ? toastDelayMs
        : LONG_TASK_DELAY_MS,
    showCard
  };
}

function readLoadingDetailFromForm(form) {
  if (!(form instanceof HTMLFormElement)) {
    return null;
  }

  const {
    loadingTitle,
    loadingCopy,
    loadingSteps,
    loadingStepInterval,
    loadingToastDelay,
    loadingCard
  } =
    form.dataset;

  if (
    !loadingTitle &&
    !loadingCopy &&
    !loadingSteps &&
    !loadingStepInterval &&
    !loadingToastDelay &&
    !loadingCard
  ) {
    return null;
  }

  let steps = [];

  if (loadingSteps) {
    try {
      const parsed = JSON.parse(loadingSteps);
      steps = Array.isArray(parsed) ? parsed : [];
    } catch {
      steps = [];
    }
  }

  return normalizeLoadingDetail({
    title: loadingTitle,
    copy: loadingCopy,
    steps,
    stepIntervalMs: loadingStepInterval,
    toastDelayMs: loadingToastDelay,
    showCard: loadingCard !== "hidden"
  });
}

export function startGlobalLoading(detail) {
  emitLoadingEvent(LOADING_START_EVENT, detail);
}

export function stopGlobalLoading() {
  emitLoadingEvent(LOADING_STOP_EVENT);
}

function isPlainPrimaryClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function shouldStartRouteLoading(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  if (anchor.dataset.noLoading === "true") {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const href = String(anchor.getAttribute("href") || "").trim();

  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);

  if (destination.origin !== window.location.origin) {
    return false;
  }

  return !(
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search
  );
}

export default function GlobalLoadingOverlay() {
  const cardDialogRef = useRef(null);
  const pendingCountRef = useRef(0);
  const progressTimerRef = useRef(null);
  const longTaskTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const visibleSinceRef = useRef(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showLongTaskNotice, setShowLongTaskNotice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loadingState, setLoadingState] = useState(DEFAULT_LOADING_STATE);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = useMemo(() => searchParams?.toString() || "", [searchParams]);

  function clearTimer(timerRef) {
    if (!timerRef.current) {
      return;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function clearProgressTimer() {
    if (!progressTimerRef.current) {
      return;
    }

    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }

  function clearStepTimer() {
    if (!stepTimerRef.current) {
      return;
    }

    window.clearInterval(stepTimerRef.current);
    stepTimerRef.current = null;
  }

  function syncPendingCount(nextCount) {
    const normalized = Math.max(0, nextCount);
    pendingCountRef.current = normalized;
    setPendingCount(normalized);
  }

  useEffect(() => {
    function handleStart(event) {
      const nextLoadingState = normalizeLoadingDetail(event?.detail);

      if (nextLoadingState) {
        setLoadingState(nextLoadingState);
        setActiveStepIndex(0);
      } else if (pendingCountRef.current === 0) {
        setLoadingState(DEFAULT_LOADING_STATE);
        setActiveStepIndex(0);
      }

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

      startGlobalLoading(readLoadingDetailFromForm(event.target));
    }

    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("submit", handleSubmit);
    };
  }, []);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!isPlainPrimaryClick(event)) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest("a[href]");

      if (!shouldStartRouteLoading(anchor)) {
        return;
      }

      startGlobalLoading(ROUTE_LOADING_STATE);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    clearProgressTimer();
    clearTimer(longTaskTimerRef);
    clearStepTimer();
    clearTimer(hideTimerRef);
    syncPendingCount(0);
    setIsVisible(false);
    setShowLongTaskNotice(false);
    setProgress(0);
    setActiveStepIndex(0);
    setLoadingState(DEFAULT_LOADING_STATE);
  }, [pathname, searchKey]);

  useEffect(() => {
    clearStepTimer();

    if (pendingCount <= 0 || loadingState.steps.length <= 1) {
      return;
    }

    stepTimerRef.current = window.setInterval(() => {
      setActiveStepIndex((current) => Math.min(current + 1, loadingState.steps.length - 1));
    }, loadingState.stepIntervalMs);

    return () => {
      clearStepTimer();
    };
  }, [loadingState.stepIntervalMs, loadingState.steps, pendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (pendingCount > 0) {
      clearTimer(hideTimerRef);

      if (!isVisible) {
        visibleSinceRef.current = Date.now();
        setIsVisible(true);
        setProgress((current) => (current > 0 ? current : 0.12));
      }

      if (!progressTimerRef.current) {
        progressTimerRef.current = window.setInterval(() => {
          setProgress((current) => {
            if (current >= MAX_PROGRESS) {
              return current;
            }

            const next = current + Math.max(0.02, (MAX_PROGRESS - current) * 0.18);
            return Math.min(MAX_PROGRESS, next);
          });
        }, 140);
      }

      if (!longTaskTimerRef.current) {
        longTaskTimerRef.current = window.setTimeout(() => {
          setShowLongTaskNotice(true);
        }, loadingState.toastDelayMs);
      }

      return;
    }

    clearProgressTimer();
    clearTimer(longTaskTimerRef);
    clearStepTimer();
    setShowLongTaskNotice(false);

    if (!isVisible) {
      setProgress(0);
      return;
    }

    setProgress(1);
    const elapsed = Date.now() - visibleSinceRef.current;
    const hideDelay = Math.max(COMPLETE_ANIMATION_MS, MIN_VISIBLE_MS - elapsed);

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, hideDelay);

    return () => {
      clearTimer(hideTimerRef);
    };
  }, [isVisible, pendingCount]);

  useEffect(() => {
    return () => {
      clearProgressTimer();
      clearTimer(longTaskTimerRef);
      clearStepTimer();
      clearTimer(hideTimerRef);
    };
  }, []);

  const currentStep = loadingState.steps[activeStepIndex] || null;
  const loadingTitle = currentStep?.label || loadingState.title;
  const loadingCopy = currentStep?.description || loadingState.copy;
  const loadingMeta =
    loadingState.steps.length > 0
      ? `${Math.min(activeStepIndex + 1, loadingState.steps.length)}/${loadingState.steps.length} 단계`
      : "";
  const shouldShowCard = isVisible && loadingState.showCard;
  const shouldShowToast = !loadingState.showCard && isVisible && showLongTaskNotice;

  useEffect(() => {
    const dialog = cardDialogRef.current;

    if (!dialog) {
      return;
    }

    if (shouldShowCard) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [shouldShowCard]);

  return (
    <>
      <div
        className={`global-loading-bar-shell ${isVisible ? "visible" : ""}`}
        aria-hidden={!isVisible}
      >
        <div
          className="global-loading-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <dialog
        ref={cardDialogRef}
        className={`global-loading-dialog ${shouldShowCard ? "visible" : ""}`}
        onCancel={(event) => {
          event.preventDefault();
        }}
      >
        <div
          className="global-loading-card"
          role="status"
          aria-live="polite"
          aria-busy={shouldShowCard ? "true" : "false"}
        >
          <div className="global-loading-card-head">
            <div className="global-loading-spinner" aria-hidden="true" />
            <div>
              {loadingMeta ? <div className="global-loading-meta">{loadingMeta}</div> : null}
              <div className="global-loading-title">{loadingTitle}</div>
              <div className="global-loading-copy">{loadingCopy}</div>
            </div>
          </div>
          <div className="global-loading-card-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          {loadingState.steps.length > 0 ? (
            <div className="global-loading-step-list">
              {loadingState.steps.map((step, index) => (
                <div
                  key={step.label}
                  className={`global-loading-step ${
                    index === activeStepIndex
                      ? "active"
                      : index < activeStepIndex
                        ? "done"
                        : ""
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </dialog>

      <div
        className={`global-loading-toast ${shouldShowToast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-busy={shouldShowToast ? "true" : "false"}
      >
        <div className="global-loading-spinner" aria-hidden="true" />
        <div>
          {loadingMeta ? <div className="global-loading-meta">{loadingMeta}</div> : null}
          <div className="global-loading-title">{loadingTitle}</div>
          <div className="global-loading-copy">{loadingCopy}</div>
        </div>
      </div>
    </>
  );
}
