import { createDrivePdfFromHtml, getGoogleDriveFolderId, isGoogleDriveExportConfigured } from "@/lib/googleDrive";
import {
  markDocumentPdfExportFailed,
  markDocumentPdfExportProcessing,
  markDocumentPdfExportSkipped,
  markDocumentPdfExportUploaded
} from "@/lib/db";
import { buildSignedDocumentPdfPayload } from "@/lib/documentPdf";

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export function getDocumentPdfExportErrorMessage(error) {
  const reason =
    error?.response?.data?.error?.errors?.[0]?.reason ||
    error?.cause?.errors?.[0]?.reason ||
    "";
  const message = error instanceof Error ? error.message : String(error || "알 수 없는 오류");

  if (reason === "storageQuotaExceeded" || message.includes("storage quota")) {
    return "Google Drive 저장공간 할당량을 초과했습니다. Shared Drive 폴더를 사용하거나 Google Workspace 도메인 위임 사용자를 설정해야 합니다.";
  }

  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function summarizeError(error) {
  return {
    message: getDocumentPdfExportErrorMessage(error),
    status: error?.status || error?.code || null,
    reason:
      error?.response?.data?.error?.errors?.[0]?.reason ||
      error?.cause?.errors?.[0]?.reason ||
      null
  };
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
    const { html, pdfName } = await buildSignedDocumentPdfPayload(document);
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
    await markDocumentPdfExportFailed(document.token, getDocumentPdfExportErrorMessage(error));
    throw error;
  }
}

export async function exportSignedDocumentPdfToDriveSafely(document) {
  try {
    return await exportSignedDocumentPdfToDrive(document);
  } catch (error) {
    console.error("서명 문서 PDF Google Drive 업로드 실패", summarizeError(error));
    return null;
  }
}
