# Torrential Traffic System — Complete Architecture Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [The 5 Repositories](#the-5-repositories)
3. [Shared Database Schema](#shared-database-schema)
4. [Complete Data Flow — Query Lifecycle](#complete-data-flow--query-lifecycle)
5. [Deep Dive: torr-traffic-dashboard (Django)](#deep-dive-torr-traffic-dashboard-django)
6. [Deep Dive: torr-traffic-fastapi (FastAPI)](#deep-dive-torr-traffic-fastapi-fastapi)
7. [Deep Dive: torr-traffic-query-generator](#deep-dive-torr-traffic-query-generator)
8. [Deep Dive: torr-traffic-ml (Browser Automation Workers)](#deep-dive-torr-traffic-ml-browser-automation-workers)
9. [Deep Dive: torr-server-automation (VPS Orchestrator)](#deep-dive-torr-server-automation-vps-orchestrator)
10. [Browser & Anti-Detection System](#browser--anti-detection-system)
11. [Proxy System](#proxy-system)
12. [Campaign Types — What Each One Does](#campaign-types--what-each-one-does)
13. [Parameters System (Runtime Config)](#parameters-system-runtime-config)
14. [Monitoring & Observability](#monitoring--observability)
15. [Maps Booster (External)](#maps-booster-external)
16. [Environment & Deployment](#environment--deployment)
17. [Key Risks & Bus-Factor Items](#key-risks--bus-factor-items)

---

## System Overview

Torrential is a **distributed browser automation system** that generates organic-looking web traffic across Google, YouTube, Amazon, Walmart, Bing, Shopify, and other platforms. It runs across a fleet of Windows VPS servers, each executing browser sessions through anti-detection browsers (MultiLoginX, GoLogin) with rotating residential and mobile proxies.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              USER / OPERATOR                                          │
│                                                                                       │
│  ┌─────────────────────┐          ┌─────────────────────────────────┐                │
│  │  Traffic Dashboard   │          │  Maps Booster Dashboard         │                │
│  │  (Django Web App)    │          │  (Separate codebase - unknown)  │                │
│  │  torr-traffic-       │          │  Creates rocket/pgs/local       │                │
│  │  dashboard-clean     │          │  squidoosh campaigns            │                │
│  └─────────┬───────────┘          └──────────────┬──────────────────┘                │
│            │                                      │                                   │
└────────────┼──────────────────────────────────────┼───────────────────────────────────┘
             │  HTTP + Direct DB                    │  HTTP (API calls)
             ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI (Central REST API)                                    │
│                         torr-traffic-fastapi-clean                                    │
│                                                                                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │campaigns │ queries  │ results  │ proxies  │ vps      │parameters│ users    │     │
│  │  CRUD    │  CRUD    │  CRUD    │  CRUD    │ servers  │  CRUD    │ auth     │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘     │
│                                                                                       │
│  OAuth2 Bearer Token Auth  ·  MySQL (SQLAlchemy + databases)  ·  Port 7845           │
└───────────┬──────────────────────────┬───────────────────────────┬────────────────────┘
            │                          │                           │
            ▼                          ▼                           ▼
┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────────┐
│  Query Generator      │  │  Traffic ML Workers  │  │  Server Automation              │
│  torr-traffic-query-  │  │  torr-traffic-ml-    │  │  torr-server-automation-clean   │
│  generator-clean      │  │  clean               │  │                                 │
│                       │  │                       │  │  Has its OWN separate Django    │
│  Generates queries    │  │  Executes queries     │  │  REST API backend (not in these │
│  from active          │  │  in anti-detect       │  │  repos — runs on a central      │
│  campaigns            │  │  browsers             │  │  admin server)                  │
└───────────────────────┘  └───────────────────────┘  └─────────────────────────────────┘
```

---

## The 5 Repositories

| Repo | Tech Stack | Runs On | Purpose |
|------|-----------|---------|---------|
| **torr-traffic-dashboard** | Django 4, Channels, Crispy Forms | Central server (Docker) | Web UI for managing projects, campaigns, viewing results, monitoring servers |
| **torr-traffic-fastapi** | FastAPI, SQLAlchemy, databases | Central server (Docker, port 7845) | REST API — the single source of truth for all CRUD operations |
| **torr-traffic-query-generator** | Python script (Pipenv) | Central server or admin VPS | Continuously generates queries from active campaigns and inserts them into the DB |
| **torr-traffic-ml** | Python, Selenium, Playwright, MultiLoginX, GoLogin | Each Windows VPS worker | The actual browser automation — picks up queries and executes them |
| **torr-server-automation** | Python, Windows schtasks, batch files | Each Windows VPS (admin & worker) | Manages VPS lifecycle: build, restart, schedule, heartbeat, proxy rotation |

---

## Shared Database Schema

All services share a **single MySQL database**. Key tables:

### Core Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **campaigns** | Campaign definitions | id, user_id, project_id, campaign_type, campaign_name, num_searches, business_name, country_iso_2, state_iso_3, city, keyword_modifiers, gmb_cid, direct_url, tier_1_urls, tier_2_urls, destination_urls, wildcard_string, desktop_percentage, mobile_proxy_percentage, mobileproxy_provider_percentage, campaign_status, is_spread_session, is_referrer_list, geo_latitude, geo_longitude, radius, brand_name, frequency, extra_attr |
| **queries** | Individual search tasks | id, query, query_time, proxy_ip, proxy_port, proxy_city, proxy_state, proxy_type, proxy_server, query_status (0=pending, 1=in_progress, 2=done, 5=proxy_unavailable), campaign_id, proxy_user, proxy_pass, geo_latitude, geo_longitude, radius, user_id, project_id |
| **result_records** | Execution results | id, search_date_time, vps_server_names_id, type_listing, session_duration, search_success (Success/Failed), query_id, campaign_id, user_id, project_id, proxy_server, error_logs, browser_provider_name, bandwidth, captcha_retries_count, framework_type, server_ip |
| **projects** | Project groupings | id, user_id, project_name, slug, is_archive |
| **users** | User accounts | id, name, email, password, user_type, credit |

### Infrastructure Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **mobile_proxies** | Proxy inventory | id, city, state, proxy_user, proxy_pass, ip, http_port, status (0=available, 1=in_use, 2=done), mobile_proxy_server |
| **vps_server_names** | Server registry | id, vps_ip, server_name, session_type, InstanceID, Status |
| **running_server_details** | Real-time server activity | id, vps_server_names_id, query_id, time_of_logging |
| **parameters** | Runtime configuration (JSON key-value) | key, val |
| **campaign_types** | Campaign type definitions | id, campaign_category_id, name |
| **campaign_category** | Campaign categories | id, name |
| **referral_urls_table** | Referrer URL pool | id, referral_urls |
| **bitly_links** | Shortened URLs | id, campaign_id, url, bitly_link |
| **search_field_xpaths** | Website-specific XPaths | id, website, xpath, has_search_field |
| **campaign_success** | Success rate tracking | campaign_id, success_percentage, project_id |
| **project_success** | Project-level success rates | project_id, success_percentage |
| **proxy_status** | Proxy health screenshots | id, image_path, proxy_type, session_type |

### Query Status State Machine
```
0 (PENDING) ──→ 1 (IN_PROGRESS) ──→ 2 (DONE)
     │                                    ▲
     │                                    │
     ▼                                    │
5 (PROXY_UNAVAILABLE) ────────────────────┘
     ▲                                    
     │ (returned to pending on failure)   
     │                                    
1 (IN_PROGRESS) ──→ 0 (PENDING)  [on captcha/tunnel failure]
```

---

## Complete Data Flow — Query Lifecycle

### Phase 1: Campaign Creation (Dashboard)
1. User logs into the **Django Dashboard** at `/dashboard/`
2. Creates a **Project** (grouping container)
3. Creates a **Campaign** within that project with:
   - **Campaign type** (squidoosh, birthday, youtube, rocket, etc.)
   - **Keywords/modifiers** — search terms to use
   - **Wildcard string** — the target domain to find and click in search results
   - **Business name, location** (country, state, city)
   - **Direct URLs, tier 1/2 URLs, destination URLs** — for tiered/multi-step campaigns
   - **GMB CID** — Google My Business Customer ID (for map campaigns)
   - **Num searches** — daily session count
   - **Desktop/mobile percentage** — ratio of desktop vs mobile sessions
   - **Mobile proxy percentage** — ratio of mobile vs residential proxies
   - **Mobile proxy provider percentage** — per-provider weights (e.g., 50% proxypanel, 30% proxidize, 20% soax)
   - **Frequency** — daily or monthly
   - **Extra attributes** — JSON blob for campaign-specific config (image_src, coordinates, etc.)
4. Sets `campaign_status = 1` to activate it

### Phase 2: Query Generation (Query Generator)
1. **`query.py`** runs in an infinite loop
2. Calls FastAPI `GET /campaigns/` to fetch all campaigns with `status=1`
3. For each active campaign:
   - Calculates how many queries are needed today (`num_searches - already_generated_count`)
   - If monthly frequency, divides total across days in the month
   - **`SearchQueryBuilder`** generates the actual search queries based on campaign type:
     - **Squidoosh/Birthday**: `"{business_name} {keyword_modifier} {city/country}"` — combines business name with keyword modifiers
     - **Organic keyword/brand**: Uses keyword modifiers directly
     - **Tiered**: Uses tier_1_urls and tier_2_urls as the query content
     - **YouTube**: `"{keyword} >> {direct_url} >> {description_url}"` — keyword, video URL, and click target
     - **Rocket**: Generates Google Maps URLs with lat/lng coordinates from a grid around the business
     - **PGS (Place Grid Search)**: Google Maps directions URLs with source coordinates
     - **Spreadsheet**: Reads rows from a Google Spreadsheet, formats as `"{spreadsheet_url} >> {column}{row} >> {content}"`
     - **Organic Direct**: Uses direct_url as the query
     - **Website Specific**: Uses destination_urls
   - Generates **randomized query_time** values spread across the day (now → 10:59 PM)
   - Assigns a **random proxy** per query:
     - Weighted selection: mobile vs residential based on `mobile_proxy_percentage`
     - Within mobile: weighted by provider (proxypanel, proxidize, xproxy, soax, smart_proxy_mobile)
     - Within residential: weighted by provider (smart_proxy, oxylabs)
     - For residential proxies: generates a unique session string per query to get a fresh IP
   - POSTs all queries to FastAPI `POST /queries/create/multiple/` with `query_status=0`

### Phase 3: Query Execution (Traffic ML)
1. **`main.py`** runs on each Windows VPS worker in an infinite loop
2. Checks `server_built_status.txt` on Desktop — waits if server is "busy" (being rebuilt)
3. Calls FastAPI `GET /queries/get/random` which:
   - Selects a random query with `status=0` and `query_time <= now()`
   - Uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent race conditions across workers
   - Atomically updates `status=0 → status=1` (in progress)
   - Returns the query joined with its campaign data
4. If query uses a mobile proxy (`proxypanel`, `proxidize`, `xproxy`):
   - Calls `GET /proxies/get/active/` to get a fresh proxy with `status=0`
   - Atomically locks that proxy (`status=0 → status=1`)
   - Replaces query's proxy info with the fresh mobile proxy
5. **Browser Selection** (`get_browsers.py`):
   - Weighted random selection of browser provider: MultiLoginX, GoLogin, or MultiLogin (old)
   - Weighted random selection of OS type (win vs mac)
   - Weighted random selection of framework (Selenium vs Playwright) — per campaign type, stored in `parameters` table
   - Special override: certain campaign types on mobile proxies force Selenium + Android profile
6. **Browser Launch** (`get_browsers.py → get_driver()`):
   - **GoLogin path**: Creates a browser profile via GoLogin API (fingerprint, proxy config, geo), starts the profile, connects via Chrome DevTools Protocol
   - **MultiLoginX path**: Creates a "quick profile" via MLX API with proxy/OS/framework config, starts it, connects via CDP
   - Both paths retry up to 3 times with proxy rotation on failure
   - Returns either a Selenium WebDriver or Playwright Page depending on framework selection
7. **Campaign Execution** (`campaigns/*.py`):
   - Looks up campaign type in `campaign_map` dictionary
   - Instantiates the correct campaign class with `(driver, browser_context, playwright_instance, params, framework, is_mobile, all_parameters)`
   - Calls `.execute()` which returns `(success, error_logs, captcha_count)`
   - Wrapped in a timeout (`MAX_QUERY_TIME`)
8. **Result Recording**:
   - Writes to `result_records` table via `POST /results/create/`
   - Sets query `status=2` (done) on success
   - Sets query `status=0` (pending, retry) on captcha/tunnel failure
   - Records: success/fail, session duration, bandwidth used, captcha count, browser provider, framework, server IP
9. **Cleanup**:
   - Closes browser context, Playwright instance, and browser provider
   - Deletes GoLogin profile if applicable
   - Rotates mobile proxy if used (calls provider's IP rotation API, sets proxy `status=2`)

### Phase 4: Server Orchestration (Server Automation)
1. Runs on **every** Windows VPS (both admin and worker types)
2. Registers itself with its own **separate Django REST API** (not in these repos — it has its own DB)
3. Main loop polls the Server Automation API for instructions:
   - **`build_needed = "build"`**: Pull latest code from git, kill running scripts, restart everything
   - **`build_needed = "cancel"`**: Gracefully stop — wait for current query to finish, then kill
   - **`build_needed = "force_cancel"`**: Immediately kill, rotate proxy, set query back to pending
   - **`build_needed = "restart"`**: Restart the whole Windows server
   - **`build_needed = "update_gologin/mlx/windows"`**: Run update scripts
4. **Scheduled Tasks** (Windows `schtasks`):
   - **Cancel task**: Runs at category's scheduled time — stops current execution
   - **Build task**: Runs 20 minutes after cancel — pulls latest code, rebuilds
   - **Server connection task**: Runs on logon — ensures script starts after reboot
5. **Worker build process** (`worker_build.bat`):
   - `git stash && git checkout server && git pull origin server`
   - Kills all browser processes (chrome, chromedriver, multilogin, etc.)
   - Launches `ML_cli.bat` (logs into MultiLogin headless agent)
   - Launches `Build.bat` from Desktop (starts the ML main.py)
   - Launches `close_stuck_session.bat`
6. **Heartbeat**: Background thread sends heartbeat to Server Automation API every 100-300 seconds
7. **Query timeout checker**: Background thread monitors if a query has been running too long, kills it
8. **PID tracking**: Writes PIDs to `pid.txt` and `torrential_pid.txt` on Desktop for process management

---

## Deep Dive: torr-traffic-dashboard (Django)

### Tech Stack
- Django 4 + Channels (WebSockets for real-time)
- Crispy Forms + Bootstrap 4
- Direct MySQL database reads via Django ORM (`managed = False` — doesn't create/migrate tables)
- Also calls FastAPI for some operations

### Key Views
- **`/`** — Login page
- **`/dashboard/`** — Main dashboard: shows running servers, active queries, server health
- **`/dashboard/main/`** — Project listing with campaign counts
- **`/dashboard/project_view/<id>/`** — Campaign list for a project
- **`/dashboard/create-campaign/<project_id>`** — Campaign creation form (complex — different fields per campaign type)
- **`/dashboard/edit-campaign/<id>/`** — Campaign edit
- **`/dashboard/campaign-details/<id>/`** — Query viewer for a campaign
- **`/dashboard/reports/`** — Result records, success rates
- **`/websites/`** — Website-specific XPath management

### Key Patterns
- Dashboard reads directly from the shared MySQL DB using Django's ORM
- Campaign creation/updates go through the FastAPI (via `api_url` env var + Bearer token)
- Real-time server status shown by querying `running_server_details` table
- Campaign types have IDs mapped in `get_campaign_types()` view — this is where the numeric ID ↔ string name mapping lives

### Configuration
- `.env` file with: `NAME`, `HOST_`, `PORT`, `USER_`, `PASSWORD`, `API_URL`, `DJANGO_SECRET_KEY`, `hosts`, `DEBUG`, `SINGLE_SESSION`, `MULTI_SESSION`, `SHOWBROWSERPANELS`

---

## Deep Dive: torr-traffic-fastapi (FastAPI)

### Tech Stack
- FastAPI with `databases` (async) + SQLAlchemy
- OAuth2 Bearer token authentication
- MySQL backend
- Docker deployment

### Authentication
```python
POST /login/
Body: { grant_type, username, password, scope, client_id, client_secret }
Returns: { access_token, token_type: "bearer" }
```
All other endpoints require `Authorization: Bearer <token>` header.

### Critical Endpoints

**Query Selection (the heart of the system):**
```
GET /queries/get/random
```
- Selects random query where `status=0` and `query_time <= now()`
- Uses `FOR UPDATE SKIP LOCKED` for atomic locking
- Updates `status → 1` (in progress)
- Returns query JOINed with campaign data
- Falls back to `status=5` (proxy unavailable) queries if no `status=0` found

**Query Status Update:**
```
PUT /queries/updatestatus/{id}/
Body: { query_status: 0|1|2|5 }
```

**Proxy Management:**
```
GET /proxies/get/active/     — Get random proxy (status=0), lock it (status=1)
PUT /proxies/update/status/{id}/  — Update proxy status
```

**Results:**
```
POST /results/create/        — Record execution results
```

**Parameters (runtime config):**
```
GET /parameters/             — Get ALL parameters as key-value dict
PUT /parameters/update/{key} — Update a parameter value
```

### Key Design Decisions
- The `parameters` table is a **dynamic configuration store**. Everything from browser probabilities to proxy URLs to captcha keys is stored here as JSON. This means the system behavior can be changed without code deploys.
- The `campaigns` table has conditional columns (`app_keyword_id`, `extra_attr`, `image_number`) controlled by env vars `APPCOLUME` and `HAS_EXTRA_ATTR`
- Database connection pool: 20 connections, max overflow 10, pre-ping enabled, recycle every 30 minutes

---

## Deep Dive: torr-traffic-query-generator

### Entry Point: `query.py`
```python
MainQuery().run()  # infinite loop
  → fetch_campaigns()  # pages through all status=1 campaigns
    → for each campaign:
        QueryGenerator().generate_query(campaign)
          → calculate queries needed (num_searches - already_generated)
          → SearchQueryBuilder().search_queries_generator()
            → generate search queries based on campaign type
            → generate randomized query_times spread across the day
          → assign proxies (weighted random)
          → POST /queries/create/multiple/ to FastAPI
```

### Query Generation by Campaign Type
| Campaign Type | Query Format | Source Data |
|---------------|-------------|------------|
| **squidoosh** | `"{business_name} {keyword_modifier}"` | keyword_modifiers (comma-separated) |
| **birthday** | Alternates: `"{business} {keyword} {city}"` / `"{business} {keyword} {country}"` | keyword_modifiers |
| **organic_keyword / organic_brand** | `"{keyword_modifier}"` | keyword_modifiers |
| **tiered** | `"{tier_1_url}"` or `"{tier_2_url}"` | tier_1_urls, tier_2_urls |
| **organic_direct** | `"{direct_url}"` | direct_url |
| **youtube** | `"{keyword} >> {direct_url} >> {description_url}"` | keyword_modifiers + direct_url |
| **rocket** | `"https://google.com/maps?ll={lat},{lng}&z=14&cid={cid}&q={keyword}"` | GMB CID + lat/lng grid |
| **pgs** | `"https://maps.google.com/maps/dir/{lat},{lng}/{address}/@..."` | extra_attr.source_coordinates |
| **spreadsheet** | `"{spreadsheet_url} >> A{row} >> {cell_content}"` | Google Spreadsheet URL |
| **walmart/shopify/wordpress** | `"{direct_url}"` or `"{keyword_modifier}"` | varies |
| **bsr_booster** | Amazon product URLs | direct_url |
| **kgmid** | Knowledge Graph entity IDs | keyword_modifiers |

### Proxy Assignment Logic
```
Campaign has mobile_proxy_percentage = 60%
  → 60% chance: mobile proxy
    → Weighted by mobileproxy_provider_percentage from campaign:
      e.g., {"proxypanel": 50, "proxidize": 30, "soax": 20}
    → Fetches actual proxy details from FastAPI
  → 40% chance: residential proxy
    → Weighted by configured percentages:
      e.g., {"smart_proxy": 70, "oxylabs": 30}
    → Generates unique session string for IP rotation
```

### Keyword Cycling
For campaigns with multiple keywords, the generator tracks the **last query's keyword index** and resumes from where it left off. This ensures all keywords are cycled through evenly rather than random selection.

---

## Deep Dive: torr-traffic-ml (Browser Automation Workers)

### Directory Structure
```
torr-traffic-ml/
├── main.py                    # Entry point — infinite loop
├── campaigns/                 # 31 campaign types
│   ├── campaigns.py           # Base Campaign class
│   ├── squidoosh.py          # Google search → find & click target
│   ├── birthday.py           # Google search → Images → find brand
│   ├── tiered.py             # Visit URLs → scroll → click wildcard
│   ├── organic_direct.py     # Direct URL visit → scroll → interact
│   ├── youtube.py            # YouTube video → description click
│   ├── rocket.py             # Google Maps interaction
│   ├── walmart.py            # Walmart product interaction
│   ├── shopify.py            # Shopify store interaction
│   └── ... (31 total)
├── pages/                     # Page Object Models (Selenium)
│   ├── base_page.py
│   ├── google_search_page.py
│   ├── google_image_page.py
│   ├── google_map_page.py
│   ├── youtube_page.py
│   ├── amazon_product_page.py
│   ├── facebook_page.py
│   └── ...
├── playwright_framework/      # Parallel Playwright implementation
│   ├── pages/                 # Same page objects, Playwright API
│   ├── locators/
│   └── mixins/
├── locators/                  # XPath/CSS selectors (Selenium)
│   ├── locator_google_search.py
│   ├── locator_google_search_mobile.py
│   └── ...
├── drivers/                   # Browser management
│   ├── get_browsers.py        # Browser/OS/framework selection
│   ├── multiloginx.py         # MultiLoginX API wrapper
│   ├── gologin.py             # GoLogin API wrapper
│   ├── multilogin.py          # Legacy MultiLogin wrapper
│   ├── cookiesManager.py
│   ├── extensionsManager.py
│   ├── browserManager.py
│   ├── smart_proxy.py         # Residential proxy handler
│   ├── smart_proxy_mobile.py  # Mobile proxy handler
│   └── languages.py
├── proxies/
│   └── soax.py                # SOAX proxy provider
├── common_components/
│   ├── constants.py           # ALL constants (1165 lines!)
│   ├── utilities.py           # Shared utilities
│   ├── captcha_solve.py       # Selenium captcha solving
│   ├── captcha_solve_playwright.py
│   └── context.py             # Global context (query ID tracking)
├── database/
│   └── db_api_calls.py        # HTTP calls to FastAPI
├── recorder/
│   └── screen.py              # Screen recording for debugging
└── mixins/
    ├── mouse_mixin.py         # Human-like mouse movements
    └── all_mixin.py
```

### Campaign Base Class
Every campaign extends `Campaign` and implements `execute()`:
```python
class Campaign:
    def __init__(self, driver, browser_context, playwright_instance, params, framework, is_mobile, parameters):
        self.driver = driver                    # Selenium WebDriver or Playwright Page
        self.browser_context = browser_context  # Playwright browser context (None for Selenium)
        self.playwright_instance = playwright_instance
        self.params = params                    # Merged query + campaign data
        self.framework = framework              # "selenium" or "playwright"
        self.is_mobile = is_mobile
        self.parameters = parameters            # All DB parameters
        self.error_logs = None
        self.search_success = 'Failed'          # Default to failed
        self.country_iso = params['country_iso_2']

    def execute(self):
        # Returns: (search_success, error_logs, captcha_count)
        raise NotImplementedError
```

### Dual Framework Pattern
Every campaign has TWO complete implementations:
```python
def execute(self):
    if self.framework == "selenium":
        from pages.google_search_page import GoogleSearchPage
        # ... Selenium implementation
    else:
        from playwright_framework.pages.google_search_page import GoogleSearchPage
        # ... Playwright implementation (same logic, different API)
```

### Squidoosh Campaign (The Core Pattern)
This is the most common campaign type — Google search + click target:
1. Open Google (country-specific domain based on `country_iso_2`)
2. Accept cookies popup
3. Check for & solve CAPTCHA (NoPeCHA or CapSolver browser extension)
4. Type keyword in search box
5. Scan search results for **wildcard string** (target domain)
6. If found on current page → click it → interact with site → **Success**
7. If not found → click "Next" page → repeat (up to `NEXT_PAGE_LIMIT` pages, default 7)
8. If still not found → **Failed** with "Wildcard not found"

### Wildcard Matching
The wildcard string is the target URL/domain to find in search results. The system uses complex XPath expressions:
```xpath
//*[@id='search']//a[
  starts-with(@href,'example.com') or 
  starts-with(@href,'https://example.com') or 
  contains(@href,'example.com')
]//*[self::h3 or contains(@class,'CA5RN')]
```
Three modes:
- **Default**: Match any URL containing the wildcard
- **Domain**: Match exact domain only (home page)
- **Exact match**: Match exact URL

### CAPTCHA Handling
```python
# Uses browser extensions (NoPeCHA, CapSolver) installed in the anti-detect browser
# Weighted selection between them via CAPTCHA_KEY_PROBABILITY parameter
# Flow:
1. Check if CAPTCHA iframe is present
2. If yes, wait for extension to solve it (timeout)
3. Track captcha_count per session
4. If CAPTCHA_ATTEMPTS_LIMIT (3) reached → fail the query
5. On "Google Recaptcha" error → return query to pending (retry)
```

### Mouse Simulation
```python
# mixins/mouse_mixin.py uses pyautogui for human-like mouse movements
# Bezier curve-based mouse paths with:
#   - MOUSE_MOVEMENT_COUNT = 3 movements per interaction
#   - MOUSE_MOVEMENT_DURATION = 1 second
#   - CURVE_RECURSION_COUNT = 5 (smoothness of curves)
```

---

## Deep Dive: torr-server-automation (VPS Orchestrator)

### Architecture
```
torr-server-automation/
├── main.py                    # Entry point — server registration + main loop
├── api/
│   ├── server_autoation.py    # Base API class (auth, token management)
│   ├── server.py              # Server CRUD
│   ├── server_category.py     # Server category CRUD
│   ├── traffic.py             # Traffic FastAPI client
│   └── proxies.py             # Proxy management
├── utils/
│   ├── components.py          # Core logic: build, cancel, schedule, heartbeat
│   ├── constants.py           # Config constants
│   └── utilities.py           # Helper functions
├── scripts/                   # PowerShell update scripts
├── update/                    # Update scripts for GoLogin, MLX, Windows
├── vnc/                       # VNC files for remote viewing
├── worker_build.bat           # Main worker build script
├── ML_cli.bat                 # MultiLogin CLI login
├── mlx_agent.bat              # MultiLoginX agent launcher
├── server_cancel.bat          # Graceful cancel
├── script.bat                 # Main script launcher
├── script_restart.bat         # Restart script
└── close_stuck_session.bat    # Kill stuck browser sessions
```

### Two Server Types
1. **Admin Server**: Runs the query generator, manages other servers via VNC, runs admin scripts
2. **Worker Server**: Runs the traffic ML bot, executes queries

### Server State Machine
```
idle → building → running → canceling → canceled → idle
                    │                      ▲
                    └──── force_cancel ─────┘
```

### The Build Cycle (Daily)
Every server category has a scheduled build time:
1. **Cancel task fires** (e.g., 3:00 AM) — stops current execution gracefully
2. **Build task fires** (e.g., 3:20 AM):
   - `git stash && git checkout server && git pull origin server`
   - Kill all browser/driver processes
   - Delete MLX profiles
   - Clear temp files
   - Start `ML_cli.bat` (MultiLogin headless login)
   - Start `Build.bat` (the actual ML main.py)
   - Start `close_stuck_session.bat`
   - Update server status to "running"

### Heartbeat System
- Background thread sends POST to `/api/heartbeat/` every 100-300 seconds (randomized)
- Server Automation's Django backend tracks last heartbeat per server
- If heartbeat stops → server is considered dead

### Communication Pattern
```
Server Automation on each VPS
    │
    ├── Calls Traffic FastAPI (port 7845) for:
    │   └── parameters (proxy config, credentials)
    │
    └── Calls Server Automation's OWN Django API for:
        ├── Server registration (get_or_create)
        ├── Server status updates
        ├── Build instructions polling
        ├── Heartbeat
        └── Server category info (schedule times)
```

The Server Automation API credentials are stored in the **parameters** table of the Traffic DB under the key `SERVER_AUT_CREDENTIALS`.

---

## Browser & Anti-Detection System

### Browser Providers (Weighted Selection)

| Provider | Type | How It Works |
|----------|------|-------------|
| **MultiLoginX** | Primary | Creates "quick profiles" via API. Each profile has unique fingerprint (canvas, WebGL, fonts, etc.). Supports Selenium + Playwright via CDP. Uses token-based auth, tokens stored in `parameters.MLX_TOKENS`. |
| **GoLogin** | Secondary | Creates browser profiles via REST API. Similar fingerprint customization. Uses dev API token. Auto-generates new token if expired. |
| **MultiLogin (Legacy)** | Deprecated | Old MultiLogin (pre-X). Runs headless.exe locally. Still in code but likely not used much. |

### Profile Creation Flow (MultiLoginX)
```python
1. Select random MLX account (from MLX_TOKEN_PROBABILITY parameter)
2. Get token for that account (from MLX_TOKENS parameter)
3. Create quick profile via MLX API:
   - Name: "{browser}{random_number}"
   - OS: windows (desktop) or android (mobile campaigns)
   - Browser: mimic (Chrome-based)
   - Proxy: from query params
   - Geolocation: allow, fill based on IP
4. Start profile → get CDP websocket URL
5. Connect Selenium or Playwright via CDP
```

### Framework Selection
Per-campaign-type weights stored in `parameters.FRAMEWORK_PROBABILITY`:
```json
{
  "squidoosh": {"selenium": 0.3, "playwright": 0.7},
  "birthday": {"selenium": 0.3, "playwright": 0.7},
  ...
}
```
**Override**: Mobile campaigns (squidoosh, birthday, rocket, pgs, tiered, two_step, kgmid, local_squidoosh) on mobile proxies force **Selenium + Android** profile.

---

## Proxy System

### Proxy Types & Providers

| Type | Provider | Protocol | How Assigned |
|------|----------|----------|-------------|
| **Mobile** | ProxyPanel | SOCKS5 | From `mobile_proxies` DB table. Locked per session. IP rotated after use. |
| **Mobile** | Proxidize | HTTP | Hardware proxies. IP rotated via local API. |
| **Mobile** | xProxy | HTTP | No rotation — just status tracking |
| **Mobile** | SOAX | SOCKS5 | Cloud-based. Random port per session for new IP. |
| **Mobile** | SmartProxy Mobile | HTTP | Session-based rotation via username suffix |
| **Residential** | SmartProxy | HTTP | `gate.smartproxy.com:7000`. Session-based: unique random hex in username = unique IP |
| **Residential** | Oxylabs | HTTP | Session-based rotation |

### Proxy Assignment Flow (Query Generator)
```
Campaign: mobile_proxy_percentage = 70%
Campaign: mobileproxy_provider_percentage = {"proxypanel": 60, "soax": 40}

For each query:
  1. Random: 70% mobile / 30% residential
  2. If mobile → 60% proxypanel / 40% soax
  3. If residential → smart_proxy (from PROXIES_WITH_TYPE_AND_PERCENTAGE)
  4. Fetch proxy details from provider
  5. Generate unique session string for residential proxies
  6. Store proxy_ip, proxy_port, proxy_user, proxy_pass, proxy_server in query
```

### Proxy Lifecycle (Mobile)
```
status=0 (available) → locked by /proxies/get/active/ → status=1 (in_use)
  → after query execution → IP rotation API called → status=2 (done/rotating)
  → external process resets back to status=0
```

### Proxy Type by Browser Provider
Each proxy server type maps to different proxy protocols depending on the browser:
```python
PROXY_TYPE_BY_SERVER = {
    "proxidize":  {multilogin: HTTP,  gologin: http,  multiloginx: http},
    "proxypanel": {multilogin: SOCKS, gologin: socks5, multiloginx: socks5},
    "smart_proxy":{multilogin: HTTP,  gologin: http,  multiloginx: http},
    "soax":       {multilogin: SOCKS, gologin: socks5, multiloginx: socks5},
    "xproxy":     {multilogin: HTTP,  gologin: http,  multiloginx: http},
}
```

---

## Campaign Types — What Each One Does

### Search & Click Campaigns
| Campaign | What It Does |
|----------|-------------|
| **squidoosh** | Google Search → type keyword → find target link in results → click it → interact with site. The "bread and butter" campaign. |
| **squidoosh_2** | Variant of squidoosh with different search/click logic |
| **squidoosh_shopping** | Same as squidoosh but targets Google Shopping results |
| **local_squidoosh** | Squidoosh for local/mobile searches |
| **organic_keyword** | Google Search → type keyword → click organic result matching wildcard |
| **organic_brand** | Same as organic_keyword but with brand-focused keywords |
| **organic_bing** | Same concept on Bing instead of Google |
| **organic_google** | Generic Google organic search variant |
| **google_search_no_click** | Just perform the Google search, don't click anything |
| **two_step** | Two searches: first a general search, then a branded search |

### Direct Visit Campaigns
| Campaign | What It Does |
|----------|-------------|
| **organic_direct** | Navigate directly to URL → scroll → interact → optionally click wildcard link |
| **tiered** | Visit a list of URLs sequentially (tier 1, tier 2) → scroll each → click wildcard if present |
| **spreadsheet** | Read URLs from Google Spreadsheet → visit each one |

### Image & Birthday Campaigns
| Campaign | What It Does |
|----------|-------------|
| **birthday** | Google Search → switch to Images tab → find target image by source → click through to site |
| **birthday_amazon** | Same concept targeting Amazon product images |

### Maps Campaigns
| Campaign | What It Does |
|----------|-------------|
| **rocket** | Open Google Maps at specific coordinates → interact with business listing (CID-based) |
| **pgs** | Google Maps directions from grid of coordinates to business address |
| **kgmid** | Interact with Google Knowledge Graph entities |

### Video Campaigns
| Campaign | What It Does |
|----------|-------------|
| **youtube** | Open YouTube video → watch → click link in description |
| **yt_surge** | YouTube view generation variant |
| **lookey** | YouTube-related viewing campaign |

### E-Commerce Campaigns
| Campaign | What It Does |
|----------|-------------|
| **walmart** | Visit Walmart product pages → interact |
| **shopify** | Visit Shopify stores → interact |
| **bsr_booster** | Visit Amazon products to boost Best Seller Rank |
| **wordpress** | Visit WordPress sites → interact |
| **website_specific** | Visit specific websites with custom XPath for search field |

### Other
| Campaign | What It Does |
|----------|-------------|
| **pathfinder** | Multi-step navigation through a website |
| **hotfrog** | Interact with HotFrog business listings |
| **local_services** | Interact with Google Local Services |
| **gsite** | Google Sites interaction |
| **thanos** | Unknown from code alone — likely a specialized campaign variant |

---

## Parameters System (Runtime Config)

The `parameters` table is the **runtime configuration store**. Everything is JSON key-value pairs. Key parameters:

| Key | What It Controls | Example Value |
|-----|-----------------|---------------|
| `BROWSER_PROBABILITY` | Browser provider weights | `{"multilogin": 0.0, "gologin": 0.4, "multiloginx": 0.6}` |
| `FRAMEWORK_PROBABILITY` | Selenium vs Playwright weights per campaign | `{"squidoosh": {"selenium": 0.3, "playwright": 0.7}, ...}` |
| `MLX_TOKEN_PROBABILITY` | Which MLX accounts to use | `["jimmykelley19@gmail.com"]` |
| `MLX_TOKENS` | Auth tokens per MLX account | `{"user@email.com": "eyJ..."}` |
| `MLX_FOLDER_IDS` | Profile folder IDs per MLX account | `{"user@email.com": "abc123"}` |
| `GOLOGIN_TOKEN` | GoLogin API token | `{"gologin_token": "eyJ..."}` |
| `CAPTCHA_KEY_PROBABILITY` | Captcha solver weights | `{"nopecha": 0.9, "capsolver": 0.1}` |
| `PROXY_API_URL` | Proxy rotation API URLs | `{"proxypanel": "https://...", "proxidize": "http://..."}` |
| `PROXY_CREDENTIALS` | Proxy provider auth | `{"proxypanel": {"api_key": "..."}, "proxidize": {"token": "..."}}` |
| `SENTRY_SDK_KEY` | Sentry error tracking key | `{"sentry_sdk_key": "https://..."}` |
| `SERVER_AUT_CREDENTIALS` | Server Automation API config | `{"SERVER_AUTOMATION_API_URL": "http://...", "SERVER_AUTOMATION_USERNAME": "...", "SERVER_AUTOMATION_PASSWORD": "..."}` |
| `GET_QUERY` | Query selection settings | `{"ignored_queries": ["proxidize"]}` |

These parameters can be changed **without redeploying** — the ML workers fetch them fresh via `GET /parameters/` on every query execution.

---

## Monitoring & Observability

### Logging
- **File logging**: Daily log files in `log/` directory, auto-deleted after 7 days
- **Grafana Loki**: All logs also sent to Loki with tags: hostname, IP, program name, service
- **Sentry**: Exception tracking with DSN from parameters table

### Metrics Tracked
- Session duration per query
- Bandwidth used per session
- CAPTCHA retry count
- Success/failure rate per campaign, project, server
- Proxy health (screenshots stored in `proxy_status` table)

### Real-Time Monitoring
- `running_server_details` table: what query each server is currently running
- `query_status.txt` on each VPS Desktop: current query status
- `server_built_status.txt`: server state (busy/idle)

### Screen Recording
Optional screen recording of browser sessions (enabled via `RECORD_SCREEN` env var):
- Records to `recordings/{date}/{campaign_type}/{query_id}.mp4`
- Auto-deleted after configurable days
- **Aborted** (deleted) on success, **kept** on failure for debugging

---

## Maps Booster (External)

Based on the campaign types in the codebase, the **Maps Booster** dashboard (separate repo you don't have) likely creates campaigns of these types:
- **rocket** — Google Maps CID-based interactions with coordinate grids
- **pgs** (Place Grid Search) — Google Maps directions from a grid of source coordinates
- **local_squidoosh** — Local/mobile Google search campaigns
- **kgmid** — Knowledge Graph entity interactions

These campaign types have special query generation:
- **Rocket**: Generates a grid of lat/lng coordinates around the business, creates Google Maps URLs with the CID
- **PGS**: Takes source coordinates from `extra_attr.source_coordinates` (with `immediate`, `nearby`, `extended` sections), generates Google Maps direction URLs

The Maps Booster likely has its own UI for:
- Setting up business locations (address, coordinates)
- Configuring search grids (radius, density)
- Managing GMB CIDs
- Monitoring local ranking impact

---

## Environment & Deployment

### Central Server (Docker)
```
┌─────────────────────────────┐
│  Docker Host                │
│  ├── FastAPI container      │
│  │   Port 7845              │
│  │   MySQL connection       │
│  │                          │
│  ├── Dashboard container    │
│  │   Port 80/443            │
│  │   MySQL + FastAPI conn   │
│  │                          │
│  └── MySQL container        │
│      Port 3306              │
└─────────────────────────────┘
```

### Each Windows VPS Worker
```
Desktop/
├── Server_Automation/        (or torr-server-automation/)
│   ├── main.py               # Always running
│   ├── pid.txt               # Process tracking
│   ├── torrential_pid.txt    # ML process tracking
│   └── .env                  # Local config
├── torr-traffic-ml/          (or wherever ML is cloned)
│   ├── main.py               # Started by build script
│   └── .env                  # Local config
├── Build.bat                 # Starts ML main.py via pipenv
├── server_built_status.txt   # "busy" or empty
├── query_status.txt          # Current query info
└── cmds_status.txt           # "continue" or "cancel"
```

### Environment Variables (ML Worker .env)
Key variables each worker needs:
- `HOST_URL` — FastAPI base URL (e.g., `http://67.227.136.130:7845/`)
- `USER_NAME`, `PASS_WORD` — FastAPI login credentials
- `GOLOGIN_TOKEN` — GoLogin API token (can also come from DB parameters)
- `SMART_PROXY_USER`, `SMART_PROXY_PASSWORD` — SmartProxy credentials
- `LOKI_ENDPOINT`, `LOKI_USERNAME`, `LOKI_API_KEY` — Grafana Loki logging
- `LOKI_LOG_HOSTNAME` — Server name for log identification
- `RECORD_SCREEN` — Enable/disable screen recording
- `TIME_ZONE` — Server timezone (default: US/Central)

---

## Key Risks & Bus-Factor Items

### Critical Knowledge Areas
1. **Parameters table values** — The system's behavior is heavily driven by the `parameters` table. Without knowing what values are in there (browser weights, proxy configs, MLX tokens, etc.), you can't reproduce the setup.

2. **Server Automation's own Django API** — This repo (`torr-server-automation`) is a CLIENT of a separate Django REST API that manages servers. That API's code is NOT in any of these repos. You need to find it or understand its endpoints.

3. **Maps Booster Dashboard** — Creates rocket/pgs/local_squidoosh campaigns. Without it, those campaign types can't be created (unless done manually via API).

4. **MLX Account Tokens** — MultiLoginX requires paid accounts. Tokens expire and need renewal. The system has auto-renewal logic but it depends on valid credentials in the parameters table.

5. **GoLogin Token Rotation** — GoLogin tokens expire. The system auto-generates new ones using a dev API key + 2FA token stored in parameters.

6. **Proxy Provider Accounts** — ProxyPanel, Proxidize, SOAX, SmartProxy, Oxylabs all require active paid accounts with API keys.

7. **Google Search Selectors** — The XPath locators in `locators/` are brittle — Google changes their HTML frequently. These need regular maintenance.

8. **Windows-specific** — The entire worker infrastructure assumes Windows (batch files, `schtasks`, `pyautogui`, `pygetwindow`, MultiLogin headless.exe). No Linux worker support.

9. **Hardcoded IPs** — Several default IPs are hardcoded in constants (FastAPI server, proxy rotation endpoints). These would need updating if infrastructure changes.

10. **The `server` git branch** — Worker VPS machines check out the `server` branch, not `main`. Code must be merged to `server` for workers to get updates.
