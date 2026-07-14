// setup/main.ts — runs once when Slidev initialises
// Registers the global speech track player as a single Vue app-level component.
import { defineAppSetup } from '@slidev/types'
import { watch } from 'vue'
import { useNav } from '@slidev/client'

export default defineAppSetup(({ app, router }) => {
  // Mount once at the app level — not inside each slide instance.
  router.afterEach(() => {
    // no-op: navigation handled by the watcher below
  })

  // We can't call useNav() here (outside a component setup context),
  // so we attach a global mixin that runs once after the app mounts.
  app.mixin({
    mounted() {
      if (this.$el?.tagName === undefined) return
      // Only run once on the root app element
      if (this.$el !== document.getElementById('app')) return

      const { currentSlideNo } = useNav()

      function getTrack(no) {
        const el = document.querySelector(`[data-slidev-no="${no}"]`)
        return el?.querySelector('audio.sli-speech-track') ?? null
      }

      watch(currentSlideNo, (to, from) => {
        if (from != null) {
          const leaving = getTrack(from)
          if (leaving) { leaving.pause(); leaving.currentTime = 0 }
        }
        setTimeout(() => {
          const track = getTrack(to)
          if (!track) return
          track.currentTime = 0
          track.play().catch(() => {})
        }, 150)
      })
    }
  })
})
