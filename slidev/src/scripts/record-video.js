import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

const forwardedArgs = process.argv.slice(2);
const recordScript = path.join(__dirname, "record-slidev-animated.js");
const { code, signal } = await run(process.execPath, [recordScript, ...forwardedArgs]);

if (code !== 0) {
  throw new Error(`record:animated exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
}
