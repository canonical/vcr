import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

function optionValue(args, names) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    for (const name of names) {
      if (arg === `--${name}`) return args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
      if (arg.startsWith(`--${name}=`)) return arg.slice(name.length + 3);
    }
  }
  return undefined;
}

/** Generate an internal per-slide timing file unless the caller supplied timing. */
export async function prepareRecordingDurations({
  args = process.argv.slice(2),
  env = process.env,
  entryFile,
  outputDir,
  generatorFile,
  execute = execFileAsync,
}) {
  const explicitFile = optionValue(args, ["durations-file", "timings-file"])
    ?? env.RECORD_VIDEO_DURATIONS_FILE;
  if (explicitFile !== undefined) return { file: explicitFile || undefined, generated: false };

  const explicitStepDuration = optionValue(args, ["duration", "step-duration"])
    ?? env.ANIMATED_STEP_DURATION_MS;
  if (explicitStepDuration !== undefined) return undefined;

  const file = path.join(outputDir, "auto-durations.txt");
  await execute(process.execPath, [generatorFile, "--file", entryFile, "--output", file], { env });
  return { file, generated: true };
}
