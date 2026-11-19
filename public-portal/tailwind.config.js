/**
 * Tailwind v3 compatibility layer for the public portal.
 *
 * Tailwind v4 is the real engine (see src/index.css `@theme`). This config only
 * carries the three things v4 `@theme` does not cover for us:
 *   - fontFamily / fontSize legacy utility names consumed by existing pages
 *   - spacing names (unit, stack-*, gutter, ...)
 *   - deprecated Material-era colour names, remapped onto @ibosys tokens
 *
 * All colours below resolve to CSS custom properties from
 * @ibosys/design-tokens, so there are no hardcoded hex values here and no
 * second palette. Do not reintroduce literal hex.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Brand primaries */
        "primary": "var(--ibosys-primary-500)",
        "primary-container": "var(--ibosys-primary-100)",
        "primary-fixed": "var(--ibosys-primary-100)",
        "primary-fixed-dim": "var(--ibosys-primary-200)",
        "on-primary": "var(--ibosys-text-inverse)",
        "on-primary-container": "var(--ibosys-primary-900)",
        "on-primary-fixed": "var(--ibosys-primary-900)",
        "on-primary-fixed-variant": "var(--ibosys-primary-700)",
        "inverse-primary": "var(--ibosys-primary-200)",

        /* Accent family carries the warm gold used for primary CTAs */
        "accent": "var(--ibosys-accent-500)",
        "secondary": "var(--ibosys-accent-500)",
        "secondary-container": "var(--ibosys-accent-100)",
        "secondary-fixed": "var(--ibosys-accent-100)",
        "secondary-fixed-dim": "var(--ibosys-accent-200)",
        "on-secondary": "var(--ibosys-text-inverse)",
        "on-secondary-container": "var(--ibosys-accent-900)",
        "on-secondary-fixed": "var(--ibosys-accent-950)",
        "on-secondary-fixed-variant": "var(--ibosys-accent-800)",
        "tertiary": "var(--ibosys-accent-600)",
        "tertiary-container": "var(--ibosys-accent-600)",
        "tertiary-fixed": "var(--ibosys-accent-100)",
        "tertiary-fixed-dim": "var(--ibosys-accent-200)",
        "on-tertiary": "var(--ibosys-text-inverse)",
        "on-tertiary-container": "var(--ibosys-accent-800)",
        "on-tertiary-fixed": "var(--ibosys-accent-950)",
        "on-tertiary-fixed-variant": "var(--ibosys-accent-800)",

        /* Surfaces and background */
        "background": "var(--ibosys-surface-primary)",
        "on-background": "var(--ibosys-text-primary)",
        "surface": "var(--ibosys-surface-primary)",
        "surface-bright": "var(--ibosys-surface-primary)",
        "surface-paper": "var(--ibosys-surface-primary)",
        "surface-container-lowest": "var(--ibosys-surface-primary)",
        "surface-dim": "var(--ibosys-surface-tertiary)",
        "surface-container-low": "var(--ibosys-surface-secondary)",
        "surface-container": "var(--ibosys-surface-secondary)",
        "surface-container-high": "var(--ibosys-surface-tertiary)",
        "surface-container-highest": "var(--ibosys-neutral-200)",
        "surface-variant": "var(--ibosys-surface-tertiary)",
        "surface-tint": "var(--ibosys-primary-500)",
        "on-surface": "var(--ibosys-text-primary)",
        "on-surface-variant": "var(--ibosys-text-secondary)",
        "inverse-surface": "var(--ibosys-surface-inverse)",
        "inverse-on-surface": "var(--ibosys-text-inverse)",

        /* Borders */
        "outline": "var(--ibosys-border-dark)",
        "outline-variant": "var(--ibosys-border-default)",
        "border-muted": "var(--ibosys-border-default)",
        "border-color": "var(--ibosys-border-default)",

        /* Destructive */
        "error": "var(--ibosys-danger-500)",
        "error-container": "var(--ibosys-danger-50)",
        "on-error": "var(--ibosys-text-inverse)",
        "on-error-container": "var(--ibosys-danger-700)",

        /* Status chips. `status-passed` stays dark because it is paired with
           `text-on-primary` (white) in NewsDetail.jsx. */
        "status-draft": "var(--ibosys-warning-100)",
        "status-passed": "var(--ibosys-primary-800)",
      },
      spacing: {
        "unit": "4px",
        "max-width": "1280px",
        "stack-sm": "8px",
        "margin-mobile": "16px",
        "gutter": "24px",
        "stack-md": "16px",
        "margin-desktop": "48px",
        "stack-lg": "32px"
      },
      // Single sans family sourced from the token scale. The previous
      // Public Sans / Source Serif 4 entries were never actually loaded by a
      // @font-face or a font import, so every headline silently fell back to a
      // generic serif. These now resolve to the real token stack.
      fontFamily: {
        "body-md": ["var(--ibosys-font-sans)"],
        "label-md": ["var(--ibosys-font-sans)"],
        "headline-md": ["var(--ibosys-font-sans)"],
        "display-lg": ["var(--ibosys-font-sans)"],
        "body-lg": ["var(--ibosys-font-sans)"],
        "headline-lg-mobile": ["var(--ibosys-font-sans)"],
        "headline-lg": ["var(--ibosys-font-sans)"],
        "label-sm": ["var(--ibosys-font-sans)"],
        "mono": ["var(--ibosys-font-mono)"],
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "30px", fontWeight: "400" }],
        "headline-lg-mobile": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "500" }]
      }
    },
  },
  plugins: [],
}