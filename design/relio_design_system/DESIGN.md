---
name: Relio Design System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#454652'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#767683'
  outline-variant: '#c6c5d4'
  surface-tint: '#4c56af'
  primary: '#000666'
  on-primary: '#ffffff'
  primary-container: '#1a237e'
  on-primary-container: '#8690ee'
  inverse-primary: '#bdc2ff'
  secondary: '#875200'
  on-secondary: '#ffffff'
  secondary-container: '#f89c00'
  on-secondary-container: '#623a00'
  tertiary: '#191b1c'
  on-tertiary: '#ffffff'
  tertiary-container: '#2e3030'
  on-tertiary-container: '#969798'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#343d96'
  secondary-fixed: '#ffddba'
  secondary-fixed-dim: '#ffb865'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663d00'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e5e2e1'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
  section-gap: 32px
  baseline: 4px
---

## Brand & Style

The design system for this real estate lead management platform is built on the pillars of **Stability**, **Trust**, and **Efficiency**. Targeted at real estate professionals in India, the UI must feel authoritative yet accessible, helping users navigate complex lead data with confidence.

The visual style is **Corporate / Modern** with a **Tactile** edge. It utilizes a structured, high-trust foundation (Deep Blue) and elevates it with premium highlights (Gold). Taking inspiration from the reference image, we utilize soft background gradients and layered card structures to prevent the data-heavy interface from feeling overwhelming or "dry." The result is a professional environment that prioritizes information density without sacrificing visual breathing room.

## Colors

The palette is anchored by **Deep Blue (#1A237E)**, used for primary navigation, headers, and key branding elements to establish immediate institutional trust. **Gold/Amber (#FFA000)** is reserved for high-value conversion actions—such as "Add Lead" or "Close Deal"—ensuring they stand out against the professional blue.

We utilize a "Soft Gradient" approach for backgrounds: a subtle wash from white to a very pale blue-grey (#F8F9FF) to create depth. Status colors are fully saturated to ensure clear legibility on data tables and lead cards, following standard traffic-light conventions to minimize cognitive load for busy agents.

## Typography

**Inter** is selected for its exceptional legibility at small sizes, which is critical for lead management dashboards. 

The system uses a strict hierarchy: 
- **Headlines** use heavier weights (Bold/Semi-Bold) and slight negative letter spacing to feel "locked-in" and authoritative.
- **Body text** utilizes a standard weight for maximum readability during long sessions of data entry.
- **Labels** are often uppercase with increased tracking to differentiate "metadata" (like Lead ID or Date) from primary lead names.
- **Data-Mono** styling is applied specifically to numerical figures and phone numbers to ensure character alignment in tables.

## Layout & Spacing

This design system employs a **Fluid Grid** model with fixed safe margins. 
- **Mobile:** 4-column grid with 16px margins. 
- **Desktop:** 12-column grid with 24px margins and a max-width of 1440px to prevent excessive line lengths.

Spacing follows a 4px baseline. Components like KPI cards and Lead items use "Generous Whitespace" (20px-24px internal padding) to separate data points. Between logical sections (e.g., Lead Details vs. Activity Timeline), a 32px gap is maintained to ensure the interface feels airy rather than cluttered, even when populated with significant amounts of text.

## Elevation & Depth

To create a professional and organized feel, this design system uses **Tonal Layers** combined with **Ambient Shadows**.

1.  **Level 0 (Background):** A soft gradient background (#FFFFFF to #F8F9FF).
2.  **Level 1 (Cards):** Lead cards and KPI tiles use a pure white background with a subtle, diffused shadow (0px 4px 20px rgba(26, 35, 126, 0.05)). The slight blue tint in the shadow links the element to the primary brand color.
3.  **Level 2 (Active/Hover):** Interactive elements or focused cards lift slightly (0px 8px 30px rgba(26, 35, 126, 0.12)).
4.  **Overlays:** Modals and bottom sheets use a 40% opacity Deep Blue backdrop blur to maintain focus on the task at hand.

## Shapes

We use a **Rounded** shape language to soften the corporate aesthetic and make the app feel modern. 
- Standard UI elements (Inputs, Buttons) use a **0.5rem (8px)** radius.
- Container elements like Lead Cards and Dashboard Widgets use a **1rem (16px)** radius to create a distinct visual "enclosure."
- Status badges and selection chips use **Pill-shaped** (full rounding) to contrast against the more structural rectangular elements.

## Components

### Buttons
- **Primary:** Solid Deep Blue with white text. High-trust, used for "Save" or "Submit."
- **High-Value:** Solid Gold (#FFA000) with dark text. Reserved for revenue-generating actions like "Convert to Deal."
- **Ghost:** Deep Blue outline with transparent background for secondary actions like "Cancel" or "Back."

### Cards
Cards are the primary data container. They must feature a white background and a 1px stroke (#E0E0E0) combined with the ambient shadow defined in the Elevation section. KPI cards should include a small icon in the top right corner using the Status colors to indicate performance trends.

### Inputs
Text fields use a 1px border. When focused, the border transitions to 2px Deep Blue with a soft 4px Gold outer glow to signify active attention. Labels are positioned above the field in `label-md` styling.

### Status Badges
Following the reference image, status badges (e.g., "New Lead," "Follow-up," "Closed") should use a low-opacity version of their status color as a background with a high-contrast text label (e.g., Success Green text on a 10% opacity Green background).

### Lead List Items
List items should feature a clear visual hierarchy: Lead Name (`body-lg` / Semi-bold), Property Interest (`body-md` / Regular / Muted Grey), and Status Badge positioned on the far right.