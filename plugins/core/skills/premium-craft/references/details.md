# Finishing details

This file lists the finishing details as rules you can check on a rendered page: a number, a CSS line or a test to run. Each group ends by saying what `sw craft` measures and what you check by eye. It goes deeper than `SKILL.md` and does not repeat the token rules of `design-direction` ([color.md](../../design-direction/references/color.md), [type-space-motion.md](../../design-direction/references/type-space-motion.md)) or the spacing rules of `deslop-ui`.

Checked on 2026-11-12. Two kinds of uncertainty are marked. "House setting" means a threshold chosen by this pack and not validated on a reference set: tune it on real pages. "Not verified" means the value was stated from memory and not read again on the primary source.

## Typography

| Rule | How |
| --- | --- |
| Headings wrap evenly | `h1, h2, h3 { text-wrap: balance; }` |
| Paragraphs do not end on one word | `p { text-wrap: pretty; }` |
| Digits that update or are compared keep one width | `font-variant-numeric: tabular-nums;` on tables, timers, prices, counters |
| Real characters | `’ “ ” …` and a real dash; a non-breaking space between number and unit (`12 kg`), inside shortcuts (`Ctrl K`) and inside names that must not split |
| Display cut for large sizes | Above about 24 to 32 px (house setting), use the optical-size axis or the display cut of the family. Linear sets headings in Inter Display and text in Inter |
| Tracking | Do not tighten display type until letters touch. Do not widen body text. Capitals get 0.04em to 0.1em. No all-caps body, no justified text |
| Weights | None under 400. Headings at 500 to 600. Never change weight on hover or selection: the label changes width and the row shifts |
| Smoothing | `-webkit-font-smoothing: antialiased;` once on the root |
| Anchors | `:target, [id] { scroll-margin-top: <sticky header height + 16px>; }` |
| Sizes and files | Fluid sizes use `clamp()` with a `rem` term (see type-space-motion.md). Fonts are subset; preload the ones used above the fold |
| Hanging punctuation | `hanging-punctuation` works in Safari only (not verified, MDN): an extra, never a pass or fail |

Measured by `sw craft`: `heading_wrap`, `heading_orphans` (last line under 20 % of the widest), `heading_line_height` (32 px and more: 1.0 to 1.3), `tabular_numbers` (must, on table columns of 3 or more number cells), `typographic_characters` (more than 2 hits fails), `caps_tracking`, `font_weights` (4 at most), `label_case`, `input_font_size` (must, phone). By eye: paragraph orphans, the display cut, weight change on hover, anchors under a sticky header, digits outside tables (timers, prices, counters).

Sources: Jakub Krehel (https://jakub.kr/writing/details-that-make-interfaces-feel-better), Vercel Web Interface Guidelines (https://vercel.com/design/guidelines), Rauno Freiberg (https://github.com/raunofreiberg/interfaces), Linear (https://linear.app/now/how-we-redesigned-the-linear-ui), Impeccable (https://impeccable.style/anti-patterns).

## Colour and surfaces

- **Contrast-predictable steps.** Build the scale in a perceptually uniform space so the step number tells you the contrast, whatever the hue. Stripe's result: two colours 5 steps apart pass 4.5:1 (small text), 4 steps apart pass 3:1 (large text, icons). Test your own scale the same way: pick a step distance, check every hue pair at that distance.
- **Tinted neutrals.** On a background that is not neutral, borders, shadows and secondary text lean toward its hue. Grey text on a coloured surface looks washed out: use a darker or lighter shade of the surface hue.
- **States gain contrast.** Hover, pressed and focus have more contrast against the background than rest, never less.
- **Selection.** Style `::selection` with the brand colours, at 4.5:1 with the selected text. Inside it, unset gradient text.
- **WCAG 2 AA is the floor;** APCA is a second opinion only (see color.md). Body text is not `#000` on `#fff`: soften or tint one of the two.

Measured by `sw craft`: `pure_black_text` (fails when half the body text blocks or more are pure black on pure white), `selection_color`. `sw tokens` checks the contrast matrix. By eye: contrast of hover, pressed and focus against rest; tint of greys on coloured surfaces.

Sources: Stripe (https://stripe.com/blog/accessible-color-systems), Linear (same post as above), Vercel guidelines, Impeccable, Rauno Freiberg.

## Shadows, borders, radii

- **Layers.** Two layers at least: a tight one (direct light) and a wide soft one (ambient). Three to five for a dialog. Higher elevation means larger offset and blur, and lower opacity.
- **One light direction.** Every shadow uses the same x:y ratio, for example `y = 2x`, or `x = 0` everywhere.
- **Shadow colour** takes the hue of the surface behind it, not pure black.
- **Ring edge.** A 1 px ring sharpens a surface better than an opaque border, and one surface never gets both an opaque hairline and a wide shadow. Values: ring at about 6 % black, then two soft layers at about 6 % and 4 %. On hover, raise each by about 2 points and transition `box-shadow` only. In dark, the ring is white at about 8 %, about 12 % on hover.
- **Image outline.** A 1 px inset outline at about 10 % black (10 % white in dark) stops an image from bleeding into the page.
- **Concentric radii.** `inner radius = outer radius − padding`. A child's radius is never larger than its parent's.

```css
.card {
  --r: 16px; --pad: 8px; /* opacities below are sourced; offsets and blurs are an example */
  border-radius: var(--r); padding: var(--pad);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.06), 0 4px 12px rgb(0 0 0 / 0.04);
  transition: box-shadow 150ms ease-out;
}
.card > .inner { border-radius: max(0px, calc(var(--r) - var(--pad))); }
.card img { outline: 1px solid rgb(0 0 0 / 0.1); outline-offset: -1px; }
```

Measured by `sw craft`: `shadow_count` (5 different shadows at most), `shadow_quality` (a single layer of plain black at 25 % or more), `nested_radius` (child radius equal to or larger than a parent of 8 px and more with 4 px padding and more). By eye: light direction, shadow tint, the ring, the image outline, border plus wide shadow on one surface.

Sources: Josh W. Comeau (https://www.joshwcomeau.com/css/designing-shadows/), Jakub Krehel, Vercel guidelines, Impeccable.

## Alignment and layout

- **Optical alignment.** When geometry and the eye disagree, the eye wins: nudge by about 1 px. A button with an icon gets less padding on the icon side. Fix an off-centre icon inside its `viewBox` first, then in CSS.
- Every element lines up on something on purpose: a grid line, a baseline, an edge or an optical centre. In an icon and text pair, weight, size and colour match.
- **Viewport height.** `100dvh`, not `100vh` (the phone toolbar hides the bottom). Add `env(safe-area-inset-*)` on fixed bars.
- **Z-index scale.** A fixed list of named levels, no arbitrary value: `--z-sticky: 10; --z-dropdown: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50;`
- **Content of any length.** Each component is tried with a short, an average and a very long value (a 60-character name, a 7-digit amount, an empty field). Nothing overlaps or pushes a button out.
- **Widths.** Test on a phone, a laptop and a very wide screen (zoom out to 50 %). No unwanted scrollbar: preview with scrollbars always visible.

Measured by `sw craft`: nothing in this group. `sw deslop` measures alignment and spacing. By eye: all of the above.

Sources: Vercel guidelines, Jakub Krehel, ibelick/ui-skills (https://github.com/ibelick/ui-skills).

## Perceived speed

Three limits (Nielsen): 0.1 s feels instant; 1 s keeps the train of thought; 10 s is the limit of attention.

| Wait | Show |
| --- | --- |
| Under 1 s | Nothing |
| Any indicator | Delay it by 150 to 300 ms. Once shown, keep it 300 to 500 ms at least, so it never flashes |
| Full page, under 10 s | A skeleton with the shape of the real layout, not an empty frame |
| One block, 2 to 10 s | A spinner in that block. The sources leave 1 to 2 s open: treat it the same |
| Over 10 s, and any upload or conversion | A progress bar with a percentage, and a way to cancel |

- A loading button keeps its label and its width. The skeleton has the dimensions of the final content: no shift when it is replaced.
- **Optimistic update.** When success is likely, change the screen at once, reconcile with the answer, and on failure roll back with a message or offer Undo.
- **Mutation budget.** A POST, PATCH or DELETE answers in under 500 ms.
- Feedback appears beside its trigger: a check on the copy button, a highlight on the field at fault.
- Long lists are virtualised or use `content-visibility: auto`. Only above-the-fold images are preloaded. Preconnect to asset origins.
- **Core Web Vitals**, 75th percentile, phone and desktop apart: LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less. "Poor" starts at LCP 4.0 s, INP 500 ms, CLS 0.25; good TTFB is 0.8 s or less and good FCP 1.8 s or less (these four: not verified).
- House settings for a first marketing page, not validated: 170 kB of compressed JavaScript on first load, no long task over 200 ms during the first interaction.
- Test with CPU and network throttling, in Safari, and on iOS in Low Power Mode.

Measured by `sw craft`: `layout_shift` (must, CLS over 0.1 while the page loads in the lab), `image_dimensions`. By eye, with the network throttled to 100 ms, 1.5 s and 12 s: the loader policy, optimistic updates, rollback. Field vitals come from real-user data, not from this CLI.

Sources: Nielsen Norman Group (https://www.nngroup.com/articles/response-times-3-important-limits/, https://www.nngroup.com/articles/skeleton-screens/), Vercel guidelines, Rauno Freiberg, web.dev (https://web.dev/articles/vitals).

## Motion numbers

The token bands are in type-space-motion.md. These are the values for controls.

| What | Value |
| --- | --- |
| Feedback on a control | Under 200 ms. Any interface animation under 300 ms. A 180 ms menu feels better than a 400 ms one |
| Easing | Ease-out for enter and exit, with a custom curve: the CSS keywords are weak. No bounce or overshoot on routine actions, no `linear` on a transform |
| Press | `:active { transform: scale(0.97); }` (range 0.96 to 0.98) |
| Enter | Never from `scale(0)`. Small popovers start at 0.9 or more, dialogs at about 0.8 or more. Origin at the trigger (`transform-origin` from the popover library's variable) |
| Enter, content | From `translateY(8px)`, `blur(8px)`, opacity 0 |
| Exit | Quieter than the entrance: opacity and about 4 px of blur |
| Stagger | About 100 ms between blocks, about 80 ms between words |
| Tooltips | The first waits; the next ones in the same group show at once. About 125 ms, ease-out |
| Icon swap (copy to check) | Opacity, scale and blur together. On a crossfade, `blur(2px)` hides an imperfect one |
| Spring (drag, gesture) | Duration about 0.45 s, bounce 0. Apple's advice, not verified: bounce 0 by default, about 0.15 for some life, avoid more than about 0.4 |

Never animate: `width`, `height`, `top`, `left`, margins or padding; `transition: all`; an action started from the keyboard; an action done many times a day; the theme switch. Use CSS transitions for anything the user can interrupt: they retarget, keyframes do not. Large blurs and `backdrop-filter` on big surfaces are slow. Pause loops when off screen. Set `will-change` only while the animation runs.

Measured by `sw craft`: `transition_all`, `transition_duration` (over 500 ms on a control), `layout_animation`, `hover_transitions` (more than half of buttons changing with no transition), and the signal "every transition lasts 150 ms". The checks read transitions on controls only. By eye: press scale, entry scale and origin, stagger, tooltip grouping, exits, keyframe animations.

Sources: Emil Kowalski (https://emilkowal.ski/ui/7-practical-animation-tips, https://emilkowal.ski/ui/great-animations), Rauno Freiberg, Jakub Krehel, ibelick/ui-skills, Vercel guidelines, Impeccable.

## Keyboard and interaction

- **Focus.** `:focus-visible` shows a ring of 2 px or more at 3:1 (the 3:1 figure: not verified against WCAG 2.2). It is never hidden under a sticky bar. An overlay traps focus and gives it back to its trigger on close.
- **Lists.** Arrow keys move, Enter opens, Ctrl or Cmd + Backspace deletes. Dropdowns open on `mousedown`. A nested menu stays open while the pointer travels toward it (Linear does it with an invisible triangle between pointer and submenu).
- **URL state.** Filters, tabs, page number and open panels are in the address. Reload, share and Back give the same screen. Back and Forward restore the scroll position.
- **Real links and hit areas.** Navigation is an `<a href>`: middle click and Ctrl or Cmd click work. No dead zone inside a control. Label and checkbox are one target. List rows touch: pad them, no gap between them.
- **Hover.** `@media (hover: hover) { .btn:hover { … } }`, so a tap leaves no stuck hover. No tooltip on a disabled button, nothing clickable inside a tooltip.
- **Touch.** Fields at 16 px or more. No autofocus. `touch-action: manipulation` on controls. `overscroll-behavior: contain` on dialogs and drawers.
- **Shortcuts** are shown with the platform's symbols and work on non-QWERTY layouts. A multi-screen app has a search or command palette on Ctrl or Cmd + K (house setting).
- **Forms.** Enter submits; Ctrl or Cmd + Enter in a textarea. Submit is never disabled in advance. Paste is never blocked. The error sits beside its field and focus goes to the first one. `autocomplete` and `inputmode` are set. Leaving with unsaved changes warns. Values are trimmed.

Measured by `sw craft`: `focus_visible` (must, 25 Tab stops), `hover_states` (12 buttons), `input_font_size`, `viewport_zoom`. By eye: everything else. Run each flow once with the keyboard only.

Sources: Vercel guidelines, Rauno Freiberg, Linear (https://linear.app/now/invisible-details).

## States and finishing

- **Four states per list or table:** empty, sparse (one row), dense (hundreds, long values), error. The empty state has a heading and one action. The error state says what failed and offers Retry. No screen is a dead end.
- **Title.** `<title>` names the current context ("Invoice 2041 · Billing"), not only the product.
- **Favicon.** SVG with a PNG fallback. It follows the theme: inside the SVG, `<style>path { fill: #111 } @media (prefers-color-scheme: dark) { path { fill: #fff } }</style>`.
- **Locale.** Dates, numbers and currency go through `Intl`. Language comes from `Accept-Language` or the user's setting, never from the IP address. Brand names and code carry `translate="no"`.
- **Long strings.** The layout holds with labels 35 % longer (house setting, for German or French).
- **Around the page:** apple-touch-icon (180 px), web manifest, `theme-color`, share image of 1200 × 630, a 404 page of the product's own with a way back, the current year or none in the footer, no console error on load.

Measured by `sw craft`: `favicon`, `not_found_status` (must), `touch_icon`, `not_found_page`, `share_image` (must on public pages), `image_distortion`, `image_sharpness` (must). By eye: the four states, the title per route, the dark favicon, locale, long strings.

Sources: Vercel guidelines, Rauno Freiberg, ibelick/ui-skills, survey of 100 generated sites (https://dev.to/kaplich/i-analyzed-100-vibe-coded-websites-and-found-these-common-mistakes-5275).

## Dark theme

Token mapping is in color.md. The finishing rules:

- Elevation goes lighter: page, panel, dialog and menu are three levels or more, each lighter than the one below (the count is a house setting).
- Hairlines are white at about 8 %, about 12 % on hover. No black shadow on a near-black page: use the lighter surface and the ring.
- `:root { color-scheme: dark; }`, so scrollbars, native controls and autofill follow. `<meta name="theme-color">` equals the page background. On Windows, give `<select>` explicit colours.
- No transition while the theme switches. Check the selection colour, the image outlines and the favicon again in dark.

Measured by `sw craft`: `dark_color_scheme` (must, when the page background is dark). By eye: the levels, hairlines, shadows, the switch.

Sources: Jakub Krehel, Vercel guidelines, Linear, Rauno Freiberg.

## Second-generation tells

The first round of advice against generated looks produced a new default look. These patterns are as recognisable now as the purple gradient was. One alone proves nothing: sources agree that clusters give a page away. The older tells are in [generic-clusters.md](../../design-direction/references/generic-clusters.md) and [tells.md](../../deslop-ui/references/tells.md).

| Tell | Instead | `sw look` |
| --- | --- | --- |
| Thin serif headline with one word in italics | Emphasis by weight or size, in a face chosen for the subject | `LOOK-ITALIC` |
| Cream page with terracotta accent; near-black with acid green | A palette derived from the subject (see identity.md) | `LOOK-PALETTE` |
| Pill badge above the headline; small label above every heading | The headline alone; a label only if it adds information | `LOOK-BADGE`, `LOOK-EYEBROWS` |
| Hero made of a huge number, a small label and a stat row | Open with the product itself: real screen, real output | by eye |
| Rounded icon tile above every feature heading | Vary the unit: screenshot crop, number, diagram, or nothing | `LOOK-ICONTILES` |
| Coloured side stripe on each card | One rule for where accent colour goes | `LOOK-STRIPES` |
| Dots that show no state; a dot pulsing forever | Each dot is a defined state with a text label | `LOOK-PULSE` |
| "01 / 02 / 03" labels without a sequence | Number real steps only | `LOOK-NUMBERED` |
| Cards inside cards | Group with space and type | `LOOK-NESTED` |
| Pill buttons everywhere; one radius on everything | A radius scale with roles | `LOOK-RADIUS` (12 to 24 px on 70 % of boxes) |
| Middle-dot strings, "WORD — fragment" labels, monospace for small labels, an arrow on every link | Only where it encodes something | by eye (`sw deslop`: `arrow-cta`) |
| Grid-line background, stripes, hard offset shadow of 4 px and more | Remove; texture needs a reason | by eye |
| Fade and slide up on every section; hover effect on every card | One orchestrated moment per page | `LOOK-ANIMATE-ALL` |
| Bounce on routine actions; logo marquee without pause; blinking cursor on static text | Ease-out; a pause control on motion over 5 s | by eye |
| Every section one viewport tall, equal gaps everywhere | Height and density follow importance | by eye |

Sources: Impeccable (https://impeccable.style/anti-patterns), Anthropic `frontend-design` skill (https://github.com/anthropics/skills/tree/main/skills/frontend-design), Fountain Institute (https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui).
