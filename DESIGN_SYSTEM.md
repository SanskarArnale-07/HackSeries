# DESIGN_SYSTEM.md: Aerospace Console Design System & Tokens

> **Specification Status:** Design System Specification  
> **Primary Owners:** Frontend Developer 1 (UI Components), Frontend Developer 2 (3D Styling)  
> **Theme Concept:** Deep Space Dark Mode (High-Density Aerospace Operations Console)  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Related UI Spec:** [`UI_UX_SPEC.md`](./UI_UX_SPEC.md)

---

## 1. Design Principles & Aesthetic Direction

The design system is engineered specifically for mission-critical space traffic operations:

1. **High Contrast, Low Fatigue:** Deep obsidian backgrounds with crisp, light foreground text prevent eye strain during extended monitoring.
2. **Data-Dense Telemetry:** Information hierarchy prioritizes numerical clarity, standardized metric units, and rapid scanning over decorative whitespace.
3. **Strict Color Semantics:** Color is reserved almost exclusively for operational severity and state indicators. Alert colors (`CRITICAL`, `WARNING`, `WATCH`) are never used for decorative elements.
4. **Typographic Distinction:** Monospace fonts are mandatory for coordinates, velocities, and timestamps to eliminate visual jitter during real-time value updates.

---

## 2. Design Tokens (CSS Variables)

```css
:root {
  /* ==========================================================================
     Surfaces & Backgrounds
     ========================================================================== */
  --color-bg-base: #080c14; /* Deep Space Black */
  --color-bg-surface: #0f172a; /* Panel Surface */
  --color-bg-elevated: #1e293b; /* Card & Dropdown Background */
  --color-bg-overlay: #334155; /* Modal & Drawer Background */
  --color-border-subtle: #1e293b; /* Low-contrast dividers */
  --color-border-strong: #334155; /* Interactive element borders */
  --color-border-highlight: #0284c7; /* Active focus outline */

  /* ==========================================================================
     Typography & Text Colors
     ========================================================================== */
  --color-text-primary: #f8fafc; /* Primary Data & Headings (95% White) */
  --color-text-secondary: #94a3b8; /* Labels & Table Headers (Muted Slate) */
  --color-text-tertiary: #64748b; /* Footers & Secondary Metadata */
  --color-text-disabled: #475569; /* Inactive controls */

  /* ==========================================================================
     Brand & Primary Accents
     ========================================================================== */
  --color-brand-cyan: #06b6d4; /* Primary Trajectory Spline & Focus */
  --color-brand-blue: #3b82f6; /* Interactive Action Buttons */
  --color-brand-purple: #8b5cf6; /* Secondary Mission Satellite Orbit */

  /* ==========================================================================
     Conjunction Screening Alert Tiers (Strict Semantic Mapping)
     ========================================================================== */
  /* Tier 1: CRITICAL (< 1.0 km) */
  --color-tier-critical-bg: #450a0a;
  --color-tier-critical-border: #dc2626;
  --color-tier-critical-text: #fca5a5;
  --color-tier-critical-glow: rgba(220, 38, 38, 0.4);

  /* Tier 2: WARNING (1.0 - 5.0 km) */
  --color-tier-warning-bg: #451a03;
  --color-tier-warning-border: #d97706;
  --color-tier-warning-text: #fcd34d;
  --color-tier-warning-glow: rgba(217, 119, 6, 0.35);

  /* Tier 3: WATCH (5.0 - 25.0 km) */
  --color-tier-watch-bg: #422006;
  --color-tier-watch-border: #ca8a04;
  --color-tier-watch-text: #fef08a;
  --color-tier-watch-glow: rgba(202, 138, 4, 0.25);

  /* Tier 4: MONITOR (25.0 - 50.0 km) */
  --color-tier-monitor-bg: #042f2e;
  --color-tier-monitor-border: #0d9488;
  --color-tier-monitor-text: #5eead4;
  --color-tier-monitor-glow: rgba(13, 148, 136, 0.2);

  /* Tier 5: CLEAR / NOMINAL (> 50.0 km) */
  --color-tier-clear-bg: #022c22;
  --color-tier-clear-border: #059669;
  --color-tier-clear-text: #6ee7b7;

  /* ==========================================================================
     Typography Standards
     ========================================================================== */
  --font-sans:
    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "Roboto Mono", "Fira Code", monospace;

  /* ==========================================================================
     Spacing & Grid Scale (4px Baseline)
     ========================================================================== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* ==========================================================================
     Border Radii
     ========================================================================== */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-full: 9999px;
}
```

---

## 3. Typography Scale & Guidelines

| Token            | Font Family | Size   | Weight         | Line Height | Usage                                  |
| :--------------- | :---------- | :----- | :------------- | :---------- | :------------------------------------- |
| `text-display`   | Sans-Serif  | `20px` | Bold (700)     | `28px`      | Application Main Title & View Headers  |
| `text-heading`   | Sans-Serif  | `15px` | SemiBold (600) | `22px`      | Panel Titles, Table Section Headers    |
| `text-body`      | Sans-Serif  | `13px` | Regular (400)  | `18px`      | General Descriptions, Helper Copy      |
| `text-label`     | Sans-Serif  | `11px` | Medium (500)   | `16px`      | Input Labels, Table Header Columns     |
| `text-telemetry` | Monospace   | `14px` | Bold (700)     | `20px`      | Miss Distances, Velocities, Altitudes  |
| `text-mono-sm`   | Monospace   | `12px` | Regular (400)  | `16px`      | Timestamps (UTC), NORAD IDs, TLE Lines |

---

## 4. Component Patterns & CSS Classes

### 4.1 Severity Badge Component

Used in the Conjunction Alert Table and 3D globe encounter callouts:

```html
<!-- Example Critical Badge -->
<span class="badge-tier badge-tier-critical">
  <span class="badge-dot"></span>
  CRITICAL &bull; 0.84 km
</span>

<!-- Example Warning Badge -->
<span class="badge-tier badge-tier-warning">
  <span class="badge-dot"></span>
  WARNING &bull; 2.14 km
</span>
```

```css
.badge-tier {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.badge-tier-critical {
  background: var(--color-tier-critical-bg);
  border: 1px solid var(--color-tier-critical-border);
  color: var(--color-tier-critical-text);
  box-shadow: 0 0 8px var(--color-tier-critical-glow);
}

.badge-tier-warning {
  background: var(--color-tier-warning-bg);
  border: 1px solid var(--color-tier-warning-border);
  color: var(--color-tier-warning-text);
  box-shadow: 0 0 6px var(--color-tier-warning-glow);
}

.badge-tier-watch {
  background: var(--color-tier-watch-bg);
  border: 1px solid var(--color-tier-watch-border);
  color: var(--color-tier-watch-text);
}

.badge-tier-monitor {
  background: var(--color-tier-monitor-bg);
  border: 1px solid var(--color-tier-monitor-border);
  color: var(--color-tier-monitor-text);
}
```

---

### 4.2 Telemetry Metric Card Component

Used in the Object Telemetry Inspector and Header Summary:

```html
<div class="metric-card">
  <span class="metric-label">PERIGEE ALTITUDE</span>
  <div class="metric-value-container">
    <span class="metric-value">416.32</span>
    <span class="metric-unit">km</span>
  </div>
</div>
```

```css
.metric-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.metric-label {
  font-family: var(--font-sans);
  font-size: var(--text-label);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value-container {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.metric-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.metric-unit {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
}
```

---

### 4.3 Mandatory Scientific Disclaimer Banner

Rendered persistently across the top of the operations console:

```html
<aside class="disclaimer-banner" role="alert">
  <span class="disclaimer-icon">&#x26A0;</span>
  <p class="disclaimer-text">
    <strong>SCIENTIFIC SAFETY BOUNDARY:</strong> Proximity metrics indicate
    geometric minimum separation (miss distance). Due to the absence of 3D error
    covariance matrices in public TLEs, values do <em>NOT</em> constitute
    validated collision probabilities.
  </p>
</aside>
```

```css
.disclaimer-banner {
  background: rgba(30, 41, 59, 0.7);
  border-bottom: 1px solid var(--color-border-strong);
  padding: var(--space-2) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.disclaimer-icon {
  color: var(--color-tier-warning-border);
  font-size: 14px;
}
```

---

## 5. Confirmed Design System Decisions

1. **[CONFIRMED DECISION 1 - Monospace & System Font Loading]:**
   The application references Google Fonts `JetBrains Mono` and `Inter` via CDN links in `index.html`. If external font fetching is blocked during air-gapped evaluation, the stylesheet automatically falls back to system monospace (`Consolas, monospace`) and system sans-serif without layout breakage.
2. **[CONFIRMED DECISION 2 - Orbit Trajectory Color Assignment]:**
   Primary selected asset orbit is assigned glowing Cyan (`#06B6D4`), secondary encounter asset is assigned Orange/Crimson (`#F59E0B` / `#EF4444`), and background non-critical satellites are rendered as faint Slate lines (`#334155`).
