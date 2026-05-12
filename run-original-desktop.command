#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3001}"
URL="http://localhost:${PORT}/desktop"
LOG_FILE="${PROJECT_DIR}/.desktop-app.log"

cd "$PROJECT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm을 찾을 수 없습니다. Node.js 설치 상태를 확인해주세요."
  read -r "unused?Enter 키를 누르면 종료합니다."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "처음 실행 준비 중입니다. 필요한 패키지를 설치합니다."
  npm install
fi

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "이미 ${PORT}번 포트에서 앱이 실행 중입니다."
  open "$URL"
  echo "원본 데스크톱 앱: $URL"
  read -r "unused?Enter 키를 누르면 창을 닫습니다."
  exit 0
fi

echo "원본 데스크톱 앱을 시작합니다."
echo "주소: $URL"
echo "로그: $LOG_FILE"

npm run dev -- --port "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

for _ in {1..40}; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    open "$URL"
    echo "브라우저에서 원본 데스크톱 앱을 열었습니다."
    echo "이 창을 닫거나 Ctrl+C를 누르면 로컬 서버가 종료됩니다."
    wait "$SERVER_PID"
    exit 0
  fi
  sleep 0.5
done

echo "앱 시작에 시간이 오래 걸리고 있습니다. 로그를 확인해주세요:"
echo "$LOG_FILE"
read -r "unused?Enter 키를 누르면 종료합니다."
