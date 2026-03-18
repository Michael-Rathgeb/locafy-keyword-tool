# Maps Booster Integration — Implementation Plan

## Overview

Embed the Locafy Keyword Tool into the Maps Booster dashboard so partners can research, select, and apply keywords directly to their campaigns without leaving the product.

### Current State
- Keyword Tool is a standalone Next.js app at `keywords.locafy.com`
- Uses DataForSEO (keyword data) + Google Places (location autocomplete)
- No auth — public access
- No connection to Torrential Traffic system

### End State
- Keyword Tool embedded inside Maps Booster dashboard
- Partners authenticated via Torrential FastAPI (same login)
- Selected keywords written directly to campaign `keyword_modifiers`
- Keyword performance tracked via campaign `result_records`

---

## Architecture Options

### Option A: Iframe Embed (Fastest — 1-2 days)
Embed the existing standalone app inside Maps Booster via iframe.

```
Maps Booster Dashboard
┌──────────────────────────────────────────────────┐
│  Partner's Campaign View                          │
│  ┌──────────────────────────────────────────────┐ │
│  │  <iframe src="keywords.locafy.com             │ │
│  │    ?campaign_id=123                           │ │
│  │    &token=eyJ..."                             │ │
│  │    &business=plumber                          │ │
│  │    &location=Los Angeles, CA, USA"            │ │
│  │  />                                           │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Pros**: Zero changes to Maps Booster codebase. Deploy independently.
**Cons**: Limited UX control. Cross-origin communication via postMessage.

### Option B: Shared Component Library (Recommended — 1-2 weeks)
Extract keyword tool UI into a publishable package, import into Maps Booster.

```
@locafy/keyword-tool (npm package)
├── KeywordResearch      — Full research widget
├── KeywordTable         — Standalone results table
├── LocationInput        — City autocomplete
└── useKeywordSearch     — React hook for the API

Maps Booster imports:
  import { KeywordResearch } from '@locafy/keyword-tool'
  <KeywordResearch
    campaignId={123}
    onKeywordsSelected={(keywords) => saveToCampaign(keywords)}
  />
```

**Pros**: Native feel, full control, shared state with Maps Booster.
**Cons**: Requires Maps Booster to use React (or compatible framework).

### Option C: API-Only Integration (If Maps Booster is non-React — 1 week)
Keep keyword tool as a backend service. Maps Booster calls its API routes.

```
Maps Booster (any framework)
  → calls keywords.locafy.com/api/keywords/suggestions?keyword=...&location=...
  → renders results in its own UI
  → writes selected keywords to FastAPI
```

**Pros**: Framework-agnostic. Maps Booster controls all UI.
**Cons**: Duplicated frontend code. Must handle CORS.

### Recommendation
**Start with Option A** (iframe) for immediate value, then migrate to **Option B** when you want tighter integration. The API routes we already built work for all three options.

---

## Phase 1: Auth + Campaign Context (Option A or B)

### 1.1 Add Torrential FastAPI Authentication

The keyword tool needs to know WHO the partner is and WHICH campaigns they manage.

**New API route**: `POST /api/auth/login`
```typescript
// Proxies to Torrential FastAPI
// POST https://<TORR_API>/login/
// Body: { grant_type: "password", username, password }
// Returns: { access_token, token_type: "bearer" }
//
// Store token in httpOnly cookie or session
```

**New middleware**: `src/middleware.ts`
```typescript
// Check for valid session on all routes except / and /api/auth/*
// If no session → redirect to /login
// If session → attach user_id to request
```

**New env vars**:
```
TORRENTIAL_API_URL=http://67.227.136.130:7845
```

### 1.2 Fetch Partner's Projects + Campaigns

**New API route**: `GET /api/campaigns`
```typescript
// Calls Torrential FastAPI with partner's Bearer token:
//   GET /campaigns/?user_id={user_id}
//
// Returns campaigns with:
//   - id, campaign_name, campaign_type, business_name
//   - city, state, country
//   - keyword_modifiers (current keywords)
//   - campaign_status
//
// Filter to Maps Booster types: rocket, pgs, local_squidoosh, kgmid
```

**New page**: `/campaigns` — list partner's campaigns with current keywords

### 1.3 Pre-fill Search from Campaign

When a partner clicks "Research Keywords" on a campaign, pre-fill:
- **Keyword seed**: derived from `business_name` or existing `keyword_modifiers`
- **Location**: from campaign's `city, state, country`

```
/results?keyword=plumber&location=Los+Angeles,+CA,+USA&campaign_id=123
```

---

## Phase 2: Keyword Selection + Write-back

### 2.1 Keyword Selection UI

Add checkboxes to the KeywordTable:

```typescript
interface KeywordTableProps {
  keywords: KeywordResult[];
  selectable?: boolean;                    // NEW
  onSelectionChange?: (kws: string[]) => void;  // NEW
}
```

Add a floating action bar when keywords are selected:
```
┌─────────────────────────────────────────────────────┐
│  12 keywords selected    [Apply to Campaign ▾]      │
│                          ├─ Plumber Rocket Campaign  │
│                          ├─ Plumber Local Squidoosh  │
│                          └─ Plumber PGS Campaign     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Write Keywords to Campaign

**New API route**: `PUT /api/campaigns/{id}/keywords`
```typescript
// Reads current keyword_modifiers from campaign
// Merges selected keywords (no duplicates)
// Calls Torrential FastAPI:
//   PUT /campaigns/update/{id}/
//   Body: { keyword_modifiers: "plumber near me, best plumber, ..." }
//
// keyword_modifiers is a comma-separated string on the campaign
```

### 2.3 Keyword Diff View

Before applying, show what's changing:
```
Current keywords (3):     New keywords to add (5):
  ✓ plumber                 + plumber near me
  ✓ plumber los angeles     + best plumber los angeles
  ✓ emergency plumber       + 24 hour plumber
                            + plumber cost
                            + licensed plumber
```

---

## Phase 3: Campaign-Aware Keyword Suggestions

### 3.1 Smart Keyword Seeding by Campaign Type

Different campaign types need different keyword strategies:

| Campaign Type      | Keyword Strategy                          | Auto-seed From              |
|--------------------|-------------------------------------------|-----------------------------|
| **local_squidoosh**| Local intent keywords + city modifiers    | `business_name` + `city`    |
| **rocket**         | Google Maps keywords + "near me" variants | `business_name`             |
| **pgs**            | Direction/navigation keywords             | `business_name` + `city`    |
| **kgmid**          | Brand + entity keywords                   | `brand_name`                |
| **squidoosh**      | Broad search + click keywords             | `business_name` + modifiers |

**New logic**: `src/lib/keyword-strategy.ts`
```typescript
function getSeedKeywords(campaign: Campaign): string[] {
  switch (campaign.campaign_type) {
    case 'local_squidoosh':
      return [
        campaign.business_name,
        `${campaign.business_name} ${campaign.city}`,
        `${campaign.business_name} near me`,
      ];
    case 'rocket':
    case 'pgs':
      return [
        campaign.business_name,
        `best ${campaign.business_name} ${campaign.city}`,
      ];
    // ...
  }
}
```

### 3.2 Keyword Scoring for Campaign Type

Not all keywords work equally well for all campaign types. Add a "fit score":

```typescript
interface KeywordResult {
  // ... existing fields
  campaign_fit_score?: number;  // 0-100
  fit_reasons?: string[];       // ["high local intent", "includes city name"]
}
```

Scoring factors:
- **Local intent** (contains "near me", city name, "local") → +30 for local_squidoosh/rocket
- **Navigational intent** → +20 for squidoosh (they need to find + click)
- **Has search volume** → +20 (no point targeting zero-volume keywords)
- **Low-medium difficulty** → +20 (< 50 difficulty realistic to rank for)
- **Contains business type** → +10

---

## Phase 4: Performance Tracking

### 4.1 Keyword → Campaign → Results Pipeline

Once keywords are applied to campaigns and queries execute, track performance:

```
Keyword "plumber near me"
  → Applied to Campaign #123 (local_squidoosh)
  → Query Generator creates queries with this keyword
  → Workers execute queries
  → result_records track success/failure

We can trace: keyword → campaign_id → queries → result_records
```

**New API route**: `GET /api/campaigns/{id}/keyword-performance`
```typescript
// Query Torrential FastAPI for result_records by campaign_id
// Group by the keyword used in each query
// Return:
//   keyword: "plumber near me"
//   total_queries: 150
//   successful: 142
//   success_rate: 94.6%
//   avg_session_duration: 45s
//   wildcard_found_rate: 87%  (how often the target was found in results)
```

### 4.2 Keyword Performance Dashboard

New page: `/campaigns/{id}/performance`

```
┌────────────────────────────────────────────────────────────┐
│  Campaign: LA Plumber - Local Squidoosh                     │
│                                                             │
│  Keyword               Volume   Success   Wildcard Found   │
│  ─────────────────────────────────────────────────────────  │
│  plumber near me       823K     94.6%     87.2%      ✅    │
│  best plumber la       12.1K    91.2%     92.1%      ✅    │
│  emergency plumber     8.1K     88.4%     71.3%      ⚠️    │
│  plumber cost          6.6K     95.1%     45.2%      ❌    │
│                                                             │
│  ⚠️ "plumber cost" has low wildcard match — consider        │
│     removing or adjusting the wildcard string               │
└────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Iframe Embed Specifics (Option A)

If going the iframe route first, here's exactly what to build:

### 5.1 Embed Mode

Add an `?embed=true` query param that:
- Hides the top nav / Locafy branding
- Hides the login (uses token from parent)
- Sends events to parent via `postMessage`

```typescript
// src/app/layout.tsx — detect embed mode
const isEmbed = searchParams.get('embed') === 'true';

// If embed mode:
//   - No header/footer
//   - Accept auth token from parent via postMessage
//   - Post selected keywords back to parent
```

### 5.2 Parent ↔ Iframe Communication

```typescript
// === Maps Booster (parent) sends: ===
iframe.contentWindow.postMessage({
  type: 'INIT',
  token: 'eyJ...',           // Torrential Bearer token
  campaign_id: 123,
  business_name: 'Joe\'s Plumbing',
  city: 'Los Angeles',
  country: 'US',
}, 'https://keywords.locafy.com');

// === Keyword Tool (iframe) sends back: ===
window.parent.postMessage({
  type: 'KEYWORDS_SELECTED',
  campaign_id: 123,
  keywords: ['plumber near me', 'best plumber la', '24 hour plumber'],
}, 'https://mapbooster.locafy.com');

// === Maps Booster (parent) handles: ===
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://keywords.locafy.com') return;
  if (event.data.type === 'KEYWORDS_SELECTED') {
    // Write keywords to campaign via FastAPI
    updateCampaignKeywords(event.data.campaign_id, event.data.keywords);
  }
});
```

### 5.3 Embed URL Structure

Maps Booster generates the iframe URL:
```
https://keywords.locafy.com/results
  ?embed=true
  &keyword=plumber
  &location=Los+Angeles,+CA,+USA
  &campaign_id=123
  &campaign_type=local_squidoosh
```

---

## Database Changes

No new tables required. All data flows through existing Torrential schema:

| What                    | Where                                      |
|-------------------------|--------------------------------------------|
| Selected keywords       | `campaigns.keyword_modifiers` (comma-sep)  |
| Query execution results | `result_records` (existing)                |
| User identity           | `users` table (existing)                   |
| Campaign config         | `campaigns` table (existing)               |

---

## New Environment Variables (When Integrating)

Add to keyword tool's `.env.local` / Vercel env vars:
```
TORRENTIAL_API_URL=http://67.227.136.130:7845
TORRENTIAL_API_USER=<service-account-user>
TORRENTIAL_API_PASS=<service-account-pass>
EMBED_ALLOWED_ORIGINS=https://mapbooster.locafy.com
```

---

## Implementation Order

| Phase | What                                    | Effort   | Depends On |
|-------|-----------------------------------------|----------|------------|
| 1A    | Iframe embed mode (embed=true)          | 1 day    | Nothing    |
| 1B    | postMessage communication               | 1 day    | 1A         |
| 2A    | Torrential FastAPI auth                 | 1 day    | Nothing    |
| 2B    | Fetch partner campaigns                 | 1 day    | 2A         |
| 2C    | Keyword selection checkboxes            | 0.5 day  | Nothing    |
| 2D    | Write keywords to campaign              | 1 day    | 2A, 2B, 2C|
| 3A    | Smart seeding by campaign type          | 1 day    | 2B         |
| 3B    | Campaign fit scoring                    | 1 day    | 3A         |
| 4A    | Keyword performance API                 | 1 day    | 2A         |
| 4B    | Performance dashboard page              | 1-2 days | 4A         |

**Total estimated effort: ~10-12 days**

Start with **Phase 1A + 1B** to get it embedded fast, then layer on the deeper integrations.
