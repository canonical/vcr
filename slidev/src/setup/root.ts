import { watch } from 'vue'
import { defineRootSetup } from '@slidev/types'
import { useNav } from '@slidev/client'

export default defineRootSetup(() => {
  const { currentSlideNo } = useNav()

  function getTrack(no: number): HTMLAudioElement | null {
    const el = document.querySelector(`[data-slidev-no="${no}"]`)
    return (el?.querySelector('audio.sli-speech-track') as HTMLAudioElement) ?? null
  }

  watch(currentSlideNo, (to, from) => {
    // Stop track on leaving slide
    if (from != null) {
      const leaving = getTrack(from)
      if (leaving) {
        leaving.pause()
        leaving.currentTime = 0
      }
    }
    // Play track on entering slide
    setTimeout(() => {
      const track = getTrack(to)
      if (!track) return
      track.currentTime = 0
      track.play().catch(() => {
        // Autoplay blocked — user hasn't interacted yet
      })
    }, 150)
  })
})
