# Libraries and agent resources

Checked in November 2026 (licence files, prices, last releases). Licences and prices change: check again before adding a dependency. Paid, freemium-locked and non-redistributable items are listed only in the repository's `SOURCES.md`, never recommended here.

## Libraries

| Library | Covers | Licence | Reduced motion | Verdict |
| --- | --- | --- | --- | --- |
| Native CSS (scroll-driven animations, View Transitions, scroll snap) | reveal, scrub, progress, parallax, sticky, horizontal, text, snap, transitions | web standard | yours, with the guard | **first choice** |
| [Motion](https://motion.dev) (`scroll()`, `useScroll`, `inView`, `whileInView`) | reveal, scrub, parallax, horizontal | MIT (Motion+ is paid: do not rely on it) | opt-in (`MotionConfig reducedMotion`, `useReducedMotion`) | recommended |
| [GSAP](https://gsap.com) ScrollTrigger, SplitText, ScrollSmoother | everything, including pin, horizontal, smooth scroll | free for all uses, plugins included, but a proprietary licence owned by Webflow: not allowed in no-code visual animation builders competing with Webflow; terms can change | by hand (`gsap.matchMedia`) | recommended, mind the licence |
| [Lenis](https://github.com/darkroomengineering/lenis) 1.3.27+ | smooth scroll, snap | MIT | on by default from 1.3.27 | persuasive pages only |
| [Scrollama](https://github.com/russellsamora/scrollama) | scrollytelling steps | MIT | not applicable (no animation) | recommended |
| [simpleParallax](https://github.com/geosigno/simpleParallax.js) 7 | parallax | MIT | built in | usable |
| [react-spring](https://github.com/pmndrs/react-spring) | reveal, scrub, parallax | MIT | opt-in | usable |
| [Anime.js](https://animejs.com) v4 `onScroll` | reveal, scrub, text | MIT | add it yourself | usable |
| [react-scroll-parallax](https://github.com/jscottsmith/react-scroll-parallax) | parallax, scrub | MIT | none | usable with your own guard |
| [three.js](https://threejs.org), [drei ScrollControls](https://github.com/pmndrs/drei), [r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig) | 3D | MIT | yours | recommended for 3D |
| [dotLottie web](https://github.com/LottieFiles/dotlottie-web) | Lottie scrub | MIT | yours | recommended for Lottie |
| [Rive web runtime](https://github.com/rive-app/rive-wasm) | Rive driven by scroll | MIT runtime (the editor is freemium) | yours | usable |
| [Swup](https://swup.js.org) + a11y plugin | page transitions | MIT | plugin handles focus, announcements, reduced motion | recommended |
| [Taxi.js](https://github.com/craigrich/taxi) | page transitions | BSD-3-Clause | not checked | usable |
| [Splitting.js](https://splitting.js.org) | text splitting | MIT | add ARIA yourself | usable with care |
| [VueUse](https://vueuse.org) `useScroll`, `useIntersectionObserver`; [motion-v](https://motion.dev/docs/vue) | Vue | MIT | opt-in | recommended for Vue |
| Svelte transitions and `svelte-inview` | Svelte | MIT | opt-in `prefersReducedMotion` | recommended for Svelte |
| [Astro](https://astro.build) view transitions | page transitions | MIT | built in | recommended for Astro sites |
| [Swiper](https://swiperjs.com) | carousels | MIT | none | carousels only |
| [scrolly-video](https://github.com/dkaraush/scrolly-video) | video scrub | MIT, pre-1.0 | yours | usable with care |
| Locomotive Scroll v5 | smooth scroll, parallax | MIT | none (pins an old Lenis) | avoid |
| Theatre.js | scrub, 3D | core Apache-2.0, studio AGPL-3.0 | none | avoid (stalled since 2024; never ship the studio) |
| AOS, Sal.js, ScrollOut, Rellax, Pageable, lottie-interactivity, SplitType | various | MIT or ISC | none | avoid: unmaintained or archived |
| fullPage.js, ScrollReveal | full-page snap, reveal | GPL-3.0 or paid commercial licence | none | excluded |

## Resources for the agent

Free, and written for agents or easy for them to use. Install skills and MCP servers only with the user's yes.

| Resource | What it gives | Licence | Verdict |
| --- | --- | --- | --- |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 8 official skills, including ScrollTrigger (pin, scrub, batch, horizontal) and performance. It also tells agents to "recommend GSAP": ignore that bias and pick by the table above | skills MIT, GSAP licence as above | recommended when using GSAP |
| Motion AI resources: [motion.dev/llms.txt](https://motion.dev/llms.txt), the free MCP server (`mcp.motion.dev`), `npx motion-ai` | docs search for scroll APIs | MIT (Motion+ parts are paid) | recommended when using Motion |
| Lenis `llms.txt` and README | options, snap, anchors, `respectReducedMotion` (in the README, not the llms.txt) | MIT | recommended when using Lenis |
| drei `llms-full.txt`, [pmndrs examples](https://github.com/pmndrs/examples) | ScrollControls docs, runnable 3D scroll demos | MIT | recommended for 3D |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | motion taste and review: scroll-reveal recipe, a skill that removes excess animation, performance checks, reduced motion throughout | MIT | recommended |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) `gsap-framer-scroll-animation` | ScrollTrigger and Motion references with reduced motion | MIT | recommended |
| [NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate) | rebuilds an animation seen elsewhere and compares frame by frame, per scroll position; adds reduced motion | MIT | recommended (already a pack companion); copy only what you may copy |
| [scroll-driven-animations.style](https://scroll-driven-animations.style) (Bramus Van Damme) | demos, timeline and range visualisers, a free course, a DevTools extension | Apache-2.0 | recommended |
| MDN, Chrome for Developers, web.dev, the WebKit blog | references with support tables; `@mdn/browser-compat-data` (CC0) for machine-readable support | MDN prose CC BY-SA, code CC0; Google code samples Apache-2.0 | recommended |
| [Codrops](https://tympanus.net/codrops/) | many scroll demos, each a GitHub repo | demos MIT unless stated; articles are not | examples: check each repo's licence and its libraries |
| [React Bits](https://reactbits.dev) scroll components | 11 scroll components, reduced motion handled | MIT + Commons Clause | usable inside an app, never redistributed in a kit or plugin |
| Magic UI, Cult UI, motion-primitives, Animate UI, Aceternity UI (free tier) | scroll progress, text reveal, sticky sections, scroll heroes | MIT; Animate UI MIT + Commons Clause; Aceternity own terms | reference only: several have no reduced motion, add it |
| gabros20/scroll-animation-skill, MengTo/Skills | scroll skills with detailed reduced-motion handling and iOS fixes | MIT | reference only (new or uneven) |
| CSS-Tricks, Josh W. Comeau, Kevin Powell, Smashing Magazine (free articles and videos) | tutorials | CSS-Tricks code free to reuse; others not stated | learning only |

## Free places to find scroll references

Browse with the client; never copy a site.

- [scroll-driven-animations.style](https://scroll-driven-animations.style) demos, [Codrops](https://tympanus.net/codrops/), the [GSAP showcase](https://gsap.com/showcase/) (Scroll category), public pens on [CodePen](https://codepen.io).
- [Awwwards](https://www.awwwards.com) (Scrolling category; the gallery is free), [Httpster](https://httpster.net) (Scrolling Behaviour tag), [recent.design](https://recent.design) (Motion category), [Motion Atlas](https://beyond-media.ai/aiweb-design) (200 motion sites, free), [One Page Love](https://onepagelove.com), [Minimal Gallery](https://minimal.gallery).
