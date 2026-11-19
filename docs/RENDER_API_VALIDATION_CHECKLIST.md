# Render API Connection Validation Checklist

**Contract:** TC-MV40JW8V
**Status:** Approved (PROCEED)
**Related:** `FRONTEND_RENDER_API_VALIDATION.md`

Run this checklist after the `.env.local` API URL updates. Check each box when verified.

## Step 1 — Health Check (smoke test)

```bash
curl -s https://ibosys-api.onrender.com/api/health
```

- [ ] **200** response received
- [ ] Response is valid JSON
- [ ] If `cloudinary` reports `"missing"`: add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to Render env

## Step 2 — Start Frontend Dev Servers

```bash
# Terminal 1
cd client && npm run dev

# Terminal 2
cd public-portal && npm run dev
```

Verify the Vite dev server reads `VITE_API_URL` (restart after `.env.local` changes if needed):

- [ ] `client` dev server starts (port 5173)
- [ ] `public-portal` dev server starts (port 5174)
- [ ] `grep VITE_API_URL` shows `https://ibosys-api.onrender.com/api` in both `.env.local` files

## Step 3 — Network Tab Verification (browser dev tools)

Open either dev server and hit any page (login, documents, etc.).

- [ ] All requests target `https://ibosys-api.onrender.com/api/...`
- [ ] **No** requests target `http://localhost:5001/...`
- [ ] Requests include auth headers after login
- [ ] Blob/PDF downloads resolve correctly

## Step 4 — Contract Test Suite

These suites lock the existing API call surface (per production_checklist.md §8):

```bash
cd client && npm run test:run    # expect 28 tests
cd public-portal && npm run test:run  # expect 12 tests
```

- [ ] `npm run test:run` in `client` exits 0 (28 tests)
- [ ] `npm run test:run` in `public-portal` exits 0 (12 tests)
- [ ] No new `ERR!` / `FAIL` entries appear after the env update

## Step 5 — CORS Inspection

If API calls return **403** or the console shows a CORS error:

```bash
# In server/server.js, add the dev server origin (gated by NODE_ENV !== 'production')
allowedOrigins: [
  process.env.FRONTEND_URL,   # http://localhost:5173
  process.env.PORTAL_URL,     # http://localhost:5174
  // add any new dev origin here
]
```

- [ ] No CORS errors in the browser console
- [ ] Authenticated calls (POST/PUT/DELETE) succeed

## Step 6 — Auth & Token Propagation

- [ ] Login succeeds and redirects to Dashboard
- [ ] `localStorage.ibosys_token` persists across page reloads
- [ ] Reload the page → authenticated calls still work (no forced re-login)
- [ ] Logout clears the token

## Step 7 — Media, PDF & Uploads

- [ ] Document details page loads
- [ ] Minutes PDF download works
- [ ] Committee/annual/participation reports render
- [ ] Announcement/ordinance cover image displays
- [ ] Upload button shows no "Cloudinary missing" failure

## Step 8 — Form & Validation

- [ ] "Propose Document" shows required-field red borders on empty submit
- [ ] Error message appears beneath each empty required field
- [ ] Backend rejects empty submissions with 422/validation error
- [ ] Draft restore (add/remove sections) works

## Step 9 — Bug Triage Log

Record any issue found below. Categorize as **In-scope** (fix directly) or **Out-of-scope** (separate CHG: backend, DB, infrastructure).

| # | Description | Endpoint/Page | Category | Status |
|---|-------------|---------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Sign-off

- [ ] All steps verified / bugs logged
- [ ] Handoff document updated with findings
- [ ] `md-close` run to finalize session

---

*This checklist documents the Render API validation workflow. Run each step in order; record results and any bugs in the triage log.*