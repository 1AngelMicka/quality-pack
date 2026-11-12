# Design direction

<!-- Written by /sw:kickoff. Keep it short and specific: this file is what keeps the project from looking like every other one. -->

## Mood

Three words: <word>, <word>, <word>

## References

| Reference | What we take from it (look) |
| --- | --- |
| <site or app> | <one precise thing: the type scale, the density, the way photos are used…> |

## What we borrow (organisation)

How the references are organised, not how they look. The audit checks each line on the screenshots of the
key tasks, on phone and on desktop (criterion ERG-08), so write principles you can see on a screen.

| Reference | Principle we follow | Phone | Desktop |
| --- | --- | --- | --- |
| <app> | <e.g. preview always on screen, tools in a bar, one panel open at a time> | <e.g. preview on top, tabbed panel below, action bar under the thumb> | <e.g. preview in the centre, panel on the side> |

## Screens

Where the work happens, one line each: what the user decides there, in which order, and what is recommended by default.

## Never

- <what the user never wants to see>
- Default purple-to-blue gradients, glass cards everywhere, emoji used as icons
- Generic sections: three vague benefits, invented testimonials, stock illustrations

## Tokens

To define. Colours, type scale, spacing scale, radius and shadows live in one place
(Tailwind config or CSS variables). Components use the tokens only.

| Token | Value | Use |
| --- | --- | --- |
| color.bg | to define | |
| color.text | to define | |
| color.accent | to define | |
| font.display | to define | |
| font.body | to define | |
| space.unit | 4 px or 8 px | |

## Motion

What moves, why, and for how long. Every animation respects `prefers-reduced-motion`.
