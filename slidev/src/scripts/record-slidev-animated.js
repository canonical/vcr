import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const SLIDEV_URL = process.env.SLIDEV_URL ?? "http://localhost:3030";
const OUT_DIR = process.env.VIDEO_OUT_DIR ?? "videos";
const OUTPUT_NAME = process.env.VIDEO_OUTPUT_NAME ?? "slidev-animated-recording.webm";
const VIEWPORT = { width: 1920, height: 1080 };
const DEFAULT_STEP_DURATION_MS = 1000;
const ADVANCE_SETTLE_MS = 500;

function parseDuration(value, source) {
  if (!value) {
    return undefined;
  }

  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(ms|s)?$/i);
  if (!match) {
    throw new Error(`${source} must be a positive duration such as 1000, 1000ms, or 1s`);
  }

  const amount = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() ?? "ms";
  const duration = unit === "s" ? amount * 1000 : amount;

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`${source} must be greater than 0`);
  }

  return Math.round(duration);
}

function readStepDuration() {
  const durationArg = process.argv.find(arg => arg.startsWith("--duration="));
  const stepDurationArg = process.argv.find(arg => arg.startsWith("--step-duration="));
  const arg = durationArg ?? stepDurationArg;

  return parseDuration(arg?.split("=")[1], arg?.split("=")[0])
    ?? parseDuration(process.env.ANIMATED_STEP_DURATION_MS, "ANIMATED_STEP_DURATION_MS")
    ?? DEFAULT_STEP_DURATION_MS;
}

const stepDuration = readStepDuration();

await fs.mkdir(OUT_DIR, { recursive: true });

const beforeRecording = new Set(await fs.readdir(OUT_DIR));
const outputPath = path.join(OUT_DIR, OUTPUT_NAME);
await fs.rm(outputPath, { force: true });

const browser = await chromium.launch({ headless: true });

const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: {
    dir: OUT_DIR,
    size: VIEWPORT
  }
});

const page = await context.newPage();

await page.goto(SLIDEV_URL, { waitUntil: "networkidle" });

await page.keyboard.press("Home");
await page.waitForTimeout(ADVANCE_SETTLE_MS);

async function getSlideState() {
  return page.evaluate(() => {
    const visible = element => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };

    const visibleSlides = Array.from(document.querySelectorAll(".slidev-page, [data-slidev-no]"))
      .filter(visible)
      .map(slide => slide.getAttribute("data-slidev-no") ?? slide.id ?? slide.textContent?.trim().slice(0, 80) ?? "")
      .join("|");

    return `${window.location.href}::${visibleSlides}`;
  });
}

async function waitForAnimatedMedia(stepDurationMs) {
  return page.evaluate(async duration => {
    const visible = element => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };

    const images = Array.from(document.images).filter(visible);
    await Promise.all(images.map(image => image.decode?.().catch(() => undefined)));

    const videos = Array.from(document.querySelectorAll("video")).filter(visible);

    if (videos.length === 0) {
      await new Promise(resolve => window.setTimeout(resolve, duration));
      return { images: images.length, videos: 0, waitedForVideo: false };
    }

    await Promise.all(videos.map(video => new Promise(resolve => {
      video.muted = true;
      video.playsInline = true;
      video.loop = false;

      const finish = () => {
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        resolve();
      };

      const playToEnd = () => {
        video.currentTime = 0;
        video.addEventListener("ended", finish, { once: true });
        video.addEventListener("error", finish, { once: true });
        video.play().catch(finish);
      };

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        playToEnd();
        return;
      }

      video.addEventListener("loadeddata", playToEnd, { once: true });
      video.load();
    })));

    return { images: images.length, videos: videos.length, waitedForVideo: true };
  }, stepDurationMs);
}

let step = 1;
while (true) {
  const beforeAdvance = await getSlideState();
  const media = await waitForAnimatedMedia(stepDuration);
  const mediaLabel = media.images || media.videos ? ` (${media.images} images, ${media.videos} videos)` : "";
  const waitLabel = media.waitedForVideo ? "video duration" : `${stepDuration}ms`;
  console.log(`Recording step ${step}${mediaLabel}; waited ${waitLabel}`);

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(ADVANCE_SETTLE_MS);

  const afterAdvance = await getSlideState();
  if (afterAdvance === beforeAdvance) {
    break;
  }

  step += 1;
}

await context.close();
await browser.close();

const files = await fs.readdir(OUT_DIR);
const generatedWebm = files.find(file => file.endsWith(".webm") && !beforeRecording.has(file));

if (!generatedWebm) {
  throw new Error("No animated video generated");
}

const generatedPath = path.join(OUT_DIR, generatedWebm);
await fs.rename(generatedPath, outputPath);

console.log(`Animated video written to ${outputPath}`);
console.log();
console.log("Convert to MP4 with:");
console.log(`ffmpeg -i ${outputPath} -c:v libx264 -pix_fmt yuv420p -movflags +faststart videos/slidev-animated-recording.mp4`);
