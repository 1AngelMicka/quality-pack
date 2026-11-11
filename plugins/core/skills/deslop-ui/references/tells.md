# Signs of a generated interface

None of these patterns is forbidden in itself. The problem is their presence by default, whatever the subject. For each one, ask: was this choice made for this app, or would it be the same in any other?

## Measured by the audit (`qp deslop`)

| Rule | Pattern | Question to ask |
| --- | --- | --- |
| `eyebrow` | Small uppercase label above every heading | Does it say anything the heading does not? |
| `numbered-markers` | 01 / 02 / 03 | Is it a real sequence of steps? |
| `icon-tile` | Icon in a repeated rounded tile | Does the icon inform? Does it hold without a tile? |
| `emoji-icons` | Emoji as navigation, heading or button icons | Is the app really playful? |
| `gradient-text`, `gradient-control` | Gradients on text and buttons | Would a solid colour be worse? |
| `glow-shadow` | Coloured glowing shadows | Does the shadow show elevation? |
| `glass` | Frosted glass outside an overlay | Is there content behind worth showing? |
| `accent-bar` | Colour bar on the left of a rounded box | Does the colour carry a status? |
| `nested-cards` | Cards inside cards | Would space or one background do? |
| `card-kit` | Everything cut into identical cards | Does everything really have the same weight? |
| `arrow-cta` | Arrow added to buttons | Is there real movement? |
| `placeholder-copy` | Visible filler text | What is the real content? |

`qp look` adds the page-level signals (default font, violet primary, three identical cards, badge above the headline, hollow wording) as weighted tiers, and the accent share and reduced-motion checks.

## To spot by eye

- **Default layout:** sidebar, a row of four key figures, a chart, a table, whatever the product.
- **Reflex palette:** violet-blue on a dark background, cream and terracotta with a serif headline, black and acid green. If the palette would be the same for a plant app and an accounting app, it is not a choice.
- **Decorated charts:** frame, grid and legend that do not help read the data, very rounded bars.
- **A subtitle repeating the title,** and hollow taglines on a tool screen ("Your workspace at a glance").
- **Greetings and exclamation marks** instead of useful information ("Welcome back, Alex!").
- **Fake data that is too round,** badges and dots that mean nothing, "New" and "Pro" without reason.
- **Entrance animations everywhere:** every section sliding in. One chosen moment is worth more.
- **Forgotten states:** empty, error, loading and long text never designed.

## How to remove it

Remove first. Much of the gain comes from what is deleted: tiles, badges, redundant subtitles, boxes. Only then strengthen what remains with size, weight and space. If the screen feels empty after that, real content is missing, not decoration.

## Sources

These lists summarise findings from several authors consulted in October 2026: Tobi Adonadon (concept, directions, critique), [unslop-ui](https://github.com/yuwen-lu/unslop-ui), [heydamir/unslop](https://github.com/heydamir/unslop), [Impeccable](https://github.com/pbakaus/impeccable), [Hallmark](https://github.com/Nutlope/hallmark) and [Taste Skill](https://github.com/Leonxlnx/taste-skill). Ideas restated, no text copied.
