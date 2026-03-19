/**
 * CareConnect Design System
 *
 * Dual-role design tokens for the Patient (green/teal) and Doctor (orange/terracotta) experiences.
 * This file is the single source of truth for all visual tokens.
 *
 * RULE: Never use inline hex codes or magic numbers in components.
 *       Always import from this file.
 */

// ─── Patient Theme — "Safe & Inviting" ─────────────────────────────────────
// Psychology: Green is universally associated with healing, nature, and tranquility.
// The patient experience must feel safe, calming, and breathable.

export const patientColors = {
  // Core greens — extracted from CareConnect web primary (HSL 174 62% 40%)
  primary:        '#27A599',   // Main teal-green — buttons, active states, links
  primaryLight:   '#DFF5F2',   // Tinted backgrounds, badges, subtle highlights
  primaryDark:    '#1E8578',   // Pressed states, emphasis text

  // Extended calming palette
  sage:           '#A8C5B8',   // Secondary surfaces, card accents
  mint:           '#E8F5E9',   // Success backgrounds, confirmation states
  seafoam:        '#B2DFDB',   // Dividers, progress bar fills

  // Neutrals (warm-tinted to avoid clinical coldness)
  background:     '#FDFCFA',   // Root background — warm off-white
  surface:        '#FFFFFF',   // Cards, modals, sheets
  surfaceMuted:   '#F5F3F0',   // Grouped table backgrounds, secondary surfaces
  border:         '#E4E1DA',   // Card borders, dividers
  borderLight:    '#EEECE7',   // Subtle separators

  // Text hierarchy
  textPrimary:    '#1A2E35',   // Headings, primary content
  textSecondary:  '#5F7278',   // Descriptions, labels
  textMuted:      '#8FA3A9',   // Placeholders, timestamps, hints

  // Semantic
  success:        '#4CAF50',
  warning:        '#FF9800',
  error:          '#E53E3E',
  info:           '#2196F3',
} as const;

// ─── Doctor Theme — "Productivity & Focus" ──────────────────────────────────
// Psychology: Orange is energetic and action-oriented. Use burnt orange, terracotta,
// and crisp coral strictly for primary action buttons to make the dashboard
// feel like a highly tuned, efficient instrument.

export const doctorColors = {
  // Core oranges — extracted from CareConnect web accent (HSL 12 80% 65%)
  primary:        '#E2725B',   // Terracotta — primary action buttons ONLY
  primaryLight:   '#FCECE8',   // Tinted badge backgrounds, subtle highlights
  primaryDark:    '#C75B3F',   // Pressed button states

  // Extended productivity palette
  coral:          '#ED7B5E',   // Secondary action emphasis, FABs
  amber:          '#F5A623',   // Warnings, attention badges, countdowns
  warmGray:       '#6B6054',   // Sidebar text, secondary labels

  // Neutrals (cool, crisp, high-contrast for scan-ability)
  background:     '#F8F9FA',   // Root background — clean, neutral white
  surface:        '#FFFFFF',   // Cards, panels
  surfaceMuted:   '#F1F3F5',   // Table rows (alternating), secondary panels
  border:         '#DEE2E6',   // Card borders, dividers — crisp, visible
  borderLight:    '#E9ECEF',   // Subtle separators

  // Text hierarchy (high-contrast for quick scanning)
  textPrimary:    '#212529',   // Headings, patient names, key data
  textSecondary:  '#495057',   // Labels, descriptions
  textMuted:      '#868E96',   // Timestamps, metadata

  // Semantic
  success:        '#2F9E44',
  warning:        '#F59F00',
  error:          '#E03131',
  info:           '#1C7ED6',
} as const;

// ─── Spacing Scale ──────────────────────────────────────────────────────────
// 4px base grid. Use these tokens everywhere — never use arbitrary pixel values.

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
// Use expo-font to load Inter (matches the web app's font family).

export const typography = {
  fontFamily: {
    regular:    'Inter_400Regular',
    medium:     'Inter_500Medium',
    semiBold:   'Inter_600SemiBold',
    bold:       'Inter_700Bold',
  },

  size: {
    xs:    { fontSize: 11, lineHeight: 16 },
    sm:    { fontSize: 13, lineHeight: 18 },
    base:  { fontSize: 15, lineHeight: 22 },
    lg:    { fontSize: 17, lineHeight: 24 },
    xl:    { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 38 },
    '4xl': { fontSize: 36, lineHeight: 44 },
  },
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── Border Radii ───────────────────────────────────────────────────────────

export const radii = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const;
