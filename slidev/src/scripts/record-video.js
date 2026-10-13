import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Must mirror record-slidev-animated.js so we convert the exact WebM it produced.
const OUT_DIR = process.env.VIDEO_OUT_DIR ?? "videos";
const OUTPUT_NAME = process.env.VIDEO_OUTPUT_NAME ?? "slidev-recording.webm";

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

// Convert the recorded WebM to MP4 (H.264 + yuv420p for broad compatibility).
const webmPath = path.join(OUT_DIR, OUTPUT_NAME);
const mp4Path = webmPath.replace(/\.webm$/i, ".mp4");

const { code: ffCode, signal: ffSignal } = await run("ffmpeg", [
  "-y",
  "-i", webmPath,
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  mp4Path,
]);

if (ffCode !== 0) {
  throw new Error(`ffmpeg exited with ${ffSignal ? `signal ${ffSignal}` : `code ${ffCode}`}`);
}

console.log(`Converted ${webmPath} -> ${mp4Path}`);
