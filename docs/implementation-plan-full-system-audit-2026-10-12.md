# Full System Audit Implementation Plan

**Date:** 2026-10-12  
**Status:** Implemented locally on 2026-10-12; security audit and visual baseline follow-up remain  
**Source:** Read-only code audit and verification run on 2026-10-12

## Objective

Resolve the confirmed account creation, record lifecycle, authorization, search, public portal layout, cold-start, dependency, and query-handling defects found in the system audit. Preserve legislative history, keep public and administrative data behavior consistent, and leave production data unchanged during development verification.

## Scope

### In scope

- Admin client and API behavior for user creation, SB member lifecycle, announcement deletion, term deletion feedback, and session search.
- Public portal ordinance action layout, visual regression baselines, and cold-start handling.
- Mobile dependency advisories and the CI security gate.
- SB member pagination query validation.
- Regression coverage, documentation, and release verification for these changes.

### Out of scope

- Broad redesign or feature additions unrelated to the listed defects.
- Production data edits or destructive production CRUD testing.
- Unreviewed dependency upgrades or major platform/SDK upgrades.
- Changes to existing uncommitted work unless its owner authorizes those changes.

## Priority order

| Priority | Workstream | Reason |
|---|---|---|
| P0 | User account creation | The form rejects legitimate email domains and guarantees a Vice Mayor validation failure; email delivery failure can also roll back account creation. |
| P1 | SB member lifecycle and announcement authorization | Current UI messages and list behavior disagree with server outcomes; the result can look like records were deleted when they were only hidden/deactivated or produce avoidable 403 errors. |
| P1 | Mobile high-severity dependency findings | CI audits at the high threshold; current mobile advisories can block a passing CI run and may affect release readiness. |
| P1 | Ordinance action overlap on tablet | The current public portal screenshot shows the Download action overlapping the status badge and document action. |
| P2 | Session search and term deletion feedback | Search results are incomplete across pages and deletion errors hide actionable server explanations. |
| P2 | Render cold-start resilience | The shared 30-second request timeout is shorter than Render's reported 50-second-or-more idle wake delay. |
| P2 | SB member invalid-limit handling | A malformed limit currently falls back to the unbounded “fetch all” path. |

## Phase 0 — Confirm implementation decisions and preserve workspace state

1. Record the current Git status and retain all pre-existing modifications. Do not reset or overwrite the modified server files or local environment configuration.
2. Confirm the intended role policy for deleting announcements:
   - If Secretaries may delete, authorize that role on the API and cover it with an authorization test.
   - If only System Admins may delete, hide or disable the delete action for Secretaries and show the permission reason.
3. Confirm the canonical `position` value for a Vice Mayor account from existing records/model conventions. The UI and server must agree; do not invent a new enum value.
4. Verify the production email provider configuration by checking key names/presence only; never print or copy secret values. Confirm sender verification and delivery in a non-production environment before relying on account creation.
5. Triage each mobile advisory to its dependency path, affected version range, and whether it is in a shipped production bundle. Avoid broad `npm audit fix` or an Expo SDK upgrade without a compatibility review.

**Exit criteria:** Decisions 2–5 are recorded in the implementation task, a clean list of files to change is agreed, and pre-existing working-tree changes remain untouched.

## Phase 1 — Repair user creation end to end (P0)

**Likely files:**

- `client/src/pages/UsersList.jsx`
- `server/validations/userValidation.js`
- `server/controllers/userController.js`
- `server/utils/sendEmail.js`
- user route and model files, if investigation shows a contract mismatch
- relevant client/server tests

### Work

1. Replace the client `.com` check with a practical email format check consistent with server Zod validation. Permit valid government, organization, and non-`.com` domains; still reject malformed addresses with a field-level error.
2. Resolve the Vice Mayor position mismatch using the canonical account model: either display the required position field with valid options or normalize the canonical position on the server. The client must not submit a role the server necessarily rejects.
3. Make account creation and credential delivery behavior explicit and reliable. Decide whether the account remains pending until invitation delivery, whether a retry/resend invitation action is offered, or whether transactional/outbox delivery is used. Never silently delete a successfully created account without giving the administrator a clear recovery path.
4. Ensure duplicate submits are prevented while the create request is pending and errors identify validation, duplicate email, authorization, and invitation delivery failures distinctly.
5. Remove the “password will be displayed” claim unless the server intentionally returns a one-time credential to an authorized creator. Preferred behavior is to continue email delivery and show the actual email-delivery outcome without exposing credentials in ordinary API responses or logs.
6. Add email to server-side user search so the existing “name or email” placeholder is accurate, or change the placeholder if email search is intentionally unsupported.
7. Add authenticated API integration coverage for successful creation, invalid email, every supported role/position combination, duplicate email, authorization boundaries, email delivery failure, and retry/recovery behavior. Tests must use mocked email delivery and isolated test data.

### Acceptance criteria

- A valid `@bongabong.gov.ph` and another valid non-`.com` address pass client and server validation; malformed email is rejected by both.
- System Admin can create each authorized role with valid role-specific data. Secretary can create only the roles allowed by the existing policy.
- Vice Mayor creation succeeds with the canonical position representation; missing/invalid required values produce a visible field-level error.
- Email provider failure produces an accurate recoverable state and does not create an inaccessible account or falsely report success.
- The UI no longer claims a temporary password is displayed unless that behavior is implemented and security-reviewed.
- User search by full/partial name and email returns matching users across server pagination.
- No production account is created as part of verification.

## Phase 2 — Make SB member deletion and visibility consistent (P1)

**Likely files:**

- `server/controllers/sbMemberController.js`
- `server/controllers/publicController.js`
- `server/validations/sbMemberValidation.js` and SB member query validation
- `client/src/pages/SBMembers.jsx`
- admin/public API and component tests

### Work

1. Treat DELETE outcomes distinctly: physically removed when no history exists; deactivated when legislative history must be preserved.
2. Return and display wording that identifies whether a member was removed or deactivated and explains why history was retained.
3. Filter inactive members from the default admin and public lists. Provide an explicit inactive-members view and a guarded reactivation action for authorized admins, or document and implement another reviewed lifecycle path.
4. Verify committee, attendance, ordinance, and public-member views behave consistently for inactive/reactivated members. Re-activation must restore visibility without rewriting linked historical records.
5. Add tests for no-history removal, linked-history deactivation, default exclusion, inactive admin view, reactivation, and public list behavior.

### Acceptance criteria

- A member with linked records is never reported as physically deleted when the API only deactivates them.
- Inactive members do not appear in default public/current lists; authorized staff can find and reactivate them.
- Reactivation preserves all linked records and restores the member to the intended list views.
- Existing public member and committee data remains stable for active members.

## Phase 3 — Align announcement deletion UI and authorization (P1)

**Likely files:**

- `server/routes/announcements.js`
- `client/src/pages/NewsAdmin.jsx`
- `client/src/App.jsx` or shared permission helpers
- route/controller and UI permission tests

### Work

1. Implement the role policy recorded in Phase 0 consistently in route authorization and UI affordances.
2. Keep the server as the security authority; hiding a button does not replace API authorization.
3. Surface a useful permission or deletion error instead of the current generic toast.
4. Test allowed and denied role behavior, including direct API requests by an unauthorized role.

### Acceptance criteria

- Every role shown a delete action can complete the operation through the API.
- Roles without delete permission do not see an actionable delete control and receive a clear denial if they call the API directly.
- Existing publish/edit permissions remain unchanged unless explicitly included in the agreed policy.

## Phase 4 — Fix tablet ordinance actions and reconcile visual baselines (P1)

**Likely files:**

- `public-portal/src/pages/Ordinances.jsx`
- relevant public portal styles/components and page tests
- `public-portal/.visual-baseline/baseline/` only after visual review

### Work

1. Rework the document row action layout so status badges and PDF view/download actions wrap or stack without overlap at tablet widths. Preserve usable touch targets and accessible names.
2. Verify the same action layout at mobile and desktop widths and with long status labels/document titles.
3. Review the consultation OTP field screenshots. If the 92px increase is intended, update only the affected baselines after the visual change is approved. If not intended, correct the layout first.
4. Re-capture all visual diffs and inspect them; do not update baselines merely to silence a regression gate.

### Acceptance criteria

- Ordinance status, view, and download controls are individually visible, operable, and non-overlapping at 390px, tablet, and desktop viewports.
- Public portal visual verification passes with no unexplained diffs.
- Any baseline updates correspond to reviewed intended changes and are limited to affected screenshots.
- Rendered route and browser-console checks continue to pass.

## Phase 5 — Correct session search and deletion feedback (P2)

**Likely files:**

- `server/controllers/sessionController.js`
- session query validation and routes
- `client/src/pages/Sessions.jsx`
- `client/src/pages/Terms.jsx`
- `server/controllers/termController.js` (inspect existing linked-record behavior; change only if needed)
- server/client tests

### Work

1. Add validated server-side session search parameters and apply search before pagination. Preserve the existing sort order and pagination metadata.
2. Search the fields represented by the UI, including title and date; define any additional supported fields before exposing them in placeholder/help text.
3. Remove page-local filtering as the source of truth; render a distinct “no matches” state when total search results are zero.
4. Surface safe, actionable term deletion errors from the API, especially linked-record restrictions. Keep generic fallback handling for unexpected errors.
5. Add tests for results on later pages, no matches, malformed query values, counts/pages under search, and blocked term deletion feedback.

### Acceptance criteria

- Search results include matching sessions from every page and pagination reflects the filtered result set.
- Empty search results are distinct from an empty session database.
- Invalid search/pagination input returns a predictable validation response rather than an unbounded query or server error.
- When linked records prevent term deletion, staff see the actual reason and can identify which action to take.

## Phase 6 — Improve Render cold-start behavior (P2)

**Likely files:**

- `packages/api/src/index.ts`
- public/admin loading and error states where requests are initiated, especially `public-portal/src/pages/Home.jsx`
- shared API and portal tests
- deployment configuration only if the verified Render plan supports a relevant setting

### Work

1. Verify the currently deployed Render plan and observed cold-start range; do not rely only on a dashboard warning.
2. Add bounded retry behavior for safe idempotent reads on network errors/timeouts. Do not automatically retry create, update, or delete requests, which could duplicate operations.
3. Choose a request timeout that accommodates the measured cold-start behavior while preserving a clear user-facing loading state. Consider per-request settings instead of globally delaying every mutation.
4. Ensure homepage data failure can be retried by the user or automatically once with a bounded policy; show an explicit loading/unavailable state rather than a permanent empty state.
5. Test retry limits, timeout behavior, cancellation/unmount handling, and successful second-attempt responses.

### Acceptance criteria

- A delayed first GET can recover within the bounded retry policy and populate the page.
- After retry exhaustion, the UI shows a recoverable service error and a retry option.
- Mutations are never silently replayed.
- Normal non-cold requests retain responsive loading behavior and tests prove retries are bounded.

## Phase 7 — Resolve mobile dependency advisories and CI gate (P1)

**Likely files:**

- `mobile-app/package.json` and `mobile-app/package-lock.json`
- workspace package manifests/lockfiles only when the advisory path requires it
- `.github/workflows/ci.yml`
- `docs/mobile-dependency-audit-2026-10-10.md`

### Work

1. Re-run and record a dependency-path audit for all high/moderate mobile advisories; classify direct/transitive, dev/runtime, and shipped/not-shipped paths.
2. Upgrade or override the narrowest compatible transitive dependencies where safe; check Expo/React Native compatibility before changing core versions.
3. If an advisory cannot be safely remediated, document the affected path, exploitability, mitigation, owner, and review date. Do not lower the CI threshold to make the workflow green.
4. Update the existing mobile audit document and CI only to reflect evidence-backed remediation or an explicit reviewed exception.

### Acceptance criteria

- `npm audit --audit-level=high` passes for the mobile job, or a documented security review explicitly approves a narrowly scoped exception without weakening unrelated checks.
- Expo dependency compatibility, doctor, lint, typecheck, tests, and production build pass after changes.
- Lockfile changes are reproducible with clean install and no unrelated mass upgrades.

## Phase 8 — Validate SB member query limits and preserve bounded behavior (P2)

**Likely files:**

- `server/controllers/sbMemberController.js`
- `server/routes/sbmembers.js`
- SB member query validation and tests

### Work

1. Preserve the documented `limit=0` behavior only for explicitly intended unpaginated dropdown use.
2. Reject malformed, negative, non-integer, or excessive limits with a clear 400 response; do not parse invalid input as zero/unbounded.
3. Set a server-side maximum for paginated reads and confirm client callers that intentionally need all records use an explicit, bounded contract or a dedicated endpoint.
4. Add query validation and tests for omitted, zero, valid, malformed, negative, and over-maximum values.

### Acceptance criteria

- Malformed requests can never trigger the “fetch all” query path.
- Documented dropdown callers continue to work, while normal list calls remain paginated and bounded.
- Query errors are deterministic 400 responses.

## Verification strategy

Run focused regression tests during each phase, then the full relevant suites. Detected repository commands from the audit include:

```text
server:        npm run test:ci
client:        npm run test:ci && npm run lint && npm run build
public-portal: npm run test:ci && npm run lint && npm run build && npm run verify
mobile-app:    npm run test:ci && npm run lint && npm run typecheck
               npx expo install --check && npx expo-doctor
packages/api:  npm test && npm run typecheck && npm run build
packages/ui:   npm test && npm run typecheck && npm run build
design tokens: npm run build && npm run typecheck
security:      npm audit --audit-level=high (each CI-audited package)
```

Run package commands from their package directories. `public-portal npm run verify` includes tests, lint, build, route rendering, design checks, baseline integrity, and visual diffs. The 2026-10-12 run failed only at the final visual-diff gate after the preceding portal checks passed; the ordinance tablet overlap must be fixed and the OTP screenshots reviewed before declaring the gate green.

## Release and production-safe rollout

1. Complete Phases 0–8 and have an independent review of account creation, authorization, lifecycle, and security-sensitive changes.
2. Deploy to a preview/staging environment with isolated database records and mocked or test email delivery.
3. Verify user creation and invitation delivery with test accounts, including failure and retry cases. Do not create test accounts in production.
4. Verify SB member deactivation/reactivation and announcement/term/session behavior against staging fixtures only.
5. Run public portal viewport checks and inspect the final screenshots at mobile, tablet, and desktop sizes.
6. Confirm CI passes, dependency findings are resolved or formally reviewed, and the deployment health/API checks are green.
7. After deployment, perform read-only production smoke checks first. Production create/edit/delete flows require designated test accounts and an explicit data-safe test plan; never use real legislative records for destructive tests.

## Implementation results (2026-10-12)

- User creation now accepts normal institutional email domains, normalizes addresses, presents the canonical Vice Mayor position, keeps invitation failures recoverable as Pending accounts, offers a resend action, and searches by email. API responses do not include passwords.
- SB member lists exclude inactive records by default, support a separate inactive view and reactivation, preserve members with linked history, and default to 20 results. `limit=0` remains explicit for the member dropdowns that need the full roster; malformed and excessive limits return 400.
- The announcement delete affordance is limited to System Admins, matching the existing server policy. Term deletion errors show the linked-record restriction returned by the API.
- Session title/date search now runs on the server before pagination, with a distinct no-match state and validated search/pagination inputs.
- The shared web API retries one failed GET after 250ms for transport errors and gateway/service-unavailable responses. It does not retry mutations or canceled requests; the 30-second timeout remains unchanged.
- Public portal responsive audits, route rendering, and browser-console checks pass. Screenshot review confirms the OTP field accounts for the three consultation-page height increases; the shared record-action layout fixes tablet ordinance/resolution rows and changes the home/session tablet rows. The approved file boundary includes five PNGs but omits `.visual-baseline/baseline/manifest.json`, `resolutions--tablet.png`, and `sessions--tablet.png`, so no baseline files were rewritten. One unexplained diff remains at `ordinances--desktop.png`; the visual regression gate therefore remains red.
- Mobile checks pass for tests, lint, typecheck, Expo compatibility, and Expo Doctor. `npm audit --audit-level=high` still reports 25 high and 3 moderate findings. The current Expo 57 dependency graph includes advisories for `node-forge` and `braces` with no patched releases; npm's suggested fixes downgrade Expo/React Native out of the SDK compatibility set. The compatible ESLint-plugin upgrade was reverted because it surfaced three existing lint violations in files outside the approved manifest. CI's high-severity threshold was left unchanged and no unreviewed exception was added.
- Local verification passed: server 144 tests; client 46 tests, lint, and production build; public portal 220 tests plus lint/build/rendered/design checks; shared API 62 tests, typecheck, and build; mobile 65 tests, lint, typecheck, Expo install check, and 21/21 Expo Doctor checks. The public portal's only failing verify stage is visual diff (8 images).
- Staging verification, production data changes, and deployment were not performed under this task's approved boundary.

## Completion checklist

- [x] Account creation supports valid institutional domains and the canonical Vice Mayor position.
- [x] Invitation delivery failures are recoverable and accurately reported.
- [x] User email search works.
- [x] SB member lifecycle, public filtering, inactive view, reactivation, and bounded pagination are covered.
- [x] Announcement delete UI matches server authorization.
- [x] Session search runs server-side and term deletion displays linked-record restrictions.
- [x] Shared web GET recovery is bounded; mutations are not retried.
- [ ] Reviewed public portal baselines pass. Visual changes are reviewed; one desktop ordinance diff is unexplained, and the exact manifest omits the baseline hash manifest plus resolutions/session tablet screenshots.
- [ ] Mobile high-severity advisories are remediated or reviewed by an authorized security reviewer; the CI audit still fails and its threshold is unchanged.
- [x] Client, server, portal, API, and mobile code checks pass as listed above; portal visual diff remains the only code verification failure.
- [ ] Staging smoke checks and deployment are pending separate release authorization.
- [x] Existing unrelated working-tree modifications were preserved.
