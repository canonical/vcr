---
theme: default
title: VCR
info: |
  ## Presentación VCR
  Más información en [VCR](https://github.com/canonical/vcr)
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
## una herramienta para "Formación como Código"

<p v-click>
  ¿Y si crear un curso técnico se sintiera como desarrollar software?
</p>

---
transition: fade-out
---

# Quiénes somos

## Equipo Field Engineering Alliance

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

# El problema

Necesitamos producir y mantener cursos de habilitación para nuestros partners.

Para crear un buen curso de producto, normalmente hay que hacer varias cosas:

- grabar sesiones de <tt>terminal</tt>
- grabar sesiones <tt>web</tt> con interfaz de usuario
- localizar las diapositivas en <tt>distintos</tt> idiomas
- reutilizar módulos existentes con el <tt>mismo</tt> contenido

<div v-click mt-12>
Problemas:

- Grabar un curso lleva mucho tiempo, por lo que el coste es <tt>muy elevado</tt>
- Los cursos actuales suelen ser sesiones grabadas en directo, <tt>no de calidad de estudio</tt>
- Lo peor es que para mantener el material actualizado, es necesario <span v-mark.circle.orange="2">  VOLVER A GRABAR  </span> partes de los vídeos cada vez que algo cambia

</div>

---

# La teoría

<p v-click>
La industria de las TI resolvió (convirtiéndose en tendencia dominante) un problema similar hace unos 10 años.
</p>

<p v-click>
Expresar todo "como código", de forma que el curso en sí pueda actualizarse y regenerarse automáticamente cuando sea necesario
</p>

<div class="grid gap-3 mt-4 text-sm" style="grid-template-columns: repeat(3, 1fr) 1.5fr 1fr">
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">Diapositivas</div>
    <div>El texto, las transiciones y los efectos de las diapositivas</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/20">
    <div class="font-mono text-xs opacity-60 mb-1">Sesiones de terminal</div>
    <div>Comandos de ejemplo</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Sesiones web/navegador</div>
    <div>Interfaces de usuario, sitios web públicos</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Voz/Subtítulos</div>
    <div>Distintos idiomas, subtítulos</div>
  </div>
</div>

<div v-click mt-12>
<tt>TaC, Formación como Código</tt>: exactamente los mismos beneficios que Infraestructura como Código, pero para una formación: sin necesidad de escribir comandos en una terminal, abrir un navegador, ni siquiera hablar
</div>

<div v-click mt-12>
"actualiza las diapositivas 4, 8 y 10 del curso de habilitación de microcloud con la nueva versión 3.3. Recuerda actualizar la salida del terminal en la diapositiva 10 para mostrar la nueva versión"
</div>


---


# VCR, una herramienta para implementar TaC

<p v-click>
La solución: una herramienta capaz de generar un curso completo a partir de texto
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Diapositivas</div>
    <div>Texto, gráficos, transiciones y efectos</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Sesión de terminal</div>
    <div>muestra un vídeo de una sesión de terminal grabada y generada a partir de un script</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">3. Sesión web</div>
    <div>muestra un vídeo de una sesión de navegador grabada y generada a partir de un script</div>
  </div>
   <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">4. Voz/Subtítulos</div>
    <div>¡Tarea sencilla para un LLM especializado!</div>
  </div>
</div>
<div v-click mt-12>
¡Veamos algunos <tt>ejemplos</tt>!
</div>


---


# Una sesión de terminal

Hagamos algunos comandos de terminal al azar


<!-- sli-terminal:start hash=e91d57627b0a format=gif durationMs=23000 -->
![Grabación de terminal](./terminal-cache/basic-terminal-e91d57627b0a.gif)
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

# Una sesión web

Echemos un vistazo a la documentación de LXD

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

# Voz y Narración — El objetivo

<p v-click>
Automatizar la narración para que los cursos puedan volver a narrarse en minutos cuando cambia el contenido — sin regrabar, sin tiempo de estudio.
</p>

<div class="grid grid-cols-2 gap-6 mt-6 text-sm">
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-2">Opción A — TTS local</div>
    <div><strong>F5-TTS</strong> ejecutándose en el dispositivo (estación de trabajo)</div>
    <ul class="mt-2 space-y-1 opacity-80">
      <li>✅ Sin salida de datos, libre para iterar</li>
      <li>✅ Zero-shot: clip de referencia de 12s → tu voz</li>
      <li>⚠️ Instalación complicada (conflictos de versiones torch/transformers)</li>
      <li>⚠️ Ritmo notablemente más lento que la entrega natural</li>
      <li>⚠️ Los clips de referencia cortos o poco variados producen resultados ininteligibles</li>
    </ul>
  </div>
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-2">Opción B — ElevenLabs (nube)</div>
    <div><strong>Clon de voz profesional</strong> vía API</div>
    <ul class="mt-2 space-y-1 opacity-80">
      <li>✅ Entrega natural, pronunciación correcta de productos</li>
      <li>✅ MP3 por diapositiva, basado en API, automatizable</li>
      <li>✅ Voces estándar disponibles de inmediato mientras se entrena el clon</li>
      <li>⚠️ Requiere más de 30 min de audio de entrenamiento</li>
      <li>⚠️ 2–6h de entrenamiento del clon; coste por carácter en la API</li>
    </ul>
  </div>
</div>

---

# Contenido de Habilitación de Partners — Hacia dónde vamos

<p v-click>
Tradujimos un curso existente (diapositivas y vídeo) del español al inglés — y aprendimos lo que realmente se necesita para escalar la formación localizada.
</p>

<div class="grid grid-cols-2 gap-4 mt-6 text-sm">
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-2">Lo que aprendimos</div>
    <ol class="mt-1 space-y-2 list-decimal list-inside opacity-90">
      <li>Traducir diapositivas y narración a escala requiere que el contenido esté <strong>estructurado</strong> — no en presentaciones monolíticas. La traducción ad-hoc no se puede componer ni reutilizar.</li>
      <li>El contenido en Markdown facilita las traducciones de texto generadas por LLM, aunque requiere indicadores adicionales para un ritmo adecuado en las narraciones de audio generadas.</li>
    </ol>
  </div>
  <div v-click class="p-4 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-2">El plan</div>
    <ol class="mt-1 space-y-2 list-decimal list-inside opacity-90">
      <li>Crear <strong>masters de contenido en inglés</strong> — estructurados, versionados, fuente de verdad</li>
      <li><strong>Componentizar</strong> en módulos y unidades reutilizables en múltiples cursos</li>
      <li><strong>Traducir el texto</strong> a las localizaciones de destino (ES, PT-BR y más)</li>
      <li>Generar <strong>narraciones de audio localizadas</strong> por idioma con ElevenLabs</li>
    </ol>
  </div>
</div>

<div v-click mt-8>
El resultado: un cambio de contenido se propaga a todos los idiomas automáticamente — igual que un cambio de código se propaga a través de un pipeline de CI.
</div>

<!-- sli-speech:start hash=bc4b36d48b7c format=mp3 -->
<audio class="sli-speech-track" src="./audio-cache/bc4b36d48b7c.mp3" preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpNaSBwYXJ0ZSBkZWwgcHJveWVjdG8gY29tZW56w7MgY29uIGVsIG9iamV0aXZvIGRlIHRyYWR1Y2lyIHVuYSBwcmVzZW50YWNpw7NuIG1hZXN0cmEgZW4gZXNwYcOxb2w6IHRyYWR1Y2llbmRvIHRhbnRvIGVsIGNvbnRlbmlkbyBkZSBsYXMgZGlhcG9zaXRpdmFzIGFsIGluZ2zDqXMgY29tbyBncmFiYW5kbyB1bmEgbnVldmEgcGlzdGEgZGUgYXVkaW8gZW4gaW5nbMOpcy4gRW4gbHVnYXIgZGUgZ3JhYmFyIGxhIGZvcm1hY2nDs24gY29tcGxldGEsIHF1ZSBkdXJhIHZhcmlvcyBkw61hcywgY29uIG1pIHByb3BpYSB2b3osIGNvbWVuY8OpIGEgaW52ZXN0aWdhciBjw7NtbyBwb2Ryw61hbW9zIHVzYXIgTExNcyBwYXJhIGFtYmFzIHBhcnRlcyBkZWwgcHJvY2Vzby4gRGUgaGVjaG8sIG5pIHNpcXVpZXJhIGVzdG95IGxleWVuZG8gZXN0byBhaG9yYSBtaXNtby4uLgotLT4=
<!-- sli-speech:end -->

---

# Dos formas de usar VCR

<p v-click>
Interactivo y No interactivo
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Modo interactivo</div>
    <div>Modo presentación: útil para webinars y presentaciones "clásicas"</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Modo no interactivo</div>
    <div>Genera un vídeo del curso completo a partir del script, sin ninguna interacción humana</div>
  </div>
</div>

<div v-click mt-12>
 <tt>Ejemplos:</tt>

 Si estás grabando un webinar, puede que quieras usar tu propia voz y ser más interactivo.

 Si necesitas impartir un curso de microcloud a un partner, puedes automatizarlo completamente y generar un vídeo completo sin ninguna interacción
</div>

---

# Cómo está implementado

VCR está actualmente implementado como un conjunto de extensiones al proyecto sli.dev, aprovechando otros proyectos OSS.
Cada módulo de formación es un único archivo Markdown con todos los datos y metadatos.

<div class="implementation-grid">
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/slidev.png'" alt="logo de sli.dev" />
    <h2>sli.dev</h2>
    <p>Crea la presentación como diapositivas Slidev potenciadas por Markdown con esteroides.</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/vhs.png'" alt="logo de VHS" />
    <h2>VHS</h2>
    <p>Renderiza comandos de terminal en medios en caché</p>
  </div>
  <div class="implementation-card">
    <img class="implementation-logo" :src="'/playwright.svg'" alt="logo de Playwright" />
    <h2>Playwright</h2>
    <p>Automatiza navegadores, captura interacciones y almacena en caché los vídeos resultantes.</p>
  </div>
</div>

---

# Qué falta

- ¡Plantillas de Canonical!
- Integración completa de la parte de Voz/subtítulos (que actualmente es un script externo)
- La instalación no es fácil para el usuario
- Refactorización de cierto código ~~cutre~~ generado por LLM

[VCR en Github](https://github.com/canonical/vcr/)

<div v-click mt-12>
¿Es VCR completo? ¿Fácil de usar, robusto, sin errores? <tt>No</tt>.
</div>
<div v-click mt-12>
¿Es VCR ya utilizable hoy? <span v-mark.red="2"> Definitivamente SÍ</span>. Ya estamos produciendo un curso de microcloud y un curso de preventa con esta herramienta.
</div>
<div v-click mt-12>
Y esta presentación, por supuesto
</div>


---
transition: fade-out
---

# Compatibilidad con LLMs

VCR es muy compatible con agentes:

- Sli.dev ya tiene un [servidor MCP](https://slidev-mcp.org/), funciona bastante bien
- El plan es extender el servidor MCP con las nuevas capacidades (Terminal, Sesión web, Voz)
- La mayoría de las diapositivas pueden generarse fácilmente con un LLM

<div v-click mt-12>
"actualiza las diapositivas 4, 8 y 10 del curso de habilitación de microcloud con la nueva versión 3.3. Recuerda actualizar la salida del terminal en la diapositiva 10 para mostrar la nueva versión"

> pnpm run record-video

</div>
---
transition: fade-out
---

# Más información

- La herramienta: [VCR](https://github.com/canonical/vcr/)
- El motor de diapositivas: [Sli.dev](https://github.com/slidevjs/slidev)
- El renderizador de terminal: [VHS](https://github.com/charmbracelet/vhs)
- La automatización web: [Playwright](https://playwright.dev/)
- Todo lo relacionado con vídeo: [FFMpeg](https://www.ffmpeg.org/)
- Generación de voz: [Eleven Labs](https://elevenlabs.io/)

## ¿Preguntas?
---
transition: fade-out
---
# ¡Gracias!
