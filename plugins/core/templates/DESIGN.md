# Design direction

<!-- Written by /qp:kickoff. Keep it short and specific: this file is what keeps the project from looking like every other one. -->

## Mood

Three words: <word>, <word>, <word>

## References

| Reference | What we take from it |
| --- | --- |
| <site or app> | <one precise thing: the type scale, the density, the way photos are used…> |

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
