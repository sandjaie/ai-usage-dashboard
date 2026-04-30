#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.next/dev-server.pid"
LOG_FILE="$ROOT_DIR/.next/dev-server.log"
APP_PORT="${APP_PORT:-3900}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
REQUIRED_ENV_KEYS=(
  "CLAUDE_STATUS_COMMAND"
  "CODEX_STATUS_COMMAND"
  "CODEX_USAGE_URL"
  "CLAUDE_USAGE_URL"
  "PLAYWRIGHT_PROFILE_DIR"
)

usage() {
  cat <<'EOF'
AI Usage Dashboard manager

Usage:
  ./scripts/dashboard.sh <command>

Commands:
  setup             Install dependencies and create .env.local from template if missing
  doctor            Run sanity checks (env, dependencies, directories)
  start             Start Next.js dev server in background (localhost:${APP_PORT})
  stop              Stop background dev server
  restart           Restart background dev server
  status            Show dev server status
  logs              Tail dev server logs
  refresh           Run provider refresh script once
  playwright-codex  Run Codex Playwright usage scraper
  clean-cache       Remove local cache/playwright snapshot files
  help              Show this help
EOF
}

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

get_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    echo "$ENV_FILE"
    return 0
  fi
  if [[ -f "$ROOT_DIR/.env.local" ]]; then
    echo "$ROOT_DIR/.env.local"
    return 0
  fi
  return 1
}

has_non_empty_env_key() {
  local file="$1"
  local key="$2"
  local value
  value="$(awk -F= -v k="$key" '$1==k {print substr($0, index($0,$2)); exit}' "$file" 2>/dev/null || true)"
  [[ -n "${value// }" ]]
}

check_env_cmd() {
  local file
  if ! file="$(get_env_file)"; then
    echo "Missing env file. Create $ROOT_DIR/.env (or .env.local) first."
    echo "Tip: copy from $ROOT_DIR/.env.local.example"
    return 1
  fi

  local missing=()
  local key
  for key in "${REQUIRED_ENV_KEYS[@]}"; do
    if ! has_non_empty_env_key "$file" "$key"; then
      missing+=("$key")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Env validation failed in: $file"
    echo "Missing/empty keys:"
    for key in "${missing[@]}"; do
      echo "  - $key"
    done
    return 1
  fi

  echo "Env validation passed: $file"
}

doctor_cmd() {
  echo "Running dashboard doctor..."
  local failed=0

  if [[ -d "$ROOT_DIR/node_modules" ]]; then
    echo "- Dependencies: OK"
  else
    echo "- Dependencies: Missing (run ./scripts/dashboard.sh setup or npm install)"
    failed=1
  fi

  if check_env_cmd >/dev/null 2>&1; then
    local file
    file="$(get_env_file)"
    echo "- Env file: OK ($file)"
  else
    echo "- Env file: Failed"
    check_env_cmd || true
    failed=1
  fi

  mkdir -p "$ROOT_DIR/data/cache" "$ROOT_DIR/data/playwright" "$ROOT_DIR/.next"
  echo "- Directories: OK (data/cache, data/playwright, .next)"

  if is_running; then
    echo "- Dev server: Running (pid: $(cat "$PID_FILE"), url: http://localhost:${APP_PORT})"
  else
    echo "- Dev server: Not running"
  fi

  if [[ "$failed" -eq 1 ]]; then
    echo "Doctor found issues."
    exit 1
  fi

  echo "Doctor check passed."
}

setup_cmd() {
  cd "$ROOT_DIR"
  npm install
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env.local.example" "$ROOT_DIR/.env"
    echo "Created .env from .env.local.example"
  elif [[ ! -f "$ROOT_DIR/.env.local" ]]; then
    cp "$ROOT_DIR/.env.local.example" "$ROOT_DIR/.env.local"
    echo "Created .env.local from .env.local.example"
  else
    echo ".env and/or .env.local already exists"
  fi
  doctor_cmd || true
  echo "Setup complete"
}

start_cmd() {
  cd "$ROOT_DIR"
  doctor_cmd
  if is_running; then
    echo "Dev server already running (pid: $(cat "$PID_FILE"))"
    exit 0
  fi

  mkdir -p "$(dirname "$PID_FILE")"
  echo "Starting dev server..."
  nohup npm run dev >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1

  if is_running; then
    echo "Started (pid: $(cat "$PID_FILE"))"
    echo "URL: http://localhost:${APP_PORT}"
    echo "Logs: $LOG_FILE"
  else
    echo "Failed to start. Check logs:"
    echo "$LOG_FILE"
    exit 1
  fi
}

stop_cmd() {
  if ! is_running; then
    rm -f "$PID_FILE"
    echo "Dev server is not running"
    exit 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  echo "Stopping dev server (pid: $pid)..."
  kill "$pid" 2>/dev/null || true
  sleep 1

  if kill -0 "$pid" 2>/dev/null; then
    echo "Force stopping..."
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo "Stopped"
}

status_cmd() {
  if is_running; then
    echo "Running (pid: $(cat "$PID_FILE"))"
    echo "URL: http://localhost:${APP_PORT}"
    echo "Logs: $LOG_FILE"
  else
    echo "Not running"
  fi
}

logs_cmd() {
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "No log file found at $LOG_FILE"
    exit 1
  fi
  tail -f "$LOG_FILE"
}

refresh_cmd() {
  cd "$ROOT_DIR"
  doctor_cmd
  npm run refresh
}

playwright_codex_cmd() {
  cd "$ROOT_DIR"
  doctor_cmd
  npm run playwright:codex
}

clean_cache_cmd() {
  rm -rf "$ROOT_DIR/data/cache" "$ROOT_DIR/data/playwright"
  echo "Removed data/cache and data/playwright"
}

case "${1:-help}" in
  setup) setup_cmd ;;
  doctor) doctor_cmd ;;
  start) start_cmd ;;
  stop) stop_cmd ;;
  restart) stop_cmd; start_cmd ;;
  status) status_cmd ;;
  logs) logs_cmd ;;
  refresh) refresh_cmd ;;
  playwright-codex) playwright_codex_cmd ;;
  clean-cache) clean_cache_cmd ;;
  help|-h|--help) usage ;;
  *)
    echo "Unknown command: $1"
    echo
    usage
    exit 1
    ;;
esac
