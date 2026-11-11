# Colour

## Build scales in OKLCH

- `oklch(L C H)`: equal steps of L look equally light whatever the hue, which HSL does not do. Lightness 0–1, chroma practically under 0.37, hue in degrees.
- Build each hue as a 12-step scale with one job per step:

| Steps | Job |
| --- | --- |
| 1–2 | app and subtle backgrounds |
| 3–5 | component backgrounds: normal, hover, pressed |
| 6–8 | borders: subtle, normal, strong and focus ring |
| 9–10 | solid fills (buttons, badges): normal and hover |
| 11–12 | text: secondary and primary |

  Keep the hue fixed (or drifting a few degrees), move L evenly, raise chroma toward the middle steps and lower it at the ends.
- Neutrals: tint the grey scale slightly toward the brand hue (chroma 0.005–0.02) rather than pure grey, unless the brief is "neutral".
- One accent hue for actions; semantic hues (success, warning, danger, info) only where they carry meaning, never as decoration.

## Contrast: build in OKLCH, validate in WCAG 2

- WCAG 2.2 is the rule today: 4.5:1 for normal text, 3:1 for large text (24 px, or 18.67 px bold) and for non-text (field borders, states, focus ring), 7:1 for AAA. The ratio is (L1 + 0.05) / (L2 + 0.05) and is never rounded: 4.499 fails.
- APCA is not the WCAG 3 method (the WCAG 3 contrast algorithm is still undecided). Use it only as a second opinion, never instead of WCAG 2.
- Pair by role: every `text`/`fg` colour against every `bg`/`surface` colour of the same theme, every `border`/`focus` colour at 3:1. `qp tokens` does this from the token names.
- A light grey border on white usually fails 3:1: check field borders explicitly.

## Dark theme

- Remap the semantic tokens to other steps; do not invert colours. Backgrounds go to the dark end of the scale, text to the light end, and accents usually one or two steps lighter so they keep their contrast.
- Lower chroma slightly on large dark surfaces; saturated colours glow on dark backgrounds.
- Check the whole contrast matrix again in dark: a pair that passes in light often fails in dark.

## Wide gamut

- Display P3 holds about 30 % more colours than sRGB. A colour with high chroma may fall outside sRGB.
- Give an sRGB value first, then the wider one inside `@media (color-gamut: p3) { … }`. `qp tokens` lists the colours outside sRGB.

## Avoid the defaults

- The indigo/violet primary (hue 240–290°, saturation above 40 %) on a dark background with gradients is the most common generated look. Derive the accent from the brand, the product's subject or the references instead.
- Do not replace it with another fixed choice (cream and terracotta, near-black with an acid accent): those became defaults too. See [generic-clusters.md](generic-clusters.md).
