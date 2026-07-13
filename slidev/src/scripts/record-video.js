import { spawn } from "node:child_process";
import process from "node:process";

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
const { code, signal } = await run("pnpm", ["run", "record:animated", "--", ...forwardedArgs]);

if (code !== 0) {
  throw new Error(`record:animated exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
}
