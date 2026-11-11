# Type, spacing, radius, elevation, motion

## Type

- One or two families, plus a monospace if the product shows code or data. Pair by contrast of role (a display face for headings, a quiet face for text), and choose families from the brief, not from what is trendy.
- A modular scale: a ratio between 1.125 and 1.333 (1.2 is a safe start), 8 sizes or fewer in use on a page. For fluid sizes, define a small-screen and a large-screen scale and interpolate with `clamp()`; the preferred value must include a `rem` term (`clamp(1rem, 0.9rem + 0.5vw, 1.25rem)`), otherwise browser zoom stops enlarging the text (WCAG 1.4.4).
- Body text at least 16 px; inputs at least 16 px on mobile (smaller makes iOS zoom in).
- Prose: line height at least 1.5, lines of 80 characters at most (WCAG 1.4.8); headings tighter (1.1–1.3). The page must survive 1.5× line height, 2× paragraph spacing, 0.12 em letter spacing and 0.16 em word spacing (WCAG 1.4.12).
- Three or four weights at most. Tabular figures for numbers that line up.

## Spacing and layout

- One spacing scale built on 4 px (8 px steps, 4 px half-steps): 4, 8, 12, 16, 24, 32, 48, 64. In Tailwind v4 the whole scale derives from `--spacing` (0.25 rem by default), so values stay on the scale by construction.
- Density is chosen by which steps components use, never by inventing values in between.
- Space separates groups: more space between groups than inside them. A box is not a substitute for spacing.
- Content width: about two thirds of the window for forms and reading, never full width on a desktop.

## Radius and elevation

- Two or three radii: one for controls, one for containers, full for pills and avatars. One radius on everything is a generic sign.
- Two or three elevations at most, used for meaning (a menu above content, a dialog above everything), not for decoration. Soft coloured glows are a generic sign.
- Light theme: a tight shadow plus a soft, wide, very light one (about `0 1px 2px` at 5 % and `0 8px 24px` at 6 % black) reads as real depth. Dark theme: shadows barely show; separate layers with lighter surface steps, a 1 px hairline at about 8 % white and, for raised elements, a faint inset highlight on the top edge. Values after heydamir/unslop (CC BY 4.0).
- Accent colour stays rare: a few per cent of an app screen (`qp look` flags more than 15 % of the first screen on app and reading screens). Persuasive pages may use more, on purpose, in one place.

## Motion

- Durations from tokens, in four bands (Material 3): short 50–200 ms (state changes, small elements), medium 250–400 ms (panels, sheets), long 450–600 ms (large transitions), extra-long 700–1000 ms (rare, full-screen). Most UI motion sits between 150 and 300 ms.
- Easing: standard `cubic-bezier(0.2, 0, 0, 1)`; entering `cubic-bezier(0.05, 0.7, 0.1, 1)`; leaving `cubic-bezier(0.3, 0, 0.8, 0.15)`.
- Motion explains a change (where something came from, what it became) or confirms an action. Not every section fades in.
- `prefers-reduced-motion: reduce`: replace movement and scaling with a short fade; keep the feedback, remove the travel. `qp look` loads the page with reduced motion requested and flags it when most animations keep running.
- Anything that moves with scrolling: follow the `scroll-animation` skill (native CSS first, content never hidden behind an animation, native scrolling).
- WebGL, shader and video backgrounds: show a still frame when reduced motion is requested, and pause when off-screen or when the tab is hidden; they cost battery and distract from the content.
