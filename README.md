# 🎨 AI Creative Studio

An autonomous **Cloudflare AI Agent** (Agents SDK) that takes a one-sentence brief and produces **both** an interactive HTML page **and** a branded PDF presentation.

## Quick Start

```bash
npm install
npx wrangler kv namespace create CACHE
# Paste the returned ID into wrangler.jsonc (replace REPLACE_WITH_KV_NAMESPACE_ID)
npx wrangler dev     # local test
npx wrangler deploy  # production
```

## API

### POST / (or /html or /pdf)
```bash
curl -X POST https://ai-creative-studio.<sub>.workers.dev/pdf \
  -H "Content-Type: application/json" \
  -d '{"topic":"Q3 revenue analysis","slideCount":8,"style":"corporate"}' \
  -o report.pdf
```

## Brand Presets
- `auto` — agent chooses palette by topic hash
- `corporate` — professional blue/green
- `glass` — dark glassmorphism
- `punk` — neon on black, Impact font
- `book` — warm paper tones, Playfair/serif

## Hard PDF Hygiene
- NO backdrop-filter, NO blurred shadows, NO canvas
- All decoration = vector SVG
- Target: 8-slide PDF under 300 KB
