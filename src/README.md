# Welcome to [Slidev](https://github.com/slidevjs/slidev)!

To start the slide show:

- `pnpm install`
- `pnpm run dev`
- visit <http://localhost:3030>
- `pnpm run video` to record a video of the slides
- `pnpm run video-animated` to capture a browser video recording when slides contain animated GIFs, MP4s, or other embedded media

Edit the [slides.md](./slides.md) to see the changes.

`pnpm run video-animated` starts Slidev and records the rendered browser viewport instead of relying on static slide images. Use it when animated GIFs or embedded MP4 elements need to keep moving in the exported recording. The command writes `videos/slidev-animated-recording.webm` and prints an `ffmpeg` command for converting it to MP4.

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

The renderer executes each tape block with `vhs`, writes the generated media under `terminal-cache/` next to the markdown file, and replaces the source fence with a cached markdown block that Slidev can render directly. The original tape source is stored inside the markdown cache block, so running the command again can restore and re-render it when the script changes.

Useful options:

- `pnpm run terminal:render -- --file slides.md` renders a different markdown file.
- `pnpm run terminal:render -- --format gif` keeps the default output format as animated GIF for blocks without `format=`; pass `--format mp4` only to opt into MP4 output.
- `pnpm run terminal:render -- --dry-run` reports what would change without writing files.

## Speech audio in slides

This project can also pre-render local text-to-speech narration into cached WAV files. Add a fenced `speech` or `tts` block to `slides.md`:

````md
```speech name=intro
Welcome to the MicroCloud lesson. This narration is generated locally and cached.
```
````

Run `pnpm run audio:render -- --model path/to/voice.onnx` (or the `speech:render` alias) or set `PIPER_MODEL=path/to/voice.onnx` before running the command. The command uses the local `piper` binary by default, writes WAV files under `audio-cache/`, and replaces each source block with an autoplaying background `<audio>` element. The original text is stored inside the generated markdown block, so re-running the command restores and re-renders changed narration text.

Useful options:

- `pnpm run audio:render -- --file slides.md` renders a different markdown file.
- `pnpm run audio:render -- --cache-dir audio-cache` changes the cache directory.
- `pnpm run audio:render -- --tts-bin piper` uses a different local Piper-compatible binary.
- `pnpm run audio:render -- --dry-run` reports what would change without writing files.
- `pnpm run audio:render -- --skip-render` updates markdown and writes placeholder cache files without invoking the TTS model.

Browsers may delay audible autoplay until the deck receives a user gesture, but Slidev will load the generated track in the background when the slide is shown.
