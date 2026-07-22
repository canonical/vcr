# Welcome to [VCR](https://github.com/canonical/vcr)!

VCR is a tool to implement "Training as Code": each part of a course is expressed as code. In this way a course can be updated with a git patch, without rerecording videos, terminal sessions or web sessions at all.

VCR is a set of extensions to [Slidev]() integrating terminal rendering via [VHS](https://github.com/charmbracelet/vhs), web session rendering via [Playwright](https://playwright.dev/), video generation via [FFMpeg](https://www.ffmpeg.org/). The speech part can done via local models or [11 labs](https://elevenlabs.io/).

## Installation

- Install ffmpeg: `sudo apt install ffmpeg`
- Install [Slidev and its dependencies](https://sli.dev/guide/#create-locally)
- Install VHS: `go install github.com/charmbracelet/vhs@latest`: be sure to have the vhs command on your PATH!
- Clone this project

## Starting the slides

To start the slide show:

- `pnpm install`
- `pnpm run dev`
- visit <http://localhost:3030>
- with the dev server running, `pnpm run record-video` to capture a browser video recording of the slides, including animated GIFs, MP4s, or other embedded media

Edit the [slides.md](./slides.md) to see the changes.

`pnpm run record-video` records the already-running Slidev page at `http://localhost:3030`. The recorder advances slides and click steps every 1 second by default, waits for visible `<video>` elements to finish before advancing, uses cached terminal GIF duration metadata when available, and accepts `--duration=1500`, `--duration=1.5s`, or `ANIMATED_STEP_DURATION_MS=1500` to adjust the fallback non-video step duration. For precise timing, pass `--durations-file=path/to/durations.txt` (alias: `--timings-file=...`) or set `RECORD_VIDEO_DURATIONS_FILE`; the local file should contain one positive duration per row, such as `1000`, `1500ms`, or `1.5s`, and each row is used for the corresponding recording step. The command writes `videos/slidev-recording.webm` and prints only the copy-pasteable `ffmpeg` command for converting it to MP4.

Learn more about Slidev at the [documentation](https://sli.dev/).

## Terminal recordings in slides

This project can pre-render [VHS](https://github.com/charmbracelet/vhs) tape scripts embedded in `slides.md` so Slidev displays a cached animated GIF by default instead of evaluating terminal automation at presentation time. MP4 remains available as an explicit opt-in format.

1. Install `vhs` and any terminal programs your tape script will run.
2. Add a fenced `terminal` or `tape` block to `slides.md`:

   ````md
   ```terminal name=install-demo
   Set Width 1200
   Set Height 600
   Type "echo hello from a cached terminal recording"
   Enter
   Sleep 1s
   ```
   ````

   Blocks without `format=` render as animated GIFs. Use `format=mp4` only when you explicitly want an MP4 `<video>` element instead of the default GIF image. Generated MP4 videos are muted and autoplay inline so they start without requiring a click. The optional `name=` value prefixes the cached file name.
3. Run `pnpm run terminal:render`.

The renderer executes each tape block with `vhs`, writes the generated media under `terminal-cache/` next to the markdown file, and replaces the source fence with a cached markdown block that Slidev can render directly. When `ffprobe` is available, the renderer records the exact generated media duration as markdown metadata so `pnpm run record-video` can wait for terminal GIFs to finish before advancing. The original tape source is stored inside the markdown cache block, so running the command again can restore and re-render it when the script changes.

Useful options:

- `pnpm run terminal:render -- --file slides.md` renders a different markdown file.
- `pnpm run terminal:render -- --format gif` keeps the default output format as animated GIF for blocks without `format=`; pass `--format mp4` only to opt into MP4 output.
- `pnpm run terminal:render -- --dry-run` reports what would change without writing files.

## Playwright browser recordings in slides

Use the Playwright renderer when a slide needs a cached recording of browser automation, such as clicking through a web UI or demonstrating an interaction that should replay consistently during a presentation.

1. Install dependencies and Playwright browsers:

   ```sh
   pnpm install
   pnpm exec playwright install chromium
   ```

2. Add a fenced `playwright` block to `slides.md`. The block must export either a default function or a named `run` function. The renderer passes `{ page, context, browser, output }` to the function and records the browser context as WebM:

   ````md
   ```playwright name=demo width=1280 height=720
   export default async function ({ page }) {
     await page.goto("https://example.com");
     await page.getByRole("heading", { name: "Example Domain" }).waitFor();
     await page.waitForTimeout(1000);
   }
   ```
   ````

3. Run `pnpm run playwright:render`.

The renderer writes generated WebM files under `playwright-cache/` next to the markdown file and replaces each source fence with a cached `<video>` block that autoplays muted, loops, and keeps the original Playwright source in the markdown. Re-running the command restores and re-renders changed source blocks, while unchanged cached videos are reused.

Useful options:

- `pnpm run playwright:render -- --file slides.md` renders a different markdown file.
- `pnpm run playwright:render -- --cache-dir playwright-cache` changes the cache directory.
- Add `name=demo` to prefix the generated file name, `width=1280` or `height=720` to change the recording size, and `force` to regenerate an existing cached recording.
- `pnpm run playwright:render -- --dry-run` reports what would change without writing files.
- `pnpm run playwright:render -- --skip-render` updates markdown and writes placeholder cache files without launching Chromium.

## Narration audio

Narration lives in a separate `narration.md` file alongside the slide `.md` files.
This keeps slide layout and narration script independently editable.

```
narration.md  →  narration:render  →  audio-cache/*.mp3 + durations.txt
audio-cache/  →  narration:inject  →  <audio> tags injected into slide .md files
```

See [NARRATION-PROCESS.md](slidev/src/NARRATION-PROCESS.md) for the full workflow,
markup tag reference, and pronunciation substitution guide.

Quick start:

```bash
# Render narration audio for a module (ElevenLabs)
pnpm narration:render -- ubuntu

# Inject <audio> tags into slide .md files
pnpm narration:inject -- ubuntu

# Record a narrated MP4
pnpm record:video -- --module=ubuntu --mux
```

Browsers may delay audible autoplay until the deck receives a user gesture,
but Slidev loads the audio track in the background when the slide is shown.
