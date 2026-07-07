# Welcome to [Slidev](https://github.com/slidevjs/slidev)!

To start the slide show:

- `pnpm install`
- `pnpm run dev`
- visit <http://localhost:3030>
- `pnpm run video` to record a video of the slides

Edit the [slides.md](./slides.md) to see the changes.

Learn more about Slidev at the [documentation](https://sli.dev/).

## Terminal recordings in slides

This project can pre-render [VHS](https://github.com/charmbracelet/vhs) tape scripts embedded in `slides.md` so Slidev displays a cached GIF or MP4 instead of evaluating terminal automation at presentation time.

1. Install `vhs` and any terminal programs your tape script will run.
2. Add a fenced `terminal` or `tape` block to `slides.md`:

   ````md
   ```terminal format=gif name=install-demo
   Set Width 1200
   Set Height 600
   Type "echo hello from a cached terminal recording"
   Enter
   Sleep 1s
   ```
   ````

   Use `format=mp4` when you want an MP4 `<video>` element instead of a GIF image. Generated MP4 videos are muted and autoplay inline so they start without requiring a click. The optional `name=` value prefixes the cached file name.
3. Run `pnpm run terminal:render`.

The renderer executes each tape block with `vhs`, writes the generated media under `terminal-cache/` next to the markdown file, and replaces the source fence with a cached markdown block that Slidev can render directly. The original tape source is stored inside the markdown cache block, so running the command again can restore and re-render it when the script changes.

Useful options:

- `pnpm run terminal:render -- --file slides.md` renders a different markdown file.
- `pnpm run terminal:render -- --format mp4` changes the default output format for blocks without `format=`.
- `pnpm run terminal:render -- --dry-run` reports what would change without writing files.
