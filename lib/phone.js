import googleLibPhoneNumber from "google-libphonenumber";

const { PhoneNumberFormat, PhoneNumberType, PhoneNumberUtil } = googleLibPhoneNumber;

const KR_REGION = "KR";
const phoneUtil = PhoneNumberUtil.getInstance();

function toDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatPhoneFallback(value) {
  const digits = toDigits(value);

  if (!digits) {
    return "-";
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

function parseKoreanPhone(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = phoneUtil.parseAndKeepRawInput(rawValue, KR_REGION);

    if (!phoneUtil.isValidNumberForRegion(parsed, KR_REGION)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function normalizePhoneDigits(value) {
  return toDigits(value);
}

export function isValidKoreanMobilePhone(value) {
  const parsed = parseKoreanPhone(value);

  if (!parsed) {
    return false;
  }

  return phoneUtil.getNumberType(parsed) === PhoneNumberType.MOBILE;
}

export function normalizeKoreanMobilePhone(value) {
  const parsed = parseKoreanPhone(value);

  if (!parsed || phoneUtil.getNumberType(parsed) !== PhoneNumberType.MOBILE) {
    return toDigits(value);
  }

  return toDigits(phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL));
}

export function formatKoreanPhoneNumber(value) {
  const parsed = parseKoreanPhone(value);

  if (!parsed) {
    return formatPhoneFallback(value);
  }

  return phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL);
}
