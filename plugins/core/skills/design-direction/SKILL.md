---
name: design-direction
description: "Turns the sites and apps a client likes into a visual direction and design tokens that can be checked: interview on references (how they look and how they are organised, plus anti-references), a reference matrix, 4 or 5 mood words turned into testable principles, 2 or 3 style tiles, then tokens in the W3C DTCG format (OKLCH colours, type, spacing, radius, motion) for light and dark, exported to CSS variables or Tailwind v4, with every contrast pair checked. Use at the start of a project with a UI, when DESIGN.md has tokens \"to define\", when a look is generic, or when changing colours, fonts or spacing. FR : direction visuelle, charte, moodboard, références, palette, couleurs, typographie, design tokens, thème sombre."
---

# From references to tokens

A direction that holds is traced: a reference the client likes → a word → a principle → a token → a check. Taste does not encode reliably (each generation of "anti-generic" advice creates its own default look), so this skill keeps every choice tied to the client's brief and to a measure.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs"`, written `sw` below. Talk to the user in their language. Write the results into `DESIGN.md` (template: `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`) and token files.

## Before the references: the site type, and numbers

Two commands turn "I like this site" into something that can be checked later.

- `sw bank` lists site types (restaurant, online shop, SaaS marketing site, documentation…); `sw bank <type>` gives what visitors of that type expect, real sites recognised as excellent with what to look at on each, their shared traits, and what to avoid. Read it before asking the user for references, and offer two or three of its sites when the user has none. They are examples to learn from; nothing is copied from them.
- `sw patterns --type <type> --surface <mode>` lists everything the pack can propose for that kind of site: navigation, motion, visual effects, features, page sections, UX laws, inspiration galleries (to find more references) and free component libraries. Show the user the families and a handful of patterns that suit the mood, with how widespread each one is (`prevalence`: a pattern seen `everywhere` reads as déjà vu unless it carries something from the trade), and use the galleries when they have no references. Patterns are choices, not requirements: offer the ones that fit with their cost ("use when", "avoid when"), let the user pick, and write each chosen one in `DESIGN.md` › "Chosen patterns" with its reason. A pattern the generic-look check flags (glass, glow, serif italics, badge above the headline…) is allowed once the user chose it: say so in one line, then build it well.
- `sw profile <url> <url> --save` measures the references the user names and writes `.quality/references.json`: type scale, number of typefaces, how much of the first screen is image, colour, empty space, density of controls, and the range the references share. Later, `sw gap <url>` lists where a screen of the project falls outside that range. A gap is a question to settle with the user (close it, or keep it and say why in `DESIGN.md`), never a defect by itself.

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

### Take the best of several, copy none

A direction that copies one reference looks like that reference; a direction taken from nobody looks like every generated site. Mix instead, axis by axis. The axes: **type** (families, scale, weights), **colour logic** (where colour comes from and where it goes), **layout rhythm** (grid, density, how sections breathe), **imagery** (photo, illustration, product, treatment), **motion** (how things arrive and respond), **organisation** (navigation, where the action sits), **voice** (how the copy talks).

1. In the reference matrix, mark for each axis which reference it is taken from, and why it fits this brief.
2. **No reference gives more than two axes**, and at least one axis comes from the trade itself (the signature below), not from any site.
3. **The single-source test.** For each reference, name at least three axes where the direction differs from it. If you cannot, the direction is a copy of that reference: change an axis.
4. Use references of the same scale as the project when comparing (a freelancer is not compared with a celebrity site or a large agency): `sw bank <type>` gives each site's scale when known.

If the client has no references, browse free galleries of real sites with them (no account needed): navbar.gallery, footer.design, recent.design (formerly Godly), good-web-design.com, designforb2b.com, supahero.io; and the public sites of their competitors. Study references, never clone them: no other brand's logo, trade dress or proprietary fonts, and never a brand's DESIGN.md copied from a catalogue as the project's own. Organisation traits go to DESIGN.md › "What we borrow" (checked by ERG-08 and used by the `design-screens` skill); look traits go to the next steps.

## 3. Four or five words, each a testable principle

Reduce the look traits to 4 or 5 mood words, refined with the client (synonyms help). Contradictory words weaken the direction: resolve them. Turn each word into a principle someone can check on a screen:

| Word | Principle |
| --- | --- |
| calm | at most one saturated accent per screen; no animation longer than 300 ms |
| warm | neutrals tinted toward the brand hue; photography of real people and places |
| precise | 4 px spacing grid; numbers in tabular figures; one radius for controls |

## 4. Style tiles before layouts

Make 2 or 3 style tiles, each from a different starting theme: `sw patterns themes` lists about thirty aesthetics (Swiss, brutalist, editorial, art deco, terminal, organic, luxury serif, retro-futurist…) with free font pairings, palette logic, layout, motion, the trades each suits, how widespread each is and real examples. A theme is a starting point to bend with the references and the trade, never a skin applied as is. `sw patterns design-rules` gives the numeric rules (scales, grids, Gestalt, colour) to explain each choice. One HTML page per tile, with the type scale, the palette in use, buttons, inputs, a card, a list item and a photo treatment, and no page layout. Put them in `.quality/design/tiles/`. Show them side by side with `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" tiles`: it serves the folder, captures each tile on desktop and phone, writes a contact sheet (`_sheet/index.html`, `_sheet/sheet.png`) and reports fonts that are declared but not loaded. The client picks or mixes. Iterating on a tile is much faster than on a mock-up because style is separate from layout.

For consumer apps and persuasive pages, look for a concept from the product's own world before choosing styles (a running app built around an athletics track, a sleep app as a village falling asleep): it drives type, colour, imagery and motion, and keeps the result from looking like every other product. Make the 2 or 3 tiles real alternatives, then pick; committing to the first idea is what makes generated design predictable.

### A signature moment from the trade

Every site worth remembering has one thing that belongs to it. Find it in the client's trade, not in a gallery:

1. List, with the client, what the trade **does** (verbs), **handles** (materials, tools, objects, places), **produces** (the before and after, the result the customer pays for) and **how customers judge it** (what they look at to choose).
2. Turn that list into **three candidate signature moments**, each one sentence. Example for a web designer: a plain shop page turns into the redesigned version as the visitor scrolls or drags (before/after); for a bakery: the day's batches appear by the hour they come out of the oven; for a driving school: the progress of a learner shown as a road map.
3. Keep only ideas that pass three tests:
   - **swap test**: moved to another trade's site, it would lose its meaning (a WebGL blob passes for everyone, so it fails);
   - **touch test**: it works with a finger and with scrolling on a phone, not only with a mouse hover (most visitors of small businesses are on phones);
   - **still test**: with reduced motion it still says the same thing as a still image or a simple state change.
4. Show the three to the client, let them pick, and write it in `DESIGN.md` › "Signature": the moment, where it lives, its phone version, its still version. One signature per site is enough; everything around it can stay quiet.

`sw patterns` gives techniques to build it (before/after slider, scroll scene, shared-element transition…); the idea itself must come from the trade.

Avoid the current default clusters listed in [references/generic-clusters.md](references/generic-clusters.md), but never by swapping in another fixed choice: derive each choice from the brief.

## 5. Tokens

Write tokens in the W3C DTCG format 2025.10, in `design/tokens/` (or the project's own folder), in three tiers:

1. **primitive**: what a value is (`primitive.sand.3`, an OKLCH colour, a size);
2. **semantic**: what it is for (`light.bg`, `light.text`, `light.text-muted`, `light.border`, `light.focus`, `light.accent`, and the same under `dark`);
3. **component**: only when needed (`component.button.bg`).

Components point to semantic tokens, semantic tokens to primitives. A theme only changes which primitives the semantic tokens point to. Name semantic colours by role (`bg`, `surface`, `text`, `fg`, `on-…`, `border`, `focus`) so the contrast check can pair them.

How to build each family: colour in [references/color.md](references/color.md); type, spacing, radius, elevation and motion in [references/type-space-motion.md](references/type-space-motion.md); the format and the export to CSS variables or Tailwind v4 in [references/tokens-dtcg.md](references/tokens-dtcg.md).

## 6. Check, then write DESIGN.md

1. `sw tokens`: every reference resolves, units and types are valid, tiers point downward, every text colour reaches 4.5:1 and every border, focus or state colour 3:1 against every background, in each theme, without rounding; colours outside sRGB have a fallback. Exit code 2 means something fails: fix the tokens, not the threshold.
2. Export the tokens (CSS variables, Tailwind `@theme`), and make sure components use only tokens.
3. Once a screen exists: `sw look <url>`. In persuade mode the generic tier should be `low`; the execution checks (font sizes, families, radii, line length and height, targets) should pass.
4. Update `DESIGN.md`: mood words and principles, references (look and organisation), tokens table, never-list, motion.

## 7. Keep the user's corrections

Every design correction the user makes is something the next session will get wrong again unless it is written down. At the end of a session where the user corrected the look (when they ask, or before closing a design task), go through the conversation and turn those corrections into rules in `DESIGN.md` › "Corrections".

- **What counts:** an explicit correction ("a shadow, not a border"), a value the user changed by hand in a file you wrote, a run of nudges ("smaller", "still too big", "ok": keep where they landed), a variant chosen or something removed, a non-obvious choice the user confirmed. Bugs, one screen's wording and misunderstandings of the task are not taste: leave them out.
- **Only the user's taste.** Every rule comes from something the user said, edited or chose. Never add a rule because it is good practice.
- **The reason.** Use the user's reason in their words. If they gave none, write a guess marked "(to confirm)" and ask; never write an invented reason as fact.
- **The right level.** Not one card ("the pricing card has a shadow") and not everything ("never borders"), but the class: "raised surfaces (cards, menus, popovers) use `shadow-raised`, never a solid border". Use the project's own token names and values, and "always" or "never" rather than "prefer".
- **Existing rules first.** If DESIGN.md already says the same thing, the rule failed: make it stricter (a number, a token) instead of adding a duplicate. If it says the opposite, show both and let the user choose.
- **A check beats a sentence.** When a violation can be found in the code (a raw colour instead of a token, a forbidden value), add it to the tokens or a lint rule as well, so `sw tokens` or the linter catches it every time.
- **Propose, then write.** Show the list of rules with their source and reason; write only what the user approves. Write each rule for an agent that was not in this session: no "as discussed", no "the card from earlier".

## Rules

**Defaults, never ceilings.** Every limit in this pack (number of animations, scroll budget, typefaces, radii, generic-look signals, durations…) is a default that gives a good result when nobody asks for more. When the user wants more, build it, and build it well: say its cost once in one sentence (speed, readability, accessibility), then write the choice in `.quality/project.json` › `choices` (`{ "id": "<rule, criterion or check>", "what": "…", "why": "<the user's words>", "date": "…" }`). The measures and the audit then report it as chosen, not as a defect. Never refuse, water down or quietly shrink what the user asked for. Visitors keep their own settings (reduced motion, zoom, keyboard): honouring them never limits what the author builds for everyone else.

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
| DIR-11 | Signature | one signature moment from the trade, passing the swap, touch and still tests, written in DESIGN.md › "Signature" | house rule |
| DIR-12 | Mixing | each look axis traced to a reference or to the trade; no reference gives more than two axes; each reference differs on at least three axes | house rule |
| DIR-10 | Corrections | every design correction of a session written in DESIGN.md as a class-level rule with its reason, approved by the user | idea from emilkowalski/skills (learn-taste) |

House settings have no published validation: present them as adjustable. Sources: [SOURCES.md](../../SOURCES.md).
