# Changelog

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
