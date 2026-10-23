# VCR Snap

## Confinement

VCR is currently built with **strict confinement** on the `core24` base. The app
declares the `home`, `network`, `network-bind`, `browser-support`, `desktop`,
`desktop-legacy`, and `opengl` plugs. The `home` interface makes home-directory
content repositories accessible; local Slidev servers use `network-bind`, and
Playwright/Chromium uses the browser and graphics interfaces. Files outside the
interfaces' permitted areas may not be accessible to the snap.

---

## snapcraft.yaml walkthrough

### Metadata

| Field | Value | Notes |
|---|---|---|
| `name` | `video-course-recorder` | Snap Store package name; the app also declares the `vcr` alias |
| `base` | `core24` | Ubuntu 24.04 LTS runtime |
| `confinement` | `strict` | Uses the interfaces listed above |
| `grade` | `stable` | Default build grade; release workflow uses `devel` for edge/beta |

### App

```
apps:
  video-course-recorder:
    command: bin/vcr
    aliases: [vcr]
```

The app sets `PLAYWRIGHT_BROWSERS_PATH`, per-user writable Vite and Chromium
cache directories, the Piper phoneme-data path, and the runtime library search
path. Its `PATH` prefers the snap's bundled `bin/` and `usr/bin/` tools.

### Parts

#### 1. `vcr-source` — Node.js + scripts + stage-snaps

```yaml
plugin: npm
npm-include-node: true
npm-node-version: '24'
stage-snaps:
  - piper-tts/edge
stage-packages:
  - ffmpeg
```

- **`npm` plugin** bundles Node.js 24.x.
- **`stage-snaps`** stages Piper TTS from the Snap Store's `edge` channel.
- **`stage-packages`** obtains FFmpeg and its runtime libraries from the Ubuntu 24.04 archive; its exact version follows that archive and is not pinned in this recipe.
- **`override-build`** installs Slidev CLI 53.0.0 and its themes, patches Slidev's cache/browser-open behavior for strict confinement, and stages VCR scripts, components, styles, and CLI files from the monorepo.

#### 2. `vhs` — terminal recorder

```yaml
plugin: go
source: https://github.com/charmbracelet/vhs
source-type: git
source-tag: v0.9.0
build-environment:
  - CGO_ENABLED: "0"
```

- **`go` plugin** builds `charmbracelet/vhs` from source at tag `v0.9.0`.
- **`CGO_ENABLED: "0"`** produces a fully static binary with no libc dependency.
- vhs is not available as a snap or apt package, so building from source is the only option.
- **`organize: bin/vhs: bin/vhs`** ensures the binary lands in the snap's PATH.

#### 3. `playwright-browsers` — browser recording

```yaml
plugin: nil
after: [vcr-source]
```

- Runs `npm install playwright@1.64.0` using the Node.js from the `vcr-source` part.
- Runs `playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH` pointing into the snap.
- Copies the Chromium binaries and the `playwright` npm package into the snap so scripts can `import { chromium } from "playwright"`.
- `build-packages` lists the system libraries Chromium needs at runtime (nss, cups, gbm, etc.).

---

## Key source files

```
snap/snapcraft.yaml       ← snap build and confinement recipe
bin/vcr.js                ← module-aware CLI entry point (Node.js ESM)
slidev/src/scripts/       ← recording, rendering, and duration scripts
package.json              ← root npm metadata used by the npm plugin
```

## Building and testing

Install Snapcraft and make sure LXD is installed and initialized, then from the
repository root:

```bash
snapcraft pack --use-lxd
sudo snap install ./video-course-recorder_*.snap --dangerous
./snap/test-smoke.sh   # creates the vcr alias if needed
```

The smoke suite exercises the installed snap, including packaged unit tests and
real content, WebM/MP4 recording, and renderer workflows. GitHub Actions runs
this build-and-smoke workflow on pushes to `main` and pull requests. Store
releases use the manually dispatched `Release` workflow; it builds and uploads
to the chosen channel. See the root README for channel and versioning details.

## Installing

Install the published edge channel:

```bash
sudo snap install video-course-recorder --edge
video-course-recorder --help
```

For a locally built snap, install the artifact with `--dangerous`. If the `vcr`
alias was not created automatically, add it manually:

```bash
sudo snap install ./video-course-recorder_*.snap --dangerous
sudo snap alias video-course-recorder vcr
```

Check current channel availability with `snap info video-course-recorder`.

## Dependency diagram

```
video-course-recorder snap (strict)
├── npm plugin  → Node.js 24
├── npm install → Slidev CLI 53.0.0 + themes 0.25.0
├── apt packages→ FFmpeg (Ubuntu 24.04 archive)
├── stage-snap  → piper-tts (edge)
├── go plugin   → VHS (v0.9.0, static build)
└── npm install → Playwright 1.64.0 + bundled Chromium
```
