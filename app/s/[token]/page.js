import SignatureClient from "@/components/SignatureClient";
import { getDocumentByToken } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicSignaturePage({ params }) {
  const document = await getDocumentByToken(params.token);

  if (!document) {
    notFound();
  }

  return <SignatureClient token={params.token} />;
}
