# VCR — Video Course Recorder

VCR turns training courses into code. Each slide, terminal demo, browser walkthrough,
and narration is expressed as source files. Courses are updated with a git patch —
no re-recording needed.

Built on [Slidev](https://sli.dev) and bundled as a single snap with:
- **[VHS](https://github.com/charmbracelet/vhs)** — terminal GIF recordings
- **[Playwright](https://playwright.dev/)** — browser session recordings
- **[FFmpeg](https://ffmpeg.org/)** — video conversion
- **[Piper](https://github.com/rhasspy/piper)** — local text-to-speech

## Quick Start

```bash
# Build & install the snap
snapcraft pack --use-lxd
sudo snap install ./video-course-recorder_0.1.0_amd64.snap --dangerous --classic

# Local/dangerous installs don't get the store auto-alias, so add it manually:
sudo snap alias video-course-recorder vcr

# Test it
./snap/test-smoke.sh

# Clone a content repo and start developing
git clone <content-repo-url>
cd <content-repo>
pnpm install          # install Slidev + themes for the content repo
vcr dev ubuntu        # start Slidev dev server for the "ubuntu" module
```

## CLI Usage

```
vcr <command> <module> [--locale <xx>] [options]
```

All commands are **module-aware**: they auto-detect a content repo (has `modules/` +
`package.json`) and resolve `<module> --locale en` → `modules/<module>/en/index.md`.

### Render (pre-compute assets)

| Command | Description |
|---|---|
| `vcr render-audio <module>` | Pre-render speech audio (Piper TTS → WAV) |
| `vcr render-terminal <module>` | Pre-render terminal recordings (VHS tape → GIF) |
| `vcr render-playwright <module>` | Pre-render browser recordings (Playwright → WebM) |

### Build (produce artifacts)

| Command | Description |
|---|---|
| `vcr build-slides <module>` | Build static Slidev SPA (`slidev build`) |
| `vcr build-scorm <module>` | Build SCORM 1.2 ZIP for LMS delivery |

### Record

| Command | Description |
|---|---|
| `vcr generate-durations <module>` | Generate per-slide timing from cached durations |
| `vcr record-animated <module>` | Record browser video of slides with timed transitions |
| `vcr record-video <module>` | Record animated + convert to MP4 via FFmpeg |

### Operations

| Command | Description |
|---|---|
| `vcr dev <module>` | Start Slidev dev server for live editing |
| `vcr validate <module>` | Validate course content for correctness |

### Examples

```bash
# Develop slides locally
vcr dev ubuntu
vcr dev ubuntu --locale es

# Build static site for hosting
vcr build-slides ubuntu --base /courses/ubuntu/

# Pre-render all assets
vcr render-audio ubuntu --model en_US-lessac-medium.onnx
vcr render-terminal ubuntu
vcr render-playwright ubuntu

# Record final video
vcr record-video ubuntu --duration=1500ms
```

## Content Repo Structure

VCR CLI expects a content repository with this layout:

```
partner-enablement/
├── modules/
│   └── ubuntu/
│       ├── en/
│       │   └── index.md        ← Slidev entry point
│       └── es/
│           └── index.md
├── shared/                      ← brand assets, themes
├── package.json                 ← @slidev/cli + theme deps
└── courses/                     ← course manifests
```

Run `pnpm install` inside the content repo to install Slidev and theme dependencies
locally (Vite needs writable `node_modules` for its dep cache).

## Snap Details

Classic confinement — VCR needs full filesystem access for development workflows
(Playwright Chromium sandboxing, arbitrary project directories). See
[snap/README.md](snap/README.md) for confinement rationale and build architecture.

### Bundled tools

| Tool | Source | Version |
|---|---|---|
| Node.js | npm plugin | v22.x |
| Slidev | npm (`@slidev/cli`) | latest |
| FFmpeg | `ffmpeg/latest/stable` snap | latest |
| VHS | Go build from source | v0.9.0 |
| Piper TTS | `piper-tts/edge` snap | edge |
| Playwright + Chromium | npm + browser install | 1.61.0 |

## Feature Details

### Terminal recordings in slides

Add a fenced `terminal` or `tape` block to a slide's `index.md`:

````md
```terminal name=install-demo
Set Width 1200
Set Height 600
Type "echo hello from a cached terminal recording"
Enter
Sleep 1s
```
````

Then run `vcr render-terminal <module>`. The renderer executes each tape block with
`vhs`, writes the generated GIF under `terminal-cache/`, and replaces the source
fence with a cached block that Slidev renders directly. Re-running regenerates
only changed tapes.

### Playwright browser recordings

Add a fenced `playwright` block:

````md
```playwright name=demo width=1280 height=720
export default async function ({ page }) {
  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Example Domain" }).waitFor();
  await page.waitForTimeout(1000);
}
```
````

Then run `vcr render-playwright <module>`. The renderer records the browser context
as WebM and caches videos under `playwright-cache/`.

Each session also receives a `demo` helper for guided, learner-friendly
interaction: a visible pointer that travels to a target, a temporary highlight,
readable typing, and instructional pauses.

````md
```playwright name=guided width=1280 height=720
export default async function ({ page, demo }) {
  await page.goto("https://example.com");
  await demo.highlight(page.getByRole("heading", { name: "Example Domain" }), 1200);
  await demo.click(page.getByRole("link", { name: "More information" }));
  await demo.type(page.getByRole("searchbox"), "microcloud");
  await demo.wait(800);
}
```
````

The helper is a thin layer over native Playwright locators and never replaces
navigation, locators, or assertions. See [docs/playwright-actions.md](docs/playwright-actions.md)
for the full action list and configuration, and
[slidev/src/playwright-actions-example.md](slidev/src/playwright-actions-example.md)
for a renderable, product-neutral example.

### Speech audio in slides

Add a fenced `speech` block:

````md
```speech name=intro
Welcome to the MicroCloud lesson. This narration is generated locally and cached.
```
````

Then run `vcr render-audio <module> --model path/to/voice.onnx`. WAV files are
written under `audio-cache/` with autoplaying `<audio>` elements.

## Development (without snap)

```bash
pnpm install
pnpm run dev              # Slidev dev server
pnpm run record-video     # Record browser video
pnpm run terminal:render  # Render terminal tapes
pnpm run audio:render     # Render speech audio
```
