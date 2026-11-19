# Project Guidelines & Agent Instructions

This file is the current project guidance. The referenced `.agents/rules/` directory
is not present in this checkout, so no separate rule files are configured.

## Repository layout
- **Single monorepo** (Option A): `client/` (admin), `public-portal/`, `mobile-app/` (Expo), `packages/{api,ui,design-tokens}`, `server/`, `.github/`.
- **Remote**: `origin` points to `https://github.com/christian-james-garcia/ibosys-api.git` (historical name; treat as monorepo). 
- **Tracking**: application workspaces are tracked. Local commits only in normal operation; do not push/deploy without explicit approval.
- **Secrets**: only `.env.example` files should be tracked. Never commit `.env*` values, credentials, tokens, or keys.

## Quick Reference
- **UI Stack**: Tailwind CSS 4 + shared `@ibosys/ui` · Clean Light Theme · Emerald accents · No dark mode
- **Component dirs**: `packages/ui/src/` (shared) · `client/src/components/` · `public-portal/src/components/`
- **Backend**: Express + MongoDB · Zod validation on all mutations
- **System routes**: `server/routes/system.js` + `server/controllers/systemController.js` only
- **Before coding**: Query SecondBrain · After coding: Sync SecondBrain + run `npm run build`

## Dependencies
- **Node.js**: CI uses `22.23.2` across the app workspaces. See `docs/dependency-policy.md` for alignment rules, intentional exceptions, and verification commands.
- **Installs**: each app and shared package has its own lockfile and install boundary; build shared packages before either web app on a fresh checkout.
- **Never**: `npm audit fix --force`, downgrade core SDKs to clear advisories without review, merge lockfiles across workspaces, or add root workspaces that change install boundaries.
