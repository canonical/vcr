#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Resolve snap root ──────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAP = process.env.SNAP ?? path.resolve(__dirname, "..");
const SCRIPTS = path.join(SNAP, "scripts");

// ── Content repo detection ─────────────────────────────────────────────────
function findRepoRoot(cwd) {
  let dir = path.resolve(cwd);
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "modules")) && existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolveModule({ module, locale = "en", cwd = process.cwd() }) {
  const repo = findRepoRoot(cwd);
  if (!repo) return null;
  const modDir = path.join(repo, "modules", module, locale);
  const index = path.join(modDir, "index.md");
  if (!existsSync(index)) return null;
  return { repo, modDir, index, module, locale };
}

// ── Commands ───────────────────────────────────────────────────────────────
const COMMANDS = {
  // Render
  "render-audio": {
    script: "render-speech-audio.js",
    desc: "Pre-render speech audio for a module",
    usage: "<module> [--locale en] [--model voice.onnx] [--dry-run]",
    moduleAware: true,
    renderSources: true,
    cacheDirName: "audio-cache",
    help: {
      summary: "Render speech blocks in the module's Markdown sources and insert cached audio references.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--model <path>", "Piper voice model (.onnx); can also be set with PIPER_MODEL. Not needed when ElevenLabs is configured."],
        ["--tts-bin <command>", "Piper executable (default: piper)."],
        ["--dry-run", "Report what would change without rendering or writing Markdown."],
        ["--skip-render", "Write placeholder cache entries and Markdown references without invoking TTS."],
      ],
      notes: ["Scans index.md and recursively imported Markdown sources.", "Writes WAV files to modules/<module>/<locale>/audio-cache/ unless ElevenLabs is configured, in which case it writes MP3 files."],
      examples: ["vcr render-audio ubuntu --model ./voices/en_US-lessac-medium.onnx", "vcr render-audio ubuntu --locale es --dry-run"],
    },
  },
  "render-terminal": {
    script: "render-terminal-tapes.js",
    desc: "Pre-render terminal recordings (VHS tape → GIF)",
    usage: "<module> [--locale en] [--format gif|mp4] [--dry-run]",
    moduleAware: true,
    renderSources: true,
    cacheDirName: "terminal-cache",
    help: {
      summary: "Render terminal/tape blocks with VHS and update the source Markdown with generated media references.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--format <gif|mp4>", "Default format for blocks without their own format= setting (default: gif)."],
        ["--vhs-bin <command>", "VHS executable (default: vhs)."],
        ["--dry-run", "Report what would change without recording or writing Markdown."],
        ["--skip-render", "Write placeholder cache entries and Markdown references without invoking VHS."],
      ],
      notes: ["Scans index.md and recursively imported Markdown sources.", "Writes assets to modules/<module>/<locale>/terminal-cache/. Requires VHS; MP4 output also requires ffmpeg."],
      examples: ["vcr render-terminal ubuntu", "vcr render-terminal ubuntu --format mp4 --dry-run"],
    },
  },
  "render-playwright": {
    script: "render-playwright-videos.js",
    desc: "Pre-render browser recordings (Playwright → WebM)",
    usage: "<module> [--locale en] [--dry-run]",
    moduleAware: true,
    renderSources: true,
    cacheDirName: "playwright-cache",
    help: {
      summary: "Execute Playwright blocks and store browser recordings as WebM.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--dry-run", "Report what would change without launching a browser or writing Markdown."],
        ["--skip-render", "Write placeholder cache entries and Markdown references without launching a browser."],
      ],
      notes: ["Scans index.md and recursively imported Markdown sources.", "Writes WebM assets to modules/<module>/<locale>/playwright-cache/. Block options width= and height= set the viewport (default: 1280×720)."],
      examples: ["vcr render-playwright ubuntu", "vcr render-playwright ubuntu --locale en --dry-run"],
    },
  },

  // Build
  "build-slides": {
    script: null,
    exec: "slidev",
    execSub: "build",
    desc: "Build static Slidev SPA for live presenting or web hosting",
    usage: "<module> [--locale en] [--base /subpath]",
    moduleAware: true,
    help: {
      summary: "Build a static Slidev site for a module.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--out <dir>, -o <dir>", "Build output directory (default: dist/ inside the module locale directory)."],
        ["--base <path>", "Public base path when hosting under a URL subpath (for example, /training/)."],
      ],
      notes: ["Other Slidev build options are forwarded to Slidev.", "The command reports the output directory after a successful build."],
      examples: ["vcr build-slides ubuntu", "vcr build-slides ubuntu --base /courses/ubuntu/ --out /tmp/ubuntu-site"],
    },
  },
  "export-slides": {
    script: null,
    exec: "slidev",
    execSub: "export",
    desc: "Export slides to PDF/PNG/PPTX/MD",
    usage: "<module> [--locale en] [--format pdf|png|pptx|pptx-editable|md] [--output <path>] [--per-slide] [--dark] [--with-clicks]",
    moduleAware: true,
    help: {
      summary: "Export a module's slides to a document or slide images using Slidev export.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--format <format>", "pdf (default), png, pptx, pptx-editable, or md."],
        ["--output <path>", "Output file or directory. Defaults to <module>-<locale>.<ext> beside index.md."],
        ["--per-slide", "Export each slide separately."],
        ["--dark", "Use the dark theme for export."],
        ["--with-clicks", "Include click/animation steps in the export."],
      ],
      notes: ["Other Slidev export options are forwarded to Slidev."],
      examples: ["vcr export-slides ubuntu", "vcr export-slides ubuntu --format pptx --with-clicks", "vcr export-slides ubuntu --format pdf --output /tmp/ubuntu.pdf"],
    },
  },
  "build-scorm": {
    desc: "Build SCORM 1.2 ZIP package for LMS delivery",
    usage: "<module> [--locale en]",
    moduleAware: true,
    nyi: true,
    help: {
      summary: "Build a SCORM 1.2 package for an LMS. This command is not implemented yet.",
      options: [["--locale, -l <xx>", "Module locale (default: en)."]],
      notes: ["This command currently exits with an 'not yet implemented' error."],
      examples: ["vcr build-scorm ubuntu"],
    },
  },

  // Record
  "generate-durations": {
    script: "generate-durations.js",
    desc: "Generate per-slide timing file from audio/terminal/video durations",
    usage: "<module> [--locale en]",
    moduleAware: true,
    help: {
      summary: "Generate per-slide timings from recognized media durations in the module Markdown.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--fallback <ms>", "Duration for slides without detected media (default: 1000; must be positive)."],
        ["--padding <ms>", "Extra time added after the longest media on a slide (default: 500; may be zero)."],
        ["--output <path>", "Write timings here (default: durations.txt beside the module entry file)."],
        ["--dry-run", "Print timing lines without writing the output file."],
      ],
      notes: ["Use the generated file with record-video --durations-file <path>."],
      examples: ["vcr generate-durations ubuntu", "vcr generate-durations ubuntu --fallback 1200 --padding 300 --output /tmp/ubuntu-durations.txt", "vcr generate-durations ubuntu --dry-run"],
    },
  },
  "record-video": {
    script: "record-video.js",
    desc: "Record a Slidev deck to WebM or MP4",
    usage: "<module> [--locale en] [--format webm|mp4] [--duration=1500ms]",
    moduleAware: true,
    help: {
      summary: "Record the module's Slidev deck. A temporary local Slidev server is started unless SLIDEV_URL is set.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--format <webm|mp4>", "Output format (default: webm). MP4 is converted using ffmpeg."],
        ["--duration <time>", "Time per slide/click step (default: 1000ms; accepts ms or s, e.g. 1500ms or 1.5s)."],
        ["--step-duration <time>", "Alias for --duration."],
        ["--durations-file <path>", "Per-step durations file; each non-comment line contains a duration in ms or s."],
        ["--timings-file <path>", "Alias for --durations-file."],
      ],
      notes: ["Per-slide timings are generated automatically from the deck when no timing file or uniform --duration is supplied. Missing media uses the fallback duration.", "Default output is videos/slidev-recording.<format>. Set VIDEO_OUT_DIR and VIDEO_OUTPUT_NAME to override it.", "Set SLIDEV_URL to use an already-running Slidev server."],
      examples: ["vcr record-video ubuntu", "vcr record-video ubuntu --format mp4 --durations-file durations.txt", "vcr record-video ubuntu --duration 1.5s --format webm"],
    },
  },

  // Dev
  dev: {
    script: null,
    exec: "slidev",
    desc: "Start Slidev development server for a module",
    usage: "<module> [--locale en] [--port 3030]",
    moduleAware: true,
    help: {
      summary: "Start the Slidev development server for a module and stream its output interactively.",
      options: [
        ["--locale, -l <xx>", "Module locale (default: en)."],
        ["--port <number>", "Server port (Slidev default: 3030)."],
        ["--host <address>", "Bind address (Slidev default: localhost)."],
        ["--open", "Open the deck in a browser when the server starts, if supported."],
      ],
      notes: ["Additional Slidev dev options are forwarded unchanged. Stop the server with Ctrl-C."],
      examples: ["vcr dev ubuntu", "vcr dev ubuntu --locale es --port 3031"],
    },
  },
  validate: {
    script: "validate-content.js",
    desc: "Validate course content for correctness",
    usage: "<module> [--locale en]",
    moduleAware: true,
    help: {
      summary: "Check a module's content for structural and content errors.",
      options: [["--locale, -l <xx>", "Module locale (default: en)."]],
      notes: ["Validation checks depend on the validate-content.js implementation packaged with VCR."],
      examples: ["vcr validate ubuntu", "vcr validate ubuntu --locale es"],
    },
  },

  // Meta
  help: {
    desc: "Show this help",
    builtin: "help",
    usage: "[<command>]",
    help: {
      summary: "Show the command list, or detailed help for a named command.",
      options: [],
      notes: ["Use vcr help <command> or vcr <command> --help for command-specific details."],
      examples: ["vcr help", "vcr help render-audio"],
    },
  },
  version: {
    desc: "Show version information",
    builtin: "version",
    usage: "",
    help: {
      summary: "Print the installed VCR version.",
      options: [],
      notes: [],
      examples: ["vcr version", "vcr --version"],
    },
  },
};

// ── CLI argument parsing ───────────────────────────────────────────────────
function parseModuleArgs(args) {
  // First positional arg is the module name
  const module = args[0] && !args[0].startsWith("-") ? args[0] : null;
  const rest = module ? args.slice(1) : args;

  // Parse --locale flag
  let locale = "en";
  const filtered = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--locale" || rest[i] === "-l") {
      locale = rest[++i] ?? "en";
    } else if (rest[i].startsWith("--locale=")) {
      locale = rest[i].split("=")[1];
    } else {
      filtered.push(rest[i]);
    }
  }

  return { module, locale, rest: filtered };
}

async function collectSlideMarkdownFiles(entry) {
  const visited = new Set();
  const queue = [path.resolve(entry)];
  const markdownFiles = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    markdownFiles.push(current);

    const markdown = readFileSync(current, "utf8");
    const frontmatter = /^---\s*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/gm;
    for (const block of markdown.matchAll(frontmatter)) {
      for (const line of block[1].split(/\r?\n/)) {
        const source = line.match(/^\s*src\s*:\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$/);
        if (!source) continue;
        const sourcePath = path.resolve(path.dirname(current), source[1]);
        if (!/\.md$/i.test(sourcePath) || visited.has(sourcePath)) continue;
        if (!existsSync(sourcePath)) {
          throw new Error(`Slide source referenced by ${current} does not exist: ${sourcePath}`);
        }
        queue.push(sourcePath);
      }
    }
  }

  return markdownFiles;
}

// ── Environment setup ──────────────────────────────────────────────────────
function setupEnvironment() {
  const snapBin = path.join(SNAP, "bin");
  const snapUsrBin = path.join(SNAP, "usr", "bin");
  if (!process.env.PATH.includes(snapBin)) {
    process.env.PATH = [snapBin, snapUsrBin, process.env.PATH]
      .filter(Boolean)
      .join(":");
  }

  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(SNAP, "playwright-browsers");
  }

  const snapModules = path.join(SNAP, "lib", "node_modules");
  if (process.env.NODE_PATH) {
    process.env.NODE_PATH = `${snapModules}:${process.env.NODE_PATH}`;
  } else {
    process.env.NODE_PATH = snapModules;
  }
}

// ── Help ───────────────────────────────────────────────────────────────────
function showHelp() {
  const groups = {
    Render: [],
    Build: [],
    Record: [],
    Operations: [],
    Meta: [],
  };

  const groupMap = {
    "export-slides": "Build",
    dev: "Operations", validate: "Operations",
    help: "Meta", version: "Meta",
  };

  for (const [name, cmd] of Object.entries(COMMANDS)) {
    if (groupMap[name]) {
      groups[groupMap[name]].push([name, cmd]);
    } else if (name.startsWith("render")) {
      groups["Render"].push([name, cmd]);
    } else if (name.startsWith("build")) {
      groups["Build"].push([name, cmd]);
    } else if (name.startsWith("record") || name.startsWith("generate")) {
      groups["Record"].push([name, cmd]);
    } else {
      groups["Operations"].push([name, cmd]);
    }
  }

  console.log("Usage: vcr <command> <module> [--locale <xx>] [options]\n");
  console.log("Training as Code — build courses from markdown slides.\n");

  for (const group of ["Render", "Build", "Record", "Operations", "Meta"]) {
    const entries = groups[group];
    if (!entries?.length) continue;
    console.log(`  ${group}`);
    for (const [name, cmd] of entries) {
      const pad = name.length < 22 ? " ".repeat(22 - name.length) : "  ";
      console.log(`    ${name}${pad}${cmd.desc}`);
    }
    console.log("");
  }

  console.log("Options:");
  console.log("  --locale, -l <xx>   Locale code (default: en)");
  console.log("  --help              Show this help");
  console.log("  --version           Show version\n");
  console.log("Use 'vcr <command> --help' or 'vcr help <command>' for detailed command help.");
  console.log("\nExamples:");
  console.log("  vcr dev ubuntu");
  console.log("  vcr build-slides ubuntu --locale es");
  console.log("  vcr render-audio ubuntu --locale en");
  console.log("  vcr record-video ubuntu --format mp4");
}

function showCommandHelp(name, cmd) {
  if (!cmd.help) {
    console.error(`vcr: no detailed help is available for '${name}'.`);
    console.error("Run 'vcr --help' to see available commands.");
    process.exitCode = 1;
    return;
  }

  const details = cmd.help;
  console.log(`Usage: vcr ${name} ${cmd.usage ?? ""}`.trimEnd());
  console.log(`\n${details.summary}`);
  if (details.options?.length) {
    console.log("\nOptions:");
    const width = Math.max(...details.options.map(([option]) => option.length));
    for (const [option, description] of details.options) {
      console.log(`  ${option.padEnd(width + 2)}${description}`);
    }
  }
  if (details.notes?.length) {
    console.log("\nNotes:");
    for (const note of details.notes) console.log(`  - ${note}`);
  }
  if (details.examples?.length) {
    console.log("\nExamples:");
    for (const example of details.examples) console.log(`  ${example}`);
  }
  console.log("\nUse 'vcr --help' to see all commands.");
}

function showVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "slidev", "src", "package.json"), "utf8"));
    console.log(`vcr ${pkg.version ?? "0.1.0"}`);
  } catch {
    console.log("vcr 0.1.0");
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return showHelp();
  }
  if (args[0] === "help") {
    if (!args[1] || args[1] === "--help" || args[1] === "-h") return showHelp();
    const target = args[1];
    const targetCommand = COMMANDS[target] ?? COMMANDS[target.replace(":", "-")];
    if (!targetCommand) {
      console.error(`vcr help: unknown command '${target}'.`);
      console.error("Run 'vcr --help' to see available commands.");
      process.exitCode = 1;
      return;
    }
    return showCommandHelp(target.replace(":", "-"), targetCommand);
  }
  if (args[0] === "--version" || args[0] === "-v") {
    return showVersion();
  }

  const command = args[0];
  const rest = args.slice(1);
  const cmd = COMMANDS[command] ?? COMMANDS[command.replace(":", "-")];

  if (!cmd) {
    console.error(`vcr: unknown command '${command}'`);
    console.error("Run 'vcr --help' to see available commands.");
    process.exit(1);
  }

  if (rest.includes("--help") || rest.includes("-h")) return showCommandHelp(command.replace(":", "-"), cmd);
  if (cmd.builtin === "help") return showHelp();
  if (cmd.builtin === "version") return showVersion();
  if (cmd.nyi) {
    console.error(`vcr: '${command}' is not yet implemented.`);
    process.exit(1);
  }

  setupEnvironment();

  // Module-aware commands: resolve module name to paths
  if (cmd.moduleAware) {
    const parsed = parseModuleArgs(rest);

    if (!parsed.module) {
      console.error(`vcr ${command}: module name is required.`);
      console.error("");
      showCommandHelp(command.replace(":", "-"), cmd);
      process.exitCode = 1;
      return;
    }

    const mod = resolveModule({ module: parsed.module, locale: parsed.locale });
    if (!mod) {
      console.error(`vcr ${command}: module '${parsed.module}/${parsed.locale}' not found.`);
      console.error("Are you in a content repo with modules/ directory?");
      process.exit(1);
    }

    process.stderr.write(`Module: ${mod.module}/${mod.locale}  (${mod.index})\n`);

    if (cmd.exec) {
      // Commands that exec a binary (slidev)
      // dev -> `slidev <index>` (dev server)
      // build-slides -> `slidev build <index> --out dist`
      let execArgs;
      let outPath = null; // absolute path to produced output (file or dir)
      if (cmd.execSub === "build") {
        // Respect user --out if given, else default to dist/
        let outDir = "dist";
        for (let i = 0; i < parsed.rest.length; i++) {
          if (parsed.rest[i] === "--out" || parsed.rest[i] === "-o") outDir = parsed.rest[i + 1] ?? outDir;
          else if (parsed.rest[i].startsWith("--out=")) outDir = parsed.rest[i].split("=")[1];
        }
        const hasOut = parsed.rest.some((a) => a === "--out" || a === "-o" || a.startsWith("--out="));
        execArgs = hasOut
          ? ["build", mod.index, ...parsed.rest]
          : ["build", mod.index, "--out", "dist", ...parsed.rest];
        outPath = path.resolve(mod.modDir, outDir);
      } else if (cmd.execSub === "export") {
        // Default output next to the module; user can override with --output
        let userOut = null;
        for (let i = 0; i < parsed.rest.length; i++) {
          if (parsed.rest[i] === "--output") userOut = parsed.rest[i + 1] ?? userOut;
          else if (parsed.rest[i].startsWith("--output=")) userOut = parsed.rest[i].split("=")[1];
        }
        let fmt = "pdf";
        for (let i = 0; i < parsed.rest.length; i++) {
          if (parsed.rest[i] === "--format") fmt = parsed.rest[i + 1] ?? fmt;
          else if (parsed.rest[i].startsWith("--format=")) fmt = parsed.rest[i].split("=")[1];
        }
        const extMap = { pdf: "pdf", png: "png", pptx: "pptx", "pptx-editable": "pptx", md: "md" };
        const ext = extMap[fmt] ?? "pdf";
        if (userOut) {
          outPath = path.resolve(mod.modDir, userOut);
          execArgs = ["export", mod.index, ...parsed.rest];
        } else {
          outPath = path.join(mod.modDir, `${mod.module}-${mod.locale}.${ext}`);
          execArgs = ["export", mod.index, "--output", outPath, ...parsed.rest];
        }
      } else if (cmd.execSub) {
        execArgs = [cmd.execSub, mod.index, ...parsed.rest];
      } else {
        execArgs = [mod.index, ...parsed.rest];
      }

      // Long-running interactive commands (dev server) stream directly.
      if (command === "dev") {
        return runDevServer(cmd.exec, execArgs, { cwd: mod.modDir });
      }

      // Everything else: quiet spinner, logs only on error, then report output path.
      const label = `${command} ${mod.module}/${mod.locale}`;
      return runCommandQuiet(cmd.exec, execArgs, { cwd: mod.modDir, label }).then(() => {
        if (outPath) {
          const rel = path.relative(mod.repo, outPath) || path.basename(outPath);
          process.stderr.write(`Output: ${rel}\n`);
          process.stderr.write(`        (${outPath})\n`);
        }
      });
    }

    if (cmd.script) {
      // Render each markdown source imported by the Slidev entry, not only
      // index.md. Slidev source decks commonly keep slide content in files
      // referenced with `src:` frontmatter entries.
      const markdownFiles = cmd.renderSources
        ? await collectSlideMarkdownFiles(mod.index)
        : [mod.index];
      const cacheDir = path.join(mod.modDir, cmd.cacheDirName ?? "audio-cache");
      for (const markdownFile of markdownFiles) {
        const scriptArgs = [
          ...parsed.rest,
          "--file", markdownFile,
          "--cache-dir", cacheDir,
        ];
        await runScript(path.join(SCRIPTS, cmd.script), scriptArgs, { cwd: mod.repo });
      }
      return;
    }

    console.error(`vcr: '${command}' has no executable configured.`);
    process.exit(1);
  }

  // Fallback: generic --file mode for non-module workflows
  if (cmd.exec) {
    return runCommand(cmd.exec, rest);
  }
  if (cmd.script) {
    return runScript(path.join(SCRIPTS, cmd.script), rest);
  }

  console.error(`vcr: '${command}' has no executable configured.`);
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function runScript(scriptPath, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: process.env,
      cwd: opts.cwd ?? process.cwd(),
    });
    proc.on("error", reject);
    proc.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`script exited with ${signal ?? code}`));
    });
  });
}

// Dev server (slidev): long-running + interactive. Minimal passthrough —
// strip slidev's startup banner noise/branding, keep the essential URLs and
// shortcuts, and pass everything else through verbatim.
function runDevServer(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
      cwd: opts.cwd ?? process.cwd(),
    });

    let startupDone = false;
    const buffers = new Map([[process.stdout, ""], [process.stderr, ""]]);

    // Lines to drop from Slidev's startup banner (branding + extra URLs).
    const dropPatterns = [
      /^\s*[\u25cf\u25a0\u25b2]+\s*$/,  // logo glyphs
      /^\s*Slidev\s+v\S+/i,             // version line
      /^\s*theme\s+/i,
      /^\s*css engine\s+/i,
      /^\s*entry\s+/i,
      /^\s*slides overview\s+>/i,
      /^\s*export slides\s+>/i,
      /^\s*mcp server\s+>/i,
      /^\s*remote control\s+>/i,
    ];
    // Last banner line we keep. Slidev prints a new banner after restart.
    const startupEnd = /^\s*shortcuts\s+>/i;
    const restartNotice = /^\s*restarting(?:\s|\.|$)/i;

    // Strip ANSI color/style escapes before pattern-matching.
    const stripAnsi = (str) =>
      str.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");

    const handleLine = (line, stream) => {
      const plain = stripAnsi(line);
      if (startupDone && restartNotice.test(plain)) {
        stream.write(line + "\n");
        startupDone = false;
        return;
      }
      // Recover if Slidev starts a new banner without a restart message.
      if (startupDone && /^\s*Slidev\s+v\S+/i.test(plain))
        startupDone = false;
      if (startupEnd.test(plain)) {
        stream.write(line + "\n"); // keep original (colored) line
        startupDone = true;
        return;
      }
      if (dropPatterns.some((re) => re.test(plain))) return;
      stream.write(line + "\n");
    };

    const handle = (chunk, stream) => {
      const lines = (buffers.get(stream) + chunk.toString()).split("\n");
      buffers.set(stream, lines.pop() ?? ""); // keep incomplete trailing line buffered
      for (const line of lines) handleLine(line, stream);
    };

    proc.stdout.on("data", (c) => handle(c, process.stdout));
    proc.stderr.on("data", (c) => handle(c, process.stderr));

    proc.on("error", reject);
    proc.on("exit", (code, signal) => {
      for (const [stream, buf] of buffers) {
        if (buf) stream.write(buf);
      }
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${signal ?? code}`));
    });
  });
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: "inherit",
      env: process.env,
      cwd: opts.cwd ?? process.cwd(),
    });
    proc.on("error", reject);
    proc.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${signal ?? code}`));
    });
  });
}

// Run a command with a spinner/progress indicator instead of streaming its
// logs. Captures stdout+stderr and only prints them if the command fails.
function runCommandQuiet(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const label = opts.label ?? cmd;
    const isTTY = process.stderr.isTTY;
    const frames = ["\u280b","\u2819","\u2839","\u2838","\u283c","\u2834","\u2826","\u2827","\u2807","\u280f"];
    const start = Date.now();
    let i = 0;
    let buf = "";
    const onData = (d) => { buf += d.toString(); };

    const proc = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      cwd: opts.cwd ?? process.cwd(),
    });
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);

    let timer = null;
    const render = () => {
      const secs = Math.round((Date.now() - start) / 1000);
      process.stderr.write(`\r${frames[i = (i + 1) % frames.length]} ${label} (${secs}s)   `);
    };
    if (isTTY) {
      process.stderr.write(`\u280b ${label} (0s)   `);
      timer = setInterval(render, 100);
    } else {
      process.stderr.write(`${label}... `);
    }

    const clearLine = () => {
      if (timer) clearInterval(timer);
      if (isTTY) process.stderr.write("\r\u001b[2K");
    };

    proc.on("error", (err) => { clearLine(); if (buf.trim()) process.stderr.write(buf); reject(err); });
    proc.on("exit", (code, signal) => {
      clearLine();
      const secs = Math.round((Date.now() - start) / 1000);
      if (code === 0) {
        process.stderr.write(`\u2713 ${label} (${secs}s)\n`);
        resolve();
      } else {
        console.error(`\u2717 ${label} failed (exit ${signal ?? code})\n`);
        if (buf.trim()) process.stderr.write(buf.endsWith("\n") ? buf : buf + "\n");
        reject(new Error(`${cmd} exited with ${signal ?? code}`));
      }
    });
  });
}

main().catch((err) => {
  console.error(`vcr: ${err.message}`);
  process.exit(1);
});
