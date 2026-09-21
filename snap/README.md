# VCR Snap

## Why classic confinement?

VCR is a development tool that needs broad system access to do its job:

| Requirement | Why it's hard in strict |
|---|---|
| **Playwright + Chromium** | Chromium's internal sandbox requires `browser-support`, `opengl`, and `desktop` interfaces. Even with those, headless recording often breaks in unexpected ways under strict confinement. |
| **Arbitrary filesystem access** | Users work with content repos anywhere — not just `$HOME`. Course files, caches, and outputs can live on any mounted volume. The `home` plug only covers `/home/*`. |
| **Slidev dev server** | Binds to arbitrary ports. `network-bind` helps but port flexibility is limited. |
| **Third-party binaries** | Spawns `ffmpeg`, `vhs`, `piper` as child processes. All run fine in classic. In strict, each subprocess is also confined and may fail silently. |

Classic confinement is the same approach used by `snapcraft` itself and most dev tools (VS Code, IntelliJ, Go, etc.). It trades strict isolation for reliability — the right trade-off for a tool whose purpose is to create, not to serve.

If Chromium/sandbox support matures in snapd, we should revisit strict.

---

## snapcraft.yaml walkthrough

### Metadata

| Field | Value | Notes |
|---|---|---|
| `name` | `vcr` | Matches the `bin/vcr` command |
| `base` | `core24` | Ubuntu 24.04 LTS runtime |
| `confinement` | `classic` | See rationale above |
| `grade` | `stable` | Ready for production use |

### App

```
apps:
  vcr:
    command: bin/vcr
    environment:
      PLAYWRIGHT_BROWSERS_PATH: $SNAP/playwright-browsers
      PATH: $SNAP/bin:$SNAP/usr/bin:$PATH
```

Single entry point: `vcr`. Sets `PLAYWRIGHT_BROWSERS_PATH` so Playwright finds its bundled Chromium, and ensures the snap's `bin/` takes priority on `PATH`.

### Parts

#### 1. `vcr-source` — Node.js + scripts + stage-snaps

```yaml
plugin: npm
npm-include-node: true
npm-node-version: '22'
stage-snaps:
  - ffmpeg/latest/stable
  - piper-tts/edge
```

- **`npm` plugin** bundles Node.js 22. This is the Canonical-recommended way to include Node in a snap.
- **`stage-snaps`** pulls in `ffmpeg` and `piper-tts` from the Snap Store — no need to download or build them manually.
- **`override-build`** copies scripts, components, styles, snippets, and the CLI from the monorepo layout (`slidev/src/`) into the snap root.

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

- Runs `npm install playwright@1.61.0` using the Node.js from the `vcr-source` part.
- Runs `playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH` pointing into the snap.
- Copies the Chromium binaries and the `playwright` npm package into the snap so scripts can `import { chromium } from "playwright"`.
- `build-packages` lists the system libraries Chromium needs at runtime (nss, cups, gbm, etc.).

---

## Files created

```
snap/
├── README.md          ← this file
└── snapcraft.yaml     ← build recipe

bin/
└── vcr.js             ← CLI entry point (Node.js ESM)

package.json           ← root package.json (npm plugin needs this)
```

## Building

```bash
snapcraft pack --use-lxd
```

Output: `vcr_<version>_amd64.snap`

## Installing

```bash
sudo snap install ./vcr_*.snap --dangerous --classic
vcr --help
```

## Dependency diagram

```
vcr snap (classic)
├── npm plugin  → Node.js 22
├── stage-snaps → ffmpeg (latest/stable)
│               → piper-tts (edge)
├── go plugin   → vhs (v0.9.0, static build)
└── playwright  → chromium_headless_shell + playwright lib
```
