# Public Portal Design System Migration Plan

**Objective**: Unify public-portal under `@ibosys/design-tokens` + `@ibosys/ui` shared packages. Delete legacy CSS (lines 251-705). Fix broken components (DocumentCard, GuestForm). Achieve design quality ≥90/100.

---

## Phase 0: Preparation (Day 0)

### 0.1 Audit Current Usage
- [ ] Search all `public-portal/src/**/*.{jsx,css}` for:
  - Legacy class usage: `.card`, `.btn`, `.badge`, `.doc-card`, `.news-card`, `.member-card`, `.page-banner`, `.search-bar`, `.grid-*`, `.stat-line`, `.section-label`, `.tricolor-bar`
  - Phantom CSS var usage: `--ph-red`, `--primary-blue`, `--accent-gold`, `--primary-blue-dark`, `--shadow-glow-gold`
  - Phantom Tailwind classes: `bg-surface-*`, `border-border-muted`, `text-primary`, `text-on-surface*`, `focus:ring-primary`
- [ ] List every component/page and which design layer it currently uses

### 0.2 Verify Shared Packages
- [ ] Confirm `@ibosys/design-tokens` builds and exports CSS custom properties
- [ ] Confirm `@ibosys/ui` builds and exports: Button, Card, Badge, Input, Modal, SectionHeader, StatCard, Skeleton, SearchBar, Alert, Avatar, DropdownMenu, Tabs
- [ ] Test import in a fresh Vite + React 19 project

---

## Phase 1: CSS Cleanup (Day 1)

### 1.1 Delete Legacy System
- [ ] **Delete lines 251-705** from `public-portal/src/index.css`
- [ ] Keep only:
  - Tailwind v4 `@import "tailwindcss"` + `@theme` block (lines 1-100)
  - iBOSys civic refresh (lines 150-245) — **temporarily**, will replace in Phase 2

### 1.2 Import Design Tokens
- [ ] Add to `index.css`:
  ```css
  @import "@ibosys/design-tokens/tokens.css";
  ```
- [ ] Verify tokens load: `--ibosys-primary-500`, `--ibosys-radius-lg`, `--ibosys-shadow-md`, etc.

### 1.3 Align Tailwind Theme with Tokens
- [ ] Update `@theme` block to reference token values:
  ```css
  @theme {
    --color-primary: var(--ibosys-primary-500);
    --color-primary-foreground: var(--ibosys-on-primary);
    --color-secondary: var(--ibosys-gold-500);
    --radius-lg: var(--ibosys-radius-lg);
    --shadow-md: var(--ibosys-shadow-md);
    /* ... map all semantic tokens */
  }
  ```
- [ ] Remove duplicate color/spacing/typography definitions

---

## Phase 2: Component Migration (Days 2-4)

### 2.1 Create Component Mapping

| Legacy / Broken Component | Shared Package Replacement | Files to Update |
|---------------------------|---------------------------|-----------------|
| `.doc-card` inline styles | `Card` + `Badge` | `DocumentCard.jsx` |
| `.btn` / `.btn-*` | `Button` | `GuestForm.jsx`, all pages |
| `.badge-*` | `Badge` | `DocumentCard.jsx`, `Home.jsx`, all pages |
| `.card` / `.card-padded` | `Card` | All pages |
| `.search-bar` | `SearchBar` | `Home.jsx`, `Ordinances.jsx` |
| `.page-banner` | `SectionHeader` + custom | `Ordinances.jsx`, `Resolutions.jsx`, etc. |
| `.section-label` | `SectionHeader` | `Home.jsx`, all list pages |
| `.stat-line` | `StatCard` | `Home.jsx` |
| `.civic-item` | `Card` + `StatCard` | `Home.jsx` |
| `.record-row` | `Card` (custom layout) | `Home.jsx`, `Ordinances.jsx`, `Resolutions.jsx` |
| `.news-card` | `Card` + `Image` | `Home.jsx`, `News.jsx` |
| `.member-card` | `Card` + `Avatar` | `Members.jsx` |
| `.portal-search-card` | `Card` + `SearchBar` | `Home.jsx` |
| `.modal` (if any) | `Modal` | Check all pages |
| Form inputs | `Input`, `Select`, `Textarea` | `GuestForm.jsx`, search forms |
| Loading states | `Skeleton` | All list pages |

### 2.2 Fix DocumentCard.jsx (Priority: HIGH)
**Current**: Inline styles with 6 non-existent CSS variables
**Target**: Shared `Card` + `Badge` components

```jsx
// Before: 80 lines of inline styles with phantom vars
// After: ~30 lines using shared components

import { Card, Badge } from '@ibosys/ui';
import { Link } from 'react-router-dom';

export default function DocumentCard({ doc }) {
  const isOrdinance = doc.type === 'Ordinance';
  
  return (
    <Link to={`/document/${doc._id}`} className="flex flex-col h-full text-decoration-none color-inherit">
      <Card className="flex flex-col h-full gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant={isOrdinance ? 'primary' : 'secondary'}>
              {doc.type}
            </Badge>
            {doc.status && (
              <Badge variant={getStatusVariant(doc.status)}>
                {doc.status}
              </Badge>
            )}
          </div>
          <time className="text-xs text-[var(--ibosys-text-tertiary)] font-medium whitespace-nowrap">
            {formatDate(doc.createdAt)}
          </time>
        </div>
        
        <div className="text-sm font-semibold text-[var(--ibosys-primary-600)] font-mono">
          {doc.number || 'Unnumbered'}
        </div>
        
        <h3 className="text-base font-semibold text-[var(--ibosys-text-primary)] line-clamp-3 flex-1">
          {doc.title}
        </h3>
        
        {doc.committee && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--ibosys-text-secondary)] border-t border-[var(--ibosys-border-default)] pt-2 mt-auto">
            <span aria-hidden="true">🏛️</span>
            <span className="truncate">{doc.committee}</span>
          </div>
        )}
      </Card>
    </Link>
  );
}

function getStatusVariant(status) {
  if (status === 'Approved') return 'success';
  if (status === 'Public Consultation') return 'warning';
  return 'neutral';
}
```

### 2.3 Fix GuestForm.jsx (Priority: HIGH)
**Current**: 222 lines with phantom Tailwind classes
**Target**: Shared `Card`, `Input`, `Select`, `Textarea`, `Button`, `Alert` components

Key changes:
- Replace `bg-surface-lowest` → `Card` with `variant="outline"`
- Replace phantom `text-primary`, `border-primary` → design token classes
- Replace radio button group → `ButtonGroup` or styled `RadioGroup` (build if needed)
- Replace `toast` → shared `Alert` or keep `sonner` (acceptable)
- Add proper focus-visible styles using tokens

### 2.4 Update Home.jsx
- Replace `.portal-stats` → `StatCard` ×3 + link
- Replace `.portal-news-grid` → `Card` grid
- Replace `.members-feature` → `Card` + `Avatar` roster
- Replace `.record-list` → `Card` list with `Badge` status
- Replace `.civic-grid` → `Card` grid
- Keep `.portal-hero`, `.portal-search-card` for now (Phase 3)

### 2.5 Update List Pages (Ordinances, Resolutions, Sessions, News, Members, Committees)
- Replace `.page-banner` → `SectionHeader` with icon + action
- Replace `.record-row` / `.doc-card` → `DocumentCard` (shared)
- Replace `.grid-*` → CSS Grid with token spacing
- Add `Skeleton` loading states

### 2.6 Update Detail Pages (DocumentDetail, Member Detail)
- Replace `.card` → `Card`
- Replace badges → `Badge`
- Add proper typography using token classes

---

## Phase 3: Civic Refresh Replacement (Day 5)

### 3.1 Replace iBOSys Civic Refresh Classes
Delete lines 150-245 from `index.css` and replace with shared components:

| Civic Refresh Class | Replacement |
|---------------------|-------------|
| `.portal-nav` | Custom header using `Button`, `Avatar`, `DropdownMenu` |
| `.portal-hero` | `SectionHeader` + `Button` group + custom hero section |
| `.portal-search-card` | `Card` + `SearchBar` |
| `.portal-stats` | `StatCard` grid |
| `.portal-section` | `SectionHeader` wrapper |
| `.section-heading` | `SectionHeader` |
| `.record-list` | `Card` list |
| `.record-row` | `DocumentCard` |
| `.civic-grid` | `Card` grid |
| `.stat-line` | `StatCard` |
| `.portal-data-alert` | `Alert` variant="warning" |
| `.portal-news-grid` | `Card` grid |
| `.members-feature` | `Card` + `Avatar` |
| `.member-roster` | `Avatar` list |

### 3.2 Build Missing Shared Components (if needed)
- [ ] `RadioGroup` / `SegmentedControl` for vote selection
- [ ] `FileInput` for ID upload
- [ ] `Breadcrumb` for document detail
- [ ] `Pagination` (already in `@ibosys/ui`)

---

## Phase 4: Polish & Accessibility (Day 6)

### 4.1 Contrast Audit
- [ ] Verify all text meets WCAG AA (4.5:1)
- [ ] Adjust token values in `@ibosys/design-tokens` if needed
- [ ] Test: primary on surface, secondary on surface, muted on surface

### 4.2 Focus & Motion
- [ ] Add `:focus-visible` styles using `--ibosys-border-focus`
- [ ] Add `@media (prefers-reduced-motion: reduce)` to disable animations
- [ ] Verify `Skeleton` shimmer respects reduced motion

### 4.3 Responsive Breakpoints
- [ ] Test all pages at: 320px, 768px, 1024px, 1280px
- [ ] Use token spacing: `--ibosys-spacing-*`
- [ ] Verify touch targets ≥44×44px

### 4.4 Typography Consistency
- [ ] Single font family: `system-ui` (via `--ibosys-font-sans`)
- [ ] Heading scale: `--ibosys-text-xl` through `--ibosys-text-4xl`
- [ ] Body: `--ibosys-text-base` / `--ibosys-text-sm`
- [ ] Mono: `--ibosys-font-mono` for document numbers

---

## Phase 5: Verification (Day 7)

### 5.1 Build & Test
- [ ] `npm run build` in `public-portal` — no errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run lint` — no warnings

### 5.2 Visual Regression
- [ ] Screenshot all routes at 3 breakpoints
- [ ] Compare against design spec
- [ ] Verify no legacy classes remain in DOM

### 5.3 Design Quality Audit
- [ ] Re-run design quality evaluation
- [ ] Target: ≥90/100 (PASS)
- [ ] Document any remaining issues

---

## File Inventory: What Changes Where

### Delete / Major Rewrite
- `public-portal/src/index.css` — **delete lines 251-705**, update `@theme` to use tokens
- `public-portal/src/components/DocumentCard.jsx` — **complete rewrite** using `@ibosys/ui`
- `public-portal/src/components/GuestForm.jsx` — **complete rewrite** using `@ibosys/ui`

### Update (Import Shared Components)
- `public-portal/src/pages/Home.jsx`
- `public-portal/src/pages/Ordinances.jsx`
- `public-portal/src/pages/Resolutions.jsx`
- `public-portal/src/pages/DocumentDetail.jsx`
- `public-portal/src/pages/Sessions.jsx`
- `public-portal/src/pages/Members.jsx`
- `public-portal/src/pages/Committees.jsx`
- `public-portal/src/pages/News.jsx`
- `public-portal/src/pages/About.jsx`
- `public-portal/src/pages/Tourism.jsx`
- `public-portal/src/pages/MissionVision.jsx`
- `public-portal/src/components/Navbar.jsx`
- `public-portal/src/components/Footer.jsx`
- `public-portal/src/components/PageBanner.jsx` → delete, use `SectionHeader`
- `public-portal/src/components/SectionDivider.jsx` → delete, use `SectionHeader`
- `public-portal/src/components/QuickLinksStrip.jsx` → delete or rewrite
- `public-portal/src/components/StatsStrip.jsx` → delete, use `StatCard`
- `public-portal/src/components/LegislativeTimeline.jsx` — rewrite with shared components
- `public-portal/src/components/VoteChart.jsx` — keep (chart-specific), style with tokens

### Configuration
- `public-portal/package.json` — add `@ibosys/design-tokens`, `@ibosys/ui` dependencies
- `public-portal/vite.config.js` — ensure path aliases for `@ibosys/*`
- `public-portal/tailwind.config.js` — may remove if fully using tokens

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@ibosys/design-tokens": "workspace:*",
    "@ibosys/ui": "workspace:*",
    "lucide-react": "^0.400.0",
    "sonner": "^1.5.0"
  }
}
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Build passes | ✅ |
| Tests pass | ✅ (100%) |
| Legacy CSS lines remaining | 0 (lines 251-705 deleted) |
| Phantom CSS var references | 0 |
| Phantom Tailwind class references | 0 |
| Design quality score | ≥90/100 |
| WCAG AA contrast | 100% pass |
| Focus-visible on all interactive | 100% |
| Reduced-motion respected | 100% |
| Bundle size change | ≤+10% (tree-shaking) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Shared components missing props | Extend `@ibosys/ui` in-place, rebuild |
| Token values don't match design | Adjust tokens in `design-tokens`, rebuild both |
| Vite alias resolution fails | Configure `resolve.alias` in `vite.config.js` |
| Breaking changes to other apps | Test `client` build after each phase |
| Timeline slip | Prioritize: DocumentCard → GuestForm → Home → List pages → Detail pages |

---

## Rollback Plan

If critical issues arise:
1. `git stash` migration changes
2. Restore `index.css` full 705 lines
3. Revert component imports
4. Document blockers for next iteration