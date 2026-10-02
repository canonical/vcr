import assert from "node:assert/strict";
import test from "node:test";
import { createTrainingActions, DEFAULT_OPTIONS } from "./training-actions.js";

function makeLocator(box = { x: 40, y: 60, width: 120, height: 30 }) {
  const calls = [];
  return {
    calls,
    async scrollIntoViewIfNeeded() {
      calls.push("scrollIntoViewIfNeeded");
    },
    async waitFor(options) {
      calls.push(["waitFor", options]);
    },
    async boundingBox() {
      return box;
    },
    async click(options) {
      calls.push(["click", options]);
    },
    async fill(value) {
      calls.push(["fill", value]);
    },
    async pressSequentially(text, options) {
      calls.push(["pressSequentially", text, options]);
    },
  };
}

function makePage() {
  const evaluations = [];
  const waits = [];
  return {
    evaluations,
    waits,
    async evaluate(fn, arg) {
      evaluations.push([fn.name, arg]);
      return undefined;
    },
    async waitForTimeout(ms) {
      waits.push(ms);
    },
  };
}

function evalNames(page) {
  return page.evaluations.map(([name]) => name);
}

test("requires a Playwright-like page", () => {
  assert.throws(() => createTrainingActions(), /requires a Playwright Page/);
});

test("applies documented defaults and ignores undefined overrides", () => {
  const page = makePage();
  const demo = createTrainingActions(page, { cursorDurationMs: undefined, typingDelayMs: 15 });
  assert.equal(demo.config.cursorDurationMs, DEFAULT_OPTIONS.cursorDurationMs);
  assert.equal(demo.config.typingDelayMs, 15);
});

test("click moves the pointer, presses, delegates to locator.click, and holds", async () => {
  const page = makePage();
  const locator = makeLocator();
  const demo = createTrainingActions(page, { cursorDurationMs: 123 });

  await demo.click(locator);

  assert.deepEqual(page.waits, [123, DEFAULT_OPTIONS.beforeActionMs, DEFAULT_OPTIONS.afterActionMs]);
  assert.deepEqual(evalNames(page), [
    "setupTrainingOverlay",
    "moveTrainingCursor",
    "setTrainingCursorPressed",
    "setTrainingCursorPressed",
  ]);
  assert.deepEqual(page.evaluations.find(([name]) => name === "moveTrainingCursor")[1], {
    x: 100,
    y: 75,
    duration: 123,
  });
  assert.deepEqual(
    page.evaluations.filter(([name]) => name === "setTrainingCursorPressed").map(([, value]) => value),
    [true, false],
  );
  assert.deepEqual(locator.calls, ["scrollIntoViewIfNeeded", ["waitFor", { state: "visible" }], ["click", { timeout: 30000 }]]);
});

test("click honours per-call overrides", async () => {
  const page = makePage();
  const demoholder = createTrainingActions(page);
  await demoholder.click(makeLocator(), { cursorDurationMs: 10, beforeActionMs: 20, afterActionMs: 30 });
  assert.deepEqual(page.waits, [10, 20, 30]);
});

test("highlight accepts a duration number and draws then clears the overlay", async () => {
  const page = makePage();
  await createTrainingActions(page).highlight(makeLocator(), 900);

  assert.deepEqual(page.waits, [900]);
  assert.deepEqual(evalNames(page), [
    "setupTrainingOverlay",
    "drawTrainingHighlight",
    "clearTrainingHighlight",
  ]);
});

test("highlight can optionally move the cursor first", async () => {
  const page = makePage();
  await createTrainingActions(page).highlight(makeLocator(), {
    durationMs: 500,
    moveCursor: true,
    cursorDurationMs: 200,
  });

  assert.deepEqual(page.waits, [200, 500]);
  assert.deepEqual(evalNames(page), [
    "setupTrainingOverlay",
    "drawTrainingHighlight",
    "setupTrainingOverlay",
    "moveTrainingCursor",
    "clearTrainingHighlight",
  ]);
});

test("type focuses the field and types at the configured pace", async () => {
  const page = makePage();
  const locator = makeLocator();
  await createTrainingActions(page, { cursorDurationMs: 50 }).type(locator, "microcloud", {
    typingDelayMs: 33,
  });

  assert.ok(locator.calls.some((call) => call[0] === "click"));
  assert.deepEqual(
    locator.calls.find((call) => call[0] === "pressSequentially"),
    ["pressSequentially", "microcloud", { delay: 33 }],
  );
  assert.deepEqual(page.waits, [50, DEFAULT_OPTIONS.beforeActionMs, DEFAULT_OPTIONS.afterActionMs]);
});

test("type can clear the field first", async () => {
  const page = makePage();
  const locator = makeLocator();
  await createTrainingActions(page).type(locator, "x", { clear: true });
  assert.ok(locator.calls.some((call) => call[0] === "fill" && call[1] === ""));
});

test("highlightText resolves a locator from visible text", async () => {
  const page = makePage();
  const locator = makeLocator();
  page.getByText = (text) => {
    assert.equal(text, "MicroOVN");
    return { first: () => locator };
  };

  await createTrainingActions(page).highlightText("MicroOVN", 400);
  assert.deepEqual(page.waits, [400]);
  assert.ok(evalNames(page).includes("drawTrainingHighlight"));
});

test("wait holds the current state", async () => {
  const page = makePage();
  await createTrainingActions(page).wait(777);
  assert.deepEqual(page.waits, [777]);
});
