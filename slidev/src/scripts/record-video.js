import { spawn } from "node:child_process";
import process from "node:process";

const SLIDEV_URL = process.env.SLIDEV_URL ?? "http://localhost:3030";
const HOST = process.env.SLIDEV_HOST ?? "0.0.0.0";
const WAIT_TIMEOUT_MS = Number.parseInt(process.env.SLIDEV_WAIT_TIMEOUT_MS ?? "60000", 10);

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  return {
    child,
    done: new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    })
  };
}

async function waitForSlidev() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(SLIDEV_URL, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        return;
      }
      lastError = new Error(`${SLIDEV_URL} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${SLIDEV_URL}: ${lastError?.message ?? "no response"}`);
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise(resolve => child.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 5000, "timeout"))
  ]);

  if (exited === "timeout" && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

const dev = run("pnpm", ["run", "dev", "--", "--host", HOST]);

try {
  await waitForSlidev();

  const forwardedArgs = process.argv.slice(2);
  const recording = run("pnpm", ["run", "record:animated", "--", ...forwardedArgs]);
  const { code, signal } = await recording.done;

  if (code !== 0) {
    throw new Error(`record:animated exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
  }
} finally {
  await stop(dev.child);
}
