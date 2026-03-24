import { clearAdminSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";

export async function POST() {
  await clearAdminSession();
  return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
}

