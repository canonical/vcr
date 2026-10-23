# VCR — Video Course Recorder

[![video-course-recorder](https://snapcraft.io/video-course-recorder/badge.svg)](https://snapcraft.io/video-course-recorder)

VCR turns training courses into code. Each slide, terminal demo, browser walkthrough,
and narration is expressed as source files. Courses are updated with a git patch —
no re-recording needed.

Built on [Slidev](https://sli.dev) and bundled as a single snap with:
- **[VHS](https://github.com/charmbracelet/vhs)** — terminal GIF recordings
- **[Playwright](https://playwright.dev/)** — browser session recordings
- **[FFmpeg](https://ffmpeg.org/)** — video conversion
- **[Piper](https://github.com/rhasspy/piper)** — local text-to-speech

## Quick Start

The first VCR release is available on the Snap Store's `latest/edge` channel. Other
channels may not have a release yet; check `snap info video-course-recorder` for
current availability. Install the edge release with:

```bash
sudo snap install video-course-recorder --edge
video-course-recorder --help
```

The snap declares the `vcr` command alias. If it is not available (for example,
a locally installed `--dangerous` build), create it with:

```bash
sudo snap alias video-course-recorder vcr
```

To use VCR, clone a content repository with a `modules/` directory and a
`package.json`, then run a module command from inside it:

```bash
git clone <content-repo-url>
cd <content-repo>
pnpm install          # install the content repo's Slidev/theme dependencies
vcr dev ubuntu        # start Slidev for modules/ubuntu/en/index.md
```


## CLI Usage

```
vcr <command> <module> [--locale <xx>] [options]
```

Commands that take a module are **module-aware**: they auto-detect a content repo
(has `modules/` + `package.json`) and resolve `<module> --locale en` →
`modules/<module>/en/index.md`.

### Render (pre-compute assets)

| Command | Description |
|---|---|
| `vcr render-audio <module>` | Pre-render speech audio (Piper TTS → WAV) |
| `vcr render-terminal <module>` | Pre-render terminal recordings (VHS tape → GIF) |
| `vcr render-playwright <module>` | Pre-render browser recordings (Playwright → WebM) |

Renderers scan the module entry and its recursively imported Markdown sources (`src:`
frontmatter). They only create artifacts for matching `speech`/`tts`, `terminal`/`tape`,
or `playwright` blocks, respectively. Outputs go to `audio-cache/`, `terminal-cache/`,
and `playwright-cache/` inside the module. If a source contains no matching blocks, VCR
reports that no artifacts were generated rather than implying files were written.

### Build (produce artifacts)

| Command | Description |
|---|---|
| `vcr build-slides <module>` | Build a static Slidev SPA for hosting or live presenting |
| `vcr export-slides <module> [--format pdf|png|pptx|pptx-editable|md]` | Export slides to PDF, images, PowerPoint, or Markdown |
| `vcr build-scorm <module>` | Planned; currently exits with a not-implemented error |

### Record

Recording commands start a temporary local Slidev dev server for the selected module,
wait until it is ready, record the deck, and stop the server automatically. No separate
`vcr dev` process is needed. Advanced users can set `SLIDEV_URL` to record from an
already-running server instead.

| Command | Description |
|---|---|
| `vcr generate-durations <module> [--fallback 1000] [--padding 500] [--dry-run]` | Generate per-slide timings from cached audio/video/terminal media |
| `vcr record-video <module> [--format webm|mp4] [--duration=1500ms] [--durations-file=<path>]` | Generate per-slide timings automatically unless overridden, then record the deck in WebM (default) or MP4 |

Use `vcr <command> --help` (or `vcr help <command>`) for command-specific flags,
defaults, output details, and examples. Although `build-scorm` appears in CLI
help, it is not implemented yet and currently exits with a not-implemented error.

`generate-durations` writes `durations.txt` next to the module's `index.md` by default.
Use `--output <path>` to choose another location. It uses the longest detected media
length on a slide plus the padding; slides without detected media use the fallback.

### Operations

| Command | Description |
|---|---|
| `vcr dev <module>` | Start Slidev dev server for live editing |
| `vcr validate <module>` | Validate course content for correctness |

### Meta

| Command | Description |
|---|---|
| `vcr help [<command>]` | Show the command list or detailed help |
| `vcr version` | Print the installed VCR version |

### Examples

```bash
# Generate per-slide timings from the deck, record WebM, and stop the server automatically
vcr record-video ubuntu

# Use a uniform step duration instead of generated per-slide timings
vcr record-video ubuntu --duration=1500ms

# Choose MP4 instead
vcr record-video ubuntu --format mp4 --duration=1500ms

# Optional: generate/preview per-slide timing metadata
vcr generate-durations ubuntu --dry-run
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

VCR is packaged as a **strictly confined** snap on the `core24` (Ubuntu 24.04)
base. It declares the `home`, `network`, `network-bind`, `browser-support`,
`desktop`, `desktop-legacy`, and `opengl` interfaces for course files, local
Slidev servers, browser recording, and desktop integration. See
[snap/README.md](snap/README.md) for the packaging details.

### Bundled tools

| Tool | Source | Version |
|---|---|---|
| Node.js | Snapcraft npm plugin | 24.x |
| Slidev CLI | npm global install | 53.0.0 |
| Slidev themes | npm global install | 0.25.0 |
| FFmpeg / ffprobe | Ubuntu 24.04 `stage-packages` | Ubuntu archive version (not pinned by VCR) |
| VHS | Go build from source | v0.9.0 |
| Piper TTS | `piper-tts/edge` snap | edge (not pinned by VCR) |
| Playwright + Chromium | npm + browser install | 1.64.0 |

The source workspace uses its own lockfile (`slidev/src/pnpm-lock.yaml`), which
currently resolves Slidev CLI 52.16.0 and Playwright 1.61.0. The snap build pins
different versions explicitly; the table above describes the packaged snap.

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

## Build and Test from Source

The module-aware `vcr` CLI is assembled into the snap by `snap/snapcraft.yaml`;
there are no root-level `pnpm run dev` or `pnpm run record-video` scripts. To
work on the Slidev-side scripts and run their unit tests:

```bash
cd slidev/src
pnpm install --frozen-lockfile
node --test scripts/*.test.js
```

To build and exercise the full CLI, install Snapcraft and have an initialized
LXD available, then build and install a local snap:

```bash
snapcraft pack --use-lxd
sudo snap install ./video-course-recorder_*.snap --dangerous
```

Run the end-to-end smoke suite against the installed snap from the repository
root. It creates the `vcr` alias if needed and uses an existing
`~/workspace/partner-enablement` checkout when present; otherwise set
`VCR_SMOKE_CONTENT_REPO` to a content repo path.

```bash
./snap/test-smoke.sh
# Example with a checkout elsewhere:
VCR_SMOKE_CONTENT_REPO=/path/to/partner-enablement ./snap/test-smoke.sh
```

GitHub Actions runs the snap build and smoke suite for pushes to `main` and pull
requests. The `Test` workflow runs the Spread verification suite on pull requests.
The manually dispatched `Release` workflow publishes to the selected Snap Store
channel (`edge`, `beta`, `candidate`, or `stable`). The separate `Version Bump`
workflow creates the next semver tag; stable releases also create a GitHub
Release.
