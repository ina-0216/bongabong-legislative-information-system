# B-LIS (iBOSys)

Bongabong Legislative Information System is a monorepo for managing municipal legislative records and publishing public civic information.

## Applications and packages

- `server/` — Express API and MongoDB/Mongoose models.
- `client/` — React and Vite administration app.
- `public-portal/` — React and Vite public portal.
- `mobile-app/` — Expo and React Native companion app.
- `packages/api/`, `packages/ui/`, `packages/design-tokens/` — shared frontend packages.

Each directory has its own `package.json`, lockfile, and install boundary. There is no root npm workspace. Use Node.js `22.23.2` to match CI.

## Local setup

Install dependencies separately in each workspace you plan to run. For a fresh web app checkout, build the shared packages first:

```powershell
cd packages/design-tokens
npm ci
npm run build
cd ../ui
npm ci
npm run build
cd ../api
npm ci
npm run build
```

The package example ends in `packages/api/`. Return to the repository root with `cd ../..`, then install the app you plan to run. For example:

```powershell
cd client
npm ci
```

From the repository root, use `cd public-portal`, `cd mobile-app`, or `cd server` instead if you are setting up a different app.

Copy the relevant `.env.example` to a local `.env` and fill in the values required for that workspace. Keep credentials out of Git. The server needs a configured MongoDB connection; see `server/.env.example` for its variables. Frontend API settings are documented in each app's `.env.example`.

## Common commands

Run commands from the workspace directory:

| Workspace | Start locally | Checks |
| --- | --- | --- |
| `server/` | `npm run dev` | `npm test` |
| `client/` | `npm run dev` | `npm run lint`, `npm test`, `npm run build` |
| `public-portal/` | `npm run dev` | `npm run lint`, `npm test`, `npm run build` |
| `mobile-app/` | `npm start` | `npm run lint`, `npm run typecheck`, `npm test` |
| `packages/api/` | — | `npm run typecheck`, `npm test`, `npm run build` |
| `packages/ui/` | — | `npm run typecheck`, `npm test`, `npm run build` |
| `packages/design-tokens/` | — | `npm run typecheck`, `npm run build` |

The GitHub Actions workflows are in `.github/workflows/`. `ci.yml` runs the cross-workspace pipeline for pull requests into `main` and `develop`; `verify.yml` runs the public portal and shared-package verification on pushes and pull requests.

## Repository notes

- Keep installs and lockfile changes within their owning workspace; do not add a root workspace.
- Keep local environment files, uploads, backups, generated builds, and personal agent workspaces out of commits.
- Build `design-tokens`, `ui`, and `api` before building either web app on a fresh checkout.
- See `docs/dependency-policy.md` for dependency alignment and update rules.
