"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import AdminDocumentIssueFormPlaceholder from "@/components/AdminDocumentIssueFormPlaceholder";

const AdminDocumentIssueForm = dynamic(() => import("@/components/AdminDocumentIssueForm"), {
  ssr: false,
  loading: () => <AdminDocumentIssueFormPlaceholder />
});

function buildFormDataUrl({ mode, documentToken }) {
  const params = new URLSearchParams();
  params.set("mode", mode === "edit" ? "edit" : "create");

  if (documentToken) {
    params.set("token", documentToken);
  }

  return `/api/admin/documents/form?${params.toString()}`;
}

export default function LazyAdminDocumentIssueForm({
  mode = "create",
  documentToken = "",
  ...restProps
}) {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setError("");
      setFormData(null);

      try {
        const response = await fetch(buildFormDataUrl({ mode, documentToken }), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "문서 폼 정보를 불러오지 못했습니다.");
        }

        setFormData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "문서 폼 정보를 불러오지 못했습니다."
        );
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [documentToken, mode, retryKey]);

  if (!formData) {
    if (error) {
      return (
        <div className="section-stack">
          <div className="empty-state">{error}</div>
          <div className="form-actions admin-form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setRetryKey((current) => current + 1);
              }}
            >
              다시 불러오기
            </button>
          </div>
        </div>
      );
    }

    return <AdminDocumentIssueFormPlaceholder />;
  }

  return (
    <AdminDocumentIssueForm
      {...restProps}
      mode={mode}
      initialDocument={formData.initialDocument || null}
      branches={formData.branches || []}
      designers={formData.designers || []}
      documentTemplates={formData.documentTemplates || []}
      notificationTemplates={formData.notificationTemplates || []}
    />
  );
}
