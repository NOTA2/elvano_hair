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

function statusClass(status) {
  if (status === "signed") return "signed";
  if (status === "failed") return "failed";
  return "pending";
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const branchId = isBranchMaster(session) ? session.branch_id : undefined;
  const templates = await listTemplates({ branchId });
  const documents = await listDocuments({ branchId });
  const admins = await listAdminUsers({ branchId });
  const branches = await listBranches({ branchId });
  const designers = await listDesigners({ branchId });
  const signedCount = documents.filter((item) => item.status === "signed").length;
  const pendingCount = documents.filter((item) => item.status === "pending").length;
  const signRate = documents.length === 0 ? 0 : Math.round((signedCount / documents.length) * 100);
  const recentDocuments = documents.slice(0, 4);

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Dashboard</div>
            <h2 className="panel-title">운영 현황을 빠르게 확인</h2>
            <p className="panel-copy">
              {session.branch_name ? `${session.branch_name} 지점` : "전체 지점"} 기준으로
              최근 문서 발급, 서명 완료율, 관리자 구성을 한 번에 확인할 수 있습니다.
            </p>
          </div>
          <div className="panel-kpi-row">
            <span className="metric-pill">서명 완료율 {signRate}%</span>
            <span className="metric-pill">대기 문서 {pendingCount}</span>
          </div>
        </div>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-label">템플릿</span>
            <div className="stat-value">{templates.length}</div>
            <div className="stat-meta">활성 운영 문서 소스</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">발급 문서</span>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-meta">누적 전자서명 요청</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">서명 완료</span>
            <div className="stat-value">{signedCount}</div>
            <div className="stat-meta">고객 확인 완료 문서</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">지점</span>
            <div className="stat-value">{branches.length}</div>
            <div className="stat-meta">현재 관리 범위</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">디자이너</span>
            <div className="stat-value">{designers.length}</div>
            <div className="stat-meta">발급 가능한 담당자</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">관리자</span>
            <div className="stat-value">{admins.length}</div>
            <div className="stat-meta">현재 권한 보유 계정</div>
          </div>
        </div>
      </section>

      <div className="admin-two-column">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Operating Notes</div>
              <h2 className="panel-title">운영 포인트</h2>
            </div>
          </div>
          <div className="mini-list">
            <div className="mini-list-item">
              <div className="mini-list-title">공개 링크 보호</div>
              <div className="mini-list-copy">
                고객은 휴대폰 뒷자리 4자리를 통과해야 문서 본문과 서명 캔버스를 볼 수
                있습니다.
              </div>
            </div>
            <div className="mini-list-item">
              <div className="mini-list-title">권한 경계 유지</div>
              <div className="mini-list-copy">
                지점 마스터는 자기 지점의 지점/디자이너/템플릿/문서만 관리하고, 일반
                어드민은 문서 발급과 조회만 수행합니다.
              </div>
            </div>
            <div className="mini-list-item">
              <div className="mini-list-title">발송 실패 처리</div>
              <div className="mini-list-copy">
                Bizgo 발송이 실패해도 문서 자체는 유지되며, 발송 상태만 별도로
                기록합니다.
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Recent Activity</div>
              <h2 className="panel-title">최근 발급 문서</h2>
            </div>
          </div>
          {recentDocuments.length === 0 ? (
            <div className="empty-state">최근 발급 문서가 없습니다.</div>
          ) : (
            <div className="stack-list">
              {recentDocuments.map((document) => (
                <div key={document.id} className="record-card compact">
                  <div className="record-head">
                    <div>
                      <div className="record-title">{document.document_title}</div>
                      <div className="record-meta">
                        {document.branch_name} · {document.customer_name} · {document.designer_name}
                      </div>
                    </div>
                    <span className={`badge ${statusClass(document.status)}`}>
                      {document.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
