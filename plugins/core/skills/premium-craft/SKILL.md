---
name: premium-craft
description: "Takes an interface from correct to cared-for, so that nothing gives it away as a quick or generated job: typography details (balanced headings, tabular figures, real quotes and spaces), layered shadows and concentric radii, every state of every control, motion with chosen durations, loading that does not flicker, undo, state in the address, a built dark theme, the site icon, share image and 404 page; plus an identity of its own (type, colour, icons, imagery, logo) and copy that says something true. Measures the result in a real browser. Use on any page or screen before calling it finished, when the user asks for premium, polished, high-end, Linear or Stripe level quality, or says it looks cheap, generic, templated or AI-made. FR : finitions, rendu premium, haut de gamme, soigné, détails, typographie, micro-interactions, états, identité, logo, polices, icônes, images, textes, ça fait IA, ça fait générique."
---

# Premium craft

What reads as "premium" is rarely a style. It is the absence of small neglects: a heading that ends on one lonely word, numbers that do not line up, a button that does not answer, an image slightly stretched, a default 404 page, a testimonial nobody said. People do not name these defects; they feel that nobody checked. This skill checks.

It comes after the others: `design-direction` chooses the look, `design-screens` organises the screen, `deslop-ui` fixes spacing and alignment. This one finishes.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs"`, written `sw` below. Criteria: craft (CRF) and identity (BRD).

Match the effort to the request: a small change gets steps 1 and 5 on the screens touched; a new product gets everything.

## Priorities

The user's choices and the product's identity come first. A "should" of the measure is advice: if the design breaks it on purpose (a brutalist site with hard shadows, a title in Title Case by house style), keep the design and write the reason in `DESIGN.md`. A "must" is a defect a visitor meets; fix it.

## 1. Measure

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" craft http://localhost:3000/ http://localhost:3000/app
```

One address per kind of screen: the landing page, a work screen with data, a form, a table. It renders each on a phone and a desktop and returns two lists:

- **must**: no visible keyboard focus, a visible control the click does not reach (something drawn over its centre: a pseudo-element, a 3D layer sorted in front, a transparent overlay; `click_reached` names what covers it), stretched or blurry images, form fields under 16 px on a phone (iOS zooms the page), blocked pinch zoom, the page jumping while it loads, number columns without tabular figures, no site icon, a wrong address answering 200, no share image on a public page. On a local address (localhost, 127.0.0.1, `*.localhost`, `*.test`) the 404 status and the absolute share image depend on the deployment: they come back as `to_check_in_preproduction`, not as failures. The 404 page is read in the browser, after scripts, so a single-page app's own page counts.
- **should**: headings without `text-wrap: balance` or ending on an orphan word, loose large headings, typewriter characters (`'`, `"`, `...`, a hyphen as a dash, and in French missing non-breaking spaces), capitals without tracking, more than 4 weights, mixed capitalisation of buttons, pure black on pure white, more than 5 shadows, one hard black shadow, a rounded box inside a rounded box with the same radius, no `::selection`, buttons that ignore the pointer, instant state changes, `transition: all`, transitions over 500 ms, animated layout properties, images without dimensions, mixed icon strokes or styles, no apple-touch-icon, a default 404 page.

Each failed check lists the elements. Results go to the audit run as `craft.json` when the project has `.quality/project.json`. Also run `sw look` (how generic the page looks) and `sw deslop` (spacing): the three do not overlap. A `look` tier of "low" means few generic signs, not a finished design: `point_of_view: "none"` says no visual decision was found. Rich motion asked for by the user is declared in `.quality/project.json` › `motion` (`"rich"`, or per path: `{ "/": "rich", "/app/*": "calm" }`) so that `LOOK-ANIMATE-ALL` becomes information.

Screens behind a login: add `--as <account>` (an account of `project.json` › `access.accounts`, logged in once per command). A state to set before the page loads (a theme, a stamp already placed): `--before "code or file.js"`. Both work on `craft`, `stress`, `look` and `deslop`. If the browser ends elsewhere (the login page), the result says `NOT THE REQUESTED SCREEN` and exits with code 2: never read it as a pass.

Then the finishing passes, on each key screen:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" stress http://localhost:3000/app
```

It shows the screen in the conditions it was not built in: every data request slow, every data request failing, every label three times longer, 320 px wide, dark scheme, keyboard only, scripts off. Each pass has a screenshot and what could be detected: a blank screen while waiting, an uncaught error, no error message or no way to retry, sideways scrolling, text cut without an ellipsis, a focus trap. Read the screenshots: the tool sees that an error message exists, not whether it helps.

## 2. Finish what cannot be measured

Work through [references/details.md](references/details.md) on the key screens. The parts that matter most:

**States.** Every button, field, link and tab has hover, visible focus, pressed, disabled and loading, and they differ. Hover and focus have more contrast than rest. A loading button keeps its label and its width. Hover styles sit under `@media (hover: hover)`.

**Waiting.** Under 1 second, show nothing. Delay any indicator by 150 to 300 ms, and once shown keep it at least 300 ms, so it never flashes. A page load gets a skeleton that matches the real layout; a single slow block, a spinner; beyond 10 seconds, a progress bar and a way to cancel. No blank screen, ever.

**Doing and undoing.** Update the screen at once when success is likely, and roll back with a message if it fails. Reversible actions (delete, archive, move) offer Undo for at least 5 seconds instead of asking "are you sure?"; irreversible ones ask, and name what will be lost. Toggles apply immediately.

**Motion.** 100 to 300 ms on the interface, ease-out, `transform` and `opacity` only. A pressed button shrinks to about `scale(0.97)`. Nothing enters from `scale(0)`. No animation on keyboard actions or on something done a hundred times a day. One orchestrated moment per page at most; the `scroll-animation` skill covers scroll effects.

**Depth.** Shadows in two layers or more, one light direction, tinted by the background, an elevation scale of a few steps. A 1 px edge at about 6 % black (8 % white in dark) sharpens a surface. Inner radius = outer radius − padding.

**Dark theme.** Built, not inverted: surfaces get lighter as they rise, hairlines in low-opacity white, no black shadow on black, `color-scheme: dark` on the root so native controls follow.

**Keyboard.** Enter submits, Escape closes, lists move with the arrows, focus is trapped in an overlay and returns where it was. A multi-screen app has a search or a command palette.

**State in the address.** Filters, tabs, page number and open panels live in the URL, so sharing, reloading and going back work.

## 3. Identity

When the product has no identity yet, or borrows the default one of its component kit. Method, free resources and licences: [references/identity.md](references/identity.md).

- **Source.** Colour, type and imagery come from the product's subject and audience. Three palettes are now as recognisable as the purple gradient: purple-indigo, cream with terracotta, near-black with acid green. Use them only for a reason written in `DESIGN.md`.
- **Type.** Two families at most, plus a monospace if needed. Not Inter or Geist as the only face. The text face needs real italics and tabular figures. Self-host, subset, preload. Record name, foundry, licence and source for each font; some free fonts cannot be redistributed in a repository.
- **Icons.** One set, one stroke width tuned to the size, and two defaults changed (stroke, corner, grid or a filled active state). Draw the three to six icons of the product's own objects on the same grid. Never a set's glyph as the logo, never an icon tile above every heading, no sparkles for "AI". Check the set's licence: one popular set stopped being open source in 2026.
- **Logo.** Wordmark first: the name set in the display face with two or three deliberate changes. It must survive at 16 px in one colour; the site icon, app icon, share image and avatar derive from the same drawing.
- **Imagery.** In order: the real product (screenshots, live components), diagrams made for the page, own photos, archive or public-domain images given one consistent treatment, nothing. No illustration kit, no generated image containing text, an interface or people. Every image has its source and licence recorded.

## 4. Copy that says something

Rules and word lists in English and French: [references/copy.md](references/copy.md).

- **Facts only.** Every number, quote, customer logo and badge on a page traces to something the user supplied. If there is no real testimonial, there is no testimonial block. This is a blocker (BRD-01): invented proof is the fastest way to lose a reader, and in many countries it is unlawful.
- The headline says what the product does and for whom, in words customers use. If you have none, ask the user for support messages, reviews or interview notes.
- Button = verb + object ("Send invoice", not "Continue"). Error = what happened + how to fix it. Same word for the same thing everywhere.
- Break the pattern of three: three cards, three-word headings, three sentences of equal length. Use two or four when that is what is true, and vary lengths.
- Remove the words in the lists unless they carry a fact. `sw scan` flags them in the source; `sw look` flags an em-dash rate above 8 per 1,000 words (15 in French, where a dash in an aside is normal).

## 5. A second pair of eyes

Measures find defects; they do not see whether the screen is good. Before reporting, ask a `sw:art-director` agent to review the desktop and phone screenshots of each key screen, with the brief and the site type. It returns at most seven concrete changes, most of them removals, and what it could not see. Show them to the user, apply the ones they accept, and measure again.

For a screen that carries the product (public home page, pricing, the main work screen), one version is not enough: use the `design-variants` skill, which builds several, has them compared blind, and lets the user choose. To see how far a screen is from what the user admires, `sw gap <url>` compares it in numbers with the project's references (`sw profile <url> <url> --save`) or with the reference bank of its site type (`sw gap <url> --type <type>`).

## 6. Check again, and report

Run the measure again, at most three passes, then report with numbers and without an invented score:

```
Screens: <addresses>
Finish (sw craft), before → after: must <n> → <n>, should <n> → <n>
Hard conditions (sw stress): must <n>, should <n> · screens run: <n> of <n>
Art director: <changes applied> · declined: <changes and why>
Fixed: <3 to 6 points, with the root cause (token, component)>
Kept on purpose: <check and the reason, written in DESIGN.md>
Not measured, checked by hand: <states, waiting, undo, dark theme, keyboard>
Not checked: <screens or states not shown: empty, error, long data, slow network>
Identity: <fonts and licences recorded | not yet>, <icons>, <imagery sources>
Facts: <every figure and quote traced | blocks removed>
```

Never write "premium" or "polished" as a result. Say what was measured and what was looked at.
