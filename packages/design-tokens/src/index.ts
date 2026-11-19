/**
 * iBOSys Design Tokens
 * Single source of truth for colors, spacing, typography, shadows, radius
 * Used by @ibosys/ui and both web applications
 */

// Color palette - Government/Institutional theme
export const colors = {
  // Primary: Philippine civic blue
  primary: {
    50: '#eef3fb',
    100: '#d9e4f1',
    200: '#bdc8d4',
    300: '#8d9db3',
    400: '#5d7292',
    500: '#1f4f9d',  // Main brand blue
    600: '#193f7e',
    700: '#132f5e',
    800: '#0e1f3f',
    900: '#09101f',
    950: '#050810',
  },

  // Accent: Gold for highlights
  accent: {
    50: '#fffbf0',
    100: '#fff3d1',
    200: '#ffe6a3',
    300: '#ffd975',
    400: '#ffcc47',
    500: '#d4a72c',  // Main gold
    600: '#b88626',
    700: '#9c6520',
    800: '#80441a',
    900: '#642214',
    950: '#32110a',
  },

  // Semantic colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Neutral grays
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Surface aliases for easy migration
  surface: {
    primary: '#ffffff',
    secondary: '#f7f8fb',
    tertiary: '#f0f2f5',
    inverse: '#171717',
  },
  text: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#737373',
    inverse: '#ffffff',
    link: '#1f4f9d',
    linkHover: '#132f5e',
  },
  border: {
    light: '#e5e5e5',
    default: '#d4d4d4',
    dark: '#a3a3a3',
    focus: '#1f4f9d',
  },
};

// Spacing scale (4px base)
export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

// Border radius
export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
};

// Shadows
export const shadows = {
  xs: '0 1px 2px rgba(20, 31, 63, 0.05)',
  sm: '0 2px 8px rgba(20, 31, 63, 0.08)',
  md: '0 4px 16px rgba(20, 31, 63, 0.10)',
  lg: '0 8px 32px rgba(20, 31, 63, 0.12)',
  xl: '0 16px 48px rgba(20, 31, 63, 0.15)',
  focus: '0 0 0 3px rgba(31, 79, 157, 0.22)',
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: 500 }],
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.02em', fontWeight: 600 }],
    base: ['16px', { lineHeight: '26px', fontWeight: 400 }],
    lg: ['18px', { lineHeight: '30px', fontWeight: 400 }],
    xl: ['20px', { lineHeight: '28px', fontWeight: 500 }],
    '2xl': ['24px', { lineHeight: '32px', fontWeight: 600 }],
    '3xl': ['30px', { lineHeight: '36px', fontWeight: 600 }],
    '4xl': ['36px', { lineHeight: '40px', fontWeight: 700 }],
    '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.01em', fontWeight: 700 }],
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Transitions
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
};

// Z-index
export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
};

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '52px',
    },
    padding: {
      sm: '0 12px',
      md: '0 16px',
      lg: '0 24px',
    },
    fontSize: {
      sm: '13px',
      md: '14px',
      lg: '16px',
    },
  },
  input: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '52px',
    },
    padding: '0 12px',
  },
  card: {
    padding: '24px',
    gap: '16px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '9999px',
  },
};

// Semantic status colors (for legislative workflow)
export const status = {
  draft: { bg: '#fff3d1', text: '#9c6520', border: '#ffe6a3' },
  pending: { bg: '#d9e4f1', text: '#193f7e', border: '#bdc8d4' },
  inProgress: { bg: '#eef3fb', text: '#132f5e', border: '#d9e4f1' },
  approved: { bg: '#ecfdf5', text: '#047857', border: '#d1fae5' },
  rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' },
  consultation: { bg: '#fffbeb', text: '#b45309', border: '#fef3c7' },
};

export default {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  breakpoints,
  transitions,
  zIndex,
  components,
  status,
};