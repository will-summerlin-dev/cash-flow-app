<script setup>
import InfoTip from './InfoTip.vue'

defineProps({
  label: { type: String, required: true },
  tooltip: { type: String, default: '' },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  step: { type: [Number, String], default: 'any' },
  min: { type: [Number, String], default: undefined },
})

const model = defineModel({ type: Number })
</script>

<template>
  <div>
    <label class="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
      <span>{{ label }}</span>
      <InfoTip v-if="tooltip" :text="tooltip" align="left" />
    </label>
    <div class="relative flex items-center">
      <span
        v-if="prefix"
        class="pointer-events-none absolute left-2.5 text-sm text-slate-400"
        >{{ prefix }}</span
      >
      <input
        v-model.number="model"
        type="number"
        :step="step"
        :min="min"
        class="w-full rounded-lg border border-slate-700 bg-slate-700/40 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        :class="[prefix ? 'pl-6' : 'pl-2.5', suffix ? 'pr-8' : 'pr-2.5']"
      />
      <span
        v-if="suffix"
        class="pointer-events-none absolute right-2.5 text-sm text-slate-400"
        >{{ suffix }}</span
      >
    </div>
  </div>
</template>
