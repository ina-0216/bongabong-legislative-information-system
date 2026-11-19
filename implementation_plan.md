# iBOSys Implementation Plan — Fixes & Hardening

> Derived from project analysis. Each task has acceptance criteria (AC) and verification steps. Execute in priority order.

---

## Priority 0 — Security & Production Blockers (Must Fix Before Deploy)

### P0-1 Remove/Draw System Migration Routes
**Files:** `server/routes/system.js`, `server/controllers/systemController.js`
**AC:**
- Routes `/api/system/fix-terms`, `/fix-member-terms`, `/delete-residents`, `/migrate-names`, `/seed-demo-data` return 410 Gone (or deleted)
- `/sync-vice-mayors` and `/migrate-committees` remain (admin utilities)
- No route can drop/seed production data

### P0-2 Harden CORS to Exact Domains
**File:** `server/server.js` (lines 38–57)
**AC:**
- `allowedOrigins` array contains only production domains (no wildcards)
- Localhost entries removed or gated by `NODE_ENV !== 'production'`
- Requests from unauthorized origin return 403

### P0-3 Add Compound Unique Index on ConsultationFeedback
**File:** `server/models/ConsultationFeedback.js`
**AC:**
```js
ConsultationFeedbackSchema.index(
  { ordinanceId: 1, full_name: 1, contact_number: 1 },
  { unique: true }
);
```
- Duplicate submission rejected at DB level (E11000) → controller maps to 409
- Existing duplicate data cleaned before index creation (migration script)

### P0-4 Protect Public PDF Download
**File:** `server/routes/reports.js` line 26
**AC:**
- `GET /api/reports/document/:id` requires `protect` middleware
- Role check: `authorize(ROLES.SECRETARY, ROLES.VICE_MAYOR, ROLES.SB_MEMBER, ROLES.SYSTEM_ADMIN)`
- Unauthenticated users get 401

### P0-5 Create `.env.example` for All 4 Apps
**Files:** `client/.env.example`, `public-portal/.env.example`, `server/.env.example`, `mobile-app/.env.example` (exists)
**AC:**
- Each file lists all required vars with placeholder values
- No real secrets committed
- `server/.env.example` includes: `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `CLOUDINARY_*`, `EMAIL_*`, `FRONTEND_URL`, `PORTAL_URL`

---

## Priority 1 — Data Integrity & Reliability

### P1-1 Add Automated Test Harness
**Files:** `client/package.json`, `server/package.json`, `public-portal/package.json`
**AC:**
- `npm test` runs in each workspace
- CI script: `test:ci` (no watch, exit code on failure)
- Framework: Vitest (client/public-portal), Jest or Vitest (server)
- Coverage threshold: ≥60% on controllers/services

### P1-2 Add Request Validation Tests
**File:** `server/validations/*Validation.js`
**AC:**
- Every Zod schema has a test file validating: happy path, missing required, invalid enum, malformed data
- `npm run test:validations` passes

### P1-3 Health Check Endpoint Completeness
**File:** `server/server.js` lines 107–122
**AC:**
- `/api/health` returns 503 if DB or Redis unavailable
- Response shape: `{ status, timestamp, checks: { api, db, redis, cloudinary } }`
- Used by load balancer / uptime monitor

### P1-4 Idempotent Seed Script
**File:** `server/config/seed.js` (or new)
**AC:**
- `npm run seed` creates default admin, terms, committees, SB members
- Safe to re-run (upserts by unique keys)
- No duplicate data on repeated runs

---

## Priority 2 — Design System Unification

### P2-1 Align Public Portal to Admin Design Tokens
**Files:** `public-portal/src/index.css`, `public-portal/tailwind.config.js`, `public-portal/src/components/*`
**AC:**
- Single source of truth: `client/tailwind.config.js` + `client/src/index.css` CSS custom properties
- Public portal imports admin tokens (or shares via monorepo package)
- Colors: emerald primary, semantic status colors (emerald/amber/red/muted/blue/purple)
- Typography: Inter font stack, same scale (text-2xl, text-sm, text-xs, text-[10px])
- Spacing rhythm: 4px base, gap-4/6, p-6 cards

### P2-2 Remove Legacy CSS Layers from Public Portal
**File:** `public-portal/src/index.css`
**AC:**
- Delete lines 251–705 (legacy "institutional palette" block)
- Delete redundant `@layer base` blocks
- Keep only Tailwind v4 `@theme` + utility overrides
- File size ≤200 lines

### P2-3 Migrate Public Portal Components to shadcn/ui Primitives
**Files:** `public-portal/src/components/*`
**AC:**
- Use `Button`, `Input`, `Card`, `Badge`, `Modal` from shared `ui/` library
- Replace custom `.btn`, `.card`, `.badge`, `.search-bar` classes
- Consistent focus rings (`focus:ring-2 focus:ring-primary/20`)
- Consistent hover states (`hover:bg-primary/90` for primary)

---

## Priority 3 — Documentation Sync (Zero-Drift)

### P3-1 Update Architecture Doc to Match Code
**File:** `iBOSys_Architecture_and_Database.md`
**AC:**
- "Pure Vanilla CSS. No TailwindCSS" → removed (client uses Tailwind v4)
- "OTP in-memory for development" → "OTP stored in Redis with 5-min TTL"
- "Local uploads planned" → "Cloudinary used for consultation ID images"
- "CORS open policy" → "CORS restricted to configured origins"
- DB schema sections match actual Mongoose models (ConsultationFeedback compound index added)

### P3-2 Sync OpenAPI Spec
**File:** `docs/openapi.yaml`
**AC:**
- All 14 route files represented
- `/api/public/consult/:id/guest` includes `multipart/form-data` schema
- `/api/reports/document/:id` marked as authenticated
- Zod schemas referenced (not hand-written drift)

### P3-3 Update Production Checklist
**File:** `production_checklist.md`
**AC:**
- Strike completed items (helmet, cors, rate-limit, Redis OTP, Cloudinary)
- Add remaining: remove system routes, unique index, PDF auth, test suite
- Reflect actual stack (Tailwind v4, not vanilla CSS)

---

## Priority 4 — Developer Experience & Maintainability

### P4-1 Extract Shared UI Library
**New:** `packages/ui/` or shared via workspace
**AC:**
- `Button`, `Input`, `Card`, `Badge`, `Modal`, `Pagination`, `StatCard`, `SectionHeader`, `RichTextEditor`, `UserAvatar` exported
- Both `client` and `public-portal` import from shared package
- Versioned via workspace protocol

### P4-2 Centralize API Client
**Files:** `client/src/utils/api.js`, `public-portal/src/utils/api.js` (create)
**AC:**
- Single `api.js` with typed endpoints (JSDoc or TypeScript)
- Base URL from `import.meta.env.VITE_API_URL`
- Token handling, error normalization, PDF download helpers shared
- Public portal uses same client (no duplicate fetch wrappers)

### P4-3 Add Build Verification to CI
**Files:** `.github/workflows/ci.yml` (create)
**AC:**
- Runs on PR: `npm ci && npm run build` in client, server, public-portal
- Server: `npm run lint` (eslint), `npm run test`
- Fails on TypeScript errors (if TS) or ESLint errors

### P4-4 Mobile App Production Config
**Files:** `mobile-app/app.json`, `mobile-app/.env`
**AC:**
- `EXPO_PUBLIC_API_URL` configurable via EAS secret / env
- Removes hardcoded `10.0.2.2`
- `app.json` includes `android.package`, `ios.bundleIdentifier`
- EAS build profile for production

---

## Execution Order & Dependencies

```
P0-1 ──► P0-2 ──► P0-3 ──► P0-4 ──► P0-5
  │       │       │       │       │
  ▼       ▼       ▼       ▼       ▼
P1-1 ◄── P1-2    P1-3    P1-4
  │       │       │       │
  ▼       ▼       ▼       ▼
P2-1 ──► P2-2 ──► P2-3
  │
  ▼
P3-1 ──► P3-2 ──► P3-3
  │
  ▼
P4-1 ──► P4-2 ──► P4-3 ──► P4-4
```

**Parallelizable groups:** (P1-1/P1-2/P1-3/P1-4), (P2-1/P2-2/P2-3), (P3-1/P3-2/P3-3), (P4-1/P4-2/P4-3/P4-4)

---

## Verification Gates

| Gate | Command | Must Pass |
|------|---------|-----------|
| Build | `cd client && npm run build` | Exit 0 |
|  | `cd public-portal && npm run build` | Exit 0 |
|  | `cd server && npm run lint` | Exit 0 |
| Tests | `npm run test:ci` (all workspaces) | Exit 0 |
| Unique Index | `mongo --eval "db.consultationfeedbacks.createIndex({ordinanceId:1,full_name:1,contact_number:1},{unique:true})"` | No dup key error |
| Health Check | `curl -f http://localhost:5000/api/health` | 200 OK |
| CORS | `curl -H "Origin: https://evil.com" http://localhost:5000/api/health` | 403 |
| PDF Auth | `curl http://localhost:5000/api/reports/document/<id>` | 401 |

---

## Effort Estimate

| Priority | Tasks | Est. Days |
|----------|-------|-----------|
| P0 | 5 | 1.5 |
| P1 | 4 | 3 |
| P2 | 3 | 2 |
| P3 | 3 | 1 |
| P4 | 4 | 3 |
| **Total** | **19** | **~10.5 days** |

---

## Notes

- Execute P0 before any production deploy
- P2 (design unification) can be done incrementally — page by page
- P4-1 (shared UI package) enables P2-3 — do P4-1 first if unifying
- Update SecondBrain notes after each completed task (per `secondbrain.md` rule)
- Run `npm run build` in each workspace after every change (per `zero_error_protocol.md`)