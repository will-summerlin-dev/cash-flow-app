# Market data pipeline (ZIP-level rent & price CAGR)

The app shows real, ZIP-level **rent growth** and **home-price appreciation** so
users don't have to guess those assumptions. The values are precomputed into a
small static lookup, so the frontend stays a deployable static site with no
runtime backend or per-request API calls.

## How it works

```
Zillow ZORI/ZHVI CSVs  ──(scripts/build-cagr-data.js)──►  public/data/cagr/
                                                              ├─ manifest.json
                                                              ├─ 100.json   (ZIPs 100xx)
                                                              ├─ 902.json   (ZIPs 902xx)
                                                              └─ …
```

- **ZORI** (Zillow Observed Rent Index) → trailing rent-growth CAGR.
- **ZHVI** (Zillow Home Value Index) → trailing price-appreciation CAGR.
- Output is **sharded by the first 3 ZIP digits** so the browser only fetches the
  slice it needs (`/data/cagr/787.json` for `78701`).
- Each record: `{ rentCagr, rentYears, priceCagr, priceYears }` (CAGR as a decimal).

The frontend reads this via `src/composables/useZipData.js`, surfaced in
`src/components/MarketDataPanel.vue`.

## Regenerating the data

```bash
# Download the latest CSVs from Zillow and rebuild:
npm run build:data

# Use a different trailing window (default 5 years):
npm run build:data -- --years 10

# Use local CSVs instead of downloading:
npm run build:data -- --zori-file ./ZORI.csv --zhvi-file ./ZHVI.csv
```

If a download 404s, Zillow has renamed the public CSV. Get the current ZIP-level
ZORI/ZHVI URLs from <https://www.zillow.com/research/data/> and pass them:

```bash
npm run build:data -- --zori-url <url> --zhvi-url <url>
```

This runs automatically on the 5th of each month via
`.github/workflows/update-cagr.yml`, which commits any changes.

## The bundled sample data

The committed `public/data/cagr/*` is **sample/placeholder** data for a handful
of ZIPs (90210, 10001, 78701, 33101, 60601, 98101, 30309, 75201) so the feature
works out of the box. `manifest.json` has `"source": "sample"`, which makes the UI
show a warning badge. Run `npm run build:data` to replace it with real figures.

## Licensing

Serve the **derived** CAGR values with a "Data: Zillow" credit (the UI does this
from `manifest.source`). Do **not** redistribute Zillow's raw monthly CSVs.
For ZIPs Zillow doesn't cover, the public-domain fallbacks are Census ACS
(table B25064, rent) and the FHFA House Price Index (price).
