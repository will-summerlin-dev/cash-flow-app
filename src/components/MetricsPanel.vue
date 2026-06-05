<script setup>
import { computed } from 'vue'
import { usePropertyStore } from '../stores/property'
import { money, percent, multiple } from '../utils/format'
import InfoTip from './InfoTip.vue'

const store = usePropertyStore()

const cashFlowClass = computed(() =>
  store.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400',
)

// --- Long-term return over the full hold (assumes sale at the end) ---
const lifetimeMetrics = computed(() => [
  {
    label: 'IRR (annualized)',
    value: percent(store.irr),
    cls:
      store.irr == null
        ? 'text-slate-400'
        : store.irr >= 0
          ? 'text-emerald-400'
          : 'text-red-400',
    hint: `over ${store.effective.holdYears} yr, incl. sale`,
    tip: "Internal Rate of Return — the single annualized % that bundles every year's cash flow plus your profit when you sell at the end of the hold. Unlike the Year-1 numbers, it rewards rent growth, loan paydown, and appreciation, so it's the best single number for judging whether one deal beats another. Shows '—' if the deal never turns a profit.",
  },
  {
    label: 'Equity multiple',
    value: multiple(store.equityMultiple),
    cls: store.equityMultiple >= 1 ? 'text-emerald-400' : 'text-red-400',
    hint: `on ${money(store.totalCashInvested)} invested`,
    tip: 'How many times you get your money back over the whole hold. 2.0× means for every $1 you invest you end with $2 total — your dollar back plus a dollar of profit. Counts all cash flow plus the net cash from selling.',
  },
  {
    label: 'Total profit',
    value: money(store.totalProfit),
    cls: store.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
    hint: 'cash flow + sale − invested',
    tip: 'Your total dollar gain over the entire hold: all the cash flow you collect, plus what you walk away with at sale (sale price minus selling costs and loan payoff), minus the cash you originally put in.',
  },
])

// --- Year-1 snapshot ---
const snapshotMetrics = computed(() => [
  {
    label: 'Monthly cash flow',
    value: money(store.monthlyCashFlow, true),
    cls: store.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400',
    hint: `${money(store.annualCashFlow)} / yr`,
    tip: 'The money left in your pocket each month after collecting rent and paying every expense and the mortgage. Green (positive) means the property pays you; red (negative) means it costs you money each month. This uses today’s rent — it does not grow.',
  },
  {
    label: 'Cash-on-cash (Yr 1)',
    value: percent(store.cashOnCash),
    cls: store.cashOnCash >= 0 ? 'text-emerald-400' : 'text-red-400',
    hint: `on ${money(store.totalCashInvested)} invested`,
    tip: "Your FIRST-YEAR cash flow divided by the cash you put in, as a percent. It's a day-one affordability gauge and does not include rent growth or appreciation — for the full-hold picture that does, look at IRR above.",
  },
  {
    label: 'Cap rate',
    value: percent(store.capRate),
    cls: 'text-slate-100',
    hint: `NOI ${money(store.noiAnnual)} / yr`,
    tip: "Capitalization rate: the property's first-year income before the mortgage (its NOI) divided by its price. It ignores how you finance the deal, so it's handy for quickly comparing properties. Higher generally means a better return for the price.",
  },
  {
    label: '1% rule',
    value: percent(store.onePercentRule, 2),
    cls: store.onePercentRule >= 1 ? 'text-emerald-400' : 'text-amber-400',
    hint: 'rent ÷ price',
    tip: 'A quick gut-check: is the monthly rent at least 1% of the purchase price? At or above 1% (green) hints the deal may cash flow; below (amber) is worth a closer look. A rough screening rule, not a guarantee.',
  },
])

// Monthly cash flow waterfall
const breakdown = computed(() => {
  const s = store
  return [
    {
      label: 'Gross rent + income',
      amount: s.grossMonthlyIncome,
      neg: false,
      tip: 'All money collected in a month before any costs — rent plus any other income.',
    },
    {
      label: 'Vacancy loss',
      amount: -(s.grossMonthlyIncome - s.effectiveMonthlyIncome),
      neg: true,
      tip: 'Estimated income lost while the unit sits empty between tenants, based on your vacancy percent.',
    },
    {
      label: 'Operating expenses',
      amount: -s.operatingExpensesMonthly,
      neg: true,
      tip: 'All monthly running costs added together — taxes, insurance, HOA, utilities, maintenance, management, CapEx, and other. Does not include the mortgage.',
    },
    {
      label: 'Mortgage (P&I)',
      amount: -s.monthlyMortgage,
      neg: true,
      tip: 'Your monthly loan payment, covering Principal (paying down what you borrowed) and Interest (the cost of borrowing). Taxes and insurance are counted separately above.',
    },
  ]
})

const financing = computed(() => {
  const s = store
  return [
    {
      label: 'Loan amount',
      value: money(s.loanAmount),
      tip: "The amount you're borrowing — the purchase price minus your down payment.",
    },
    {
      label: 'Down payment',
      value: money(s.downPayment),
      tip: 'The cash you put down upfront, calculated from your down-payment percent.',
    },
    {
      label: 'Closing costs',
      value: money(s.closingCosts),
      tip: 'Total one-time fees to close the purchase, shown in dollars.',
    },
  ]
})

// Projected sale at the end of the hold period
const saleRows = computed(() => {
  const s = store.sale
  if (!s) return []
  return [
    {
      label: 'Sale price',
      amount: s.grossSalePrice,
      neg: false,
      tip: 'Estimated value when you sell, after compounding your appreciation assumption over the hold period.',
    },
    {
      label: 'Selling costs',
      amount: -s.sellingCosts,
      neg: true,
      tip: "Agent commissions and closing costs paid when you sell — set by the 'Selling costs' input.",
    },
    {
      label: 'Loan payoff',
      amount: -s.loanPayoff,
      neg: true,
      tip: 'The remaining mortgage balance you must pay off at closing when you sell.',
    },
  ]
})
</script>

<template>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <h2 class="mb-4 flex items-center gap-1.5 text-base font-semibold text-slate-100">
      <span>Returns</span>
      <InfoTip
        text="The headline numbers that tell you whether this is a good deal. The top row is the full-hold picture (the real buy/no-buy numbers); the second row is a day-one snapshot. Hover any i for a plain-English explanation."
      />
    </h2>

    <!-- Long-term return -->
    <div class="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
      <span>Over the {{ store.effective.holdYears }}-year hold</span>
      <InfoTip
        text="These bundle every year of cash flow plus selling at the end, so they reflect rent growth, loan paydown, and appreciation. This is the part of the screen that rewards a high-growth property."
      />
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div
        v-for="m in lifetimeMetrics"
        :key="m.label"
        class="rounded-lg border border-slate-700 bg-slate-700/40 p-3.5"
      >
        <div class="mb-1.5 flex items-center gap-1 text-[0.7rem] tracking-wide text-slate-400 uppercase">
          <span>{{ m.label }}</span>
          <InfoTip :text="m.tip" />
        </div>
        <div class="text-2xl font-bold" :class="m.cls">{{ m.value }}</div>
        <div class="mt-1 text-[0.7rem] text-slate-500">{{ m.hint }}</div>
      </div>
    </div>

    <!-- Year-1 snapshot -->
    <div class="mt-5 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
      <span>Year-1 snapshot</span>
      <InfoTip
        text="A frozen picture of the first year only. Great for checking the deal doesn't bleed cash on day one, but blind to growth — two properties can look identical here yet differ a lot long term."
      />
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="m in snapshotMetrics"
        :key="m.label"
        class="rounded-lg border border-slate-700 bg-slate-700/40 p-3.5"
      >
        <div class="mb-1.5 flex items-center gap-1 text-[0.7rem] tracking-wide text-slate-400 uppercase">
          <span>{{ m.label }}</span>
          <InfoTip :text="m.tip" />
        </div>
        <div class="text-2xl font-bold" :class="m.cls">{{ m.value }}</div>
        <div class="mt-1 text-[0.7rem] text-slate-500">{{ m.hint }}</div>
      </div>
    </div>

    <!-- Breakdowns -->
    <div class="mt-5 grid gap-5 lg:grid-cols-3">
      <div>
        <h3 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <span>Monthly cash flow</span>
          <InfoTip
            text="How your monthly profit is built up, line by line: start with income, then subtract vacancy, expenses, and the mortgage."
          />
        </h3>
        <div class="space-y-1">
          <div
            v-for="row in breakdown"
            :key="row.label"
            class="flex justify-between border-b border-slate-700/50 py-1 text-sm"
          >
            <span class="flex items-center gap-1 text-slate-400">
              <span>{{ row.label }}</span>
              <InfoTip :text="row.tip" />
            </span>
            <span :class="row.neg ? 'text-red-400' : 'text-slate-200'">
              {{ money(row.amount, true) }}
            </span>
          </div>
          <div class="flex justify-between pt-2 text-sm font-bold">
            <span>Net cash flow</span>
            <span :class="cashFlowClass">{{ money(store.monthlyCashFlow, true) }}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <span>Financing</span>
          <InfoTip
            text="A summary of your loan and the total cash needed to buy the property."
          />
        </h3>
        <div class="space-y-1 text-sm">
          <div
            v-for="row in financing"
            :key="row.label"
            class="flex justify-between border-b border-slate-700/50 py-1"
          >
            <span class="flex items-center gap-1 text-slate-400">
              <span>{{ row.label }}</span>
              <InfoTip :text="row.tip" />
            </span>
            <span class="text-slate-200">{{ row.value }}</span>
          </div>
          <div class="flex justify-between pt-2 font-bold">
            <span class="flex items-center gap-1">
              <span>Total cash invested</span>
              <InfoTip
                text="All the cash you need out of pocket to do the deal — down payment plus closing costs plus rehab. Your cash-on-cash and equity multiple are measured against this number."
              />
            </span>
            <span class="text-slate-100">{{ money(store.totalCashInvested) }}</span>
          </div>
        </div>
      </div>

      <div v-if="store.sale">
        <h3 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <span>Projected sale (Yr {{ store.effective.holdYears }})</span>
          <InfoTip
            text="What happens when you sell at the end of the hold period. Net proceeds feed into the IRR, equity multiple, and total profit above."
          />
        </h3>
        <div class="space-y-1 text-sm">
          <div
            v-for="row in saleRows"
            :key="row.label"
            class="flex justify-between border-b border-slate-700/50 py-1"
          >
            <span class="flex items-center gap-1 text-slate-400">
              <span>{{ row.label }}</span>
              <InfoTip :text="row.tip" />
            </span>
            <span :class="row.neg ? 'text-red-400' : 'text-slate-200'">
              {{ money(row.amount) }}
            </span>
          </div>
          <div class="flex justify-between pt-2 font-bold">
            <span class="flex items-center gap-1">
              <span>Net sale proceeds</span>
              <InfoTip
                text="Cash you walk away with at closing: sale price minus selling costs and the remaining loan balance."
              />
            </span>
            <span class="text-emerald-400">{{ money(store.sale.netProceeds) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
