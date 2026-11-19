---
id: 10
title: Replace raw Tailwind palette colors with semantic variant props in shared components
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — design-system drift audits; complements obs 0009
area: Design system / component API design
date: 2026-09-25
session_context: iBOSys design audit. The shared StatCard accepted iconColor/gColor as free strings, so callers passed raw Tailwind palette classes (	ext-blue-600, g-blue-50, etc.) instead of design tokens. This defeated the single-source-of-truth principle.
---

**Issue:** A shared component's color API was iconColor?: string + gColor?: string. Callers passed 	ext-blue-600/g-blue-50, 	ext-emerald-600/g-emerald-50, etc. — hardcoding Tailwind palette classes at every call site. This meant:
- No single source of truth for status→color mapping
- Impossible to change the palette globally (e.g., for a rebrand or dark mode)
- Visual drift across call sites (some used lue, others cyan for similar meanings)
- The design tokens existed but weren't enforced

**Suggested improvement:** Change the API to a closed ariant enum (primary/success/warning/danger/info/secondary/
eutral). Map each variant to design tokens internally (g-[var(--ibosys-primary-100)] text-[var(--ibosys-primary-600)], etc.). Call sites become iconVariant="success" instead of iconColor="text-emerald-600" bgColor="bg-emerald-50". This enforces the token contract, enables global palette changes, and prevents drift.

**Principle:** A shared component's props should express *intent* (semantic variant), not *implementation* (raw CSS classes). The component owns the token mapping; callers own the semantics.
