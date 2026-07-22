#!/usr/bin/env node
/**
 * preprocess-narration.js — Convert narration markup to TTS-optimised plain text.
 *
 * Supports engines:
 *   f5         — F5-TTS (character-level model, uses ellipsis for pauses)
 *   elevenlabs — ElevenLabs (uses commas for pauses + alias substitutions)
 *   piper      — Piper TTS (comma pauses; markup stripped before shell invocation)
 *
 * Usage:
 *   node preprocess-narration.js <text>                        # stdin or inline text
 *   node preprocess-narration.js --engine=elevenlabs <text>
 *   node preprocess-narration.js --engine=elevenlabs --model=eleven_multilingual_v2 <text>
 *
 * Exported as a module for use by render-narration-audio.js.
 */

// ---------------------------------------------------------------------------
// ElevenLabs pronunciation substitutions
// Applied as whole-word replacements. Longer/compound terms first.
// ---------------------------------------------------------------------------
export const ELEVENLABS_SUBSTITUTIONS = [
  // Compound Micro* products
  ["MicroCloud",  "MICRO cloud"],
  ["MicroCeph",   "MICRO seff"],
  ["MicroOVN",    "MICRO oh-vin"],
  ["MicroK8s",    "MICRO kates"],
  // cloud-init variants
  ["cloud-init",  "cloud-INIT"],
  ["Cloud-init",  "cloud-INIT"],
  ["Cloud init",  "cloud-INIT"],
  // Acronyms and technical terms
  ["s390x",       "s three-ninety x"],
  ["QEMU",        "kee-moo"],
  ["UEFI",        "you-ee-eff-eye"],
  ["SELinux",     "S-E-Linux"],
  ["SSH",         "S-S-H"],
  ["ssh",         "S-S-H"],
  // Linux filesystem paths — /etc/ etc. → spoken form
  ["/etc/",       "etsee slash "],
  ["/var/",       "vahr slash "],
  ["/usr/",       "user slash "],
  ["/home/",      "home slash "],
  ["/proc/",      "prock slash "],
  ["/sys/",       "sis slash "],
  ["/dev/",       "dev slash "],
  ["/opt/",       "opt slash "],
  ["/tmp/",       "temp slash "],
  ["/run/",       "run slash "],
  ["/bin/",       "bin slash "],
  ["/sbin/",      "ess-bin slash "],
  ["/lib/",       "lib slash "],
  ["/boot/",      "boot slash "],
  ["/root/",      "root slash "],
  ["/srv/",       "serv slash "],
  // systemd / network stack
  ["systemd",     "system-D"],
  ["networkd",    "network-D"],
  ["iptables",    "I-P tables"],
  ["nftables",    "NF tables"],
  // Canonical products
  ["LXD",         "lex-dee"],
  ["MAAS",        "mahz"],
  ["JAAS",        "jazz"],
  ["Ceph",        "seff"],
  ["ceph",        "seff"],
  ["OVN",         "oh-vin"],
  ["Kubeflow",    "kyoob-flow"],
  ["NIC",         "nick"],
  ["NICs",        "nicks"],
];

// ---------------------------------------------------------------------------
// Pause maps
// ---------------------------------------------------------------------------
const PAUSE_MAP_F5 = {
  "[[pause]]":     "…",
  "[[break]]":     "\n\n",
  "[[longpause]]": "\n\n…\n\n",
  "[[dash]]":      " — ",
  "[SLIDE]":       "\n\n",
};

// eleven_multilingual_v2 vocalises ellipsis as a sound — use commas instead
const PAUSE_MAP_MULTILINGUAL = {
  "[[pause]]":     ",",
  "[[break]]":     "\n\n",
  "[[longpause]]": "\n\n",
  "[[dash]]":      " — ",
  "[SLIDE]":       "\n\n",
};

// Piper: commas for short pauses; sentence breaks for longer ones
const PAUSE_MAP_PIPER = {
  "[[pause]]": ", ",
  "[[break]]": ". ",
  "[[longpause]]": ". ",
  "[[dash]]": " — ",
  "[SLIDE]": ". ",
};

// ---------------------------------------------------------------------------
// Main preprocess function
// ---------------------------------------------------------------------------
/**
 * Preprocess narration markup into TTS-ready plain text.
 *
 * @param {string} text        Raw narration script with markup tags
 * @param {object} [opts]
 * @param {string} [opts.engine="f5"]  "f5", "elevenlabs", or "piper"
 * @param {string} [opts.model=""]     ElevenLabs model id (affects pause rendering)
 * @returns {string}
 */
export function preprocess(text, { engine = "f5", model = "" } = {}) {
  // 1. Pause tag substitutions
  const pauseMap = engine === "piper" ? PAUSE_MAP_PIPER
    : model.includes("multilingual") ? PAUSE_MAP_MULTILINGUAL
    : PAUSE_MAP_F5;
  for (const [tag, replacement] of Object.entries(pauseMap)) {
    text = text.split(tag).join(replacement);
  }

  // 2. [[pronounce:phonetic]] — replace the preceding word with phonetic form
  text = text.replace(/(\S+)\s*\[\[pronounce:([^\]]+)\]\]/g, (_, _word, phonetic) => phonetic);

  // 3. [[emph:word]] — add comma-pause around the emphasised phrase
  text = text.replace(/\[\[emph:([^\]]+)\]\]/g, (_, phrase) => `, ${phrase},`);

  // 4. [[speed:...]] markers — strip (documentation hints only)
  text = text.replace(/\[\[speed:(slow|normal)\]\]/g, "");

  // 5. ElevenLabs substitutions
  if (engine === "elevenlabs") {
    text = applySubstitutions(text);
  }

  // 6. Collapse multiple blank lines, trim
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Apply ELEVENLABS_SUBSTITUTIONS as whole-word replacements.
 * @param {string} text
 * @returns {string}
 */
export function applySubstitutions(text) {
  for (const [original, replacement] of ELEVENLABS_SUBSTITUTIONS) {
    // Escape special regex chars in the original term
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Use word boundaries where the term starts/ends on a word char
    const startBound = /^\w/.test(original) ? "\\b" : "";
    const endBound   = /\w$/.test(original) ? "\\b" : "";
    text = text.replace(new RegExp(`${startBound}${escaped}${endBound}`, "g"), replacement);
  }
  return text;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const args = process.argv.slice(2);
  const engine = (args.find(a => a.startsWith("--engine=")) ?? "").replace("--engine=", "") || "f5";
  const model  = (args.find(a => a.startsWith("--model="))  ?? "").replace("--model=",  "");
  const text   = args.filter(a => !a.startsWith("--")).join(" ");

  if (!text) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const input = Buffer.concat(chunks).toString("utf8");
    process.stdout.write(preprocess(input, { engine, model }) + "\n");
  } else {
    process.stdout.write(preprocess(text, { engine, model }) + "\n");
  }
}
