"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startGlobalLoading } from "@/components/GlobalLoadingOverlay";
import LazyRichTextEditor from "@/components/LazyRichTextEditor";
import SelectField from "@/components/SelectField";
import {
  formatKoreanPhoneNumber,
  isValidKoreanMobilePhone
} from "@/lib/phone";
import { normalizeTemplateContent } from "@/lib/templateContent";

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function getTodayKst() {
  return KST_DATE_FORMATTER.format(new Date());
}

function labelWithInactiveSuffix(item, label) {
  return item?.is_active === false ? `${label} (비활성)` : label;
}

export default function AdminDocumentIssueForm({
  mode = "create",
  initialDocument = null,
  branchLocked = false,
  branchId,
  branchName,
  branches,
  designers,
  documentTemplates,
  notificationTemplates
}) {
  const isEditMode = mode === "edit";
  const submitTimerRef = useRef(null);
  const skipInitialTemplateSeedRef = useRef(isEditMode);
  const confirmDialogRef = useRef(null);
  const pendingSubmitFormRef = useRef(null);

  const branchOptions = useMemo(() => {
    const next = [...branches];

    if (
      isEditMode &&
      initialDocument?.branch_id &&
      !next.some((branch) => Number(branch.id) === Number(initialDocument.branch_id))
    ) {
      next.push({
        id: initialDocument.branch_id,
        name: initialDocument.branch_name || "현재 지점",
        is_active: false
      });
    }

    return next;
  }, [branches, initialDocument, isEditMode]);

  const designerOptions = useMemo(() => {
    const next = [...designers];

    if (
      isEditMode &&
      initialDocument?.designer_id &&
      !next.some((designer) => Number(designer.id) === Number(initialDocument.designer_id))
    ) {
      next.push({
        id: initialDocument.designer_id,
        name: initialDocument.designer_name || "현재 담당 디자이너",
        branch_id: initialDocument.branch_id,
        is_active: false
      });
    }

    return next;
  }, [designers, initialDocument, isEditMode]);

  const notificationTemplateOptions = useMemo(() => {
    const next = [...notificationTemplates];

    if (
      isEditMode &&
      initialDocument?.notification_template_id &&
      !next.some(
        (template) =>
          Number(template.id) === Number(initialDocument.notification_template_id)
      )
    ) {
      next.push({
        id: initialDocument.notification_template_id,
        template_name: initialDocument.notification_template_name || "현재 알림톡 템플릿",
        template_code: "",
        is_active: false
      });
    }

    return next;
  }, [initialDocument, isEditMode, notificationTemplates]);

  const initialBranchId = initialDocument?.branch_id
    ? String(initialDocument.branch_id)
    : branchId
      ? String(branchId)
      : "";
  const initialDesignerId = initialDocument?.designer_id
    ? String(initialDocument.designer_id)
    : "";
  const initialTemplateId = initialDocument?.template_id
    ? String(initialDocument.template_id)
    : "";
  const initialNotificationTemplateId = initialDocument?.notification_template_id
    ? String(initialDocument.notification_template_id)
    : "";
  const initialBranchName =
    initialDocument?.branch_name ||
    branchOptions.find((branch) => String(branch.id) === initialBranchId)?.name ||
    branchName ||
    "";

  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedDesignerId, setSelectedDesignerId] = useState(initialDesignerId);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [selectedNotificationTemplateId, setSelectedNotificationTemplateId] = useState(
    initialNotificationTemplateId
  );
  const [editorContent, setEditorContent] = useState(
    isEditMode ? normalizeTemplateContent(initialDocument?.rendered_content || "") : ""
  );
  const [documentTitle, setDocumentTitle] = useState(
    String(initialDocument?.document_title || "")
  );
  const [documentDate, setDocumentDate] = useState(
    String(initialDocument?.document_date || getTodayKst())
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLoadingStepIndex, setActiveLoadingStepIndex] = useState(0);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const designersByBranch = useMemo(() => {
    const next = new Map();

    designerOptions.forEach((designer) => {
      const key = String(designer.branch_id || "");
      const items = next.get(key);

      if (items) {
        items.push(designer);
        return;
      }

      next.set(key, [designer]);
    });

    return next;
  }, [designerOptions]);

  const documentTemplateMap = useMemo(() => {
    return new Map(documentTemplates.map((template) => [String(template.id), template]));
  }, [documentTemplates]);

  const currentTemplate = documentTemplateMap.get(String(selectedTemplateId));
  const currentTemplateName =
    currentTemplate?.name ||
    initialDocument?.template_name ||
    (selectedTemplateId ? `템플릿 #${selectedTemplateId}` : "연결된 템플릿 없음");

  const loadingState = useMemo(() => {
    if (isEditMode) {
      return {
        title: "문서를 수정하고 있습니다",
        copy: "서명 전 문서는 저장 후 바로 반영됩니다.",
        steps: [
          {
            label: "수정 내용을 확인하고 있습니다",
            description: "고객 정보와 본문 변경사항을 점검하고 있습니다."
          },
          {
            label: "수정된 문서를 저장하고 있습니다",
            description: "서명 링크는 그대로 유지한 채 최신 내용으로 덮어쓰고 있습니다."
          },
          {
            label: "저장 결과를 반영하고 있습니다",
            description: "저장이 끝나면 문서 목록으로 돌아갑니다."
          }
        ],
        stepIntervalMs: 950
      };
    }

    return {
      title: "문서 발행과 알림톡 준비를 진행하고 있습니다",
      copy: "알림톡 검수 상태 확인이 포함되면 평소보다 조금 더 걸릴 수 있습니다.",
      steps: [
        {
          label: "입력 내용을 확인하고 있습니다",
          description: "지점, 담당자, 문서 템플릿 정보를 정리하고 있습니다."
        },
        {
          label: "고객 안내문을 생성하고 있습니다",
          description: "문서 본문에 고객 정보와 발급 링크를 반영하고 있습니다."
        },
        {
          label: "알림톡 템플릿 상태를 확인하고 있습니다",
          description: "검수 상태와 최신 템플릿 정보를 Bizgo 기준으로 확인하고 있습니다."
        },
        {
          label: "알림톡 발송을 요청하고 있습니다",
          description: "발송 결과를 저장한 뒤 목록으로 돌아갑니다."
        }
      ],
      stepIntervalMs: 1300
    };
  }, [isEditMode]);

  const loadingStepsJson = useMemo(() => {
    return JSON.stringify(loadingState.steps);
  }, [loadingState.steps]);

  const filteredDesigners = useMemo(() => {
    if (!selectedBranchId) {
      return [];
    }

    return designersByBranch.get(String(selectedBranchId)) || [];
  }, [designersByBranch, selectedBranchId]);

  useEffect(() => {
    if (
      selectedDesignerId &&
      !filteredDesigners.some((designer) => String(designer.id) === selectedDesignerId)
    ) {
      setSelectedDesignerId("");
    }
  }, [filteredDesigners, selectedDesignerId]);

  useEffect(() => {
    const template = documentTemplateMap.get(String(selectedTemplateId));

    if (skipInitialTemplateSeedRef.current) {
      skipInitialTemplateSeedRef.current = false;
      return;
    }

    setEditorContent(normalizeTemplateContent(template?.content || ""));
    setDocumentTitle(String(template?.document_title || template?.name || ""));
  }, [documentTemplateMap, selectedTemplateId]);

  useEffect(() => {
    if (!isSubmitting || loadingState.steps.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveLoadingStepIndex((current) =>
        Math.min(current + 1, loadingState.steps.length - 1)
      );
    }, loadingState.stepIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSubmitting, loadingState.stepIntervalMs, loadingState.steps.length]);

  useEffect(() => {
    return () => {
      confirmDialogRef.current?.close();

      if (submitTimerRef.current) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const dialog = confirmDialogRef.current;

    if (!dialog) {
      return;
    }

    if (confirmPayload) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [confirmPayload]);

  function clearError(fieldName) {
    setErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  }

  function validateForm(formData) {
    const nextErrors = {};
    const customerName = String(formData.get("customer_name") || "").trim();
    const recipientPhone = String(formData.get("recipient_phone") || "").trim();
    const documentTitleValue = String(formData.get("document_title") || "").trim();

    if (!branchLocked && !selectedBranchId) {
      nextErrors.branch_id = "지점을 선택해야 합니다.";
    }

    if (!selectedDesignerId) {
      nextErrors.designer_id = "담당 디자이너를 선택해야 합니다.";
    }

    if (!customerName) {
      nextErrors.customer_name = "고객 이름을 입력해야 합니다.";
    }

    if (!recipientPhone) {
      nextErrors.recipient_phone = "휴대폰번호를 입력해야 합니다.";
    } else if (!isValidKoreanMobilePhone(recipientPhone)) {
      nextErrors.recipient_phone = "한국 휴대폰번호를 정확히 입력해야 합니다.";
    }

    if (!documentDate) {
      nextErrors.document_date = "날짜를 입력해야 합니다.";
    }

    if (!selectedTemplateId) {
      nextErrors.template_id = "문서 템플릿을 확인해야 합니다.";
    }

    if (!isEditMode && !selectedNotificationTemplateId) {
      nextErrors.notification_template_id = "알림톡 템플릿을 선택해야 합니다.";
    }

    if (!documentTitleValue) {
      nextErrors.document_title = "문서 제목을 입력해야 합니다.";
    }

    return nextErrors;
  }

  function closeConfirmDialog() {
    pendingSubmitFormRef.current = null;
    setConfirmPayload(null);
  }

  function beginSubmit(form) {
    if (!form) {
      return;
    }

    setIsSubmitting(true);
    setActiveLoadingStepIndex(0);
    startGlobalLoading({
      ...loadingState,
      toastDelayMs: 320,
      showCard: false
    });

    submitTimerRef.current = window.setTimeout(() => {
      form.submit();
    }, 48);
  }

  function openConfirmDialog(form, formData) {
    pendingSubmitFormRef.current = form;
    setConfirmPayload({
      customerName: String(formData.get("customer_name") || "").trim() || "-",
      recipientPhone: formatKoreanPhoneNumber(formData.get("recipient_phone")),
      documentTitle: String(formData.get("document_title") || "").trim() || "-"
    });
  }

  function handleConfirmSubmit() {
    const form = pendingSubmitFormRef.current;

    closeConfirmDialog();
    beginSubmit(form);
  }

  function handleConfirmBackdropClick(event) {
    if (event.target === confirmDialogRef.current) {
      closeConfirmDialog();
    }
  }

  const currentLoadingStep =
    loadingState.steps[
      Math.min(activeLoadingStepIndex, Math.max(loadingState.steps.length - 1, 0))
    ] || null;
  const loadingProgress =
    loadingState.steps.length > 0
      ? (Math.min(activeLoadingStepIndex + 1, loadingState.steps.length) /
          loadingState.steps.length) *
        100
      : 0;

  return (
    <>
      <form
        className="issue-form"
        action="/api/admin/documents"
        method="post"
        data-loading-title={loadingState.title}
        data-loading-copy={loadingState.copy}
        data-loading-steps={loadingStepsJson}
        data-loading-step-interval={String(loadingState.stepIntervalMs)}
        data-loading-toast-delay="1800"
        data-loading-card="hidden"
        aria-busy={isSubmitting ? "true" : "false"}
        onSubmit={(event) => {
          const form = event.currentTarget;
          const formData = new FormData(form);
          const nextErrors = validateForm(formData);

          if (Object.keys(nextErrors).length > 0) {
            event.preventDefault();
            setErrors(nextErrors);
            return;
          }

          if (isSubmitting) {
            event.preventDefault();
            return;
          }

          event.preventDefault();
          setErrors({});

          if (!isEditMode) {
            openConfirmDialog(form, formData);
            return;
          }

          beginSubmit(form);
        }}
      >
        <input type="hidden" name="intent" value={isEditMode ? "update" : "create"} />
        {isEditMode ? (
          <input type="hidden" name="token" value={initialDocument?.token || ""} />
        ) : null}

        {isSubmitting ? (
          <div className="issue-form-loading-overlay" role="status" aria-live="polite">
            <div className="issue-form-loading-card">
              <div className="issue-form-loading-meta">
                {Math.min(activeLoadingStepIndex + 1, loadingState.steps.length)}/
                {loadingState.steps.length} 단계
              </div>
              <div className="issue-form-loading-title">
                {currentLoadingStep?.label || loadingState.title}
              </div>
              <div className="issue-form-loading-copy">
                {currentLoadingStep?.description || loadingState.copy}
              </div>
              <div className="issue-form-loading-progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${loadingProgress / 100})` }} />
              </div>
              <div className="issue-form-loading-step-list">
                {loadingState.steps.map((step, index) => (
                  <div
                    key={step.label}
                    className={`issue-form-loading-step ${
                      index === activeLoadingStepIndex
                        ? "active"
                        : index < activeLoadingStepIndex
                          ? "done"
                          : ""
                    }`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="issue-form-layout">
          <div className="issue-form-row issue-form-row-2">
            {branchLocked ? (
              <>
                <input type="hidden" name="branch_id" value={selectedBranchId} />
                <label className="field">
                  <span className="field-label">지점</span>
                  <input value={initialBranchName} disabled readOnly />
                </label>
              </>
            ) : (
              <label className="field">
                <span className="field-label">지점</span>
                <SelectField
                  name="branch_id"
                  value={selectedBranchId}
                  onChange={(event) => {
                    setSelectedBranchId(String(event.target.value || ""));
                    clearError("branch_id");
                  }}
                  invalid={Boolean(errors.branch_id)}
                  required
                >
                  <option value="">선택</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {labelWithInactiveSuffix(branch, branch.name)}
                    </option>
                  ))}
                </SelectField>
                {errors.branch_id ? (
                  <span className="field-error-text">{errors.branch_id}</span>
                ) : null}
              </label>
            )}

            <label className="field">
              <span className="field-label">담당 디자이너</span>
              <SelectField
                name="designer_id"
                value={selectedDesignerId}
                onChange={(event) => {
                  setSelectedDesignerId(String(event.target.value || ""));
                  clearError("designer_id");
                }}
                disabled={!selectedBranchId}
                invalid={Boolean(errors.designer_id)}
                required
              >
                <option value="">
                  {selectedBranchId ? "선택" : "지점을 먼저 선택하세요"}
                </option>
                {filteredDesigners.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {labelWithInactiveSuffix(designer, designer.name)}
                  </option>
                ))}
              </SelectField>
              {errors.designer_id ? (
                <span className="field-error-text">{errors.designer_id}</span>
              ) : null}
            </label>
          </div>

          <div className="issue-form-row issue-form-row-3">
            <label className="field">
              <span className="field-label">고객 이름</span>
              <input
                name="customer_name"
                defaultValue={initialDocument?.customer_name || ""}
                className={errors.customer_name ? "input-error" : ""}
                onChange={() => clearError("customer_name")}
                required
              />
              {errors.customer_name ? (
                <span className="field-error-text">{errors.customer_name}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">휴대폰번호</span>
              <input
                name="recipient_phone"
                inputMode="tel"
                placeholder="01012345678"
                defaultValue={initialDocument?.recipient_phone || ""}
                className={errors.recipient_phone ? "input-error" : ""}
                onChange={() => clearError("recipient_phone")}
                required
              />
              {errors.recipient_phone ? (
                <span className="field-error-text">{errors.recipient_phone}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">날짜</span>
              <input
                type="date"
                name="document_date"
                value={documentDate}
                className={errors.document_date ? "input-error" : ""}
                onChange={(event) => {
                  setDocumentDate(event.target.value);
                  clearError("document_date");
                }}
                required
              />
              {errors.document_date ? (
                <span className="field-error-text">{errors.document_date}</span>
              ) : null}
            </label>
          </div>

          {isEditMode ? (
            <div className="issue-form-row issue-form-row-2">
              <label className="field">
                <span className="field-label">문서 템플릿</span>
                <input value={currentTemplateName} disabled readOnly />
                <input type="hidden" name="template_id" value={selectedTemplateId} />
                <span className="field-help">
                  이미 발급된 문서는 현재 템플릿 연결을 유지하고 본문을 직접 수정합니다.
                </span>
              </label>

              <label className="field">
                <span className="field-label">알림톡 템플릿</span>
                <SelectField
                  name="notification_template_id"
                  value={selectedNotificationTemplateId}
                  onChange={(event) => {
                    setSelectedNotificationTemplateId(String(event.target.value || ""));
                    clearError("notification_template_id");
                  }}
                  invalid={Boolean(errors.notification_template_id)}
                >
                  <option value="">선택 안 함</option>
                  {notificationTemplateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {labelWithInactiveSuffix(
                        template,
                        `${template.template_name} ${
                          template.template_code ? `(${template.template_code})` : ""
                        }`.trim()
                      )}
                    </option>
                  ))}
                </SelectField>
                {errors.notification_template_id ? (
                  <span className="field-error-text">{errors.notification_template_id}</span>
                ) : null}
                <span className="field-help">
                  저장 후 필요하면 목록의 재발송 버튼으로 알림톡을 다시 보낼 수 있습니다.
                </span>
              </label>
            </div>
          ) : (
            <div className="issue-form-row issue-form-row-2">
              <label className="field">
                <span className="field-label">문서 템플릿</span>
                <SelectField
                  name="template_id"
                  value={selectedTemplateId}
                  onChange={(event) => {
                    setSelectedTemplateId(String(event.target.value || ""));
                    clearError("template_id");
                  }}
                  invalid={Boolean(errors.template_id)}
                  required
                >
                  <option value="">선택</option>
                  {documentTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </SelectField>
                {errors.template_id ? (
                  <span className="field-error-text">{errors.template_id}</span>
                ) : null}
              </label>

              <label className="field">
                <span className="field-label">알림톡 템플릿</span>
                <SelectField
                  name="notification_template_id"
                  value={selectedNotificationTemplateId}
                  onChange={(event) => {
                    setSelectedNotificationTemplateId(String(event.target.value || ""));
                    clearError("notification_template_id");
                  }}
                  invalid={Boolean(errors.notification_template_id)}
                >
                  <option value="">선택</option>
                  {notificationTemplateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {labelWithInactiveSuffix(
                        template,
                        `${template.template_name} (${template.template_code})`
                      )}
                    </option>
                  ))}
                </SelectField>
                {errors.notification_template_id ? (
                  <span className="field-error-text">{errors.notification_template_id}</span>
                ) : null}
                <span className="field-help">
                  문서 발행 시 선택한 알림톡 템플릿으로 바로 발송합니다.
                </span>
              </label>
            </div>
          )}

          <div className="issue-form-row issue-form-row-1">
            <label className="field">
              <span className="field-label">문서 제목</span>
              <input
                name="document_title"
                placeholder="고객에게 표시될 긴 문서 제목을 입력하세요."
                value={documentTitle}
                className={errors.document_title ? "input-error" : ""}
                onChange={(event) => {
                  setDocumentTitle(event.target.value);
                  clearError("document_title");
                }}
                required
              />
              {errors.document_title ? (
                <span className="field-error-text">{errors.document_title}</span>
              ) : null}
            </label>
          </div>

          <div className="issue-form-row issue-form-row-1">
            <div className="field">
              <span className="field-label">본문</span>
              <LazyRichTextEditor
                name="content"
                defaultValue={editorContent}
                placeholder={
                  isEditMode
                    ? "현재 발급된 문서 본문을 수정할 수 있습니다."
                    : "문서 템플릿을 선택하면 본문이 여기에 불러와집니다."
                }
              />
            </div>
          </div>
        </div>

        <div className="form-actions admin-form-actions">
          <button type="submit">{isEditMode ? "문서 저장" : "문서 생성"}</button>
          <span className="pill-note">
            {isEditMode
              ? "서명 전 문서는 저장 후 바로 반영됩니다. 저장 후 필요하면 재발송 버튼으로 알림톡을 다시 보낼 수 있습니다."
              : "문서 발행 시 선택한 알림톡 템플릿으로 Bizgo 발송을 바로 시도합니다."}
          </span>
        </div>
      </form>

      <dialog
        ref={confirmDialogRef}
        className="issue-form-confirm-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closeConfirmDialog();
        }}
        onClick={handleConfirmBackdropClick}
      >
        <div className="issue-form-confirm-card">
          <div className="issue-form-confirm-badge">발급 전 확인</div>
          <div className="issue-form-confirm-title">고객 휴대폰번호를 다시 확인해 주세요</div>
          <div className="issue-form-confirm-copy">
            문서 링크와 알림톡이 아래 번호로 발송됩니다. 번호가 맞다면 그대로 발급하면 됩니다.
          </div>

          <div className="issue-form-confirm-summary">
            <div className="issue-form-confirm-item">
              <span>고객명</span>
              <strong>{confirmPayload?.customerName || "-"}</strong>
            </div>
            <div className="issue-form-confirm-item">
              <span>휴대폰번호</span>
              <strong>{confirmPayload?.recipientPhone || "-"}</strong>
            </div>
            <div className="issue-form-confirm-item">
              <span>문서 제목</span>
              <strong>{confirmPayload?.documentTitle || "-"}</strong>
            </div>
          </div>

          <div className="issue-form-confirm-actions">
            <button type="button" className="secondary" onClick={closeConfirmDialog}>
              취소
            </button>
            <button type="button" onClick={handleConfirmSubmit}>
              이대로 발급
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
