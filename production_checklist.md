# Production Deployment Checklist for iBOSys

If you are handing this system over to the Municipality of Bongabong for actual, real-world use, there are critical changes you must make. Deploying a local development project to the internet without these changes exposes the municipality to data loss, hacking, and application crashes.

Here is a comprehensive checklist categorized by priority.

> [!CAUTION]
> **Cloudinary Credentials Required**
> Uploaded images and PDFs are **not** written to a local `uploads/` folder. Verified: all 5 multer instances use `multer.memoryStorage()` and every upload controller streams `req.file.buffer` to Cloudinary (`uploadToCloudinary`), so there is no local disk folder to lose.
>
> **However:** if `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are not configured, image and document uploads will fail. The `/api/health` endpoint reports `cloudinary: "missing"` in that case. Configure Cloudinary (section 1) before go-live.

## 1. Environment Variables & Secrets (CRITICAL)
Your `server/.env` file currently contains local and insecure data.

- [ ] **Database Connection:** Change `MONGODB_URI` from `mongodb://localhost:27017/ibosys` to a cloud database URL (e.g., MongoDB Atlas). Do not run a local database on the production server.
- [ ] **JWT Secret:** Change `ibosys_jwt_secure_super_secret_key_2026` to a long, truly random string (e.g., generated via `openssl rand -base64 32`). If hackers guess your JWT secret, they can log in as the System Admin without a password.
  - Partial mitigation in place: `server/server.js` now **refuses to boot when `NODE_ENV=production`** and `JWT_SECRET` is shorter than 32 chars or still a placeholder. Verified: both a placeholder value and a short value exit with code 1 **before** any database connection. Local development stays permissive. The real secret was deliberately **not** rotated automatically — rotation invalidates all issued sessions and must be an owner decision.
- [ ] **Frontend URL:** Change `FRONTEND_URL=http://localhost:5173` to the actual purchased domain name (e.g., `https://ibosys.bongabong.gov.ph`). This is used for password reset emails; if left as localhost, the emails will have broken links.
- [ ] **Portal URL:** Change `PORTAL_URL=http://localhost:5174` to the actual public portal domain.
- [ ] **Email Provider:** Configure one supported provider on the server: `EMAIL_PROVIDER=brevo` with `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`, `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, or SMTP with `EMAIL_USER` and `EMAIL_PASS`. Render Free requires an HTTPS provider (Brevo or Resend); do not rely on outbound SMTP.
- [ ] **Cloudinary:** Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for image uploads.
- [ ] **Redis:** Configure `REDIS_URL` for session/caching (currently optional but recommended for production).
- [ ] **API URL for frontends:** Set `VITE_API_URL` in client and public-portal to the production API domain (e.g., `https://api.ibosys.bongabong.gov.ph`).

## 2. Security Enhancements — **MOSTLY COMPLETE** ✅
- [x] **CORS Restricted:** `server.js` now uses explicit `allowedOrigins` array gated by `NODE_ENV !== 'production'` — only configured `FRONTEND_URL` and `PORTAL_URL` allowed in production. No wildcard `origin: true`.
- [x] **Helmet Installed:** `helmet` applied in `server.js` with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
- [x] **Rate Limiting Applied:** `express-rate-limit` configured in `server.js`:
  - General: 600 req/15min on `/api/`
  - Auth: 20 req/15min on `/api/auth/login`, `/api/auth/forgot-password`
  - OTP: 10 req/10min on `/api/public/send-otp`
- [x] **Login Lockout Abuse:** Login throttling is IP-based, so unauthenticated callers cannot lock a victim's account by repeatedly guessing their password.
- [x] **Temporary Password Enforcement:** The API blocks protected operations until the signed-in user changes a temporary password; the user's own profile lookup and own password-change endpoint remain available.
- [x] **Security Headers:** Helmet handles CSP, HSTS, X-Frame-Options, etc.
- [ ] **CSP Tuning:** Review/adjust Helmet CSP for inline styles/scripts used by Vite/React in production (may need `script-src-attr 'unsafe-inline'` for Tailwind v4).

## 3. Remove Demo & Migration Routes — **COMPLETE** ✅
- [x] **Removed from `server/routes/system.js`:** `/fix-terms`, `/fix-member-terms`, `/delete-residents`, `/migrate-names`, `/seed-demo-data`.
- [x] **Remaining in `system.js` (kept for admin utility):** `/sync-vice-mayors`, `/migrate-committees` — both protected by `protect` + `authorize(ROLES.SYSTEM_ADMIN)`.

## 4. File Storage Strategy (Images & PDFs) — **CODE COMPLETE** ⚠️ config pending
- [x] **No Local Disk Storage:** Verified — all 5 multer instances use `multer.memoryStorage()` (`announcements.js`, `ordinances.js`, `public.js`, `sbmembers.js`, `users.js`), and there is **no** `uploads/` folder, no `diskStorage()`, and no `express.static('uploads')` mount anywhere in `server/`.
- [x] **All Uploads Go To Cloudinary:** Verified — `announcementController` (cover image, with old-image cleanup), `ordinanceController` (PDFs via `resource_type: 'raw'`), `publicController` (ID image, private + signed URLs), `sbMemberController`, and `users.js` all call `uploadToCloudinary(req.file.buffer, ...)`; deletions call `deleteFromCloudinary` to avoid orphans.
- [ ] **Cloudinary Credentials:** Still required — set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (section 1). Until then uploads fail and `/api/health` reports `cloudinary: "missing"`.
- [ ] **PDF Generation:** `puppeteer` used in `reportController.js` for PDF reports. Ensure production host has Chromium dependencies (fonts, graphics libs) or consider serverless PDF service.

## 5. Puppeteer (PDF Generation)
- [ ] **Server Requirements:** Puppeteer downloads a full version of Chromium. When you deploy to a Linux server (like Render or DigitalOcean), it will likely crash unless you install specific Linux system libraries (fonts, graphics libraries) required by Chromium. Look up the specific deployment instructions for Puppeteer on your chosen hosting provider.

## 6. Hosting & Domain setup
- [ ] **SSL/HTTPS:** Ensure that the final domain uses HTTPS. Browsers will block geolocation, camera access, and display "Not Secure" warnings if you use HTTP.
- [ ] **PM2 or Docker:** Do not use `nodemon` or `node server.js` directly to run the server in production. Use a process manager like **PM2** (`pm2 start server.js`) so that if the app crashes, it automatically restarts itself.
- [ ] **Frontend Hosting:** Deploy `client` (admin) and `public-portal` to static hosting (Vercel, Netlify, or Cloudflare Pages) with `VITE_API_URL` pointing to production API.
- [ ] **Health Checks:** `/api/health` returns 503 if DB or Redis down — configure load balancer / uptime monitor to hit this.
- [!NOTE]
> Everything in sections 1, 4, 5, 6, and 10 requires owner-provided credentials, purchased domains, or production infrastructure (Atlas, Cloudinary, Redis, a server, an npm account). None of it can be completed from the codebase alone, so these stay open by design.

## 7. CI/CD & Build Verification — **COMPLETE** ✅
- [x] **GitHub Actions Workflow:** `.github/workflows/ci.yml` exists and runs on PR/push. Verified jobs: `build-packages`, `packages-ui-test`, `lint-build-test`, `verify-token-bridge`, `dependency-audit`, `check-openapi-sync`.
  - `build-packages` matrix: `packages/design-tokens`, `packages/ui`, `packages/api` (build + typecheck, then uploads `dist` artifacts).
  - `lint-build-test` matrix: `server` (test), `client` (lint/test/build), `public-portal` (lint/test/build), `mobile-app` (lint + typecheck).
  - App jobs restore the shared `dist` artifacts (`shared-dist-design-tokens`, `shared-dist-ui`, `shared-dist-api`) so `@ibosys/*` workspace aliases resolve in CI.
- [x] **Dependency Audit:** `npm audit --audit-level=high` runs as a 7-workspace CI matrix job and fails on high/critical. Verified result: **0 high, 0 critical** across `server`, `client`, `public-portal`, `packages/design-tokens`, `packages/ui`, `packages/api`, `mobile-app`.
  - Remaining advisory: 1 low severity in `packages/api` (non-blocking).
- [x] **Test Coverage:** `server` (69 tests), `packages/api` (55), `client` (28), `public-portal` (12), `packages/ui` — all green.
- [!NOTE]
> CI has been verified **locally** (workflow parses, all matrix scripts/lockfiles exist, gates reproduce locally, all artifact uploads/downloads are paired). Actual GitHub-hosted execution has **not** been observed, because this working copy has no `.git` and no remote. Push the repository to confirm the workflow runs green on CI.

## 8. API Documentation & Client Sync — **MOSTLY COMPLETE** ✅
- [x] **OpenAPI Spec Sync:** `docs/openapi.yaml` is in sync with the server. Verified by enumerating all 80 unique `(method, path)` declarations across the 14 route files in `server/routes/` and composing each with its mount prefix from `server/server.js`: **every documented server endpoint resolves to a spec path (0 undocumented)**.
  - Two known, non-blocking notes:
    1. `/health` is defined app-level in `server.js`, not in a router file, so route-file enumeration does not list it (it is documented in the spec).
    2. The admin maintenance routes `POST /sync-vice-mayors` and `POST /migrate-committees` are documented under the `/system/...` prefix, but `server.js` mounts `routes/system.js` at bare `/api`. Their real URLs are therefore `/api/sync-vice-mayors` and `/api/migrate-committees`. Both are `protect` + `authorize(ROLES.SYSTEM_ADMIN)` admin utilities (see section 3), not public API.
  - The CI job `check-openapi-sync` validates spec **structure** (existence, `openapi: 3.0`, `info`, `paths`, `components`) — it does **not** diff routes against the spec. A future scope could add a real route-vs-spec differ.
- [x] **Shared API Client:** `client/src/utils/api.js` + `public-portal/src/utils/api.js` now delegate to the `@ibosys/api` workspace package, eliminating duplicated axios/factory logic.
  - Package exports fixed to match real build artifacts: ESM `dist/index.js` + `dist/index.d.ts`, CJS `dist/index.cjs` + `dist/index.d.cts`.
  - Both apps alias `@ibosys/api` in `vite.config.js` **and** `vitest.config.js`; adapter contract tests added (client 28, public-portal 12) to lock the existing call surface.
- [x] **API Port Consistency:** All dev fallbacks now agree on **port 5001**, matching `server/server.js` (`process.env.PORT || 5001`), the Vite dev proxy, `@ibosys/api`, and every committed `.env`. Previously `client/src/utils/api.js`, `UserAvatar.jsx`, `EncodeOrdinance.jsx`, `UsersList.jsx`, `OrdinanceDetail.jsx`, `Profile.jsx` and `public-portal/src/utils/api.js` fell back to `:5000`, and `client/src/pages/SBMembers.jsx` + `NewsAdmin.jsx` hard-coded `http://localhost:5000` for image `src` while ignoring `VITE_API_URL` entirely. Those two are now env-derived, so media loads work on a fresh clone without a `.env`.

## 9. Mobile App — **MOSTLY COMPLETE**
- [x] **Environment Config:** `mobile-app/.env.example` exists with `EXPO_PUBLIC_API_URL=http://localhost:5001/api` plus documented production/LAN values.
- [x] **CI Integration:** `mobile-app` added to the `lint-build-test` matrix (lint + typecheck + vitest). Fixed to pass: deprecated `baseUrl` removed, explicit Node/React types, unused imports removed, ESLint TS config added, `@xmldom/xmldom` pinned via `overrides` to clear the high advisory, and a `test:run` gate wired to the shared `Test` step.
- [x] **Implement Source Code:** The expo-router `app/` tree implements all eight declared routes — `index`, `documents`, `document/[id]`, `sessions`, `members`, `committees`, `news`, `news/[id]`, `feedback` — against the real `/api/public/*` contracts. `src/utils/api.ts` was rewritten to the verified server shapes (`Paginated{docs,total,page,pages}`, `NewsPage{data,...}`, counter-style `PublicStats`, binary minutes PDF) with a typed `get`/`post` layer that reflects the interceptor's body-unwrapping. Covered by `src/utils/api.test.ts` (24 tests) plus `tsc --noEmit` over `app/**/*`.
- [x] **Dead Code Removed:** `App.jsx` and `App.tsx` were unreferenced (entry is `expo-router/entry`) and have been deleted; `client/src/App.jsx` and `public-portal/src/App.jsx` are separate files and were left untouched.
- [x] **View Logic Under Test:** Screen behaviour is delegated to `src/utils/selectors.ts` (`groupLatest`, `documentQueryParams`, `hasNextPage`, `validateFeedback`, `statusTone`, `memberName`, `initials`, `formatDate`) and covered by 26 unit tests. The screens import these helpers, so the tests guard real rendering paths rather than duplicated inline logic.
- [ ] **Render-Level Screen Tests:** **BLOCKED** — investigated and reverted, root cause now understood precisely (environment limitation, not application code).
  - `@testing-library/react-native@13.3.3` + `react-test-renderer@19.2.3` install cleanly, so the blocker is purely the module pipeline.
  - Flow stripping itself works: `babel-preset-expo@57.0.13` (already installed, bundles `@babel/plugin-transform-flow-strip-types`) removes `import typeof * as ReactNativePublicAPI from './index.js.flow'` and type annotations such as `const warnedKeys: {[string]: boolean}`. Verified directly, output re-parses cleanly under both acorn and esbuild.
  - The real blocker: `react-native@0.86.3/index.js` is **authored as CommonJS** (lazy `get` accessors over `module.exports`), so no Babel caller/preset combination can rewrite its `require('./Libraries/**')` calls into ESM imports. Vite therefore hands the nested `Libraries/**` files to Node directly, and Node parses unstripped Flow — surfacing as V8's `SyntaxError: Missing initializer in const declaration`. Confirmed by probing which module ids reach the transform pipeline (only `react-native/index.js`, never its children).
  - Considered and ruled out: `server.deps.inline: true`, `@babel/plugin-transform-react-jsx` with Flow stripping, `@babel/preset-typescript`, and `caller.supportsStaticESM` — none convert the authored-CJS entry point.
  - Correct remediation (requires a separate scoped decision): switch the RN render tests to Jest, which uses React Native's own published Jest preset and Babel/Metro transform chain (`@react-native/jest-preset`), rather than forcing vitest to emulate Metro. Alternative is a prebuilt CJS bundle of `react-native` published by Metro.
- [ ] **Production Build:** `eas build --platform all` with production API URL. (Requires EAS account + Expo config — owner action.)

## 10. Shared Package Publishing — **PENDING** (blocked: npm owner action)
- [ ] **Publish `@ibosys/design-tokens`** to npm (public, scoped).
- [ ] **Publish `@ibosys/ui`** to npm (public, scoped).
- [ ] **Update Frontend Deps:** Change `vite.config.js` aliases to use published versions (or keep workspace protocol for monorepo).
- [!NOTE]
> Publishing requires an npm organisation/account, scope ownership, and `NPM_TOKEN` credentials. This cannot be performed without owner-provided credentials. The packages are currently consumed via workspace source aliases, which is the correct pattern for a monorepo — publishing is only required if a third party is to consume them.

---

## Quick Verification Commands (Run Before Deploy)

```bash
# Server
cd server && npm run build 2>&1 | tail -5   # No build step, but: node --check server.js
cd server && npm run lint 2>&1              # If lint script exists
cd server && npm run test:run 2>&1          # Vitest: 50+ validation tests

# Client (Admin)
cd client && npm run build 2>&1 | tail -5   # ✓ built in ~2s
cd client && npm run lint 2>&1              # 0 errors
cd client && npm run test:run 2>&1          # 8 tests pass

# Public Portal
cd public-portal && npm run build 2>&1 | tail -5  # ✓ built in ~2s
cd public-portal && npm run lint 2>&1             # 3 fast-refresh warnings only
cd public-portal && npm run test:run 2>&1         # 2 tests pass

# Shared Packages
cd packages/design-tokens && npm run build 2>&1   # 191 token defs in dist/tokens.css
cd packages/ui && npm run build 2>&1              # 17 components, types emitted
```
