import { canAccessAdmin, createAdminSession } from "@/lib/auth";
import { getBaseUrl, requireEnv } from "@/lib/config";
import { recordLoginAttempt } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const clientId = requireEnv("KAKAO_REST_API_KEY");
  const clientSecret = process.env.KAKAO_CLIENT_SECRET || "";
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${getBaseUrl()}/api/auth/kakao/callback`;

  const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      client_secret: clientSecret
    }).toString(),
    cache: "no-store"
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    },
    cache: "no-store"
  });

  const profile = await profileResponse.json();
  const kakaoUserId = String(profile.id || "");
  const nickname = profile.properties?.nickname || "";
  const access = await canAccessAdmin(kakaoUserId);
  await recordLoginAttempt({
    kakao_user_id: kakaoUserId,
    nickname,
    status: access.allowed ? "allowed" : "blocked"
  });

  if (!access.allowed) {
    return Response.redirect(`${getBaseUrl()}/admin/login?error=pending_approval`, 302);
  }

  await createAdminSession({
    kakaoUserId,
    nickname,
    isMaster: access.isMaster,
    role: access.role,
    branchId: access.branchId
  });

  return Response.redirect(`${getBaseUrl()}/admin`, 302);
}
