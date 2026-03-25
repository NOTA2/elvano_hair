# App Structure

## 한 줄 요약

엘바노헤어 전자서명 시스템은 Next.js App Router 기반의 단일 웹앱이다. 관리자 영역과 고객 공개 서명 페이지를 같은 앱 안에서 운영하고, 데이터는 서버에서만 Supabase에 접근한다.

## 주요 디렉터리

```text
app/
  admin/
    login/
    (protected)/
  api/
    admin/
    auth/
    documents/
  s/[token]/
components/
lib/
supabase/
```

## 디렉터리별 역할

### `app/`

- 화면 라우트와 Route Handler를 가진다.
- `/admin/login`은 비보호 페이지다.
- `/admin/(protected)` 아래는 세션이 있어야 접근 가능하다.
- `/s/[token]`은 고객이 접근하는 공개 서명 페이지다.
- `app/admin/layout.js`는 pass-through 레이아웃이고, 실제 보호 레이아웃은 `app/admin/(protected)/layout.js`다. 이 분리가 없으면 `/admin/login`이 보호 레이아웃을 타면서 리다이렉트 루프가 생길 수 있다.

### `components/`

- 화면 공통 컴포넌트가 있다.
- `AdminNav.jsx`: 권한에 따라 관리자 메뉴를 다르게 보여준다.
- `SignatureClient.jsx`: 고객 본인 확인, 문서 표시, 서명 캔버스를 처리한다.

### `lib/`

- 인증, 권한, DB 접근, Bizgo 연동, 템플릿 치환 같은 서버 로직을 가진다.
- 이 프로젝트의 핵심 비즈니스 로직은 대부분 여기 있다.

### `supabase/`

- `schema.sql` 하나를 스키마 기준 문서 겸 초기 생성 스크립트로 사용한다.
- 별도 migration 툴은 아직 없다.

## 라우트 맵

### 공개 페이지

| 경로 | 설명 |
| --- | --- |
| `/` | 랜딩 페이지 |
| `/s/[token]` | 고객 문서 열람 및 서명 페이지 |

### 관리자 페이지

| 경로 | 설명 |
| --- | --- |
| `/admin/login` | 카카오 로그인 진입 |
| `/admin` | 관리자 대시보드 |
| `/admin/branches` | 지점/디자이너 관리 |
| `/admin/templates` | 템플릿 관리 |
| `/admin/documents` | 문서 발급 및 문서 목록 |
| `/admin/admin-users` | 권한 관리, 로그인 시도 승인 |

## API 맵

### 인증

| 경로 | 메서드 | 설명 |
| --- | --- | --- |
| `/api/auth/kakao/start` | `GET` | 카카오 OAuth 시작 |
| `/api/auth/kakao/callback` | `GET` | 카카오 프로필 조회, 로그인 시도 저장, 세션 생성 |
| `/api/auth/logout` | `POST` | 세션 삭제 후 로그인 화면 이동 |

### 관리자 API

| 경로 | 메서드 | 설명 |
| --- | --- | --- |
| `/api/admin/branches` | `POST` | 지점 생성/수정/삭제 |
| `/api/admin/designers` | `POST` | 디자이너 생성/수정/삭제 |
| `/api/admin/templates` | `POST` | 템플릿 생성/수정/삭제 |
| `/api/admin/documents` | `POST` | 서명 문서 발급, 선택 시 Bizgo 발송 |
| `/api/admin/admin-users` | `POST` | 관리자 권한 부여/수정/삭제 |

### 공개 서명 API

| 경로 | 메서드 | 설명 |
| --- | --- | --- |
| `/api/documents/[token]/verify` | `POST` | 휴대폰 뒷자리 4자리 검증 |
| `/api/documents/[token]/sign` | `POST` | 서명 이미지 저장 |

## 관리자 인증 구조

### 1차 차단

- `middleware.js`가 `/admin` 경로에 `admin_session` 쿠키가 없으면 `/admin/login`으로 리다이렉트한다.
- `/admin/login`과 `/api/auth/kakao/*`는 예외 처리된다.

### 2차 검증

- 실제 관리자 페이지와 API는 `lib/auth.js`의 세션 조회 함수를 다시 사용한다.
- 쿠키만 있다고 통과하지 않고, `sessions` 테이블에 존재하고 만료되지 않은 세션만 유효하다.

## 공개 서명 흐름

### 1. 링크 진입

- 고객은 `/s/[token]` 링크로 접근한다.
- 서버는 `token`으로 문서를 찾지 못하면 404를 반환한다.

### 2. 본인 확인

- 고객은 휴대폰 뒷자리 4자리를 입력한다.
- `verify` API가 `documents.phone_last4`와 비교한다.
- 일치하면 `verified_document_{token}` 쿠키를 만든다.

### 3. 문서 노출

- 검증이 끝나면 렌더링된 문서 본문과 서명 캔버스가 노출된다.

### 4. 서명 저장

- `sign` API는 검증 쿠키가 있는 경우에만 저장을 허용한다.
- 저장 후 `documents.status`를 `signed`로 바꾸고 `signature_data_url`, `signed_at`을 저장한다.

## 관리자 문서 발급 흐름

### 지점 선택 규칙

- 통합 마스터와 일반 어드민은 지점을 직접 선택한다.
- 지점 마스터는 본인 지점으로 고정된다.

### 디자이너/템플릿 검증 규칙

- 서버는 선택한 템플릿과 디자이너가 같은 지점에 속하는지 다시 검증한다.
- 화면에서 막는 것만으로 끝내지 않고 서버에서 재검증한다.

### 문서 스냅샷 저장

- 문서 생성 시 `branch_name`, `designer_name`, `document_title`, `rendered_content`를 문서 테이블에 그대로 저장한다.
- 이후 지점명이나 템플릿이 바뀌어도 이미 발급된 문서는 영향을 받지 않는다.

## 핵심 모듈 설명

### `lib/auth.js`

- 현재 세션 조회
- 관리자 접근 권한 판단
- 통합 마스터/지점 마스터 판별
- DB 세션 생성과 삭제

### `lib/db.js`

- Supabase 데이터 접근 레이어
- 테이블별 CRUD 함수
- 로그인 시도 집계/로그 저장
- 문서 상태 업데이트

### `lib/documents.js`

- 템플릿 치환
- 문서 토큰 생성
- 문서 생성용 값 정규화

### `lib/bizgo.js`

- Bizgo 알림톡 발송 payload 생성
- 발송 실패 시 예외 발생

## 현재 구조의 특징

- 클라이언트에서 Supabase를 직접 호출하지 않는다.
- 상태 관리는 대부분 서버 재조회와 HTML form submit에 의존한다.
- 문서 작성 UI는 서버 렌더링 기반이라 복잡한 프론트 상태 관리는 적다.
- 테스트 코드와 migration 체계는 아직 없다.

## 작업 전 먼저 확인할 것

1. 변경이 관리자 전용인지 공개 페이지까지 영향이 있는지
2. 지점 마스터의 지점 제한을 깨지 않는지
3. 문서 테이블의 스냅샷 컬럼이 충분한지
4. Bizgo 발송 실패 시 문서 생성 자체는 유지되어야 하는지
