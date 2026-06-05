<script setup>
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'
import { usePropertyStore } from '../stores/property'
import { money } from '../utils/format'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
)

const store = usePropertyStore()

const tabs = [
  { key: 'equity', label: 'Equity & value' },
  { key: 'cashflow', label: 'Cash flow' },
]
const active = ref('equity')

const labels = computed(() => store.projection.map((r) => `Yr ${r.year}`))

const palette = {
  sky: '#38bdf8',
  emerald: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  slate: '#94a3b8',
}

function lineDataset(label, data, color, fill = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: fill ? color + '33' : color,
    fill,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2,
  }
}

const chartData = computed(() => {
  const p = store.projection
  if (active.value === 'equity') {
    return {
      labels: labels.value,
      datasets: [
        lineDataset('Property value', p.map((r) => r.propertyValue), palette.sky),
        lineDataset('Equity', p.map((r) => r.equity), palette.emerald, true),
        lineDataset('Loan balance', p.map((r) => r.loanBalance), palette.slate),
      ],
    }
  }
  return {
    labels: labels.value,
    datasets: [
      lineDataset('Annual cash flow', p.map((r) => r.annualCashFlow), palette.amber),
      lineDataset(
        'Cumulative cash flow',
        p.map((r) => r.cumulativeCashFlow),
        palette.emerald,
        true,
      ),
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 8 } },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
    y: {
      ticks: {
        color: '#94a3b8',
        callback: (v) => money(v),
      },
      grid: { color: 'rgba(148,163,184,0.1)' },
    },
  },
}

// Headline summary at end of hold period
const summary = computed(() => {
  const last = store.projection[store.projection.length - 1]
  if (!last) return null
  return last
})
</script>

<template>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-slate-100">
        {{ store.effective.holdYears }}-year projection
      </h2>
      <div class="flex gap-2">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="rounded-lg border px-3 py-1.5 text-xs"
          :class="
            active === t.key
              ? 'border-sky-400 text-sky-400'
              : 'border-slate-700 bg-slate-700/40 text-slate-300 hover:border-slate-500'
          "
          @click="active = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="relative h-72">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <div v-if="summary" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-slate-700 bg-slate-700/40 p-3">
        <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">
          Value @ yr {{ summary.year }}
        </div>
        <div class="text-lg font-bold text-sky-400">{{ money(summary.propertyValue) }}</div>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-700/40 p-3">
        <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">Equity</div>
        <div class="text-lg font-bold text-emerald-400">{{ money(summary.equity) }}</div>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-700/40 p-3">
        <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">
          Loan balance
        </div>
        <div class="text-lg font-bold text-slate-200">{{ money(summary.loanBalance) }}</div>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-700/40 p-3">
        <div class="text-[0.7rem] tracking-wide text-slate-400 uppercase">
          Cumulative cash flow
        </div>
        <div
          class="text-lg font-bold"
          :class="summary.cumulativeCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'"
        >
          {{ money(summary.cumulativeCashFlow) }}
        </div>
      </div>
    </div>
  </div>
</template>
