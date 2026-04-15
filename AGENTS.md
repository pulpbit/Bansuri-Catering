# Bansuri Catering System

## Project Structure
- `frontend/` - Static HTML/CSS/JS (vanilla, no framework)
- `Backend/` - Cloudflare Workers API (Hono + D1)
- `Package_menu.json` - Menu data source (regenerates `menus.js`)

## Commands
```bash
# Backend
cd Backend
npm run dev    # Local dev server (wrangler dev)
npm run deploy # Deploy to Cloudflare Workers

# Frontend - any static server works
npx serve frontend
# Or open index.html directly in browser
```

## Workflow Notes
- After changes, append a summary to `README.md` under "Recent progress"
- `Package_menu.json` generates `frontend/assets/js/data/menus.js` - regenerate after menu updates
- No lint/typecheck/test tooling configured

## Environment
- Backend uses Cloudflare D1 (SQLite) - database ID: `315a68fa-db5c-4b06-a6f3-1ab19ff7253e`
- Admin credentials in `wrangler.toml` (dev only)