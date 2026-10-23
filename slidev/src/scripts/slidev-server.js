import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_STARTUP_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 150;
const FETCH_TIMEOUT_MS = 1_000;
const STDERR_LIMIT = 8_000;

async function reserveLocalPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

/** Start a private local Slidev dev server and return its URL and stop method. */
export async function startSlidevServer(entry, {
  command = process.env.SLIDEV_BIN ?? "slidev",
  commandArgs = [],
  env = process.env,
  startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
} = {}) {
  const entryPath = path.resolve(entry);
  const port = await reserveLocalPort();
  // Slidev binds to "localhost" by default; probe the same hostname because
  // localhost may resolve to IPv6 on some runners while 127.0.0.1 does not.
  const url = `http://localhost:${port}/`;
  const child = spawn(command, [...commandArgs, entryPath, "--port", String(port)], {
    cwd: path.dirname(entryPath),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", chunk => {
      output = (output + chunk).slice(-STDERR_LIMIT);
    });
  }

  let spawnError;
  child.once("error", error => { spawnError = error; });
  let exitInfo;
  const exited = new Promise(resolve => {
    child.once("exit", (code, signal) => {
      exitInfo = { code, signal };
      resolve(exitInfo);
    });
  });

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (spawnError || child.exitCode !== null || child.signalCode !== null) return;

    const closed = new Promise(resolve => child.once("exit", resolve));
    child.kill("SIGTERM");
    let shutdownTimer;
    const graceful = await Promise.race([
      closed.then(() => true),
      new Promise(resolve => {
        shutdownTimer = setTimeout(() => resolve(false), 3_000);
        shutdownTimer.unref();
      }),
    ]);
    clearTimeout(shutdownTimer);
    if (!graceful && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await closed;
    }
  };

  const deadline = Date.now() + startupTimeoutMs;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (exitInfo) {
        const reason = exitInfo.signal ? `signal ${exitInfo.signal}` : `exit code ${exitInfo.code}`;
        throw new Error(`Slidev exited before becoming ready (${reason}).${output ? `\n${output.trim()}` : ""}`);
      }

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (response.ok) {
          // Do not leave an unread response body open while the browser connects.
          await response.body?.cancel();
          return { url, stop };
        }
        await response.body?.cancel();
      } catch {
        // The dev server is still starting; retry until the deadline or child exit.
      }

      await Promise.race([delay(READY_POLL_MS), exited]);
    }
    throw new Error(`Timed out after ${startupTimeoutMs}ms waiting for Slidev at ${url}.${output ? `\n${output.trim()}` : ""}`);
  } catch (error) {
    await stop();
    if (spawnError && error === spawnError) {
      throw new Error(`Could not start Slidev using '${command}': ${spawnError.message}`);
    }
    throw error;
  }
}
