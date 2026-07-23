/**
 * engines/piper.js — Piper TTS engine for render-narration-audio
 *
 * Piper is a fast, offline neural TTS engine that runs on CPU.
 * Install: pip install piper-tts
 * Models:  python -m piper --download-voice en_US-lessac-medium
 *          (models saved to ~/.local/share/piper/)
 *
 * Config (env):
 *   VCR_PIPER_MODEL   ONNX model path or voice name (default: en_US-lessac-medium)
 *                     Can be a short name (en_US-lessac-medium) or full path to .onnx
 *   VCR_PIPER_BIN     piper binary path (default: piper, resolved from PATH)
 *
 * Output: WAV → converted to MP3 via ffmpeg (ffmpeg must be installed)
 */

import { execSync, spawnSync } from "node:child_process";
import fs   from "node:fs";
import path from "node:path";
import os   from "node:os";

export const id = "piper";

function piperBin() {
  return process.env.VCR_PIPER_BIN ?? "piper";
}

function piperModel() {
  const model = process.env.VCR_PIPER_MODEL ?? "en_US-lessac-medium";
  // If it looks like a full path, use as-is
  if (model.includes("/") || model.endsWith(".onnx")) return model;
  // Otherwise look in standard piper model dirs
  const candidates = [
    path.join(os.homedir(), ".local", "share", "piper", `${model}.onnx`),
    path.join(os.homedir(), ".local", "share", "piper", model, `${model}.onnx`),
    path.join("/usr/share/piper", `${model}.onnx`),
    path.join("/usr/local/share/piper", `${model}.onnx`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Return the name and let piper resolve it (may fail with a clear error)
  return model;
}

export function check() {
  // Check piper binary
  const bin = piperBin();
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
  } catch {
    return {
      ok: false,
      message:
        `piper not found (looked for '${bin}' on PATH).\n` +
        "  → Install: pip install piper-tts\n" +
        "  → Download a voice model:\n" +
        "      python -m piper --download-voice en_US-lessac-medium\n" +
        "  → Or set VCR_PIPER_BIN to the full path of the piper binary\n" +
        "  → Or use cloud synthesis: --engine=elevenlabs",
    };
  }
  // Check ffmpeg (needed for WAV→MP3 conversion)
  try {
    execSync("which ffmpeg", { stdio: "ignore" });
  } catch {
    return {
      ok: false,
      message:
        "ffmpeg not found — required for WAV→MP3 conversion with piper engine.\n" +
        "  → Install: sudo apt install ffmpeg",
    };
  }
  // Check model
  const model = piperModel();
  if (model.endsWith(".onnx") && !fs.existsSync(model)) {
    return {
      ok: false,
      message:
        `Piper model not found: ${model}\n` +
        "  → Download a voice model:\n" +
        "      python -m piper --download-voice en_US-lessac-medium\n" +
        "  → Or set VCR_PIPER_MODEL to the path of your .onnx model file",
    };
  }
  return { ok: true };
}

export function label() {
  return `Piper (model=${process.env.VCR_PIPER_MODEL ?? "en_US-lessac-medium"})`;
}

/**
 * Synthesise text → MP3 file via piper + ffmpeg.
 * @param {string} text     Pre-processed narration text (piper pause tokens stripped)
 * @param {string} outPath  Output .mp3 file path
 */
export async function synthesise(text, outPath) {
  const bin   = piperBin();
  const model = piperModel();
  const tmp   = outPath.replace(/\.mp3$/, ".wav");

  // Strip VCR markup that piper doesn't understand — pause tags become commas
  const piperText = text
    .replace(/\[\[pause\]\]/g, ", ")
    .replace(/\[\[break\]\]/g, ". ")
    .replace(/\[\[longpause\]\]/g, ". ")
    .replace(/\[\[dash\]\]/g, " — ")
    .replace(/\[\[emph:[^\]]+\]\]/g, (m) => m.replace(/\[\[emph:([^\]]+)\]\]/, "$1"))
    .replace(/\[\[pronounce:([^\]]+)\]\]/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "");

  try {
    // Run piper: echo text | piper --model <model> --output_file <wav>
    // config file is model path + .json — piper v1.5 requires it
    const configPath = model.endsWith(".onnx") ? model + ".json" : model;
    const args = ["-m", model, "-f", tmp];
    if (fs.existsSync(configPath)) args.push("-c", configPath);

    const result = spawnSync(
      bin,
      args,
      {
        input: piperText,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    if (result.status !== 0) {
      throw new Error(`piper exited ${result.status}: ${result.stderr}`);
    }
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size === 0) {
      throw new Error("piper produced no output");
    }

    // Convert WAV → MP3 via ffmpeg
    execSync(`ffmpeg -y -i "${tmp}" -codec:a libmp3lame -qscale:a 4 "${outPath}" 2>/dev/null`);

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      throw new Error("ffmpeg WAV→MP3 conversion produced no output");
    }
  } finally {
    // Clean up temp WAV
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
