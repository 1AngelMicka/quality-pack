# Changelog

## 0.8.1 — 2026-11-13

Four measures of `sw craft` corrected after checking them on reference sites that failed them:

- `focus_visible` waited for nothing: a focus ring that eases in (Sentry's, over 0.2 s) was read while still 0 px wide. The probe now waits for the control's transitions to end, and sees a ring drawn on one of the three boxes around the control or on its `::before` / `::after`.
- `image_sharpness` fails under 80 % of the shown width instead of 95 %, and ignores loading placeholders of a few pixels.
- `dark_color_scheme` is a `should`, no longer a `must`: 70 % of the dark reference sites do not declare it, and the effect is limited to native controls and scrollbars.
- `layout_animation` matched property names by fragment: `outline-width` or `border-top-color` counted as layout. Names are now matched whole.

The calibration file was measured before these corrections: its figures for these four rules are overstated until the bank is calibrated again (`sw bank calibrate all`).

## 0.8.0 — 2026-11-12

**The project is renamed Shipwright** ("the one who builds all the way to the launch"). It no longer only audits: it covers the path from an idea to a launched product.

- Marketplace `quality-pack` → `shipwright`; plugin `qp` → `sw`; modules `qp-nextjs`, `qp-node-api`, `qp-vps`, `qp-expo`, `qp-capacitor`, `qp-tauri`, `qp-electron` → `sw-…`.
- Commands `/qp:kickoff`, `/qp:audit`, `/qp:fix`, `/qp:handoff`, `/qp:design-review` → `/sw:…`; agents `qp:auditor` and the others → `sw:…`; the CLI file `qp.mjs` → `sw.mjs`.
- Unchanged: the `.quality/` folder of projects and every file in it, the `QP_…` environment variables, the `qp-allow-secret` comment of the secrets guard, and the GitHub repository address. A browser cache installed under `~/.cache/quality-pack` keeps being used.
- To move an installation: uninstall `qp@quality-pack`, remove the `quality-pack` marketplace, add it again and install `sw@shipwright` (see the README). In a project, replace `/qp:` with `/sw:` in the section the kickoff added to `CLAUDE.md`, or run `/sw:kickoff` once.

## 0.7.0 — 2026-11-12

Beyond correct: what helps a screen land above the average, the launch steps for search, and desktop apps. 37 domains, 247 criteria.

**Reference bank**
- `plugins/core/bank/`: one file per type of site, with what its visitors expect, real sites recognised as excellent (award or curated gallery, with the reason in checkable terms), their shared traits and what to avoid. 26 types, 190 sites: SaaS marketing site, application and dashboard, landing page, pricing page, developer tool, restaurant and café, hotel and travel, local service, real estate, online shop, luxury brand, mobile app page, fintech, portfolio, agency and studio, personal site, editorial, documentation, AI product, education, health, non-profit, event, culture, public service, sign-up and login. Every address was loaded on 2026-11-12. No screenshot of a third-party site is stored: addresses, descriptions and measured numbers only.
- `qp bank [type]` lists them; `qp bank measure` profiles the sites; `qp bank calibrate` runs `qp craft` and `qp look` on them.
- Calibration: `qp craft` now shows, for each check, the share of the bank's sites that fail it. A "should" failed by 40 % or more of them becomes "advice" and is no longer counted.

**Comparing instead of producing**
- `qp variants <name> <url>…`: screenshots of several versions of one screen under shuffled letters, their measures, and the pairs to judge; `--tally` ranks them from the jurors' votes. Skill `design-variants`; agent `juror` (blind comparison of two screenshots).
- Agent `art-director`: reads the screenshots and returns at most seven concrete changes, most of them removals, never a score.
- `qp profile <url> --save` measures the references the user likes (type scale, typefaces, first-screen composition, colour, surfaces, density); `qp gap <url>` lists where a screen falls outside their range, or outside the bank's for a site type (`--type`).

**Finishing passes**
- `qp stress <url>`: the screen with every data request slow, every data request failing, texts three times longer, at 320 px, in the dark scheme, with the keyboard only and with scripts off; a screenshot of each.
- Criteria CRF-10 (blocker) and CRF-11; BRD-07 (the screens that carry the product were chosen among several versions). Stage 7 of `from-zero` now asks for `qp craft` and `qp stress` on every key screen.

**Search**
- `qp seo [url]`: the sitemap (found, declared in robots.txt, every address answers 200 and is indexable), title and meta description of each page (filled, length, unique), one h1, the keywords of `project.json › seo.keywords` carried by their page, Search Console confirmed in `seo.search_console`.
- Criteria SEO-08 (blocker), SEO-09 and SEO-10. Skill `seo-launch`: choosing the searches, writing each page around its phrase, sitemap and robots.txt, the Search Console steps (done by the user).

**Desktop apps (Tauri, Electron)**
- New group: desktop experience (DUX) and desktop release and security (DRL). Flag `desktop_app`, profile `desktop`, stack modules `qp-tauri` and `qp-electron`, skill `desktop-app`.
- `qp desktop check`: content security policy, Tauri capabilities and scopes, remote access, Electron window options (nodeIntegration, contextIsolation, sandbox, webSecurity), preload, updater signature and https, app identifier, signing.
- `qp flows --attach <port>`: plays the key tasks in the window of an app already running with its debugging port open (WebView2, Electron).

**Played or measured instead of read**
- `qp perf <url>`: one load on a throttled phone (CPU slowed 4 times, slow 4G): largest paint, layout shift, blocking time, weight of the page, of scripts and of the largest image, requests. Criterion PRF-07.
- `qp webhooks`: an unsigned or wrongly signed event sent to each endpoint of `project.json › webhooks` must be refused; local or staging only. INT-01 now uses it.
- `qp facts <url>`: figures, ratings, quotes, customer names and compliance badges found on the rendered page, each to be traced to `.quality/facts.json` (template added). BRD-01 now uses it.
- The visual profile (`qp profile`, `qp gap`, the bank) now measures layout basics: gaps and their scale, share of gaps on a 4 px grid, paddings, content width and gutter, sizes of buttons, fields, icons, cards and headings, image proportions, section heights, and regularity (siblings with identical gaps, identical sizes, shared left edges).

**Proven end to end**
- `examples/facto`: a reference invoicing app in one file, in a draft state with planted defects and a careful state. `tests/example.test.mjs` runs flows, access, auth, webhooks, seo, craft, stress, facts and threats on both: every planted defect is found in the draft, and the careful version passes (only the Search Console step, which a person does, is left).
- `qp billing`: the subscription life cycle played in Stripe's test mode with a test clock (trial, first payment, declined renewal, cancellation); the app is asked what it believes at each stage. Test keys only. SUB-03 now uses it. Tested against a stand-in for Stripe's API.
- `qp mobile audit`: the screen shown on a running Android device or emulator, read with adb: touch targets under 24 and 48 dp, controls without a name, crowded targets, and screenshots at 200 % text size and in dark theme. Run on a real emulator.
- First run of the `juror` and `art-director` agents, on the two states of the example's home page.

**Not verified in this release:** `qp billing` against Stripe itself (no test key on the machine); `qp mobile flows` (Maestro is not installed); `qp desktop check` and `flows --attach` were tested on fixtures and a stand-in browser, not on a real Tauri or Electron app; the `art-director` and `juror` agents and the `design-variants` skill have not run on a real project; the bank's `expects` rules are mostly marked unverified house rules; in the first thirteen types, recognition sources are often a listing page rather than the site's own award page; site descriptions were written from the pages' text, not from their rendering; a few types rest on a curated list rather than an award (personal site, documentation, sign-up and login).

## 0.6.0 — 2026-11-12

From zero to a launched SaaS: what the pack did not cover (isolation between customers, subscriptions, security tried for real, installed mobile apps, finish and identity). 37 domains, 226 criteria.

**Security, played instead of read**
- `qp access`: each resource declared in `project.json › access` is requested by its owner, then by the accounts that must not reach it and by a visitor. Sessions from headers, cookies, or login steps played in a browser. A leak (the owner's answer, or an accepted write) gives exit code 2. Refuses production unless `--allow-production`. SEC-03 now uses it.
- `qp auth`: the login answers the same for a known and an unknown account, and repeated wrong passwords are slowed or refused. Local or staging only, no override.
- `qp dast`: passive OWASP ZAP baseline scan in Docker, summarised by risk.
- `qp supply`: lockfile, release cooldown (npm, pnpm, Yarn, Bun), install scripts, GitHub Actions pinned by commit, workflow permissions, env files.
- `qp threats`: validates `.quality/threats.json` (template added): every entry point has an abuse case, every case a response and a test.
- New criteria SEC-12 to SEC-17. Skill `security-testing`.

**SaaS**
- New group with three domains: accounts, teams and access (ACC), subscriptions (SUB), activation and customer relationship (ACT). Flags `multi_tenant`, `has_subscriptions`.
- Skills `saas-foundations` (order of work, isolation, accounts, billing, service emails), `from-zero` (stages from idea to launch, with a gate each) and `user-testing` (five-person test, plan and report templates).

**Installed mobile apps**
- New group: native mobile experience (MUX), store release and mobile security (MRL). Flag `native_app`.
- `qp mobile flows`: turns `project.json › mobile.flows` into Maestro flows and plays them on the running emulator, simulator or device. `qp mobile check`: release blockers read from the project (target API level, debuggable, cleartext, privacy manifest, permission texts, WebView, link files, deletion page).
- Stack modules `qp-expo` and `qp-capacitor`. Skill `mobile-app`.

**Finish and identity**
- `qp craft`: finish of the rendered page measured on phone and desktop, as "must" and "should": keyboard focus, hover, typography details (balanced headings, tabular figures, typographic characters, French spacing), shadows, nested radii, transitions, image distortion and sharpness, layout shift, icons, site icon, share image, 404 status and page.
- Two domains: craft (CRF) and identity and true content (BRD). BRD-01 is a blocker: no invented testimonial, figure, customer logo or badge.
- `qp look`: nine second-generation generic signals (side-stripe cards, nested cards, icon tiles above headings, "01 / 02 / 03" labels, pulsing dots, italic accent word in a serif headline, cream with terracotta, near-black with acid green, em-dash rate).
- Skill `premium-craft`.

**Fixes**
- `qp record` kept the folders of a Windows path recorded on another system (`path.basename` ignores `\` on Linux).
- `qp deslop` says clearly that it needs Node 22 (built-in WebSocket); CI runs on Node 22 and installs Playwright so browser tests run instead of being skipped.

**Not verified in this release:** `qp dast` against a live ZAP container (the Docker engine was not running), `qp mobile flows` on a device (Maestro not installed), and the new skills on a real project.

**Also, merged just after 0.5.0**

- **`text-squeezed` rule in `qp deslop`** (high): a paragraph or heading wrapped into a column a few words wide (under about 20 characters per line over 3 lines or more). It never overflows, so no overflow check saw it. Seen on a real landing page: a page gutter in `vw` applied as padding inside a `max-width` box, readable at 1440 px, about 140 px wide at 1850 px. Test page `tests/fixtures/deslop/squeezed.html`.
- **1920 px** added to the widths of `qp deslop` (375, 768, 1440, 1920) and `qp browser` (360 to 1920): some layouts only break on wide screens.
- axe-core is injected with `page.evaluate`, which a strict Content-Security-Policy cannot block (it was silently not running on such sites).

## 0.5.0 — 2026-11-11

Design: the pack now helps design and advise, not only audit. Built from a research round on six topics (screen patterns, UX principles and heuristics, references to tokens, forms and WCAG 2.2, the generic AI look, existing design skills and their licences); sources in `plugins/core/SOURCES.md`.

- **`design-screens` skill**: panes per window width (600 / 840 / 1200 px), three layout shells, navigation and main action rules, and recipes for 11 task types, each for phone and desktop, ending with the flow measures.
- **`design-direction` skill**: references sorted into look and organisation, 4–5 mood words turned into testable principles, style tiles, then W3C DTCG 2025.10 tokens in three tiers (primitive, semantic, component) for light and dark, OKLCH colour scales, type, spacing, radius and motion rules, and a dated list of generic clusters.
- **`design-review` skill** (`/qp:design-review`): measures first, two-pass heuristic review (Nielsen, Bastien and Scapin), severity 0–4 confirmed by three independent passes, two or three reorganisations with their effort gap.
- **`qp.mjs look <url>`**: the rendered page measured in the browser — weighted generic-look signals (never one alone, strict only in `persuade` mode), font sizes and families, radii, line length and height, small targets. Evidence for UI-04 and SLP-04 (`look.json`).
- **`qp.mjs tokens`**: DTCG format, references and cycles, units, tiers, WCAG contrast matrix per theme (never rounded), colours outside sRGB. Exit code 2 on failure.
- **Effort in seconds**: flows report `klm_seconds` (keystroke-level model) to compare designs; a gap under 20–25 % is a tie.
- **`qp.mjs report`** and `.quality/report.html`, written at every audit: both scores over time, screenshots of every step of the key tasks side by side (phone, desktop), the ergonomics findings, the issues.
- **`qp.mjs record <flow-id>`**: record a key task by doing it in Playwright's recorder; it becomes a flow with robust selectors.
- `surface` in `project.json` (persuade, operate, read), asked at `/qp:kickoff`.
- Flow screenshots are stored relative to the project root.
- **`deslop-ui` skill and `qp.mjs deslop`**, brought in from the author's own skill: spacing, alignment, boxes, controls, screen edges and signs of generated UI measured per element on the rendered page at 375, 768 and 1440 px, with the installed Chrome or Edge over CDP (no Playwright needed), Tauri stub and `--attach` for real windows, screenshots per width. Evidence for UI-03 (`deslop.json`). Its reference galleries are now free ones only.
- **`scroll-animation` skill**: every kind of scroll animation, native CSS first (scroll-driven animations are Baseline since October 2026), recipes with code, a checked catalogue of libraries and agent resources (licences, reduced motion, maintenance), and rules SCRL-01 to SCRL-09. `qp look` gains two scroll checks: `scroll_hijack` (smooth-scroll libraries, non-passive wheel or touch listeners on the page) and `content_without_animation` (with reduced motion and the page scrolled through, no text stays invisible).
- From a batch of 57 X bookmarks on design (every link checked for licence and price, `SOURCES.md` at the root lists all of them with their status): `qp look` gains a redesign guard (`--baseline`: controls lost since an earlier look), a reduced-motion check and the share of accent colour on app screens; `design-direction` gains free reference galleries, a rule against cloning another brand's identity, the concept-from-the-product's-world step and elevation values for light and dark themes (after heydamir/unslop, CC BY 4.0); `design-review` gains rule REV-09 (a redesign keeps every control and key task); Framelink Figma MCP becomes a companion tool.

## 0.4.0 — 2026-11-11

From a real audit (Scrapify): the UX scored 8.2/10 while its main screen was an endless page nobody wanted to use. The audit judged each screen's hygiene, on empty screens, and one score mixed the interface with the server.

- **Key tasks played on a phone and a desktop.** `/qp:kickoff` asks for 2 to 5 key tasks and writes them as `flows` in `.quality/project.json` (steps, test data in `.quality/fixtures/`, the preview and the main action). `qp.mjs flows` plays them with Playwright and, at every step, takes a screenshot, runs axe-core and measures the effort: page length in screens, controls on screen, screens scrolled, actions, whether the preview stays visible and the main action is within reach (under the thumb on a phone). Budgets in `scoring.yaml › flow_budgets`, overridable per flow. Features, UX, accessibility and responsive criteria now rely on these states, not on the empty screen.
- **New domain "Ergonomics and information architecture"** (group `ergonomics`, 9 criteria, ERG-01 to ERG-09): effort per task, settings shown at once, preview kept visible, main action reachable, choices never overwritten by a theme or preset, settings in task order with a recommended option, DESIGN.md references followed in how they are organised (not only their palette), heuristic review. 28 domains, 162 criteria. New build skill `build-ergonomics`.
- **Ergonomist agent** (`qp:ergonomist`) for the ergonomics group: measures from `flows.json`, screenshots reviewed on phone and desktop separately, and a heuristic review (Nielsen, Bastien and Scapin) whose findings (`ERG-R01`…) appear in the report, cap ERG-09 (critical: fail, major: partial) and are fixed by `/qp:fix`.
- **Counter-check** (`qp:challenger`): after the auditors, re-reads the passed interface criteria on the flow screenshots ("would a user in a hurry get through?"). It can only lower a result, with evidence; `assemble` refuses anything else.
- **Two scores**: Experience and Engineering and operations, each capped only by its own blockers. The overall score stays for history. Report, `status`, the session reminder and `/qp:fix experience|operations` use them.
- **DESIGN.md** template: new "What we borrow (organisation)" section, per phone and desktop, checked by ERG-08; SLP-02 no longer passes just because DESIGN.md exists.
- `/qp:kickoff` recommends `opus` (or `fable`) for auditors; `sonnet` and `haiku` are no longer offered. Detection recognises an application (state, file input, desktop shell, service worker…) instead of calling it a showcase site.
- **Tooling**: Playwright and axe-core come from the project or from the pack's cache (`qp.mjs browser-setup`), never installed in the project. Each audit gets its own run folder (`2026-11-11`, `2026-11-11-2`…), so a scoped audit no longer overwrites a full one and same-day audits show a trend. `qp.mjs scan` follows `.gitignore` and prints a compact summary (counted in token savings). The CLI finds the project root, so running it from a sub-folder no longer creates a stray `.quality/`. `qp.mjs status --json`.

## 0.3.1 — 2026-11-10

- Documentation website (FR/EN) on GitHub Pages: https://1angelmicka.github.io/quality-pack/, with the referential rendered from the same JSON as the plugin and a filter.
- `llms.txt` and `docs/AGENT_GUIDE.md`, so an AI agent given the repository link can guide a user through install and first use.
- Fix: the referential still mentioned `.quality/project.yaml`; the file is `.quality/project.json` since 0.2.0.

## 0.3.0 — 2026-11-07

Token economy.

- `qp.mjs run`: commands keep their full log on disk and return only the exit code, error lines and last lines. The audit report shows the tokens saved.
- Incremental audits by default: only criteria that changed files (Git) can affect are re-checked; the rest is carried over. Full audit forced on the first audit, after a pack update, or after 30 days. `/qp:audit full` forces it.
- `/qp:audit quick`: automatic checks only, no auditor agents.
- Graphify integration: `qp.mjs graph` (status, project size, advice) and `qp.mjs graph refresh` (code-only, no LLM). Auditors, `/qp:fix` and the working method query the graph before reading files.
- Auditor model setting (`audit_model`: inherit, sonnet, haiku) chosen at `/qp:kickoff`.
- New `/qp:handoff` skill and session reminder, to resume long tasks without re-exploring the project.
- `/qp:kickoff` suggests companion tools by profile and project size: Graphify, RTK (`rtk-oss`), Cloudflare security-audit, Taste Skill, reanimate.
- Working method: rules to find code cheaply and keep reports short.
- READMEs: French by default, new "Token economy" section by project size and time horizon.

## 0.2.0 — 2026-11-07

- `/qp:kickoff`, `/qp:audit`, `/qp:fix` skills and the `qp:auditor` agent (one per group, run in parallel).
- `workflow` skill and 7 generated build skills, one per group of domains; a rules skill per stack module.
- Node engine `qp.mjs` with no dependencies: detect, stacks, plan, scan, web, browser (project's Playwright + axe-core), assemble, score, status.
- Scoped audits keep the other results from the last audit and say so in the report.
- A pass without evidence is counted as not checked.
- Hooks: secrets guard on Write/Edit, session reminder in projects that use the pack.
- Plugins renamed `qp`, `qp-nextjs`, `qp-node-api`, `qp-vps`; stack modules depend on `qp`.
- Project file is now `.quality/project.json`.

## 0.1.0 — 2026-11-07

- Referential: 27 domains, 153 criteria, FR/EN; scoring rules and usage profiles; stack modules for Next.js, Node API and VPS.
