/**
 * engines/chatterbox.js — Chatterbox TTS engine stub
 *
 * Chatterbox is an open-source voice-cloning TTS by ResembleAI.
 * https://github.com/resemble-ai/chatterbox
 *
 * Status: NOT YET IMPLEMENTED
 * Tracked: https://github.com/canonical/vcr/issues/TODO
 *
 * To implement:
 *   pip install chatterbox-tts
 *   python -c "from chatterbox.tts import ChatterboxTTS; ..."
 *   Config: VCR_CHATTERBOX_VOICE (path to reference audio for voice cloning)
 */

export const id = "chatterbox";

export function check() {
  return {
    ok: false,
    message:
      "Chatterbox engine is not yet implemented.\n" +
      "  → Use --engine=elevenlabs (cloud, requires API key)\n" +
      "  → Use --engine=piper (local, offline, no GPU needed)",
  };
}

export function label() {
  return "Chatterbox (not implemented)";
}

export async function synthesise(_text, _outPath) {
  throw new Error("Chatterbox engine is not yet implemented.");
}
