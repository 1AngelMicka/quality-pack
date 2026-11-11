# Changelog

## Unreleased

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
