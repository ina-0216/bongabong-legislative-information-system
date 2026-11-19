---
id: 2
title: Monorepo package bundles its own React copy unless Vite dedupes
status: open
type: open-source
skill: [design-quality]
proposes_skill: []
siblings_checked: design-quality — checked, instance-specific, no propagation
area: audit verification setup in monorepo workspace
date: 2026-09-25
session_context: public-portal used packages/ui (aliased to its dist). StatCard imports framer-motion; app's runtime threw "Cannot read properties of null (reading 'useContext')" / one copy of React per package until resolve.dedupe was added.
---

**Issue:** Vite aliases `@ibosys/ui` to `packages/ui/dist`, and that dist's deep imports resolve `react`/`framer-motion` from `packages/ui/node_modules` while the app loads its own copies in `public-portal/node_modules`. Result: duplicate React in one bundle; any framer-motion hook crashes the page. The fix was `resolve.dedupe: ['react', 'react-dom', 'framer-motion', ...]` in vite.config.js and clearing `node_modules/.vite`.

**Suggested improvement:** When auditing a Vite workspace whose package is aliased to a sibling's dist, verify dependency deduplication before trusting rendered output. Add `dedupe` for react + the shared animation/metrics libs and clear `.vite` cache after changing the config.

**Principle:** In a Vite monorepo, alias-to-dist packages re-load their own node_modules copies of react/siblings unless resolve.dedupe is set; treat "invalid hook call", "useContext null", and "more than one copy of React" errors as a dependency-resolution audit trigger, not an app logic bug.