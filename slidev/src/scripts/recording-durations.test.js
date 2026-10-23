import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prepareRecordingDurations } from "./recording-durations.js";

const generatorFile = fileURLToPath(new URL("./generate-durations.js", import.meta.url));

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-recording-durations-test-"));
  const entryFile = path.join(dir, "index.md");
  await fs.writeFile(entryFile, "---\ntheme: default\n---\n# One\n---\n# Two\n");
  return { dir, entryFile };
}

test("auto-generates timing data in the private recording directory when no timing options are given", async () => {
  const { dir, entryFile } = await fixture();
  try {
    const prepared = await prepareRecordingDurations({
      args: ["--file", entryFile],
      env: {},
      entryFile,
      outputDir: dir,
      generatorFile,
    });
    assert.equal(prepared.generated, true);
    const contents = await fs.readFile(prepared.file, "utf8");
    assert.match(contents, /2 total/);
    assert.deepEqual(contents.trim().split("\n").slice(-2), ["1000", "1000"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("preserves explicitly supplied duration files and does not silently replace missing paths", async () => {
  const { dir, entryFile } = await fixture();
  try {
    let invoked = false;
    const prepared = await prepareRecordingDurations({
      args: ["--durations-file", path.join(dir, "not-created.txt")],
      env: {}, entryFile, outputDir: dir, generatorFile,
      execute: async () => { invoked = true; },
    });
    assert.deepEqual(prepared, { file: path.join(dir, "not-created.txt"), generated: false });
    assert.equal(invoked, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("a caller-selected uniform step duration bypasses generated timing files", async () => {
  const { dir, entryFile } = await fixture();
  try {
    const prepared = await prepareRecordingDurations({
      args: ["--duration=250ms"], env: {}, entryFile, outputDir: dir, generatorFile,
      execute: async () => { throw new Error("must not generate"); },
    });
    assert.equal(prepared, undefined);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
