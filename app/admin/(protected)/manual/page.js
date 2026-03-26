import Link from "next/link";
import AdminSectionIntro from "@/components/AdminSectionIntro";
import ReadableText from "@/components/ReadableText";
import { requireAdminSession } from "@/lib/auth";
import { TEMPLATE_VARIABLES } from "@/lib/templateVariables";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE
} from "@/lib/roles";

const BIZGO_TEMPLATE_CONSOLE_URL =
  "https://www.bizgo.io/console/team/2815/kakao/template/alimtalk";

const STEP_LIST = [
  {
    number: "1",
    title: "지점을 먼저 등록하세요",
    description: (
      <>
        서명 문서를 보낼 때 어느 지점에서 보낸 문서인지 표시해야 합니다.
        <br />
        지점명이 먼저 있어야 이후 작업을 같은 기준으로 맞출 수 있습니다.
        <br />
        지점 전화번호도 꼭 함께 등록해 주세요.
        <br />
        전화번호는 031-1234-5678처럼 -를 넣어 저장하면 알림톡과 안내문에 더
        깔끔하게 표시됩니다.
      </>
    ),
    href: "/admin/branches",
    cta: "지점 관리 열기"
  },
  {
    number: "2",
    title: "디자이너를 등록하세요",
    description: (
      <>
        디자이너 이름을 미리 등록해 두면 서명 문서를 만들 때 목록에서 바로 선택할 수
        있습니다.
        <br />
        그때그때 직접 입력하면 작은 오타만 있어도 문서마다 이름이 다르게 보일 수
        있고, 계약서의 신뢰감도 떨어질 수 있습니다.
      </>
    ),
    href: "/admin/designers",
    cta: "디자이너 관리 열기"
  },
  {
    number: "3",
    title: "Bizgo에서 알림톡 템플릿을 만드세요",
    description: (
      <>
        고객에게 카카오톡으로 보낼 안내 메시지는 Bizgo에서 먼저 만들어야 합니다.
        <br />
        아래 자동 입력 문구 안내를 참고하면 지점명, 고객명, 문서 제목 같은 내용을
        메시지에 자연스럽게 넣을 수 있습니다.
      </>
    ),
    href: BIZGO_TEMPLATE_CONSOLE_URL,
    cta: "Bizgo 콘솔 열기",
    external: true
  },
  {
    number: "4",
    title: "Bizgo에서 검수 요청을 하세요",
    description: (
      <>
        알림톡 템플릿을 만든 뒤에는 꼭 검수 요청까지 해야 합니다.
        <br />
        검수가 완료되어야 실제 고객에게 정상적으로 발송할 수 있습니다.
      </>
    ),
    href: BIZGO_TEMPLATE_CONSOLE_URL,
    cta: "검수 요청하러 가기",
    external: true,
    emphasize: "검수 완료가 필요합니다"
  },
  {
    number: "5",
    title: "우리 페이지에 알림톡 코드를 등록하세요",
    description: (
      <>
        Bizgo에서 알림톡 템플릿을 저장하면 각 템플릿마다 구분용 코드가 생깁니다.
        <br />
        우리 페이지에서는 그 코드를 등록해서 어떤 알림톡을 보낼지 연결합니다.
      </>
    ),
    href: "/admin/notification-templates",
    cta: "알림톡 템플릿 열기",
    emphasize: "코드를 꼭 확인하세요"
  },
  {
    number: "6",
    title: "문서 템플릿을 등록하세요",
    description: (
      <>
        문서 템플릿은 고객이 실제로 읽고 서명하는 본문입니다.
        <br />
        매번 같은 내용을 반복해서 입력하지 않도록, 자주 쓰는 계약서 형식을 미리
        만들어 둡니다.
      </>
    ),
    href: "/admin/templates",
    cta: "문서 템플릿 열기"
  },
  {
    number: "7",
    title: "서명 문서를 발급하세요",
    description: (
      <>
        지점, 디자이너, 고객 정보, 문서 제목을 입력하고 필요한 템플릿을 선택하면
        서명 문서를 만들 수 있습니다.
        <br />
        알림톡을 바로 보내도록 설정하면 고객에게 즉시 카카오톡 안내가 나갑니다.
      </>
    ),
    href: "/admin/documents",
    cta: "서명 문서 열기"
  }
];

function friendlyCodeLabel(key) {
  return `#{${key}}`;
}

function StepAction({ step, canManageSetup }) {
  if (
    !canManageSetup &&
    step.href.startsWith("/admin/") &&
    step.href !== "/admin/documents"
  ) {
    return <span className="manual-note-chip">관리 권한이 필요한 화면</span>;
  }

  if (step.external) {
    return (
      <a
        className="button secondary"
        href={step.href}
        target="_blank"
        rel="noreferrer"
      >
        {step.cta}
      </a>
    );
  }

  return (
    <Link className="button secondary" href={step.href}>
      {step.cta}
    </Link>
  );
}

export default async function AdminManualPage() {
  const session = await requireAdminSession();
  const canManageSetup =
    session.role === INTEGRATED_MASTER_ROLE ||
    session.role === BRANCH_MASTER_ROLE;

  return (
    <div className="section-stack">
      <AdminSectionIntro
        eyebrow="Quick Start"
        title="서명 보내기 메뉴얼"
        description={
          <>
            처음 사용하는 분도 아래 순서대로만 진행하면 됩니다.
            <br />
            어려운 내부 용어보다, 실제로 무엇을 먼저 해야 하는지 중심으로 정리했습니다.
          </>
        }
      />

      <section className="panel section-stack">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Before You Start</div>
            <h2 className="panel-title">먼저 알아두면 쉬워요</h2>
            <ReadableText className="panel-copy">
              문서 템플릿은 고객이 읽고 서명하는 본문이고, 알림톡 템플릿은 고객에게
              카카오톡으로 보내는 안내 메시지입니다.
              <br />
              두 가지를 미리 준비해 두면 서명 발급이 훨씬 빠르고 정확해집니다.
            </ReadableText>
          </div>
        </div>

        <div className="manual-overview-grid">
          <div className="record-card">
            <div className="record-title">문서 템플릿</div>
            <ReadableText as="div" className="record-meta">
              고객이 실제로 읽고 서명하는 계약서 본문입니다. 자주 쓰는 문서를 미리
              저장해 두는 공간이라고 생각하면 됩니다.
            </ReadableText>
          </div>
          <div className="record-card">
            <div className="record-title">알림톡 템플릿</div>
            <ReadableText as="div" className="record-meta">
              고객에게 보내는 카카오톡 안내 메시지입니다. 문서 링크, 고객 이름,
              문서 제목 같은 내용이 자동으로 들어가게 만들 수 있습니다.
            </ReadableText>
          </div>
          <div className="record-card">
            <div className="record-title">알림톡 코드</div>
            <ReadableText as="div" className="record-meta">
              Bizgo에서 알림톡 템플릿을 저장하면 각 템플릿을 구분하는 코드가
              생깁니다.
              <br />
              우리 페이지에는 이 코드를 등록해서 어떤 알림톡을 보낼지 연결합니다.
            </ReadableText>
          </div>
        </div>

        {session.role === ADMIN_ROLE ? (
          <ReadableText as="div" className="manual-callout">
            지점 등록, 디자이너 등록, 템플릿 준비는 통합 마스터 또는 지점 마스터가
            먼저 해 둡니다.
            <br />
            일반 어드민은 준비가 끝난 뒤 서명 문서를 발급하면 됩니다.
          </ReadableText>
        ) : null}
      </section>

      <section className="panel section-stack">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Step By Step</div>
            <h2 className="panel-title">서명 보내기 준비 순서</h2>
            <ReadableText className="panel-copy">
              아래 순서대로 준비하면 실수가 줄고, 고객에게 보여지는 문서도 더
              깔끔하게 맞출 수 있습니다.
            </ReadableText>
          </div>
        </div>

        <div className="manual-step-list">
          {STEP_LIST.map((step) => (
            <div key={step.number} className="manual-step-card">
              <div className="manual-step-number">{step.number}</div>
              <div className="manual-step-copy">
                <div className="manual-step-title-row">
                  <h3 className="manual-step-title">{step.title}</h3>
                  {step.emphasize ? (
                    <span className="manual-note-chip emphasize">{step.emphasize}</span>
                  ) : null}
                </div>
                <ReadableText className="manual-step-description">
                  {step.description}
                </ReadableText>
              </div>
              <div className="manual-step-action">
                <StepAction step={step} canManageSetup={canManageSetup} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel section-stack">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow">Bizgo Help</div>
            <h2 className="panel-title">알림톡에 넣는 자동 입력 문구</h2>
            <ReadableText className="panel-copy">
              Bizgo에서 알림톡 템플릿을 만들 때 아래 문구를 그대로 넣으면, 실제
              발송할 때 지점명, 고객명, 문서 제목처럼 필요한 정보가 자동으로 바뀌어
              들어갑니다.
            </ReadableText>
          </div>
          <div className="panel-actions">
            <a
              className="button secondary"
              href={BIZGO_TEMPLATE_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Bizgo 콘솔 열기
            </a>
          </div>
        </div>

        <ReadableText as="div" className="manual-callout">
          버튼 링크는 <code className="code">https://{"#{document_url}"}</code> 형태로
          입력해 주세요.
          <br />
          지점 전화번호는 <code className="code">031-1234-5678</code>처럼{" "}
          <code className="code">-</code>를 넣어서 등록해 두면 실제 전송 문구에도
          같은 형식으로 깔끔하게 들어갑니다.
        </ReadableText>

        <div className="manual-variable-grid">
          {TEMPLATE_VARIABLES.map((item) => (
            <div key={item.key} className="manual-variable-row compact">
              <div className="manual-variable-label">{item.label}</div>
              <code className="variable-guide-code">{friendlyCodeLabel(item.key)}</code>
            </div>
          ))}
        </div>

        <div className="manual-example-grid">
          <div className="record-card">
            <div className="record-title">템플릿 예시</div>
            <div className="record-meta preformatted-copy">
              {`계약 문서를 확인하고 서명해 주세요.

■ 문서명
#{document_title}

■ 요청자
엘바노헤어 #{branch_name}점 (#{branch_phone})

■ 서명자
#{customer_name} (#{phone_full})

■ 서명 기한
#{limit_date}`}
            </div>
          </div>

          <div className="record-card">
            <div className="record-title">실제 전송 예시</div>
            <div className="record-meta preformatted-copy">
              {`계약 문서를 확인하고 서명해 주세요.

■ 문서명
스탠다드 멤버십 구매약정서

■ 요청자
엘바노헤어 오산점 (031-1234-5678)

■ 서명자
김민지 (01012345678)

■ 서명 기한
2026-04-03`}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
