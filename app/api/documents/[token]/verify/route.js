import { cookies } from "next/headers";
import { getDocumentByToken, markDocumentViewed } from "@/lib/db";
import { serializePublicDocument } from "@/lib/documents";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const document = await getDocumentByToken(resolvedParams.token);

  if (!document) {
    return Response.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json();

  if (String(body.phoneLast4) !== String(document.phone_last4)) {
    return Response.json(
      { error: "휴대폰 뒷자리 정보가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  await markDocumentViewed(document.token);
  const cookieStore = await cookies();
  cookieStore.set(`verified_document_${document.token}`, document.phone_last4, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return Response.json({
    document: serializePublicDocument(document)
  });
}
