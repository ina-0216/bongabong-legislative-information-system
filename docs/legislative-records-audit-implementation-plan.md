# Legislative Records Audit Implementation Plan

## Objective

Close the audited workflow gaps across session minutes and Ordinance/Resolution records: make draft and filing states truthful, enforce type-specific stage progression and the Secretary-confirmed committee rule on the server, protect unpublished records from public APIs, preserve record metadata and session links, and make generated minutes consistent.

This plan consolidates the work requested after the read-only audit. The existing [session minutes plan](session-minutes-implementation-plan.md) and [Ordinance/Resolution plan](ordinance-resolution-implementation-plan.md) remain subsystem references.

## Scope

- Ordinance/Resolution Draft, filing, editing, metadata persistence, stage transitions, locking, and PDFs.
- Committee assignment exclusively at the Committee Assignment stage, including server validation and notices.
- Session-to-measure associations when creating/editing sessions, validation of referenced records, and link display in generated minutes.
- Public visibility of Draft measures and Draft session minutes, including lists, details, latest feeds, and statistics.
- Admin/public minutes PDF parity, safe HTML rendering, and current reference section terminology.
- SecondBrain/API documentation synchronization.

## Confirmed Rules and Current Evidence

- The Secretary confirmed committee selection is available **only** during Committee Assignment. Create/edit authoring must not preassign or change the committee.
- A filed measure enters First Reading; a saved working copy remains Draft. These are separate actions.
- Resolutions use the streamlined type-specific stage sequence; ordinances use their own sequence.
- The session builder already sends selected measure IDs and the Session model stores them in `itemsDiscussed`. The plan completes validation, type identification, public visibility, and PDF display around that association.
- The project test infrastructure is present in `server/tests`, `client/src/test`, and `public-portal/src/test`. The user later requested a functional check, so suites and focused workflow checks were run after implementation.

## Implementation Plan

### 1. Make Draft and filing actions persist distinct lifecycle states

**Likely files:** `client/src/pages/EncodeOrdinance.jsx`, `server/models/Ordinance.js`, `server/validations/ordinanceValidation.js`, `server/controllers/ordinanceController.js`

- Save as Draft persists `status: Draft`, `isDraft: true`, with no filed metadata.
- File & Introduce persists `status: First Reading`, `isDraft: false`, `filedBy`, `filedAt`, and a matching First Reading timeline event.
- Editing preserves the current lifecycle state and persists all form-backed fields: series year, co-authors, Resolution motion/seconder/adoption/distribution fields, sections, summaries, and official PDF URL.
- Filing an existing Draft uses an explicit transition/action and records the filing actor/date. A Draft cannot be “filed” by a UI-only status change that leaves `isDraft` true.
- Locking at Approved remains enforced on the server.

### 2. Enforce type-specific workflow and Committee Assignment server-side

**Likely files:** `server/utils/constants.js`, `server/models/Ordinance.js`, `server/validations/ordinanceValidation.js`, `server/routes/ordinances.js`, `server/controllers/ordinanceController.js`, `client/src/pages/OrdinanceDetail.jsx`

- Reject unknown document types and statuses; use the correct stage set for Ordinance versus Resolution.
- Permit only the next valid stage, not arbitrary forward jumps. Keep Draft-to-First-Reading filing explicit.
- Remove `committee` from create/edit schemas and controller field allowlists. Reject or ignore attempts to assign it outside the Committee Assignment endpoint.
- Populate the assignment selector from the active committee list for the measure's legislative term. Start unassigned with a blank placeholder rather than preselecting the first committee.
- Validate the selected committee against the server-side active committee list and persist the canonical committee plus assignment actor/date/notes.
- Block exit from Committee Assignment until a committee is assigned, including direct API calls. Preserve legacy populated assignments.
- Create the assignment timeline event/notice only after the assignment is saved. Resolve recipients from the selected committee's member data and active member accounts; do not announce that a measure is assigned before selection.
- Gate committee report submission on having an assigned committee and an eligible stage.

### 3. Protect unpublished records on public endpoints

**Likely file:** `server/controllers/publicController.js`

- Exclude records where `isDraft` is true or `status` is Draft from public document lists, direct detail lookup, latest feeds, public statistics, consultation submission, and public feedback lookup.
- Include only Final sessions in public session lists, recent-session widgets, document session-history panels, and public minutes downloads.
- Keep staff endpoints capable of listing Drafts for authorized work.

### 4. Complete session-to-measure associations

**Likely files:** `client/src/pages/Sessions.jsx`, `server/models/Session.js`, `server/validations/sessionValidation.js`, `server/controllers/sessionController.js`, `server/services/pdfService.js`

- Keep the persisted `itemsDiscussed` ObjectId relationship. Validate that each selected ID exists and references an Ordinance or Resolution; return a clear validation error rather than silently keeping a dangling link.
- Label picker entries with document type, number, and title. Retain selected links through edit, replacement, and removal.
- Populate linked measures for generated minutes and render a clearly labeled linked-measures section. Preserve session-to-document reverse lookup behavior.
- Escape plain-text fields before interpolating them into generated HTML. Keep rich-text content sanitized.

### 5. Use one reference-aligned minutes PDF output

**Likely files:** `server/controllers/publicController.js`, `server/controllers/sessionController.js`, `server/services/pdfService.js`

- Route public Final minutes through the same generator used for admin minutes so heading metadata, attendance, section numbering, Privilege Hour, linked measures, and signature blocks match.
- Add a working-copy watermark to internal Draft minutes PDFs; public routes must still reject Drafts.
- Keep empty optional sections omitted and preserve legacy `citizensHour` reads while displaying/printing the current Privilege Hour label.

### 6. Keep documentation current

Update the applicable notes in `SecondBrain/Areas/Legislative_Workflow.md`, `Database_Schemas.md`, `Validation_and_Data_Integrity.md`, `API_Endpoints.md`, `Resources/PDF_Generation_Specs.md`, and `UI_UX/All_Pages_UI.md` to match shipped behavior. Correct stale request/status descriptions only where they conflict with implemented contracts.

## Acceptance Criteria

- Draft and File & Introduce actions produce different, internally consistent persisted status, `isDraft`, filed metadata, and timeline values.
- All Ordinance/Resolution authoring fields exposed in the form survive create and edit round trips.
- The API rejects invalid types/stages and rejects skipped or type-incompatible transitions.
- No create/edit API path can set or alter a committee. Committee selection is possible only in Committee Assignment and advancement is blocked until it is saved.
- Assignment notices occur after successful assignment and do not claim that a blank or unrelated committee received the measure.
- Draft Ordinances/Resolutions and Draft sessions are absent from all public lists, direct lookups, recent feeds, statistics, feedback/submission routes, and public PDFs.
- Session creation/editing preserves valid linked IDs, shows type labels, and includes the linked measures in the generated minutes PDF.
- Public and admin Final minutes PDFs use the same structure and terminology; Draft admin PDFs are visibly labeled working copies.
- Plain-text values are safely escaped in PDF templates.
- SecondBrain and API/UI documentation match the implementation.

## Verification Plan

- Regression coverage includes Draft versus filing behavior, field persistence, type-specific sequential transitions, Committee Assignment gating and API bypass attempts, public Draft privacy, invalid/missing linked session IDs, linked-item persistence/display, and PDF content/status labels.
- Run the server, client, and public portal suites, the client lint/build, and a browser smoke check for login/dashboard/create/edit. Report unrelated suite failures separately.
- Review rendered Ordinance, Resolution, Draft minutes, and Final minutes PDFs against the existing local June 15, 2026 minutes reference and the established official-type templates.
- Sync SecondBrain after implementation.

## Delivery Order

1. Persist the Draft/file lifecycle and authoring metadata correctly.
2. Enforce type-aware sequential transitions and Committee Assignment on the API.
3. Filter unpublished records from public APIs and portal feeds.
4. Validate and display session links; unify minutes PDF rendering and add linked measures.
5. Escape plain-text PDF values and preserve Draft labels.
6. Update SecondBrain/API documentation and report verification status.

## Boundaries

- Do not invent legal wording, numbering conventions, committee rules, or signatory requirements beyond the confirmed workflow and existing approved references.
- Do not alter signed uploaded PDFs.
- Functional verification is limited to the automated suites and browser flows recorded below; it does not claim exhaustive manual coverage of every screen and feature.

## Implementation Record (2026-10-09)

- Implemented the Draft/file lifecycle, type-specific next-stage enforcement, server-only committee assignment, term-based committee options, committee report gating, public Draft filtering, validated session measure/attendance links, and shared safe minutes rendering.
- Synchronized the six SecondBrain pages listed in section 6.
- Public record detail actions now link to an uploaded official `pdfUrl` when present; generated staff document PDFs remain protected by authentication.
- Verification: server suite passed (6 files, 90 tests); client suite passed (5 files, 34 tests); client lint and production build passed. Focused HTTP integration and minutes PDF checks passed (57 focused server assertions and 3 PDF cases). Headless browser smoke verified login, dashboard, Draft Ordinance creation, and editing with no console or page errors. Public portal suite has 8 remaining failures: 6 style-token policy checks and 2 hard-coded copy/i18n checks in portal pages; these are outside the implemented admin workflow changes. Browser smoke used a disposable in-memory database and test account; no production data was involved.
