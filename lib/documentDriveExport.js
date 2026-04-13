import { createDrivePdfFromHtml, getGoogleDriveFolderId, isGoogleDriveExportConfigured } from "@/lib/googleDrive";
import {
  markDocumentPdfExportFailed,
  markDocumentPdfExportProcessing,
  markDocumentPdfExportSkipped,
  markDocumentPdfExportUploaded
} from "@/lib/db";
import { getDocumentSignatureUrl } from "@/lib/signatures";
import { normalizeTemplateContent, sanitizeTemplateContent } from "@/lib/templateContent";

const CONSENT_TEXT = "위 문서 내용에 대해 숙지하였으며, 위 내용에 동의합니다.";
const MAX_ERROR_MESSAGE_LENGTH = 1000;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFileNamePart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateForFileName(value, maxLength = 120) {
  const normalized = sanitizeFileNamePart(value);
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function buildPdfFileName(document) {
  const parts = [
    document.document_date,
    document.branch_name,
    document.customer_name,
    document.document_title
  ]
    .map((part) => sanitizeFileNamePart(part))
    .filter(Boolean);

  return `${truncateForFileName(parts.join("_") || `signed-document-${document.token}`)}.pdf`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function normalizeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "알 수 없는 오류");
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

async function fetchImageDataUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`서명 이미지 다운로드 실패: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";

  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("서명 이미지 형식이 올바르지 않습니다.");
  }

  const arrayBuffer = await response.arrayBuffer();
  return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
}

function buildSummaryRow(label, value) {
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function buildSignedDocumentHtml(document, signatureDataUrl) {
  const safeContent = sanitizeTemplateContent(normalizeTemplateContent(document.rendered_content));

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.document_title || "서명 문서")}</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        color: #111a32;
        background: #ffffff;
        font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        font-size: 14px;
        line-height: 1.7;
      }

      .document {
        max-width: 760px;
        margin: 0 auto;
      }

      .branch {
        color: #587fa4;
        font-size: 13px;
        font-weight: 700;
      }

      h1 {
        margin: 8px 0 24px;
        font-size: 28px;
        line-height: 1.3;
      }

      .summary {
        width: 100%;
        margin: 0 0 26px;
        border-collapse: collapse;
      }

      .summary th,
      .summary td {
        padding: 9px 12px;
        border: 1px solid #dfe5eb;
        text-align: left;
        vertical-align: top;
      }

      .summary th {
        width: 130px;
        color: #566274;
        background: #f5f8fb;
      }

      .content {
        padding-top: 6px;
      }

      .content p {
        margin: 0 0 12px;
      }

      .content h1,
      .content h2,
      .content h3 {
        margin: 18px 0 10px;
        line-height: 1.35;
      }

      .content ul,
      .content ol {
        margin: 0 0 12px 24px;
        padding: 0;
      }

      .content table {
        width: 100%;
        margin: 16px 0;
        border-collapse: collapse;
      }

      .content th,
      .content td {
        padding: 8px 10px;
        border: 1px solid #dfe5eb;
      }

      .content img {
        max-width: 100%;
        height: auto;
      }

      .consent,
      .signature {
        margin-top: 28px;
        padding: 18px;
        border: 1px solid #dfe5eb;
        background: #f8fafc;
      }

      .consent-name,
      .signature-meta {
        margin-top: 10px;
        color: #566274;
        font-weight: 700;
      }

      .signature-title {
        margin: 0 0 12px;
        font-size: 16px;
        font-weight: 800;
      }

      .signature img {
        display: block;
        max-width: 360px;
        max-height: 160px;
        background: #ffffff;
        border: 1px solid #e5e9ef;
      }
    </style>
  </head>
  <body>
    <main class="document">
      <header>
        <div class="branch">엘바노헤어 ${escapeHtml(document.branch_name || "")}</div>
        <h1>${escapeHtml(document.document_title || "서명 문서")}</h1>
      </header>

      <table class="summary">
        <tbody>
          ${buildSummaryRow("성함", document.customer_name)}
          ${buildSummaryRow("연락처", document.recipient_phone || document.phone_last4)}
          ${buildSummaryRow("일자", document.document_date)}
          ${buildSummaryRow("담당 디자이너", document.designer_name)}
          ${buildSummaryRow("서명 완료일", formatDateTime(document.signed_at))}
        </tbody>
      </table>

      <section class="content">
        ${safeContent}
      </section>

      <section class="consent">
        ${escapeHtml(CONSENT_TEXT)}
        <div class="consent-name">이름 : ${escapeHtml(document.customer_name || "-")}</div>
      </section>

      <section class="signature">
        <div class="signature-title">서명 확인</div>
        ${
          signatureDataUrl
            ? `<img src="${signatureDataUrl}" alt="고객 서명" />`
            : `<div>저장된 서명 이미지가 없습니다.</div>`
        }
        <div class="signature-meta">서명 완료일 ${escapeHtml(formatDateTime(document.signed_at))}</div>
      </section>
    </main>
  </body>
</html>`;
}

export async function exportSignedDocumentPdfToDrive(document) {
  if (!document?.token || document.status !== "signed") {
    return { skipped: true, reason: "서명 완료 문서가 아닙니다." };
  }

  if (!isGoogleDriveExportConfigured()) {
    await markDocumentPdfExportSkipped(
      document.token,
      "Google Drive PDF 업로드 환경변수가 설정되지 않았습니다."
    );
    return { skipped: true, reason: "missing_configuration" };
  }

  await markDocumentPdfExportProcessing(document.token);

  try {
    const signatureUrl = getDocumentSignatureUrl(document.signature_storage_path);
    const signatureDataUrl = await fetchImageDataUrl(signatureUrl);
    const pdfName = buildPdfFileName(document);
    const html = buildSignedDocumentHtml(document, signatureDataUrl);
    const driveFile = await createDrivePdfFromHtml({
      html,
      pdfName,
      folderId: getGoogleDriveFolderId()
    });
    const fileUrl =
      driveFile.webViewLink ||
      driveFile.webContentLink ||
      `https://drive.google.com/file/d/${driveFile.id}/view`;

    await markDocumentPdfExportUploaded(document.token, {
      fileId: driveFile.id,
      fileUrl
    });

    return {
      fileId: driveFile.id,
      fileUrl
    };
  } catch (error) {
    await markDocumentPdfExportFailed(document.token, normalizeErrorMessage(error));
    throw error;
  }
}

export async function exportSignedDocumentPdfToDriveSafely(document) {
  try {
    return await exportSignedDocumentPdfToDrive(document);
  } catch (error) {
    console.error("서명 문서 PDF Google Drive 업로드 실패", error);
    return null;
  }
}
