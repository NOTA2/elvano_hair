import {
  getRouteSession,
  isIntegratedMaster
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  getDocumentByToken,
  listBranches,
  listDesigners,
  listNotificationTemplates,
  listTemplates
} from "@/lib/db";
import { isDocumentExpired } from "@/lib/documents";

export async function GET(request) {
  const session = await getRouteSession();

  if (!session) {
    return Response.json(
      { error: "로그인이 필요합니다.", redirectTo: `${getBaseUrl()}/admin/login` },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = String(searchParams.get("mode") || "create").trim();
  const token = String(searchParams.get("token") || "").trim();
  const integratedMaster = isIntegratedMaster(session);
  const branchScopeId = integratedMaster ? undefined : session.branch_id || undefined;
  const sharedCollectionsPromise = Promise.all([
    listBranches({ activeOnly: true, branchId: branchScopeId }),
    listDesigners({ activeOnly: true, branchId: branchScopeId }),
    listTemplates({ activeOnly: true }),
    listNotificationTemplates({ activeOnly: true })
  ]);

  if (mode !== "edit") {
    const [branches, designers, documentTemplates, notificationTemplates] =
      await sharedCollectionsPromise;

    return Response.json({
      branches,
      designers,
      documentTemplates,
      notificationTemplates
    });
  }

  if (!token) {
    return Response.json({ error: "수정할 문서 토큰이 필요합니다." }, { status: 400 });
  }

  const [
    document,
    [branches, designers, documentTemplates, notificationTemplates]
  ] = await Promise.all([getDocumentByToken(token), sharedCollectionsPromise]);

  if (!document) {
    return Response.json({ error: "수정할 문서를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!integratedMaster && Number(session.branch_id) !== Number(document.branch_id)) {
    return Response.json({ error: "해당 문서를 수정할 권한이 없습니다." }, { status: 403 });
  }

  if (document.status === "signed") {
    return Response.json(
      { error: "서명 완료된 문서는 수정할 수 없습니다." },
      { status: 409 }
    );
  }

  if (isDocumentExpired(document)) {
    return Response.json(
      { error: "서명 기한이 지난 문서는 수정할 수 없습니다." },
      { status: 409 }
    );
  }

  return Response.json({
    initialDocument: document,
    branches,
    designers,
    documentTemplates,
    notificationTemplates
  });
}
