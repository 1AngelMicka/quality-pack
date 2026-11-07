# quality-pack

[Français](README.md) · **English**

Plugins for [Claude Code](https://claude.com/claude-code) that make Claude build your website or app properly from the start, then audit it and give it a score out of 10, domain by domain.

- **27 domains, 153 checks**: product, UX, UI, generic "AI-made" content, accessibility, security, privacy, performance, SEO, payments, deployment, backups and more.
- **Evidence for every check**: a file and line, a command output or a screenshot. A check claimed as passed without evidence does not count.
- **Honest scores**: one open blocker (a leaked secret, a broken main flow) caps the score.
- **Free, open source, no telemetry**, in English and French.

## How it works

```
/qp:kickoff  →  you code (rules apply automatically)  →  /qp:audit  →  /qp:fix  →  /qp:audit again
```

| Step | What happens |
| --- | --- |
| `/qp:kickoff` | Claude reads your project, asks a few questions (who it is for, what kind of project, what it does, the look you want) and writes `.quality/project.json` and `DESIGN.md`. |
| While you code | Claude follows the rules of the domains it touches and of your stack. A guard blocks secrets from being written into code. |
| `/qp:audit` | Automatic scans (code, HTTP headers, SEO, browser at 5 screen widths, accessibility), then 7 auditors in parallel. You get `.quality/AUDIT.md`: overall score, score per domain, change since last time, fixes by priority. |
| `/qp:fix` | Fixes the issues in order, blockers first, and checks each fix. |

## Install

**You need:** [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) 18 or later, and `git`.

**1. Add the marketplace and install the core plugin.** In Claude Code, type:

```
/plugin marketplace add 1AngelMicka/quality-pack
/plugin install qp@quality-pack
```

**2. Install the modules for your stack** (pick what you use):

```
/plugin install qp-nextjs@quality-pack      # Next.js, React, TypeScript, Tailwind
/plugin install qp-node-api@quality-pack    # Fastify or Express, Prisma, PostgreSQL, Redis, Socket.io
/plugin install qp-vps@quality-pack         # Self-hosted server: Docker Compose, PM2, Nginx or CloudPanel
```

**3. Restart Claude Code** (or run `/reload-plugins`), open your project and run:

```
/qp:kickoff
```

**4. Optional, for the browser and accessibility checks**, in your project:

```bash
npm i -D @playwright/test axe-core
npx playwright install chromium
```

Without them the audit still runs; those checks are marked "not checked".

### Install for a whole team

In the project folder, run once in your terminal, then commit `.claude/settings.json`:

```bash
claude plugin marketplace add 1AngelMicka/quality-pack --scope project
claude plugin install qp@quality-pack --scope project
```

Teammates get the pack when they open the project in Claude Code and trust the folder.

### Update

Type `/plugin marketplace update quality-pack` in Claude Code. To update automatically, open `/plugin`, go to **Marketplaces**, select **quality-pack** and choose **Enable auto-update**.

### Uninstall

```
/plugin uninstall qp@quality-pack
/plugin marketplace remove quality-pack
```

Your project keeps its `.quality/` folder; delete it if you no longer want it.

## Commands

| Command | Use it to |
| --- | --- |
| `/qp:kickoff` | Set up or update the project's quality profile |
| `/qp:audit` | Run a full audit |
| `/qp:audit security-data` | Audit one group (`product-experience`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `operations`) |
| `/qp:audit SEC-01 SEC-03` | Re-check specific criteria; other results are kept from the last audit |
| `/qp:audit blockers` | Re-check only the blockers |
| `/qp:fix` | Fix the open blockers (or the top 5 issues) |
| `/qp:fix 10` · `/qp:fix SEC-02` | Fix the first 10 issues, or a specific one |

## What it checks

| Group | Domains |
| --- | --- |
| Product and experience | Product, Features, UX, Content, Support |
| Design and accessibility | UI, AI slop, Responsive, Accessibility, Compatibility |
| Security and data | Security, Privacy, Data, Compliance |
| Reliability and code quality | Reliability, Tests, Code |
| Performance and visibility | Performance, SEO and meta, Scalability |
| Integrations, payments and costs | Integrations, Payments, Costs |
| Operations | Infrastructure, Deployment, Monitoring, Backups |

Every rule and check is listed in [docs/en/REFERENTIAL.md](docs/en/REFERENTIAL.md).

### Scoring

- Each check is a **blocker** (5 points), **major** (3) or **minor** (1). Passed = all points, partial = half, failed or not checked = none.
- A failed blocker caps its domain at 3/10 and the overall score at 5.9/10.
- The overall score weights domains by project type: `vitrine` (showcase site), `webapp`, `saas`, `mobile` or `api`. Domains that do not apply (payments on a showcase site, for example) are skipped.

## What it creates in your project

```
.quality/
  project.json          your project's profile (written by /qp:kickoff)
  AUDIT.md              the latest audit report
  audits/<date>.json    every audit, to follow the score over time
  fixes.md              log of fixes made by /qp:fix
DESIGN.md               your visual direction and design tokens
CLAUDE.md               a short "Quality pack" section is added
```

Commit `.quality/` to keep the score history. Screenshots (`.quality/audits/*/screens/`) are git-ignored.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `/qp:...` commands do not appear | Restart Claude Code or run `/reload-plugins`. Check `/plugin` → **Installed** and the **Errors** tab. |
| `node: command not found` in a hook or command | Install Node.js 18+ and make sure `node` is on your PATH. |
| Adding the marketplace fails | Check `git` is installed. Without a GitHub SSH key, set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and retry. |
| Browser checks are "not checked" | Install Playwright and axe-core in the project (step 4), and make sure the app runs locally or set a staging URL in `.quality/project.json`. |
| A write is blocked as a secret | Move the value to an environment variable. If it really is not a secret, add `qp-allow-secret` in a comment on that line. |

## Privacy and security

The pack sends no telemetry. During an audit it only contacts the URLs of your own project. Hooks run locally and are short enough to read: [secrets guard](plugins/core/scripts/hooks/secrets-guard.mjs), [session reminder](plugins/core/scripts/hooks/session-start.mjs). To report a vulnerability, see [SECURITY.md](SECURITY.md).

This pack helps you spot legal obligations (GDPR, legal notices, licences); it is not legal advice.

## Contributing

Ideas, bugs and new stack modules are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Planned: Expo / React Native, Laravel, Astro, and a French compliance module.

## Credits and licence

Designed after studying well-known Claude Code projects, credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT licence.
