#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_MARKDOWN = "slides.md";
const DEFAULT_CACHE_DIR = "terminal-cache";
const START = "<!-- sli-terminal:start";
const SOURCE = "<!-- sli-terminal:source -->";
const END = "<!-- sli-terminal:end -->";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const markdownPath = path.resolve(projectRoot, args.file ?? DEFAULT_MARKDOWN);
const cacheDir = path.resolve(path.dirname(markdownPath), args.cacheDir ?? DEFAULT_CACHE_DIR);
const format = normalizeFormat(args.format ?? "gif");
const dryRun = Boolean(args.dryRun);
const skipRender = Boolean(args.skipRender);
const vhsBin = args.vhsBin ?? "vhs";

const markdown = await fs.readFile(markdownPath, "utf8");
const processed = await renderTerminalBlocks(markdown);

if (processed.changed && !dryRun) {
  await fs.writeFile(markdownPath, processed.markdown);
}

console.log(
  `${dryRun ? "Would update" : "Updated"} ${path.relative(projectRoot, markdownPath)}: ${processed.rendered} rendered, ${processed.reused} reused, ${processed.changed ? "markdown changed" : "markdown unchanged"}`
);

async function renderTerminalBlocks(input) {
  const withoutCached = stripCachedBlocks(input);
  const fencePattern = /(^|\n)(```|~~~)([^\s`~]+)([^\n]*)\n([\s\S]*?)\n\2[ \t]*(?=\n|$)/g;
  let output = "";
  let lastIndex = 0;
  let rendered = 0;
  let reused = 0;
  let match;

  while ((match = fencePattern.exec(withoutCached)) !== null) {
    const [full, prefix, fence, language, meta, script] = match;
    const blockStart = match.index + prefix.length;
    output += withoutCached.slice(lastIndex, blockStart);

    const options = parseMeta(meta);
    if (!isTerminalBlock(language, options)) {
      output += full;
      lastIndex = match.index + full.length;
      continue;
    }
    const blockFormat = normalizeFormat(options.format ?? format);
    const hash = hashScript(script, blockFormat);
    const basename = `${options.name ? slug(options.name) + "-" : ""}${hash}.${blockFormat}`;
    const assetPath = path.join(cacheDir, basename);
    const mediaPath = relativeMarkdownAssetPath(markdownPath, assetPath);

    const assetExists = await exists(assetPath);
    if (!assetExists || options.force) {
      rendered += 1;
      if (!dryRun && !skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await renderWithVhs(script, assetPath, blockFormat, vhsBin);
      } else if (!dryRun && skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(assetPath, `placeholder for ${hash}\n`);
      }
    } else {
      reused += 1;
    }

    const durationMs = !dryRun && !skipRender && await exists(assetPath)
      ? readMediaDurationMs(assetPath)
      : undefined;

    output += buildCachedBlock({ language, meta: meta.trim(), script, hash, blockFormat, mediaPath, durationMs });
    lastIndex = match.index + full.length;
  }

  output += withoutCached.slice(lastIndex);
  return {
    markdown: output,
    rendered,
    reused,
    changed: output !== input,
  };
}

function stripCachedBlocks(input) {
  const clearTextPattern = /<!-- sli-terminal:start[\s\S]*?<!-- sli-terminal:source -->\n([\s\S]*?)\n<!-- sli-terminal:end -->/g;
  const withoutClearText = input.replace(clearTextPattern, (_block, source) => source);

  const legacyBase64Pattern = /<!-- sli-terminal:start[\s\S]*?<!-- sli-terminal:source\n([\s\S]*?)\n<!-- sli-terminal:end -->/g;
  return withoutClearText.replace(legacyBase64Pattern, (_block, encoded) => Buffer.from(encoded.trim(), "base64").toString("utf8"));
}

function buildCachedBlock({ language, meta, script, hash, blockFormat, mediaPath, durationMs }) {
  const source = `\`\`\`${language}${meta ? ` ${meta}` : ""}\n${script}\n\`\`\``;
  const media = blockFormat === "gif"
    ? `![Terminal recording](${mediaPath})`
    : `<video src="${mediaPath}" controls autoplay playsinline muted></video>`;
  const durationMeta = durationMs ? ` durationMs=${durationMs}` : "";
  return `${START} hash=${hash} format=${blockFormat}${durationMeta} -->\n${media}\n${SOURCE}\n${source}\n${END}`;
}

function relativeMarkdownAssetPath(markdownFile, assetPath) {
  const relativePath = path.relative(path.dirname(markdownFile), assetPath).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

async function renderWithVhs(script, assetPath, blockFormat, command) {
  const tmpDir = await fs.mkdtemp(path.join(path.dirname(assetPath), ".tmp-"));
  const tapePath = path.join(tmpDir, "render.tape");
  const tape = script.replace(/^\s*Output\s+.*$/m, "").trimStart();
  await fs.writeFile(tapePath, `Output ${JSON.stringify(assetPath)}\n${tape}`);
  await run(command, [tapePath], { cwd: projectRoot });
  if (!(await exists(assetPath))) {
    throw new Error(`vhs did not create ${assetPath}`);
  }
  if (!assetPath.endsWith(`.${blockFormat}`)) {
    throw new Error(`Unexpected output extension for ${assetPath}`);
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
}

function readMediaDurationMs(assetPath) {
  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    assetPath,
  ], { encoding: "utf8" });

  if (probe.error || probe.status !== 0) {
    console.warn(`Could not read duration for ${assetPath}; install ffprobe to write duration metadata`);
    return undefined;
  }

  const seconds = Number.parseFloat(probe.stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    console.warn(`Could not read a positive duration for ${assetPath}`);
    return undefined;
  }

  return Math.round(seconds * 1000);
}

function run(command, argv, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { ...options, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
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
    else if (arg.startsWith("--format=")) out.format = arg.slice(9);
    else if (arg === "--format") out.format = argv[++i];
    else if (arg.startsWith("--cache-dir=")) out.cacheDir = arg.slice(12);
    else if (arg === "--cache-dir") out.cacheDir = argv[++i];
    else if (arg.startsWith("--vhs-bin=")) out.vhsBin = arg.slice(10);
    else if (arg === "--vhs-bin") out.vhsBin = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function parseMeta(meta) {
  const options = {};
  for (const token of meta.trim().split(/\s+/).filter(Boolean)) {
    const [key, rawValue] = token.split("=");
    if (!rawValue) {
      options[token] = true;
      continue;
    }
    options[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return options;
}

function isTerminalBlock(language, options) {
  return language === "terminal" || language === "tape" || options.terminal === true || options.tape === true;
}

function normalizeFormat(value) {
  if (!["gif", "mp4"].includes(value)) throw new Error(`Unsupported format ${value}; use gif or mp4`);
  return value;
}

function hashScript(script, blockFormat) {
  return createHash("sha256").update(blockHashVersion()).update(blockFormat).update(script).digest("hex").slice(0, 12);
}

function blockHashVersion() {
  return "sli-terminal-v1";
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
