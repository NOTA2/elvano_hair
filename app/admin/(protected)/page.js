import {
  isBranchMaster,
  requireAdminSession
} from "@/lib/auth";
import {
  listAdminUsers,
  listBranches,
  listDesigners,
  listDocuments,
  listTemplates
} from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const branchId = isBranchMaster(session) ? session.branch_id : undefined;
  const templates = await listTemplates({ branchId });
  const documents = await listDocuments({ branchId });
  const admins = await listAdminUsers({ branchId });
  const branches = await listBranches({ branchId });
  const designers = await listDesigners({ branchId });
  const signedCount = documents.filter((item) => item.status === "signed").length;

  return (
    <div>
      <section className="panel">
        <h2>현황</h2>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">템플릿</span>
            <div className="stat-value">{templates.length}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">발급 문서</span>
            <div className="stat-value">{documents.length}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">서명 완료</span>
            <div className="stat-value">{signedCount}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">지점</span>
            <div className="stat-value">{branches.length}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">디자이너</span>
            <div className="stat-value">{designers.length}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">관리자</span>
            <div className="stat-value">{admins.length}</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>운영 메모</h2>
        <div className="cards-3">
          <div className="info-card">
            <span className="field-label">공개 링크 보호</span>
            <strong>휴대폰 뒷자리 4자리 확인 후 문서 노출</strong>
          </div>
          <div className="info-card">
            <span className="field-label">권한 체계</span>
            <strong>통합 마스터 / 지점 마스터 / 일반 어드민</strong>
          </div>
          <div className="info-card">
            <span className="field-label">알림톡 연동</span>
            <strong>Bizgo 템플릿 코드와 발신키를 템플릿별 저장</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
