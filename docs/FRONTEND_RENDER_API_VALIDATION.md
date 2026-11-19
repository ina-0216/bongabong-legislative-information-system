# Frontend Render API Validation & Bug Discovery Plan

**Contract:** TC-MV3ZKWII (revision 1)
**Status:** Authorized (user approved YES)
**Scope:** Docs (this file) + env files already updated

## Overview

After connecting the local frontends to the Render API via `VITE_API_URL`, the admin client (`client/`) and public portal (`public-portal/`) now route all API calls through `https://ibosys-api.onrender.com/api` instead of falling back to `localhost:5001`. This enables the user to see **actual backend behavior** and surface real bugs that were previously hidden behind the local mock.

## Environment Changes (Already Done)

| File | Change |
|------|--------|
| `client/.env.local` | Added `VITE_API_URL=https://ibosys-api.onrender.com/api` |
| `public-portal/.env.local` | Added `VITE_API_URL=https://ibosys-api.onrender.com/api` |

## Validation: Start the Dev Servers

**Action:** Launch both frontend dev servers and verify API targets.

```bash
# Terminal 1
cd client && npm run dev

# Terminal 2
cd public-portal && npm run dev
```

**Verification (browser dev tools → Network tab):**
- All `POST`/`GET` requests should target `https://ibosys-api.onrender.com/api/...`
- **NOT** `http://localhost:5001/...`
- If localhost targets appear, confirm `VITE_API_URL` is being read (Vite restart may be required after `.env.local` changes).

## Bug Discovery Workflow

Once the frontends are connected to Render, surface and categorize bugs:

### 1. Health Check (smoke test)
```bash
curl -s https://ibosys-api.onrender.com/api/health
```
- Expected: JSON `{status: "ok", ...}` or at minimum `200`
- **5xx / connection refused**: Render service may be down or unhealthy — check Render dashboard.

### 2. CORS Inspection
- If API calls return `403` or console shows CORS errors, the Render API may not allow the dev origin.
- **Fix**: Add the Vite dev server origin (e.g., `http://localhost:5173`) to `server/server.js` `allowedOrigins` array (gated by `NODE_ENV !== 'production'`).

### 3. API Contract Mismatch
- Compare `client/src/utils/api.js` / `public-portal/src/utils/api.js` call surfaces against actual `server/routes/` definitions.
- Run `npm run test:run` in each app — the contract test suites (28 client tests, 12 public-portal tests per production_checklist.md §8) lock the existing call surface and will surface any new/removed endpoints.

### 4. Auth & Token Propagation
- Log in as a test user, then observe whether `localStorage.ibosys_token` persists across page reloads and whether authenticated calls succeed.
- **401 errors** despite valid token: may indicate token expiration, incorrect storage key, or backend auth state issue.

### 5. Media & PDF Load
- Try loading a document, PDF, or image through the frontends.
- **Broken media**: Check Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are set on the Render backend (per production_checklist.md §1, §4). Without them, uploads and PDF generation fail.

### 6. Form & Validation Behavior
- Submit a form (propose ordinance, create user, etc.) and observe client-side validation red borders + error messages, plus backend response.
- Empty required fields should highlight instantly (client-side validation is env-derived per production_checklist.md §8; if forms were previously falling back to localhost and hitting a different backend shape, validation may now behave differently).

## Bug Triage & Fix Prioritization

| Category | Scope (TC-MV3ZKWII) | Action |
|----------|--------------------|--------|
| **Frontend UI bug** (wrong red border, broken interaction, styling regression) | In scope | Fix the relevant `client/src/` or `public-portal/src/` component. |
| **Backend API bug** (5xx from Render, wrong response shape) | Out of scope (separate CHG) | Log as a backend task — document the symptom, but do not modify server logic as part of this task. |
| **CORS / config issue** (403, origin blocked) | In scope | Fix `server/server.js` `allowedOrigins` or add missing `VITE_API_URL` — both are in the approved manifest. |
| **Cloudinary / PDF missing** (uploads fail, `/api/health` reports `cloudinary: "missing"`) | In scope (config) | Add Cloudinary credentials to Render env — this is a config change within the `.env` / production env scope. |

**Rule:** Only modify files within the approved `changeBoundary`. If a bug requires a change outside `client/.env.local`, `public-portal/.env.local`, `server.js` CORS, or Cloudinary config, log it as an out-of-scope item for a separate task.

## Acceptance Criteria

- [ ] Both frontends (`client` and `public-portal`) start with `VITE_API_URL` pointing to Render
- [ ] Browser Network tab shows API calls targeting `https://ibosys-api.onrender.com/api/...`
- [ ] `npm run test:run` passes in both apps (no contract test regressions)
- [ ] At least one real backend behavior/bug is visible (health check, CORS, auth, media, or form submission)
- [ ] Bug list documented (if any) in the project's issue tracker or as a task-observer entry

## Next Steps (After This Plan)

Once the validation is complete and bugs are identified:

1. **Fix in-scope bugs** — edit the relevant frontend component or config file within the approved manifest.
2. **Log out-of-scope bugs** — create a separate task/CHG for backend, DB, or infrastructure issues.
3. **Update this document** — record findings, fixes, and remaining open items.
4. **Generate sealed handoff** — once all acceptance criteria pass, run `md-close` to close the session with a complete report.

---

*This plan was generated as part of the Munder-Difflin authorized workflow. Scope: docs/, tasks/, plans/, roadmap/, README.md. No implementation changes may be made outside the approved file/operation boundary.*