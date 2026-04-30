#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_ROOT="$SCRIPT_DIR/.next-prod"
PORT=""
SERVER_LOG="$SCRIPT_DIR/scripts/launch-mac.log"

show_message() {
  /usr/bin/osascript -e "display alert \"Susi Calculator\" message \"$1\""
}

if [ ! -d "$SITE_ROOT" ]; then
  show_message "The static build folder (.next-prod) was not found."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  show_message "python3 is required on macOS to run this portable package."
  exit 1
fi

for candidate in $(seq 3010 3030); do
  if ! lsof -iTCP:"$candidate" -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT="$candidate"
    break
  fi
done

if [ -z "$PORT" ]; then
  show_message "No free port was found between 3010 and 3030."
  exit 1
fi

mkdir -p "$SCRIPT_DIR/scripts"
cd "$SITE_ROOT"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 > "$SERVER_LOG" 2>&1 &

sleep 1
/usr/bin/open "http://127.0.0.1:$PORT/calculator.html"
