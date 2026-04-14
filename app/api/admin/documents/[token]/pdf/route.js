import { getRouteSession, isIntegratedMaster } from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import { getDocumentByToken } from "@/lib/db";
import { createSignedDocumentPdfBuffer } from "@/lib/documentPdf";

export const runtime = "nodejs";
export const maxDuration = 60;

function pdfDownloadHeaders(pdfName, pdfBuffer) {
  const encodedFileName = encodeURIComponent(pdfName);

  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="signed-document.pdf"; filename*=UTF-8''${encodedFileName}`,
    "Content-Length": String(pdfBuffer.length),
    "Cache-Control": "no-store"
  };
}

function errorResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(_request, { params }) {
  const session = await getRouteSession();

  if (!session) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const resolvedParams = await params;
  const token = String(resolvedParams?.token || "").trim();
  const document = token ? await getDocumentByToken(token) : null;

  if (!document) {
    return errorResponse("PDF를 생성할 문서를 찾을 수 없습니다.", 404);
  }

  if (!isIntegratedMaster(session) && Number(session.branch_id) !== Number(document.branch_id)) {
    return errorResponse("해당 문서의 PDF를 다운로드할 권한이 없습니다.", 403);
  }

  if (document.status !== "signed") {
    return errorResponse("서명 완료 문서만 PDF를 다운로드할 수 있습니다.", 400);
  }

  try {
    const { pdfBuffer, pdfName } = await createSignedDocumentPdfBuffer(document);
    return new Response(pdfBuffer, {
      status: 200,
      headers: pdfDownloadHeaders(pdfName, pdfBuffer)
    });
  } catch (error) {
    console.error("서명 문서 PDF 다운로드 생성 실패", error);
    return errorResponse("PDF 생성 중 오류가 발생했습니다.", 500);
  }
}
