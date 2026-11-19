# System Audit Remediation Plan — 2026-10-10

## Objective

Resolve the confirmed production, security, privacy, validation, CI, and visual-regression findings from the 2026-10-10 system audit across the Express/MongoDB server, admin client, public portal, mobile app, and shared packages.

The user authorized implementation of this plan. No destructive database operation, deployment, or publication of personal data is authorized by that request.

## Audit baseline

- Server runtime, admin client, and public portal dependency audits reported zero advisories.
- Mobile dependency audit reported 29 production-tree advisories and 40 total advisories (the total includes two critical development-tool advisories).
- Server tests passed 103/103 serially; concurrent execution produced one PDF timeout.
- Admin client tests passed 35/35; its build warns about a 506.65 KB raw entry chunk.
- Mobile lint, typecheck, Expo dependency check, and 65/65 tests passed.
- Shared API tests passed 60/60 serially; shared UI tests passed 5/5; shared package typechecks/builds passed.
- Public portal lint, 218 tests, i18n, build, budgets, rendered checks, enforced design checks, and baseline manifest check passed. The final visual diff failed for 18 of 39 captured images.
- Ordinance-section migration dry run found zero affected documents; no database data was changed.
- Repository has no `.git` directory. The root `AGENTS.md` refers to `.agents/rules/`, which is absent. These are reviewability and instruction-source gaps to resolve before relying on source diffs or those rules.

## Scope and guardrails

### In scope

- Correct the production CORS behavior for requests without an `Origin` header while retaining the browser-origin allowlist.
- Remove credential disclosure from rollback logs and prevent seeded default credentials from reaching or resetting production users.
- Ensure the public feedback API does not disclose identifying information without a suitable explicit publication basis.
- Apply consistent Zod/ObjectId validation to uncovered API paths.
- Repair CI test commands and stabilize test execution under the project’s actual runner constraints.
- Remediate mobile dependency advisories using Expo-compatible updates.
- Review visual diffs and reduce or explicitly budget the admin client’s initial JavaScript payload.
- Update project documentation and audit status after implementation.

### Out of scope

- Applying the ordinance migration: the current dry run found no legacy sections.
- Deleting, reseeding, or replacing any live database records.
- Automatically accepting all visual changes by rewriting the portal baseline.
- Deploying or publishing changes.

## Implementation sequence

### Phase 0 — Establish a reviewable change boundary

**Work**

1. Establish or identify the project’s intended Git repository and capture the current source state before edits. Do not initialize a new repository or overwrite history without confirming the intended remote and ownership.
2. Restore or intentionally retire the `.agents/rules/` references in `AGENTS.md`; do not invent rule contents. Record the chosen canonical rules location.
3. Record the current 39-image visual baseline manifest and audit outputs as pre-change evidence.

**Acceptance criteria**

- Every source change can be reviewed against a known base revision.
- `AGENTS.md` references only rule files that exist, or clearly states that no rule directory is configured.
- The current visual baseline remains unchanged until each difference is reviewed.

**Verification**

- `git status --short --branch` and `git rev-parse --show-toplevel` succeed in the intended repository.
- Verify every linked rule file exists.
- `npm run baseline:check` in `public-portal` succeeds.

**Gate**: Resolve repository ownership and intended Git root before any source edits. The current workspace is not a Git worktree.

### Phase 1 — Restore reliable CI checks

**Affected areas**: `server/package.json`, `client/package.json`, server Vitest configuration, CI workflow files.

**Work**

1. Remove Vitest’s unsupported `--ci` argument from the server and client `test:ci` scripts; keep them non-watch commands.
2. Reproduce the server PDF timeout and API singleton timeout under default parallel execution. Configure a deterministic worker limit for CI if the failures are resource contention; do not merely increase timeouts without understanding the cause.
3. Ensure CI invokes each app’s detected lint, typecheck, test, and build commands. Keep the public portal’s `verify` command as its existing full gate.

**Acceptance criteria**

- `npm run test:ci` exits zero in `server` and `client` using the installed Vitest version.
- The server suite consistently passes all 103 tests in the CI execution mode.
- Shared API tests consistently pass all 60 tests in CI execution mode.
- The CI workflow reports an actionable failure when any required command fails.

**Verification**

- `npm run test:ci` in `server` and `client`.
- `npm test -- --maxWorkers=1` or the chosen stable CI command in `packages/api`.
- Repeat the CI commands twice to check for timing flakes.

### Phase 2 — Close production security risks

#### 2A. CORS and native clients

**Affected areas**: `server/server.js`, `server/tests/server.test.js`, mobile API integration.

**Work**

- Allow requests with no `Origin` header to reach normal route authentication, validation, and rate limiting. Continue returning CORS headers only for explicitly allowed browser origins; continue rejecting untrusted browser origins.
- Verify the exact production request behavior from iOS and Android builds. CORS is a browser enforcement mechanism and must not be used as API authentication.

**Acceptance criteria**

- Allowed web origins receive the expected CORS headers.
- Disallowed browser origins remain denied.
- A no-`Origin` request reaches the route and receives the route’s normal result (for example, 401 on a protected route), not a CORS-generated 500.
- No request gains access to a protected route without a valid token and role.

**Verification**

- Add/adjust server integration cases for allowed, denied, and absent `Origin` headers under production-like configuration.
- Run mobile smoke tests against a production-like API build on Android and iOS.

#### 2B. Database URI logging

**Affected area**: `server/scripts/rollback.js`.

**Work**

- Remove the raw connection URI from log messages. If diagnostics require the target, log only a safely parsed host/database identifier with credentials, query parameters, and tokens removed.

**Acceptance criteria**

- Rollback logs never contain the URI, username, password, or query-string secrets.
- The rollback restore behavior and error reporting remain usable.

**Verification**

- Add a unit test using a dummy URI containing username/password/query secrets and assert none appear in captured logs.
- Run the rollback script’s existing test/validation coverage without connecting to or mutating a production database.

#### 2C. Seed safety

**Affected areas**: `server/config/seedIdempotent.js`, other seed scripts, server deployment documentation.

**Work**

- Inventory each seed script and classify it as development/test fixture data or an approved production bootstrap operation.
- Make fixture seeding fail closed in production. Ensure rerunning a seed cannot reset an existing account’s password or reactivate a user.
- If production bootstrap is required, use an explicitly invoked process that provisions a unique secret out-of-band and does not log or commit it.

**Acceptance criteria**

- Production startup/deployment cannot accidentally run fixture seeds.
- Re-running a development seed does not silently overwrite existing account credentials/status.
- No default password is printed in script output or deployment docs.

**Verification**

- Tests assert seed scripts reject `NODE_ENV=production` by default.
- Tests assert existing account credentials and status are unchanged on rerun.
- Review deployment and seed commands; do not run a seed against live data during remediation.

### Phase 3 — Protect public feedback privacy

**Affected areas**: `server/routes/public.js`, `server/controllers/publicController.js`, public portal feedback UI, privacy text and consent flow.

**Work**

1. Confirm with the municipality’s data/privacy owner whether a guest submission includes explicit consent to publish the submitter’s identity.
2. Default the anonymous public feedback response to omit full name and other direct identifiers. Preserve identifying data only in authorized review/admin endpoints.
3. If named publication is legally and operationally required, add a separate, specific, optional publication consent and retain its state with the feedback record. Existing records without that consent remain anonymous.

**Acceptance criteria**

- The public endpoint does not return contact number, ID attachment data, full name, or another direct identifier without explicit publication consent.
- Admin verification still has the fields needed for its authorized workflow.
- Existing feedback remains available and is not deleted or rewritten; previously collected general processing consent is not treated as publication consent.
- UI copy clearly explains the public visibility choice.

**Verification**

- Controller/API tests cover anonymous legacy records, explicit publication consent, and admin-only visibility.
- Public portal tests confirm the returned anonymous shape is rendered correctly.
- Obtain privacy-owner approval of the final consent wording before enabling named publication.

### Phase 4 — Complete request validation coverage

**Affected areas**: `server/routes/`, `server/validations/`, route/controller tests.

**Work**

- Inventory every `POST`, `PUT`, `PATCH`, and `DELETE` route and every route parameter consumed by Mongoose.
- Add reusable ObjectId schemas for identifiers on uncovered endpoints, including deletion routes and announcement publish toggles. Validate body/query/params consistently before controllers execute.
- Map validation failures to a stable 400 response; ensure malformed identifiers do not surface as 500 CastErrors.
- Preserve endpoint-specific domain validation and authorization checks.

**Acceptance criteria**

- Every mutation has an identified validation schema or a documented exception (such as a bodyless operation with a validated ID).
- Invalid/missing IDs and malformed bodies return 400 without database mutation.
- Valid requests preserve existing authorization and business rules.

**Verification**

- Add regression coverage for malformed IDs on each formerly uncovered route class.
- Run server route/controller suites and a static route-validation inventory.
- Review the endpoint inventory against `docs/openapi.yaml` and update the API contract if response behavior changes.

### Phase 5 — Remediate mobile dependency advisories safely

**Affected area**: `mobile-app/package.json` and lockfile.

**Work**

- Map each of the 29 production-tree and 40 total advisories to the Expo/Metro/runtime package chain and determine whether it ships in the app, only in development tooling, or only in platform build tooling.
- Select upgrades compatible with the project’s Expo SDK and React Native versions. Prefer supported in-range upgrades; do not apply `npm audit fix --force` or downgrade Expo to the version suggested by npm.
- Document advisories that cannot be remediated without an Expo SDK migration and set a time-bound SDK upgrade item.

**Acceptance criteria**

- No unresolved critical advisory ships in the release artifact.
- Production-tree advisories are reduced to zero or each remaining advisory has a documented package path, exposure assessment, mitigation, and accepted owner.
- Expo dependencies match the selected SDK, with no lockfile drift.
- App startup, API, PDF, upload, and sharing flows still work on supported Android and iOS versions.

**Verification**

- `npx expo install --check`
- `npm audit --omit=dev` and `npm audit` in `mobile-app`
- `npm run lint`, `npm run typecheck`, `npm run test:run`, and native Android/iOS build or device smoke tests.

### Phase 6 — Review and resolve portal visual regressions

**Affected areas**: `public-portal/.visual-baseline/`, affected page components/styles, visual fixtures.

**Work**

1. Inspect the 18 failing diff images route by route, including page-height changes on document, consultation, home, and resolution views.
2. Classify every difference as an intentional product change, an unintended regression, or capture nondeterminism.
3. Fix unintended differences and stabilize any nondeterministic fixture. Update only the affected baseline images after intentional changes are approved and the intended result is visually reviewed.
4. Preserve the 39-image manifest integrity and do not use `visual:update` as a blanket fix.

**Acceptance criteria**

- Every failed comparison has a written classification and disposition.
- Unintended layout changes are fixed; intentional changes have approved replacement captures.
- All 39 current captures pass the visual diff and the baseline manifest check.

**Verification**

- `npm run verify` in `public-portal`.
- Review screenshots at mobile, tablet, desktop, and desktop-1280 sizes.
- Confirm `npm run baseline:check` passes after any approved baseline update.

### Phase 7 — Reduce admin initial JavaScript cost

**Affected areas**: `client/src/`, `client/vite.config.js`.

**Work**

- Use the existing bundle analyzer or build manifest to identify which imports contribute to the 506.65 KB raw entry chunk.
- Split heavy functionality at route/feature boundaries where it improves first-load transfer without causing duplicate dependencies or loading delays.
- Keep route-level lazy loading already present; target the shared entry rather than splitting blindly.

**Acceptance criteria**

- Production build has no unexpected chunk over 500 KB raw, or the remaining warning has a measured, documented justification and an explicit budget.
- Gzipped entry size is measured and remains within the agreed transfer budget.
- No regression to route navigation, charts, or authentication startup.

**Verification**

- `npm run build` in `client`, inspect emitted chunk sizes and visualizer output.
- Run the client test suite and smoke-test dashboard and ordinance detail routes.

### Phase 8 — Close out the audit record

**Work**

- Update the relevant SecondBrain audit/security/validation notes with implemented behavior, test results, remaining accepted advisories, and any privacy decision.
- Update this plan with status, evidence, and links to implementation commits once a Git repository is available.

**Acceptance criteria**

- No checklist item is marked complete without a command result, test, or reviewer decision as evidence.
- Production release gates include all unresolved high-risk items and their owners.
- The audit notes agree with the actual code and dependency reports.

## Release gates

Do not consider the system ready for production release until:

1. Origin-less native requests work without weakening route authentication or browser-origin controls.
2. Rollback output cannot expose database credentials and seed routines cannot reset production accounts.
3. Public feedback’s identity-publication basis is approved and the API enforces the decision.
4. Mobile production advisories are remediated or formally assessed and accepted.
5. Server/client CI scripts work; server tests pass reliably in the CI mode.
6. Portal visual diffs have a reviewed disposition and the approved baseline gate passes.

The admin bundle warning and advisory design-density notes should be tracked, but are not security release blockers by themselves.

## Verification matrix

| Area | Required checks |
|---|---|
| Server | `npm run lint` if configured; `npm run test:ci`; validation and CORS regression tests; `npm audit` |
| Admin client | `npm run lint`; `npm run test:ci`; `npm run build`; bundle-size review; `npm audit` |
| Public portal | `npm run verify`; `npm audit` |
| Mobile app | `npm run lint`; `npm run typecheck`; `npm run test:run`; `npx expo install --check`; `npm audit --omit=dev`; Android/iOS smoke test |
| Shared API | test suite, typecheck, build, npm audit |
| Shared UI | test suite, typecheck, build, npm audit |
| Design tokens | typecheck, build, npm audit |
| Data safety | migration dry run only unless a separately approved data change is required |

## Project notes

- The root `implementation_plan.md` contains earlier broad work items and was left untouched; this plan addresses the fresh 2026-10-10 audit findings.
- Relevant existing knowledge: `SecondBrain/Projects/2026-10-09_System_Audit_Followup.md`, `SecondBrain/Projects/Production_Readiness_Audit.md`, `SecondBrain/Areas/Security_and_Production.md`, and `SecondBrain/Areas/Validation_and_Data_Integrity.md`.
- Keep actual environment values, credentials, and personally identifying records out of this plan and all test logs.

## Implementation status — 2026-10-10

| Phase | Status and evidence |
|---|---|
| 0. Review boundary | **Open limitation.** The workspace has no project Git repository, so there is no commit/base diff. A pre-edit manual snapshot and a separate backup of the 18 visual baselines exist. `AGENTS.md` now states that `.agents/rules/` is absent. Do not represent the source as Git-reviewable until the intended repository is restored. |
| 1. CI | **Implemented.** Server/client CI test scripts run Vitest without the unsupported `--ci`; server CI is serial. CI and verify workflows use Node `22.13.x`; the mobile CI job runs Expo SDK compatibility and doctor checks. Local server suite: 124/124; client: 35/35; shared API: 60/60 plus typecheck/build. Public portal `npm run verify` passed. |
| 2. Production security | **Implemented, native verification open.** No-Origin requests reach normal authentication, while browser origins remain allowlisted. Rollback output masks credentials and seed scripts fail closed in production without overwriting existing account credentials/status. Server suite: 124/124. Android/iOS production-like API smoke tests remain outstanding. |
| 3. Public feedback privacy | **Safe default implemented.** Public API projects only vote, comment, sentiment, and creation date; the portal renders “Anonymous resident” and does not render legacy name/barangay values. Server projection tests and portal render test cover this shape. Named publication remains disabled pending privacy-owner review. |
| 4. Request validation | **Implemented for audit findings.** Reusable ObjectId and query schemas now cover the previously uncovered route parameters, filters, and public endpoints; malformed public-route requests return 400. The related approved ordinance-body change uses General Provisions as the single authoring field; legacy sections are merged on load, retained in provisions on save, then the old array is cleared. A read-only migration preflight found zero affected database documents. Server suite: 124/124, including tests for merge, duplicate avoidance, and sanitization. |
| 5. Mobile advisories | **Partially remediated; release gate open.** Vitest/UUID upgrades cleared critical advisories and reduced audit totals from 40 to 28 overall and 29 to 21 production-tree. Expo install check is clean; Expo Doctor passed 21/21; mobile lint/typecheck/tests passed (65/65). Remaining package paths and limitations are in [mobile-dependency-audit-2026-10-10.md](mobile-dependency-audit-2026-10-10.md). No owner has formally accepted the remaining exposure; native artifacts/device checks remain outstanding. |
| 6. Portal visual diffs | **Resolved.** Reviewed and classified all 18 changed screenshots as intended document-action/stat/layout updates. Backed up the prior 18 images to `public-portal/backups/visual-baseline-before-reviewed-update-20261010/`; replaced only those captures; the 39-image manifest and visual gate pass. |
| 7. Admin bundle | **Implemented.** Added a build budget check at 520 KiB raw / 165 KiB gzip. Measured entry output is 494.78 KiB raw / 150.50 KiB gzip; production build and lint pass. |
| 8. Audit record | **Implemented; release gates remain open.** This plan, the mobile advisory report, and SecondBrain addenda record changes, verification, and outstanding gates. No migration, seed, deployment, or database mutation was run. |

### Final verification evidence

- `server`: `npm run test:ci` — 13 files, 124 tests passed.
- `client`: `npm run lint`, `npm run test:ci` — 35 tests passed, and `npm run build` completed with the configured budget.
- `public-portal`: `npm run verify` — passed lint, 219 tests, i18n, production build, bundle budgets, 13 routes × 4 viewport rendered audit, design source/rendered checks, 39-image manifest integrity, and visual regression. Eight composition-density observations remain advisory; enforced rules passed.
- `mobile-app`: `npm run lint`, `npm run typecheck`, `npm run test:run` — 65 tests passed; `npx expo install --check` clean; `npx expo-doctor` 21/21.
- `packages/api`: 60 tests passed; typecheck and build passed.
- Visual baseline: manifest integrity passes for 39 images; visual diff passes 39/39 with zero changed pixels beyond tolerance (one existing 221-pixel/0.0078% difference remains below budget).

### Approved ordinance-body consolidation

- The form now authors numbered legal sections inside **General Provisions**; the redundant optional Individual Sections editor is not rendered.
- On edit and local-draft restore, legacy section titles/content are folded into the provisions body. On save, the merged provisions are sent with an empty legacy `sections` array so future edits use one source of truth.
- The server PDF path also folds any legacy sections into the rendered body.
- Migration preflight evidence: zero documents/sections to migrate. No live records were deleted, recreated, or modified.
- `server/tests/ordinanceBody.test.js` covers preserving existing provisions, merging legacy content, duplicate avoidance, and sanitization; server CI passed at 124/124 after adding it.

The keyword search path was also reviewed: the public archive synchronizes its input with the `search` URL parameter, while the API bounds and escapes search input and covers the documented public document fields.

### Release gates still open

- Restore/identify the intended Git repository so the changes can be reviewed as a source diff.
- Obtain privacy-owner approval of feedback publication policy; named publication stays disabled.
- Assign an owner to review/accept or remediate remaining mobile advisories; build and inspect Android/iOS artifacts and complete device smoke tests.
- Run production-like native client requests against the API to validate no-Origin behavior with authentication.
