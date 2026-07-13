import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const SLIDEV_URL = "http://localhost:3030";
const OUT_DIR = "videos";

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

const browser = await chromium.launch({
  headless: true
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: OUT_DIR,
    size: { width: 1920, height: 1080 }
  }
});

const page = await context.newPage();

await page.goto(SLIDEV_URL, { waitUntil: "networkidle" });

// ensure first slide
await page.keyboard.press("Home");
await page.waitForTimeout(1000);

for (const step of timeline) {
  console.log(`Recording slide: ${step.name}`);
  await page.waitForTimeout(step.wait);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
}

await context.close();
await browser.close();

const files = await fs.readdir(OUT_DIR);
const webm = files.find(f => f.endsWith(".webm"));

if (!webm) {
  throw new Error("No video generated");
}

const src = path.join(OUT_DIR, webm);
const dst = path.join(OUT_DIR, "slidev-recording.webm");

await fs.rename(src, dst);

console.log(`ffmpeg -i ${dst} -c:v libx264 -pix_fmt yuv420p -movflags +faststart videos/slidev-recording.mp4`);
