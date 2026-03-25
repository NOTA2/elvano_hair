# Database Schema

## 저장소 개요

- DB: Supabase Postgres
- 서버 접근 방식: `@supabase/supabase-js` service-role/secret 키 사용
- 스키마 기준 파일: `supabase/schema.sql`
- 클라이언트 직접 DB 접근: 사용하지 않음

## 스키마 설계 원칙

1. 공개 서명 링크는 토큰 기반으로 문서를 찾는다.
2. 이미 발급된 문서는 템플릿 변경의 영향을 받지 않도록 스냅샷 데이터를 저장한다.
3. 관리자 권한은 카카오 계정 단위로 부여한다.
4. 승인되지 않은 로그인도 버리지 않고 기록한다.
5. 세션은 쿠키만이 아니라 DB에도 저장한다.

## 테이블 요약

### `branches`

지점 마스터링 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `name` | 지점명, unique |
| `description` | 내부 메모 |
| `is_active` | 사용 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### `designers`

지점별 디자이너 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `branch_id` | 소속 지점 FK |
| `name` | 디자이너명 |
| `description` | 내부 메모 |
| `is_active` | 사용 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

중요 제약:

- `(branch_id, name)` unique index가 있다.
- 같은 지점 안에서는 디자이너 이름이 중복되면 안 된다.

### `templates`

지점별 문서 템플릿 테이블이다. 고객이 실제로 읽고 서명하는 안내문 본문 원본을 가진다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `branch_id` | 소속 지점 FK |
| `name` | 템플릿명 |
| `description` | 설명 |
| `content` | 안내문 본문 |
| `is_active` | 사용 여부 |
| `deleted_at` | soft delete 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

중요 메모:

- 템플릿은 실제 `DELETE` 하지 않는다.
- 운영 상태는 애플리케이션에서 `active / inactive / deleted`로 해석한다.
- `deleted_at` 이 있으면 새 문서 발급 목록에서는 제외되지만, 과거 문서 FK는 유지된다.
- 스키마에 남아 있는 일부 Bizgo 컬럼은 레거시 호환용이며 현재 운영 UI에서는 사용하지 않는다.

### `notification_templates`

Bizgo 알림톡 관리 API와 연결되는 알림톡 템플릿 카탈로그다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `branch_id` | 소속 지점 FK |
| `description` | 내부 메모 |
| `sender_key` | Bizgo 발신 프로필 키 |
| `sender_key_type` | 발신 키 타입 (`S`, `G`) |
| `template_code` | 알림톡 템플릿 코드 |
| `template_name` | 알림톡 템플릿명 |
| `template_message_type` | 메시지 유형 (`BA`, `EX`, `AD`, `MI`) |
| `template_emphasize_type` | 강조 유형 (`NONE`, `TEXT`, `IMAGE`, `ITEM_LIST`) |
| `category_code` | 카테고리 코드 |
| `security_flag` | 보안 템플릿 여부 |
| `message` | 알림톡 본문 |
| `title`, `subtitle`, `header` | 강조/헤더 관련 필드 |
| `button_*` | 기본 버튼 1개 구성 필드 |
| `inspection_status` | 검수 상태 (`REG`, `REQ`, `APR`, `REJ`) |
| `remote_block`, `remote_dormant` | Bizgo 원격 상태 |
| `remote_created_at`, `remote_modified_at` | Bizgo 원격 생성/수정 시각 |
| `remote_payload` | 원격 조회 원본 JSON |
| `last_synced_at` | 마지막 원격 동기화 시각 |
| `is_active`, `deleted_at` | 로컬 운영 상태 |
| `created_at`, `updated_at` | 생성/수정 시각 |

중요 메모:

- 공식 문서상 전체 템플릿 목록 API는 보이지 않아, 현재 앱은 로컬 카탈로그를 목록 소스로 사용한다.
- 등록/수정/삭제/검수 요청/검수 요청 취소는 Bizgo 원격 API를 먼저 호출하고, 성공 후 로컬을 갱신한다.
- 삭제는 원격 삭제 후 로컬 `deleted_at`을 남겨 문서 이력을 보존한다.

### `documents`

실제 발급된 고객 문서다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `token` | 공개 링크용 unique 토큰 |
| `template_id` | 문서 템플릿 FK |
| `notification_template_id` | 알림톡 템플릿 FK |
| `branch_id` | 지점 FK |
| `designer_id` | 디자이너 FK |
| `branch_name` | 발급 시점의 지점명 스냅샷 |
| `document_title` | 발급 시점 문서 제목 |
| `document_date` | 안내문 날짜 |
| `customer_name` | 고객명 |
| `phone_last4` | 휴대폰 뒷자리 4자리 |
| `recipient_phone` | 알림톡 수신 전체 번호 |
| `designer_name` | 발급 시점 디자이너명 스냅샷 |
| `notification_template_name` | 발급 시점 알림톡 템플릿명 스냅샷 |
| `rendered_content` | 치환이 끝난 최종 문서 본문 |
| `status` | `pending`, `signed` 등 |
| `viewed_at` | 본인 확인 후 첫 열람 시각 |
| `signed_at` | 서명 완료 시각 |
| `signature_data_url` | PNG data URL |
| `bizgo_status` | Bizgo 발송 상태 |
| `bizgo_response` | Bizgo 응답 JSON |
| `created_at`, `updated_at` | 생성/수정 시각 |

중요 제약:

- `token`은 unique다.
- `phone_last4`는 정규식 체크로 숫자 4자리만 허용한다.
- 문서는 템플릿, 지점, 디자이너를 참조하지만 동시에 사람이 읽는 핵심 값도 별도로 저장한다.

### `admin_users`

허용된 관리자 목록이다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID, unique |
| `branch_id` | 지점 마스터인 경우 소속 지점 |
| `nickname` | 카카오 닉네임 스냅샷 |
| `memo` | 내부 메모 |
| `role` | `integrated_master`, `branch_master`, `admin` 중 하나 |
| `is_active` | 활성 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

주의:

- 통합 마스터는 보통 `admin_users`에 저장하지 않고 `MASTER_KAKAO_ID` 환경변수로 판별한다.
- 따라서 권한 관리 화면에서 통합 마스터는 별도 예외 취급된다.

### `login_attempts`

권한이 없거나 있거나 관계없이 카카오 로그인 시도 계정을 계정 단위로 집계한 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID, unique |
| `nickname` | 최근 닉네임 |
| `attempt_count` | 누적 시도 횟수 |
| `last_status` | 최근 시도 결과 |
| `first_attempt_at` | 최초 시도 시각 |
| `last_attempt_at` | 최근 시도 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### `login_attempt_logs`

로그인 시도의 원본 이벤트 로그다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID |
| `nickname` | 시도 당시 닉네임 |
| `status` | `allowed` 또는 `blocked` |
| `attempted_at` | 시도 시각 |
| `created_at` | 생성 시각 |

### `sessions`

관리자 서버 세션 저장 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `session_token` | 쿠키와 매칭되는 unique 토큰 |
| `kakao_user_id` | 로그인한 카카오 ID |
| `branch_id` | 지점 마스터면 소속 지점 |
| `nickname` | 로그인 시 닉네임 |
| `role` | 현재 권한 |
| `is_master` | 통합 마스터 여부 |
| `created_at` | 생성 시각 |
| `expires_at` | 만료 시각 |

## 관계도

```text
branches 1 --- N designers
branches 1 --- N templates
branches 1 --- N notification_templates
branches 1 --- N documents
branches 1 --- N admin_users
branches 1 --- N sessions

designers 1 --- N documents
templates 1 --- N documents
notification_templates 1 --- N documents

admin_users 1 --- 0..N sessions
login_attempts 1 --- N login_attempt_logs (logical relation by kakao_user_id)
```

## 애플리케이션 레벨 제약

DB FK만으로 표현되지 않는 규칙도 있다.

1. 지점 마스터는 자기 지점의 데이터만 수정할 수 있다.
2. 문서 생성 시 선택한 문서 템플릿, 알림톡 템플릿, 디자이너는 같은 지점이어야 한다.
3. `branch_master` 권한은 반드시 `branch_id`를 가져야 한다.
4. 공개 서명 API는 휴대폰 4자리 검증 쿠키가 없으면 서명을 거부한다.

## 인덱스

중요 인덱스는 아래 목적을 가진다.

- `documents_created_at_idx`: 최근 문서 목록 정렬
- `login_attempts_last_attempt_at_idx`: 최근 로그인 시도 검토
- `login_attempt_logs_kakao_user_id_idx`: 특정 계정 추적
- `sessions_expires_at_idx`: 세션 만료 관리

## RLS 메모

- 모든 테이블에 RLS가 활성화되어 있다.
- 하지만 현재 앱은 service-role/secret 키로 서버에서만 접근하므로, 실질적인 접근 제어는 애플리케이션 코드가 맡고 있다.
- 별도 SQL policy는 아직 정의하지 않았다.

즉 현재의 보안 모델은 "브라우저가 DB에 직접 접근하지 않는다"에 의존한다.

## 변경 시 주의사항

1. 스키마를 바꾸면 `supabase/schema.sql`을 먼저 갱신한다.
2. 관련 `lib/db.js` 함수도 함께 수정한다.
3. 문서 스냅샷 컬럼을 줄이기 전에 과거 문서 표시 요구사항을 다시 확인한다.
4. 서명 저장 포맷을 바꾸면 기존 `signature_data_url` 호환성을 확인한다.

## 레거시 메모

- 저장소에 `data/` 디렉터리가 남아 있지만 현재 운영 DB는 Supabase다.
- SQLite 기반 구조는 더 이상 사용하지 않는다.
