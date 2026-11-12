# quality-pack

[Français](README.md) · **English**

Plugins for [Claude Code](https://claude.com/claude-code) that make Claude build your website or app properly from the start, audit it with a score out of 10 domain by domain, and spend as few tokens as possible doing it.

- **37 domains, 247 checks**: product, UX, ergonomics, UI, generic "AI-made" content, accessibility, security, privacy, performance, SEO, payments, the accounts and subscriptions of a SaaS, mobile apps, finish, identity, deployment, backups and more.
- **Your real tasks, played on a phone and a desktop**: you declare 2 to 5 key tasks ("make a collage from 4 photos"); the audit plays them step by step, takes a screenshot and runs axe-core at every step, and measures the effort: pages to scroll, settings shown at once, preview and main action within reach. The interface is no longer judged on an empty screen.
- **Two scores**: **Experience** (what the user lives) and **Engineering and operations** (what keeps the project safe and running), each with its own blockers. A missing uptime probe no longer hides how the interface fares, and the other way round.
- **Evidence for every check**: a file and line, a command output or a screenshot. A check claimed as passed without evidence does not count.
- **Design, not only audit**: three design skills. One organises a screen (patterns per task, phone and desktop). One turns the references a client likes into checked tokens (OKLCH, DTCG format, contrast in every theme). One advises on an existing screen (`/qp:design-review`). Every piece of advice ends with a measure.
- **Security tried, not only read**: the audit plays access control with two accounts (can one customer read another's data?), probes the login, runs a passive OWASP ZAP scan and reads the repository's supply chain. A threat model is written at kickoff.
- **From zero to launch**: the `from-zero` skill gives the stages of a SaaS or web app and what must be true before moving on; `saas-foundations` builds what is costly to add late (isolation between customers, roles, subscriptions, service emails); `mobile-app` covers the iOS and Android app up to the store blockers.
- **Finish, measured**: `qp craft` checks in a real browser what separates a cared-for product from a first draft (keyboard focus, hover, typography, images, 404 page, share image…), and the referential refuses any invented testimonial, figure or customer logo.
- **Beyond correct**: a reference bank per type of site (what visitors expect, sites recognised as excellent and why), versions compared blind by a jury before you choose, an art director who reads the screenshots, and mandatory finishing passes (slow network, failing server, long texts, keyboard only).
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
/plugin install qp-expo@quality-pack        # Expo or React Native mobile app (iOS, Android)
/plugin install qp-capacitor@quality-pack   # Web app shipped as an iOS and Android app with Capacitor
/plugin install qp-tauri@quality-pack       # Tauri desktop app
/plugin install qp-electron@quality-pack    # Electron desktop app
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
| `/qp:audit ergonomics` | One group (`product-experience`, `ergonomics`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `saas`, `mobile`, `operations`) |
| `/qp:audit SEC-01 SEC-03` · `/qp:audit blockers` | Specific criteria, or only the blockers |
| `/qp:fix` | Fix the open blockers (or the top 5 issues) |
| `/qp:fix 10` · `/qp:fix SEC-02` · `/qp:fix ERG-R01` | Fix the first 10 issues, a specific one, or a finding of the ergonomics review |
| `/qp:fix experience` | Fix first what weighs on the Experience score |
| `/qp:handoff` | Write `.quality/handoff.md` before stopping a long task |
| `/qp:design-review [task or URL]` | Advice on a screen: measured effort, heuristic review, two or three costed reorganisations |
| `node qp.mjs look <url>` | Measure the rendered page: weighted generic-look signals, font sizes, line length, small targets |
| `node qp.mjs deslop <url>` | Measure spacing and alignment on the rendered page, element by element, at 375, 768, 1440 and 1920 px (installed Chrome or Edge, nothing to add) |
| `node qp.mjs craft <url>` | Measure the finish of the rendered page: typography details, focus and hover, transitions, images, icons, site icon, share image, 404 page |
| `node qp.mjs stress <url>` | Finishing passes: the screen with a slow network, a failing server, texts three times longer, at 320 px, in the dark scheme, with the keyboard only, with scripts off |
| `node qp.mjs bank [type]` | Reference bank: per type of site, what visitors expect, sites recognised as excellent with the reason, what to avoid |
| `node qp.mjs profile <url> --save` · `gap <url>` | Measure the visual profile of references, then the gap between a screen and them, or the bank (`--type`) |
| `node qp.mjs variants <name> <url> <url>…` | Several versions of one screen: screenshots under shuffled letters, measures, pairs for a blind jury; `--tally` ranks them |
| `node qp.mjs access` | Play access control: each declared resource is requested by its owner, then by the accounts that must not reach it. Exit code 2 on a leak |
| `node qp.mjs auth` | Probe the login (local or staging only): same answer for a known and an unknown account, wrong passwords in a row slowed or refused |
| `node qp.mjs dast [url]` | Passive scan of the running app with OWASP ZAP in Docker: headers, cookies, information leaks, vulnerable libraries |
| `node qp.mjs supply` | Read the repository's supply chain: lockfile, release cooldown, install scripts, pinned CI actions, .env files |
| `node qp.mjs seo [url]` | Search readiness: sitemap (present, declared, no broken address), title and meta description of each page, target keywords carried by their page, Search Console |
| `node qp.mjs perf <url>` | Measure loading on a throttled phone: largest paint, layout shift, blocking time, weight of the page and of scripts |
| `node qp.mjs facts <url>` | List the figures, quotes, customer names and badges shown, and check each is traced to `.quality/facts.json` |
| `node qp.mjs webhooks` | Play the webhooks (local or staging): an unsigned or wrongly signed event must be refused |
| `node qp.mjs desktop check` · `flows --attach <port>` | Desktop app: read isolation, permissions, signing and updates from the project; play the key tasks in the real window |
| `node qp.mjs threats` | Check the threat model (`.quality/threats.json`): entry points covered, a response and a test for each abuse case |
| `node qp.mjs mobile flows` · `mobile check` | Installed app: play the key tasks with Maestro on an emulator or device; read from the project what blocks a release |
| `node qp.mjs tokens` | Check design tokens: DTCG format, references, contrast in every theme, colours outside sRGB |
| `node qp.mjs record <id>` | Record a key task by doing it in a browser instead of writing it |
| `node qp.mjs report` | Rewrite `.quality/report.html`: scores over time, screenshots of every step, review findings |

## What it checks

| Group | Domains |
| --- | --- |
| Product and experience | Product, Features, UX, Content, Support |
| Ergonomics | Ergonomics and information architecture: effort per task, settings shown at once, preview and main action within reach, choices never overwritten, DESIGN.md references followed, heuristic review |
| Design and accessibility | UI, AI slop, Responsive, Accessibility, Compatibility, Craft, Identity and true content |
| Security and data | Security, Privacy, Data, Compliance |
| Reliability and code quality | Reliability, Tests, Code |
| Performance and visibility | Performance, SEO and meta, Scalability |
| Integrations, payments and costs | Integrations, Payments, Costs |
| SaaS | Accounts, teams and access (isolation between customers, roles, invitations); Subscriptions (trial, limits, failed payment, cancellation, invoices); Activation and customer relationship |
| Installed mobile app | Native mobile experience (tasks played on a device, platform rules, offline); Store release and mobile security |
| Desktop app | Desktop experience (window, menus, shortcuts, files, offline, no lost work); Desktop release and security (isolation between the page and the system, signing, updates) |
| Operations | Infrastructure, Deployment, Monitoring, Backups |

Every rule and check is listed in [docs/en/REFERENTIAL.md](docs/en/REFERENTIAL.md).

### Scoring

- Each check is a **blocker** (5 points), **major** (3) or **minor** (1). Passed = all points, partial = half, failed or not checked = none.
- Two scores: **Experience** (product, features, UX, content, support, ergonomics, UI, AI slop, responsive, accessibility, compatibility, craft, identity, performance, activation, mobile experience) and **Engineering and operations** (accounts and access, subscriptions, mobile release, security, privacy, data, compliance, reliability, tests, code, SEO, scalability, integrations, payments, costs, infrastructure, deployment, monitoring, backups).
- A failed blocker caps its domain at 3/10 and the score it belongs to at 5.9/10, not the other one.
- Each score weights its domains by project type: `vitrine` (showcase site), `webapp`, `saas`, `mobile` or `api`. Domains that do not apply (payments on a showcase site, for example) are skipped.
- The overall score (every domain) stays in the report for history; it is capped at 5.9/10 as soon as any blocker is open.
- Critical findings of the ergonomics review fail ERG-09, major ones cap it at partial. The counter-check can only lower a result, with evidence.

## Design

Seven skills load when Claude designs or changes an interface:

| Skill | What it does | What it checks |
| --- | --- | --- |
| `design-screens` | Organises a screen before it is coded: panes per window width, shell (list-detail, supporting pane, feed), navigation, main action, and a recipe per task (editor with preview, wizard, settings, checkout, dashboard, filters, form, table, empty state, first run), separately for phone and desktop | The key tasks played (`qp flows`): effort budgets, preview visible, main action under the thumb |
| `design-direction` | From the references a client likes (look and organisation, kept apart) to 4 or 5 mood words, testable principles, style tiles, then DTCG tokens in OKLCH for light and dark | `qp tokens`: WCAG contrast never rounded, in every theme, format, colours outside sRGB; `qp look` on the rendered page |
| `deslop-ui` | Makes an interface clean before calling it done: measures spacing, alignment, boxes, controls and signs of generated UI on the real rendering, with screenshots, then fixes at the root | `qp deslop`: no high finding, screenshots re-read |
| `scroll-animation` | Builds scroll animations of every kind (reveal, scrubbed, progress, parallax, pinned scene, horizontal section, text, scrollytelling, snapping, image sequence, 3D, Lottie, page transitions, smooth scroll): native CSS first, a free library only when needed, always with reduced motion | `qp look`: native scrolling, no text that depends on an animation, reduced motion respected |
| `premium-craft` | Finishes a screen so that nothing gives away a quick or generated job: every state of every control, fine typography, shadows and radii, waiting without flicker, undo, a built dark theme, an identity of its own (fonts, icons, imagery, logo), specific copy and checkable facts | `qp craft`: no failed "must"; each "should" fixed or justified in DESIGN.md |
| `design-variants` | For the screens that carry the product: three versions that really differ, measured, compared two by two by a jury of agents that does not know which is which; you choose between the finalists, then the best of the others is carried over and an art director reviews | `qp variants`, `qp gap`: each gap to the references closed or justified |
| `design-review` (`/qp:design-review`) | Advice on an existing screen: measures, a two-pass heuristic review (Nielsen, Bastien and Scapin), severity 0 to 4 confirmed by three independent passes, then two or three reorganisations with their effort gap (keystroke-level model) | The task played again before and after |

The generic "AI-made" look is measured by weighted signals (default font, violet, gradients, three identical cards, a badge above the headline, emoji as icons, hollow wording…). One signal alone is never a defect, and app screens (`operate` mode) are never penalised for being conventional. Sources are listed in [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

## SaaS, security and mobile app

| Skill | What it does | What it checks |
| --- | --- | --- |
| `from-zero` | Gives the path from an idea to a launched product, in stages with a gate each, and says which skill to use at each stage | The gate of each stage, shown by a command or a deliverable |
| `saas-foundations` | Builds the base of a SaaS in the right order: customer model and data isolation, accounts, roles and invitations, subscriptions (trial, limits, failed payment, cancellation, invoices and VAT), service emails, first session, export and deletion | `qp access` with no leak, `qp auth`, a fresh-account flow up to activation |
| `security-testing` | Tests the security of your own app, on local or staging: threat model, access control played with two accounts, login, passive scan, supply chain, and what remains for a human | `qp threats`, `qp access`, `qp auth`, `qp dast`, `qp supply` |
| `mobile-app` | Chooses the approach (PWA, Capacitor, Expo, Flutter), applies the iOS and Android rules, plays the key tasks on a device and lists what blocks a store release | `qp mobile flows`, `qp mobile check` |
| `desktop-app` | Builds and releases a Tauri or Electron desktop app that behaves like one (window, menus, shortcuts, files, offline) without exposing the machine: isolation between the page and the system, validated commands, signing, signed updates | `qp desktop check`, `qp flows --attach` |
| `user-testing` | Prepares a test with five real people from the audience and turns the notes into ranked fixes | The dated report (criterion ACT-06) |
| `seo-launch` | Chooses the target searches (one phrase per page), writes titles, descriptions and first paragraphs around them, builds sitemap.xml and robots.txt, then guides you to declare the site in Google Search Console and submit the sitemap | `qp seo`: no failed "must" |

Three things stay human, and the pack says so: knowing whether anyone wants the product, watching real people use it, and an independent penetration test before the first paying customers. Active tests (wrong passwords, writes) never target production.

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
