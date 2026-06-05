<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'

defineProps({
  text: { type: String, required: true },
  // `align` is accepted for backwards compatibility but positioning is now
  // computed dynamically against the viewport, so it is ignored.
  align: { type: String, default: 'center' },
})

const open = ref(false)
const triggerEl = ref(null)
const popEl = ref(null)
const pos = ref({ top: 0, left: 0 })

const MARGIN = 12 // keep this much gap from the screen edge

async function updatePosition() {
  await nextTick()
  const trigger = triggerEl.value
  const pop = popEl.value
  if (!trigger || !pop) return

  const r = trigger.getBoundingClientRect()
  const pw = pop.offsetWidth
  const ph = pop.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Center under the icon, then clamp inside the viewport.
  let left = r.left + r.width / 2 - pw / 2
  left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - pw - MARGIN))

  // Prefer below the icon; flip above if it would overflow the bottom.
  let top = r.bottom + 8
  if (top + ph > vh - MARGIN && r.top - ph - 8 >= MARGIN) {
    top = r.top - ph - 8
  }

  pos.value = { top, left }
}

function onReposition() {
  if (open.value) updatePosition()
}

function onOutside(e) {
  if (triggerEl.value?.contains(e.target)) return
  if (popEl.value?.contains(e.target)) return
  hide()
}

function bind() {
  window.addEventListener('scroll', onReposition, true)
  window.addEventListener('resize', onReposition)
  document.addEventListener('pointerdown', onOutside, true)
}

function unbind() {
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
  document.removeEventListener('pointerdown', onOutside, true)
}

function show() {
  if (open.value) return
  open.value = true
  bind()
  updatePosition()
}

function hide() {
  if (!open.value) return
  open.value = false
  unbind()
}

function toggle() {
  open.value ? hide() : show()
}

onBeforeUnmount(unbind)
</script>

<template>
  <span class="inline-flex align-middle" @mouseenter="show" @mouseleave="hide">
    <button
      ref="triggerEl"
      type="button"
      aria-label="What does this mean?"
      class="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-500 text-[0.6rem] leading-none font-bold text-slate-400 transition hover:border-sky-400 hover:text-sky-400 focus:border-sky-400 focus:text-sky-400 focus:outline-none"
      @click.stop="toggle"
      @focus="show"
      @blur="hide"
      @keydown.esc="hide"
    >
      i
    </button>

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <span
          v-if="open"
          ref="popEl"
          role="tooltip"
          class="fixed z-50 block rounded-lg border border-slate-600 bg-slate-900 p-3 text-xs leading-relaxed font-normal tracking-normal text-slate-200 normal-case shadow-xl shadow-black/40"
          :style="{
            top: pos.top + 'px',
            left: pos.left + 'px',
            width: 'min(240px, calc(100vw - 24px))',
          }"
        >
          {{ text }}
        </span>
      </transition>
    </Teleport>
  </span>
</template>
