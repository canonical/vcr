import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const script = new URL("./serve-interactive-terminals.js", import.meta.url);

test("discovers interactive terminal fences without requiring LXD in dry-run mode", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-interactive-"));
  const file = path.join(directory, "slides.md");
  const markdown = `# Shell\n\n\`\`\`interactive-terminal name=lesson image=ubuntu:24.04 port=8765\napt-get update\n\`\`\`\n`;
  await fs.writeFile(file, markdown);

  const result = spawnSync(process.execPath, [script.pathname, "--file", file, "--dry-run"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /lesson: ubuntu:24\.04 on http:\/\/127\.0\.0\.1:8765/);
  assert.equal(await fs.readFile(file, "utf8"), markdown, "dry run must not rewrite the deck");
});

test("rejects terminal port collisions", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-interactive-"));
  const file = path.join(directory, "slides.md");
  await fs.writeFile(file, `\`\`\`interactive-terminal name=one port=9000\n\n\`\`\`\n\n\`\`\`interactive-terminal name=two port=9000\n\n\`\`\`\n`);
  const result = spawnSync(process.execPath, [script.pathname, "--file", file, "--dry-run"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate interactive terminal address/);
});
