# AI Usage Dashboard (Local Only)

Local dashboard that shows Claude Code and Codex usage side by side in one place.

This project is intentionally local-only and is not designed for SaaS or deployment.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Local API routes
- Optional Playwright automation
- Local cache (JSON files under `data/`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values you want to use:

```bash
cp .env.local.example .env.local
```

3. Start dashboard:

```bash
npm run dev
```

4. Optional CLI refresh from terminal:

```bash
npm run refresh
```

Open `http://localhost:3000`.

## Environment Variables

Defined in `.env.local.example`:

- `CLAUDE_STATUS_COMMAND` - local command to print Claude usage/status.
- `CODEX_STATUS_COMMAND` - local command to print Codex usage/status.
- `CODEX_USAGE_URL` - usage/settings URL for Codex/ChatGPT plan page.
- `CLAUDE_USAGE_URL` - reserved for future browser automation.
- `PLAYWRIGHT_PROFILE_DIR` - persistent browser profile path for Playwright.

Never commit real credentials or tokens.

## Commands

- `npm install`
- `npm run dev`
- `npm run refresh`
- `npm run playwright:codex` (optional browser fallback)

### Optional Bash Manager

You can manage the app with one script:

```bash
./scripts/dashboard.sh setup
./scripts/dashboard.sh start
./scripts/dashboard.sh status
./scripts/dashboard.sh refresh
./scripts/dashboard.sh stop
```

Also available:

- `./scripts/dashboard.sh restart`
- `./scripts/dashboard.sh logs`
- `./scripts/dashboard.sh playwright-codex`
- `./scripts/dashboard.sh clean-cache`

## Where Logic Lives

- Shared types: `types/usage.ts`
- Cache + manual JSON storage: `lib/cache.ts`
- Fetch orchestration/fallback order: `lib/usage-service.ts`
- Claude provider adapter: `providers/claude.ts`
- Codex provider adapter: `providers/codex.ts`
- Provider API routes:
  - `GET/POST /api/usage/[provider]`
  - `POST /api/usage/refresh`

## Data Strategy and Fallbacks

Each provider attempts:

1. Live source (CLI/local files/scraped output)
2. Manual JSON snapshot
3. Cached last successful snapshot
4. Unknown status (safe fallback)

If live fetch fails, the UI shows a warning such as:

`Could not fetch live Codex usage. Showing last cached snapshot.`

## Playwright Local Browser Flow

Use:

```bash
npm run playwright:codex
```

The script launches Chromium in persistent profile mode:

- You can sign in manually once.
- Cookies/session stay local in profile directory.
- No hardcoded username/password.

Script output is saved to `data/playwright/codex-latest.json`, then used by `providers/codex.ts`.

## Manual JSON Update in UI

Each card includes a "Manual JSON update" section.

You can paste JSON such as:

```json
{
  "fiveHourUsagePercent": 38,
  "weeklyUsagePercent": 52,
  "resetTime": "2026-05-01T00:00:00Z",
  "status": "warning"
}
```

This is saved locally and also cached so the dashboard stays useful even when live adapters are incomplete.
