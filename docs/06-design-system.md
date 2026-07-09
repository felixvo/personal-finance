# 06 — Design System

Visual language for Atlas. Built on the `dataviz` skill's design-system-agnostic method (form → color → validate → marks → interaction → accessibility) — this doc fills in that method's parameters for Atlas specifically. Component structure follows [05-wireframes.md](05-wireframes.md); this doc governs how those structures actually look.

---

## 1. Principles

Derived directly from the product philosophy in [00-product-vision.md](00-product-vision.md):

- **Numbers are the interface.** Every screen leads with a figure, not an icon or illustration. Typography and hierarchy do the work color usually does elsewhere.
- **Calm, not alarming.** Atlas "never judges financial decisions" — the palette avoids anything that reads as a warning or a scolding. Status color (§4.4) is reserved and used narrowly, never decoratively.
- **Quiet chrome, loud data.** Chart gridlines, borders, and axes stay recessive (hairline gray); the only saturated color on any screen is the data itself.
- **One look, two modes.** Light and dark are both first-class and selected independently against their own surfaces — dark mode is not an automatic filter over light mode.

---

## 2. Typography

- **Typeface:** system sans stack — `system-ui, -apple-system, "Segoe UI", sans-serif`. No serif or display face anywhere, including the Net Worth hero figure — a display face on a money app reads as decoration undermining trust in the number.
- **Figures:** large standalone values (hero figure, stat-tile values) use the font's default **proportional** figures. Reserve `font-variant-numeric: tabular-nums` for columns that must align vertically — the holdings table in Check-in Step 2, snapshot line items, the Timeline's numeric columns.
- **Scale:**

| Token | Size | Weight | Use |
|---|---|---|---|
| `text-hero` | 48px+ | Semibold | The one Net Worth figure on Home dashboard — exactly one per view |
| `text-stat` | 28px | Semibold | Stat-tile values (Passive Income, Cash Position, etc.) |
| `text-h1` | 22px | Semibold | Page titles |
| `text-h2` | 17px | Medium | Section/card headers |
| `text-body` | 15px | Regular | Default UI text |
| `text-label` | 13px | Medium | Form labels, stat-tile labels (sentence case, no trailing colon) |
| `text-caption` | 12px | Regular | Axis ticks, timestamps, muted metadata |

---

## 3. Chart form choices

Picked by data job per the `dataviz` skill's form heuristic (`choosing-a-form.md`), not by preference:

| Screen element | Data job | Form |
|---|---|---|
| Net Worth, Passive Income, Cash Position (Home, Assets) | Single current value + trend | **Stat tile** (value + delta + optional sparkline) |
| Net Worth (Home dashboard headline) | The one number the view leads with | **Hero figure** |
| Asset Allocation, Currency Allocation | Part-to-whole, several long-named categories (institution names) | **Horizontal stacked bar** — *not* a donut/pie (deprioritized by the skill; length reads more accurately than angle, and institution names need horizontal room) |
| Goal progress (list view) | A ratio against a limit | **Meter** (progress track) |
| Goal progress (detail view) | Trend over time toward a target | **Line chart**, actual line + projected line, target as a reference line — never a second y-axis |
| What-If growth projection | Trend over time | **Line chart**, current path vs. target |
| Holding value history | Trend over time, single series | **Sparkline** (detail row) → full **line chart** (holding detail page) |

**Never:** dual-axis charts, pie/donut for allocation, rainbow gradients, a generated 9th categorical hue. If a household somehow has 9+ distinct holding types in one allocation view, the 9th-and-beyond fold into "Other" rather than inventing a new hue (skill non-negotiable).

---

## 4. Color

### 4.1 Chart chrome & ink

Directly from the skill's validated reference palette (`references/palette.md`) — do not hand-pick alternates:

| Role | Light | Dark |
|---|---|---|
| Page plane | `#f9f9f7` | `#0d0d0d` |
| Card / chart surface | `#fcfcfb` | `#1a1a19` |
| Primary ink | `#0b0b0b` | `#ffffff` |
| Secondary ink | `#52514e` | `#c3c2b7` |
| Muted (axis/labels) | `#898781` | `#898781` |
| Gridline (hairline) | `#e1e0d9` | `#2c2c2a` |
| Baseline / axis | `#c3c2b7` | `#383835` |
| Border (hairline ring) | `rgba(11,11,11,0.10)` | `rgba(255,255,255,0.10)` |

### 4.2 Categorical palette — Holding Types

Used for Asset/Currency Allocation bars and any place holding types are told apart by color. **Fixed order, never cycled** — a given `HoldingType` always maps to the same slot so its color is stable across every screen and every month:

| Slot | Hue | Light | Dark | Assigned to |
|---|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` | Cash |
| 2 | aqua | `#1baf7a` | `#199e70` | Brokerage |
| 3 | yellow | `#eda100` | `#c98500` | Crypto |
| 4 | green | `#008300` | `#008300` | Real Estate |
| 5 | violet | `#4a3aa7` | `#9085e9` | Retirement |
| 6 | red | `#e34948` | `#e66767` | Loan (liability) |
| 7 | magenta | `#e87ba4` | `#d55181` | Credit Card (liability) |
| 8 | orange | `#eb6834` | `#d95926` | Other Asset / Other Liability |

Custom holding types added via Settings (see `01`, §3.9) take the next unused slot in creation order; beyond 8 categories in one household, the excess folds into "Other" in allocation views specifically (full list still available in the underlying table).

Three light-mode slots (aqua, yellow, magenta) fall below 3:1 contrast on the light surface — per the skill's relief rule, **any allocation bar segment using these slots must carry a visible direct label or legend entry**, never rely on the color alone to identify it.

### 4.3 Delta color — encodes direction, not judgment

This is the one place the design system has to operationalize "Atlas never judges" as an actual rule, because up/down color is the most natural way to show change and the philosophy forbids treating it as good/bad by default:

- **Net Worth, Investable Assets, Cash Position, Passive Income, individual Assets:** more is unambiguously more. Use `Delta ↑ good` (`#006300` light / `#0ca30c` dark) for increases, secondary ink (not red) with a plain `▼` glyph for decreases. Decreases are *never* shown in a status-red — they're a fact, not a failure.
- **Liabilities (Loan, Credit Card):** the sign flips — a decreasing liability gets the "good" green treatment, since it's the direction that improves Net Worth.
- **Income & Expenses:** always neutral — secondary ink, arrow glyph, no color at all. There is no budget in v1 to compare against, and "spent more this month" is not inherently negative (could be a planned purchase), so no automated judgment is rendered.
- **Goal pace** (on-track vs. behind a target date): the one legitimate use of the reserved status palette (§4.4), because it's a factual comparison against the household's own stated target, not Atlas's opinion — directly matches the vision doc's Core Question 4 ("current pace"), not Core Question 5's "never recommends."

### 4.4 Status palette — reserved, narrow use

Fixed, never themed, never reused for categorical series:

| Role | Hex (light) | Use in Atlas |
|---|---|---|
| good | `#0ca30c` | Goal pace: on track for target date |
| warning | `#fab219` | Goal pace: behind pace, still achievable |
| serious | `#ec835a` | *(unused in v1 — reserved)* |
| critical | `#d03b3b` | *(unused in v1 — reserved)* |

Ships with icon + label always, never color alone (mandatory per skill — also softens the "grading" feel: pair with neutral language like "Behind pace" rather than "Off track!").

### 4.5 Sequential & diverging

Not used in v1 — no heatmap or choropleth surfaces exist yet, and Goal detail's actual-vs-target is two categorical lines, not a diverging fill. If a future feature needs magnitude shading (e.g. a calendar heatmap of check-in completion), default to the single-hue blue sequential ramp already defined in `palette.md` rather than introducing a new hue.

---

## 5. Marks & spacing (chart anatomy)

Fixed specs, per the skill, applied identically across every chart on the site:

- **Bars:** ≤24px thick, 4px rounded data-end, square at the baseline. Stacked-bar segments (allocation) get a **2px surface-color gap** between segments — never a stroke.
- **Lines:** 2px, round join/cap. End-markers ≥8px with a 2px surface-color ring.
- **Area fills** (if used under a line): series hue at ~10% opacity — a wash, never solid.
- **Gridlines:** 1px hairline, solid, recessive gray — never dashed.
- **Labels:** selective, never one per data point. Bars → value at the tip. Lines → value at the end. Text always uses ink tokens, never the series color itself (a colored dot/swatch carries identity, not colored text).
- **Legend:** present whenever a chart has 2+ series (Asset Allocation, multi-holding comparisons); omitted for single-series charts (a holding's own value-over-time sparkline needs no legend — the card title says what it is).

---

## 6. Components

| Component | Spec source | Where used |
|---|---|---|
| Stat tile | `dataviz` figures contract — label, value, optional signed delta, optional 12-point sparkline | Home dashboard KPI row, Assets summary |
| Hero figure | ≥48px, one per view | Home dashboard Net Worth |
| Meter | Fill = same-ramp accent, track = lighter step of same ramp | Goals list progress bars |
| Allocation bar | Horizontal stacked bar, categorical palette (§4.2), 2px gaps | Asset/Currency Allocation |
| Line chart | 2px line, 8px end markers, target reference line where relevant | Goal detail, What-If, Holding detail |
| Snapshot card | Card surface, primary metric row + secondary metrics row + optional note | Timeline feed |
| Wizard step chrome | Full-bleed, progress dots, persistent Save & Exit | Check-in wizard |
| Table-view toggle | Every chart's accessibility twin per the skill — a plain data table alternative | All charts |

---

## 7. Spacing & layout

- Base unit: **4px**. Card padding 16px/24px, section gaps 32px, page margins 24px (desktop) / 16px (mobile).
- Card corner radius: 12px. Buttons/inputs: 8px.
- Sidebar width: 240px fixed (desktop); collapses to a bottom tab bar <768px per `05-wireframes.md` §8.
- Grid: 12-column, 24px gutter for dashboard/card layouts.

---

## 8. Accessibility checklist (per screen shipped)

Directly from the skill's six checks — apply before any chart/screen is considered done:

1. Run `validate_palette.js` against any new color combination before shipping — don't eyeball contrast.
2. Every 2+-series chart has a legend; every chart has a table-view toggle.
3. Status color never appears without an icon + text label alongside it.
4. Dark mode validated against the dark surface independently, not assumed from the light-mode pass.
5. Texture-fill channel available (not on by default) for the CVD/print/`forced-colors` case on allocation bars, since 3 of the 8 categorical slots are sub-3:1 on light surface.
6. Hit targets on interactive chart elements (holding rows, sparkline hover) are sized generously, not just the visual mark.
