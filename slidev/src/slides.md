---
theme: default
title: VCR
info: |
  ## VCR Presentation
  Learn more at [VCR](https://github.com/canonical/vcr)
class: cover text-center
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left
# enable Comark Syntax: https://comark.dev/syntax/markdown
comark: true
# duration of the presentation
duration: 35min
---

# VCR
## a tool for "Training As Code"

<p v-click>
  What if creating a technical course felt like developing software?
</p>

---
transition: fade-out
---

# Who we are

## Field Engineering Alliance team

<div class="grid grid-cols-2 gap-8 mt-10">
  <div v-click class="p-6 rounded-xl border border-primary/30 bg-primary/10 text-left">
    <img class="mx-auto mb-5 h-36 w-36 rounded-full border-4 border-primary/40 object-cover" :src="'/ugo.png'" alt="Ugo Landini" />
    <h3 class="text-2xl font-bold text-center">Ugo Landini</h3>
  </div>
  <div v-click class="p-6 rounded-xl border border-primary/30 bg-primary/10 text-left">
    <img class="mx-auto mb-5 h-36 w-36 rounded-full border-4 border-primary/40 object-cover" :src="'/dave.png'" alt="Dave Ahearn" />
    <h3 class="text-2xl font-bold text-center">Dave Ahearn</h3>
  </div>
</div>

---
transition: fade-out
---

# The problem

We need to produce and maintain enablement courses for our partners.

For a good product course, you usually need to do several things:

- to record <tt>terminal</tt> sessions
- to record <tt>web</tt> sessions with UI
- to localize slides in <tt>different</tt> languages
- to reuse existing modules with <tt>same</tt> content

<div v-click mt-12>
Issues:

- Recording a course is time consuming, so cost is <tt>very high</tt>
- Current courses are often recorded live sessions, <tt>not studio-quality</tt>
- The worst thing is that to maintain the material up to date, it's necessary to <span v-mark.circle.orange="2">  RE-RECORD  </span> portion of the videos each time something changes

</div>


---

# Training As Code

<p v-click>
The theory: express every part of a training as code, so that the course itself can be updated and regenerated automatically as needed
</p>

<div class="grid gap-3 mt-4 text-sm" style="grid-template-columns: repeat(3, 1fr) 1.5fr 1fr">
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">Slides</div>
    <div>The slides themselves</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/20">
    <div class="font-mono text-xs opacity-60 mb-1">Terminal Sessions</div>
    <div>If you have to show something on the terminal</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Web/Browser sessions</div>
    <div>If you have to show something in a browser</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Speech/Subtitles</div>
    <div>No human needed to talk, different languages</div>
  </div>
</div>

<div v-click mt-12>

Exactly the same benefits of Infrastructure as Code, but for a training: no need to type commands in a terminal, to open a browser, or even to talk

</div>

---


# VCR, a tool to implement TaC

<p v-click>
The solution: a tool capable of generating an entire course from text
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Slides</div>
    <div>Text, graphics, transitions, effects</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Terminal session</div>
    <div>show a video of a recorded terminal session generated from a script</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">3. Web session</div>
    <div>show a video of a recorded browser session generated from a script</div>
  </div>
   <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">4. Speech/Subtitles</div>
    <div>Easy task for a specialized LLM!</div>
  </div>
</div>
<div v-click mt-12>
Let's look at an <tt>example</tt>!
</div>


---


# A terminal session

Let's do some random terminal commands


<!-- sli-terminal:start hash=e91d57627b0a format=gif durationMs=23000 -->
![Terminal recording](./terminal-cache/basic-terminal-e91d57627b0a.gif)
<!-- sli-terminal:source -->
```txt terminal name=basic-terminal
Output "/tmp/basic-terminal.gif"
Set Shell "bash"
Set FontSize 22
Set Width 1280
Set Height 720
Set Theme Dracula
Set Padding 32
Set Framerate 30

Type "echo '=== some  terminal commands ==='"
Sleep 300ms
Enter 1
Sleep 1s
Type "uname -a"
Sleep 400ms
Enter 1
Sleep 3s
Type "whoami"
Sleep 400ms
Enter 1
Sleep 3s
Type "gemma4 list-engines"
Sleep 400ms
Enter 1
Sleep 11s
```
<!-- sli-terminal:end -->

---

# A web session

Let's have a look at LXD documentation

<!-- sli-playwright:start hash=04c91987bf1e format=webm -->
<video :src="'/playwright-cache/basic-web-session-04c91987bf1e.webm'" controls autoplay playsinline muted loop></video>
<!-- sli-playwright:source -->




```js playwright name=basic-web-session width=1280 height=720
export default async function ({ page }) {
  await page.addInitScript(() => {
    const installCursor = () => {
      if (document.querySelector("[data-demo-cursor]")) return;

      const cursor = document.createElement("div");
      cursor.dataset.demoCursor = "true";
      cursor.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483647;
        width: 28px;
        height: 28px;
        border: 3px solid #e95420;
        border-radius: 999px;
        background: rgb(233 84 32 / 18%);
        box-shadow: 0 0 0 4px rgb(255 255 255 / 90%), 0 6px 18px rgb(0 0 0 / 35%);
        pointer-events: none;
        transform: translate(-50%, -50%);
      `;
      document.documentElement.append(cursor);

      window.addEventListener("mousemove", event => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      }, { passive: true });

      window.addEventListener("mousedown", () => {
        cursor.style.transform = "translate(-50%, -50%) scale(0.72)";
      });
      window.addEventListener("mouseup", () => {
        cursor.style.transform = "translate(-50%, -50%)";
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", installCursor, { once: true });
    } else {
      installCursor();
    }
  });

  const pause = (ms = 900) => page.waitForTimeout(ms);
  const targetPoint = async locator => {
    const box = await locator.boundingBox();
    if (!box) throw new Error("Could not find target on screen");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const moveTo = async locator => {
    const point = await targetPoint(locator);
    await page.mouse.move(point.x, point.y, { steps: 40 });
    await pause(700);
    return point;
  };
  const clickLikeHuman = async locator => {
    const point = await moveTo(locator);
    await page.mouse.down();
    await pause(180);
    await page.mouse.up();
    await pause(1200);
    return point;
  };

  await page.goto("https://docs.ubuntu.com/");
  await page.waitForLoadState("domcontentloaded");
  await page.mouse.move(120, 120, { steps: 20 });
  await pause(1200);

  const jujuLink = page.getByRole("link", { name: /^LXD$/i }).first();
  await jujuLink.waitFor();
  await clickLikeHuman(jujuLink);
  await page.waitForLoadState("domcontentloaded");
  await pause(1500);

  for (const delta of [220, 220, 220, 220]) {
    await page.mouse.wheel(0, delta);
    await pause(500);
  }
  await pause(3000);
}
```
<!-- sli-playwright:end -->
---

# Speech/subtitles



---

# Two ways of using VCR

<p v-click>
Interactive and Not Interactive
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Interactive</div>
    <div>Presentation mode: useful for webinars, "classic" presentations</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. !Interactive</div>
    <div>Generates a video of the whole course from the script</div>
  </div>
</div>

<div v-click mt-12>
If you are presenting, may be you want to use your own voice and be more interactive. If you want to be fully automated, just generate a full video.
</div>

---

# How it's implemented

VCR it's currently implemented as a bunch of extensions to the sli.dev project, leveraging other OSS projects.
Each training module is a single markdown file with all the data and metadata.

<div class="implementation-grid">
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/slidev.png'" alt="sli.dev logo" />
    <h2>sli.dev</h2>
    <p>Author the talk as Markdown-powered Slidev slides on steroids.</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/vhs.png'" alt="VHS logo" />
    <h2>VHS</h2>
    <p>Render terminal commands into cached media</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/playwright.svg'" alt="Playwright logo" />
    <h2>Playwright</h2>
    <p>Drive browsers automatically, capture interactions, and cache the resulting videos.</p>
  </div>
</div>

---

# What's missing

- Canonical templates!
- Refactoring of some crappy AI-generated code
- Full integration of the Speech/subtitles part (which is now an external script)
- Making it user-friendly

[VCR Github](https://github.com/canonical/vcr/)

<div v-click mt-12>
Is VCR complete? User-friendly, bullet proof, bug free? <tt>No</tt>.
</div>
<div v-click mt-12>
Is VCR already usable today? <span v-mark.red="2"> Definitely YES</span>. We are already producing a microcloud course and a presales course with this tool.
</div>


---
transition: fade-out
---

# LLM Friendliness

VCR is very agentic friendly:

- Sli.dev already has an [MCP server](https://slidev-mcp.org/), it works pretty well
- The plan is to extend the MCP server with the new capabilities (Terminal, Web session, Speech)
- Most of the slides can be easily generated by an LLM

<div v-click mt-12>
Imagine something like: "update slides 4, 8 and 10 of the microcloud enablement course with the new 3.3 release. Remember to update terminal script in slide 10 to show the new version release"
</div>

---
transition: fade-out
---

# Some Links

- [VCR](https://github.com/canonical/vcr/)
- [Sli.dev](https://github.com/slidevjs/slidev)
- [VHS](https://github.com/charmbracelet/vhs)
- [Playwright](https://playwright.dev/)
- [FFMpeg](https://www.ffmpeg.org/)
- [Eleven Labs](https://elevenlabs.io/)

## Questions?
---
transition: fade-out
---
# Thanks!
