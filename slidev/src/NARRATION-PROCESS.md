# Narration Process

How to add narration audio to a Slidev module using the VCR narration pipeline.

## Overview

Narration lives in a separate `narration.md` file, not inside the slide `.md` files.
This keeps slide layout and narration script independent and independently editable.

```
narration.md  →  narration:render  →  audio-cache/*.mp3 + durations.txt
audio-cache/  →  narration:inject  →  <audio> tags injected into slide .md files
```

The `<audio class="sli-speech-track">` tags are picked up by `setup/root.ts` at
runtime — slides auto-play their track when navigated to.

## narration.md format

One `## Slide N: Title` section per slide that has narration:

```markdown
## Slide 1: Introduction

Welcome to the Ubuntu module. In this section we'll cover...

## Slide 2: What is Ubuntu

Ubuntu is a Linux distribution...
```

Slides without a matching section get no audio. Gaps in numbering are fine.

### Markup tags

| Tag | Effect |
|-----|--------|
| `[[pause]]` | Short pause (~500ms) |
| `[[break]]` | Paragraph pause (~1s) |
| `[[longpause]]` | Section break (~2s) |
| `[[dash]]` | Em-dash dramatic pause |
| `[SLIDE]` | Slide transition pause |
| `[[emph:word]]` | Emphasis — adds comma pause before/after |
| `[[pronounce:phonetic]]` | Replace preceding word with phonetic form |

## Rendering audio

```bash
# Render all slides for a module (resume-aware — skips existing cache)
pnpm narration:render -- ubuntu

# Render a specific slide only
pnpm narration:render -- ubuntu --slide=19

# Force re-render even if cached
pnpm narration:render -- ubuntu --force

# Dry run — show what would be synthesised without calling the API
pnpm narration:render -- ubuntu --dry-run

# Render all modules
pnpm narration:render -- --all
```

Outputs:
- `audio-cache/001.mp3`, `002.mp3`, … (per-slide MP3s, gitignored)
- `audio-cache/manifest.json` (slide metadata)
- `audio-cache/durations.txt` (slide durations for video recorder timing)

### Config (env or `.env` in project root)

| Variable | Default | Description |
|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | required | ElevenLabs API key |
| `VCR_VOICE_ID` | `HEfF1IJ9HcifVBNWZdCQ` | Voice ID |
| `VCR_MODEL` | `eleven_multilingual_v2` | Model |
| `VCR_DICT_ID` | — | Pronunciation dictionary ID |
| `VCR_DICT_VER` | — | Pronunciation dictionary version |

## Injecting audio tags into slides

After rendering, inject `<audio>` tags into the slide `.md` files:

```bash
pnpm narration:inject -- ubuntu

# Dry run
pnpm narration:inject -- ubuntu --dry-run

# Remove all audio tags
pnpm narration:inject -- ubuntu --remove
```

This writes `<audio class="sli-speech-track" src="./audio-cache/NNN.mp3">` at the
end of each matching slide's content block. Re-running is safe — existing tags are
replaced, not duplicated.

## Recording a narrated MP4

```bash
# Capture slides + mux narration audio into a final MP4
pnpm record:animated -- --module=ubuntu --mux
```

Requires:
- Slidev server running on the configured port
- `audio-cache/durations.txt` present (produced by `narration:render`)
- `ffmpeg` on PATH

Produces `<module>.mp4` alongside the intermediate WebM.

## Pronunciation substitutions

Common technical terms are pre-substituted for natural ElevenLabs pronunciation.
The substitution table lives in `scripts/preprocess-narration.js`
(`ELEVENLABS_SUBSTITUTIONS`). Add entries there for any terms that ElevenLabs
mispronounces consistently.

Current substitutions include: `MicroCloud` → `MICRO cloud`, `LXD` → `lex-dee`,
`QEMU` → `kee-moo`, `systemd` → `system-D`, `/etc/` → `etsee slash`, and more.
