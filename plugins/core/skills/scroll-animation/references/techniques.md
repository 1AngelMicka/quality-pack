# Scroll recipes

Each recipe starts from content that is visible and still, then adds motion only where it is welcome and supported. Browser support (November 2026): CSS scroll-driven animations in Chrome and Edge 115+, Safari 26+, Firefox 159+; View Transitions within a page everywhere, across pages in Chrome, Edge and Safari (Firefox partial); `scroll-state()` queries, scroll-triggered animations (`timeline-trigger`) and CSS carousels in Chromium only — use them as extras, never for content.

Trigger or scrub: most recipes below trigger (an animation with its own duration starts once, when the element arrives); the scrubbed ones (progress, parallax, pinned scene, horizontal, image sequence) are for effects where the position is the information, within a third of a screen of scroll per step (skill, section 1).

Contents: [Guard](#the-guard) · [Motion toggle](#motion-toggle) · [Reveal](#reveal-once-on-enter) · [Scrub](#scrubbed-motion) · [Progress bar](#reading-progress-bar) · [Parallax](#parallax) · [Sticky scene](#sticky-and-pinned-scene) · [Horizontal](#horizontal-section) · [Text](#text-reveal) · [Steps](#scrollytelling-steps) · [Snap](#snapping) · [Image sequence and video](#image-sequence-and-video-scrub) · [3D](#3d-scene) · [Lottie and Rive](#lottie-and-rive) · [Transitions](#page-and-section-transitions) · [Smooth scroll](#smooth-scrolling)

## The guard

Every recipe sits inside this guard. Outside it, elements keep their final, readable state.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    /* scroll-driven rules here */
  }
}
```

In JavaScript, read the same preference and follow its changes:

```js
const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
if (motionOK.matches) startScrollEffects();
motionOK.addEventListener("change", (e) => (e.matches ? startScrollEffects() : stopScrollEffects()));
```

Do not use a blanket `animation: none !important` for reduced motion: it breaks `animationend` logic. Remove movement (translate, scale, parallax) and keep a short fade if the change needs to be noticed.

## Motion toggle

For a very animated page: a visible button in the header that starts from the system setting, lets the visitor override it both ways, and remembers the choice. It also pauses everything it covers (WCAG 2.2.2). The guard then reads a class on `<html>` instead of the media query alone.

```html
<button type="button" id="motion-toggle" aria-pressed="true">Animations</button>
```

```js
const sys = matchMedia("(prefers-reduced-motion: reduce)");
const saved = (() => { try { return localStorage.getItem("motion"); } catch { return null; } })();
let on = saved ? saved === "on" : !sys.matches;
const btn = document.getElementById("motion-toggle");
function apply() {
  document.documentElement.classList.toggle("motion", on);
  btn.setAttribute("aria-pressed", String(on));
  on ? startScrollEffects() : stopScrollEffects();          // stop also pauses loops, videos and 3D
}
btn.addEventListener("click", () => { on = !on; try { localStorage.setItem("motion", on ? "on" : "off"); } catch {} apply(); });
apply();
```

```css
html.motion .reveal:not(.in) { opacity: 0; translate: 0 24px; }   /* every effect is scoped under html.motion */
```

The page is still readable before the script runs (no `motion` class yet). Until the visitor presses the button, a reduced-motion system setting keeps the page still, as rule 3 requires.

## Reveal once on enter

CSS, linked to the element's entry into view:

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      animation: reveal linear both;
      animation-timeline: view();          /* after the shorthand, which resets it */
      animation-range: entry 0% entry 60%;
    }
  }
}
@keyframes reveal { from { opacity: 0; translate: 0 24px; } }
```

Trigger-style (plays once with its own duration), with IntersectionObserver: the hidden state only exists once JavaScript has run and motion is welcome.

```js
if (matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  document.documentElement.classList.add("js-reveal");          /* CSS: .js-reveal .reveal:not(.in) { opacity: 0; translate: 0 24px; } */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}
```

```css
.js-reveal .reveal { transition: opacity .4s ease-out, translate .4s ease-out; }
```

## Scrubbed motion

Motion follows the scroll position, forwards and backwards, and stops when scrolling stops. Use it only where the position is the information, with linear timing.

```css
.card-image { animation: zoom-out linear both; animation-timeline: view(); animation-range: cover 0% cover 100%; }
@keyframes zoom-out { from { scale: 1.15; } to { scale: 1; } }
```

Ranges: `entry` (entering), `exit` (leaving), `contain` (fully inside), `cover` (from first pixel in to last pixel out), and `entry-crossing`, `exit-crossing`. Ranges are measured on the untransformed box.

Animating an element from another element's position: name the timeline on the subject and share it with `timeline-scope` on a common ancestor.

```css
.chapter { view-timeline: --chapter block; }
.page { timeline-scope: --chapter; }
.chapter-dot { animation: grow linear both; animation-timeline: --chapter; }
```

## Reading progress bar

```css
.progress { position: fixed; inset: 0 0 auto; height: 4px; transform-origin: 0 50%; background: var(--accent); }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: scroll()) {
    .progress { animation: progress linear both; animation-timeline: scroll(root block); }
  }
}
@keyframes progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

Progress is feedback, not decoration: it may also run with reduced motion (it does not move content), but then drop the `prefers-reduced-motion` wrapper consciously.

## Parallax

Background layers only, small distances, never text. Removed entirely with reduced motion (parallax is the canonical vestibular trigger).

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .hero-bg { animation: drift linear both; animation-timeline: view(); animation-range: cover; }
  }
}
@keyframes drift { from { translate: 0 -8%; } to { translate: 0 8%; } }
```

Wrappers between `.hero-bg` and the page scroller use `overflow: clip`, not `hidden`.

## Sticky and pinned scene

By default, trigger each step: the stage stays sticky, IntersectionObserver on invisible step markers sets the step, and each change plays a timed transition (as in [Steps](#scrollytelling-steps)). Scrub with a named timeline only for a short scene the visitor paces. Either way, the container is about a third of a screen per step plus one screen: four steps make `calc(100svh + 4 * 33svh)`, three screens at most.

```css
.scene { height: calc(100svh + 4 * 33svh); view-timeline: --scene block; }   /* 4 steps, a third of a screen each */
.scene-stage { position: sticky; top: 0; height: 100svh; overflow: clip; }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .scene-stage img { animation: step-through linear both; animation-timeline: --scene; animation-range: contain 0% contain 100%; }
  }
}
```

With reduced motion, the container should not keep its tall height with nothing happening: drop the height and show the stages one after another.

## Horizontal section

```css
.h-scroll { height: 400svh; view-timeline: --h block; }
.h-scroll-stage { position: sticky; top: 0; height: 100svh; overflow: clip; }
.h-scroll-track { display: flex; width: max-content; }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .h-scroll-track { animation: slide linear both; animation-timeline: --h; animation-range: contain 0% contain 100%; }
  }
}
@keyframes slide { to { translate: calc(-100% + 100vw) 0; } }
```

With reduced motion: a normal vertical stack, or a native horizontal scroller (`overflow-x: auto; scroll-snap-type: x proximity`) that users drive themselves.

## Text reveal

Split the text in the HTML (or once at build time), keep the full sentence readable by assistive technology, and hide the pieces from it:

```html
<h2 class="split" aria-label="Made by hand, in Nantes">
  <span aria-hidden="true"><span style="--i:0">Made</span> <span style="--i:1">by</span> <span style="--i:2">hand,</span> …</span>
</h2>
```

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .split span span { animation: word linear both; animation-timeline: view(); animation-range: entry calc(var(--i) * 4%) entry calc(40% + var(--i) * 4%); }
  }
}
@keyframes word { from { opacity: .15; } }
```

GSAP SplitText adds the ARIA by itself; Splitting.js does not.

## Scrollytelling steps

Steps of text scroll past a sticky graphic; each step triggers a change of the graphic, which plays with its own duration (up to about 1.2 s) and finishes even if the visitor stops scrolling. Step changes are discrete, so IntersectionObserver (or Scrollama) fits better than a scroll timeline. Keep each step's text block short: about a third of a screen of scroll between two steps.

```js
const graphic = document.querySelector(".story-graphic");
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) graphic.dataset.step = e.target.dataset.step;
}, { rootMargin: "-45% 0px -45% 0px" });
document.querySelectorAll(".story-step").forEach((s) => io.observe(s));
```

Each step's text carries the information; the graphic illustrates it. With reduced motion, swap graphic states without transition.

## Snapping

```css
.sections { scroll-snap-type: y proximity; }        /* mandatory traps users in tall sections */
.sections > section { scroll-snap-align: start; }
.carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; }
.carousel > * { scroll-snap-align: center; }
```

`scrollend` (all browsers) tells when scrolling stopped. `scrollsnapchange` and `scroll-state(snapped)` are Chromium-only extras.

## Image sequence and video scrub

Seeking a `<video>` is asynchronous and tied to keyframes (it lags); smooth scrubbing draws preloaded frames on a canvas from a scroll progress value.

```js
const frames = await Promise.all(urls.map((u) => fetch(u).then((r) => r.blob()).then(createImageBitmap)));
const ctx = canvas.getContext("2d");
const draw = () => {
  const box = scene.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -box.top / (box.height - innerHeight)));
  ctx.drawImage(frames[Math.round(p * (frames.length - 1))], 0, 0, canvas.width, canvas.height);
};
addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true });
```

Keep the sequence short and small (150 decoded 1080p frames are about 1.2 GB of memory); serve smaller frames on phones; with reduced motion show one poster frame and a play button. scrolly-video (MIT) packages the video variant.

## 3D scene

Full reference, with code: [3d.md](3d.md) — which tool to pick (`<model-viewer>`, React Three Fiber, three.js), the poster image that comes first, rendering on demand, models and compression, tying the scene to the scroll, budgets for phones, keyboard access.

In short: a poster image in the HTML and the 3D code loaded only near the viewport; a frame drawn only when something changes, none off-screen or in a hidden tab; pixel ratio capped at 2; the wheel and vertical touch drag still scroll the page; a still pose with reduced motion. drei's `ScrollControls` replaces the page scroll with its own scroller (anchors and find-in-page stop working): prefer a scroll progress value read from the page.

## Lottie and Rive

dotLottie web (MIT): compute the scroll progress of the section (as in the image sequence), then `player.setFrame(progress * totalFrames)`. `lottie-interactivity` is archived: do not start with it. Rive web runtime (MIT): drive a number input from scroll progress; free exports from the Rive editor carry a splash screen. With reduced motion, show the first or last frame.

## Page and section transitions

```js
function update(next) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return next();
  document.startViewTransition(next);
}
```

```css
@view-transition { navigation: auto; }               /* between pages: Chrome, Edge, Safari; Firefox partial */
.card-title { view-transition-name: match-element; }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-duration: 0s; } }
```

Swup with `@swup/a11y-plugin` moves focus and announces the new page; Barba.js does not.

## Smooth scrolling

Native scrolling by default. If a persuasive page wants smoothing, use Lenis 1.3.27 or later (it respects reduced motion by default from that version), never on forms or apps, with `anchors: true`, `data-lenis-prevent` on nested scrollers, and test Page Down, Space, Home, End, anchors with focus, and find-in-page. Lenis does not support CSS scroll snap. Locomotive Scroll v5 pins an older Lenis without reduced-motion support: avoid it.

`scroll-behavior: smooth` on `html` slows find-in-page; scope it:

```css
@media (prefers-reduced-motion: no-preference) { html:focus-within { scroll-behavior: smooth; } }
```
