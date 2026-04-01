# 개발용 멀티 에이전트 워크플로

## 목적

이 문서는 앱 기능용 에이전트가 아니라, 이 저장소를 개발할 때 사용할 멀티 에이전트 워크플로를 정리한다.

기본 순서는 아래와 같다.

1. 기획 에이전트
2. 개발 에이전트
3. 코드 성능 검증 에이전트
4. 디자인 검증 에이전트

## 핵심 원칙

- 코드 변경은 개발 에이전트만 할 수 있다.
- 기획과 검증 에이전트는 읽기와 평가만 수행한다.
- 산출 문서는 모두 한국어로 작성한다.
- 성능 검증이 디자인 검증보다 먼저 수행된다.

## 포함 산출물

- `AGENTS.md`: 저장소 전역 공통 규칙
- `.codex-workflows/prompts/*.md`: 역할별 프롬프트 템플릿
- `scripts/run-dev-workflow.sh`: `codex exec` 기반 실행 래퍼
- `scripts/route-performance-report.mjs`: 빌드 후 페이지 자산 무게 요약 리포트

## 실행 방법

Codex CLI가 로그인된 상태에서 아래처럼 실행한다.

```bash
npm run agents:run -- "관리자 문서 발급 화면의 검색 UX 개선"
```

옵션 예시:

```bash
BASE_BRANCH=develop CODEX_AGENT_MODEL=gpt-5.4-mini npm run agents:run -- "문서 목록 필터 성능 개선"
```

## 출력 위치

각 실행 결과는 `.codex-workflows/runs/<timestamp>/` 아래에 저장된다.

- `00-task.md`
- `01-plan.md`
- `02-build.md`
- `03-performance-validation.md`
- `04-design-validation.md`

## 검증 기준

### 코드 성능 검증

- 기본 명령은 `npm run validate:performance`다.
- 이 명령은 `next build` 후 `.next/app-build-manifest.json`을 읽어 페이지별 총 자산 무게와 전용 자산 무게를 요약한다.
- 서버와 클라이언트 경계가 과도하게 흐려지지 않았는지 확인한다.
- 중복 fetch, 큰 클라이언트 컴포넌트, 불필요한 재렌더링, 공용 라우트로 새어 나온 무거운 의존성을 확인한다.

### 디자인 검증

- 실제 브라우저 검증이 가능하면 우선 사용한다.
- 브라우저 검증이 막히면 JSX, CSS, 반응형 구조, 상태 UI를 정적 검토한다.
- 디자인 검증은 단순 동작 확인이 아니라, 화면이 예쁘고 세련되며 완성도 있게 보이는지도 함께 평가한다.
- 특히 색감, 타이포그래피, 여백 리듬, 시각 계층, 컴포넌트 비례, 모바일 대응을 확인한다.

## 현재 저장소 기준 참고 사항

- `npm run build`는 기본 검증 게이트로 사용 가능하다.
- `npm run lint`는 ESLint 미설정 상태면 인터랙티브 초기 설정으로 진입할 수 있으므로 hard gate로 강제하지 않는다.

## 권장 사용 방식

- 작은 수정은 현재 대화에서 바로 진행한다.
- 화면/도메인 영향이 큰 수정은 멀티 에이전트 워크플로로 실행한다.
- 머지 전에는 성능 검증과 디자인 검증 결과를 함께 확인한다.
