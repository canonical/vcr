# Welcome to [Slidev](https://github.com/slidevjs/slidev)!

To start the slide show:

- `pnpm install`
- `pnpm run dev`
- visit <http://localhost:3030>
- `pnpm run video` to record a video of the slides

Edit the [slides.md](./slides.md) to see the changes.

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
