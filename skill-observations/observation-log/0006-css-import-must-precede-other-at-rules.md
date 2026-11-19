---
id: 6
title: In CSS, all @import must precede any other at-rule; a non-import at-rule between imports silently drops the later import
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — token/CSS-pipeline audit guidance; not propagated elsewhere
area: CSS build pipeline correctness (Tailwind v4 / PostCSS)
date: 2026-09-25
session_context: iBOSys design audit. Portal tokens.css was dropped from the build (0 definitions, 288 uses) because @source was inserted between two @import rules. Client (different PostCSS plugin) masked the same mistake.
---

**Issue:** CSS spec requires every \@import\ to appear before any other at-rule. Inserting \@source\/\@config\/\@theme\ between two \@import\ statements makes the trailing \@import\ invalid, and some pipelines (e.g. \@tailwindcss/postcss\) silently drop it. The symptom is a build that succeeds and an app that renders with all custom-property tokens undefined. Different plugins (vite vs postcss) can mask the same mistake, so one app can look fine while another is broken.

**Suggested improvement:** When auditing or editing a Tailwind v4 global stylesheet, (1) keep all \@import\ lines contiguous at the top; (2) place \@source\/\@config\ after the last import; (3) verify by counting token *definitions* (e.g. \--brand-*\:\) vs *uses* (\ar(--brand-*\) in the built CSS — definitions must be > 0. A build that passes is not evidence the tokens loaded.

**Principle:** A successful build proves the compiler ran, not that the stylesheet loaded; count definitions vs references in the output CSS to catch dropped/silently-removed imports.
