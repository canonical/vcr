#!/usr/bin/env node
/** Generate one recording duration per Slidev slide from cached media. */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return process.argv[index + 1];
  }
  return fallback;
}

const markdownPath = path.resolve(readOption("file", "slides.md"));
const outputPath = path.resolve(readOption("output", path.join(path.dirname(markdownPath), "durations.txt")));
const fallbackMs = Number.parseInt(readOption("fallback", "1000"), 10);
const paddingMs = Number.parseInt(readOption("padding", "500"), 10);
const dryRun = process.argv.includes("--dry-run");

for (const [name, value] of [["fallback", fallbackMs], ["padding", paddingMs]]) {
  if (!Number.isSafeInteger(value) || value < 0 || (name === "fallback" && value === 0)) {
    throw new Error(`--${name} must be a ${name === "fallback" ? "positive" : "non-negative"} integer number of milliseconds`);
  }
}

async function parseSlides(file) {
  const text = await fs.readFile(file, "utf8");
  const lines = text.split(/\r?\n/);
  const slides = [];
  let current = [];
  let inFrontMatter = false;
  let firstSlide = true;

  for (const line of lines) {
    if (line.trim() !== "---") {
      current.push(line);
      continue;
    }
    if (firstSlide && current.length === 0) {
      inFrontMatter = true;
      current.push(line);
    } else if (inFrontMatter) {
      inFrontMatter = false;
      firstSlide = false;
      current.push(line);
    } else {
      slides.push(current.join("\n"));
      current = [];
    }
  }
  if (current.length > 0) slides.push(current.join("\n"));
  return slides;
}

async function collectSlides(file, visited = new Set()) {
  const absolute = path.resolve(file);
  if (visited.has(absolute)) return [];
  visited.add(absolute);

  const text = await fs.readFile(absolute, "utf8");
  const frontmatterPattern = /^---\s*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/gm;
  const frontmatterBlocks = [...text.matchAll(frontmatterPattern)];
  const sourcePaths = [];
  for (const block of frontmatterBlocks) {
    for (const line of block[1].split(/\r?\n/)) {
      const source = line.match(/^\s*src\s*:\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$/);
      if (!source) continue;
      sourcePaths.push(path.resolve(path.dirname(absolute), source[1]));
    }
  }

  const content = text.replace(frontmatterPattern, "").replace(/^\s*---\s*$/gm, "");
  const slides = [];
  // A src-only index file is a deck manifest, not a slide of its own.
  if (!sourcePaths.length || content.trim()) {
    slides.push(...(await parseSlides(absolute)).map(markdown => ({ markdown, file: absolute })));
  }
  for (const sourcePath of sourcePaths) {
    if (!/\.md$/i.test(sourcePath)) continue;
    slides.push(...await collectSlides(sourcePath, visited));
  }
  return slides;
}

const audioSource = /<audio\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i;
const videoSources = /<video\b[^>]*(?<!:)\bsrc=["']([^"']+)["'][^>]*>/gi;
const terminalDurations = /<!--\s*sli-terminal:start\b[^>]*?durationMs=(\d+)/g;

async function probeDurationMs(file) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`invalid media duration: ${stdout.trim()}`);
  return Math.ceil(seconds * 1000);
}

const slides = await collectSlides(markdownPath);
if (slides.length === 0) throw new Error(`No slides found in ${markdownPath}`);
console.log(`Parsed ${slides.length} slides from ${markdownPath}`);

const durations = [];
let withMedia = 0;
for (let index = 0; index < slides.length; index++) {
  const { markdown: slide, file: slideFile } = slides[index];
  const candidates = [];
  const audio = audioSource.exec(slide)?.[1];
  if (audio) {
    const mediaPath = path.resolve(path.dirname(slideFile), audio);
    try {
      candidates.push({ label: `audio:${path.basename(audio)}`, ms: await probeDurationMs(mediaPath) });
    } catch (error) {
      console.warn(`Slide ${index + 1}: skipping audio probe for ${mediaPath}: ${error.message}`);
    }
  }

  for (const match of slide.matchAll(terminalDurations)) {
    candidates.push({ label: `terminal:${match[1]}ms`, ms: Number.parseInt(match[1], 10) });
  }

  for (const match of slide.matchAll(videoSources)) {
    const mediaPath = path.resolve(path.dirname(slideFile), match[1]);
    try {
      candidates.push({ label: `video:${path.basename(mediaPath)}`, ms: await probeDurationMs(mediaPath) });
    } catch (error) {
      console.warn(`Slide ${index + 1}: skipping video probe for ${mediaPath}: ${error.message}`);
    }
  }

  const duration = candidates.length
    ? Math.max(...candidates.map(candidate => candidate.ms)) + paddingMs
    : fallbackMs;
  durations.push(duration);
  if (candidates.length) withMedia++;
  console.log(`  Slide ${index + 1}: ${candidates.length ? `${candidates.map(item => `${item.label} ${item.ms}ms`).join(", ")} + ${paddingMs}ms padding` : `no media; ${fallbackMs}ms fallback`} = ${duration}ms`);
}

const output = [
  "# Generated by vcr generate-durations",
  `# Source: ${markdownPath}`,
  `# Padding: ${paddingMs}ms; fallback: ${fallbackMs}ms`,
  `# ${withMedia} slides with media, ${slides.length - withMedia} fallback slides, ${slides.length} total`,
  ...durations,
  "",
].join("\n");

if (dryRun) {
  console.log("\n--- durations file (dry run) ---\n");
  console.log(output);
} else {
  await fs.writeFile(outputPath, output, "utf8");
  console.log(`Wrote ${durations.length} durations to ${outputPath}`);
}
