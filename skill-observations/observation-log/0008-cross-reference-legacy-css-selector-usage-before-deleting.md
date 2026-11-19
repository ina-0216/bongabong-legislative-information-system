---
id: 8
title: Before deleting a legacy CSS block, cross-reference every selector against real usage incl. dynamic class construction
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — design-system drift audits; not propagated elsewhere
area: Legacy CSS cleanup / dead-code elimination
date: 2026-09-25
session_context: iBOSys design audit. An existing migration plan called for deleting a ~450-line \"legacy\" CSS block. Cross-referencing proved 43 of 64 selectors were still live; only 21 were dead. Blind deletion would have broken the portal's header, hero, nav, buttons and sections.
---

**Issue:** A pre-existing migration plan specified deleting \index.css\ lines 251-705 as \"legacy.\" In reality, a selector-usage cross-reference showed **43 of 64** selectors in that span were still applied by live JSX (\portal-brand\, \portal-hero\, \utton-primary\, \hero-lede\, etc.). Only 21 were genuinely dead. Executing the plan as written would have removed the portal's entire primary UI.

**Suggested improvement:** Before deleting a stylesheet region, (1) extract every class selector defined in the range, (2) search the whole app source for each as a whole word, and (3) additionally check for dynamically-built class names (\getBadgeStyle()\, \STAGE_COLORS[status]\, template literals) so utility-returning functions are not mistaken for unused CSS. Then remove only confirmed-dead selectors plus their now-orphaned \@media\ overrides and cross-references in shared selector groups.

**Principle:** Treat an inherited plan's line numbers as a hypothesis, not an instruction. Re-derive the boundary from current code before executing destructive edits; a cleanup plan is as stale-prone as any other artifact.
