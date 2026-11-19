---
id: 0003
title: responsive layout must not render children twice for kill mobile/desktop variants
observation: When a layout provides desktop and mobile variants by rendering `{children}` inside two separate elements (a `hidden md:flex` desktop `<main>` and an `md:hidden` mobile `<main>`), the entire page mounts twice — duplicate DOM, duplicate IDs, duplicated network fetches. Responsive switching must be done on the single container (flex-direction toggle + `hidden md:block` on the sidebar), never by rendering children in two places.
location: public-portal/src/components/TermSidebarLayout.jsx
fix: single `<main>{children}</main>`; wrapper switches `flex flex-col md:flex-row`, aside gets `hidden md:block`.
rule: one render of dynamic content per page; responsiveness via classes, not restructure.
sources: capstone public portal audit 2026-09-25 I-1; dom dumps showed keyword-search x2, committee-search x2, members content x2.