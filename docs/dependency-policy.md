# Dependency Policy

## Supported runtime
- **Node.js**: `22.23.2` across CI and the Render API blueprint. This meets the current lockfiles' Node 22 engine requirements. The app workspaces declare `engines.node: 22.23.x` so local installs follow the tested CI runtime.
- **Package manager**: npm (use workspace-local `npm ci` or `npm install`).

## Alignment rules
- Prefer patch/minor alignment across web apps and shared packages where semver-compatible and build/tests pass.
- Keep intentional exceptions documented (see below). Do not "force-align" when doing so crosses an SDK or framework boundary.
- Never run `npm audit fix --force`. Evaluate advisories by path and shipped artifacts; do not downgrade core SDKs to clear transitive findings without a compatibility review.
- Do not merge lockfiles or introduce a root `npm` workspace with shared hoisting that changes each app's install boundary.
- Do not upgrade major versions of framework/toolchain dependencies (Express, Mongoose, Multer, Expo SDK, React Native, Vite major, etc.) as part of routine alignment.

## Intentional exceptions
| Area | Pinned/exception | Rationale |
|---|---|---|
| Mobile app | React `19.3.0`, React DOM `19.3.0` (overridden), Expo SDK 58 / React Native `0.88.1`, ESLint 8 + `@typescript-eslint` 7 | Keep Expo, React, and React Native aligned to SDK 58. The Node runtime follows the shared CI version `22.23.2`; run mobile checks and an EAS production build when changing this SDK boundary. |
| Shared packages | TypeScript `^5.0.0` (keep at 5.x for now) | Avoid cross-workspace TS 6 migration churn; mobile is already `~6.0.3` but uses isolated config. |
| Public portal | `oxlint` (separate lint strategy) | Existing project convention. |
| Server | Mammoth `+` argparse patch retained via `postinstall` | See `docs/deployment-environment.md` for details. |

## Update procedure
1. Change the manifest in the affected workspace(s).
2. Run `npm install` in that workspace to update `package-lock.json` (use `npm ci` in CI).
3. Build/typecheck/test in the affected workspace.
4. For shared packages, build before dependent apps if their aliases resolve to `dist/`.
5. Run `npm audit` per workspace; report advisories with path and whether they ship in production artifacts.
6. Document any new exception in this policy and in `AGENTS.md`.

## Verification commands (baseline)
- `server`: `npm run lint && npm run test:ci`
- `client`: `npm run lint && npm run test:ci && npm run build`
- `public-portal`: `npm run verify`
- `mobile-app`: `npm run lint && npm run typecheck && npm run test:run && npx expo install --check && npx expo-doctor`
- `packages/api`: `npm test && npm run typecheck && npm run build`
- `packages/ui`: `npm test && npm run typecheck && npm run build`
- `packages/design-tokens`: `npm run typecheck && npm run build`
