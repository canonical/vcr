import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { startSlidevServer } from "./slidev-server.js";

const helperPath = fileURLToPath(new URL("./slidev-server.js", import.meta.url));

async function writeFakeSlidev(dir, source) {
  const file = path.join(dir, "fake-slidev.js");
  await fs.writeFile(file, source);
  return file;
}

function waitForChildExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return once(child, "exit");
}

test("starts Slidev, waits for HTTP readiness, and stops its child", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-slidev-server-test-"));
  let server;
  try {
    const fake = await writeFakeSlidev(dir, `
      import http from "node:http";
      const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
      const server = http.createServer((_req, res) => { res.writeHead(200, { connection: "close" }); res.end("ready"); });
      server.listen(port, "127.0.0.1");
      process.on("SIGTERM", () => server.close(() => process.exit(0)));
    `);
    server = await startSlidevServer(path.join(dir, "index.md"), {
      command: process.execPath,
      commandArgs: [fake],
    });

    const response = await fetch(server.url);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ready");

    const stop = server.stop();
    await stop;
    await assert.rejects(fetch(server.url));
  } finally {
    await server?.stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("reports a server process that exits before becoming ready", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vcr-slidev-server-test-"));
  try {
    const fake = await writeFakeSlidev(dir, `process.stderr.write("deliberate startup failure\\n"); process.exit(7);`);
    await assert.rejects(
      startSlidevServer(path.join(dir, "index.md"), {
        command: process.execPath,
        commandArgs: [fake],
        startupTimeoutMs: 2_000,
      }),
      /Slidev exited before becoming ready \(exit code 7\)[\s\S]*deliberate startup failure/,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
