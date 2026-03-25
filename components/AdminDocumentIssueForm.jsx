"use client";

import { useEffect, useMemo, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import SelectField from "@/components/SelectField";
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

export default function AdminDocumentIssueForm({
  branchLocked = false,
  branchId,
  branchName,
  branches,
  designers,
  documentTemplates,
  notificationTemplates
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(branchId ? String(branchId) : "");
  const [selectedDesignerId, setSelectedDesignerId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedNotificationTemplateId, setSelectedNotificationTemplateId] = useState("");
  const [sendAlimtalk, setSendAlimtalk] = useState("1");
  const [editorContent, setEditorContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(getTodayKst());
  const [errors, setErrors] = useState({});

  const filteredDesigners = useMemo(() => {
    if (!selectedBranchId) {
      return [];
    }

    return designers.filter(
      (designer) => String(designer.branch_id) === String(selectedBranchId)
    );
  }, [designers, selectedBranchId]);

  useEffect(() => {
    if (
      selectedDesignerId &&
      !filteredDesigners.some((designer) => String(designer.id) === selectedDesignerId)
    ) {
      setSelectedDesignerId("");
    }
  }, [filteredDesigners, selectedDesignerId]);

  useEffect(() => {
    if (sendAlimtalk !== "1" && errors.notification_template_id) {
      setErrors((current) => {
        const next = { ...current };
        delete next.notification_template_id;
        return next;
      });
    }
  }, [errors.notification_template_id, sendAlimtalk]);

  useEffect(() => {
    const template = documentTemplates.find(
      (item) => String(item.id) === String(selectedTemplateId)
    );

    setEditorContent(normalizeTemplateContent(template?.content || ""));
    setDocumentTitle(String(template?.document_title || template?.name || ""));
  }, [documentTemplates, selectedTemplateId]);

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
    const recipientPhone = String(formData.get("recipient_phone") || "").replace(/\D/g, "");
    const documentTitle = String(formData.get("document_title") || "").trim();

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
    } else if (recipientPhone.length < 8) {
      nextErrors.recipient_phone = "휴대폰번호를 정확히 입력해야 합니다.";
    }

    if (!documentDate) {
      nextErrors.document_date = "날짜를 입력해야 합니다.";
    }

    if (!selectedTemplateId) {
      nextErrors.template_id = "문서 템플릿을 선택해야 합니다.";
    }

    if (sendAlimtalk === "1" && !selectedNotificationTemplateId) {
      nextErrors.notification_template_id = "알림톡 템플릿을 선택해야 합니다.";
    }

    if (!documentTitle) {
      nextErrors.document_title = "문서 제목을 입력해야 합니다.";
    }

    return nextErrors;
  }

  return (
    <form
      action="/api/admin/documents"
      method="post"
      onSubmit={(event) => {
        const nextErrors = validateForm(new FormData(event.currentTarget));

        if (Object.keys(nextErrors).length > 0) {
          event.preventDefault();
          setErrors(nextErrors);
        }
      }}
    >
      <input type="hidden" name="intent" value="create" />
      <div className="issue-form-layout">
        <div className="issue-form-row issue-form-row-2">
        {branchLocked ? (
          <>
            <input type="hidden" name="branch_id" value={selectedBranchId} />
            <label className="field">
              <span className="field-label">지점</span>
                <input value={branchName || ""} disabled readOnly />
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
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
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
                  {designer.name}
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

        <div className="issue-form-row issue-form-row-3">
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
              {notificationTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.template_name} ({template.template_code})
                </option>
              ))}
            </SelectField>
            {errors.notification_template_id ? (
              <span className="field-error-text">{errors.notification_template_id}</span>
            ) : null}
          </label>

          <label className="field">
            <span className="field-label">알림톡 즉시 발송 여부</span>
            <SelectField
              name="send_alimtalk"
              value={sendAlimtalk}
              onChange={(event) => {
                setSendAlimtalk(String(event.target.value || "1"));
              }}
            >
              <option value="1">예</option>
              <option value="0">아니오</option>
            </SelectField>
          </label>
        </div>

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
            <RichTextEditor
              name="content"
              defaultValue={editorContent}
              placeholder="문서 템플릿을 선택하면 본문이 여기에 불러와집니다."
            />
          </div>
        </div>
      </div>
      <div className="form-actions admin-form-actions">
        <button type="submit">문서 생성</button>
        <span className="pill-note">
          알림톡 즉시 발송을 켜면 선택한 알림톡 템플릿으로 Bizgo 발송을 시도합니다.
        </span>
      </div>
    </form>
  );
}
