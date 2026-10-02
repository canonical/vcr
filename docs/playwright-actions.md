# Playwright training actions

VCR browser recordings can use a small, product-neutral action helper that makes
demonstrations easier to follow. It moves a visible pointer to a target, draws a
temporary highlight, types at a readable pace, and pauses on an instructional
state.

The helper is intentionally thin. It is a presentation layer on top of native
Playwright locators and does not replace Playwright's navigation, locator, or
assertion APIs. Use native Playwright for everything product-specific, and use
the helper only to guide the viewer.

## Setup

The renderer creates the helper automatically and passes it to every
`playwright` block as `demo`:

```js
export default async function ({ page, demo }) {
  await page.goto("https://example.com");
  await demo.highlight(page.getByRole("heading", { name: "Example Domain" }));
}
```

Sessions that do not use `demo` are unaffected, so existing blocks keep working.

## Actions

| Action | Behaviour |
|---|---|
| `highlight(locator, durationOrOptions?)` | Draws a temporary highlight around the element and holds it. A number is treated as the hold duration in milliseconds. |
| `highlightText(text, durationOrOptions?)` | Convenience wrapper that highlights the first element containing the visible text. |
| `click(locator, overrides?)` | Moves the pointer to the element, waits, performs a native Playwright click, and holds the resulting state. |
| `type(locator, text, overrides?)` | Moves the pointer to the field, focuses it, and types one character at a time. |
| `wait(duration)` | Holds the current state for a clear instructional pause. |

All actions accept native Playwright locators (`page.getByRole`, `page.locator`,
`page.getByText`, and so on).

## Configuration

Defaults are documented in `slidev/src/scripts/training-actions.js`
(`DEFAULT_OPTIONS`) and can be overridden globally through
`createTrainingActions(page, options)` or per call.

| Option | Default | Purpose |
|---|---|---|
| `cursorDurationMs` | `600` | Pointer travel time to the target. |
| `beforeActionMs` | `250` | Settle time before a click or type. |
| `afterActionMs` | `700` | Hold time after a click or type. |
| `highlightDurationMs` | `1600` | Default highlight hold time. |
| `typingDelayMs` | `60` | Delay between typed characters. |
| `cursorSize` | `22` | Pointer size in pixels. |
| `cursorColor` | `#E95420` | Pointer colour. |
| `highlightColor` | `#E95420` | Highlight border colour. |
| `highlightFill` | `rgba(233, 84, 32, 0.12)` | Highlight fill colour. |
| `highlightPadding` | `6` | Padding between the element and the border. |
| `highlightRadius` | `6` | Highlight corner radius. |
| `highlightWidth` | `3` | Highlight border width. |

Per-call overrides accept either a number (for the action's primary duration) or
an options object:

```js
await demo.click(submit, { cursorDurationMs: 900, beforeActionMs: 350, afterActionMs: 900 });
await demo.highlight(logo, 1800);
await demo.highlight(panel, { durationMs: 2000, moveCursor: true });
await demo.type(search, "queiroll", { typingDelayMs: 45, clear: true });
```

## Boundary with native Playwright

- Keep using native Playwright for navigation, locators, waits for conditions,
  and assertions.
- The helper only adds visual guidance and pacing. It does not change what a
  scenario does.
- Prefer `demo.wait` for teaching pauses; keep `page.waitFor*` for real
  synchronization with the application.

## Example

`slidev/src/playwright-actions-example.md` renders offline from a `data:` URL
and exercises every action. Render it with:

```bash
cd slidev/src
node scripts/render-playwright-videos.js --file playwright-actions-example.md
```
