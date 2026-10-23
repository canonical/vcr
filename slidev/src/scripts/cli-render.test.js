import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(testDir, "../../..");
const runningFromSource = await fs.access(path.join(sourceRoot, "bin", "vcr.js")).then(() => true, () => false);
const repoRoot = runningFromSource ? sourceRoot : path.resolve(testDir, "..");
const cli = path.join(repoRoot, "bin", runningFromSource ? "vcr.js" : "vcr");
const sourceScripts = runningFromSource ? path.join(repoRoot, "slidev", "src", "scripts") : path.join(repoRoot, "scripts");
const rendererScripts = [
  "render-speech-audio.js",
  "render-terminal-tapes.js",
  "render-playwright-videos.js",
  "training-actions.js",
];

async function makeCliFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-cli-render-test-"));
  const snap = path.join(root, "snap");
  const content = path.join(root, "content");
  await fs.mkdir(path.join(snap, "scripts"), { recursive: true });
  await fs.mkdir(path.join(snap, "node_modules", "playwright"), { recursive: true });
  await fs.mkdir(path.join(content, "modules", "fixture", "en", "slides"), { recursive: true });
  await fs.writeFile(path.join(content, "package.json"), '{"name":"fixture","type":"module"}\n');
  for (const script of rendererScripts) {
    await fs.copyFile(path.join(sourceScripts, script), path.join(snap, "scripts", script));
  }
  await fs.writeFile(path.join(snap, "node_modules", "playwright", "package.json"), '{"name":"playwright","type":"module","exports":"./index.js"}\n');
  await fs.writeFile(path.join(snap, "node_modules", "playwright", "index.js"), 'export const chromium = {};\n');
  await fs.writeFile(path.join(content, "modules", "fixture", "en", "index.md"), `---\nsrc: ./slides/one.md\n---\n---\nsrc: ./slides/two.md\n---\n`);
  await fs.writeFile(path.join(content, "modules", "fixture", "en", "slides", "one.md"), `---\ntheme: default\n---\n# One\n\n\`\`\`speech name=fixture\nSpeech fixture.\n\`\`\`\n\n---\nsrc: ./two.md\n---\n`);
  await fs.writeFile(path.join(content, "modules", "fixture", "en", "slides", "two.md"), `# Two\n\n\`\`\`terminal\nType "echo terminal-fixture"\nEnter\n\`\`\`\n\n\`\`\`playwright\nexport default async ({ page, demo }) { await page.goto("data:text/html,<h1>fixture</h1>"); await demo.wait(1); }\n\`\`\`\n`);
  return { root, snap, content };
}

test("help contains no undefined descriptions or stray one-letter commands", () => {
  const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /undefined/);
  assert.match(result.stdout, /\n\s+dev\s+Start Slidev development server/);
  assert.match(result.stdout, /\n\s+help\s+Show this help/);
  assert.doesNotMatch(result.stdout, /\n\s+[dhv]\s+undefined/);
});

test("render commands visit imported markdown and use their own media caches", async () => {
  const fixture = await makeCliFixture();
  try {
    const env = { ...process.env, SNAP: fixture.snap };
    for (const [command, cacheName, oneCount, twoCount] of [
      ["render-audio", "audio-cache", 1, 0],
      ["render-terminal", "terminal-cache", 0, 1],
      ["render-playwright", "playwright-cache", 0, 1],
    ]) {
      const result = spawnSync(process.execPath, [cli, command, "fixture", "--dry-run"], {
        cwd: fixture.content,
        env,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `${command}: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`slides/one\\.md: ${oneCount} rendered`));
      assert.match(result.stdout, new RegExp(`slides/two\\.md: ${twoCount} rendered`));
      assert.doesNotMatch(result.stdout, /index\.md: 1 rendered/);
      assert.equal(await fs.access(path.join(fixture.content, "modules", "fixture", "en", cacheName)).then(() => true, () => false), false);
    }
  } finally {
    await fs.rm(fixture.root, { recursive: true, force: true });
  }
});


test("every command supports detailed help without requiring a content module", () => {
  const commands = [
    "render-audio", "render-terminal", "render-playwright",
    "build-slides", "export-slides", "build-scorm",
    "generate-durations", "record-video", "dev", "validate",
  ];
  for (const command of commands) {
    for (const helpArgs of [[command, "--help"], ["help", command]]) {
      const result = spawnSync(process.execPath, [cli, ...helpArgs], { encoding: "utf8" });
      assert.equal(result.status, 0, `${helpArgs.join(" ")}: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`Usage: vcr ${command}\\b`));
      assert.doesNotMatch(result.stdout, /undefined|module name is required/);
      assert.match(result.stdout, /Options:/);
      assert.match(result.stdout, /Examples:/);
    }
  }
});

test("supports short help aliases and reports unknown help targets", () => {
  const short = spawnSync(process.execPath, [cli, "record-video", "-h"], { encoding: "utf8" });
  assert.equal(short.status, 0, short.stderr);
  assert.match(short.stdout, /--format <webm\|mp4>/);

  const unknown = spawnSync(process.execPath, [cli, "help", "not-a-command"], { encoding: "utf8" });
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown command 'not-a-command'/);
});


test("missing module prints the command's expanded usage and flags", () => {
  const result = spawnSync(process.execPath, [cli, "render-audio"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  const output = `${result.stderr}${result.stdout}`;
  assert.match(output, /module name is required/);
  assert.match(output, /Usage: vcr render-audio <module>/);
  assert.match(output, /--model <path>/);
  assert.match(output, /--dry-run/);
  assert.match(output, /Examples:/);
  assert.doesNotMatch(output, /Usage: vcr render-audio <module> \[--locale <xx>\]/);
});
