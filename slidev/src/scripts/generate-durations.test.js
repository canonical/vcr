import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./generate-durations.js", import.meta.url));

async function withDeck(markdown, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-duration-test-"));
  try {
    const file = path.join(dir, "index.md");
    await fs.writeFile(file, markdown);
    await fn({ dir, file });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("dry run combines cached terminal durations with the silent-slide fallback", async () => {
  await withDeck(`---\ntheme: default\n---\n# One\n<!-- sli-terminal:start durationMs=2300 -->\n---\n# Two\n`, ({ file }) => {
    const output = execFileSync(process.execPath, [
      script, "--file", file, "--fallback", "900", "--padding", "100", "--dry-run",
    ], { encoding: "utf8" });
    assert.match(output, /2400ms/);
    assert.match(output, /900ms/);
    assert.match(output, /2 total/);
  });
});

test("default output is written next to the module entry point", async () => {
  await withDeck(`---\ntheme: default\n---\n# One\n---\n# Two\n`, async ({ dir, file }) => {
    execFileSync(process.execPath, [script, "--file", file, "--fallback=750"]);
    const output = await fs.readFile(path.join(dir, "durations.txt"), "utf8");
    assert.equal(output.trim().split("\n").slice(-2).join("\n"), "750\n750");
  });
});
