import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(process.env.VIDEO_OUT_DIR ?? "videos");

function readFormat(args) {
  let format = "webm";
  const forwardedArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--format") {
      format = args[++i] ?? "";
    } else if (arg.startsWith("--format=")) {
      format = arg.slice("--format=".length);
    } else {
      forwardedArgs.push(arg);
    }
  }

  format = format.toLowerCase();
  if (!["webm", "mp4"].includes(format)) {
    throw new Error(`Unsupported recording format '${format}'. Use --format=webm or --format=mp4.`);
  }
  return { format, forwardedArgs };
}

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

const { format, forwardedArgs } = readFormat(process.argv.slice(2));
const requestedName = process.env.VIDEO_OUTPUT_NAME ?? "slidev-recording.webm";
const outputStem = path.basename(requestedName).replace(/\.(?:webm|mp4)$/i, "");
if (!outputStem || outputStem === "." || outputStem === "..") {
  throw new Error(`Invalid VIDEO_OUTPUT_NAME '${requestedName}'`);
}
const outputPath = path.join(OUT_DIR, `${outputStem}.${format}`);
await fs.mkdir(OUT_DIR, { recursive: true });
const recordingDir = await fs.mkdtemp(path.join(OUT_DIR, ".vcr-recording-"));
const webmPath = path.join(recordingDir, `${outputStem}.webm`);
const recordScript = path.join(__dirname, "record-slidev-animated.js");

try {
  const { code, signal } = await run(process.execPath, [recordScript, ...forwardedArgs], {
    env: {
      ...process.env,
      VIDEO_OUT_DIR: recordingDir,
      VIDEO_OUTPUT_NAME: path.basename(webmPath),
    },
  });

  if (code !== 0) {
    throw new Error(`Recording failed with ${signal ? `signal ${signal}` : `code ${code}`}`);
  }

  if (format === "mp4") {
    const temporaryMp4 = path.join(recordingDir, `${outputStem}.mp4`);
    const { code: ffCode, signal: ffSignal } = await run("ffmpeg", [
      "-y",
      "-i", webmPath,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      temporaryMp4,
    ]);

    if (ffCode !== 0) {
      throw new Error(`ffmpeg failed with ${ffSignal ? `signal ${ffSignal}` : `code ${ffCode}`}`);
    }
    await fs.rename(temporaryMp4, outputPath);
  } else {
    await fs.rename(webmPath, outputPath);
  }

  console.log(`Recorded ${format.toUpperCase()}: ${outputPath}`);
} finally {
  await fs.rm(recordingDir, { recursive: true, force: true });
}
