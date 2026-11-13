# Tokens in the DTCG format

The W3C Design Tokens Community Group format reached its first stable version, 2025.10, on 28 October 2025 (a Community Group report, not a W3C Recommendation). Style Dictionary v5, Tokens Studio, Terrazzo, Figma and Penpot read it. Files end in `.tokens.json`.

## Essentials

- A token is an object with `$value`; anything else is a group. `$type` is set on the token or inherited from a group; types are never guessed from the value.
- Names never start with `$` and never contain `{`, `}` or `.`.
- `dimension`: `{"value": 16, "unit": "px"}` or `rem`, with the unit even for 0. `duration`: `ms` or `s`. `cubicBezier`: four numbers, x1 and x2 between 0 and 1. `fontWeight`: 1 to 1000.
- `color`: `{"colorSpace": "oklch", "components": [0.62, 0.14, 45]}`; sRGB, Display P3 and the CSS Color 4 spaces are allowed. `sw tokens` also reads `#hex`, `rgb()` and `oklch()` strings.
- References: `"{group.token}"`. A reference that does not resolve, or a cycle, is an error.

## Example

```json
{
  "primitive": {
    "$type": "color",
    "sand": {
      "1":  { "$value": { "colorSpace": "oklch", "components": [0.985, 0.008, 80] } },
      "6":  { "$value": { "colorSpace": "oklch", "components": [0.86, 0.02, 80] } },
      "11": { "$value": { "colorSpace": "oklch", "components": [0.48, 0.03, 70] } },
      "12": { "$value": { "colorSpace": "oklch", "components": [0.24, 0.02, 60] } }
    },
    "clay": { "9": { "$value": { "colorSpace": "oklch", "components": [0.55, 0.13, 40] } } }
  },
  "light": {
    "$type": "color",
    "bg":         { "$value": "{primitive.sand.1}" },
    "text":       { "$value": "{primitive.sand.12}" },
    "text-muted": { "$value": "{primitive.sand.11}" },
    "border":     { "$value": "{primitive.sand.11}" },
    "accent":     { "$value": "{primitive.clay.9}" }
  },
  "space": {
    "$type": "dimension",
    "2": { "$value": { "value": 8, "unit": "px" } },
    "4": { "$value": { "value": 16, "unit": "px" } }
  },
  "motion": {
    "duration": { "$type": "duration", "short": { "$value": { "value": 150, "unit": "ms" } } },
    "ease": { "$type": "cubicBezier", "standard": { "$value": [0.2, 0, 0, 1] } }
  }
}
```

`light.border` points to step 11 here because field borders need 3:1; a step-6 border would be decorative only.

## Export

- Style Dictionary v5 (DTCG is its base format) turns the files into CSS variables per theme, for example `:root { --bg: …; }` and `[data-theme="dark"] { --bg: …; }`, or into other platforms.
- Tailwind v4: map the variables in `@theme inline { --color-bg: var(--bg); … }`. Reset the default namespaces you replace (`--color-*: initial;`) so classes outside the system, such as `bg-red-500`, stop existing.
- Without a build tool, write the CSS variables by hand from the token files, and keep the token files as the source of truth.

## Check

`sw tokens` (or `sw tokens path/a.tokens.json path/b.tokens.json`, merged in order): structure, references, units, tiers, the contrast matrix per theme (`light`/`dark` groups, or groups under `theme`), colours outside sRGB. Exit code 2 when a contrast pair or the format fails.
