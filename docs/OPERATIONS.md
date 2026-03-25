# Operations

## 기술 스택

- Next.js 15
- React 19
- Supabase Postgres
- Kakao OAuth
- Bizgo Omni API
- Vercel 배포 전제

## 환경변수

`.env.example`를 기준으로 설정한다.

| 이름 | 용도 |
| --- | --- |
| `PUBLIC_BASE_URL` | 앱의 절대 base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | 서버 전용 secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | 구 naming 호환용 대체 키 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 client secret, 사용 시만 |
| `KAKAO_REDIRECT_URI` | 카카오 OAuth callback URL |
| `BIZGO_BASE_URL` | Bizgo API base URL |
| `BIZGO_API_KEY` | Bizgo API 키 |
| `MASTER_KAKAO_ID` | 통합 마스터 카카오 ID |

## 로컬 실행

### 준비

1. Node.js 20 이상 설치
2. `npm install`
3. `.env.example`를 복사해 `.env.local` 작성
4. Supabase 프로젝트 생성 후 `supabase/schema.sql` 실행

### 실행

```bash
npm run dev
```

접속 경로:

- 메인: `http://localhost:3000`
- 관리자 로그인: `http://localhost:3000/admin/login`

## Supabase 운영 메모

- 이 프로젝트는 SQLite를 사용하지 않는다.
- DB 구조 변경 시 가장 먼저 `supabase/schema.sql`을 수정한다.
- 별도 migration history가 없으므로 배포 전 SQL diff를 사람이 검토해야 한다.

권장 운영 방식:

1. 개발 환경 Supabase 프로젝트
2. 운영 환경 Supabase 프로젝트
3. 두 환경의 환경변수 분리

## Vercel 배포

### 필수 작업

1. Vercel 프로젝트 생성
2. 환경변수 등록
3. `PUBLIC_BASE_URL`을 실제 도메인으로 설정
4. `KAKAO_REDIRECT_URI`를 실제 도메인 기준으로 설정

예시:

```text
PUBLIC_BASE_URL=https://example.vercel.app
KAKAO_REDIRECT_URI=https://example.vercel.app/api/auth/kakao/callback
```

## 카카오 로그인 설정

카카오 개발자 콘솔에서 아래를 맞춰야 한다.

- 플랫폼 Web URL
- Redirect URI

로컬 예시:

- Web URL: `http://localhost:3000`
- Redirect URI: `http://localhost:3000/api/auth/kakao/callback`

운영 예시:

- Web URL: `https://your-domain`
- Redirect URI: `https://your-domain/api/auth/kakao/callback`

## Bizgo 설정

템플릿별로 아래 값이 필요하다.

- Bizgo 템플릿 코드
- 발신 프로필 키
- 메시지 본문
- 버튼명

운영 전 확인 항목:

1. Bizgo 템플릿이 사전 승인되었는지
2. 발신 프로필 키가 유효한지
3. 메시지 본문이 Bizgo 템플릿과 일치하는지
4. 버튼 링크가 운영 도메인 기준으로 열리는지

## 최초 셋업 순서

1. 통합 마스터용 카카오 계정의 사용자 ID 확인
2. `MASTER_KAKAO_ID` 설정
3. 통합 마스터로 로그인
4. 지점 생성
5. 지점별 디자이너 생성
6. 지점별 템플릿 생성
7. 필요하면 지점 마스터/일반 어드민 권한 부여
8. 문서 발급 테스트
9. 공개 링크에서 본인 확인 및 서명 테스트
10. Bizgo 발송 테스트

## 일상 운영 절차

### 새 지점 온보딩

1. 지점 생성
2. 디자이너 등록
3. 지점 전용 템플릿 등록
4. 필요하면 지점 마스터 계정 지정

### 새 관리자 승인

1. 사용자가 `/admin/login`에서 로그인 시도
2. 통합 마스터가 권한 관리 화면 진입
3. 로그인 시도 계정 목록에서 닉네임 확인
4. 역할과 지점을 지정해 권한 저장

### 새 문서 발급

1. 관리자 로그인
2. 문서 관리 진입
3. 지점/템플릿/디자이너 선택
4. 고객 정보 입력
5. 필요 시 알림톡 즉시 발송
6. 고객이 공개 링크에서 4자리 확인 후 서명

## 문제 발생 시 점검 순서

### 관리자 로그인이 안 될 때

1. `KAKAO_REST_API_KEY` 확인
2. `KAKAO_REDIRECT_URI` 확인
3. 카카오 콘솔의 Redirect URI 등록 여부 확인
4. `MASTER_KAKAO_ID` 또는 `admin_users` 등록 상태 확인
5. `login_attempts`에 시도가 남는지 확인

### 지점 마스터가 다른 지점 데이터를 본다고 할 때

1. `admin_users.branch_id` 확인
2. 세션 재로그인
3. `sessions.branch_id`, `sessions.role` 확인
4. 문서/API가 `session.branch_id`를 기준으로 필터링하는지 확인

### 서명 저장이 안 될 때

1. 공개 링크 토큰이 유효한지
2. 휴대폰 뒷자리 검증을 먼저 했는지
3. `verified_document_{token}` 쿠키가 생성되는지
4. `signatureDataUrl`이 `data:image/png`로 시작하는지

### 알림톡이 실패할 때

1. `BIZGO_API_KEY` 확인
2. 템플릿의 Bizgo 관련 필드 확인
3. `recipient_phone` 누락 여부 확인
4. `documents.bizgo_response` 저장 내용 확인

## 알려진 제약

1. 테스트 코드가 없다.
2. DB migration 관리 도구가 없다.
3. 서명 이미지를 DB text 컬럼에 저장한다.
4. 세밀한 감사 로그 UI가 없다.
5. Supabase SQL policy는 아직 정의하지 않았다.

## 변경 전 체크리스트

1. 역할별 권한 경계를 깨지 않는가
2. 문서 스냅샷 구조를 해치지 않는가
3. 로컬과 Vercel 환경변수 모두 반영했는가
4. `supabase/schema.sql`과 `lib/db.js`가 함께 수정되었는가
5. Bizgo 발송 실패 시 문서 생성은 유지되는가

## 권장 다음 작업

운영 안정성을 높이려면 아래 순서가 좋다.

1. Supabase migration 체계 도입
2. 테스트 코드 추가
3. 감사 로그 화면 추가
4. 서명 이미지 저장소 분리 검토
5. 문서 취소/재발송 기능 추가
