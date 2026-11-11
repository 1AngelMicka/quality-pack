---
name: design-direction
description: "Turns the sites and apps a client likes into a visual direction and design tokens that can be checked: interview on references (how they look and how they are organised, plus anti-references), a reference matrix, 4 or 5 mood words turned into testable principles, 2 or 3 style tiles, then tokens in the W3C DTCG format (OKLCH colours, type, spacing, radius, motion) for light and dark, exported to CSS variables or Tailwind v4, with every contrast pair checked. Use at the start of a project with a UI, when DESIGN.md has tokens \"to define\", when a look is generic, or when changing colours, fonts or spacing. FR : direction visuelle, charte, moodboard, références, palette, couleurs, typographie, design tokens, thème sombre."
---

# From references to tokens

A direction that holds is traced: a reference the client likes → a word → a principle → a token → a check. Taste does not encode reliably (each generation of "anti-generic" advice creates its own default look), so this skill keeps every choice tied to the client's brief and to a measure.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below. Talk to the user in their language. Write the results into `DESIGN.md` (template: `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`) and token files.

## 1. Surface mode

Ask, or confirm from `.quality/project.json` › `surface`, which kind of surface the screens are. Record it in project.json.

- `persuade`: landing and marketing pages. Room for a strong, distinctive identity.
- `operate`: app screens, dashboards, forms, settings. Convention wins (users spend most of their time in other apps); spend boldness on one place at most, never on controls.
- `read`: documentation, articles. Type and measure first.

## 2. Interview on references

Ask for 3 to 6 references (sites, apps, printed things) and 1 to 3 anti-references. For each, ask what exactly they like, then sort every answer in two columns:

- **look**: colour, type, density, radius, shadows, imagery, motion;
- **organisation**: navigation, screen structure, where tools and results sit, flow.

A reference board made only of screenshots drifts into a feature comparison: keep asking "what do you like in how it looks?" and "what do you like in how it is organised?" separately. Fill [templates/reference-matrix.md](templates/reference-matrix.md).

If the client has no references, browse free galleries of real sites with them (no account needed): navbar.gallery, footer.design, recent.design (formerly Godly), good-web-design.com, designforb2b.com, supahero.io; and the public sites of their competitors. Study references, never clone them: no other brand's logo, trade dress or proprietary fonts, and never a brand's DESIGN.md copied from a catalogue as the project's own. Organisation traits go to DESIGN.md › "What we borrow" (checked by ERG-08 and used by the `design-screens` skill); look traits go to the next steps.

## 3. Four or five words, each a testable principle

Reduce the look traits to 4 or 5 mood words, refined with the client (synonyms help). Contradictory words weaken the direction: resolve them. Turn each word into a principle someone can check on a screen:

| Word | Principle |
| --- | --- |
| calm | at most one saturated accent per screen; no animation longer than 300 ms |
| warm | neutrals tinted toward the brand hue; photography of real people and places |
| precise | 4 px spacing grid; numbers in tabular figures; one radius for controls |

## 4. Style tiles before layouts

Make 2 or 3 style tiles: one HTML page each, with the type scale, the palette in use, buttons, inputs, a card, a list item and a photo treatment, and no page layout. Put them in `.quality/design/tiles/`. Show them side by side; the client picks or mixes. Iterating on a tile is much faster than on a mock-up because style is separate from layout.

For consumer apps and persuasive pages, look for a concept from the product's own world before choosing styles (a running app built around an athletics track, a sleep app as a village falling asleep): it drives type, colour, imagery and motion, and keeps the result from looking like every other product. Make the 2 or 3 tiles real alternatives, then pick; committing to the first idea is what makes generated design predictable.

Avoid the current default clusters listed in [references/generic-clusters.md](references/generic-clusters.md), but never by swapping in another fixed choice: derive each choice from the brief.

## 5. Tokens

Write tokens in the W3C DTCG format 2025.10, in `design/tokens/` (or the project's own folder), in three tiers:

1. **primitive**: what a value is (`primitive.sand.3`, an OKLCH colour, a size);
2. **semantic**: what it is for (`light.bg`, `light.text`, `light.text-muted`, `light.border`, `light.focus`, `light.accent`, and the same under `dark`);
3. **component**: only when needed (`component.button.bg`).

Components point to semantic tokens, semantic tokens to primitives. A theme only changes which primitives the semantic tokens point to. Name semantic colours by role (`bg`, `surface`, `text`, `fg`, `on-…`, `border`, `focus`) so the contrast check can pair them.

How to build each family: colour in [references/color.md](references/color.md); type, spacing, radius, elevation and motion in [references/type-space-motion.md](references/type-space-motion.md); the format and the export to CSS variables or Tailwind v4 in [references/tokens-dtcg.md](references/tokens-dtcg.md).

## 6. Check, then write DESIGN.md

1. `qp tokens`: every reference resolves, units and types are valid, tiers point downward, every text colour reaches 4.5:1 and every border, focus or state colour 3:1 against every background, in each theme, without rounding; colours outside sRGB have a fallback. Exit code 2 means something fails: fix the tokens, not the threshold.
2. Export the tokens (CSS variables, Tailwind `@theme`), and make sure components use only tokens.
3. Once a screen exists: `qp look <url>`. In persuade mode the generic tier should be `low`; the execution checks (font sizes, families, radii, line length and height, targets) should pass.
4. Update `DESIGN.md`: mood words and principles, references (look and organisation), tokens table, never-list, motion.

## Rules

| ID | Rule | Threshold | Source |
| --- | --- | --- | --- |
| DIR-01 | Mood | 4–5 words, each a testable principle | NN/g mood boards |
| DIR-02 | Text contrast | 4.5:1 (3:1 for 24 px or 18.67 px bold), never rounded, every theme | WCAG 2.2 1.4.3 |
| DIR-03 | Non-text contrast | 3:1 for field borders, states, focus ring | WCAG 2.2 1.4.11 |
| DIR-04 | Gamut | every OKLCH colour in sRGB, or an sRGB fallback plus a P3 override | CSS Color 4 |
| DIR-05 | Prose | line height at least 1.5; lines of 80 characters at most | WCAG 1.4.8, 1.4.12 |
| DIR-06 | Fluid type | every `clamp()` font size has a `rem` term, so zoom still works | WCAG 1.4.4 |
| DIR-07 | Motion | durations from tokens, 50–1000 ms; a reduced-motion alternative for any animated transform | Material 3 motion tokens; MDN |
| DIR-08 | Tokens | valid DTCG 2025.10: types, units, resolved references, no cycle | DTCG Format 2025.10 |
| DIR-09 | Type system | 2 families at most (plus monospace); 8 sizes at most per page | house setting |

House settings have no published validation: present them as adjustable. Sources: [SOURCES.md](../../SOURCES.md).
