# Bansuri Catering

This repository currently contains a static frontend scaffold for the catering lead-capture flow.

## Project layout

- `frontend/` – static website (Cloudflare Pages target)
- `backend/` – reserved for Cloudflare Workers + Hono APIs

## Current frontend capabilities

- 5-step event planning wizard
- single package selection (Bliss, Epicure, Maharaja's Feast)
- section-wise menu selection per package
- auto menu suggestion based on package + event type + guest count
- localStorage draft persistence

## Menu data source

- `package.pdf` is used as the base source for menu categories and item options.
- Normalized menu sections are stored in `frontend/assets/js/data/menu-catalog.js`.

## If you are using Codex Web (no local clone)

You can still push from the Codex environment, but Git needs two things:

1. A remote URL
2. Credentials (GitHub token)

### 1) Configure remote

```bash
git remote add origin https://github.com/pulpbit/Bansuri-Catering.git
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/pulpbit/Bansuri-Catering.git
```

### 2) Authenticate safely

Use GitHub CLI if available:

```bash
gh auth login
```

Or use HTTPS push and enter username + PAT when prompted:

```bash
git push -u origin work:main
```

> Never paste Personal Access Tokens in chat messages. Revoke exposed tokens immediately and create a new one.

## Cloudflare Pages quick deploy

1. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Select this GitHub repository.
3. Set:
   - Framework preset: `None`
   - Build command: *(empty)*
   - Build output directory: `frontend`
4. Deploy.

## Frontend validation command

```bash
for f in frontend/assets/js/app.js frontend/assets/js/wizard.js frontend/assets/js/components/renderers.js frontend/assets/js/data/packages.js frontend/assets/js/data/menu-catalog.js frontend/assets/js/utils/helpers.js frontend/assets/js/utils/validators.js frontend/assets/js/utils/menu-engine.js frontend/assets/js/services/store.js; do node --check "$f"; done
```
