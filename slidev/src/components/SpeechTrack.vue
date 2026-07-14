<!--
  SpeechTrack.vue
  Global component (mounted via global-top.vue on every slide) that watches
  Slidev's currentSlideNo and plays/stops <audio class="sli-speech-track">
  elements in the active slide.

  Uses useNav() to watch navigation — this works correctly from global-top.vue
  because it doesn't rely on per-slide context.
-->
<script setup>
import { watch } from 'vue'
import { useNav } from '@slidev/client'

const { currentSlideNo } = useNav()

function getTrack(slideNo) {
  // Slidev renders slides as elements with data-slidev-no attribute
  const el = document.querySelector(`[data-slidev-no="${slideNo}"]`)
  return el?.querySelector('audio.sli-speech-track') ?? null
}

function stopAll() {
  document.querySelectorAll('audio.sli-speech-track').forEach(el => {
    el.pause()
    el.currentTime = 0
  })
}

watch(currentSlideNo, (to, from) => {
  // Stop any track on the slide we're leaving
  if (from != null) {
    const leaving = getTrack(from)
    if (leaving) {
      leaving.pause()
      leaving.currentTime = 0
    }
  }

  // Play the track on the slide we're entering
  setTimeout(() => {
    const track = getTrack(to)
    if (!track) return
    track.currentTime = 0
    track.play().catch(() => {
      // Autoplay blocked (first interaction not yet received) — silently ignore
    })
  }, 120)
}, { immediate: true })
</script>

<template><!-- renderless --></template>
