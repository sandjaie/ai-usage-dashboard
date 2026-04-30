#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.next/dev-server.pid"
LOG_FILE="$ROOT_DIR/.next/dev-server.log"

usage() {
  cat <<'EOF'
AI Usage Dashboard manager

Usage:
  ./scripts/dashboard.sh <command>

Commands:
  setup             Install dependencies and create .env.local from template if missing
  start             Start Next.js dev server in background (localhost:3000)
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

setup_cmd() {
  cd "$ROOT_DIR"
  npm install
  if [[ ! -f "$ROOT_DIR/.env.local" ]]; then
    cp "$ROOT_DIR/.env.local.example" "$ROOT_DIR/.env.local"
    echo "Created .env.local from .env.local.example"
  else
    echo ".env.local already exists"
  fi
  echo "Setup complete"
}

start_cmd() {
  cd "$ROOT_DIR"
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
    echo "URL: http://localhost:3000"
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
  npm run refresh
}

playwright_codex_cmd() {
  cd "$ROOT_DIR"
  npm run playwright:codex
}

clean_cache_cmd() {
  rm -rf "$ROOT_DIR/data/cache" "$ROOT_DIR/data/playwright"
  echo "Removed data/cache and data/playwright"
}

case "${1:-help}" in
  setup) setup_cmd ;;
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
