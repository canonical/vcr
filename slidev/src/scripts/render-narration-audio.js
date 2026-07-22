#!/usr/bin/env node
/**
 * render-narration-audio.js — Resume-aware ElevenLabs TTS audio renderer
 *                              for Slidev/VCR narration scripts (narration.md).
 *
 * Reads ## Slide N: Title sections from narration.md, synthesises per-slide
 * MP3s via ElevenLabs, writes to audio-cache/, and produces manifest.json
 * and durations.txt for use by record-slidev-animated.js.
 *
 * Usage:
 *   node scripts/render-narration-audio.js <module>
 *   node scripts/render-narration-audio.js <module> --slide=19
 *   node scripts/render-narration-audio.js <module> --force
 *   node scripts/render-narration-audio.js <module> --dry-run
 *   node scripts/render-narration-audio.js --all
 *
 * Config (env or .env / .env.elevenlabs in project root):
 *   ELEVENLABS_API_KEY   required
 *   VCR_VOICE_ID         default HEfF1IJ9HcifVBNWZdCQ
 *   VCR_DICT_ID          pronunciation dictionary id
 *   VCR_DICT_VER         pronunciation dictionary version
 *   VCR_MODEL            default eleven_multilingual_v2
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { preprocess } from "./preprocess-narration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // env file optional
  }
}

loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(PROJECT_ROOT, ".env.elevenlabs"));
loadEnvFile(path.join(process.env.HOME ?? "/root", ".chatterbox", ".elevenlabs.env"));

const API_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_ID  = process.env.VCR_VOICE_ID  ?? "HEfF1IJ9HcifVBNWZdCQ";
const DICT_ID   = process.env.VCR_DICT_ID   ?? "";
const DICT_VER  = process.env.VCR_DICT_VER  ?? "";
const MODEL     = process.env.VCR_MODEL     ?? "eleven_multilingual_v2";

const ALL_MODULES = [
  "about-canonical", "ubuntu", "ubuntu-pro", "infrastructure",
  "storage-ceph", "private-cloud", "kubernetes", "applications-ai",
  "appendix-vmware-migration", "appendix-observability", "appendix-support",
];

// ---------------------------------------------------------------------------
// Narration parsing — reads ## Slide N: Title blocks from narration.md
// ---------------------------------------------------------------------------
function parseNarrationMd(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const slides = [];
  const pattern = /^## Slide (\d+):\s*(.+?)$([\s\S]*?)(?=^## Slide \d+:|\s*$(?![\s\S]))/gm;

  // Split manually to be robust
  const parts = text.split(/^(?=## Slide \d+:)/m);
  for (const part of parts) {
    const header = part.match(/^## Slide (\d+):\s*(.+?)$/m);
    if (!header) continue;
    const num   = parseInt(header[1], 10);
    const title = header[2].trim();
    const body  = part.slice(header[0].length).trim();
    if (body) slides.push({ num, title, body });
  }
  return slides;
}

// ---------------------------------------------------------------------------
// Text cleaning for ElevenLabs
// ---------------------------------------------------------------------------
const KEEP_ACRONYMS = new Set([
  "LTS", "ESM", "CVE", "LXD", "MAAS", "OCI", "IoT", "DNA",
  "IHV", "ISV", "GSI", "AWS", "GCP", "CPU", "GPU", "API",
  "OS", "VM", "AI", "ML", "CI", "CD",
]);

function cleanForTts(text) {
  // [pause] markers → comma
  text = text.replace(/\[pause\]/g, ",");
  // ALL CAPS words — lowercase unless known acronym
  text = text.replace(/\b([A-Z]{2,})\b/g, (_, word) =>
    KEEP_ACRONYMS.has(word) ? word : word.toLowerCase()
  );
  // Strip phonetic hints in parens e.g. "(can-ON-ih-kul)"
  text = text.replace(/\s*\([a-zA-Z-]+\)/g, "");
  // Run through preprocess pipeline (handles [[pause]], substitutions etc.)
  text = preprocess(text, { engine: "elevenlabs", model: MODEL });
  return text.trim();
}

// ---------------------------------------------------------------------------
// MP3 duration via ffprobe (avoids binary mp3 parsing dependency)
// ---------------------------------------------------------------------------
async function mp3Duration(filePath) {
  return new Promise((resolve) => {
    const { spawn } = await import("node:child_process").then(m => m);
    // Use synchronous execSync to keep it simple
    try {
      const { execSync } = await import("node:child_process").then(m => m);
      const out = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: "utf8" }
      ).trim();
      resolve(parseFloat(out) || 0);
    } catch {
      resolve(0);
    }
  });
}

// Synchronous version using child_process
import { execSync } from "node:child_process";

function mp3DurationSync(filePath) {
  try {
    const out = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    return Math.round(parseFloat(out) * 100) / 100;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// ElevenLabs TTS API call
// ---------------------------------------------------------------------------
async function synthesise(text, outPath, retries = 3) {
  if (!API_KEY) throw new Error("ELEVENLABS_API_KEY not set");

  const body = JSON.stringify({
    text,
    model_id: MODEL,
    voice_settings: { stability: 0.55, similarity_boost: 0.80 },
    ...(DICT_ID && {
      pronunciation_dictionary_locators: [
        { pronunciation_dictionary_id: DICT_ID, version_id: DICT_VER },
      ],
    }),
  });

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      }, (res) => {
        if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers["retry-after"] ?? "5", 10);
          console.warn(`    rate limited — retrying in ${retryAfter}s`);
          setTimeout(() => resolve(null), retryAfter * 1000);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          const chunks = [];
          res.on("data", c => chunks.push(c));
          res.on("end", () => reject(new Error(`API ${res.statusCode}: ${Buffer.concat(chunks).toString()}`)));
          return;
        }
        const out = fs.createWriteStream(outPath);
        res.pipe(out);
        out.on("finish", () => resolve(true));
        out.on("error", reject);
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });

    // If file was written, we're done
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return true;
    if (attempt < retries) await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`Failed to synthesise after ${retries} attempts`);
}

// ---------------------------------------------------------------------------
// Process one module
// ---------------------------------------------------------------------------
async function processModule(moduleName, opts = {}) {
  const { slideFilter = null, force = false, dryRun = false } = opts;

  const slidevDir  = path.join(PROJECT_ROOT, "slidev", moduleName);
  const narrationPath = path.join(slidevDir, "narration.md");
  const cacheDir   = path.join(slidevDir, "audio-cache");

  if (!fs.existsSync(narrationPath)) {
    console.error(`[${moduleName}] narration.md not found at ${narrationPath}`);
    return;
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  const slides = parseNarrationMd(narrationPath);
  const toProcess = slideFilter
    ? slides.filter(s => s.num === slideFilter)
    : slides;

  if (toProcess.length === 0) {
    console.log(`[${moduleName}] no slides to process`);
    return;
  }

  // Load existing manifest
  const manifestPath = path.join(cacheDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch {}
  }

  // Load existing durations
  const durPath = path.join(cacheDir, "durations.txt");
  const durations = {};
  if (fs.existsSync(durPath)) {
    for (const line of fs.readFileSync(durPath, "utf8").split("\n")) {
      const [n, d] = line.trim().split(/\s+/);
      if (n && d) durations[parseInt(n, 10)] = parseFloat(d);
    }
  }

  let generated = 0, skipped = 0, errors = 0;
  console.log(`[${moduleName}] ${toProcess.length} slide${toProcess.length === 1 ? "" : "s"} to process`);

  for (const slide of toProcess) {
    const padded = String(slide.num).padStart(3, "0");
    const outPath = path.join(cacheDir, `${padded}.mp3`);
    const cleanText = cleanForTts(slide.body);

    // Skip if cached and not forced
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      process.stdout.write(`  slide ${padded} [${slide.title}] → ${padded}.mp3 SKIP\n`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  slide ${padded} [${slide.title}] → DRY RUN`);
      console.log(`    text: ${cleanText.slice(0, 80)}...`);
      skipped++;
      continue;
    }

    const t0 = Date.now();
    process.stdout.write(`  slide ${padded} [${slide.title}] → ${padded}.mp3...`);

    try {
      await synthesise(cleanText, outPath);
      const dur = mp3DurationSync(outPath);
      durations[slide.num] = dur;
      manifest[slide.num] = { title: slide.title, file: `${padded}.mp3`, duration: dur };
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(` OK (${elapsed}s)\n`);
      generated++;
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
      errors++;
    }
  }

  // Write manifest and durations
  fs.writeFileSync(manifestPath, JSON.stringify({ module: moduleName, slides: manifest }, null, 2));

  const durLines = Object.keys(durations)
    .map(Number)
    .sort((a, b) => a - b)
    .map(n => `${n} ${durations[n]}`)
    .join("\n");
  fs.writeFileSync(durPath, durLines + "\n");

  console.log(`[${moduleName}] done: ${generated} generated, ${skipped} skipped, ${errors} errors`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function readArg(name) {
  const prefix = `--${name}=`;
  const flag   = `--${name}`;
  const val    = process.argv.find(a => a.startsWith(prefix));
  if (val) return val.slice(prefix.length);
  return process.argv.includes(flag) ? true : undefined;
}

const all      = readArg("all");
const dryRun   = Boolean(readArg("dry-run"));
const force    = Boolean(readArg("force")) || Boolean(readArg("no-resume"));
const slideArg = readArg("slide");
const slideFilter = slideArg ? parseInt(slideArg, 10) : null;
const moduleName  = process.argv.slice(2).find(a => !a.startsWith("--"));

if (!API_KEY) {
  console.error("ERROR: ELEVENLABS_API_KEY not set");
  process.exit(1);
}

if (all) {
  for (const mod of ALL_MODULES) {
    await processModule(mod, { dryRun, force });
  }
} else if (moduleName) {
  await processModule(moduleName, { slideFilter, force, dryRun });
} else {
  console.error("Usage: node render-narration-audio.js <module> [--slide=N] [--force] [--dry-run]");
  console.error("       node render-narration-audio.js --all");
  process.exit(1);
}
