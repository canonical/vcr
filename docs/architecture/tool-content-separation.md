# VCR Tool / Content Separation

_Decided 2026-07-15. Captures the agreed architecture for separating the VCR tool from Canonical partner enablement course content._

---

## Goal

- **`canonical/vcr`** — an installable, content-free tool anyone can use to build their own courses
- **`canonical/partner-enablement`** — Canonical's course content repo; consumes VCR as a dependency

---

## Three Build Targets

All three targets consume the same `slides.md` and `audio-cache/`. Source of truth is always the MD file.

```
slides.md  ──→  vcr audio:render  ──→  audio-cache/
                                            │
               ┌────────────────────────────┼────────────────────┐
               ▼                            ▼                     ▼
         vcr build:scorm              vcr build:slides       vcr record:video
         (SCORM 1.2 ZIP,              (static Slidev SPA,    (MP4,
          LMS delivery)                presenter/web)         narrated + timed)
```

### 1. `vcr build:scorm`
**For:** LMS delivery (Moodle, Totara, Docebo, etc.)

**Pipeline:**
```
vcr audio:render          →  audio-cache/
slidev build              →  dist/   (static Slidev SPA)
inject imsmanifest.xml    →  dist/   (generated from slides.md front-matter)
inject scorm-bridge.js    →  dist/   (Slidev plugin: reports progress/completion via SCORM 1.2 API)
zip dist/                 →  <course>-<locale>-scorm-<version>.zip
```

**Narration:** Always included — audio-cache files bundled in `dist/`.

**SCORM bridge behaviour:**
- `LMSInitialize()` on page load
- `LMSSetValue("cmi.core.lesson_status", "incomplete")` on start
- `LMSSetValue("cmi.core.lesson_location", slideNumber)` as learner advances
- `LMSSetValue("cmi.core.lesson_status", "completed")` + `LMSFinish()` on last slide
- Hooks into Slidev's `useNav()` / `$slidev.nav` to watch `currentSlide`

**SCORM version:** 1.2 (widest LMS compatibility). Upgrade to 2004 later if needed.

---

### 2. `vcr build:slides`
**For:** Live presenter laptop, internal web hosting, GitHub Pages.

**Pipeline:**
```
slidev build  →  dist/
```

**Narration:** Controlled by `--with-narration` / `--without-narration` flag.
- `--with-narration` (default): audio-cache files included, `<audio>` elements autoplay
- `--without-narration`: pre-pass strips `<audio>` elements from built output so a live presenter can talk over slides without fighting autoplay

**Hosting:** No base URL complexity — defaults work for localhost. Pass `--base` to `slidev build` if deploying to a subpath.

---

### 3. `vcr record:video`
**For:** Async video delivery (YouTube, internal video platform, LMS video embed).

**Pipeline:**
```
vcr audio:render          →  audio-cache/
vcr durations:generate    →  durations.txt   (max of audio/terminal/video per slide)
slidev dev                →  :3030
vcr record:animated       →  videos/slidev-recording.webm   (Playwright, timed by durations.txt)
ffmpeg (automated)        →  videos/slidev-recording.mp4
```

**Narration:** Always included — audio plays during Playwright recording and is captured in the WebM.

**Timing:** `durations.txt` drives transitions. Each slide duration = max(audio_duration, terminal_tape_duration, video_duration) + 500ms padding. Silent slides default to 1000ms (matches `DEFAULT_STEP_DURATION_MS`).

**Resolution:** 1920×1080 (hardcoded viewport in `record-slidev-animated.js`).

---

## Repo Split

### `canonical/vcr` — the tool
Zero course content. Contains:
- All render/record/build scripts (`scripts/`)
- Reusable Vue components (`components/`)
- Slidev setup/styles/snippets
- A minimal example deck (`slides.md`) demonstrating every VCR feature
- `bin/vcr.js` CLI entry point so `vcr <command>` works when installed
- `vcr.config.js` support (see Configuration below)
- `.env.elevenlabs.example`

**Not in the tool repo:**
- Course slides, narration scripts, translations
- `audio-cache/`, `terminal-cache/`, `playwright-cache/`, `videos/` (gitignored build outputs)
- Speaker headshots, course logos, brand assets

### `canonical/partner-enablement` — the content repo
Course content structured by locale and module. Consumes VCR as a dependency.

```
content/
  en/
    courses/<course-id>/course.md
    modules/<module-id>/
      module.md
      units/<unit-id>/
        content.md          ← source slides (Slidev MD)
        audio-cache/        ← committed produced audio (Git LFS)
        terminal-cache/     ← committed produced GIFs (Git LFS)
        playwright-cache/   ← committed produced WebMs (Git LFS)
        videos/             ← committed produced video (Git LFS)
  es/  it/  pt/  ...        ← translated equivalents

slides/                     ← legacy PDF/slide-map (migration only, retire when done)
aulas/                      ← PPTX source files + migration scripts (retire when done)
player/                     ← legacy static PNG player (retired — replaced by Slidev SCORM build)
build/                      ← gitignored
*.zip                       ← gitignored

package.json                ← depends on @canonical/vcr
vcr.config.js               ← Canonical substitutions, voice config
Makefile                    ← top-level build targets
.gitattributes              ← Git LFS: *.mp3 *.wav *.gif *.webm *.mp4
```

**`package.json` scripts:**
```json
{
  "scripts": {
    "audio:render":       "vcr audio:render",
    "terminal:render":    "vcr terminal:render",
    "durations:generate": "vcr durations:generate",
    "record:video":       "vcr record:animated --durations-file=durations.txt",
    "build:slides":       "vcr build:slides",
    "build:scorm":        "vcr build:scorm",
    "validate":           "vcr validate"
  },
  "devDependencies": {
    "@canonical/vcr": "github:canonical/vcr#main"
  }
}
```

**`Makefile`:**
```makefile
course ?= portfolio-overview
locale ?= en

audio:
	pnpm audio:render --locale $(locale)

record:
	pnpm durations:generate --course $(course) --locale $(locale)
	pnpm record:video --course $(course) --locale $(locale)

slides:
	pnpm build:slides --course $(course) --locale $(locale)

scorm:
	pnpm build:scorm --course $(course) --locale $(locale)

all: audio record slides scorm
```

---

## Configuration — `vcr.config.js`

Any VCR workspace (tool or content repo) can place a `vcr.config.js` at the root. VCR scripts read it if present (via `--config` flag or CWD auto-detect).

```js
// vcr.config.js
export default {
  elevenlabs: {
    // "extend" (default): adds to / overrides entries in the built-in Canonical table
    // "replace": discards the built-in table entirely and uses only what's listed here
    substitutionsMode: "extend",
    substitutions: [
      ["MyProduct", "my-prod"],     // content-repo-specific addition
      ["MAAS", "mahz"],             // same as built-in default — no-op when extending
    ],
  },
}
```

**Runtime override:** `--substitutions-file=substitutions.json` on any `audio:render` call.

The built-in Canonical substitution table lives in `scripts/render-speech-audio.js` (`ELEVENLABS_SUBSTITUTIONS`). It is Canonical-specific but ships with VCR for now since VCR is a Canonical-internal tool. If VCR is ever open-sourced, the built-in table moves to `partner-enablement/vcr.config.js` and the built-in default becomes empty.

---

## What Moves from `partner-enablement/tools/` → `canonical/vcr`

| Script | Destination | Status |
|---|---|---|
| `preprocess_narration.py` substitutions | `scripts/render-speech-audio.js` | ✅ Done (PR #33) |
| `generate_slide_audio.py` | Superseded by `audio:render` | Replace with content restructure |
| `synthesise_audio.sh` | Superseded by `vcr audio:render --all` | Replace |
| `build_manifest.py` | `scripts/build-manifest.js` | Pending |
| `build_player.sh` | Superseded by `vcr build:scorm` (Slidev-based) | Replace |
| `build_scorm.sh` | `scripts/build-scorm.sh` | Pending |
| `validate_content.py` | `scripts/validate-content.js` | Pending |
| `new_unit.sh` / `new_translation.sh` | `scripts/new-unit.sh` etc. | Pending |
| `composite_dividers.py` | `scripts/composite-dividers.py` | Pending |

**Stays in `partner-enablement` (content-specific, not tool):**
- `gen_content_md.py` — generates `content.md` stubs from the specific Canonical PPTX corpus
- `export_slides_en.py` — one-time PPTX→PNG migration helper; retire once all content is in MD
- `fix_en_text.py` — PPTX text fixer for this specific corpus

---

## PNG Player Retirement

The legacy `player/` (static HTML + PNGs + audio) is **retired**. The Slidev build replaces it as the SCORM payload. No more LibreOffice → PDF → PNG pipeline for delivery. `export_slides_en.py` survives only as a migration aid for converting existing PPTX decks to MD form.

---

## Migration Order

1. ✅ Port ElevenLabs substitutions to VCR (PR #33)
2. ✅ `generate-durations.js` — per-slide audio duration calculation (PR #34)
3. ✅ Automate ffmpeg WebM→MP4 in recorder (PR #34)
4. Add `vcr.config.js` support + substitution merge/replace mode
5. `vcr build:slides` — `slidev build` wrapper with `--with-narration` flag
6. SCORM bridge Slidev plugin + `vcr build:scorm`
7. `bin/vcr.js` CLI entry point
8. Port `build-manifest.js`, `build-scorm.sh`, `validate-content.js` to VCR
9. Set up Git LFS in `partner-enablement`
10. Add `package.json` + `vcr.config.js` + `Makefile` to `partner-enablement`
11. Delete migrated/superseded tools from `partner-enablement/tools/`
12. Strip demo content from `canonical/vcr`, replace with minimal example deck
