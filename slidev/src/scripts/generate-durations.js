#!/usr/bin/env node
/**
 * generate-durations.js — Build a durations file for record-slidev-animated.js
 *
 * Parses slides.md, finds every slide separator (---), checks whether each
 * slide contains a sli-speech audio block, probes the audio file duration
 * with ffprobe, and writes a durations.txt with one ms value per slide step.
 *
 * Slides without narration get a configurable fallback duration.
 *
 * Usage:
 *   node scripts/generate-durations.js
 *   node scripts/generate-durations.js --file=slides.md --output=durations.txt
 *   node scripts/generate-durations.js --fallback=3000 --padding=500
 *   node scripts/generate-durations.js --dry-run
 *
 * Options:
 *   --file=<path>       Slides markdown file (default: slides.md)
 *   --output=<path>     Output durations file (default: durations.txt)
 *   --fallback=<ms>     Duration for slides with no narration (default: 3000)
 *   --padding=<ms>      Extra ms added after each audio duration (default: 500)
 *   --dry-run           Print durations to stdout without writing the file
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function readOption(name) {
  const prefix = `--${name}=`;
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length);
}

const markdownPath  = path.resolve(projectRoot, readOption("file")   ?? "slides.md");
const outputPath    = path.resolve(projectRoot, readOption("output")  ?? "durations.txt");
const fallbackMs    = parseInt(readOption("fallback") ?? "3000", 10);
const paddingMs     = parseInt(readOption("padding")  ?? "500",  10);
const dryRun        = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Parse slides.md into per-slide chunks
// ---------------------------------------------------------------------------
async function parseSlides(mdPath) {
  const text = await fs.readFile(mdPath, "utf8");
  const lines = text.split(/\r?\n/);

  // Split on bare `---` slide separators (must be the entire line)
  const slides = [];
  let current = [];
  let inFrontMatter = false;
  let firstSlide = true;

  for (const line of lines) {
    if (line.trim() === "---") {
      if (firstSlide && current.length === 0) {
        // Opening front-matter fence
        inFrontMatter = true;
        current.push(line);
        continue;
      }
      if (inFrontMatter) {
        // Closing front-matter fence — this line belongs to the first slide header
        inFrontMatter = false;
        firstSlide = false;
        current.push(line);
        continue;
      }
      // Slide separator — save current slide and start new one
      slides.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) slides.push(current.join("\n"));

  return slides;
}

// ---------------------------------------------------------------------------
// Extract audio src from a sli-speech block in a slide chunk
// ---------------------------------------------------------------------------
const AUDIO_SRC_RE = /<audio[^>]+src="([^"]+)"[^>]*>/;

function extractAudioSrc(slideText) {
  const match = AUDIO_SRC_RE.exec(slideText);
  if (!match) return null;
  // src is relative to the markdown file directory
  return path.resolve(path.dirname(markdownPath), match[1]);
}

// ---------------------------------------------------------------------------
// Probe audio duration with ffprobe
// ---------------------------------------------------------------------------
async function probeDurationMs(audioPath) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`bad duration: ${stdout.trim()}`);
    return Math.ceil(seconds * 1000);
  } catch (err) {
    throw new Error(`ffprobe failed for ${audioPath}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const slides = await parseSlides(markdownPath);
console.log(`Parsed ${slides.length} slides from ${path.relative(projectRoot, markdownPath)}`);

const rows = [];
let narrationCount = 0;
let fallbackCount  = 0;

for (let i = 0; i < slides.length; i++) {
  const audioSrc = extractAudioSrc(slides[i]);
  if (audioSrc) {
    const durationMs = await probeDurationMs(audioSrc);
    const totalMs = durationMs + paddingMs;
    rows.push({
      slide: i + 1,
      hasAudio: true,
      audioFile: path.relative(projectRoot, audioSrc),
      audioDurationMs: durationMs,
      totalMs,
    });
    narrationCount++;
    console.log(`  Slide ${i + 1}: ${path.basename(audioSrc)} → ${durationMs}ms + ${paddingMs}ms padding = ${totalMs}ms`);
  } else {
    rows.push({
      slide: i + 1,
      hasAudio: false,
      totalMs: fallbackMs,
    });
    fallbackCount++;
    console.log(`  Slide ${i + 1}: no narration → ${fallbackMs}ms (fallback)`);
  }
}

// ---------------------------------------------------------------------------
// Write durations.txt
// ---------------------------------------------------------------------------
const header = [
  `# durations.txt — auto-generated by generate-durations.js`,
  `# Source: ${path.relative(projectRoot, markdownPath)}`,
  `# Padding: ${paddingMs}ms per narrated slide | Fallback: ${fallbackMs}ms for silent slides`,
  `# ${narrationCount} narrated, ${fallbackCount} silent, ${rows.length} total`,
  `#`,
  `# Format: one duration (ms) per slide step, read by record-slidev-animated.js`,
  `# Pass with: node scripts/record-slidev-animated.js --durations-file=durations.txt`,
  ``,
].join("\n");

const body = rows.map(r => {
  const comment = r.hasAudio
    ? `# slide ${r.slide}: ${r.audioFile} (${r.audioDurationMs}ms + ${paddingMs}ms)`
    : `# slide ${r.slide}: no narration (fallback)`;
  return `${comment}\n${r.totalMs}`;
}).join("\n");

const output = header + body + "\n";

if (dryRun) {
  console.log("\n--- durations.txt (dry run) ---\n");
  console.log(output);
} else {
  await fs.writeFile(outputPath, output, "utf8");
  console.log(`\nWrote ${rows.length} durations to ${path.relative(projectRoot, outputPath)}`);
  console.log(`Run: node scripts/record-slidev-animated.js --durations-file=${path.relative(projectRoot, outputPath)}`);
}
