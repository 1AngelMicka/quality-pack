---
name: deslop-ui
description: "Makes a web or Tauri interface clean and not generic, and proves it by measuring the rendered page in a real browser: spacing, alignment, boxes, controls, screen edges and signs of generated UI, per element, at phone, tablet and desktop widths, with screenshots. Use whenever a page, screen, component, dashboard or landing page is created, changed or reviewed, even for a small style change, and whenever spacing, margins, padding, alignment, rendering, polish, \"slop\", \"vibe coded\", generic, ugly, wobbly or unpolished UI come up, even without an audit being asked. Use it before saying interface work is done. FR : espacement, marges, alignement, rendu, interface bancale, pas propre, IA slop, polish, audit visuel."
---

# Deslop UI

A generated interface often looks right in the code and wobbly on screen: uneven spacing, headings floating away from their content, icons 3 px off, identical cards everywhere. These defects do not show when reading the CSS. This skill measures them on the real rendering and keeps judgement for the screenshots.

It works with the other design skills: `design-direction` finds the visual direction, `design-screens` organises the screen; this one guarantees the execution, whatever the style.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below.

Match the effort to the request:

- **Small style change:** steps 3 to 5, report in one sentence.
- **Redesign or review of an existing screen:** steps 1 and 3 to 6.
- **New screen:** every step.

## Priorities

The user's requests and the project's existing identity come before this skill. A pattern listed as a sign of generated UI is fine if it is intended: point it out once, without imposing or removing it without agreement. A request like "it looks like AI slop" is agreement to remove those patterns. A request about spacing only does not allow repainting the product.

## 1. Understand before touching

Read the existing tokens (`tailwind.config`, CSS variables, base components) and the target in context. Decide the kind of screen, because the right density depends on it (it matches `surface` in `.quality/project.json`):

- **Tool** (`operate`: dashboard, business app, Tauri): dense, predictable, tight gaps.
- **Showcase** (`persuade`: landing, public site): airy, freer composition.

## 2. Start from a reference for any new screen

The most common cause of a generic result is describing a style with adjectives ("clean", "modern", "premium") instead of showing a model. For a new screen:

1. Ask the user for a reference, or offer one from free galleries of real sites that need no account: [navbar.gallery](https://navbar.gallery), [footer.design](https://footer.design), [supahero.io](https://supahero.io) for web sections; [recent.design](https://recent.design), [good-web-design.com](https://good-web-design.com) or [designforb2b.com](https://designforb2b.com) for whole pages. For app screens, nearly all galleries are paid: start from public screenshots of comparable apps (App Store or Play Store pages) and the project's references. Never suggest a paid or freemium source.
2. Draw an idea from the app's subject, not a surface style. If an identity is still to be made, compare three directions before choosing one (`design-direction` skill).
3. Set the spacing scale and roles before coding: see [references/spacing.md](references/spacing.md).

If no reference is available, say so and continue with the project's tokens rather than inventing a model. If there are no tokens either, start from `spacing.md` and an idea from the business, and flag that choice for approval. The three directions apply only when the user can choose.

## 3. Measure the rendering

Run the audit on the real page:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" deslop http://localhost:5173/ --widths 375,768,1440
```

It takes a URL or a local HTML file and uses the installed Chrome or Edge, with nothing to install (set `CHROME_PATH` if neither is found). It returns the findings per width, the spacing and type system actually used, and screenshots at each width. In a project with `.quality/project.json`, results go to the current audit run (`deslop.json`, screenshots in `deslop/`); otherwise to `.quality/deslop/`. Each run overwrites the previous one in the same folder: copy the JSON aside before a fix if you want a before/after.

For how generic the page looks, the type scale, line length, accent share and reduced motion, also run `qp look <url>`. The audit does not measure contrast, keyboard focus, hover states or baselines: check those separately (axe in `qp browser` and `qp flows`).

Useful options:

| Situation | Option |
| --- | --- |
| Open a menu or a tab before measuring | `--click "selector"` (repeatable) |
| Test the dark theme | `--dark` |
| Tauri app shown without a backend | `--tauri`, see below |
| Inject a state (localStorage, mock) | `--before "code or file.js"` (repeatable) |
| Measure a window already open, with its real data | `--attach <port>` |

If the rendering is only reachable in a page the script cannot open, evaluate `${CLAUDE_PLUGIN_ROOT}/scripts/deslop/measure.js` in the browser's JavaScript tool: it returns the same report for the state on screen.

### Tauri apps

In an ordinary browser the Tauri API does not exist and the app often stops on an error screen. Two ways out:

- **Real data:** start the app with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` (Windows), go to the screen, then use `--attach 9222`. Prefer this for a filled screen. The app then acts on its real data: do it only with the user's agreement if it is connected to production data.
- **Without a backend:** `--tauri` provides fake answers and no command reaches Rust. If the app crashes on missing data, write answers in a temporary file loaded before the stub:

```js
window.__DESLOP_TAURI__ = { get_current_user: { id: 1, name: 'Test' } };
```

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" deslop http://localhost:1420/ --before mocks.js --tauri --widths 1280
```

## 4. Look at the screenshots

Always open the screenshots, even when the audit is empty. An empty report on an error or loading screen is worthless: first check that the right screen is shown (the command warns when a page is almost empty). Then judge what the script does not measure:

- Squinting, do you see the main element, then the secondary one, then the groups, in that order?
- Does space really separate the groups, or do boxes make up for bad spacing?
- Could this screen belong to any other app?

The visual signs to look for are in [references/tells.md](references/tells.md).

## 5. Fix at the root

Fix `high` findings first, then `med`. Re-read each finding on the screenshot: it is a hint, not a verdict. A rule can be wrong, especially on a decorative mock-up or a third-party component.

- Fix the token or the source component rather than each occurrence, without `!important` or an arbitrary value added to silence a rule.
- If the project has a consistent scale that is not a multiple of 4 (say 22 and 26 px repeated through tokens), `off-scale` does not apply: do not rename everything.
- For a deliberate exception, put `data-deslop-ignore` on the element and give the user the reason.
- Run the audit again, three passes at most. If findings remain, report them rather than going round in circles.

## 6. Report

Give before/after numbers and what remains open, without an invented overall score:

```
Screen: <page>
Before → after, per width: <width> X high, Y med → X high, Y med
Fixed: <3 to 5 points, with the root cause>
Left as is: <rule and reason>
Not checked: <states not shown: empty, error, loading, long data>
```

Never write "it is clean" without having seen the screenshots and run the audit again. The script measures a page in one state: states not shown are not covered.
