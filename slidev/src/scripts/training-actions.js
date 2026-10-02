// Training-oriented Playwright actions for VCR browser demonstrations.
//
// A thin presentation layer on top of native Playwright locators. It moves a
// visible pointer to a target, draws a temporary highlight, types at a
// readable pace, and pauses on an instructional state. It never replaces
// Playwright's navigation, locator, or assertion APIs: scenarios keep using
// native locators and checks, and call these helpers only to guide the viewer.
//
// Usage in a VCR `playwright` block:
//
//   export default async function ({ page, demo }) {
//     await page.goto("https://example.com");
//     await demo.highlight(page.getByRole("heading", { name: "Example Domain" }));
//     await demo.click(page.getByRole("link", { name: "More information" }));
//     await demo.type(page.getByRole("searchbox"), "microcloud");
//     await demo.wait(1200);
//   }

export const DEFAULT_OPTIONS = Object.freeze({
  // Action pacing, in milliseconds.
  cursorDurationMs: 600,
  beforeActionMs: 250,
  afterActionMs: 700,
  highlightDurationMs: 1600,
  typingDelayMs: 60,

  // Visible pointer.
  cursorSize: 22,
  cursorColor: "#E95420",

  // Temporary highlight treatment.
  highlightColor: "#E95420",
  highlightFill: "rgba(233, 84, 32, 0.12)",
  highlightPadding: 6,
  highlightRadius: 6,
  highlightWidth: 3,

  // Overlay container id (one overlay is shared per page).
  overlayId: "vcr-training-overlay",
});

/**
 * Create the training action helper for a Playwright page.
 *
 * @param {import("playwright").Page} page
 * @param {Partial<typeof DEFAULT_OPTIONS>} [options] presentation overrides
 * @returns {{highlight: Function, highlightText: Function, click: Function, type: Function, wait: Function, config: object}}
 */
export function createTrainingActions(page, options = {}) {
  if (!page || typeof page.evaluate !== "function") {
    throw new TypeError("createTrainingActions(page, options) requires a Playwright Page");
  }
  const config = { ...DEFAULT_OPTIONS, ...definedOnly(options) };

  const ensureOverlay = () => page.evaluate(setupTrainingOverlay, config);

  async function targetPoint(locator) {
    const target = await firstVisible(locator);
    if (typeof target.scrollIntoViewIfNeeded === "function") {
      await target.scrollIntoViewIfNeeded();
    }
    if (typeof target.waitFor === "function") {
      await target.waitFor({ state: "visible" });
    }
    const box = await target.boundingBox();
    if (!box) {
      throw new Error("training-actions: locator has no visible bounding box");
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  async function moveCursor(point, duration) {
    await ensureOverlay();
    await page.evaluate(moveTrainingCursor, { x: point.x, y: point.y, duration });
    await page.waitForTimeout(duration);
  }

  async function setCursorPressed(pressed) {
    await page.evaluate(setTrainingCursorPressed, pressed);
  }

  /**
   * Draw a temporary highlight around a locator.
   * Accepts a duration number or an options object ({ durationMs, moveCursor }).
   */
  async function highlight(locator, option = {}) {
    const opts = typeof option === "number" ? { durationMs: option } : option || {};
    const duration = firstNumber(opts.durationMs, opts.hold, config.highlightDurationMs);
    const point = await targetPoint(locator);
    await ensureOverlay();
    await page.evaluate(drawTrainingHighlight, { box: point.box, style: config });
    if (opts.moveCursor) {
      await moveCursor(point, firstNumber(opts.cursorDurationMs, config.cursorDurationMs));
    }
    await page.waitForTimeout(duration);
    await page.evaluate(clearTrainingHighlight);
  }

  /** Convenience: highlight the first element matching a visible text string. */
  async function highlightText(text, option = {}) {
    if (typeof page.getByText !== "function") {
      throw new Error("training-actions: highlightText requires page.getByText");
    }
    return highlight(page.getByText(text).first(), option);
  }

  /** Move the pointer to a locator, click it with Playwright, and hold the result. */
  async function click(locator, option = {}) {
    const opts = typeof option === "number" ? { cursorDurationMs: option } : option || {};
    const point = await targetPoint(locator);
    await moveCursor(point, firstNumber(opts.cursorDurationMs, config.cursorDurationMs));
    await page.waitForTimeout(firstNumber(opts.beforeActionMs, config.beforeActionMs));
    await setCursorPressed(true);
    try {
      await locator.click({ timeout: firstNumber(opts.timeoutMs, 30000) });
    } finally {
      await setCursorPressed(false);
    }
    await page.waitForTimeout(firstNumber(opts.afterActionMs, config.afterActionMs));
  }

  /** Focus a locator and type at a readable pace, one character at a time. */
  async function type(locator, text, option = {}) {
    const opts = typeof option === "number" ? { typingDelayMs: option } : option || {};
    const point = await targetPoint(locator);
    await moveCursor(point, firstNumber(opts.cursorDurationMs, config.cursorDurationMs));
    await page.waitForTimeout(firstNumber(opts.beforeActionMs, config.beforeActionMs));
    await locator.click({ timeout: firstNumber(opts.timeoutMs, 30000) });
    if (opts.clear && typeof locator.fill === "function") {
      await locator.fill("");
    }
    await locator.pressSequentially(text, {
      delay: firstNumber(opts.typingDelayMs, config.typingDelayMs),
    });
    await page.waitForTimeout(firstNumber(opts.afterActionMs, config.afterActionMs));
  }

  /** Hold the current state for a clear instructional pause. */
  async function wait(duration) {
    return page.waitForTimeout(duration);
  }

  return { highlight, highlightText, click, type, wait, config };
}

function definedOnly(options) {
  return Object.fromEntries(
    Object.entries(options || {}).filter(([, value]) => value !== undefined),
  );
}

// Prefer the first visible match when a locator resolves to several elements
// (for example a label that also exists in a hidden menu). Falls back to the
// original locator so behaviour is unchanged for unambiguous matches.
async function firstVisible(locator) {
  if (locator && typeof locator.filter === "function" && typeof locator.count === "function") {
    try {
      const visible = locator.filter({ visible: true });
      if ((await visible.count()) > 0) {
        return typeof visible.first === "function" ? visible.first() : visible;
      }
    } catch {
      // ignore and use the original locator
    }
  }
  return locator;
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Browser-side overlay. These functions are serialized into the page, so they
// must be self-contained (no references to module scope).
// ---------------------------------------------------------------------------

function setupTrainingOverlay(config) {
  const existing = document.getElementById(config.overlayId);
  if (existing) return;

  const style = document.createElement("style");
  style.textContent = `
    #${config.overlayId} { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
    #${config.overlayId} [data-role="cursor"] {
      position: fixed; left: 0; top: 0; opacity: 0;
      transition: transform 0s linear, opacity 150ms ease;
      will-change: transform; pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
    }
    #${config.overlayId} [data-role="cursor"] svg {
      display: block; transform-origin: 22% 12%; transition: transform 90ms ease;
    }
    #${config.overlayId} [data-role="cursor"][data-pressed="1"] svg { transform: scale(0.8); }
    #${config.overlayId} [data-role="highlight"] {
      position: fixed; display: none; box-sizing: border-box; pointer-events: none;
      transition: opacity 180ms ease;
    }
  `;

  const root = document.createElement("div");
  root.id = config.overlayId;

  const highlight = document.createElement("div");
  highlight.dataset.role = "highlight";

  const cursor = document.createElement("div");
  cursor.dataset.role = "cursor";
  cursor.dataset.pressed = "0";
  cursor.innerHTML =
    `<svg viewBox="0 0 24 24" width="${config.cursorSize}" height="${config.cursorSize}" aria-hidden="true">` +
    `<path d="M4 2 L4 20 L9 15.2 L12 22 L15 20 L12 13.4 L20 13.4 Z" ` +
    `fill="${config.cursorColor}" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  root.append(highlight, cursor);
  document.documentElement.append(style, root);
}

function moveTrainingCursor({ x, y, duration }) {
  const el = document.getElementById("vcr-training-overlay")?.querySelector('[data-role="cursor"]');
  if (!el) return;
  el.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease`;
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.opacity = "1";
}

function setTrainingCursorPressed(pressed) {
  const el = document.getElementById("vcr-training-overlay")?.querySelector('[data-role="cursor"]');
  if (el) el.dataset.pressed = pressed ? "1" : "0";
}

function drawTrainingHighlight({ box, style }) {
  const el = document.getElementById("vcr-training-overlay")?.querySelector('[data-role="highlight"]');
  if (!el) return;
  const pad = style.highlightPadding;
  el.style.left = `${box.x - pad}px`;
  el.style.top = `${box.y - pad}px`;
  el.style.width = `${box.width + pad * 2}px`;
  el.style.height = `${box.height + pad * 2}px`;
  el.style.border = `${style.highlightWidth}px solid ${style.highlightColor}`;
  el.style.background = style.highlightFill;
  el.style.borderRadius = `${style.highlightRadius}px`;
  el.style.display = "block";
  el.style.opacity = "1";
}

function clearTrainingHighlight() {
  const el = document.getElementById("vcr-training-overlay")?.querySelector('[data-role="highlight"]');
  if (el) {
    el.style.opacity = "0";
    el.style.display = "none";
  }
}
