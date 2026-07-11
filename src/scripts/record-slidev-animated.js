import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const SLIDEV_URL = process.env.SLIDEV_URL ?? "http://localhost:3030";
const OUT_DIR = process.env.VIDEO_OUT_DIR ?? "videos";
const OUTPUT_NAME = process.env.VIDEO_OUTPUT_NAME ?? "slidev-animated-recording.webm";
const VIEWPORT = { width: 1920, height: 1080 };

const timeline = [
  { name: "title", wait: 3000 },
  { name: "roadmap", wait: 2000 },
  { name: "roadmap - install steps", wait: 4000 },
  { name: "roadmap - lock versions", wait: 4000 },
  { name: "roadmap - hardware check", wait: 4000 },
  { name: "roadmap - preflight check", wait: 4000 },
  { name: "roadmap - perform 1", wait: 2000 },
  { name: "roadmap - perform 2", wait: 2000 },
  { name: "roadmap - perform 3", wait: 2000 },
  { name: "install-snaps", wait: 2000 },
  { name: "install-snaps microcloud", wait: 4000 },
  { name: "install-snaps lxd", wait: 4000 },
  { name: "install-snaps microceph", wait: 4000 },
  { name: "install-snaps microovn", wait: 4000 },
  { name: "install-snaps installation", wait: 2000 },
  { name: "lock-versions", wait: 2000 },
  { name: "lock-versions - cohort", wait: 4000 },
  { name: "lock-versions - updates", wait: 4000 },
  { name: "lock-versions - verification", wait: 2000 },
  { name: "installing", wait: 1000 },
  { name: "installing - video", wait: 10000 },
  { name: "installing 2", wait: 1000 },
  { name: "installing 2 - video", wait: 10000 },
  { name: "hardware", wait: 2000 },
  { name: "hardware - dedicated", wait: 4000 },
  { name: "hardware - network", wait: 4000 },
  { name: "hardware - cpu", wait: 4000 },
  { name: "hardware - microcloud init", wait: 2000 },
  { name: "hardware-demo", wait: 1000 },
  { name: "hardware-demo - video", wait: 10000 },
  { name: "thanks", wait: 2000 }
];

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
await page.waitForTimeout(1000);

async function prepareAnimatedMedia() {
  return page.evaluate(async () => {
    const visible = element => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };

    const images = Array.from(document.images).filter(visible);
    await Promise.all(images.map(image => image.decode?.().catch(() => undefined)));

    const videos = Array.from(document.querySelectorAll("video")).filter(visible);
    await Promise.all(videos.map(video => new Promise(resolve => {
      video.muted = true;
      video.playsInline = true;
      video.loop = video.loop || !video.controls;
      video.currentTime = 0;

      const finish = () => resolve();
      const play = () => video.play().then(finish, finish);

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        play();
        return;
      }

      video.addEventListener("loadeddata", play, { once: true });
      video.load();
      window.setTimeout(finish, 2000);
    })));

    return { images: images.length, videos: videos.length };
  });
}

for (const step of timeline) {
  const media = await prepareAnimatedMedia();
  const mediaLabel = media.images || media.videos ? ` (${media.images} images, ${media.videos} videos)` : "";
  console.log(`Recording slide: ${step.name}${mediaLabel}`);
  await page.waitForTimeout(step.wait);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
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
