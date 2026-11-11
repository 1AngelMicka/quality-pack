# quality-pack

[Français](README.md) · **English**

Plugins for [Claude Code](https://claude.com/claude-code) that make Claude build your website or app properly from the start, audit it with a score out of 10 domain by domain, and spend as few tokens as possible doing it.

- **28 domains, 162 checks**: product, UX, ergonomics, UI, generic "AI-made" content, accessibility, security, privacy, performance, SEO, payments, deployment, backups and more.
- **Your real tasks, played on a phone and a desktop**: you declare 2 to 5 key tasks ("make a collage from 4 photos"); the audit plays them step by step, takes a screenshot and runs axe-core at every step, and measures the effort: pages to scroll, settings shown at once, preview and main action within reach. The interface is no longer judged on an empty screen.
- **Two scores**: **Experience** (what the user lives) and **Engineering and operations** (what keeps the project safe and running), each with its own blockers. A missing uptime probe no longer hides how the interface fares, and the other way round.
- **Evidence for every check**: a file and line, a command output or a screenshot. A check claimed as passed without evidence does not count.
- **Design, not only audit**: three design skills. One organises a screen (patterns per task, phone and desktop). One turns the references a client likes into checked tokens (OKLCH, DTCG format, contrast in every theme). One advises on an existing screen (`/qp:design-review`). Every piece of advice ends with a measure.
- **Honest scores**: an open blocker (a leaked secret, a broken main flow) caps the score it belongs to. An ergonomist reviews the key tasks and a counter-check re-reads the passed criteria on the screenshots.
- **Token-frugal**: rules loaded on demand, compact command outputs, incremental audits, a code graph with [Graphify](https://github.com/Graphify-Labs/graphify). See [Token economy](#token-economy).
- **Free, open source, no telemetry**, in English and French.

## Online docs and AI agents

- Documentation website: https://1angelmicka.github.io/quality-pack/en/
- You can also hand the install over to your AI assistant: give it the repository link, or say "install quality-pack by following https://github.com/1AngelMicka/quality-pack/blob/main/docs/AGENT_GUIDE.md". It will find [`llms.txt`](llms.txt) and the [agent guide](docs/AGENT_GUIDE.md).

## How it works

```
/qp:kickoff  →  you code (rules apply automatically)  →  /qp:audit  →  /qp:fix  →  /qp:audit
```

| Step | What happens |
| --- | --- |
| `/qp:kickoff` | Claude reads your project, asks a few questions (who it is for, what kind of project, what it does, the look you want, the key tasks), writes the flows the audit will play, suggests useful companion tools and writes `.quality/project.json` and `DESIGN.md`. |
| While you code | Claude follows the rules of the domains it touches and of your stack. A guard blocks secrets from being written into code. |
| `/qp:audit` | Automatic scans (code, HTTP headers, SEO, browser at 5 screen widths), key tasks played on phone and desktop, then one auditor per group of domains in parallel, an ergonomist for how screens are organised, and a counter-check. By default, only what changed since the last audit is checked again. You get `.quality/AUDIT.md`: the two scores, score per domain, ergonomics review, trend, fixes by priority. |
| `/qp:fix` | Fixes the issues in order, blockers first, and checks each fix. |
| `/qp:handoff` | Notes where the task stands, so the next session resumes without exploring the project again. |

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

**4. For the key tasks and the browser checks**, once:

```bash
node <plugin folder>/scripts/qp.mjs browser-setup
```

Playwright, axe-core and Chromium go into the pack's cache, not into your project (Claude offers it at the first audit). If your project already has Playwright, that one is used. Without them the audit still runs; those checks are marked "not checked".

**5. Optional, to save tokens on medium and large projects:** install [Graphify](#companion-tools) (`/qp:kickoff` suggests it when it helps).

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
| `/qp:audit` | Incremental audit: only what changed since the last audit is checked again (full on the first audit, after a pack update, or when the last full audit is older than 30 days) |
| `/qp:audit quick` | Automatic checks only, no auditors: the cheapest, ideal before a release |
| `/qp:audit full` | Check everything again from scratch |
| `/qp:audit ergonomics` | One group (`product-experience`, `ergonomics`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `operations`) |
| `/qp:audit SEC-01 SEC-03` · `/qp:audit blockers` | Specific criteria, or only the blockers |
| `/qp:fix` | Fix the open blockers (or the top 5 issues) |
| `/qp:fix 10` · `/qp:fix SEC-02` · `/qp:fix ERG-R01` | Fix the first 10 issues, a specific one, or a finding of the ergonomics review |
| `/qp:fix experience` | Fix first what weighs on the Experience score |
| `/qp:handoff` | Write `.quality/handoff.md` before stopping a long task |
| `/qp:design-review [task or URL]` | Advice on a screen: measured effort, heuristic review, two or three costed reorganisations |
| `node qp.mjs look <url>` | Measure the rendered page: weighted generic-look signals, font sizes, line length, small targets |
| `node qp.mjs deslop <url>` | Measure spacing and alignment on the rendered page, element by element, at 375, 768 and 1440 px (installed Chrome or Edge, nothing to add) |
| `node qp.mjs tokens` | Check design tokens: DTCG format, references, contrast in every theme, colours outside sRGB |
| `node qp.mjs record <id>` | Record a key task by doing it in a browser instead of writing it |
| `node qp.mjs report` | Rewrite `.quality/report.html`: scores over time, screenshots of every step, review findings |

## What it checks

| Group | Domains |
| --- | --- |
| Product and experience | Product, Features, UX, Content, Support |
| Ergonomics | Ergonomics and information architecture: effort per task, settings shown at once, preview and main action within reach, choices never overwritten, DESIGN.md references followed, heuristic review |
| Design and accessibility | UI, AI slop, Responsive, Accessibility, Compatibility |
| Security and data | Security, Privacy, Data, Compliance |
| Reliability and code quality | Reliability, Tests, Code |
| Performance and visibility | Performance, SEO and meta, Scalability |
| Integrations, payments and costs | Integrations, Payments, Costs |
| Operations | Infrastructure, Deployment, Monitoring, Backups |

Every rule and check is listed in [docs/en/REFERENTIAL.md](docs/en/REFERENTIAL.md).

### Scoring

- Each check is a **blocker** (5 points), **major** (3) or **minor** (1). Passed = all points, partial = half, failed or not checked = none.
- Two scores: **Experience** (product, features, UX, content, support, ergonomics, UI, AI slop, responsive, accessibility, compatibility, performance) and **Engineering and operations** (security, privacy, data, compliance, reliability, tests, code, SEO, scalability, integrations, payments, costs, infrastructure, deployment, monitoring, backups).
- A failed blocker caps its domain at 3/10 and the score it belongs to at 5.9/10, not the other one.
- Each score weights its domains by project type: `vitrine` (showcase site), `webapp`, `saas`, `mobile` or `api`. Domains that do not apply (payments on a showcase site, for example) are skipped.
- The overall score (every domain) stays in the report for history; it is capped at 5.9/10 as soon as any blocker is open.
- Critical findings of the ergonomics review fail ERG-09, major ones cap it at partial. The counter-check can only lower a result, with evidence.

## Design

Four skills load when Claude designs or changes an interface:

| Skill | What it does | What it checks |
| --- | --- | --- |
| `design-screens` | Organises a screen before it is coded: panes per window width, shell (list-detail, supporting pane, feed), navigation, main action, and a recipe per task (editor with preview, wizard, settings, checkout, dashboard, filters, form, table, empty state, first run), separately for phone and desktop | The key tasks played (`qp flows`): effort budgets, preview visible, main action under the thumb |
| `design-direction` | From the references a client likes (look and organisation, kept apart) to 4 or 5 mood words, testable principles, style tiles, then DTCG tokens in OKLCH for light and dark | `qp tokens`: WCAG contrast never rounded, in every theme, format, colours outside sRGB; `qp look` on the rendered page |
| `deslop-ui` | Makes an interface clean before calling it done: measures spacing, alignment, boxes, controls and signs of generated UI on the real rendering, with screenshots, then fixes at the root | `qp deslop`: no high finding, screenshots re-read |
| `design-review` (`/qp:design-review`) | Advice on an existing screen: measures, a two-pass heuristic review (Nielsen, Bastien and Scapin), severity 0 to 4 confirmed by three independent passes, then two or three reorganisations with their effort gap (keystroke-level model) | The task played again before and after |

The generic "AI-made" look is measured by weighted signals (default font, violet, gradients, three identical cards, a badge above the headline, emoji as icons, hollow wording…). One signal alone is never a defect, and app screens (`operate` mode) are never penalised for being conventional. Sources are listed in [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

## Token economy

The pack cuts tokens in three places:
- **what is always loaded**: as little as possible;
- **what Claude reads**: summaries and targeted queries instead of whole files and outputs thousands of lines long;
- **what is redone**: only what changed is checked again, and the project is not explored from scratch every session.

### What the pack does on its own, with nothing to install

| Mechanism | Effect |
| --- | --- |
| **Rules loaded on demand** | About 1,150 tokens are always loaded (the skill descriptions). Detailed rules (300 to 1,800 tokens per skill) load only when Claude touches that domain. |
| **Scans as scripts** | Filler text, hollow wording, leftover logs, HTTP headers, SEO and browser checks run in Node. Claude reads a JSON summary instead of going through the code. |
| **Compact command outputs** (`qp.mjs run`) | Tests, lint, typecheck and dependency audits write their full log to disk. Claude only gets the exit code, the error lines and the end of the log. In our test, a 3,000-line output went from about 14,700 tokens to about 190. |
| **Incremental audit by default** | Only the criteria that changed files (according to Git) can affect are checked again; the others are carried over from the last audit and flagged as such. If nothing changed, no auditor runs. |
| **Quick mode** (`/qp:audit quick`) | Automatic checks only, no auditor agents. |
| **Auditor model** | `/qp:kickoff` offers Opus (recommended) or Fable for the auditors. Smaller models gave wrong evidence and stayed on empty screens in real audits: save with incremental audits and compact outputs instead. |
| **Handoff** (`/qp:handoff`) | A note of at most 60 lines lets the next session resume a long task without exploring the project again. The startup hook points to it automatically. |
| **Short replies** | The working method asks for two- or three-line reports: no recap of steps, no copied code. |

The audit report shows the tokens saved by compact outputs. For a session's total usage, type `/cost` (or `/usage`, depending on your plan) in Claude Code.

### By project size and time horizon

Size is counted in source files: `node qp.mjs graph` shows it, and `/qp:kickoff` uses it for its recommendations.

| Project size | Short term: one session | Medium term: a few weeks of development | Long term: the life of the project |
| --- | --- | --- | --- |
| **Small** (under 60 source files) | The pack is enough: rules on demand, compact outputs. Graphify adds almost nothing; a direct search is already cheap. | Incremental `/qp:audit` after each feature, `/qp:audit quick` before each release. | One `/qp:audit full` a month (forced automatically after 30 days). `/qp:handoff` for tasks spanning several days. |
| **Medium** (60 to 400 files) | Install **Graphify**: Claude queries the code graph instead of searching and re-reading files. **RTK** if your sessions are long. | Incremental audits. `graphify hook install` keeps the graph up to date on every commit, at no token cost. | Score history in `.quality/`. Monthly full audit, `/qp:handoff` at the end of every session. |
| **Large** (over 400 files) | **Graphify strongly recommended**, RTK recommended. Files read by line ranges, never whole. | Incremental or per-group audits (`/qp:audit security-data`). `/qp:audit quick` for fast checks. | Full audits split by group over several sessions. Handoff is a must: without it, every session pays for exploring the project again. |

### Companion tools

These tools are not part of the pack: they are separate projects, installed separately. `/qp:kickoff` suggests the ones that fit your project and installs them only if you say yes.

| Tool | When | What it adds | Install |
| --- | --- | --- | --- |
| [Graphify](https://github.com/Graphify-Labs/graphify) | Medium and large projects | A code graph built locally, with no AI model call. Claude asks a question ("where are the API routes?") instead of re-reading files. The pack refreshes it before each audit, at no token cost. | `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project` |
| [RTK](https://github.com/rtk-ai/rtk), `rtk-oss` edition | Long sessions | Compresses the output of everyday commands (git, tests, ls) before Claude reads it. Telemetry off by default. Pick the `rtk-oss` edition, fully Apache 2.0. | `brew install rtk-ai/tap/rtk-oss`, then `rtk init -g` |
| [Cloudflare security-audit](https://github.com/cloudflare/security-audit-skill) | Accounts, payments, personal data | In-depth security audit for major releases (criterion SEC-11). Thorough but token-hungry: run it before a release, not every day. | `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit` |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Showcase sites | A strong anti-generic design method for marketing sites. | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |
| [reanimate](https://github.com/NiazMorshed2007/reanimate) | A precise animation to reproduce | Records a reference animation and rebuilds it, measuring the gap. For inspiration, never to copy someone's site. | `npx skills add NiazMorshed2007/reanimate -g` |

**Reviewed and left out**, despite their merits:
- **claude-mem**: hooks on every event and telemetry on by default. `/qp:handoff` covers the need more simply.
- **Context Mode**: not an open-source licence (Elastic 2.0) and hooks on almost every tool; it overlaps with RTK.
- **Headroom**: telemetry on by default, and it overlaps with RTK.
- **Caveman**: telemetry that includes your IP address, and a mode that sends your prompts to an online service. Its useful idea, short replies, is part of the pack's working method.

## What it creates in your project

```
.quality/
  project.json          your project's profile (written by /qp:kickoff)
  AUDIT.md              the latest audit report
  report.html           the same report to open in a browser, with the screenshots of the key tasks
  audits/<run>.json     every audit, to follow the scores over time (2026-11-11, then 2026-11-11-2 for a second audit the same day)
  audits/<run>/flows/   screenshots of every step of the key tasks
  audits/<run>/logs/    full outputs of the audit's commands
  fixes.md              log of fixes made by /qp:fix
  handoff.md            handoff between sessions (/qp:handoff)
DESIGN.md               your visual direction and design tokens
CLAUDE.md               a short "Quality pack" section is added
```

Commit `.quality/` to keep the score history. Screenshots and logs are heavy: add `.quality/audits/*/screens/`, `.quality/audits/*/flows/` and `.quality/audits/*/logs/` to your `.gitignore` (`/qp:kickoff` does it).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `/qp:...` commands do not appear | Restart Claude Code or run `/reload-plugins`. Check `/plugin` → **Installed** and the **Errors** tab. |
| `node: command not found` | Install Node.js 18+ and make sure `node` is on your PATH. |
| Adding the marketplace fails | Check `git` is installed. Without a GitHub SSH key, set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and retry. |
| Browser checks are "not checked" | Run `qp.mjs browser-setup` (step 4), and make sure the app runs locally or set a staging URL in `.quality/project.json`. |
| A key task stops at a step | `flows.json` gives the step and the error. Fix the selector in `.quality/project.json` › `flows` (`qp.mjs flows --check` validates it), or fix the bug if it is real. |
| A write is blocked as a secret | Move the value to an environment variable. If it really is not a secret, add `qp-allow-secret` in a comment on that line. |
| The incremental audit redoes everything | Intended on the first audit, after a pack update, when the last full audit is older than 30 days, or outside a Git repository. |
| Graphify is not used | Check `graphify --version`, then run `node <plugin path>/scripts/qp.mjs graph` in your project. |

## Privacy and security

The pack sends no telemetry. During an audit it only contacts the URLs of your own project. Hooks run locally and are short enough to read: [secrets guard](plugins/core/scripts/hooks/secrets-guard.mjs), [session reminder](plugins/core/scripts/hooks/session-start.mjs). To report a vulnerability, see [SECURITY.md](SECURITY.md).

This pack helps you spot legal obligations (GDPR, legal notices, licences); it is not legal advice.

## Contributing

Ideas, bugs and new stack modules are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Planned: Expo / React Native, Laravel, Astro, and a French compliance module.

## Credits and licence

Designed after studying 27 Claude Code projects, credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT licence.
