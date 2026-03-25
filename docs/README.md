# Documentation Index

이 디렉터리는 이 저장소만 보고도 프로젝트를 이해하고 이어서 작업할 수 있도록 만든 인수인계 문서 모음이다.

## 권장 읽기 순서

1. [`../README.md`](../README.md)
2. [`APP_STRUCTURE.md`](APP_STRUCTURE.md)
3. [`DOMAIN_RULES.md`](DOMAIN_RULES.md)
4. [`DB_SCHEMA.md`](DB_SCHEMA.md)
5. [`OPERATIONS.md`](OPERATIONS.md)

## 문서 설명

### `APP_STRUCTURE.md`

- Next.js App Router 기준의 디렉터리 구조
- 관리자/고객 공개 페이지 라우트
- 주요 API 엔드포인트
- 권한 체크와 서명 저장 흐름

### `DOMAIN_RULES.md`

- 이 서비스가 해결하는 업무 문제
- 권한 체계와 승인 프로세스
- 지점, 디자이너, 템플릿, 문서의 도메인 규칙
- Bizgo 발송과 공개 서명 링크 운영 규칙

### `DB_SCHEMA.md`

- Supabase Postgres 테이블 구조
- 테이블 간 관계
- 중요한 컬럼과 인덱스
- 데이터 일관성을 위해 지켜야 할 제약

### `OPERATIONS.md`

- 로컬 실행과 Vercel 배포
- 필수 환경변수
- 카카오 로그인 설정
- Bizgo 연동 포인트
- 운영 체크리스트와 알려진 제약

## 현재 구현 기준

- 프레임워크: Next.js 15, React 19
- 데이터 저장소: Supabase Postgres
- 관리자 인증: 카카오 로그인 + 서버 세션
- 메시지 발송: Bizgo 알림톡

## 소스 오브 트루스

- 앱 동작 기준: `app/`, `lib/`, `components/`
- DB 구조 기준: `supabase/schema.sql`
- 환경변수 예시: `.env.example`

문서와 코드가 충돌하면 코드를 우선 확인하고, 필요한 경우 이 문서를 업데이트한다.
