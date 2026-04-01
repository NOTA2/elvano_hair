import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

const SIGNATURE_BUCKET = "document-signatures";
const MAX_SIGNATURE_FILE_SIZE = 1024 * 1024;
const ALLOWED_SIGNATURE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
let ensureSignatureBucketPromise = null;

export class SignatureStorageError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "SignatureStorageError";
    this.status = status;
  }
}

function extensionForMimeType(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function assertStorageNoError(error, fallback, status = 500) {
  if (!error) {
    return;
  }

  const message = error instanceof Error ? error.message : fallback;
  throw new SignatureStorageError(message || fallback, status);
}

async function ensureSignatureBucket() {
  if (!ensureSignatureBucketPromise) {
    ensureSignatureBucketPromise = (async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage.listBuckets();
      assertStorageNoError(error, "서명 이미지 버킷을 확인하지 못했습니다.");

      const hasBucket = (data || []).some(
        (bucket) => bucket?.id === SIGNATURE_BUCKET || bucket?.name === SIGNATURE_BUCKET
      );

      if (hasBucket) {
        return;
      }

      const { error: createError } = await supabase.storage.createBucket(SIGNATURE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIGNATURE_FILE_SIZE,
        allowedMimeTypes: Array.from(ALLOWED_SIGNATURE_MIME_TYPES)
      });

      if (
        createError &&
        !String(createError.message || "")
          .toLowerCase()
          .includes("already exists")
      ) {
        assertStorageNoError(createError, "서명 이미지 버킷을 생성하지 못했습니다.");
      }
    })().catch((error) => {
      ensureSignatureBucketPromise = null;
      throw error;
    });
  }

  return await ensureSignatureBucketPromise;
}

async function uploadSignatureBuffer({ token, buffer, contentType }) {
  await ensureSignatureBucket();

  const normalizedContentType = ALLOWED_SIGNATURE_MIME_TYPES.has(contentType)
    ? contentType
    : "image/jpeg";

  const storagePath = `${token}/${Date.now()}-${crypto.randomUUID()}.${extensionForMimeType(
    normalizedContentType
  )}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(SIGNATURE_BUCKET).upload(storagePath, buffer, {
    contentType: normalizedContentType,
    cacheControl: "31536000",
    upsert: false
  });

  assertStorageNoError(error, "서명 이미지를 업로드하지 못했습니다.");
  return storagePath;
}

export async function uploadDocumentSignatureFile({ token, file }) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new SignatureStorageError("유효한 서명 파일이 아닙니다.", 400);
  }

  if (!ALLOWED_SIGNATURE_MIME_TYPES.has(file.type)) {
    throw new SignatureStorageError("서명 이미지는 JPG, PNG, WebP 형식만 업로드할 수 있습니다.", 400);
  }

  if (file.size <= 0) {
    throw new SignatureStorageError("비어 있는 서명 파일은 저장할 수 없습니다.", 400);
  }

  if (file.size > MAX_SIGNATURE_FILE_SIZE) {
    throw new SignatureStorageError("압축된 서명 파일이 너무 큽니다. 다시 서명해 주세요.", 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  return await uploadSignatureBuffer({
    token,
    buffer: Buffer.from(arrayBuffer),
    contentType: file.type
  });
}

export function getDocumentSignatureUrl(signatureStoragePath) {
  const normalized = String(signatureStoragePath || "").trim();

  if (!normalized) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data } = supabase.storage.from(SIGNATURE_BUCKET).getPublicUrl(normalized);
  return data?.publicUrl || null;
}
