import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

const STORAGE_KEY = 'cashflow.deal.v1'
const MODE_KEY = 'cashflow.mode.v1'

function loadMode() {
  try {
    const m = localStorage.getItem(MODE_KEY)
    if (m === 'basic' || m === 'advanced') return m
  } catch {
    // ignore
  }
  return 'basic'
}

// Sensible starting point for a typical single-family rental.
function defaultInputs() {
  return {
    // Location (used to look up real market growth data)
    zip: '',

    // Purchase
    purchasePrice: 300000,
    downPaymentPct: 20,
    closingCostsPct: 3,
    rehabCost: 0,

    // Financing
    interestRate: 6.5,
    loanTermYears: 30,

    // Income
    monthlyRent: 2400,
    otherMonthlyIncome: 0,
    vacancyPct: 5,

    // Operating expenses
    propertyTaxAnnual: 3600,
    insuranceAnnual: 1500,
    hoaMonthly: 0,
    maintenancePct: 5, // % of gross rent
    managementPct: 8, // % of gross rent
    capexPct: 5, // % of gross rent
    utilitiesMonthly: 0,
    otherExpenseMonthly: 0,

    // Growth assumptions (annual %)
    appreciationPct: 3,
    rentGrowthPct: 2,
    expenseGrowthPct: 2,

    // Analysis horizon
    holdYears: 30,
    sellingCostsPct: 7, // agent commission + closing costs paid at sale
  }
}

// Internal rate of return via bisection. `cashflows[0]` is the upfront outlay
// (negative); subsequent entries are end-of-year cash flows. Returns a decimal
// rate, or null when no sign change exists (IRR undefined — e.g. never profitable).
function computeIrr(cashflows) {
  const npv = (rate) =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0)

  let lo = -0.9999
  let hi = 10
  let fLo = npv(lo)
  let fHi = npv(hi)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-7) return mid
    if (fLo * fMid < 0) {
      hi = mid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}

function loadInputs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultInputs(), ...JSON.parse(saved) }
  } catch {
    // ignore corrupt storage
  }
  return defaultInputs()
}

export const usePropertyStore = defineStore('property', () => {
  const inputs = reactive(loadInputs())

  // Persist any change to localStorage.
  watch(
    inputs,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        // ignore quota / private-mode errors
      }
    },
    { deep: true },
  )

  function reset() {
    Object.assign(inputs, defaultInputs())
  }

  // --- UI mode: 'basic' shows only the essentials and estimates everything
  // else from price/rent; 'advanced' exposes every field. ---
  const mode = ref(loadMode())
  watch(mode, (m) => {
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // ignore
    }
  })
  function setMode(m) {
    if (m === 'basic' || m === 'advanced') mode.value = m
  }
  function toggleMode() {
    mode.value = mode.value === 'basic' ? 'advanced' : 'basic'
  }

  // The fields a basic-mode user controls directly. Everything else is assumed.
  const BASIC_FIELDS = [
    'zip',
    'purchasePrice',
    'downPaymentPct',
    'interestRate',
    'monthlyRent',
  ]

  // The inputs the calculations actually consume. In advanced mode this is the
  // raw form; in basic mode we keep the basics (plus growth assumptions, which
  // the Market data panel can set) and estimate the operating details from the
  // purchase price so the model stays realistic — e.g. taxes/insurance scale
  // with price instead of being a fixed dollar amount.
  const effectiveInputs = computed(() => {
    if (mode.value === 'advanced') return inputs
    const price = inputs.purchasePrice
    return {
      ...inputs, // basics + appreciation/rentGrowth + zip pass through
      closingCostsPct: 3,
      rehabCost: 0,
      loanTermYears: 30,
      otherMonthlyIncome: 0,
      vacancyPct: 5,
      propertyTaxAnnual: Math.round(price * 0.011), // ~1.1%/yr US average
      insuranceAnnual: Math.round(price * 0.005), // ~0.5%/yr of value
      hoaMonthly: 0,
      utilitiesMonthly: 0,
      maintenancePct: 5,
      managementPct: 8,
      capexPct: 5,
      otherExpenseMonthly: 0,
      expenseGrowthPct: 2,
      holdYears: 30,
      sellingCostsPct: 7,
    }
  })
  const e = effectiveInputs

  // --- Derived financing figures ---
  const loanAmount = computed(
    () => e.value.purchasePrice * (1 - e.value.downPaymentPct / 100),
  )

  const downPayment = computed(
    () => e.value.purchasePrice * (e.value.downPaymentPct / 100),
  )

  const closingCosts = computed(
    () => e.value.purchasePrice * (e.value.closingCostsPct / 100),
  )

  // Total out-of-pocket cash to acquire the property.
  const totalCashInvested = computed(
    () => downPayment.value + closingCosts.value + e.value.rehabCost,
  )

  // Standard fixed-rate amortizing mortgage payment (P&I only).
  const monthlyMortgage = computed(() => {
    const principal = loanAmount.value
    const n = e.value.loanTermYears * 12
    const r = e.value.interestRate / 100 / 12
    if (principal <= 0 || n <= 0) return 0
    if (r === 0) return principal / n
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  })

  // --- Income ---
  const grossMonthlyIncome = computed(
    () => e.value.monthlyRent + e.value.otherMonthlyIncome,
  )

  const vacancyLossMonthly = computed(
    () => grossMonthlyIncome.value * (e.value.vacancyPct / 100),
  )

  const effectiveMonthlyIncome = computed(
    () => grossMonthlyIncome.value - vacancyLossMonthly.value,
  )

  // --- Operating expenses (excludes mortgage; rent-based reserves use gross rent) ---
  const operatingExpensesMonthly = computed(() => {
    const rent = e.value.monthlyRent
    return (
      e.value.propertyTaxAnnual / 12 +
      e.value.insuranceAnnual / 12 +
      e.value.hoaMonthly +
      e.value.utilitiesMonthly +
      e.value.otherExpenseMonthly +
      rent * (e.value.maintenancePct / 100) +
      rent * (e.value.managementPct / 100) +
      rent * (e.value.capexPct / 100)
    )
  })

  // Net Operating Income (annual) — before debt service.
  const noiAnnual = computed(
    () => (effectiveMonthlyIncome.value - operatingExpensesMonthly.value) * 12,
  )

  // --- Cash flow & returns ---
  const monthlyCashFlow = computed(
    () =>
      effectiveMonthlyIncome.value -
      operatingExpensesMonthly.value -
      monthlyMortgage.value,
  )

  const annualCashFlow = computed(() => monthlyCashFlow.value * 12)

  // Cap rate = NOI / price (ignores financing).
  const capRate = computed(() =>
    e.value.purchasePrice > 0 ? (noiAnnual.value / e.value.purchasePrice) * 100 : 0,
  )

  // Cash-on-cash = annual pre-tax cash flow / cash invested.
  const cashOnCash = computed(() =>
    totalCashInvested.value > 0
      ? (annualCashFlow.value / totalCashInvested.value) * 100
      : 0,
  )

  // Gross rent multiplier and 1% rule helper.
  const onePercentRule = computed(() =>
    e.value.purchasePrice > 0
      ? (e.value.monthlyRent / e.value.purchasePrice) * 100
      : 0,
  )

  // --- Long-term projection (year-by-year) ---
  const projection = computed(() => {
    const rows = []
    const monthlyRate = e.value.interestRate / 100 / 12
    let balance = loanAmount.value
    let propertyValue = e.value.purchasePrice
    let cumulativeCashFlow = -totalCashInvested.value

    const rentGrowth = 1 + e.value.rentGrowthPct / 100
    const expenseGrowth = 1 + e.value.expenseGrowthPct / 100
    const appreciation = 1 + e.value.appreciationPct / 100

    for (let year = 1; year <= e.value.holdYears; year++) {
      // Amortize 12 months, capturing principal paid this year.
      let principalPaidThisYear = 0
      let interestPaidThisYear = 0
      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break
        const interest = balance * monthlyRate
        let principal = monthlyMortgage.value - interest
        if (principal > balance) principal = balance
        balance -= principal
        principalPaidThisYear += principal
        interestPaidThisYear += interest
      }

      // Grow income & expenses from year 1 baseline.
      const growthFactorIncome = Math.pow(rentGrowth, year - 1)
      const growthFactorExpense = Math.pow(expenseGrowth, year - 1)

      const yearEffectiveIncome =
        effectiveMonthlyIncome.value * 12 * growthFactorIncome
      const yearOperatingExpenses =
        operatingExpensesMonthly.value * 12 * growthFactorExpense
      const yearDebtService = monthlyMortgage.value * 12
      const yearCashFlow =
        yearEffectiveIncome - yearOperatingExpenses - yearDebtService

      cumulativeCashFlow += yearCashFlow
      propertyValue *= appreciation

      const equity = propertyValue - balance

      rows.push({
        year,
        propertyValue,
        loanBalance: Math.max(balance, 0),
        equity,
        annualCashFlow: yearCashFlow,
        cumulativeCashFlow,
        principalPaid: principalPaidThisYear,
        interestPaid: interestPaidThisYear,
      })
    }
    return rows
  })

  // --- Sale at end of hold period ---
  const sale = computed(() => {
    const last = projection.value[projection.value.length - 1]
    if (!last) return null
    const grossSalePrice = last.propertyValue
    const sellingCosts = grossSalePrice * (e.value.sellingCostsPct / 100)
    const loanPayoff = last.loanBalance
    const netProceeds = grossSalePrice - sellingCosts - loanPayoff
    return { grossSalePrice, sellingCosts, loanPayoff, netProceeds }
  })

  // Cash flow series for IRR / equity multiple: year 0 outlay, then each year's
  // operating cash flow, with net sale proceeds added in the final year.
  const cashFlowSeries = computed(() => {
    const series = [-totalCashInvested.value]
    projection.value.forEach((r) => series.push(r.annualCashFlow))
    if (sale.value && series.length > 1) {
      series[series.length - 1] += sale.value.netProceeds
    }
    return series
  })

  // Total cash returned over the hold (operating cash flow + net sale proceeds).
  const totalCashReturned = computed(() => {
    const operating = projection.value.reduce((sum, r) => sum + r.annualCashFlow, 0)
    return operating + (sale.value ? sale.value.netProceeds : 0)
  })

  const totalProfit = computed(
    () => totalCashReturned.value - totalCashInvested.value,
  )

  // Equity multiple = total cash returned / cash invested (e.g. 2.5x).
  const equityMultiple = computed(() =>
    totalCashInvested.value > 0
      ? totalCashReturned.value / totalCashInvested.value
      : 0,
  )

  // Annualized return over the full hold, including rent growth, loan paydown,
  // and appreciation realized at sale. Null when never profitable.
  const irr = computed(() => {
    const r = computeIrr(cashFlowSeries.value)
    return r == null ? null : r * 100
  })

  return {
    inputs,
    reset,
    // mode
    mode,
    setMode,
    toggleMode,
    effective: effectiveInputs,
    // financing
    loanAmount,
    downPayment,
    closingCosts,
    totalCashInvested,
    monthlyMortgage,
    // income
    grossMonthlyIncome,
    effectiveMonthlyIncome,
    operatingExpensesMonthly,
    // returns
    noiAnnual,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    cashOnCash,
    onePercentRule,
    // projection & long-term return
    projection,
    sale,
    totalCashReturned,
    totalProfit,
    equityMultiple,
    irr,
  }
})
