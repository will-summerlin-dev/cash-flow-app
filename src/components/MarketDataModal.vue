<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { usePropertyStore } from '../stores/property'
import { useZipData } from '../composables/useZipData'
import { percent } from '../utils/format'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const store = usePropertyStore()
const { manifest, loadManifest, lookup } = useZipData()

const zip = ref('')
const result = ref(null)
const status = ref('idle') // idle | invalid | loading | found | none

loadManifest()

const isSample = computed(() => manifest.value?.source === 'sample')
const canApply = computed(() => status.value === 'found' && !!result.value)

// Reset the modal's local state each time it opens, seeded from the saved ZIP.
watch(
  () => props.open,
  (open) => {
    if (open) {
      zip.value = store.inputs.zip || ''
      result.value = null
      status.value = 'idle'
      window.addEventListener('keydown', onKey)
    } else {
      window.removeEventListener('keydown', onKey)
    }
  },
)
onUnmounted(() => window.removeEventListener('keydown', onKey))

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

async function search() {
  const padded = String(zip.value || '').trim()
  if (!/^\d{5}$/.test(padded)) {
    status.value = 'invalid'
    result.value = null
    return
  }
  status.value = 'loading'
  const r = await lookup(padded)
  result.value = r
  status.value = r ? 'found' : 'none'
}

const round1 = (n) => Math.round(n * 10) / 10

function applyAndClose() {
  if (!canApply.value) return
  store.inputs.zip = String(zip.value).trim()
  if (result.value.rentCagr != null) {
    store.inputs.rentGrowthPct = round1(result.value.rentCagr * 100)
  }
  if (result.value.priceCagr != null) {
    store.inputs.appreciationPct = round1(result.value.priceCagr * 100)
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="emit('close')"
        />

        <!-- Dialog -->
        <div
          class="relative w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-800 p-5 shadow-2xl sm:rounded-2xl"
        >
          <div class="mb-1 flex items-start justify-between">
            <h2 class="text-lg font-semibold text-slate-100">Market data</h2>
            <button
              class="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:text-slate-200"
              aria-label="Close"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>
          <p class="mb-4 text-xs text-slate-400">
            Look up how rents and home prices have actually grown in a ZIP code, then
            apply them as your growth assumptions.
          </p>

          <!-- Search row -->
          <div class="flex gap-2">
            <input
              v-model="zip"
              type="text"
              inputmode="numeric"
              maxlength="5"
              placeholder="e.g. 78701"
              class="w-full rounded-lg border border-slate-700 bg-slate-700/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
              @keydown.enter="search"
            />
            <button
              class="shrink-0 rounded-lg border border-sky-500/60 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/25"
              @click="search"
            >
              Search
            </button>
          </div>

          <!-- States -->
          <p v-if="status === 'invalid'" class="mt-3 text-xs text-amber-400">
            Enter a valid 5-digit ZIP code.
          </p>
          <p v-else-if="status === 'loading'" class="mt-3 text-xs text-slate-500">
            Looking up {{ zip }}…
          </p>
          <p v-else-if="status === 'none'" class="mt-3 text-xs text-amber-400">
            No data for {{ zip }}. Try a nearby ZIP, or close and enter assumptions
            manually.
          </p>

          <div v-else-if="status === 'found' && result" class="mt-4 space-y-2">
            <div
              v-if="result.rentCagr != null"
              class="rounded-lg border border-slate-700 bg-slate-700/40 px-3 py-2.5"
            >
              <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">
                Rent growth
              </div>
              <div class="text-xl font-bold text-emerald-400">
                {{ percent(result.rentCagr * 100) }}<span class="text-xs font-normal text-slate-500">/yr</span>
              </div>
              <div class="text-[0.7rem] text-slate-500">
                ~{{ result.rentYears }}-yr trend
              </div>
            </div>

            <div
              v-if="result.priceCagr != null"
              class="rounded-lg border border-slate-700 bg-slate-700/40 px-3 py-2.5"
            >
              <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">
                Appreciation
              </div>
              <div class="text-xl font-bold text-sky-400">
                {{ percent(result.priceCagr * 100) }}<span class="text-xs font-normal text-slate-500">/yr</span>
              </div>
              <div class="text-[0.7rem] text-slate-500">
                ~{{ result.priceYears }}-yr trend
              </div>
            </div>

            <p class="text-[0.7rem] text-slate-500">
              Historical averages, not a forecast. You can fine-tune after applying.
            </p>
          </div>

          <!-- Source badge -->
          <div
            v-if="manifest"
            class="mt-4 border-t border-slate-700/60 pt-2 text-[0.7rem]"
          >
            <span v-if="isSample" class="text-amber-400">
              ⚠ Sample data — run the data pipeline for live figures.
            </span>
            <span v-else class="text-slate-500">
              Data: {{ manifest.source }} · {{ manifest.targetYears }}-yr trend · as of
              {{ manifest.asOf }}
            </span>
          </div>

          <!-- Footer -->
          <div class="mt-5 flex justify-end gap-2">
            <button
              class="rounded-lg border border-slate-700 bg-slate-700/40 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              @click="emit('close')"
            >
              Close
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                canApply
                  ? 'bg-sky-500 text-white hover:bg-sky-400'
                  : 'cursor-not-allowed bg-slate-700 text-slate-500'
              "
              :disabled="!canApply"
              @click="applyAndClose"
            >
              Apply &amp; close
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
