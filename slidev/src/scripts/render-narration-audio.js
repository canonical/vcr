#!/usr/bin/env node
/**
 * render-narration-audio.js — Resume-aware TTS audio renderer
 *                              for Slidev/VCR narration scripts (narration.md).
 *
 * Reads ## Slide N: Title sections from narration.md, synthesises per-slide
 * MP3s via the chosen TTS engine, writes to audio-cache/, and produces
 * manifest.json and durations.txt for use by record-slidev-animated.js.
 *
 * Usage:
 *   node scripts/render-narration-audio.js <module>
 *   node scripts/render-narration-audio.js <module> --engine=elevenlabs
 *   node scripts/render-narration-audio.js <module> --engine=piper
 *   node scripts/render-narration-audio.js <module> --slide=19
 *   node scripts/render-narration-audio.js <module> --force
 *   node scripts/render-narration-audio.js <module> --dry-run
 *   node scripts/render-narration-audio.js --all
 *
 * Engines:
 *   elevenlabs  Cloud TTS — high quality, requires ELEVENLABS_API_KEY (default)
 *   piper       Local TTS — offline, no API key, requires piper + ffmpeg
 *   chatterbox  Not yet implemented
 *
 * Config (env or .env at project root):
 *   ELEVENLABS_API_KEY   ElevenLabs API key
 *   VCR_VOICE_ID         ElevenLabs voice ID (default: HEfF1IJ9HcifVBNWZdCQ)
 *   VCR_MODEL            ElevenLabs model (default: eleven_multilingual_v2)
 *   VCR_DICT_ID          ElevenLabs pronunciation dictionary id
 *   VCR_DICT_VER         ElevenLabs pronunciation dictionary version
 *   VCR_PIPER_MODEL      Piper voice model name or .onnx path (default: en_US-lessac-medium)
 *   VCR_PIPER_BIN        Piper binary path (default: piper)
 */

import fs   from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preprocess } from "./preprocess-narration.js";
import * as elevenlabs from "./engines/elevenlabs.js";
import * as piper      from "./engines/piper.js";
import * as chatterbox from "./engines/chatterbox.js";

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
  } catch { /* env file optional */ }
}

loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(PROJECT_ROOT, ".env.elevenlabs"));

// ---------------------------------------------------------------------------
// Engine registry
// ---------------------------------------------------------------------------
const ENGINES = { elevenlabs, piper, chatterbox };
const DEFAULT_ENGINE = "elevenlabs";

function resolveEngine(name) {
  const engine = ENGINES[name];
  if (!engine) {
    console.error(
      `ERROR: Unknown engine '${name}'.\n` +
      `  → Available engines: ${Object.keys(ENGINES).join(", ")}`
    );
    process.exit(1);
  }
  const check = engine.check();
  if (!check.ok) {
    console.error(`ERROR: Engine '${name}' is not available.\n${check.message}`);
    process.exit(1);
  }
  return engine;
}

// ---------------------------------------------------------------------------
// Narration parsing — reads ## Slide N: Title blocks from narration.md
// ---------------------------------------------------------------------------
function parseNarrationMd(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const slides = [];
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
// MP3 duration via ffprobe
// ---------------------------------------------------------------------------
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
// Process one module
// ---------------------------------------------------------------------------
async function processModule(moduleName, opts = {}) {
  const { slideFilter = null, force = false, dryRun = false, engine } = opts;

  // Find the module — support both old (slidev/<module>) and new (partner-enablement modules/<module>/en)
  let moduleDir = path.join(PROJECT_ROOT, "slidev", moduleName);
  if (!fs.existsSync(moduleDir)) {
    // Try resolving relative to cwd (for use from partner-enablement root)
    moduleDir = path.resolve(process.cwd(), "modules", moduleName, "en");
  }

  const narrationPath = path.join(moduleDir, "narration.md");
  const cacheDir      = path.join(moduleDir, "audio-cache");

  if (!fs.existsSync(narrationPath)) {
    console.error(`[${moduleName}] narration.md not found at ${narrationPath}`);
    return;
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  const slides     = parseNarrationMd(narrationPath);
  const toProcess  = slideFilter ? slides.filter(s => s.num === slideFilter) : slides;

  if (toProcess.length === 0) {
    console.log(`[${moduleName}] no slides to process`);
    return;
  }

  // Load existing manifest + durations
  const manifestPath = path.join(cacheDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")).slides ?? {}; } catch {}
  }

  const durPath  = path.join(cacheDir, "durations.txt");
  const durations = {};
  if (fs.existsSync(durPath)) {
    for (const line of fs.readFileSync(durPath, "utf8").split("\n")) {
      const [n, d] = line.trim().split(/\s+/);
      if (n && d) durations[parseInt(n, 10)] = parseFloat(d);
    }
  }

  const engineId = engine.id;
  console.log(`[${moduleName}] engine=${engineId}  slides=${toProcess.length}`);

  let generated = 0, skipped = 0, errors = 0;

  for (const slide of toProcess) {
    const padded  = String(slide.num).padStart(3, "0");
    const outPath = path.join(cacheDir, `${padded}.mp3`);

    // Preprocess text for the chosen engine
    const model     = process.env.VCR_MODEL ?? "eleven_multilingual_v2";
    const cleanText = preprocess(slide.body, { engine: engineId, model });

    // Skip if cached and not forced
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      process.stdout.write(`  slide ${padded} [${slide.title}] → SKIP (cached)\n`);
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
    process.stdout.write(`  slide ${padded} [${slide.title}]...`);

    try {
      await engine.synthesise(cleanText, outPath);
      const dur  = mp3DurationSync(outPath);
      durations[slide.num] = dur;
      manifest[slide.num]  = { title: slide.title, file: `${padded}.mp3`, duration: dur };
      process.stdout.write(` OK (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
      generated++;
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
      errors++;
    }
  }

  // Write manifest
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ module: moduleName, engine: engineId, slides: manifest }, null, 2)
  );

  // Write durations
  const durLines = Object.keys(durations).map(Number).sort((a, b) => a - b)
    .map(n => `${n} ${durations[n]}`).join("\n");
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

const engineName  = readArg("engine") || DEFAULT_ENGINE;
const all         = readArg("all");
const dryRun      = Boolean(readArg("dry-run"));
const force       = Boolean(readArg("force")) || Boolean(readArg("no-resume"));
const slideArg    = readArg("slide");
const slideFilter = slideArg ? parseInt(slideArg, 10) : null;
const moduleName  = process.argv.slice(2).find(a => !a.startsWith("--"));

// Resolve and validate engine before doing any work
const engine = resolveEngine(String(engineName));
console.log(`Using engine: ${engine.label()}`);

const ALL_MODULES = [
  "about-canonical", "ubuntu", "ubuntu-pro", "infrastructure",
  "storage-ceph", "private-cloud", "kubernetes", "applications-ai",
  "appendix-vmware-migration", "appendix-observability", "appendix-support",
];

if (all) {
  for (const mod of ALL_MODULES) {
    await processModule(mod, { dryRun, force, engine });
  }
} else if (moduleName) {
  await processModule(moduleName, { slideFilter, force, dryRun, engine });
} else {
  console.error(
    "Usage: node render-narration-audio.js <module> [options]\n" +
    "       node render-narration-audio.js --all\n" +
    "\n" +
    "Options:\n" +
    "  --engine=<name>   TTS engine: elevenlabs (default), piper, chatterbox\n" +
    "  --slide=<n>       Render only slide N\n" +
    "  --force           Re-render even if cached\n" +
    "  --dry-run         Show what would be rendered without synthesising\n" +
    "  --all             Process all known modules"
  );
  process.exit(1);
}
