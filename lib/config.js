export const APP_NAME = "엘바노헤어 전자서명";

export const MASTER_KAKAO_ID = process.env.MASTER_KAKAO_ID || "1234567890";

export function getBaseUrl() {
  return process.env.PUBLIC_BASE_URL || "http://localhost:3000";
}

export function getBizgoSenderKey() {
  return requireEnv("BIZGO_SENDER_KEY");
}

export function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}
