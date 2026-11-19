# Ordinance and Resolution Creation Implementation Plan

## Objective

Improve the admin Ordinance/Resolution creation flow so staff can create, edit, track, and produce records that distinguish working drafts from official final documents and better match Bongabong Sangguniang Bayan document formats.

This plan is separate from `docs/session-minutes-implementation-plan.md`. Session minutes remain a related record that can link to an Ordinance or Resolution, but session-minutes authoring is outside this plan's implementation scope.

**Secretary-confirmed workflow rule:** Committee selection is done only during the **Committee Assignment** stage. The create/edit authoring flow must not offer committee selection or preassign a committee.

## Reference Review

The project has one shared **Propose Ordinance/Resolution** form. It captures type, number, title, proponent, term, committee, explanatory note, enacting clause, general provisions, dynamic titled sections, penalty clause, summary, and an optional PDF upload. It can generate a PDF from the saved fields.

Comparison material reviewed:

- [Proposed Naga City Ordinance, April 2026](https://www2.naga.gov.ph/wp-content/uploads/2026/04/2nd-Version-NB3_2026-0649-Hon.-Sergio-4.13.26-Naga-City-Peaceful-Nights-and-Anti-modified-Muffler-Ordinance.pdf) — a draft transmittal followed by a numbered draft ordinance body.
- [Bongabong Municipal Ordinance No. 2020-14](https://www.bongabong.gov.ph/assets/issuances/ordinances/Ordinances%202020/MUNICIPAL%20ORDINANCE%20NO.%202020-14.pdf) — complete local ordinance with session excerpt, attendance, author/co-authors, recitals, sections, effectivity, certification, attestation, and mayor approval.
- [Pura Sangguniang Bayan Resolution No. 002, Series of 2025](https://puratarlac.gov.ph/wp-content/uploads/2026/01/Res.-No.002-series-of-2025-Maungib-High-School-Work-Immersion.pdf) — complete resolution with recitals, motion/seconder, resolved clauses, adoption result, and certification/attestation.
- `JUNE 15, 2026 - MINUTES.pdf` — local examples of adopted resolutions and their motion, second, and approval language.

These examples are structural references. Final legal wording and required signatories should be confirmed against the Sangguniang Bayan's approved templates before publication.

## Current Gaps

- The same generic form and PDF layout are used for both document types.
- Committee is selected in the Propose Ordinance/Resolution form and is required by the Mongoose model, even though the legislative pipeline has a separate Committee Assignment stage. Advancing to that stage currently only notifies members using the committee chosen earlier; it does not perform an assignment.
- `enactingClause` is optional. If blank, generated PDFs use **"BE IT ORDAINED"** regardless of type, which is incorrect for a Resolution.
- The form has no persistent Draft status. New records are created directly at First Reading; the current browser auto-save is only a local draft.
- The PDF generated from form fields is a simplified record. It omits session excerpts, attendance, co-authors, motion/seconder, vote/adoption result, and mayor approval/date fields found in complete examples.
- The schema stores one `proponentId` and a free-form number but has no co-author list, structured series/year, resolution motion/seconder, adoption result, or named signature metadata.
- Create validation allows arbitrary optional `type` and does not enforce all required fields at the API boundary. Persistence constraints catch some omissions later.
- The client uses a five-stage Resolution workflow, while the server status handler validates against the shared Ordinance stages and permits jumps to later stages instead of enforcing type-specific consecutive transitions.
- The uploaded official PDF and generated PDF are not clearly distinguished as source/signed original versus system-produced draft.

## Target Record Workflows

### Draft authoring

- Secretary/System Admin can save a record as a private Draft before it enters the legislative pipeline.
- Drafts are editable and excluded from public listings, public search, statistics that count introduced measures, and public downloads.
- Draft creation supports auto-numbering or manual numbering according to the approved local numbering convention; the plan must not invent that convention.
- Submission/filing explicitly moves the record from Draft to First Reading and records who filed it and when.
- New measures remain unassigned at creation. Committee choice is available exclusively as an explicit action during the Committee Assignment stage, per the Secretary's direction.

### Ordinance

Keep the 9-stage Ordinance path. Provide an Ordinance-specific authoring template with:

- Ordinance number and series/year, full title, authors/co-authors, sponsor/proponent, term, committee, and sector.
- Explanatory note and legal/policy basis.
- Correct ordinance enacting clause.
- WHEREAS recitals and numbered operative sections, including definitions, penalties, separability, repealing, and effectivity clauses as applicable.
- Optional linked session, adopted reading details, attendance excerpt, and final approval/signatory metadata when those records are available.
- Optional upload of the signed official source PDF.
- No committee selector during creation or ordinary editing; the user selects the committee only in the Committee Assignment stage, per the Secretary-confirmed rule.

### Resolution

Keep the 5-stage Resolution path. Provide a Resolution-specific authoring template with:

- Resolution number and series/year, full title, sponsor/proponent, term, and committee.
- WHEREAS recitals and one or more RESOLVED clauses.
- Structured fields for motion maker, seconder(s), adoption/vote result, adoption date, and any follow-up distribution instruction.
- Resolution-specific enacting/opening wording; never fall back to an ordinance clause.
- Certification and attestation metadata, with mayor approval fields only when required by the municipality's approved resolution form.
- Optional upload of the signed official source PDF.
- No committee selector during creation or ordinary editing; the user selects the committee only in the Committee Assignment stage, per the Secretary-confirmed rule.

## Implementation Work

### 1. Confirm local document rules

**Owner/input:** Secretary to the Sangguniang Bayan

- Confirm number/series convention, who may create drafts, filing action, exact Ordinance and Resolution templates, required signatures, and which fields belong in the generated document versus the uploaded signed original.
- Use approved Bongabong templates as the acceptance reference. External examples do not override local requirements.

### 2. Model Draft and document metadata

**Likely files:** `server/models/Ordinance.js`, `server/validations/ordinanceValidation.js`, `server/controllers/ordinanceController.js`

- Add a private Draft state or explicit `isDraft` lifecycle with clear transition to First Reading. Preserve the existing initial status behavior for already-filed records.
- Add optional `seriesYear`, `coAuthors`, and type-specific resolution action fields; preserve existing `number`, `proponentId`, and older records.
- Add signature/adoption metadata only after confirming which named roles and dates are required locally.
- Enforce enum values for `type` and required create fields in Zod, aligned with Mongoose requirements.
- Enforce type-specific valid stages and consecutive forward transitions on the server.
- Ensure Draft records cannot appear in public endpoints, public portal listings, or public statistics.

### 3. Build type-specific Create/Edit authoring

**Likely files:** `client/src/pages/EncodeOrdinance.jsx`, `client/src/components/features/OrdinanceBasicInfoSection.jsx`, `client/src/components/features/OrdinanceProvisionsSection.jsx`, `client/src/components/features/OrdinanceSectionsEditor.jsx`

- Retain the common identity fields but change the body sections and labels based on Ordinance vs Resolution.
- Add a persistent Save Draft action and a separate File/Submit action.
- Add optional co-authors and series/year support once local conventions are confirmed.
- Add resolution motion/seconder/adoption inputs.
- Remove committee selection and its required-field check from this form. Do not prefill a default committee; new records should be saved unassigned.
- Load and save every new field during edit and make local auto-save compatible with the expanded form.
- Keep existing term selection, spell-checking, dynamic sections, and upload behavior. Committee selection is handled only in the assignment workflow below.

### 4. Generate document-type-specific PDFs

**Likely file:** `server/services/pdfService.js`

- Split the current generator into Ordinance and Resolution render paths with shared typography/header helpers.
- Generate correct headings, number/series, body order, signatures, and adoption/approval wording for each type.
- Ordinance output should support WHEREAS, enacting clause, numbered sections, and optional penalties/effectivity.
- Resolution output should support WHEREAS, motion/seconder, RESOLVED clauses, adoption result, and certification/attestation.
- Remove the generic **"BE IT ORDAINED"** fallback from Resolution output.
- Mark system-generated output as a draft/working copy until explicitly finalized; keep uploaded signed originals distinct and download labels clear.
- Keep sanitization and escaping for user-entered HTML and text.

### 5. Align routes, public access, and linked session records

**Likely files:** `server/controllers/ordinanceController.js`, public ordinance/session endpoints, `client/src/pages/Sessions.jsx`, `client/src/pages/OrdinanceDetail.jsx`

- Gate public access on filed/finalized status according to the agreed publication policy.
- Show record type in the session link picker and retain both Ordinance and Resolution relationships.
- When creating a session, selecting an Ordinance or Resolution must persist a direct association to that exact document record. Save stable record IDs (not only the displayed number/title), and support linking more than one item when selected.
- After the session is saved, show the association in the session details and expose the linked session from the Ordinance/Resolution details. Editing a session must retain, add, or remove its selected links consistently.
- Validate that every selected ID exists and points to an Ordinance or Resolution; reject invalid references clearly and avoid leaving one side of the relationship stale if the app stores both directions.
- Ensure linked sessions are supplementary context and do not overwrite the uploaded official instrument.
- Use the type-specific five-stage Resolution workflow in both UI and API.

### 6. Make Committee Assignment a distinct workflow action

**Likely files:** `client/src/pages/OrdinanceDetail.jsx`, committee assignment UI component, `server/models/Ordinance.js`, `server/validations/ordinanceValidation.js`, `server/routes/ordinances.js`, `server/controllers/ordinanceController.js`

- Allow committee selection exclusively when a measure is at **Committee Assignment**. Do not expose a committee selector in create/edit forms or another workflow stage. Show the assignment control in that stage and keep the assigned committee read-only elsewhere; any reassignment should use an explicit action with a timeline entry.
- Populate the selector from the configured active committee list and validate the choice server-side. Persist the selected committee and assignment metadata (at minimum assigned committee, assigned by, and assignment date) on the specific Ordinance/Resolution. Reuse the existing `committee` field where possible to preserve current filters and reports; make it optional until assigned.
- Require a valid committee before the record can leave Committee Assignment for Committee Hearing (Ordinance) or the next type-specific stage (Resolution). Do not silently advance an unassigned measure.
- Trigger committee assignment notifications only after the assignment is successfully saved, using the selected committee and document type. Do not send assignment notifications merely because a status transition was requested.
- Keep committee reports associated with the assigned committee and prevent report entry before assignment where the workflow requires it.
- Backward-compatibly treat existing records with a populated `committee` as already assigned; preserve their existing committee value and reporting behavior.

### 7. Sync project documentation

**Likely files:** `SecondBrain/Areas/Database_Schemas.md`, `SecondBrain/Areas/Legislative_Workflow.md`, `SecondBrain/Areas/Validation_and_Data_Integrity.md`, `SecondBrain/Resources/PDF_Generation_Specs.md`, relevant UI/API notes.

- Update schema, workflow, validation, and PDF notes to describe the implemented Draft lifecycle and separate type-specific templates.

## Acceptance Criteria

- A valid Ordinance or Resolution type is required; invalid types and missing required fields receive clear 400 validation errors.
- A user can save a private Draft, leave/reopen the form, edit it, and explicitly file it into First Reading.
- Draft records are absent from public endpoints and public metrics until filed/published under the agreed policy.
- Existing records still load and retain their current numbers, titles, attachments, sections, status history, and relationships.
- Ordinance PDFs never use Resolution wording; Resolution PDFs never use **"BE IT ORDAINED"** as fallback.
- Each generated PDF follows the approved local type-specific structure and shows a clear draft/final state.
- Uploaded signed PDF remains retrievable as the official source document and is visually distinct from generated output.
- Server rejects stage values and transitions not permitted for the record's type.
- A newly created Ordinance or Resolution has no committee set. Committee selection is available only at Committee Assignment, per the Secretary-confirmed rule; the assignment persists with who/when metadata and is required before the workflow can proceed beyond that stage.
- Assignment notifications are sent after the committee is saved, not just when the measure enters the Committee Assignment status.
- During session creation, selecting an Ordinance or Resolution links the saved session to the specific record by ID; both session and document detail views show the association, and session edits keep the relationship consistent.
- Session linking identifies the record type and supports associations to both Ordinances and Resolutions.
- SecondBrain notes match implementation behavior.

## Verification Plan

1. Add focused validation and workflow tests for type enum, required fields, draft privacy, Draft-to-First-Reading filing, edit persistence, and each type's status sequence.
2. Generate test Ordinance and Resolution PDFs using representative approved examples and compare headings, clauses, numbers, signatory blocks, pagination, and final/draft labels with the approved Bongabong templates.
3. Verify uploaded signed PDFs remain unchanged and downloadable as source files.
4. Verify Drafts do not appear in public API results, search, statistics, or portal UI.
5. Run relevant server tests and `npm run build` from the `client/` workspace.
6. Sync SecondBrain notes after implementation.

## Suggested Delivery Order

1. Obtain the Secretary's approved templates and numbering/publication rules.
2. Implement Draft lifecycle, validation, and API privacy controls.
3. Implement type-specific authoring fields and edit/reset flows.
4. Implement type-specific PDF generation and source/final copy labeling.
5. Implement/verify Committee Assignment action, gate stage progression on a saved assignment, and notify the selected committee.
6. Implement/verify type-aware status progression and persistent session-to-document associations.
7. Compare rendered samples with local official forms, run verification, and update SecondBrain.

## Out of Scope

- Session-minutes structure or minutes PDF changes; tracked separately in `docs/session-minutes-implementation-plan.md`.
- Automatic legal drafting or AI generation of recitals, clauses, or penalties.
- Replacing or editing signed source PDFs inside the system.
