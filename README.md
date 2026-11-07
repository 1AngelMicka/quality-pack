# quality-pack

**English** · [Français](README.fr.md)

A set of Claude Code plugins to build and audit websites, web apps and mobile apps across **27 quality domains**, with a score out of 10 that you can track from one audit to the next.

> Version 0.1.0: the referential, scoring rules and score calculator are ready. The `/kickoff`, `/audit` and `/fix` commands ship in 0.2.0.

## What it does

- **While building**, Claude follows each domain's rules: empty and error states, input validation, contrast, performance budgets, no generic content, and more.
- **At audit time**, each of the 153 criteria is checked with evidence (a command, a file and line, a screenshot). The pack computes a score per domain and an overall score, compares them with the previous audit and ranks the fixes by priority.

The 27 domains: Product, Features, UX, Content, Support, UI, AI slop, Responsive, Accessibility, Compatibility, Security, Privacy, Data, Compliance, Reliability, Tests, Code, Performance, SEO and meta, Scalability, Integrations, Payments, Costs, Infrastructure, Deployment, Monitoring, Backups.

Full details: [docs/en/REFERENTIAL.md](docs/en/REFERENTIAL.md).

## Plugins

| Plugin | Role |
| --- | --- |
| `qp-core` | Shared core: referential, scoring, usage profiles, score calculator |
| `qp-stack-nextjs` | Next.js, React, TypeScript, Tailwind |
| `qp-stack-node-api` | Node API: Fastify or Express, Prisma, PostgreSQL, Redis, Socket.io |
| `qp-infra-vps` | Self-hosted VPS: Docker Compose, PM2, Nginx or CloudPanel, backups |

Planned: Expo / React Native, Laravel, Astro, a French compliance module.

## Scoring

- Each criterion is worth 5 points (blocker), 3 (major) or 1 (minor).
- A passed criterion earns all its points, a partial one earns half. A failed or unchecked criterion earns nothing.
- A blocker is either met or not; there is no partial. If one fails, its domain is capped at 3/10 and the overall score at 5.9/10.
- The overall score weights the domains by the project's usage profile: `vitrine` (showcase site), `webapp`, `saas`, `mobile` or `api`.

```bash
python3 plugins/core/scripts/score.py .quality/audits/2026-11-07.json --previous .quality/audits/2026-10-01.json --lang en
```

## Principles

- No telemetry.
- Only short, readable hooks.
- Third-party sources are credited and pinned to an exact commit ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
- This referential is not legal advice.

## Contributing

The referential lives in `plugins/core/referential/` as bilingual YAML. After any change, run:

```bash
python3 tools/referential.py docs   # validates, then regenerates docs/fr and docs/en
```

MIT licence.
