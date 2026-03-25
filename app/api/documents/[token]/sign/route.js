import { cookies } from "next/headers";
import { getDocumentByToken, signDocument } from "@/lib/db";
import { serializePublicDocument } from "@/lib/documents";

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

  const body = await request.json();

  if (!body.signatureDataUrl || !String(body.signatureDataUrl).startsWith("data:image/png")) {
    return Response.json({ error: "유효한 서명 데이터가 아닙니다." }, { status: 400 });
  }

  const signedDocument = await signDocument(document.token, body.signatureDataUrl);
  cookieStore.delete(`verified_document_${document.token}`);

  return Response.json({ document: serializePublicDocument(signedDocument) });
}
