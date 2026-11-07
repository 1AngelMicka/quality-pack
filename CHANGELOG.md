# Changelog

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
