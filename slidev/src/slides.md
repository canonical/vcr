---
theme: default
title: VCR
info: |
  ## VCR Presentation
  Learn more at [VCR](https://github.com/canonical/vcr)
class: text-center
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

# The problem

We need to produce and maintain enablement courses for our partners.

<ul>
   <li>Need to record terminal sessions</li>
   <li>Need to record web sessions with UI</li>
   <li>Need to be in different languages</li>
   <li>Some modules may be present in different enablement courses</li>
</ul>


<div v-click mt-12>

Our products evolve, so to maintain the courses up to date, it would be necessary to <span v-mark.circle.orange="2">  RE-RECORD  </span> portion of the videos each time something changes

</div>


---

# Training As Code

<p v-click>
The theory: express everything in a training as code, so that the course itself can be updated and regenerated as needed
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
    <div class="font-mono text-xs opacity-60 mb-1">Browser sessions</div>
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

A basic terminal example

<!-- sli-terminal:start hash=fbdece556194 format=gif -->
![Terminal recording](./terminal-cache/basic-terminal-fbdece556194.gif)
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

Type "echo '=== some terminal commands ==='"
Sleep 300ms
Enter 1
Sleep 1s
Type "uname"
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
Sleep 30s
```
<!-- sli-terminal:end -->

---

# A web session

A basic Playwright example

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

  const jujuLink = page.getByRole("link", { name: /^juju$/i }).first();
  await jujuLink.waitFor();
  await clickLikeHuman(jujuLink);
  await page.waitForLoadState("domcontentloaded");
  await pause(1500);

  const tutorialLink = page.getByRole("link", { name: /try the juju tutorial/i }).first();
  await tutorialLink.waitFor();
  await tutorialLink.scrollIntoViewIfNeeded();
  await pause(900);
  await clickLikeHuman(tutorialLink);
  await page.waitForLoadState("domcontentloaded");
  await pause(1500);

  for (const delta of [220, 220, 220, 220]) {
    await page.mouse.wheel(0, delta);
    await pause(500);
  }
  await pause(3000);
}
```

---

Thanks!
