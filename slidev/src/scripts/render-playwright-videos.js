#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const DEFAULT_MARKDOWN = "slides.md";
const DEFAULT_CACHE_DIR = "playwright-cache";
const START = "<!-- sli-playwright:start";
const SOURCE = "<!-- sli-playwright:source -->";
const END = "<!-- sli-playwright:end -->";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const markdownPath = path.resolve(projectRoot, args.file ?? DEFAULT_MARKDOWN);
const cacheDir = path.resolve(path.dirname(markdownPath), args.cacheDir ?? DEFAULT_CACHE_DIR);
const dryRun = Boolean(args.dryRun);
const skipRender = Boolean(args.skipRender);

const markdown = await fs.readFile(markdownPath, "utf8");
const processed = await renderPlaywrightBlocks(markdown);

if (processed.changed && !dryRun) {
  await fs.writeFile(markdownPath, processed.markdown);
}

console.log(
  `${dryRun ? "Would update" : "Updated"} ${path.relative(projectRoot, markdownPath)}: ${processed.rendered} rendered, ${processed.reused} reused, ${processed.changed ? "markdown changed" : "markdown unchanged"}`
);

async function renderPlaywrightBlocks(input) {
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
    if (!isPlaywrightBlock(language, options)) {
      output += full;
      lastIndex = match.index + full.length;
      continue;
    }

    const hash = hashScript(script);
    const basename = `${options.name ? slug(options.name) + "-" : ""}${hash}.webm`;
    const assetPath = path.join(cacheDir, basename);
    const mediaPath = relativeMarkdownAssetPath(markdownPath, assetPath);

    const assetExists = await exists(assetPath);
    if (!assetExists || options.force) {
      rendered += 1;
      if (!dryRun && !skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await renderWithPlaywright(script, assetPath, options);
      } else if (!dryRun && skipRender) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(assetPath, `placeholder for ${hash}\n`);
      }
    } else {
      reused += 1;
    }

    output += buildCachedBlock({ language, meta: meta.trim(), script, hash, mediaPath });
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
  const clearTextPattern = /<!-- sli-playwright:start[\s\S]*?<!-- sli-playwright:source -->\n([\s\S]*?)\n<!-- sli-playwright:end -->/g;
  return input.replace(clearTextPattern, (_block, source) => source);
}

function buildCachedBlock({ language, meta, script, hash, mediaPath }) {
  const source = `\`\`\`${language}${meta ? ` ${meta}` : ""}\n${script}\n\`\`\``;
  const media = `<video src="${mediaPath}" controls autoplay playsinline muted loop></video>`;
  return `${START} hash=${hash} format=webm -->\n${media}\n${SOURCE}\n${source}\n${END}`;
}

function relativeMarkdownAssetPath(markdownFile, assetPath) {
  const relativePath = path.relative(path.dirname(markdownFile), assetPath).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

async function renderWithPlaywright(script, assetPath, options) {
  const tmpDir = await fs.mkdtemp(path.join(path.dirname(assetPath), ".tmp-"));
  const scriptPath = path.join(tmpDir, "session.mjs");
  await fs.writeFile(scriptPath, script);

  const width = parseIntegerOption(options.width, 1280, "width");
  const height = parseIntegerOption(options.height, 720, "height");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tmpDir, size: { width, height } },
  });
  const page = await context.newPage();

  try {
    const mod = await import(pathToFileURL(scriptPath).href);
    const runSession = mod.default ?? mod.run;
    if (typeof runSession !== "function") {
      throw new Error("Playwright block must export a default function or named run function");
    }
    await runSession({ page, context, browser, output: assetPath });
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const videos = (await fs.readdir(tmpDir)).filter(file => file.endsWith(".webm"));
  if (videos.length === 0) {
    throw new Error(`Playwright did not create a video in ${tmpDir}`);
  }
  await fs.rename(path.join(tmpDir, videos[0]), assetPath);
  await fs.rm(tmpDir, { recursive: true, force: true });
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
    options[key] = rawValue.replace(/^[']|[']$/g, "").replace(/^[\"]|[\"]$/g, "");
  }
  return options;
}

function isPlaywrightBlock(language, options) {
  return language === "playwright" || options.playwright === true;
}

function parseIntegerOption(options, fallback, key) {
  if (options[key] === undefined) return fallback;
  const parsed = Number.parseInt(options[key], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid ${key}: ${options[key]}`);
  return parsed;
}

function hashScript(script) {
  return createHash("sha256").update(blockHashVersion()).update(script).digest("hex").slice(0, 12);
}

function blockHashVersion() {
  return "sli-playwright-v1";
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
