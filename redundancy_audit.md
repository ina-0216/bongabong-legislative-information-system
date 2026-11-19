# System Redundancy Audit

## 🔴 High Priority — Redundant / Orphaned Code

### 1. Leftover One-Time Migration Scripts (Safe to Delete)
These scripts were used during development to fix or migrate data. They serve no purpose now and clutter the server root.

| File | Purpose | Status |
|------|---------|--------|
| `server/fix-data.js` | Fixed ordinance `type` field + seeded old SB Members with wrong committee names | ✅ Done — deletable |
| `server/fix-populate.js` | One-liner to mass-replace `proponentId` populate string in route files | ✅ Done — deletable |
| `server/fix-terms-migration.js` | Updated SBMembers + Ordinances to have a `termId` | ✅ Done — deletable |
| `server/migrateTerms.js` | Older version of the same term migration | ✅ Done — deletable |
| `server/seedTerms.js` | Created the first 2022-2025 terms | ✅ Done — deletable |
| `server/update_db.js` | Migrated old committee names → official ones + updated SB Members for 2025-2028 | ✅ Done — deletable |
| `server/dump.js` | Dumps DB to JSON using a hardcoded port (`63620`) — will never work again | ✅ Stale — deletable |
| `server/dump.json` | Old snapshot of the database from during development | ✅ Stale — deletable |
| `server/scripts/migrate-names.js` | One-time name migration for SBMember firstName/lastName split | ✅ Done — deletable |
| `server/scripts/seed-terms.js` | Another term seeder (duplicate of seedTerms.js above) | ✅ Duplicate — deletable |
| `server/scripts/translate-existing.js` | One-time Tagalog translation script | ✅ Done — deletable |

---

### 2. Redundant Database Collections (Comment + Vote vs ConsultationFeedback)

**`Comment` model** and **`Vote` model** are **legacy collections** that overlap with `ConsultationFeedback`:

| | `Comment` | `Vote` | `ConsultationFeedback` |
|---|---|---|---|
| Who submits | `residentId` (User ref) | `residentId` (User ref) | Anonymous (full_name, contact_number) |
| Used in | `reports.js` only | `reports.js`, `ordinances.js` (stats) | `consultations.js`, `public.js`, `reports.js` |
| Public portal submits to | ❌ No | ❌ No | ✅ Yes |
| Has approval workflow | ❌ No | ❌ No | ✅ Yes (Pending/Approved/Rejected) |

**Finding:** The system migrated to `ConsultationFeedback` for all public submissions. `Comment` and `Vote` are only used in 2 legacy report routes and 1 stats aggregation. The seed script still populates them — they are effectively dead data.

---

### 3. Orphaned Field in User model: `pendingVote`

The `User` model has a `pendingVote` sub-document:
```js
pendingVote: {
  ordinanceId: ObjectId,
  vote: String,
  text: String
}
```
**This field is never read or written anywhere in the entire codebase** (only defined in the model). It was likely from a scrapped feature.

---

### 4. Orphaned `test-db` directory

`server/test-db/` exists but contains no application code — it appears to be an old local MongoDB data directory from testing.

---

### 5. STAGES constant duplicated in 6 files

The legislative stages array is copy-pasted in every file that needs it:

| File | Has STAGES defined locally? |
|------|-----------------------------|
| `server/models/Ordinance.js` | ✅ |
| `server/routes/ordinances.js` | ✅ |
| `server/routes/reports.js` | ✅ |
| `client/src/pages/OrdinanceDetail.jsx` | ✅ |
| `client/src/pages/OrdinanceList.jsx` | ✅ |
| `client/src/pages/Reports.jsx` | ✅ |
| `client/src/pages/Dashboard.jsx` | ✅ (as ALL_STATUSES) |

Should be extracted to a shared constant file.

---

## 🟡 Medium Priority — Inefficiencies

### 6. User `termStart` / `termEnd` fields are unused
The `User` model has `termStart` and `termEnd` date fields, but terms are managed via the `Term` collection. These are never set or read anywhere.

### 7. `dump.json` (17KB) committed to repo
An old database snapshot checked into the server folder — not needed.

### 8. `idImageUrl` field on User model never used
The User model has `idImageUrl: { type: String, default: '' }` which is separate from `verificationDocUrl`. Neither is actively surfaced in the UI — `idImageUrl` is never written anywhere.

---

## ✅ What is Clean / Well-Structured

- All 10 routes map 1:1 to their models (no overlapping endpoints)
- Middleware (`protect`, `authorize`) is reused properly
- `ConsultationFeedback` has a proper unique index preventing duplicate submissions
- `Vote` has a unique index on `(residentId, ordinanceId)` — correct
- Public portal and client portal use separate API utility files
- `CommitteeBadge` is the single source of truth for committee styles

---

## Recommended Actions (in order)

1. **Delete all 11 leftover migration/dump scripts** — immediate, zero risk
2. **Remove `pendingVote` from User model** — safe if no data uses it
3. **Remove `termStart`/`termEnd` from User model** — safe, never used
4. **Consider consolidating `Comment`+`Vote` references in reports** to use `ConsultationFeedback` instead, then drop those 2 collections
5. **Extract STAGES to a shared constant** on server (`utils/constants.js`) and client (`src/constants.js`)
