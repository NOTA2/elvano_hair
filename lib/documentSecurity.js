import crypto from "node:crypto";
import { getDocumentPiiSecret } from "@/lib/config";
import { normalizePhoneDigits } from "@/lib/phone";

const ENCRYPTION_PREFIX = "encv1";
const IV_BYTE_LENGTH = 12;

function getSecretBuffer() {
  return Buffer.from(getDocumentPiiSecret(), "utf8");
}

function deriveKey(scope) {
  return crypto
    .createHash("sha256")
    .update(scope)
    .update("\0")
    .update(getSecretBuffer())
    .digest();
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hashValue(scope, value) {
  const normalizedValue = String(value || "");

  if (!normalizedValue) {
    return "";
  }

  return crypto
    .createHmac("sha256", deriveKey(`document-hash:${scope}`))
    .update(normalizedValue)
    .digest("hex");
}

export function encryptDocumentField(value) {
  const plainText = String(value || "");

  if (!plainText) {
    return "";
  }

  const iv = crypto.randomBytes(IV_BYTE_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey("document-encryption"), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptDocumentField(value) {
  const serialized = String(value || "");

  if (!serialized) {
    return "";
  }

  if (!serialized.startsWith(`${ENCRYPTION_PREFIX}.`)) {
    return serialized;
  }

  const [prefix, ivPart, authTagPart, encryptedPart] = serialized.split(".");

  if (!prefix || !ivPart || !authTagPart || !encryptedPart) {
    throw new Error("문서 개인정보 복호화 실패: 암호문 형식이 올바르지 않습니다.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey("document-encryption"),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function createDocumentCustomerNameHash(value) {
  return hashValue("customer_name", normalizeName(value));
}

export function createDocumentPhoneHash(value) {
  return hashValue("recipient_phone", normalizePhoneDigits(value));
}

export function createDocumentPhoneLast4Hash(value) {
  const digits = normalizePhoneDigits(value);
  return hashValue("phone_last4", digits.slice(-4));
}

