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
    desc: "Build static Slidev SPA for live presenting or web hosting",
    usage: "<module> [--locale en] [--base /subpath]",
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

    console.log(`Module: ${mod.module}/${mod.locale}  (${mod.index})`);

    if (cmd.exec) {
      // Commands that exec a binary (slidev)
      const execArgs = cmd.exec === "slidev" && command === "dev"
        ? [mod.index]
        : [mod.index, ...parsed.rest];
      return runCommand(cmd.exec, execArgs, { cwd: mod.modDir });
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

main().catch((err) => {
  console.error(`vcr: ${err.message}`);
  process.exit(1);
});
