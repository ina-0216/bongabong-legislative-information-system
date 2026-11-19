---
id: 9
title: Extend a shared UI Badge with domain-specific status variants instead of local copies
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — design-system drift audits; not propagated elsewhere
area: Design system / component API design
date: 2026-09-25
session_context: iBOSys design audit. Three apps had competing status-badge maps: client StatusBadge.jsx (15 legislative/account statuses with hardcoded Tailwind palette colors), portal Ordinances.jsx/Resolutions.jsx/LegislativeTimeline.jsx (each with their own STAGE_COLORS). None used the existing tokenized Badge from @ibosys/ui.
---

**Issue:** The shared @ibosys/ui package already provided a tokenized Badge with ariant="status" and sub-variants (draft/pending/approved/rejected/consultation/inProgress). But the domain (legislative stages + account statuses) needed 15 distinct statuses. Each app maintained its own hardcoded map instead of extending the shared component, causing visual drift, duplicated code, and missed a11y (the shared Badge already had dot prop for status indicators).

**Suggested improvement:** When a domain's status taxonomy exceeds the shared component's built-in variants, **extend the shared component** rather than forking:
1. Add the missing status keys to the design tokens (bg/text/border triples per status).
2. Extend the shared Badge's statusStyles record with the new keys.
3. Update the component's TypeScript status type union to include the new keys.
4. Add a small 
ormalizeStatus(displayName) helper to map human-readable status strings to the kebab-case keys the shared component expects.
5. Migrate all call sites to import the shared Badge and pass ariant="status" status={normalizeStatus(...)} dot size="sm".

This keeps the status-color contract in one place (tokens + shared component), gives every consumer the dot indicator and a11y for free, and eliminates the "3 competing maps" drift.

**Principle:** A shared component's variant system should be the single source of truth for its domain. If the domain grows, extend the shared component's variant taxonomy — don't fork. The tokens + component + helper pattern scales cleanly across multiple apps.
