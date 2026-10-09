#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const markdownPath = path.resolve(args.file ?? "slides.md");
const source = await fs.readFile(markdownPath, "utf8");
const prepared = prepareMarkdown(source);

if (!prepared.terminals.length) {
  console.log(`No interactive-terminal blocks found in ${markdownPath}`);
  process.exit(0);
}

validateTerminals(prepared.terminals);
if (args.dryRun) {
  for (const terminal of prepared.terminals) {
    console.log(`${terminal.name}: ${terminal.image} on http://${terminal.host}:${terminal.port}`);
  }
  process.exit(0);
}

requireCommand("lxc");
requireCommand(args.ttydBin);
await fs.writeFile(markdownPath, prepared.markdown);

const created = [];
const children = [];
let stopping = false;
let runningServers = 0;

try {
  for (const terminal of prepared.terminals) {
    const exists = runSync("lxc", ["info", terminal.name], { quiet: true }).status === 0;
    if (!exists) {
      runChecked("lxc", ["launch", terminal.image, terminal.name]);
      created.push(terminal.name);
    } else {
      const status = runSync("lxc", ["list", terminal.name, "--format=csv", "-c", "s"], { quiet: true }).stdout.trim();
      if (status !== "RUNNING") runChecked("lxc", ["start", terminal.name]);
    }

    if (terminal.setup.trim()) {
      runChecked("lxc", ["exec", terminal.name, "--", "/bin/sh", "-lc", terminal.setup]);
    }

    const child = spawn(args.ttydBin, [
      "-W", "-i", terminal.host, "-p", String(terminal.port),
      "-t", "disableReconnect=true",
      "lxc", "exec", terminal.name, "--", terminal.shell,
    ], { stdio: "inherit" });
    child.on("error", error => shutdown(error));
    child.on("exit", code => {
      if (stopping) return;
      runningServers -= 1;
      if (code !== 0) shutdown(new Error(`ttyd for ${terminal.name} exited with ${code}`));
      else if (runningServers === 0) shutdown();
    });
    children.push(child);
    runningServers += 1;
    console.log(`Interactive terminal '${terminal.name}' available at http://${terminal.host}:${terminal.port}`);
  }

  console.log("Press Ctrl+C to stop the interactive terminals.");
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
} catch (error) {
  await shutdown(error);
}

function prepareMarkdown(input) {
  const clean = input.replace(/<!-- vcr-interactive-terminal:start -->[\s\S]*?<!-- vcr-interactive-terminal:source -->\n([\s\S]*?)\n<!-- vcr-interactive-terminal:end -->/g, "$1");
  const terminals = [];
  const fence = /(^|\n)(```|~~~)interactive-terminal([^\n]*)\n([\s\S]*?)\n\2[ \t]*(?=\n|$)/g;
  const markdown = clean.replace(fence, (full, prefix, marker, metadata, setup) => {
    const options = parseMetadata(metadata);
    const index = terminals.length;
    const terminal = {
      name: options.name ?? `vcr-terminal-${index + 1}`,
      image: options.image ?? "ubuntu:24.04",
      host: options.host ?? "127.0.0.1",
      port: parsePort(options.port ?? 7681 + index),
      shell: options.shell ?? "/bin/bash",
      setup,
    };
    terminals.push(terminal);
    const original = `${marker}interactive-terminal${metadata}\n${setup}\n${marker}`;
    const url = `http://${terminal.host}:${terminal.port}`;
    return `${prefix}<!-- vcr-interactive-terminal:start -->\n<iframe class="vcr-interactive-terminal" src="${escapeHtml(url)}" title="Interactive terminal: ${escapeHtml(terminal.name)}" allow="clipboard-read; clipboard-write" style="width: 100%; height: 70vh; border: 0; border-radius: 0.5rem; background: #000"></iframe>\n<!-- vcr-interactive-terminal:source -->\n${original}\n<!-- vcr-interactive-terminal:end -->`;
  });
  return { markdown, terminals };
}

function parseMetadata(input) {
  const result = {};
  const tokens = input.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  for (const token of tokens) {
    const equals = token.indexOf("=");
    if (equals < 1) throw new Error(`Invalid interactive terminal option '${token}'`);
    result[token.slice(0, equals)] = token.slice(equals + 1).replace(/^(["'])|(["'])$/g, "");
  }
  return result;
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid terminal port '${value}'`);
  return port;
}

function validateTerminals(terminals) {
  const names = new Set();
  const addresses = new Set();
  for (const terminal of terminals) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(terminal.name)) throw new Error(`Invalid LXD container name '${terminal.name}'`);
    if (names.has(terminal.name)) throw new Error(`Duplicate interactive terminal name '${terminal.name}'`);
    const address = `${terminal.host}:${terminal.port}`;
    if (addresses.has(address)) throw new Error(`Duplicate interactive terminal address '${address}'`);
    names.add(terminal.name);
    addresses.add(address);
  }
}

function parseArgs(argv) {
  const out = { ttydBin: "ttyd", keepContainers: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") out.file = argv[++i];
    else if (arg.startsWith("--file=")) out.file = arg.slice(7);
    else if (arg === "--ttyd-bin") out.ttydBin = argv[++i];
    else if (arg.startsWith("--ttyd-bin=")) out.ttydBin = arg.slice(11);
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--keep-containers") out.keepContainers = true;
    else if (arg === "--cache-dir") i += 1; // Common CLI option; unused here.
    else if (arg.startsWith("--cache-dir=")) continue;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function requireCommand(command) {
  if (runSync(command, ["--version"], { quiet: true }).error?.code === "ENOENT") {
    throw new Error(`Required command '${command}' was not found on PATH`);
  }
}

function runSync(command, argv, { quiet = false } = {}) {
  return spawnSync(command, argv, { encoding: "utf8", stdio: quiet ? "pipe" : "inherit" });
}

function runChecked(command, argv) {
  const result = runSync(command, argv);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}

async function shutdown(error) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  if (!args.keepContainers) {
    for (const name of created.reverse()) runSync("lxc", ["delete", "--force", name]);
  }
  if (error) {
    console.error(`vcr: ${error.message}`);
    process.exitCode = 1;
  }
  process.exit();
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
