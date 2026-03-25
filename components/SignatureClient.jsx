"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeTemplateContent } from "@/lib/templateContent";

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = Math.max(rect.height, 280) * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#222";
}

function bypassMessage(reason) {
  if (reason === "admin") {
    return "관리자 열람 모드입니다. 휴대폰 번호 확인 없이 전체 문서를 바로 확인할 수 있습니다.";
  }

  if (reason === "signed") {
    return "서명이 완료된 문서입니다. 휴대폰 번호 입력 없이 최종 문서와 서명을 바로 확인할 수 있습니다.";
  }

  return "";
}

export default function SignatureClient({
  token,
  initialDocument = null,
  initialReadOnly = false,
  bypassReason = null
}) {
  const [step, setStep] = useState(initialDocument ? "document" : "verify");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(bypassMessage(bypassReason));
  const [documentData, setDocumentData] = useState(initialDocument);
  const [isSaving, setIsSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (step !== "document" || isReadOnly || !canvasRef.current) {
      return;
    }

    resizeCanvas(canvasRef.current);
  }, [step, isReadOnly]);

  function getPosition(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] : event;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top
    };
  }

  function startDraw(event) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  }

  function draw(event) {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function verifyPhone(event) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/documents/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneLast4 })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "휴대폰 번호 확인에 실패했습니다.");
      return;
    }

    setDocumentData(data.document);
    setIsReadOnly(false);
    setNotice("");
    setStep("document");
  }

  async function saveSignature() {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    setError("");
    setIsSaving(true);

    const response = await fetch(`/api/documents/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl: dataUrl })
    });

    const data = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(data.error || "서명 저장에 실패했습니다.");
      return;
    }

    setDocumentData(data.document);
    setIsReadOnly(true);
    setNotice("서명이 저장되었습니다. 아래에서 최종 문서와 서명을 바로 확인할 수 있습니다.");
    setStep("document");
  }

  if (step === "verify") {
    return (
      <div className="doc-page">
        <div className="verify-box hero-card">
          <div className="brand-kicker">Signature Link</div>
          <h1 className="verify-title">휴대폰 번호 확인</h1>
          <p className="muted">휴대폰 뒷자리 4자리를 입력해주세요.</p>
          <form onSubmit={verifyPhone}>
            <input
              className="verify-input"
              inputMode="numeric"
              maxLength={4}
              value={phoneLast4}
              onChange={(event) => {
                setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4));
              }}
            />
            <div style={{ marginTop: 18 }}>
              <button type="submit">확인</button>
            </div>
          </form>
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        </div>
      </div>
    );
  }

  if (!documentData) {
    return null;
  }

  return (
    <div className="doc-page">
      <div className="doc-shell">
        {notice ? <div className="doc-notice">{notice}</div> : null}

        <div className="doc-header">
          <div className="doc-branch">엘바노헤어 {documentData.branch_name}</div>
          <h1 className="doc-title">{documentData.document_title}</h1>
        </div>

        <div className="doc-date">{documentData.document_date}</div>

        <div className="doc-info-grid">
          <div className="info-card">
            <span className="field-label">고객 이름</span>
            <strong>{documentData.customer_name}</strong>
          </div>
          <div className="info-card">
            <span className="field-label">휴대폰 뒷자리</span>
            <strong>{documentData.phone_last4}</strong>
          </div>
          <div className="info-card">
            <span className="field-label">담당 디자이너</span>
            <strong>{documentData.designer_name}</strong>
          </div>
        </div>

        <div
          className="doc-content"
          dangerouslySetInnerHTML={{
            __html: normalizeTemplateContent(documentData.rendered_content)
          }}
        />

        <div className="doc-consent">
          담당자로부터 위 내용에 대하여 충분히 설명을 들었으며, 위 내용에 동의합니다.
          <div style={{ marginTop: 18 }}>
            이름 : {documentData.customer_name}
          </div>
        </div>

        <div className="signature-wrap">
          <h2 style={{ textAlign: "center", fontSize: "44px" }}>
            {documentData.signature_data_url ? "서명 확인" : "서명하기"}
          </h2>

          {isReadOnly ? (
            <div className="signature-readonly">
              {documentData.signature_data_url ? (
                <>
                  <img
                    className="signature-preview"
                    src={documentData.signature_data_url}
                    alt="고객 서명"
                  />
                  {documentData.signed_at ? (
                    <div className="signature-meta">
                      서명 완료일 {String(documentData.signed_at).slice(0, 10)}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="signature-empty-state">
                  아직 고객 서명이 저장되지 않은 문서입니다.
                </div>
              )}
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="signature-canvas"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <div className="signature-actions">
                <button className="secondary" type="button" onClick={clearSignature}>
                  전체 지우기
                </button>
                <button type="button" onClick={saveSignature} disabled={isSaving}>
                  {isSaving ? "저장 중..." : "서명 저장"}
                </button>
              </div>
            </>
          )}

          {error ? (
            <p style={{ color: "var(--danger)", textAlign: "center" }}>{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
