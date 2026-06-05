<script setup>
import { computed } from 'vue'
import { usePropertyStore } from '../stores/property'
import NumberField from './NumberField.vue'
import InfoTip from './InfoTip.vue'

const store = usePropertyStore()
const i = store.inputs
const advanced = computed(() => store.mode === 'advanced')
</script>

<template>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-base font-semibold text-slate-100">Deal inputs</h2>
      <button
        class="rounded-lg border border-slate-700 bg-slate-700/40 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400"
        @click="store.reset()"
      >
        Reset
      </button>
    </div>

    <!-- Basic / Advanced toggle -->
    <div class="mb-4 flex rounded-lg border border-slate-700 bg-slate-900/40 p-0.5 text-xs">
      <button
        class="flex-1 rounded-md py-1.5 font-medium transition"
        :class="
          !advanced
            ? 'bg-sky-500/20 text-sky-300'
            : 'text-slate-400 hover:text-slate-200'
        "
        @click="store.setMode('basic')"
      >
        Basic
      </button>
      <button
        class="flex-1 rounded-md py-1.5 font-medium transition"
        :class="
          advanced
            ? 'bg-sky-500/20 text-sky-300'
            : 'text-slate-400 hover:text-slate-200'
        "
        @click="store.setMode('advanced')"
      >
        Advanced
      </button>
    </div>

    <!-- The basics (always shown) -->
    <p class="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
      <span>The basics</span>
      <InfoTip
        align="left"
        text="The few numbers you need to get a useful estimate. In Basic mode everything else is assumed for you."
      />
    </p>
    <div class="space-y-3">
      <NumberField
        v-model="i.purchasePrice"
        label="Purchase price"
        prefix="$"
        tooltip="The total price you're paying to buy the property."
      />
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          v-model="i.downPaymentPct"
          label="Down payment"
          suffix="%"
          tooltip="The share of the price you pay upfront in cash; the loan covers the rest. 20% is typical for a rental."
        />
        <NumberField
          v-model="i.interestRate"
          label="Interest rate"
          suffix="%"
          tooltip="The yearly interest your lender charges on the loan. A higher rate means a bigger monthly payment."
        />
      </div>
      <NumberField
        v-model="i.monthlyRent"
        label="Monthly rent"
        prefix="$"
        tooltip="The rent you expect to collect from tenants each month."
      />
    </div>

    <!-- Basic-mode explainer -->
    <p
      v-if="!advanced"
      class="mt-4 rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-xs leading-relaxed text-slate-400"
    >
      Basic mode estimates the rest for you: a 30-year loan, 3% closing costs,
      property tax (~1.1% of price) and insurance (~0.5%), 5% vacancy, plus
      maintenance, management, and CapEx reserves. Switch to
      <button
        class="font-semibold text-sky-400 hover:underline"
        @click="store.setMode('advanced')"
      >
        Advanced
      </button>
      to control every number.
    </p>

    <!-- Advanced-only inputs -->
    <template v-if="advanced">
      <p class="mt-5 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
        <span>Purchase</span>
        <InfoTip align="left" text="The other upfront costs of acquiring the property." />
      </p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.closingCostsPct"
            label="Closing costs"
            suffix="%"
            tooltip="One-time fees to finalize the purchase (lender, title, escrow, taxes), as a percent of price. Usually 2–5%."
          />
          <NumberField
            v-model="i.rehabCost"
            label="Rehab cost"
            prefix="$"
            tooltip="Money spent on repairs or renovations right after buying, before renting it out. Enter 0 if none."
          />
        </div>
      </div>

      <p class="mt-5 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
        <span>Financing</span>
        <InfoTip align="left" text="The rest of your mortgage terms." />
      </p>
      <NumberField
        v-model="i.loanTermYears"
        label="Loan term"
        suffix="yr"
        tooltip="How many years you have to pay off the loan. 30 years is most common and keeps monthly payments lower."
      />

      <p class="mt-5 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
        <span>Income</span>
        <InfoTip align="left" text="Other income and the vacancy allowance." />
      </p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.otherMonthlyIncome"
            label="Other income / mo"
            prefix="$"
            tooltip="Extra monthly income such as laundry, parking, or storage fees. Enter 0 if none."
          />
          <NumberField
            v-model="i.vacancyPct"
            label="Vacancy"
            suffix="%"
            tooltip="The share of the year you expect the unit to sit empty between tenants. 5% is a common estimate."
          />
        </div>
      </div>

      <p class="mt-5 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
        <span>Operating expenses</span>
        <InfoTip
          align="left"
          text="Ongoing costs of running the property. These do NOT include your mortgage payment — that's counted separately."
        />
      </p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.propertyTaxAnnual"
            label="Property tax / yr"
            prefix="$"
            tooltip="The yearly property tax billed by your local government."
          />
          <NumberField
            v-model="i.insuranceAnnual"
            label="Insurance / yr"
            prefix="$"
            tooltip="The yearly cost of landlord / homeowner insurance for the property."
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.hoaMonthly"
            label="HOA / mo"
            prefix="$"
            tooltip="Monthly homeowners-association dues, if the property is in an HOA. Enter 0 if none."
          />
          <NumberField
            v-model="i.utilitiesMonthly"
            label="Utilities / mo"
            prefix="$"
            tooltip="Monthly utilities you (not the tenant) pay, like water, trash, or gas. Enter 0 if the tenant pays all utilities."
          />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <NumberField
            v-model="i.maintenancePct"
            label="Maint."
            suffix="%"
            tooltip="Maintenance: money set aside for routine repairs and upkeep, as a percent of rent. 5–10% is a common rule of thumb."
          />
          <NumberField
            v-model="i.managementPct"
            label="Mgmt"
            suffix="%"
            tooltip="Management: fee for a property manager, as a percent of rent. Typically 8–10%. Enter 0 if you self-manage."
          />
          <NumberField
            v-model="i.capexPct"
            label="CapEx"
            suffix="%"
            tooltip="Capital Expenditures: savings for big-ticket replacements like a roof, HVAC, or water heater, as a percent of rent. ~5% is prudent."
          />
        </div>
        <NumberField
          v-model="i.otherExpenseMonthly"
          label="Other expense / mo"
          prefix="$"
          tooltip="Any other recurring monthly cost not listed above."
        />
      </div>

      <p class="mt-5 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
        <span>Growth, horizon & exit</span>
        <InfoTip
          align="left"
          text="Assumptions about the future: how values, rents, and costs change over time, how long you plan to own, and what it costs to sell."
        />
      </p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.appreciationPct"
            label="Appreciation / yr"
            suffix="%"
            tooltip="How much you expect the property's value to rise each year. Homes have historically averaged around 3% a year, but it varies a lot by location."
          />
          <NumberField
            v-model="i.rentGrowthPct"
            label="Rent growth / yr"
            suffix="%"
            tooltip="How much you expect to raise the rent each year. Often tracks inflation, around 2–3%."
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            v-model="i.expenseGrowthPct"
            label="Expense growth / yr"
            suffix="%"
            tooltip="How much you expect your costs (taxes, insurance, etc.) to rise each year — usually around inflation."
          />
          <NumberField
            v-model="i.holdYears"
            label="Hold period"
            suffix="yr"
            :min="1"
            tooltip="How many years you plan to own before selling. The projection, long-term return metrics, and the sale all assume you sell at the end of this period."
          />
        </div>
        <NumberField
          v-model="i.sellingCostsPct"
          label="Selling costs"
          suffix="%"
          tooltip="What it costs to sell at the end, as a percent of the sale price — agent commissions plus closing costs. Typically 6–8%."
        />
      </div>

      <p class="mt-4 text-xs text-slate-500">
        Maintenance, management, and CapEx are percentages of gross monthly rent.
      </p>
    </template>
  </div>
</template>
