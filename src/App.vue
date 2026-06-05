<script setup>
import { ref, computed } from 'vue'
import { usePropertyStore } from './stores/property'
import InputPanel from './components/InputPanel.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import ProjectionCharts from './components/ProjectionCharts.vue'
import MarketDataModal from './components/MarketDataModal.vue'

const store = usePropertyStore()

const showMarket = ref(false)
const mobileView = ref('inputs') // 'inputs' | 'results' (mobile only)

const currentZip = computed(() => store.inputs.zip)
</script>

<template>
  <div class="min-h-screen pb-24 lg:pb-0">
    <!-- Top toolbar -->
    <header
      class="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/85 backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <div class="min-w-0">
          <h1 class="truncate text-base font-bold text-slate-100 sm:text-lg">
            🏠 Property Cash Flow Calculator
          </h1>
        </div>
        <button
          class="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-sky-300"
          @click="showMarket = true"
        >
          <span>📈</span>
          <span class="hidden sm:inline">Market data</span>
          <span
            v-if="currentZip"
            class="rounded bg-slate-700 px-1.5 py-0.5 text-[0.65rem] text-sky-300"
            >{{ currentZip }}</span
          >
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-5 pt-5">
      <p class="mb-5 hidden text-sm text-slate-400 lg:block">
        Model the cash flow, returns, and long-term equity of a residential rental.
        Everything updates live and saves to your browser.
      </p>

      <div class="gap-5 lg:grid lg:grid-cols-[360px_1fr] lg:items-start">
        <!-- Inputs view -->
        <div :class="[mobileView === 'inputs' ? 'block' : 'hidden', 'lg:block']">
          <InputPanel />
        </div>

        <!-- Results view -->
        <div
          :class="[mobileView === 'results' ? 'block' : 'hidden', 'lg:block']"
          class="space-y-5"
        >
          <MetricsPanel />
          <ProjectionCharts />
        </div>
      </div>
    </main>

    <!-- Mobile bottom tab bar -->
    <nav
      class="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-700 bg-slate-800/95 backdrop-blur lg:hidden"
    >
      <button
        class="flex-1 py-3 text-sm font-medium transition"
        :class="
          mobileView === 'inputs'
            ? 'text-sky-300'
            : 'text-slate-400 hover:text-slate-200'
        "
        @click="mobileView = 'inputs'"
      >
        ✏️ Inputs
      </button>
      <button
        class="flex-1 py-3 text-sm font-medium transition"
        :class="
          mobileView === 'results'
            ? 'text-sky-300'
            : 'text-slate-400 hover:text-slate-200'
        "
        @click="mobileView = 'results'"
      >
        📊 Results
      </button>
    </nav>

    <MarketDataModal :open="showMarket" @close="showMarket = false" />
  </div>
</template>
