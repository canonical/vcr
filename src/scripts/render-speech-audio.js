#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_MARKDOWN = "slides.md";
const DEFAULT_CACHE_DIR = "audio-cache";
const START = "<!-- sli-speech:start";
const END = "<!-- sli-speech:end -->";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const markdownPath = path.resolve(projectRoot, args.file ?? DEFAULT_MARKDOWN);
const cacheDir = path.resolve(path.dirname(markdownPath), args.cacheDir ?? DEFAULT_CACHE_DIR);
const dryRun = Boolean(args.dryRun);
const skipRender = Boolean(args.skipRender);
const ttsBin = args.ttsBin ?? "piper";
const model = args.model ?? process.env.PIPER_MODEL;

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
    const hash = hashText(text, voiceModel ?? "default");
    const basename = `${options.name ? slug(options.name) + "-" : ""}${hash}.wav`;
    const assetPath = path.join(cacheDir, basename);
    const mediaPath = relativeMarkdownAssetPath(markdownPath, assetPath);

    const assetExists = await exists(assetPath);
    if (!assetExists || options.force) {
      rendered += 1;
      if (!dryRun && !skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await renderWithLocalModel(text, assetPath, { command: options.ttsBin ?? ttsBin, model: voiceModel });
      } else if (!dryRun && skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(assetPath, `placeholder wav for ${hash}\n`);
      }
    } else {
      reused += 1;
    }

    output += buildCachedBlock({ source, hash, mediaPath });
    lastIndex = match.index + full.length;
  }

  output += withoutCached.slice(lastIndex);
  return { markdown: output, rendered, reused, changed: output !== input };
}

function stripCachedBlocks(input) {
  const cachedPattern = /<!-- sli-speech:start[\s\S]*?<!-- sli-speech:source\n([\s\S]*?)\n<!-- sli-speech:end -->/g;
  return input.replace(cachedPattern, (_block, encoded) => Buffer.from(encoded.trim(), "base64").toString("utf8"));
}

function buildCachedBlock({ source, hash, mediaPath }) {
  const encoded = Buffer.from(source, "utf8").toString("base64");
  const audio = `<audio class="sli-speech-track" src="${mediaPath}" autoplay preload="auto"></audio>`;
  return `${START} hash=${hash} format=wav -->\n${audio}\n<!-- sli-speech:source\n${encoded}\n${END}`;
}

function relativeMarkdownAssetPath(markdownFile, assetPath) {
  const relativePath = path.relative(path.dirname(markdownFile), assetPath).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
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
