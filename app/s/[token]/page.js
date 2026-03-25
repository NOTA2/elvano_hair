import SignatureClient from "@/components/SignatureClient";
import { getCurrentSession } from "@/lib/auth";
import { getDocumentByToken } from "@/lib/db";
import { serializePublicDocument } from "@/lib/documents";
import { notFound } from "next/navigation";

export default async function PublicSignaturePage({ params }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  const document = await getDocumentByToken(token);
  const session = await getCurrentSession();

  if (!document) {
    notFound();
  }

  const isAdminViewer = Boolean(session);
  const canBypassVerification = isAdminViewer || document.status === "signed";
  const bypassReason = isAdminViewer ? "admin" : document.status === "signed" ? "signed" : null;

  return (
    <SignatureClient
      token={token}
      initialDocument={canBypassVerification ? serializePublicDocument(document) : null}
      initialReadOnly={canBypassVerification}
      bypassReason={bypassReason}
    />
  );
}
