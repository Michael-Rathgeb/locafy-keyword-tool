# CLAUDE.md — Locafy Keyword Tool

## Project Description

Public-facing local SEO keyword research tool. Users enter a business type and location, and the tool returns keyword suggestions with search volume, difficulty, trends, CPC, competition, and search intent. Deployed as a standalone subdomain app (e.g. keywords.locafy.com), designed to later embed into the Maps Booster dashboard.

No auth required — open access for partners and prospects.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **APIs**:
  - **DataForSEO** — keyword suggestions, related keywords, search volume (Labs + Google Ads APIs)
  - **Google Maps Platform** — Places Autocomplete for city/location input
- **Deployment**: Vercel on subdomain (keywords.locafy.com)

## Project Structure

```
├── CLAUDE.md
├── SYSTEM_ARCHITECTURE.md       # Torrential ecosystem reference (future integration)
├── .env.local                   # API keys (never committed)
├── .env.example                 # Template for env vars
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing — hero search (business + location)
│   │   ├── results/
│   │   │   └── page.tsx         # Keyword results with table, seed card, filters
│   │   └── api/
│   │       ├── keywords/
│   │       │   ├── suggestions/ # GET — keyword ideas (DataForSEO Labs)
│   │       │   └── volume/      # POST — bulk search volume (Google Ads API)
│   │       └── places/
│   │           └── autocomplete/# GET — city autocomplete (Google Places)
│   ├── components/
│   │   ├── SearchForm.tsx       # Business + location input (full & compact)
│   │   ├── LocationInput.tsx    # Google Places autocomplete with dropdown
│   │   ├── KeywordTable.tsx     # Sortable/filterable results table
│   │   ├── SeedKeywordCard.tsx  # Summary card for the seed keyword
│   │   ├── DifficultyBadge.tsx  # Color-coded difficulty indicator
│   │   ├── IntentBadge.tsx      # Search intent badge (info/nav/commercial/transactional)
│   │   └── TrendChart.tsx       # Inline SVG sparkline for monthly trends
│   ├── lib/
│   │   ├── dataforseo.ts        # DataForSEO REST client (suggestions, related, volume)
│   │   └── google-maps.ts       # Google Places autocomplete client
│   └── types/
│       ├── keyword.ts           # KeywordResult, DataForSEO response types
│       └── location.ts          # PlacePrediction, PlaceDetails
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Organization Rules

- **One component per file** — file name matches the export name
- **Single responsibility** — each module does one thing well
- **Types first** — define interfaces in `types/` before implementation
- **No dead code** — delete unused code, no commented-out blocks
- **Errors handled at boundaries** — API calls, user input
- **API keys server-side only** — all external API calls go through `/api/` routes
- **Prefer existing deps** — don't add packages without justification

## Quality Checks

| Check     | Command            | Notes                |
|-----------|--------------------|----------------------|
| Lint      | `npm run lint`     | Zero warnings policy |
| Typecheck | `npx tsc --noEmit` | Must pass cleanly    |
| Build     | `npm run build`    | No build errors      |

## Dev Server

```bash
npm run dev    # http://localhost:3000
```

## Environment Variables (.env.local)

```
DATAFORSEO_LOGIN=           # DataForSEO API login email
DATAFORSEO_PASSWORD=        # DataForSEO API password
GOOGLE_MAPS_API_KEY=        # Maps JavaScript API + Places API key
```

## Git Conventions

- Commit messages: `type: short description` (feat, fix, refactor, docs, test)
- Branch naming: `feature/description`, `fix/description`
- Keep commits atomic — one logical change per commit

## Future Integration

When ready to embed into Maps Booster:
- Add Torrential FastAPI auth (OAuth2 Bearer token)
- Read partner projects/campaigns from FastAPI
- Write selected keywords back as `keyword_modifiers` on campaigns
- Wrap as embeddable component or iframe
