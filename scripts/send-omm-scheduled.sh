#!/bin/bash
#
# OMM scheduled-send wrapper — invoked by launchd at a specific issue's publish time.
# Self-cleans the launchd plist after firing so each schedule is one-shot.
#
# Usage (from launchd plist):
#   /bin/bash scripts/send-omm-scheduled.sh <plist-path> <subject>
#
# Args:
#   $1  Full path to the launchd plist that triggered this run (will be unloaded + removed)
#   $2  Subject line override (passed to send-market-monday.ts via --subject)
#
set -u
PLIST="${1:-}"
SUBJECT="${2:-}"

PROJECT_DIR="/Users/alanmichael/projects/airgrid"
LOG="/tmp/omm-scheduled.log"

# Capture stdout + stderr to log
exec >> "$LOG" 2>&1
echo ""
echo "===== $(date) — OMM scheduled send starting ====="
echo "      plist:   $PLIST"
echo "      subject: $SUBJECT"

# Use the user's nvm-installed Node toolchain
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi
export PATH="$HOME/.nvm/versions/node/v23.7.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$PROJECT_DIR" || { echo "FATAL: cannot cd to $PROJECT_DIR"; exit 2; }

if [ -n "$SUBJECT" ]; then
  npx tsx scripts/send-market-monday.ts --subject "$SUBJECT"
else
  npx tsx scripts/send-market-monday.ts
fi
SEND_RC=$?
echo "===== $(date) — send exited with code $SEND_RC ====="

# Self-clean: unload and remove the plist regardless of success.
# If the send failed, the user can investigate from the log and re-trigger manually.
if [ -n "$PLIST" ] && [ -f "$PLIST" ]; then
  echo "Unloading + removing $PLIST"
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Plist removed."
fi

exit "$SEND_RC"
