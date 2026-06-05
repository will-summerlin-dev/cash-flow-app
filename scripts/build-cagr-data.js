#!/usr/bin/env node
/**
 * Build per-ZIP CAGR (compound annual growth rate) lookup data from Zillow
 * Research CSVs, for use as in-app market hints.
 *
 *   Rent growth      ← ZORI (Zillow Observed Rent Index), ZIP level
 *   Price appreciation ← ZHVI (Zillow Home Value Index), ZIP level
 *
 * Output: sharded JSON under public/data/cagr/, keyed by the first 3 digits of
 * the ZIP so the frontend only fetches the slice it needs. Plus a manifest.json.
 *
 * Usage:
 *   node scripts/build-cagr-data.js                 # download from Zillow
 *   node scripts/build-cagr-data.js \
 *     --zori-file ./ZORI.csv --zhvi-file ./ZHVI.csv # use local CSVs
 *   node scripts/build-cagr-data.js --years 10      # 10-yr trailing CAGR
 *
 * NOTE: Zillow occasionally renames these public CSVs. If a download 404s,
 * grab the current ZIP-level ZORI/ZHVI URLs from
 *   https://www.zillow.com/research/data/
 * and pass them with --zori-url / --zhvi-url (or download and use --*-file).
 *
 * Licensing: serve the *derived* CAGR values with a "Data: Zillow" credit.
 * Do not redistribute the raw monthly CSVs.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULTS = {
  zoriUrl:
    'https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv',
  zhviUrl:
    'https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
  years: 5,
  outDir: path.resolve(__dirname, '../public/data/cagr'),
}

function parseArgs(argv) {
  const opts = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) opts[a.slice(2)] = argv[++i]
  }
  return opts
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

// Minimal CSV line parser supporting quoted fields with embedded commas/quotes.
function parseCsvLine(line) {
  const out = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') {
      out.push(field)
      field = ''
    } else field += ch
  }
  out.push(field)
  return out
}

// Compound annual growth rate from the value ~`years` ago to the latest value.
function computeCagr(series, years) {
  if (series.length < 2) return null
  const last = series[series.length - 1]
  const targetTime = last.date.getTime() - years * YEAR_MS

  let start = series[0]
  for (const p of series) {
    if (p.date.getTime() <= targetTime) start = p
    else break
  }

  const elapsedYears = (last.date.getTime() - start.date.getTime()) / YEAR_MS
  if (elapsedYears < 1.5 || start.value <= 0) return null // too little history

  const cagr = Math.pow(last.value / start.value, 1 / elapsedYears) - 1
  return { cagr, years: elapsedYears, endDate: last.date }
}

async function ensureCsv(url, file) {
  if (file) return file
  const tmp = path.join(os.tmpdir(), `zillow-${path.basename(url)}`)
  console.log(`Downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`)
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp))
  return tmp
}

async function cagrFromCsv(filePath, years) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  let header = null
  let dateCols = null
  let regionNameIdx = -1
  let regionTypeIdx = -1
  const out = new Map()
  let maxEnd = 0

  for await (const line of rl) {
    if (!line) continue
    const fields = parseCsvLine(line)
    if (!header) {
      header = fields
      regionNameIdx = header.indexOf('RegionName')
      regionTypeIdx = header.indexOf('RegionType')
      dateCols = []
      header.forEach((h, i) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(h)) dateCols.push({ idx: i, date: new Date(h) })
      })
      if (regionNameIdx < 0 || dateCols.length === 0) {
        throw new Error(`Unexpected CSV format in ${filePath}`)
      }
      continue
    }

    if (regionTypeIdx >= 0 && fields[regionTypeIdx] && fields[regionTypeIdx] !== 'zip') {
      continue
    }
    const zipRaw = (fields[regionNameIdx] || '').trim()
    if (!/^\d{1,5}$/.test(zipRaw)) continue
    const zip = zipRaw.padStart(5, '0')

    const series = []
    for (const c of dateCols) {
      const v = parseFloat(fields[c.idx])
      if (Number.isFinite(v) && v > 0) series.push({ date: c.date, value: v })
    }
    const info = computeCagr(series, years)
    if (info) {
      out.set(zip, info)
      maxEnd = Math.max(maxEnd, info.endDate.getTime())
    }
  }
  return { map: out, maxEnd }
}

const round4 = (n) => Math.round(n * 1e4) / 1e4
const round1 = (n) => Math.round(n * 10) / 10
const asOfMonth = (ms) => (ms ? new Date(ms).toISOString().slice(0, 7) : null)

async function main() {
  const opts = { ...DEFAULTS, ...parseArgs(process.argv) }
  const years = Number(opts.years) || DEFAULTS.years
  const outDir = opts['out-dir'] || DEFAULTS.outDir

  const zoriFile = await ensureCsv(opts.zoriUrl, opts['zori-file'])
  const zhviFile = await ensureCsv(opts.zhviUrl, opts['zhvi-file'])

  console.log('Computing rent CAGR (ZORI)…')
  const rent = await cagrFromCsv(zoriFile, years)
  console.log(`  ${rent.map.size} ZIPs`)
  console.log('Computing price CAGR (ZHVI)…')
  const price = await cagrFromCsv(zhviFile, years)
  console.log(`  ${price.map.size} ZIPs`)

  // Merge into per-ZIP records, sharded by 3-digit prefix.
  const shards = new Map()
  const allZips = new Set([...rent.map.keys(), ...price.map.keys()])
  for (const zip of allZips) {
    const rec = {}
    const r = rent.map.get(zip)
    const p = price.map.get(zip)
    if (r) {
      rec.rentCagr = round4(r.cagr)
      rec.rentYears = round1(r.years)
    }
    if (p) {
      rec.priceCagr = round4(p.cagr)
      rec.priceYears = round1(p.years)
    }
    if (Object.keys(rec).length === 0) continue
    const prefix = zip.slice(0, 3)
    if (!shards.has(prefix)) shards.set(prefix, {})
    shards.get(prefix)[zip] = rec
  }

  // Write output (clear old shards first).
  fs.mkdirSync(outDir, { recursive: true })
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.json')) fs.rmSync(path.join(outDir, f))
  }
  for (const [prefix, obj] of shards) {
    fs.writeFileSync(path.join(outDir, `${prefix}.json`), JSON.stringify(obj))
  }

  const manifest = {
    source: 'Zillow ZORI + ZHVI',
    sourceUrl: 'https://www.zillow.com/research/data/',
    targetYears: years,
    asOf: asOfMonth(Math.max(rent.maxEnd, price.maxEnd)),
    generatedAt: new Date().toISOString(),
    zipCount: allZips.size,
    shardPrefixLength: 3,
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(
    `\nWrote ${shards.size} shards for ${allZips.size} ZIPs to ${outDir}`,
  )
  console.log(`Data as of ${manifest.asOf} (trailing ${years}-yr CAGR)`)
}

main().catch((err) => {
  console.error('\nbuild-cagr-data failed:', err.message)
  process.exit(1)
})
