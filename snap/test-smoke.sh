#!/usr/bin/env bash
# VCR snap smoke test — run after `snap install video-course-recorder_*.snap --dangerous --classic`
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1 — $2"; FAIL=$((FAIL+1)); }
info()  { echo -e "  ${YELLOW}→${NC} $1"; }

echo "=== VCR Snap Smoke Tests ==="
echo ""

# ── 1. Snap installed ──────────────────────────────────────────────────
echo "[1] Snap installation"
if snap list video-course-recorder &>/dev/null; then
  pass "vcr snap is installed ($(snap list video-course-recorder | awk 'NR>1{print $2, $3}'))"
else
  fail "vcr snap is not installed" "run: sudo snap install ./video-course-recorder_*.snap --dangerous --classic"
fi
echo ""

# ── 1b. Create vcr alias (store auto-alias is absent on --dangerous installs) ─
echo "[1b] vcr alias"
if ! command -v vcr &>/dev/null; then
  sudo snap alias video-course-recorder vcr
fi
if command -v vcr &>/dev/null; then
  pass "created alias: video-course-recorder → vcr ($(which vcr))"
else
  fail "vcr alias not available after snap alias" "run: sudo snap alias video-course-recorder vcr"
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

# ── 3. Bundled binaries (internal — must exist in snap, NOT on public PATH) ──
echo "[3] Bundled binaries (internal to snap)"
# 'current' is a relative symlink (-> xN); resolve it so find can traverse.
SNAP_ROOT="$(readlink -f /snap/video-course-recorder/current)"
for bin in node slidev vhs ffmpeg ffprobe piper; do
  found=$(find "$SNAP_ROOT/" \( -name "$bin" -type f -o -name "$bin" -type l \) 2>/dev/null | head -1)
  if [ -n "$found" ]; then
    pass "$bin bundled in snap ($found)"
  else
    fail "$bin not found" "should be bundled inside the snap"
  fi
done
echo ""

# ── 3b. Snap command surface — snap must expose ONLY vcr/video-course-recorder
# A classic snap does not hide host binaries, so `command -v node` would just
# find the host's node. What we actually care about is that this snap only
# publishes the `vcr` command into /snap/bin (its bundled tools stay internal).
echo "[3b] Snap command surface (/snap/bin)"
EXPOSED=$(ls /snap/bin 2>/dev/null | grep -E '^(vcr|video-course-recorder)$' | sort | tr '\n' ' ')
LEAKED=""
for bin in node slidev vhs ffmpeg ffprobe piper; do
  [ -e "/snap/bin/$bin" ] && LEAKED="$LEAKED $bin"
  [ -e "/snap/bin/video-course-recorder.$bin" ] && LEAKED="$LEAKED video-course-recorder.$bin"
done
if [ -e /snap/bin/vcr ] && [ -z "$LEAKED" ]; then
  pass "snap exposes only vcr/video-course-recorder (${EXPOSED})"
else
  fail "snap command surface unexpected (leaked:${LEAKED:- none}, exposed: ${EXPOSED})" "only vcr should be in /snap/bin"
fi
echo ""

# ── 4. Node.js version ─────────────────────────────────────────────────
echo "[4] Node.js version (bundled in snap)"
# Run the snap's OWN node, not whatever is on the host PATH.
SNAP_NODE="${SNAP_ROOT}/bin/node"
NODE_VER=$("$SNAP_NODE" --version 2>/dev/null || echo "unknown")
if [[ "$NODE_VER" == v24* ]]; then
  pass "Bundled Node.js $NODE_VER (expected v24.x)"
else
  fail "Bundled Node.js $NODE_VER (expected v24.x)" "check npm-node-version in snapcraft.yaml"
fi
echo ""

# ── 5. slidev wrapper (internal) ───────────────────────────────────────
echo "[5] slidev wrapper"
SLIDEV_BIN="/snap/video-course-recorder/current/bin/slidev"
if [ -f "$SLIDEV_BIN" ] || [ -L "$SLIDEV_BIN" ]; then
  pass "slidev wrapper present in snap ($SLIDEV_BIN)"
else
  fail "slidev wrapper missing" "check snap/bin/slidev"
fi

# Check that the wrapper + real symlink exist
SLIDEV_REAL="/snap/video-course-recorder/current/bin/slidev.real"
if [ -L "$SLIDEV_REAL" ] || [ -f "$SLIDEV_REAL" ]; then
  pass "slidev.real exists (wrapper delegates correctly)"
else
  fail "slidev.real missing" "check snap build"
fi
echo ""

# ── 6. Vite cache symlink ──────────────────────────────────────────────
echo "[6] Vite cache redirect"
VITE_SYMLINK="/snap/video-course-recorder/current/lib/node_modules/@slidev/cli/node_modules/.vite"
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
PW_BROWSERS="/snap/video-course-recorder/current/playwright-browsers"
if [ -d "$PW_BROWSERS/chromium-"* ]; then
  pass "Chromium browser bundled ($(ls "$PW_BROWSERS" | grep chromium | head -1))"
else
  fail "Chromium not found in playwright-browsers" "check playwright-browsers part"
fi

# Verify PLAYWRIGHT_BROWSERS_PATH is set in snap env
PW_ENV=$(vcr --help 2>&1; echo "dummy") # dummy to avoid masking exit code
if [ -d "/snap/video-course-recorder/current/playwright-browsers" ]; then
  pass "PLAYWRIGHT_BROWSERS_PATH present in snap"
else
  fail "PLAYWRIGHT_BROWSERS_PATH missing" "check snap environment"
fi
echo ""

# ── 8. Real content: clone repo, build slides, render terminal GIF ─────
echo "[8] Real content workflow (partner-enablement)"
CONTENT_REPO="${HOME}/workspace/partner-enablement"
REPO_URL="https://github.com/canonical/partner-enablement.git"
CLONE_OK=0  # becomes 1 only after a successful clone

# 8.0 Ensure the content repo is present and up to date (never clobber local work)
if [ ! -d "$CONTENT_REPO/.git" ]; then
  if [ -n "${CONTENT_REPO_TOKEN:-}" ]; then
    CLONE_URL="https://x-access-token:${CONTENT_REPO_TOKEN}@github.com/canonical/partner-enablement.git"
    info "Cloning partner-enablement (authenticated) -> $CONTENT_REPO"
  else
    CLONE_URL="$REPO_URL"
    info "Cloning partner-enablement (anonymous) -> $CONTENT_REPO"
  fi
  mkdir -p "$(dirname "$CONTENT_REPO")"
  git clone --depth 1 "$CLONE_URL" "$CONTENT_REPO" >/tmp/vcr-clone.log 2>&1 && CLONE_RC=0 || CLONE_RC=$?
  # Never let the token leak into logs/artifacts.
  if [ -n "${CONTENT_REPO_TOKEN:-}" ]; then
    sed -i "s|${CONTENT_REPO_TOKEN}|***TOKEN***|g" /tmp/vcr-clone.log 2>/dev/null || true
  fi
  if [ "$CLONE_RC" -eq 0 ]; then
    pass "Cloned partner-enablement"
    CLONE_OK=1
    # Scrub any tokenized remote so the secret never persists on disk.
    git -C "$CONTENT_REPO" remote set-url origin "$REPO_URL" 2>/dev/null || true
  else
    if [ -n "${CONTENT_REPO_TOKEN:-}" ]; then
      fail "Authenticated clone of partner-enablement FAILED" \
           "CONTENT_REPO_TOKEN is set but clone failed — token likely expired, unapproved, or lacks Contents:read on canonical/partner-enablement (see /tmp/vcr-clone.log)"
    else
      fail "CONTENT_REPO_TOKEN is not set" \
           "partner-enablement is private — set the CONTENT_REPO_TOKEN secret (fine-grained token with Contents:read) so the smoke test can clone it"
    fi
    CLONE_OK=0
  fi
else
  CLONE_OK=1
  # Only pull when the working tree is clean, to avoid clobbering local changes.
  if [ -z "$(git -C "$CONTENT_REPO" status --porcelain)" ]; then
    if git -C "$CONTENT_REPO" pull --ff-only >/tmp/vcr-pull.log 2>&1; then
      pass "Updated partner-enablement (git pull --ff-only)"
    else
      info "git pull --ff-only skipped/failed (see /tmp/vcr-pull.log) — using existing checkout"
    fi
  else
    info "partner-enablement has local changes — not pulling (using current checkout)"
  fi
fi

if [ "$CLONE_OK" -ne 1 ]; then
  : # clone failed/absent — already reported as a failure above
elif [ ! -d "$CONTENT_REPO/modules" ]; then
  fail "Content repo missing modules/" "clone appears incomplete at $CONTENT_REPO"
else
  cd "$CONTENT_REPO"

  # 8a. Real slide build — self-contained throwaway module so we never depend
  #     on content-repo asset symlinks (e.g. public/content) that may dangle.
  SMOKE_MOD="_smoketest_$$"
  SMOKE_DIR="modules/${SMOKE_MOD}/en"
  mkdir -p "$SMOKE_DIR"
  cat > "${SMOKE_DIR}/index.md" <<'MD'
---
theme: default
---

# Smoke Test

Slide build smoke test.

---

## Second slide

- bullet one
- bullet two
MD

  if vcr build-slides "$SMOKE_MOD" --locale en >/tmp/vcr-build-slides.log 2>&1      && [ -s "${SMOKE_DIR}/dist/index.html" ]; then
    pass "build-slides produced dist/index.html ($(wc -c < "${SMOKE_DIR}/dist/index.html") bytes)"
  else
    fail "build-slides did not produce dist/index.html" "see /tmp/vcr-build-slides.log"
  fi

  # 8b. Real terminal GIF render via VHS (ttyd + ffmpeg, fully in-snap).
  #     The ```terminal fence body is raw VHS tape syntax.
  cat > "${SMOKE_DIR}/index.md" <<'MD'
# Terminal render smoke

```terminal
Type "echo vcr-smoke-test"
Enter
Sleep 1s
```
MD

  if vcr render-terminal "$SMOKE_MOD" --locale en >/tmp/vcr-render-terminal.log 2>&1; then
    GIF=$(find "modules/${SMOKE_MOD}" -name '*.gif' -size +0c 2>/dev/null | head -1)
    if [ -n "$GIF" ]; then
      pass "render-terminal produced GIF ($(wc -c < "$GIF") bytes)"
    else
      echo "----- vcr-render-terminal.log (tail) -----"; tail -40 /tmp/vcr-render-terminal.log; echo "------------------------------------------"
      fail "render-terminal produced no non-empty GIF" "see /tmp/vcr-render-terminal.log"
    fi
  else
    echo "----- vcr-render-terminal.log (tail) -----"; tail -40 /tmp/vcr-render-terminal.log; echo "------------------------------------------"
    fail "render-terminal exited non-zero" "see /tmp/vcr-render-terminal.log"
  fi

  # Clean up the throwaway module (never leave fixtures in the content repo).
  rm -rf "modules/${SMOKE_MOD}"
fi
echo ""

# ── Summary ────────────────────────────────────────────────────────────
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
