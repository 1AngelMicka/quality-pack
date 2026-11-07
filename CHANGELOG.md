# Changelog

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
