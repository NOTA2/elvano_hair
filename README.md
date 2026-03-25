# elvano_hair

엘바노헤어 고객 안내문 전자서명 MVP입니다.

## 문서 인덱스

레포만 보고도 바로 이어서 작업할 수 있도록 상세 문서를 분리해 두었습니다.

- [문서 인덱스](docs/README.md)
- [앱 구조](docs/APP_STRUCTURE.md)
- [도메인 규칙](docs/DOMAIN_RULES.md)
- [DB 구조](docs/DB_SCHEMA.md)
- [운영 가이드](docs/OPERATIONS.md)

## 포함 기능

- Supabase Postgres 기반 데이터 저장
- 카카오 로그인 기반 관리자 영역
- 통합 마스터 / 지점 마스터 / 일반 어드민 권한
- 로그인 시도 계정 저장 및 승인 기반 권한 부여
- 지점 / 디자이너 / 템플릿 관리
- 문서 템플릿 등록/수정/삭제
- 고객별 서명 문서 발급
- 휴대폰 뒷자리 4자리 확인 후 공개 문서 접근
- 서명 캔버스 저장
- Bizgo 알림톡 발송 연동 훅

## 로컬 실행 방법

### 1. 사전 준비

- Node.js 20 이상
- npm 10 이상

현재 로컬에서 확인한 버전:

- Node.js `v20.10.0`
- npm `10.2.5`

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 파일 생성

```bash
cp .env.example .env.local
```

### 4. Supabase 프로젝트 준비

1. Supabase 프로젝트 생성
2. Supabase SQL Editor 열기
3. [`/Users/user/projects/workspace/elvano_hair/supabase/schema.sql`](/Users/user/projects/workspace/elvano_hair/supabase/schema.sql) 내용 실행

이 프로젝트는 로컬 파일 DB를 쓰지 않고 Supabase Postgres를 사용합니다.

기존에 예전 스키마를 이미 적용했다면, 이번 권한/지점 구조 반영을 위해 최신 [`/Users/user/projects/workspace/elvano_hair/supabase/schema.sql`](/Users/user/projects/workspace/elvano_hair/supabase/schema.sql)을 다시 실행해야 합니다.

예시:

```bash
PUBLIC_BASE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key

KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback

BIZGO_BASE_URL=https://api.bizgo.io
BIZGO_API_KEY=your_bizgo_api_key

MASTER_KAKAO_ID=1234567890
```

환경변수 설명:

- `PUBLIC_BASE_URL`: 로컬 개발 URL. 기본은 `http://localhost:3000`
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SECRET_KEY`: 서버 전용 키. Vercel에는 반드시 서버 환경변수로만 넣어야 함
- `SUPABASE_SERVICE_ROLE_KEY`: 구 naming을 쓰는 경우 대체 가능
- `KAKAO_REST_API_KEY`: 카카오 로그인용 REST API 키
- `KAKAO_CLIENT_SECRET`: 카카오 앱에서 사용 중이면 입력
- `KAKAO_REDIRECT_URI`: 카카오 개발자 콘솔에 반드시 `http://localhost:3000/api/auth/kakao/callback` 등록
- `BIZGO_API_KEY`: Bizgo 알림톡 발송 API 키
- `BIZGO_BASE_URL`: 기본값 사용 가능
- `MASTER_KAKAO_ID`: 마스터 관리자 카카오 사용자 ID

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 아래 경로로 접속:

- 메인: [http://localhost:3000](http://localhost:3000)
- 관리자 로그인: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### 6. 로컬에서 확인하는 순서

1. 관리자 로그인
2. 지점 등록
3. 디자이너 등록
4. 템플릿 등록
5. 서명 문서 생성
6. 생성된 공개 링크 열기
7. 휴대폰 뒷자리 4자리 입력
8. 서명 후 저장 확인

### 7. 카카오 로그인 로컬 설정

카카오 로그인까지 로컬에서 확인하려면 카카오 개발자 콘솔에서 아래를 맞춰야 합니다.

- 플랫폼 Web URL: `http://localhost:3000`
- Redirect URI: `http://localhost:3000/api/auth/kakao/callback`
- 로그인할 카카오 계정의 사용자 ID가 `MASTER_KAKAO_ID` 이거나, 로그인 후 마스터가 허용한 관리자 목록에 있어야 함

### 8. Bizgo 없이 로컬 테스트하는 방법

Bizgo API 키가 없더라도 아래 범위는 테스트할 수 있습니다.

- 관리자 로그인
- 지점/디자이너 관리
- 템플릿 관리
- 서명 문서 생성
- 공개 링크 접속
- 휴대폰 뒷자리 확인
- 서명 저장

이 경우 문서 생성 시 "알림톡 즉시 발송"은 `아니오`로 두면 됩니다.

### 9. Vercel 배포 환경변수

Vercel 프로젝트에도 아래 값을 그대로 등록해야 합니다.

- `PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
- `BIZGO_API_KEY`
- `BIZGO_BASE_URL`
- `MASTER_KAKAO_ID`

`KAKAO_REDIRECT_URI`와 `PUBLIC_BASE_URL`은 실제 배포 도메인 기준으로 맞춰야 합니다. 예를 들어 배포 URL이 `https://example.vercel.app` 이면:

- `PUBLIC_BASE_URL=https://example.vercel.app`
- `KAKAO_REDIRECT_URI=https://example.vercel.app/api/auth/kakao/callback`

### 10. 프로덕션 빌드 확인

```bash
npm run build
```

빌드 후 실행:

```bash
npm run start
```

## 데이터 저장

- 데이터는 Supabase Postgres에 저장됩니다.
- 스키마 파일: [`/Users/user/projects/workspace/elvano_hair/supabase/schema.sql`](/Users/user/projects/workspace/elvano_hair/supabase/schema.sql)
- 더 이상 로컬 SQLite 파일은 사용하지 않습니다.

## 템플릿 치환값

- `{{branch_name}}`
- `{{document_title}}`
- `{{date}}`
- `{{customer_name}}`
- `{{phone_last4}}`
- `{{designer_name}}`
- `{{document_url}}`

## Bizgo 연동 메모

Bizgo 문서 기준으로 알림톡은 승인된 템플릿 코드와 발신 프로필 키가 필요하고, `POST /v1/send/omni` 로 발송합니다. 이 프로젝트는 템플릿별로 다음 값을 저장합니다.

- `bizgo_template_code`
- `bizgo_sender_key`
- `bizgo_message`
- `bizgo_button_name`

문서 발급 시 "알림톡 즉시 발송"을 선택하면 서명 링크 버튼이 포함된 알림톡을 보냅니다.

## 구현 메모

- 어드민 접근은 `admin_session` 쿠키 존재 여부로 1차 차단하고, 서버에서 세션 테이블을 다시 검증합니다.
- 마스터 카카오 ID는 기본값으로 코드에 포함되어 있고, `.env.local`의 `MASTER_KAKAO_ID`로 덮어쓸 수 있습니다.
- Supabase 접근은 서버 전용 키로만 수행하므로 클라이언트에서 DB에 직접 접근하지 않습니다.
- 로그인 승인 전 계정도 `login_attempts` 테이블에 누적 저장되고, 개별 시도 이벤트는 `login_attempt_logs` 테이블에 남습니다.
