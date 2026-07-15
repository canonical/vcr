#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// ElevenLabs config — loaded from ~/.chatterbox/.elevenlabs.env (or process.env)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  try {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
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
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(projectRoot, ".env.elevenlabs"));
loadEnvFile(path.join(process.env.HOME ?? "/root", "chatterbox", ".elevenlabs.env"));

const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL    = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
const ELEVENLABS_DICT_ID  = process.env.ELEVENLABS_DICT_ID;
const ELEVENLABS_DICT_VER = process.env.ELEVENLABS_DICT_VER;
const USE_ELEVENLABS = Boolean(ELEVENLABS_API_KEY);

if (USE_ELEVENLABS) {
  const missing = Object.entries({ ELEVENLABS_VOICE_ID, ELEVENLABS_DICT_ID, ELEVENLABS_DICT_VER })
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing required ElevenLabs env vars: ${missing.join(", ")}`);
    console.error("Set them in slidev/src/.env.elevenlabs or in the environment.");
    process.exit(1);
  }
}

const DEFAULT_MARKDOWN = "slides.md";
const DEFAULT_CACHE_DIR = "audio-cache";
const START = "<!-- sli-speech:start";
const END = "<!-- sli-speech:end -->";

const args = parseArgs(process.argv.slice(2));
const markdownPath = path.resolve(projectRoot, args.file ?? DEFAULT_MARKDOWN);
const cacheDir = path.resolve(path.dirname(markdownPath), args.cacheDir ?? DEFAULT_CACHE_DIR);
const dryRun = Boolean(args.dryRun);
const skipRender = Boolean(args.skipRender);
const ttsBin = args.ttsBin ?? "piper";
const model = args.model ?? process.env.PIPER_MODEL;

if (USE_ELEVENLABS) {
  console.log(`Using ElevenLabs (voice=${ELEVENLABS_VOICE_ID}, model=${ELEVENLABS_MODEL})`);
} else {
  console.log(`ElevenLabs API key not found — falling back to piper (${ttsBin})`);
}

const markdown = await fs.readFile(markdownPath, "utf8");
const processed = await renderSpeechBlocks(markdown);

if (processed.changed && !dryRun) {
  await fs.writeFile(markdownPath, processed.markdown);
}

console.log(
  `${dryRun ? "Would update" : "Updated"} ${path.relative(projectRoot, markdownPath)}: ${processed.rendered} rendered, ${processed.reused} reused, ${processed.changed ? "markdown changed" : "markdown unchanged"}`
);

async function renderSpeechBlocks(input) {
  const withoutCached = stripCachedBlocks(input);
  const blockPattern = /(^|\n)(?:(```|~~~)([^\s`~]+)([^\n]*)\n([\s\S]*?)\n\2[ \t]*(?=\n|$)|<!--\n([\s\S]*?)\n-->)/g;
  let output = "";
  let lastIndex = 0;
  let rendered = 0;
  let reused = 0;
  let match;

  while ((match = blockPattern.exec(withoutCached)) !== null) {
    const [full, prefix, fence, language, meta = "", fencedText, commentText] = match;
    const blockStart = match.index + prefix.length;
    const source = withoutCached.slice(blockStart, match.index + full.length);
    output += withoutCached.slice(lastIndex, blockStart);

    const options = parseMeta(meta);
    const text = fencedText ?? commentText;
    if (!isSpeechSource({ language, options, commentText })) {
      output += source;
      lastIndex = match.index + full.length;
      continue;
    }

    const voiceModel = options.model ?? model;
    const format = USE_ELEVENLABS ? "mp3" : "wav";
    const hash = hashText(text, USE_ELEVENLABS ? `elevenlabs-${ELEVENLABS_VOICE_ID}` : (voiceModel ?? "default"));
    const basename = `${options.name ? slug(options.name) + "-" : ""}${hash}.${format}`;
    const assetPath = path.join(cacheDir, basename);
    const mediaPath = relativeMarkdownAssetPath(markdownPath, assetPath);

    const assetExists = await exists(assetPath);
    if (!assetExists || options.force) {
      rendered += 1;
      if (!dryRun && !skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        if (USE_ELEVENLABS) {
          await renderWithElevenLabs(text, assetPath);
        } else {
          await renderWithLocalModel(text, assetPath, { command: options.ttsBin ?? ttsBin, model: voiceModel });
        }
      } else if (!dryRun && skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(assetPath, `placeholder for ${hash}\n`);
      }
    } else {
      reused += 1;
    }

    output += buildCachedBlock({ source, hash, mediaPath, format });
    lastIndex = match.index + full.length;
  }

  output += withoutCached.slice(lastIndex);
  return { markdown: output, rendered, reused, changed: output !== input };
}

function stripCachedBlocks(input) {
  const cachedPattern = /<!-- sli-speech:start[\s\S]*?<!-- sli-speech:source\n([\s\S]*?)\n<!-- sli-speech:end -->/g;
  return input.replace(cachedPattern, (_block, encoded) => Buffer.from(encoded.trim(), "base64").toString("utf8"));
}

function buildCachedBlock({ source, hash, mediaPath, format = "wav" }) {
  const encoded = Buffer.from(source, "utf8").toString("base64");
  const audio = `<audio class="sli-speech-track" src="${mediaPath}" preload="auto"></audio>`;
  return `${START} hash=${hash} format=${format} -->\n${audio}\n<!-- sli-speech:source\n${encoded}\n${END}`;
}

function relativeMarkdownAssetPath(markdownFile, assetPath) {
  const relativePath = path.relative(path.dirname(markdownFile), assetPath).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

// ---------------------------------------------------------------------------
// ElevenLabs text substitutions — ported from partner-enablement
// preprocess_narration.py: ELEVENLABS_SUBSTITUTIONS + apply_elevenlabs_substitutions()
//
// Applied as whole-word replacements (word boundaries respected).
// Order matters: compound terms first, then their component words.
// ---------------------------------------------------------------------------
const ELEVENLABS_SUBSTITUTIONS = [
  // Compound terms first (before their component words)
  ["MicroCloud",  "mike-ro-cloud"],
  ["MicroCeph",   "mike-ro-seff"],
  ["MicroOVN",    "mike-ro-oh-vin"],
  ["MicroK8s",    "My-kro-kates"],
  // Individual product names
  ["MAAS",        "mahz"],
  ["LXD",         "lex-dee"],
  ["JAAS",        "jazz"],
  ["Ceph",        "seff"],
  ["ceph",        "seff"],
  ["OVN",         "oh-vin"],
  ["Kubeflow",    "kyoob-flow"],
  ["NIC",         "nick"],
  ["NICs",        "nicks"],
];

/**
 * Apply ElevenLabs pronunciation substitutions to narration text.
 * Mirrors partner-enablement/tools/preprocess_narration.py:apply_elevenlabs_substitutions()
 * @param {string} text
 * @returns {string}
 */
function applyElevenLabsSubstitutions(text) {
  for (const [original, replacement] of ELEVENLABS_SUBSTITUTIONS) {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\b${escaped}\\b`, "g"), replacement);
  }
  return text;
}

async function renderWithElevenLabs(text, assetPath) {
  const processedText = applyElevenLabsSubstitutions(text.trim());
  const payload = JSON.stringify({
    text: processedText,
    model_id: ELEVENLABS_MODEL,
    voice_settings: { stability: 0.55, similarity_boost: 0.80 },
    pronunciation_dictionary_locators: [
      { pronunciation_dictionary_id: ELEVENLABS_DICT_ID, version_id: ELEVENLABS_DICT_VER },
    ],
  });
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: payload,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(assetPath, buf);
  console.log(`  ElevenLabs → ${path.basename(assetPath)} (${(buf.length / 1024).toFixed(0)}KB)`);
}

async function renderWithLocalModel(text, assetPath, { command, model }) {
  if (!model) {
    throw new Error("Missing TTS model. Pass --model path/to/model.onnx, set PIPER_MODEL, or add model=... to the speech block.");
  }
  await run(command, ["--model", model, "--output_file", assetPath], { cwd: projectRoot, input: text.trim() + "\n" });
  if (!(await exists(assetPath))) {
    throw new Error(`${command} did not create ${assetPath}`);
  }
}

function run(command, argv, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd: options.cwd, stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    child.stdin.end(options.input);
  });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--skip-render") out.skipRender = true;
    else if (arg.startsWith("--file=")) out.file = arg.slice(7);
    else if (arg === "--file") out.file = argv[++i];
    else if (arg.startsWith("--cache-dir=")) out.cacheDir = arg.slice(12);
    else if (arg === "--cache-dir") out.cacheDir = argv[++i];
    else if (arg.startsWith("--tts-bin=")) out.ttsBin = arg.slice(10);
    else if (arg === "--tts-bin") out.ttsBin = argv[++i];
    else if (arg.startsWith("--model=")) out.model = arg.slice(8);
    else if (arg === "--model") out.model = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function parseMeta(meta) {
  const options = {};
  for (const token of meta.trim().split(/\s+/).filter(Boolean)) {
    const [key, ...rest] = token.split("=");
    const rawValue = rest.join("=");
    if (!rawValue) {
      options[token] = true;
      continue;
    }
    options[key] = rawValue.replace(/^[ '\"]|[ '\"]$/g, "");
  }
  return options;
}

function isSpeechSource({ language, options, commentText }) {
  if (language) {
    return language === "speech" || language === "tts" || options.speech === true || options.tts === true;
  }
  return isNarrationComment(commentText);
}

function isNarrationComment(text) {
  const trimmed = text.trim();
  return trimmed.length > 0 && !/<[\w/!][\s\S]*>/.test(trimmed);
}

function hashText(text, modelName) {
  return createHash("sha256").update(blockHashVersion()).update(modelName).update(text).digest("hex").slice(0, 12);
}

function blockHashVersion() {
  return "sli-speech-v1";
}

function slug(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
