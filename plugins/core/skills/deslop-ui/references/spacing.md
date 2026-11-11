# Spacing: the system

Space says what belongs together. If everything is spaced the same, nothing is grouped any more, and the interface needs boxes to make up for it.

## Scale

Base 4 px: `4, 8, 12, 16, 24, 32, 48, 64` (then `96, 128` for a showcase). 6 to 8 values are enough for a screen. The in-between steps `6, 10, 14` are fine inside small components. If the project already has a consistent scale, keep it.

| Tailwind | `1` | `2` | `3` | `4` | `6` | `8` | `12` | `16` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| px | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 |

Name roles rather than values when the project has tokens: `--gap-field`, `--inset-card`, `--gap-section`.

## The four laws

1. **Proximity.** A heading or a label is closer to what it introduces than to what precedes it. The gap above a heading is at least twice the gap below.
2. **Clear steps.** Each nesting level spaces clearly more than the previous one. Aim for a ratio of about 1.5 to 2: a 16 gap next to a 20 gap looks like a mistake.
3. **Inside before outside.** A box's padding is at least the gap between its children. Otherwise the children float and no longer seem to belong to the box.
4. **One gap per list.** Siblings of the same rank share one gap, set with `gap` on the parent, not with margins on each child. A deliberate break between two groups must be clear (8, 8, 24, 8).

## Starting values

| Role | Tool (dashboard, Tauri) | Showcase |
| --- | --- | --- |
| Icon ↔ text | 8 | 8 |
| Label ↔ field | 4 to 8 | 8 |
| Field ↔ field | 12 to 16 | 16 to 24 |
| List item ↔ next | 2 to 8 | 8 to 16 |
| Table row height | 32 to 40 (44 to 48 for standing or touch reading) | 48 to 56 |
| Card padding | 12 to 16 | 24 to 32 |
| Section heading ↔ content | 8 to 16 | 16 to 32 |
| Card ↔ card | 12 to 16 | 24 to 32 |
| Section ↔ section | 24 to 32 | 64 to 128 |
| Page margin, phone | 16 | 16 to 24 |
| Page margin, desktop | 24 | 32 to 64, content centred and width-limited |

These are starting points: a dense table or a very editorial showcase may depart from them if the result stays consistent.

## Controls

- One height for a row of controls: 32 or 36 px in a dense tool, 40 to 44 px otherwise, 44 px on mobile.
- Horizontal padding about twice the vertical, never less.
- Inner radius = outer radius − padding.
- Icons in a list sit in a fixed-width column: that is what aligns the text, because glyphs do not all have the same width.

## Common root causes

| Symptom | Usual cause | Fix |
| --- | --- | --- |
| Uneven gaps in a list | Margins on each child, or components from different sources | `gap` on the parent, margins removed |
| Text a few pixels off | Icons or emoji of different widths | Fixed-width icon column |
| Different page edges | Several containers with their own padding | One container |
| Arbitrary values everywhere | `p-[13px]`, classes generated case by case | Tokens, then clean-up |
| Specificity fights | `.section` and `.cta` overriding each other | One class responsible for padding |
| Extra space at the bottom of a card | Margin of the last child | `gap` rather than `margin-bottom` |
| Heading too far from its content | Browser or reset default margins | Explicit margins on headings |
| Mobile overflow | Fixed width, grid without `minmax(0, 1fr)`, flex item without `min-width: 0` | Fix the element rather than `overflow: hidden` |
