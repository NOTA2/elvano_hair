import { getBaseUrl, requireEnv } from "@/lib/config";

export async function GET() {
  const clientId = requireEnv("KAKAO_REST_API_KEY");
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${getBaseUrl()}/api/auth/kakao/callback`;

  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");

  return Response.redirect(url.toString(), 302);
}

