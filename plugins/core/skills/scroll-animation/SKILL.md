---
name: scroll-animation
description: "Builds scroll animations that work for everyone: reveals on enter, scroll-linked (scrubbed) motion, progress bars, parallax, sticky and pinned scenes, horizontal sections, text reveals, scrollytelling steps, snapping, image sequences and video scrubbing, 3D scenes, Lottie and Rive driven by scroll, page and section transitions, smooth scrolling. Picks native CSS first (scroll-driven animations, view transitions, scroll snap), then a free library only when needed, with reduced motion, performance and no scroll hijacking, and proves it with measures. Use whenever a page needs anything that moves with scrolling. FR : animation au scroll, apparition au défilement, parallaxe, section épinglée, défilement horizontal, scrollytelling, smooth scroll, transitions de page."
---

# Scroll animation

Scroll animation helps when it tells a story, shows progress or reveals structure. It hurts on task pages, forms, apps and dense reading, and on phones more than on desktops. Check `.quality/project.json` › `surface`: in `operate` and `read`, keep scroll motion to progress feedback and small reveals; the big effects belong to `persuade` pages.

Four rules come before any technique:

1. **Content never depends on an animation.** Everything is readable with JavaScript off and with reduced motion requested. The hidden starting state (opacity 0, offset) only exists inside the enhancement, never as the default style.
2. **Scrolling stays native.** Do not change scroll speed or direction, do not cancel wheel or touch events. Smooth-scroll libraries only on persuasive pages, and only if keyboard, anchors, find-in-page and reduced motion still work.
3. **Motion is optional.** Every scroll effect sits inside `@media (prefers-reduced-motion: no-preference)` (or the JS equivalent) and has a still version: the end state, or a short fade.
4. **Animate `transform`, `opacity` and `filter` only.** They run off the main thread with CSS scroll timelines; width, height, top, left, colours and shadows cause layout or paint on every frame.

## 1. Pick the technique

Native first. Since October 2026 CSS scroll-driven animations work in Chrome, Edge (115+), Safari (26+) and Firefox (159+) — Baseline "newly available" — so most effects need no library. Older browsers simply show the content without the effect, which is fine when rule 1 holds.

| Effect | Native (first choice) | Library, when native is not enough |
| --- | --- | --- |
| Reveal once on enter | `animation-timeline: view()` with `animation-range: entry`, or IntersectionObserver + a class | Motion `inView` / `whileInView` |
| Scrubbed motion tied to position | `animation-timeline: view()` or `scroll()` | GSAP ScrollTrigger (`scrub`), Motion `scroll()` / `useScroll` |
| Reading progress bar | `animation-timeline: scroll(root)` on `transform: scaleX()` | — |
| Parallax | `view()` timeline on `translate` of a background layer | Motion `useScroll` + `useTransform`; simpleParallax |
| Sticky / pinned scene | `position: sticky` in a tall container + a `view()` or named timeline | GSAP ScrollTrigger `pin` |
| Horizontal section | sticky container + `translate` on a named `view-timeline` | GSAP ScrollTrigger (`containerAnimation`) |
| Text reveal by word or line | split in the HTML (spans) + staggered `view()` animations | GSAP SplitText (adds ARIA), Splitting.js (add ARIA yourself) |
| Scrollytelling steps | IntersectionObserver per step, a sticky graphic | Scrollama |
| Snapping sections or carousels | `scroll-snap-type` (prefer `proximity` for tall sections) | Lenis snap, Swiper (carousels) |
| Image sequence or video scrub | canvas + preloaded frames driven by a `scroll()` value | scrolly-video; GSAP ScrollTrigger |
| 3D scene | — | three.js; drei `ScrollControls`; r3f-scroll-rig |
| Lottie or Rive on scroll | — | dotLottie web (`setFrame` from scroll progress); Rive runtime inputs |
| Page and section transitions | View Transitions API (`document.startViewTransition`, `@view-transition { navigation: auto }`) | Swup with its a11y plugin; Astro view transitions |
| Smooth scrolling | none (native scrolling) | Lenis 1.3.27+ (reduced motion on by default) on persuasive pages only |

Recipes with code for each line: [references/techniques.md](references/techniques.md). Libraries, licences and the agent resources (official skills, MCP servers, docs for LLMs): [references/libraries.md](references/libraries.md).

## 2. Build

- Write the still version first (rule 1), then add the motion inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())` where you use scroll timelines.
- Put `animation-timeline` and `animation-range` **after** the `animation` shorthand: the shorthand resets the timeline.
- Between the animated element and the real scroller, use `overflow: clip`, not `overflow: hidden` (hidden creates a scroll container that captures `view()`).
- For triggers: one IntersectionObserver for all reveals, `unobserve` after the reveal. Never do layout reads or writes in a `scroll` listener; `requestAnimationFrame` does not throttle scroll events. Wheel and touch listeners are `{ passive: true }`.
- Pinned scenes: use `svh` or `lvh` heights, not `100vh` or `dvh` (they jump with the mobile toolbars); keep pinned scroll under about three screens; no long text inside a pinned scene.
- Reveals: about 20–24 px of travel, 200–500 ms, ease-out; motion scrubbed by scroll uses linear timing. Not every section fades in: pick one or two moments.
- Loops, marquees and anything that runs more than 5 seconds after being scrolled into view get a pause control (WCAG 2.2.2).
- WebGL, video and image sequences: stop rendering when off-screen or when the tab is hidden; show a poster frame with reduced motion; mind memory (150 decoded 1080p frames are about 1.2 GB).

## 3. Prove it

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" look <url> --mode <surface>`:
   - `scroll_hijack` must pass on app and reading screens (no smooth-scroll library, no non-passive wheel or touch listener);
   - `content_without_animation` must pass everywhere: with reduced motion requested and the page scrolled through, no text stays invisible;
   - `reduced_motion` must pass: most animations stop or become fades.
2. On persuasive pages that keep a smooth-scroll library, test by hand: Page Down, Space, Home, End, an anchor link (focus moves with it), find-in-page.
3. `qp.mjs deslop <url>` for spacing, and look at the screenshots; scroll the page in the browser and watch for jank, blank areas while effects load, and text moving too fast to read.
4. If the page belongs to a key task, play it: `qp.mjs flows <id>`.

## Rules

| ID | Rule | Threshold | Source |
| --- | --- | --- | --- |
| SCRL-01 | Content readable without animation (JS off, reduced motion) | no text left invisible after scrolling | WCAG 1.3 / 2.3.3 intent; practitioner guidance |
| SCRL-02 | Native scrolling | no change of speed or direction; no cancelled wheel or touch events | NN/g "Scrolljacking 101" (2023) |
| SCRL-03 | Reduced motion | every scroll effect has a still version; parallax and zoom removed | WCAG 2.3.3; web.dev |
| SCRL-04 | Compositor-only properties | `transform`, `opacity`, `filter` | web.dev, Chrome docs |
| SCRL-05 | Pause for long motion | anything over 5 s started by scrolling can be paused | WCAG 2.2.2 |
| SCRL-06 | No flashing | at most 3 flashes per second | WCAG 2.3.1 |
| SCRL-07 | Durations | 200–500 ms for reveals, linear when scrubbed | NN/g animation duration |
| SCRL-08 | Mobile heights | `svh`/`lvh` for pinned scenes | web.dev viewport units |
| SCRL-09 | Restraint | one or two scroll moments per page; never every section on the same reveal | NN/g parallax; generic-look research |

Sources: [SOURCES.md](../../SOURCES.md).
