---
name: scroll-animation
description: "Builds scroll animations that work for everyone: reveals on enter, scroll-linked (scrubbed) motion, progress bars, parallax, sticky and pinned scenes, horizontal sections, text reveals, scrollytelling steps, snapping, image sequences and video scrubbing, 3D scenes and interactive 3D objects (three.js, React Three Fiber, model-viewer), Lottie and Rive driven by scroll, page and section transitions, smooth scrolling. Picks native CSS first (scroll-driven animations, view transitions, scroll snap), then a free library only when needed, with reduced motion, performance and no scroll hijacking, and proves it with measures. Use whenever a page needs anything that moves with scrolling. FR : animation au scroll, apparition au défilement, parallaxe, section épinglée, défilement horizontal, scrollytelling, smooth scroll, transitions de page, 3D interactive, objet 3D à faire tourner, three.js."
---

# Scroll animation

Scroll animation helps when it tells a story, shows progress or reveals structure. It hurts on task pages, forms, apps and dense reading, and on phones more than on desktops. Check `.quality/project.json` › `surface`: in `operate` and `read`, keep scroll motion to progress feedback and small reveals; the big effects belong to `persuade` pages.

Four rules come before any technique:

1. **Content never depends on an animation.** Everything is readable with JavaScript off and with reduced motion requested. The hidden starting state (opacity 0, offset) only exists inside the enhancement, never as the default style.
2. **Scrolling stays native.** Do not change scroll speed or direction, do not cancel wheel or touch events. Smooth-scroll libraries only on persuasive pages, and only if keyboard, anchors, find-in-page and reduced motion still work.
3. **Motion is optional.** Every scroll effect sits inside `@media (prefers-reduced-motion: no-preference)` (or the JS equivalent) and has a still version: the end state, or a short fade.
4. **Animate `transform`, `opacity` and `filter` only.** They run off the main thread with CSS scroll timelines; width, height, top, left, colours and shadows cause layout or paint on every frame.

## 1. Trigger or scrub

Decide this before the technique: it changes how the page feels more than any tool.

- **Trigger**: reaching a point of the page starts an animation that then plays by itself, once, with its own duration (200–500 ms for an element, up to about 1.2 s for a step of a story). The visitor scrolls at their own speed and the motion finishes even if they stop. Use it for reveals, steps of a story, counters, a demo that plays when it arrives, and most effects.
- **Scrub**: the animation's progress *is* the scroll position, forwards and backwards; it stops half-way when scrolling stops. Use it only where the position itself is the information: a reading progress bar, a parallax layer, a short pinned scene where the visitor sets the pace (a product turning, a before and after).

Trigger is the default. A scrubbed sequence only advances while the visitor scrolls, so a story told that way asks for a lot of scrolling and freezes when the wheel stops; in a pilot project, the author rejected exactly that. **Scroll budget** for anything scrubbed or pinned: about a third of a screen (`33svh`) of scrolling per step at most, and three screens at most for a whole pinned scene.

## 2. Pick the technique

Native first. Since October 2026 CSS scroll-driven animations work in Chrome, Edge (115+), Safari (26+) and Firefox (159+) — Baseline "newly available" — so most effects need no library. Older browsers simply show the content without the effect, which is fine when rule 1 holds. Scroll-driven animations (`animation-timeline`) are scrub by nature; the native trigger is IntersectionObserver adding a class that starts a CSS transition or animation (`timeline-trigger` does it in CSS, Chromium only).

| Effect | Trigger or scrub | Native (first choice) | Library, when native is not enough |
| --- | --- | --- | --- |
| Reveal once on enter | trigger | IntersectionObserver + a class with a CSS transition; or a short `animation-timeline: view()` with `animation-range: entry` | Motion `inView` / `whileInView` |
| Motion tied to position | scrub, only where position is the information | `animation-timeline: view()` or `scroll()` | GSAP ScrollTrigger (`scrub`), Motion `scroll()` / `useScroll` |
| Reading progress bar | scrub | `animation-timeline: scroll(root)` on `transform: scaleX()` | — |
| Parallax | scrub | `view()` timeline on `translate` of a background layer | Motion `useScroll` + `useTransform`; simpleParallax |
| Sticky / pinned scene | trigger per step by default; scrub for a short scene the visitor paces | `position: sticky` + IntersectionObserver per step (timed transitions); for scrub, a named `view()` timeline within the budget | GSAP ScrollTrigger `pin` (`toggleActions` to trigger, `scrub` to scrub) |
| Horizontal section | scrub, within the budget | sticky container + `translate` on a named `view-timeline`; or a native horizontal scroller | GSAP ScrollTrigger (`containerAnimation`) |
| Text reveal by line or block | trigger | IntersectionObserver + staggered `transition-delay` on spans split in the HTML | GSAP SplitText (adds ARIA), Splitting.js (add ARIA yourself) |
| Scrollytelling steps | trigger | IntersectionObserver per step, a sticky graphic, each change a timed transition | Scrollama |
| Snapping sections or carousels | — | `scroll-snap-type` (prefer `proximity` for tall sections) | Lenis snap, Swiper (carousels) |
| Video or image sequence | trigger (play the video when it arrives); scrub only for a short sequence the visitor paces | `<video>` played by IntersectionObserver; canvas + preloaded frames driven by a `scroll()` value | scrolly-video; GSAP ScrollTrigger |
| 3D object or scene | trigger (a timed move when the section arrives); scrub when the visitor turns the object by scrolling | — | `<model-viewer>` for one model; React Three Fiber + drei in React; three.js elsewhere — see [references/3d.md](references/3d.md) |
| Lottie or Rive on scroll | trigger (`play()` in view) or scrub (`setFrame`) | — | dotLottie web; Rive runtime inputs |
| Page and section transitions | trigger | View Transitions API (`document.startViewTransition`, `@view-transition { navigation: auto }`) | Swup with its a11y plugin; Astro view transitions |
| Smooth scrolling | — | none (native scrolling) | Lenis 1.3.27+ (reduced motion on by default) on persuasive pages only |

Recipes with code for each line: [references/techniques.md](references/techniques.md). Interactive 3D (poster first, render on demand, models, budgets, keyboard): [references/3d.md](references/3d.md). Libraries, licences and the agent resources (official skills, MCP servers, docs for LLMs): [references/libraries.md](references/libraries.md).

## 3. Build

- Write the still version first (rule 1), then add the motion inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())` where you use scroll timelines.
- Put `animation-timeline` and `animation-range` **after** the `animation` shorthand: the shorthand resets the timeline.
- Between the animated element and the real scroller, use `overflow: clip`, not `overflow: hidden` (hidden creates a scroll container that captures `view()`).
- For triggers: one IntersectionObserver for all reveals, `unobserve` after the reveal. Never do layout reads or writes in a `scroll` listener; `requestAnimationFrame` does not throttle scroll events. Wheel and touch listeners are `{ passive: true }`.
- Pinned scenes: use `svh` or `lvh` heights, not `100vh` or `dvh` (they jump with the mobile toolbars); about a third of a screen of scroll per step and three screens at most in all (section 1); no long text inside a pinned scene.
- Reveals: about 20–24 px of travel, 200–500 ms, ease-out; motion scrubbed by scroll uses linear timing. Not every section fades in: pick one or two moments, unless rich motion is a written choice (SCRL-09): the user asked for it, `DESIGN.md` says why and where, and `.quality/project.json` has `"motion": "rich"`. Even then, vary the effects instead of one reveal on every section.
- Loops, marquees and anything that runs more than 5 seconds after being scrolled into view get a pause control (WCAG 2.2.2).
- A very animated page (rich motion, or more than two scroll moments) gets a visible **Animations on/off** control in the header: it starts from the system setting, the visitor can override it either way, the choice is remembered, and it is the pause control for everything it covers. Recipe: [references/techniques.md](references/techniques.md#motion-toggle).
- WebGL, video and image sequences: stop rendering when off-screen or when the tab is hidden; show a poster frame with reduced motion; mind memory (150 decoded 1080p frames are about 1.2 GB).

## 4. Prove it

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" look <url> --mode <surface>` (the measuring browser asks for motion; the author's browser may not):
   - `scroll_hijack` must pass on app and reading screens (no smooth-scroll library, no non-passive wheel or touch listener);
   - `content_without_animation` must pass everywhere: with reduced motion requested and the page scrolled through, no text stays invisible;
   - `reduced_motion` must pass: most animations stop or become fades.
2. On persuasive pages that keep a smooth-scroll library, test by hand: Page Down, Space, Home, End, an anchor link (focus moves with it), find-in-page.
3. `sw.mjs deslop <url>` for spacing, and look at the screenshots; scroll the page in the browser and watch for jank, blank areas while effects load, and text moving too fast to read.
4. If the page belongs to a key task, play it: `sw.mjs flows <id>`.
5. **Before showing the result, check what the author will see.** Ask them to run `matchMedia("(prefers-reduced-motion: reduce)").matches` in their browser's console on the page (or check the system setting: Windows › Accessibility › Visual effects › Animation effects off; macOS › Accessibility › Display › Reduce motion; iOS and Android have the same). If it is `true`, the page is correctly still for them: say so before they look, and tell them how to see the motion (the Animations toggle, or the system setting for a moment). Never announce animations the author cannot see.

## Rules

| ID | Rule | Threshold | Source |
| --- | --- | --- | --- |
| SCRL-01 | Content readable without animation (JS off, reduced motion) | no text left invisible after scrolling | WCAG 1.3 / 2.3.3 intent; practitioner guidance |
| SCRL-02 | Native scrolling | no change of speed or direction; no cancelled wheel or touch events | NN/g "Scrolljacking 101" (2023) |
| SCRL-03 | Reduced motion | every scroll effect has a still version; parallax and zoom removed | WCAG 2.3.3; web.dev |
| SCRL-04 | Compositor-only properties | `transform`, `opacity`, `filter` | web.dev, Chrome docs |
| SCRL-05 | Pause for long motion | anything over 5 s started by scrolling can be paused | WCAG 2.2.2 |
| SCRL-06 | No flashing | at most 3 flashes per second | WCAG 2.3.1 |
| SCRL-07 | Durations | 200–500 ms for reveals (up to about 1.2 s for a story step), linear when scrubbed | NN/g animation duration |
| SCRL-08 | Mobile heights | `svh`/`lvh` for pinned scenes | web.dev viewport units |
| SCRL-09 | Restraint | one or two scroll moments per page, unless rich motion is a written choice (`DESIGN.md` says why and where, `.quality/project.json` › `"motion": "rich"`, toggle of SCRL-12 present); never every section on the same reveal | NN/g parallax; generic-look research |
| SCRL-10 | 3D | poster image first, 0 frames drawn when nothing moves, page scroll kept over the canvas, rotation by keyboard; rules 3D-01 to 3D-09 | [references/3d.md](references/3d.md) |
| SCRL-11 | Trigger by default | scrub only where position is the information (progress, parallax, a short pinned scene); at most about a third of a screen of scroll per scrubbed step, three screens per pinned scene | NN/g "Scrolljacking 101" (2023); pilot project feedback (2026-11) |
| SCRL-12 | Motion toggle and the author's setting | very animated pages have a visible Animations on/off control that starts from the system setting; the author's `prefers-reduced-motion` is checked before showing the result | WCAG 2.2.2, 2.3.3 |

Sources: [SOURCES.md](../../SOURCES.md).
