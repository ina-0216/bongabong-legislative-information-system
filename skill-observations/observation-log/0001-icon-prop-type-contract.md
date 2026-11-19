---
id: 1
title: Icon props typed ElementType reject JSX element values at runtime
status: open
type: internal
skill: [design-quality, impeccable]
proposes_skill: []
siblings_checked: design-quality, impeccable — shared, both logged
area: implementation audit for React component props
date: 2026-09-25
session_context: Auditing public-portal design; Home.jsx passed icon={<BookOpen size={22}/>} to SectionHeader whose icon prop is ElementType, crashing the page at runtime.
---

**Issue:** A shared component documents `icon?: ElementType` but callers pass a JSX element `icon={<BookOpen size={22} />}`. Because React renders `ElementType` as `<Icon size={16} />`, the page throws "Element type is invalid ... but got: <BookOpen />" — a runtime crash invisible to `npm run build` and lint. Fifty percent of the "audit" turned on diagnosing a crash the build could not catch.

**Suggested improvement:** When auditing React workspaces, check every JSX element passed to an `ElementType`/component prop before trusting any browser dump; and note that "build passes" is not "renders". Also check component source, not just usage, to learn the prop's declared type when a crash appears.

**Principle:** A component prop typed as a component reference must receive the reference, not a rendered element; build/lint success cannot certify runtime render success.