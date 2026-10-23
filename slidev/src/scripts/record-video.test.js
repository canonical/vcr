import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./record-video.js", import.meta.url));

test("rejects formats other than WebM and MP4 before starting a recording", () => {
  const result = spawnSync(process.execPath, [script, "--format=avi"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsupported recording format 'avi'/);
  assert.match(result.stderr, /Use --format=webm or --format=mp4/);
});
