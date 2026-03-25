# Database Schema

## 개요

- DB: Supabase Postgres
- 기준 파일: [`/Users/user/projects/workspace/elvano_hair/supabase/schema.sql`](/Users/user/projects/workspace/elvano_hair/supabase/schema.sql)
- 현재 운영 방식: `schema.sql` 하나로 reset 후 재생성

`schema.sql`은 호환용 `ALTER TABLE` 모음이 아니라, 현재 앱 구조를 기준으로 테이블을 모두 다시 만드는 단일 스크립트다.

## 핵심 원칙

1. 문서는 발급 시점 스냅샷을 저장한다.
2. 문서 템플릿과 알림톡 템플릿은 공용 템플릿이다.
3. 지점과 디자이너는 실제 운영 단위다.
4. 관리자 권한은 카카오 계정 단위로 저장한다.
5. 승인되지 않은 로그인 시도도 누락하지 않는다.

## 테이블

### `branches`

지점 마스터 데이터.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `name` | 지점명, unique |
| `phone` | 지점 전화번호 |
| `description` | 내부 메모 |
| `is_active` | 사용 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### `designers`

지점 소속 디자이너.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `branch_id` | 소속 지점 FK |
| `name` | 디자이너명 |
| `description` | 내부 메모 |
| `is_active` | 사용 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

제약:

- `(branch_id, name)` unique

### `templates`

고객이 실제로 읽고 서명하는 공용 문서 템플릿.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `name` | 템플릿명 |
| `document_title` | 기본 문서 제목 |
| `content` | HTML 본문 |
| `is_active` | 사용 여부 |
| `deleted_at` | soft delete 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

메모:

- 지점과 연결되지 않는다.
- 삭제는 hard delete가 아니라 soft delete다.

### `notification_templates`

Bizgo 콘솔 템플릿 코드를 로컬에 연결해 두는 공용 카탈로그.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `sender_key` | Bizgo 발신 프로필 키 |
| `sender_key_type` | 발신 키 타입 |
| `template_code` | 알림톡 템플릿 코드 |
| `template_name` | Bizgo 템플릿명 |
| `template_message_type` | 메시지 유형 |
| `template_emphasize_type` | 강조 유형 |
| `category_code` | 카테고리 코드 |
| `security_flag` | 보안 템플릿 여부 |
| `message` | 본문 |
| `title`, `subtitle`, `header` | 강조/헤더 정보 |
| `button_*` | 버튼 1개 구성 정보 |
| `inspection_status` | Bizgo 검수 상태 |
| `remote_block`, `remote_dormant` | Bizgo 원격 상태 |
| `remote_created_at`, `remote_modified_at` | Bizgo 원격 시각 |
| `remote_payload` | Bizgo 원본 응답 |
| `last_synced_at` | 마지막 조회 시각 |
| `is_active` | 사용 여부 |
| `deleted_at` | soft delete 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

제약:

- `(sender_key, template_code)` unique

메모:

- 지점과 연결되지 않는다.
- 앱은 Bizgo 전체 목록 API에 의존하지 않고, 템플릿 코드 단건 조회 결과를 로컬 카탈로그에 저장한다.

### `documents`

실제 고객에게 발급된 문서.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `token` | 공개 링크용 unique 토큰 |
| `template_id` | 문서 템플릿 FK |
| `notification_template_id` | 알림톡 템플릿 FK |
| `branch_id` | 지점 FK |
| `designer_id` | 디자이너 FK |
| `branch_name` | 발급 시점 지점명 |
| `document_title` | 발급 시점 제목 |
| `document_date` | 문서 날짜 |
| `customer_name` | 고객명 |
| `phone_last4` | 본인 확인용 끝 4자리 |
| `recipient_phone` | 전체 휴대폰 번호 |
| `designer_name` | 발급 시점 디자이너명 |
| `notification_template_name` | 발급 시점 알림톡 템플릿명 |
| `rendered_content` | 치환 완료된 최종 본문 |
| `status` | `pending`, `signed`, `failed` |
| `viewed_at` | 첫 열람 시각 |
| `signed_at` | 서명 완료 시각 |
| `signature_data_url` | 서명 PNG data URL |
| `bizgo_status` | 발송 상태 |
| `bizgo_response` | Bizgo 응답 JSON |
| `created_at`, `updated_at` | 생성/수정 시각 |

제약:

- `token` unique
- `phone_last4`는 숫자 4자리 check constraint

### `admin_users`

허용된 관리자 목록.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID, unique |
| `branch_id` | 지점 마스터/일반 어드민의 소속 지점 |
| `nickname` | 카카오 닉네임 |
| `memo` | 내부 메모 |
| `role` | `integrated_master`, `branch_master`, `admin` |
| `is_active` | 활성 여부 |
| `created_at`, `updated_at` | 생성/수정 시각 |

제약:

- `integrated_master`는 `branch_id`가 없어야 한다.
- `branch_master`, `admin`은 `branch_id`가 있어야 한다.

### `login_attempts`

카카오 로그인 시도 계정 집계.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID, unique |
| `nickname` | 최근 닉네임 |
| `attempt_count` | 누적 시도 수 |
| `last_status` | 최근 상태 |
| `first_attempt_at`, `last_attempt_at` | 최초/최근 시도 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### `login_attempt_logs`

로그인 시도 이벤트 원본 로그.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `kakao_user_id` | 카카오 사용자 ID |
| `nickname` | 시도 당시 닉네임 |
| `status` | `allowed` 또는 `blocked` |
| `attempted_at` | 시도 시각 |
| `created_at` | 생성 시각 |

### `sessions`

관리자 세션 저장 테이블.

| 컬럼 | 설명 |
| --- | --- |
| `id` | PK |
| `session_token` | 쿠키와 매칭되는 unique 토큰 |
| `kakao_user_id` | 로그인한 카카오 ID |
| `branch_id` | 통합 마스터가 아니면 소속 지점 |
| `nickname` | 로그인 시 닉네임 |
| `role` | 현재 권한 |
| `is_master` | 통합 마스터 여부 |
| `created_at` | 생성 시각 |
| `expires_at` | 만료 시각 |

## 관계

```text
branches 1 --- N designers
branches 1 --- N documents
branches 1 --- N admin_users
branches 1 --- N sessions

designers 1 --- N documents
templates 1 --- N documents
notification_templates 1 --- N documents

login_attempts 1 --- N login_attempt_logs (logical by kakao_user_id)
```

## 애플리케이션 규칙

DB FK만으로 표현되지 않는 규칙은 아래와 같다.

1. 지점 마스터는 자기 지점 데이터만 관리한다.
2. 일반 어드민도 자기 지점 문서만 본다.
3. 문서 발급 시 디자이너는 선택 지점 소속이어야 한다.
4. 템플릿은 공용이므로 지점 검증 대상이 아니다.
5. 공개 서명은 휴대폰 뒷자리 4자리 검증 후에만 가능하다.

## 인덱스

주요 인덱스:

- `documents_created_at_idx`
- `login_attempts_last_attempt_at_idx`
- `login_attempt_logs_kakao_user_id_idx`
- `sessions_expires_at_idx`

## RLS

- 모든 테이블에 RLS는 켜져 있다.
- 실제 접근 제어는 서버에서 `SUPABASE_SECRET_KEY`로만 DB에 접근하는 앱 코드가 담당한다.

## 변경 시 주의

1. DB를 바꾸면 [`/Users/user/projects/workspace/elvano_hair/supabase/schema.sql`](/Users/user/projects/workspace/elvano_hair/supabase/schema.sql)과 [`/Users/user/projects/workspace/elvano_hair/lib/db.js`](/Users/user/projects/workspace/elvano_hair/lib/db.js)를 같이 수정한다.
2. 이 프로젝트는 incremental migration 대신 reset schema를 기준으로 관리한다.
3. 문서 스냅샷 컬럼은 임의로 줄이지 않는 편이 안전하다.
