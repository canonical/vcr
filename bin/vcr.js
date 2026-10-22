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
  },
  "render-terminal": {
    script: "render-terminal-tapes.js",
    desc: "Pre-render terminal recordings (VHS tape → GIF)",
    usage: "<module> [--locale en] [--format gif|mp4] [--dry-run]",
    moduleAware: true,
  },
  "render-playwright": {
    script: "render-playwright-videos.js",
    desc: "Pre-render browser recordings (Playwright → WebM)",
    usage: "<module> [--locale en] [--dry-run]",
    moduleAware: true,
  },

  // Build
  "build-slides": {
    script: null,
    exec: "slidev",
    execSub: "build",
    desc: "Build static Slidev SPA for live presenting or web hosting",
    usage: "<module> [--locale en] [--base /subpath]",
    moduleAware: true,
  },
  "export-slides": {
    script: null,
    exec: "slidev",
    execSub: "export",
    desc: "Export slides to PDF/PNG/PPTX/MD",
    usage: "<module> [--locale en] [--format pdf|png|pptx|pptx-editable|md] [--output <path>] [--per-slide] [--dark] [--with-clicks]",
    moduleAware: true,
  },
  "build-scorm": {
    desc: "Build SCORM 1.2 ZIP package for LMS delivery",
    usage: "<module> [--locale en]",
    moduleAware: true,
    nyi: true,
  },

  // Record
  "generate-durations": {
    script: "generate-durations.js",
    desc: "Generate per-slide timing file from audio/terminal/video durations",
    usage: "<module> [--locale en]",
    moduleAware: true,
  },
  "record-animated": {
    script: "record-slidev-animated.js",
    desc: "Record browser video of Slidev deck with timed transitions",
    usage: "<module> [--locale en] [--duration=1500ms]",
    moduleAware: true,
  },
  "record-video": {
    script: "record-video.js",
    desc: "Run record-animated and convert WebM to MP4 via ffmpeg",
    usage: "<module> [--locale en] [--duration=1500ms]",
    moduleAware: true,
  },

  // Dev
  dev: {
    script: null,
    exec: "slidev",
    desc: "Start Slidev development server for a module",
    usage: "<module> [--locale en] [--port 3030]",
    moduleAware: true,
  },
  validate: {
    script: "validate-content.js",
    desc: "Validate course content for correctness",
    usage: "<module> [--locale en]",
    moduleAware: true,
  },

  // Meta
  help: {
    desc: "Show this help",
    builtin: "help",
  },
  version: {
    desc: "Show version information",
    builtin: "version",
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
    Operations: ["dev", "validate"],
    Meta: ["help", "version"],
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
  console.log("Use 'vcr <command> --help' for command-specific options.");
  console.log("\nExamples:");
  console.log("  vcr dev ubuntu");
  console.log("  vcr build-slides ubuntu --locale es");
  console.log("  vcr render-audio ubuntu --locale en");
  console.log("  vcr record-video ubuntu --mux");
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

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return showHelp();
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
      console.error(`Usage: vcr ${command} <module> [--locale <xx>]`);
      process.exit(1);
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
      // Forward to script with resolved paths
      const scriptArgs = [
        ...parsed.rest,
        "--file", mod.index,
        "--cache-dir", path.join(mod.modDir, "audio-cache"),
      ];
      return runScript(path.join(SCRIPTS, cmd.script), scriptArgs, { cwd: mod.repo });
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
