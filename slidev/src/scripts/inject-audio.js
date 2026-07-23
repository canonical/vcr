#!/usr/bin/env node
/**
 * inject-audio.js — Inject <audio class="sli-speech-track"> tags into
 *                   Slidev slide .md files after audio-cache is populated.
 *
 * Reads audio-cache/manifest.json, maps slide numbers to .md files via
 * index.md src: directives, and injects/updates the <audio> tag at the
 * end of each slide's content block.
 *
 * Usage:
 *   node scripts/inject-audio.js <module>
 *   node scripts/inject-audio.js <module> --dry-run
 *   node scripts/inject-audio.js <module> --remove
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const AUDIO_TAG_RE = /<audio class="sli-speech-track"[^>]*><\/audio>/g;

function makeAudioTag(mp3Path) {
  return `\n<audio class="sli-speech-track" src="${mp3Path}" preload="auto"></audio>`;
}

// ---------------------------------------------------------------------------
// Get ordered slide files from index.md src: directives
// ---------------------------------------------------------------------------
function getSlideFiles(moduleDir) {
  const indexPath = path.join(moduleDir, "index.md");
  if (!fs.existsSync(indexPath)) {
    return fs.readdirSync(moduleDir)
      .filter(f => /^\d+.*\.md$/.test(f))
      .sort()
      .map(f => path.join(moduleDir, f));
  }
  const text = fs.readFileSync(indexPath, "utf8");
  const srcs = [...text.matchAll(/^src:\s*\.\/(\S+\.md)/gm)].map(m => m[1]);
  return srcs.map(s => path.join(moduleDir, s));
}

// ---------------------------------------------------------------------------
// Build global slide map: [{globalNum, fpath, localIdx}]
// ---------------------------------------------------------------------------
const FM_RE = /^(layout|class|theme|transition|clicks|src|name)\s*:/m;

function buildSlideMap(slideFiles) {
  const map = [];
  let globalNum = 1;

  for (const fpath of slideFiles) {
    if (!fs.existsSync(fpath)) continue;
    const text = fs.readFileSync(fpath, "utf8");
    const tokens = text.split(/^(---\s*)$/m);
    // tokens: [pre, sep, block, sep, block, ...]
    let i = 1;
    let localIdx = 0;

    while (i < tokens.length) {
      if (!/^---\s*$/.test(tokens[i])) { i++; continue; }

      const nextBlock = tokens[i + 1] ?? "";
      const nextSep   = tokens[i + 2] ?? "";

      if (FM_RE.test(nextBlock) && /^---\s*$/.test(nextSep)) {
        // Frontmatter + content pattern
        // Check for src: in frontmatter — src: imports count as full slides
        const srcMatch = nextBlock.match(/^src:\s*(.+)$/m);
        if (srcMatch) {
          map.push({ globalNum, fpath, localIdx });
          globalNum++;
          localIdx++;
          i += 4;
        } else {
          map.push({ globalNum, fpath, localIdx });
          globalNum++;
          localIdx++;
          i += 4;
        }
      } else {
        // Bare divider
        map.push({ globalNum, fpath, localIdx });
        globalNum++;
        localIdx++;
        i += 2;
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Inject audio tags into a single file
// ---------------------------------------------------------------------------
function injectIntoFile(fpath, slideIndices, dryRun, remove) {
  const original = fs.readFileSync(fpath, "utf8");
  let text = original;

  // Strip existing audio tags
  text = text.replace(/\n?<audio class="sli-speech-track"[^>]*><\/audio>\n?/g, "\n");

  if (!remove) {
    const tokens = text.split(/^(---\s*)$/m);
    const result = [tokens[0]];
    let i = 1;
    let slideIdx = 0;

    while (i < tokens.length) {
      if (!/^---\s*$/.test(tokens[i])) {
        result.push(tokens[i]);
        i++;
        continue;
      }

      const nextBlock = tokens[i + 1] ?? "";
      const nextSep   = tokens[i + 2] ?? "";

      if (FM_RE.test(nextBlock) && /^---\s*$/.test(nextSep)) {
        result.push(tokens[i]);     // sep before frontmatter
        result.push(nextBlock);     // frontmatter
        result.push(nextSep);       // sep before content
        let content = tokens[i + 3] ?? "";
        if (slideIdx in slideIndices) {
          content = content.trimEnd() + makeAudioTag(slideIndices[slideIdx]) + "\n";
        }
        result.push(content);
        slideIdx++;
        i += 4;
      } else {
        result.push(tokens[i]);     // bare divider
        let content = nextBlock;
        if (slideIdx in slideIndices) {
          content = content.trimEnd() + makeAudioTag(slideIndices[slideIdx]) + "\n";
        }
        result.push(content);
        slideIdx++;
        i += 2;
      }
    }

    text = result.join("");
  }

  if (text === original) return false;

  if (dryRun) {
    console.log(`  [dry-run] would update ${path.basename(fpath)}`);
    return true;
  }

  fs.writeFileSync(fpath, text, "utf8");
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function readArg(name) {
  const prefix = `--${name}=`;
  const flag   = `--${name}`;
  const val    = process.argv.find(a => a.startsWith(prefix));
  if (val) return val.slice(prefix.length);
  return process.argv.includes(flag) ? true : undefined;
}

const moduleName = process.argv.slice(2).find(a => !a.startsWith("--"));
const dryRun     = Boolean(readArg("dry-run"));
const remove     = Boolean(readArg("remove"));

if (!moduleName) {
  console.error("Usage: node scripts/inject-audio.js <module> [--dry-run] [--remove]");
  process.exit(1);
}

const moduleDir   = path.join(PROJECT_ROOT, "slidev", moduleName);
const cacheDir    = path.join(moduleDir, "audio-cache");
const manifestPath = path.join(cacheDir, "manifest.json");

if (!fs.existsSync(manifestPath) && !remove) {
  console.error(`No manifest.json found at ${manifestPath}`);
  process.exit(1);
}

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};

const slideFiles = getSlideFiles(moduleDir);
if (!slideFiles.length) {
  console.error("No slide files found");
  process.exit(1);
}

const slideMap = buildSlideMap(slideFiles);
console.log(`[${moduleName}] ${slideMap.length} slides across ${slideFiles.length} files`);

// Group by file: { fpath: { localIdx: mp3Src } }
const fileInjections = {};
for (const { globalNum, fpath, localIdx } of slideMap) {
  const entry = manifest.slides?.[globalNum] ?? manifest[String(globalNum)];
  if (entry) {
    const mp3 = `./audio-cache/${entry.file}`;
    if (!fileInjections[fpath]) fileInjections[fpath] = {};
    fileInjections[fpath][localIdx] = mp3;
  }
}

let changed = 0;
for (const fpath of slideFiles) {
  const injections = fileInjections[fpath] ?? {};
  if (injectIntoFile(fpath, injections, dryRun, remove)) {
    console.log(`  updated ${path.basename(fpath)}`);
    changed++;
  }
}

console.log(`[${moduleName}] ${changed} files updated`);
