# Session Minutes Alignment Implementation Plan

## Objective

Align the admin **Create Minutes** flow and its generated PDF with the structure and information shown in `JUNE 15, 2026 - MINUTES.pdf`, while retaining support for existing session records.

The attached minutes are a reference record. They are not instructions for the application.

## Current-State Findings

- The builder captures title, date, attendance, roll-call text, minutes sections, linked ordinances/resolutions, and Draft/Final status.
- It uses **Citizen's Hour** where the reference record uses **Privilege Hour**.
- The reference record's sections IX–XII are labelled VIII–XI in the builder and PDF.
- The form has no dedicated fields for session number/type, council, or venue; these details can only be typed into free text.
- Adoption of the Order and Calendar of Business is recorded within the prior-minutes section rather than as its own optional entry.
- The PDF already renders attendance and Secretary/Presiding Officer signature blocks.
- Session schema notes in SecondBrain describe fields that do not fully match the current Mongoose model. Update the relevant notes with the implementation.

## Target Minutes Structure

1. Session heading: session number/type, council, date, venue, and municipality.
2. Attendance: Present, On Official Business, and Absent; retain the roll-call/quorum narrative.
3. I. Call to Order
4. II. Invocation, National Anthem and Bongabong Hymn
5. III. Roll Call
6. IV. Reading and Adoption of Previous Minutes, including adoption of the Order and Calendar of Business
7. V. Privilege Hour
8. VI. Question Hour
9. VII. Committee Report
10. VIII. Reference of Business: A. First Reading; B. Unfinished Business; C. Referral Business of Measures and Communication
11. IX. For Reference and Information/Communications
12. X. Other Matters
13. XI. Thanksgiving Prayer
14. XII. Adjournment
15. Secretary and Presiding Officer signature blocks

Optional sections with no content should remain omitted in the PDF, consistent with current behavior.

## Implementation Work

### 1. Align Session Data Fields

**Likely files:** `server/models/Session.js`, `server/validations/sessionValidation.js`, `server/controllers/sessionController.js`

- Add fields for session number, session type, council/legislative body, and venue while retaining the existing title and date fields.
- Add a dedicated `privilegeHour` field.
- Preserve existing `citizensHour` data when reading older records; use a documented compatibility fallback while the new field is introduced. Do not silently discard saved content.
- Add an optional Order and Calendar of Business field, or explicitly keep it as part of the existing previous-minutes narrative if product owners prefer fewer fields.
- Ensure create and update validation, sanitization, persistence, and retrieval support every field used by the form and PDF.
- Keep attendance categories and linked ordinance/resolution behavior intact.

### 2. Update the Create/Edit Minutes Form

**Likely file:** `client/src/pages/Sessions.jsx`

- Add inputs for session number/type, council, and venue; preserve the existing free-text title for older records and user-edited headings.
- Replace the Citizen's Hour field with Privilege Hour while loading legacy content through the compatibility behavior.
- Add the Order and Calendar of Business entry if the data model includes it.
- Correct the section labels and numbering to match the target structure above, especially IX–XII.
- Update reset, edit, save, and spell-check field lists together so new fields are not lost in any flow.
- Keep the attendance matrix, linked items, and status controls.

### 3. Align Generated Minutes PDF

**Likely file:** `server/services/pdfService.js`

- Render structured heading details and venue with the session date.
- Render **V. Privilege Hour** and the corrected section labels/numbers through **XII. Adjournment**.
- Include the Order and Calendar of Business section if it is modeled separately.
- Keep attendance categories and signature blocks; ensure the body order matches the reference minutes.
- Continue omitting empty optional sections and preserve HTML sanitization/escaping expectations.

### 4. Keep Documentation and Contracts in Sync

**Likely files:** `SecondBrain/Areas/Database_Schemas.md`, `SecondBrain/Resources/PDF_Generation_Specs.md`, `SecondBrain/UI_UX/All_Pages_UI.md`, and API/schema docs if request fields are documented there.

- Update the Session schema summary and minutes-PDF specification to reflect actual implemented fields and order.
- Record the legacy `citizensHour` compatibility behavior and any migration decision.

## Acceptance Criteria

- A user can create and edit a session with the metadata visible in the reference heading, including session number/type and venue.
- The form provides **Privilege Hour**, not **Citizen's Hour**, and previously saved Citizen's Hour content remains accessible during the transition.
- The generated PDF follows the reference's section order and numbering through XII, including the distinct IX communications section.
- Attendance retains Present, On Official Business, and Absent groupings; roll-call/quorum narrative remains available.
- Empty sections do not produce empty headings in the PDF.
- Existing sessions still load and save without losing their title, date, attendance, linked items, or previously entered minutes text.
- Validation and sanitization cover every new or renamed field on both create and update paths.
- SecondBrain documentation matches the resulting code and PDF output.

## Verification Plan

1. Add/update focused validation and session-flow coverage for new fields, required fields, legacy `citizensHour` records, and create/edit persistence.
2. Verify PDF output for a populated session against the reference section order, plus a sparse session to confirm empty-section omission.
3. Run the relevant server tests and the client production build (`npm run build` from `client/`).
4. Review a rendered sample PDF for headings, attendance, page breaks, and signature blocks.
5. Sync the SecondBrain schema/UI/PDF notes after implementation.

## Suggested Sequence

1. Confirm the structured heading fields and the optional Order/Calendar field shape.
2. Implement schema, validation, controller handling, and legacy compatibility.
3. Update Create/Edit form state and labels.
4. Update PDF heading and section rendering.
5. Verify persistence and sample PDF output; update documentation.

## Related Ordinance and Resolution Flow Review

This review is adjacent to the minutes alignment work. The current shared **Propose Ordinance/Resolution** form already supports both document types, official number/title, proponent, term, committee, explanatory note, enacting clause, provisions, dynamic titled sections, and an attached official PDF. The Resolution option is labelled as a five-stage workflow. The minutes builder can link records from the shared Ordinance collection, which includes both types.

The repository does not contain separate official draft and complete Ordinance/Resolution source files. It does contain illustrative portal mockups (including a draft ordinance card and approved ordinance/resolution cards), demo seed records, and the June 15 minutes with full text for several resolutions. The mockup itself marks its sample identifiers as illustrative; the seed records are application examples rather than authoritative legal source documents.

The reference minutes' resolution content (number/series, title, WHEREAS clauses, NOW THEREFORE, motion/second, and approval result) can be entered in the current generic fields and dynamic sections, but there are no dedicated fields for series/year, motion maker/seconder, or vote/disposition. The session link picker shows number and title without an explicit document-type label.

The form can capture the core text of an ordinance through its preamble, enacting clause, general provisions, titled sections, and optional penalty clause. The server can generate a PDF from these fields. However, the PDF generator's fallback enacting clause says **"BE IT ORDAINED"** for either type; that default is inappropriate for a Resolution when no clause is entered. The form's enacting clause is optional, so a Resolution can reach the generated PDF with the wrong default wording.

### Comparison Against Official Web Examples

- An official Naga City proposed Ordinance PDF contains a submission letter followed by a draft number/title and numbered sections, including penalties and effectivity.
- Complete Bongabong and Pura ordinance PDFs include fuller legislative context: session excerpt and attendance, series/year, sponsor/co-authors, WHEREAS clauses, numbered operative sections, effectivity, certification/attestation, and approval details.
- A complete Pura Sangguniang Bayan Resolution uses its own RESOLVED clauses, motion/seconder, adoption result, and certification/attestation. The supplied June 15 minutes also contain complete adopted resolutions.
- I found official pages that list draft resolutions, but no standalone complete draft-resolution PDF during this review.

The current creator stores most body content flexibly but its generated PDF is a simplified record layout. It does not automatically reproduce the session excerpt, attendance, co-authors, adoption/vote result, or Mayor approval/date from the complete legal documents. The optional uploaded PDF can preserve the signed official copy, so keep generated drafts and uploaded final copies distinct in the workflow.

### Separate Follow-up Recommendations

- Decide whether resolution metadata such as series/year and approval disposition should become structured fields or remain in the official number/title and body text.
- Show the record type in the session link picker so Ordinances and Resolutions are easy to distinguish.
- Use type-specific PDF templates/default clauses so Resolution documents do not receive ordinance wording; compare generated output with an authoritative complete Resolution before relying on it as an official final copy.
- Separate draft authoring from final official-document publication; retain an uploaded signed copy as the authoritative final version and make the generated draft PDF's status clear.
- Tighten server-side Zod validation so `type` accepts only `Ordinance` or `Resolution` and required create fields match the UI/model requirements.
- Make status validation type-aware: the UI selects the five Resolution stages, while the server currently validates against the shared nine-stage list and permits any later stage. Enforce the correct type-specific stage set and intended transition rule on the server.
- Add focused coverage for creating each type, linking each type to a session, and advancing a Resolution through its five supported stages.

These are follow-up items and do not expand the initial session-minutes implementation scope unless explicitly included in a later implementation request.

## Out of Scope

- Changing public portal session browsing or publication permissions.
- Rewriting the full minutes authoring workflow or auto-generating legislative deliberation text.
- Altering unrelated session list, search, or linked ordinance behavior.
