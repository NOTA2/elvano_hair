#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_DIR="$ROOT_DIR/.codex-workflows/prompts"
BASE_BRANCH="${BASE_BRANCH:-develop}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
RUN_DIR="${RUN_DIR:-$ROOT_DIR/.codex-workflows/runs/$TIMESTAMP}"
TASK_INPUT="${*:-}"

usage() {
  cat <<'EOF'
사용법:
  scripts/run-dev-workflow.sh "작업 설명"

선택 가능한 환경변수:
  BASE_BRANCH=develop
  RUN_DIR=/absolute/path/to/run-dir
  CODEX_AGENT_MODEL=gpt-5.4-mini

생성 아티팩트:
  00-task.md
  01-plan.md
  02-build.md
  03-performance-validation.md
  04-design-validation.md
EOF
}

if [[ -z "$TASK_INPUT" ]]; then
  usage
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI가 필요하지만 PATH에서 찾지 못했습니다." >&2
  exit 1
fi

mkdir -p "$RUN_DIR"

TASK_FILE="$RUN_DIR/00-task.md"
PLAN_FILE="$RUN_DIR/01-plan.md"
BUILD_FILE="$RUN_DIR/02-build.md"
PERFORMANCE_FILE="$RUN_DIR/03-performance-validation.md"
DESIGN_FILE="$RUN_DIR/04-design-validation.md"

printf "%s\n" "$TASK_INPUT" > "$TASK_FILE"

MODEL_ARGS=()
if [[ -n "${CODEX_AGENT_MODEL:-}" ]]; then
  MODEL_ARGS+=(--model "$CODEX_AGENT_MODEL")
fi

render_prompt() {
  local prompt_file="$1"
  shift

  cat "$prompt_file"
  printf "\n## 실행 입력값\n\n"
  printf -- "- 저장소 루트: %s\n" "$ROOT_DIR"
  printf -- "- 기준 브랜치: %s\n" "$BASE_BRANCH"
  printf -- "- 실행 디렉터리: %s\n" "$RUN_DIR"

  while [[ "$#" -gt 0 ]]; do
    local label="$1"
    local file_path="$2"
    shift 2

    printf "\n## %s\n\n" "$label"
    printf "경로: %s\n\n" "$file_path"
    printf "```text\n"
    cat "$file_path"
    printf "\n```\n"
  done
}

run_agent() {
  local prompt_file="$1"
  local output_file="$2"
  shift 2

  render_prompt "$prompt_file" "$@" | codex exec --full-auto --ephemeral --color never --cd "$ROOT_DIR" "${MODEL_ARGS[@]}" -o "$output_file" -
}

echo "기획 에이전트 실행 중..."
run_agent \
  "$PROMPT_DIR/planner.md" \
  "$PLAN_FILE" \
  "작업" "$TASK_FILE"

echo "개발 에이전트 실행 중..."
run_agent \
  "$PROMPT_DIR/builder.md" \
  "$BUILD_FILE" \
  "작업" "$TASK_FILE" \
  "계획" "$PLAN_FILE"

echo "코드 성능 검증 에이전트 실행 중..."
run_agent \
  "$PROMPT_DIR/performance-validator.md" \
  "$PERFORMANCE_FILE" \
  "작업" "$TASK_FILE" \
  "계획" "$PLAN_FILE" \
  "개발 결과" "$BUILD_FILE"

echo "디자인 검증 에이전트 실행 중..."
run_agent \
  "$PROMPT_DIR/design-validator.md" \
  "$DESIGN_FILE" \
  "작업" "$TASK_FILE" \
  "계획" "$PLAN_FILE" \
  "개발 결과" "$BUILD_FILE"

cat <<EOF
워크플로 실행이 완료되었습니다.
아티팩트 저장 위치:
  $RUN_DIR
EOF
