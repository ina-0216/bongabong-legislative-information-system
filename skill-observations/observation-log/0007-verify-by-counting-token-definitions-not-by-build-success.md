---
id: 7
title: Verify CSS token delivery by counting definitions vs references in built output, not by build success
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — token/CSS-pipeline audit guidance; complements obs 0006
area: CSS build pipeline verification (Tailwind v4 / Vite / PostCSS)
date: 2026-09-25
session_context: iBOSys design audit. A green build hid a fully-broken public-portal whose entire token stylesheet was silently dropped. Definition-vs-use counting in dist CSS exposed it immediately.
---

**Issue:** \
pm run build\ succeeded and Vite emitted a CSS bundle, yet the portal had **0** \--brand-*: \ definitions and **288** \ar(--brand-*)\ references. Every token-dependent style resolved to nothing at runtime and nothing in the build output signalled failure. The client, built by a different plugin, happened to inline its tokens, which masked the shared mistake.

**Suggested improvement:** After any change to a global stylesheet that imports a token package, verify delivery by comparing counts in the built artifact:
- definitions: \g -o -- '--brand-[a-z0-9-]+\s*:' dist/assets/index-*.css | Measure-Object\
- uses: \g -o 'var\(--brand-' dist/assets/index-*.css | Measure-Object\
- if uses > 0 and definitions == 0, the token import is being dropped. Also confirm the shared-UI component class tokens (e.g. \--brand-radius-lg\) are present, which proves the content-scan \@source\ reaches the shared package.

**Principle:** A successful build proves the compiler ran, not that the stylesheet loaded. Treat the compiled CSS as the artifact under test, and assert on the properties that matter (definitions present, classes emitted) rather than on the exit code.
