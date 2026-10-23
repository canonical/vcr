import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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

test("follows imported Slidev markdown and falls back when referenced audio is missing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-duration-import-test-"));
  try {
    const slidesDir = path.join(dir, "slides");
    await fs.mkdir(slidesDir);
    const entry = path.join(dir, "index.md");
    const output = path.join(dir, "durations.txt");
    await fs.writeFile(entry, `---\nsrc: ./slides/one.md\n---\n---\nsrc: ./slides/two.md\n---\n`);
    await fs.writeFile(path.join(slidesDir, "one.md"), `---\nlayout: default\n---\n# One\n<audio src="../audio-cache/missing.wav"></audio>\n`);
    await fs.writeFile(path.join(slidesDir, "two.md"), `# Two\n<!-- sli-terminal:start durationMs=1800 -->\n`);

    const result = spawnSync(process.execPath, [script, "--file", entry, "--output", output, "--fallback", "700", "--padding", "100"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /skipping audio probe/);
    assert.match(result.stdout, /Parsed 2 slides/);
    const lines = (await fs.readFile(output, "utf8")).trim().split("\n");
    assert.deepEqual(lines.slice(-2), ["700", "1900"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
