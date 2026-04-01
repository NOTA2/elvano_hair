import { cookies } from "next/headers";
import { getDocumentByToken, signDocument } from "@/lib/db";
import { serializePublicDocument } from "@/lib/documents";
import { SignatureStorageError, uploadDocumentSignatureFile } from "@/lib/signatures";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const document = await getDocumentByToken(resolvedParams.token);

  if (!document) {
    return Response.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const verifiedValue = cookieStore.get(`verified_document_${document.token}`)?.value;

  if (verifiedValue !== document.phone_last4) {
    return Response.json(
      { error: "휴대폰 번호 확인 후 서명할 수 있습니다." },
      { status: 401 }
    );
  }

  if (document.status === "signed") {
    return Response.json({ document: serializePublicDocument(document) });
  }

  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ error: "서명 파일 업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  let signatureStoragePath = "";

  try {
    const formData = await request.formData();
    const signatureFile = formData.get("signature");

    if (!signatureFile || typeof signatureFile.arrayBuffer !== "function") {
      return Response.json({ error: "유효한 서명 파일이 아닙니다." }, { status: 400 });
    }

    signatureStoragePath = await uploadDocumentSignatureFile({
      token: document.token,
      file: signatureFile
    });
  } catch (error) {
    if (error instanceof SignatureStorageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "서명 이미지 저장에 실패했습니다." }, { status: 500 });
  }

  const signedDocument = await signDocument(document.token, signatureStoragePath);
  cookieStore.delete(`verified_document_${document.token}`);

  return Response.json({ document: serializePublicDocument(signedDocument) });
}
