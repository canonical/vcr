#!/usr/bin/env bash
# VCR snap smoke test — run after `snap install vcr_*.snap --dangerous --classic`
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1 — $2"; ((FAIL++)); }
info()  { echo -e "  ${YELLOW}→${NC} $1"; }

echo "=== VCR Snap Smoke Tests ==="
echo ""

# ── 1. Snap installed ──────────────────────────────────────────────────
echo "[1] Snap installation"
if snap list vcr &>/dev/null; then
  pass "vcr snap is installed ($(snap list vcr | awk 'NR>1{print $2, $3}'))"
else
  fail "vcr snap is not installed" "run: sudo snap install ./vcr_*.snap --dangerous --classic"
fi
echo ""

# ── 2. CLI basics ──────────────────────────────────────────────────────
echo "[2] CLI entry point"
if vcr --help >/dev/null 2>&1; then
  pass "vcr --help works"
else
  fail "vcr --help failed" "check snap install"
fi

if vcr --version >/dev/null 2>&1; then
  pass "vcr --version works"
else
  fail "vcr --version failed" "check snap install"
fi

if vcr help >/dev/null 2>&1; then
  pass "vcr help works"
else
  fail "'vcr help' failed" "check CLI"
fi
echo ""

# ── 3. Bundled binaries ────────────────────────────────────────────────
echo "[3] Bundled binaries on PATH"
for bin in node slidev vhs ffmpeg ffprobe piper; do
  if command -v "$bin" &>/dev/null; then
    pass "$bin is on PATH ($(which "$bin"))"
  else
    # piper might be in /snap/vcr/current/usr/bin via stage-snap
    found=$(find /snap/vcr/current -name "$bin" -type f -o -name "$bin" -type l 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      pass "$bin exists in snap ($found)"
    else
      fail "$bin not found" "should be bundled in snap"
    fi
  fi
done
echo ""

# ── 4. Node.js version ─────────────────────────────────────────────────
echo "[4] Node.js version"
NODE_VER=$(node --version 2>/dev/null || echo "unknown")
if [[ "$NODE_VER" == v22* ]]; then
  pass "Node.js $NODE_VER (expected v22.x)"
else
  info "Node.js $NODE_VER"
fi
echo ""

# ── 5. slidev binary ───────────────────────────────────────────────────
echo "[5] slidev"
SLIDEV_PATH=$(which slidev 2>/dev/null || echo "")
if [ -n "$SLIDEV_PATH" ]; then
  pass "slidev found at $SLIDEV_PATH"
else
  fail "slidev not on PATH" "check snap/bin/slidev"
fi

# Check that the wrapper + real symlink exist
SLIDEV_REAL="/snap/vcr/current/bin/slidev.real"
if [ -L "$SLIDEV_REAL" ] || [ -f "$SLIDEV_REAL" ]; then
  pass "slidev.real exists (wrapper delegates correctly)"
else
  fail "slidev.real missing" "check snap build"
fi
echo ""

# ── 6. Vite cache symlink ──────────────────────────────────────────────
echo "[6] Vite cache redirect"
VITE_SYMLINK="/snap/vcr/current/lib/node_modules/@slidev/cli/node_modules/.vite"
if [ -L "$VITE_SYMLINK" ]; then
  TARGET=$(readlink "$VITE_SYMLINK" 2>/dev/null || echo "unknown")
  if [[ "$TARGET" == /tmp/* ]]; then
    pass ".vite → $TARGET (writable tmp)"
  else
    info ".vite → $TARGET (unexpected target)"
  fi
else
  fail ".vite symlink missing" "Vite will try to write to read-only squashfs"
fi
echo ""

# ── 7. Playwright browsers ─────────────────────────────────────────────
echo "[7] Playwright + Chromium"
PW_BROWSERS="/snap/vcr/current/playwright-browsers"
if [ -d "$PW_BROWSERS/chromium-"* ]; then
  pass "Chromium browser bundled ($(ls "$PW_BROWSERS" | grep chromium | head -1))"
else
  fail "Chromium not found in playwright-browsers" "check playwright-browsers part"
fi

# Verify PLAYWRIGHT_BROWSERS_PATH is set in snap env
PW_ENV=$(vcr --help 2>&1; echo "dummy") # dummy to avoid masking exit code
if [ -d "/snap/vcr/current/playwright-browsers" ]; then
  pass "PLAYWRIGHT_BROWSERS_PATH present in snap"
else
  fail "PLAYWRIGHT_BROWSERS_PATH missing" "check snap environment"
fi
echo ""

# ── 8. Module resolution (dry run if content repo exists) ──────────────
echo "[8] Module resolution"
CONTENT_REPO="${HOME}/workspace/partner-enablement"
if [ -d "$CONTENT_REPO/modules" ] && [ -f "$CONTENT_REPO/package.json" ]; then
  cd "$CONTENT_REPO"
  MODULE=$(ls modules/ 2>/dev/null | head -1)
  if [ -n "$MODULE" ]; then
    LOCALE=$(ls "modules/$MODULE/" 2>/dev/null | head -1)
    if [ -f "modules/$MODULE/$LOCALE/index.md" ]; then
      pass "Content repo detected: modules/$MODULE/$LOCALE/index.md"
      info "Ready for: vcr dev $MODULE --locale $LOCALE"
    else
      info "Module '$MODULE' found but no index.md in locale subdir"
    fi
  else
    info "Content repo exists at $CONTENT_REPO but no modules yet"
  fi
else
  info "No content repo at $CONTENT_REPO — module commands need a content repo"
  info "Clone partner-enablement and run 'pnpm install' there to test full workflow"
fi
echo ""

# ── Summary ────────────────────────────────────────────────────────────
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
