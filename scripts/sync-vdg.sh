#!/bin/bash
#
# Sync VDG mirror → production VDG repo
#
# The working copy of the VDG site lives in this repo at
# public/vdg/index.html. The production site is deployed from a
# separate repo at /Users/alanmichael/projects/vdg (connected to
# github.com/Xdrum1/vdg and Amplify app dcbgrkvvzyjfg).
#
# This script syncs the mirror to the production repo, commits,
# and pushes in one step.
#
# Usage:
#   ./scripts/sync-vdg.sh                    # auto-generated commit message
#   ./scripts/sync-vdg.sh "Custom message"   # custom commit message
#

set -euo pipefail

AIRGRID_DIR="/Users/alanmichael/projects/airgrid"
VDG_DIR="/Users/alanmichael/projects/vdg"
MIRROR="$AIRGRID_DIR/public/vdg/index.html"
TARGET="$VDG_DIR/index.html"

# Sanity checks
if [ ! -d "$VDG_DIR" ]; then
  echo "ERROR: VDG repo not found at $VDG_DIR"
  echo "Clone it first: git clone https://github.com/Xdrum1/vdg.git $VDG_DIR"
  exit 1
fi

if [ ! -f "$MIRROR" ]; then
  echo "ERROR: Mirror file not found at $MIRROR"
  exit 1
fi

# Check if there are any differences
if diff -q "$MIRROR" "$TARGET" > /dev/null 2>&1; then
  echo "✓ VDG repo is already in sync with mirror. Nothing to do."
  exit 0
fi

# Show what changed
echo "── Syncing VDG mirror → production repo ──"
echo ""
echo "Changes detected:"
diff --brief "$MIRROR" "$TARGET" || true
echo ""

# Copy the file
cp "$MIRROR" "$TARGET"

# Commit and push from the VDG repo
cd "$VDG_DIR"

# Check if anything is staged for commit (customHttp.yml etc may have
# independent changes — we only touch index.html here)
git add index.html

if git diff --cached --quiet; then
  echo "✓ No index.html changes to commit."
  exit 0
fi

# Build commit message
if [ $# -ge 1 ]; then
  MSG="$1"
else
  MSG="Sync VDG mirror from airgrid repo"
fi

git commit -m "$(cat <<EOF
$MSG

Synced from airgrid/public/vdg/index.html

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"

git push origin main

echo ""
echo "✓ VDG synced and pushed. Amplify will redeploy in 2-3 minutes."
