import { ref } from 'vue'

// Module-level caches so shards/manifest are fetched once across components.
const shardCache = new Map()
let manifestPromise = null

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, '')
}

export function useZipData() {
  const manifest = ref(null)
  const loading = ref(false)

  async function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(`${basePath()}/data/cagr/manifest.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    }
    manifest.value = await manifestPromise
    return manifest.value
  }

  // Returns the CAGR record for a ZIP, or null if we have no data for it.
  async function lookup(zip) {
    const padded = String(zip ?? '').trim().padStart(5, '0')
    if (!/^\d{5}$/.test(padded)) return null
    const prefix = padded.slice(0, 3)

    loading.value = true
    try {
      if (!shardCache.has(prefix)) {
        shardCache.set(
          prefix,
          fetch(`${basePath()}/data/cagr/${prefix}.json`)
            .then((r) => (r.ok ? r.json() : {}))
            .catch(() => ({})),
        )
      }
      const shard = await shardCache.get(prefix)
      return shard[padded] ?? null
    } finally {
      loading.value = false
    }
  }

  return { manifest, loading, loadManifest, lookup }
}
