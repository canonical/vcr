---
theme: default
title: VCR
info: |
  ## Presentazione VCR
  Maggiori informazioni su [VCR](https://github.com/canonical/vcr)
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
## uno strumento per la "Formazione come Codice"

<p v-click>
  E se creare un corso tecnico fosse come sviluppare software?
</p>

---
transition: fade-out
---

# Chi siamo

## Team Field Engineering Alliance

<div class="grid grid-cols-2 gap-8 mt-10">
  <div v-click class="p-6 rounded-xl border border-primary/30 bg-primary/10 text-left">
    <img class="mx-auto mb-5 h-36 w-36 rounded-full border-4 border-primary/40 object-cover" :src="'/ugo.png'" alt="Ugo Landini" />
    <h3 class="text-2xl font-bold text-center">Ugo Landini</h3>
  </div>
  <div v-click class="p-6 rounded-xl border border-primary/30 bg-primary/10 text-left">
    <img class="mx-auto mb-5 h-36 w-36 rounded-full border-4 border-primary/40 object-cover" :src="'/dave.png'" alt="Dave Ahern" />
    <h3 class="text-2xl font-bold text-center">Dave Ahern</h3>
  </div>
</div>

---
transition: fade-out
---

# Il problema

Dobbiamo produrre e mantenere corsi di abilitazione per i nostri partner.

Per creare un buon corso su un prodotto, di solito è necessario fare diverse cose:

- registrare sessioni di <tt>terminale</tt>
- registrare sessioni <tt>web</tt> con interfaccia utente
- localizzare le slide in <tt>diverse</tt> lingue
- riutilizzare moduli esistenti con lo <tt>stesso</tt> contenuto

<div v-click mt-12>
Problemi:

- Registrare un corso richiede molto tempo, quindi il costo è <tt>molto elevato</tt>
- I corsi attuali sono spesso sessioni registrate dal vivo, <tt>non di qualità studio</tt>
- La cosa peggiore è che per mantenere il materiale aggiornato, è necessario <span v-mark.circle.orange="2">  REGISTRARE DI NUOVO  </span> parti dei video ogni volta che qualcosa cambia

</div>

---

# La teoria

<p v-click>
L'industria IT ha risolto (diventando mainstream) un problema simile circa 10 anni fa.
</p>

<p v-click>
Esprimere tutto "come codice", in modo che il corso possa essere aggiornato e rigenerato automaticamente quando necessario
</p>

<div class="grid gap-3 mt-4 text-sm" style="grid-template-columns: repeat(3, 1fr) 1.5fr 1fr">
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">Slide</div>
    <div>Il testo, le transizioni e gli effetti delle slide</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/20">
    <div class="font-mono text-xs opacity-60 mb-1">Sessioni di terminale</div>
    <div>Comandi di esempio</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Sessioni web/browser</div>
    <div>Interfacce utente, siti web pubblici</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Voce/Sottotitoli</div>
    <div>Lingue diverse, sottotitoli</div>
  </div>
</div>

<div v-click mt-12>
<tt>TaC, Formazione come Codice</tt>: esattamente gli stessi vantaggi dell'Infrastruttura come Codice, ma per una formazione: nessun bisogno di digitare comandi in un terminale, aprire un browser, o persino parlare
</div>

<div v-click mt-12>
"aggiorna le slide 4, 8 e 10 del corso di abilitazione microcloud con il nuovo rilascio 3.3. Ricorda di aggiornare l'output del terminale nella slide 10 per mostrare la nuova versione"
</div>


---


# VCR, uno strumento per implementare TaC

<p v-click>
La soluzione: uno strumento capace di generare un intero corso da testo
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Slide</div>
    <div>Testo, grafica, transizioni ed effetti</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Sessione terminale</div>
    <div>mostra un video di una sessione di terminale registrata e generata da uno script</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">3. Sessione web</div>
    <div>mostra un video di una sessione browser registrata e generata da uno script</div>
  </div>
   <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">4. Voce/Sottotitoli</div>
    <div>Un compito semplice per un LLM specializzato!</div>
  </div>
</div>
<div v-click mt-12>
Vediamo alcuni <tt>esempi</tt>!
</div>


---


# Una sessione di terminale

Eseguiamo alcuni comandi di terminale a caso


<!-- sli-terminal:start hash=e91d57627b0a format=gif durationMs=23000 -->
![Registrazione terminale](./terminal-cache/basic-terminal-e91d57627b0a.gif)
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

# Una sessione web

Diamo un'occhiata alla documentazione di LXD

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

# Voce e Narrazione — L'obiettivo

<p v-click>
Automatizzare la narrazione in modo che i corsi possano essere ri-narrati in pochi minuti quando il contenuto cambia — senza ri-registrare, senza tempo in studio.
</p>

<div class="grid grid-cols-2 gap-6 mt-6 text-sm">
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-2">Opzione A — TTS locale</div>
    <div><strong>F5-TTS</strong> in esecuzione sul dispositivo (workstation)</div>
    <ul class="mt-2 space-y-1 opacity-80">
      <li>✅ Nessuna uscita di dati, libero di iterare</li>
      <li>✅ Zero-shot: clip di riferimento da 12s → la tua voce</li>
      <li>⚠️ Installazione complessa (conflitti di versione torch/transformers)</li>
      <li>⚠️ Ritmo notevolmente più lento della consegna naturale</li>
      <li>⚠️ Clip di riferimento brevi o poco varie producono risultati incomprensibili</li>
    </ul>
  </div>
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-2">Opzione B — ElevenLabs (cloud)</div>
    <div><strong>Clone vocale professionale</strong> tramite API</div>
    <ul class="mt-2 space-y-1 opacity-80">
      <li>✅ Consegna naturale, pronuncia corretta dei prodotti</li>
      <li>✅ MP3 per slide, basato su API, automatizzabile</li>
      <li>✅ Voci standard disponibili immediatamente mentre il clone si addestra</li>
      <li>⚠️ Richiede più di 30 min di audio di addestramento</li>
      <li>⚠️ 2–6h di addestramento del clone; costo per carattere nell'API</li>
    </ul>
  </div>
</div>

---

# Contenuto di Abilitazione Partner — Dove stiamo andando

<p v-click>
Abbiamo tradotto un corso esistente (slide e video) dallo spagnolo all'inglese — e abbiamo imparato cosa serve davvero per scalare la formazione localizzata.
</p>

<div class="grid grid-cols-2 gap-4 mt-6 text-sm">
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-2">Cosa abbiamo imparato</div>
    <ol class="mt-1 space-y-2 list-decimal list-inside opacity-90">
      <li>Tradurre slide e narrazione su larga scala richiede che il contenuto sia <strong>strutturato</strong> — non presentazioni monolitiche. La traduzione ad-hoc non si compone né si riutilizza.</li>
      <li>Il contenuto in Markdown facilita le traduzioni di testo generate da LLM, anche se richiede indicatori aggiuntivi per un ritmo adeguato nelle narrazioni audio generate.</li>
    </ol>
  </div>
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-2">Il piano</div>
    <ol class="mt-1 space-y-2 list-decimal list-inside opacity-90">
      <li>Creare <strong>master dei contenuti in inglese</strong> — strutturati, versionati, fonte di verità</li>
      <li><strong>Componentizzare</strong> in moduli e unità riutilizzabili in più corsi</li>
      <li><strong>Tradurre il testo</strong> nelle localizzazioni di destinazione (ES, PT-BR e oltre)</li>
      <li>Generare <strong>narrazioni audio localizzate</strong> per lingua con ElevenLabs</li>
    </ol>
  </div>
</div>

<div v-click mt-8>
Il risultato: una modifica al contenuto si propaga automaticamente in tutte le lingue — esattamente come una modifica al codice si propaga attraverso una pipeline CI.
</div>

<!-- sli-speech:start hash=701d9e83fd4f format=mp3 -->
<audio class="sli-speech-track" src="./audio-cache/701d9e83fd4f.mp3" preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpMYSBtaWEgcGFydGUgZGVsIHByb2dldHRvIMOoIGluaXppYXRhIGNvbiBsJ29iaWV0dGl2byBkaSB0cmFkdXJyZSB1bmEgcHJlc2VudGF6aW9uZSBtYXN0ZXIgaW4gc3BhZ25vbG86IHRyYWR1Y2VuZG8gc2lhIGlsIGNvbnRlbnV0byBkZWxsZSBzbGlkZSBpbiBpbmdsZXNlIGNoZSByZWdpc3RyYW5kbyB1bmEgbnVvdmEgdHJhY2NpYSBhdWRpbyBpbiBpbmdsZXNlLiBJbnZlY2UgZGkgcmVnaXN0cmFyZSBsJ2ludGVyYSBmb3JtYXppb25lLCBjaGUgZHVyYSBkaXZlcnNpIGdpb3JuaSwgY29uIGxhIG1pYSB2b2NlLCBobyBpbml6aWF0byBhIHJpY2VyY2FyZSBjb21lIHBvdHJlbW1vIHVzYXJlIGdsaSBMTE0gcGVyIGVudHJhbWJlIGxlIHBhcnRpIGRlbCBwcm9jZXNzby4gSW4gZWZmZXR0aSBub24gc3RvIG5lbW1lbm8gbGVnZ2VuZG8gcXVlc3RvIGluIHF1ZXN0byBtb21lbnRvLi4uCi0tPg==
<!-- sli-speech:end -->

---

# Due modi di usare VCR

<p v-click>
Interattivo e Non interattivo
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Modalità interattiva</div>
    <div>Modalità presentazione: utile per webinar e presentazioni "classiche"</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Modalità non interattiva</div>
    <div>Genera un video dell'intero corso dallo script, senza alcuna interazione umana</div>
  </div>
</div>

<div v-click mt-12>
 <tt>Esempi:</tt>

 Se stai registrando un webinar, potresti voler usare la tua voce ed essere più interattivo.

 Se devi tenere un corso microcloud a un partner, puoi automatizzare tutto e generare un video completo senza alcuna interazione
</div>

---

# Come è implementato

VCR è attualmente implementato come un insieme di estensioni al progetto sli.dev, sfruttando altri progetti OSS.
Ogni modulo di formazione è un singolo file Markdown con tutti i dati e i metadati.

<div class="implementation-grid">
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/slidev.png'" alt="logo sli.dev" />
    <h2>sli.dev</h2>
    <p>Crea la presentazione come slide Slidev potenziate da Markdown con gli steroidi.</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/vhs.png'" alt="logo VHS" />
    <h2>VHS</h2>
    <p>Renderizza i comandi del terminale in media memorizzati nella cache</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/playwright.svg'" alt="logo Playwright" />
    <h2>Playwright</h2>
    <p>Automatizza i browser, cattura le interazioni e memorizza i video risultanti nella cache.</p>
  </div>
</div>

---

# Cosa manca

- Template Canonical!
- Integrazione completa della parte Voce/sottotitoli (che attualmente è uno script esterno)
- L'installazione non è facile per l'utente
- Refactoring di un certo codice ~~scadente~~ generato da LLM

[VCR su Github](https://github.com/canonical/vcr/)

<div v-click mt-12>
VCR è completo? Facile da usare, robusto, privo di bug? <tt>No</tt>.
</div>
<div v-click mt-12>
VCR è già utilizzabile oggi? <span v-mark.red="2"> Decisamente SÌ</span>. Stiamo già producendo un corso microcloud e un corso di prevendita con questo strumento.
</div>
<div v-click mt-12>
E questa presentazione, ovviamente
</div>


---
transition: fade-out
---

# Compatibilità con gli LLM

VCR è molto compatibile con gli agenti:

- Sli.dev ha già un [server MCP](https://slidev-mcp.org/), funziona abbastanza bene
- Il piano è di estendere il server MCP con le nuove funzionalità (Terminale, Sessione web, Voce)
- La maggior parte delle slide può essere facilmente generata da un LLM

<div v-click mt-12>
"aggiorna le slide 4, 8 e 10 del corso di abilitazione microcloud con il nuovo rilascio 3.3. Ricorda di aggiornare l'output del terminale nella slide 10 per mostrare la nuova versione"

> pnpm run record-video

</div>
---
transition: fade-out
---

# Ulteriori informazioni

- Lo strumento: [VCR](https://github.com/canonical/vcr/)
- Il motore delle slide: [Sli.dev](https://github.com/slidevjs/slidev)
- Il renderer del terminale: [VHS](https://github.com/charmbracelet/vhs)
- L'automazione web: [Playwright](https://playwright.dev/)
- Tutto ciò che riguarda i video: [FFMpeg](https://www.ffmpeg.org/)
- Generazione vocale: [Eleven Labs](https://elevenlabs.io/)

## Domande?
---
transition: fade-out
---
# Grazie!
