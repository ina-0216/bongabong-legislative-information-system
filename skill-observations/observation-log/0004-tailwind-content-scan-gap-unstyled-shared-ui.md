---
id: 4
title: Shared package classes never compile unless Tailwind content glob includes packages source (not just app src)
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — checked, shared with any frontend build-audit skill; no propagation to other skills
area: implementation audit of token/monorepo styling
date: 2026-09-25
session_context: iBOSys full design deep-audit. public-portal tailwind.config.js content glob is [./index.html, ./src/**/*]; shared @ibosys/ui + @ibosys/design-tokens classes (built into ../packages/...) are never scanned, so migrated Card/Badge/Button render unstyled even though imports resolve and build passes.
---

**Issue:** Tailwind's content glob in the host app scans only its own ./src, excluding sibling package sources the project aliases to (../../packages/ui/src, ../../packages/design-tokens). Build succeeds, imports resolve, but every utility class in shared components produces zero CSS rules — components render bare/unstyled. Verified via grep across the compiled dist: shared-component classes appear 0 times in built CSS.

**Suggested improvement:** When auditing or wiring a Vite+Tailwind v4 monorepo consumer, (1) verify the content/@source glob actually includes each packages/** source tree (not only app ./src), (2) grep the generated dist CSS for a distinctive shared-component class string to confirm it compiled, and (3) treat "build passes but page looks broken" as a content-scan suspect before touching component code.

**Principle:** A passing build proves imports resolve, not that classes compile; Tailwind v4 content globs must cover every package source the app derives its classes from, and shipping a shared package effectively moves that package's source into the consumer's content scan.
