/**
 * engines/elevenlabs.js — ElevenLabs TTS engine for render-narration-audio
 *
 * Config (env):
 *   ELEVENLABS_API_KEY   required
 *   VCR_VOICE_ID         default HEfF1IJ9HcifVBNWZdCQ
 *   VCR_MODEL            default eleven_multilingual_v2
 *   VCR_DICT_ID          pronunciation dictionary id (optional)
 *   VCR_DICT_VER         pronunciation dictionary version (optional)
 */

import https from "node:https";
import fs    from "node:fs";

export const id = "elevenlabs";

export function check() {
  if (!process.env.ELEVENLABS_API_KEY) {
    return {
      ok: false,
      message:
        "ELEVENLABS_API_KEY is not set.\n" +
        "  → Get a key at https://elevenlabs.io\n" +
        "  → Add it to .env: ELEVENLABS_API_KEY=your-key-here\n" +
        "  → Or use local synthesis: --engine=piper",
    };
  }
  return { ok: true };
}

export function label() {
  const voice = process.env.VCR_VOICE_ID ?? "HEfF1IJ9HcifVBNWZdCQ";
  const model = process.env.VCR_MODEL    ?? "eleven_multilingual_v2";
  return `ElevenLabs (voice=${voice} model=${model})`;
}

/**
 * Synthesise text → MP3 file.
 * @param {string} text     Pre-processed narration text
 * @param {string} outPath  Output .mp3 file path
 */
export async function synthesise(text, outPath) {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.VCR_VOICE_ID ?? "HEfF1IJ9HcifVBNWZdCQ";
  const model   = process.env.VCR_MODEL    ?? "eleven_multilingual_v2";
  const dictId  = process.env.VCR_DICT_ID  ?? "";
  const dictVer = process.env.VCR_DICT_VER ?? "";

  const body = JSON.stringify({
    text,
    model_id: model,
    voice_settings: { stability: 0.55, similarity_boost: 0.80 },
    ...(dictId && {
      pronunciation_dictionary_locators: [
        { pronunciation_dictionary_id: dictId, version_id: dictVer },
      ],
    }),
  });

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const RETRIES = 3;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const done = await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      }, (res) => {
        if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers["retry-after"] ?? "5", 10);
          console.warn(`    rate limited — retrying in ${retryAfter}s`);
          res.resume();
          setTimeout(() => resolve(false), retryAfter * 1000);
          return;
        }
        if (res.statusCode !== 200) {
          const chunks = [];
          res.on("data", c => chunks.push(c));
          res.on("end", () => reject(new Error(`API ${res.statusCode}: ${Buffer.concat(chunks).toString()}`)));
          return;
        }
        const out = fs.createWriteStream(outPath);
        res.pipe(out);
        out.on("finish", () => resolve(true));
        out.on("error", reject);
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });

    if (done && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return;
    if (attempt < RETRIES) await new Promise(r => setTimeout(r, 2000 * attempt));
  }

  throw new Error(`ElevenLabs: failed after ${RETRIES} attempts`);
}
