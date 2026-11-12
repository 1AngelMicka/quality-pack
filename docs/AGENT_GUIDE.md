# quality-pack — guide for AI agents

You are an AI agent helping a user install, configure or use quality-pack. Follow this guide step by step. Talk to the user in their language. Keep each message short: one step, what to type, what they should see.

## What it is, in one paragraph

quality-pack is a set of Claude Code plugins. While the user codes, it gives Claude build rules across 28 quality domains. On demand, it audits the project (226 checks, each with evidence), plays the user's key tasks on a phone and a desktop, and writes a report with two scores out of 10 (experience; engineering and operations), with fixes by priority. It also reduces token usage. It is distributed as a Claude Code **plugin marketplace**, not as an npm package: never try `npm install quality-pack`.

## 0. Find out where the user is

Ask, or check, before anything else:

1. **Do they use Claude Code?** The terminal CLI or the desktop app. `/plugin` commands do not work in a web chat. If the user sees "/plugin isn't available in this environment", they are not in Claude Code: tell them to open Claude Code in their project folder.
2. **Node.js 18 or later.** Run `node --version`. If it is missing or older, point them to https://nodejs.org (LTS).
3. **git.** Run `git --version`.
4. **Their project.** Which folder, and which stack (Next.js, a Node API, a VPS…)? This decides which modules to install.

If you can run shell commands yourself, run the checks instead of asking.

## 1. Install

These commands are typed **inside Claude Code**, one per line:

```
/plugin marketplace add 1AngelMicka/quality-pack
/plugin install qp@quality-pack
```

Then the stack modules that match the project. Install only the relevant ones:

| The project uses | Command |
| --- | --- |
| Next.js, React, TypeScript, Tailwind | `/plugin install qp-nextjs@quality-pack` |
| A Node API: Fastify or Express, Prisma, PostgreSQL, Redis, Socket.io | `/plugin install qp-node-api@quality-pack` |
| A self-hosted server: Docker Compose, PM2, Nginx or CloudPanel | `/plugin install qp-vps@quality-pack` |
| An Expo or React Native mobile app | `/plugin install qp-expo@quality-pack` |
| A web app shipped as a mobile app with Capacitor | `/plugin install qp-capacitor@quality-pack` |

Then: restart Claude Code, or type `/reload-plugins`.

**Check:** typing `/qp:` should list `kickoff`, `audit`, `fix` and `handoff`. If not, open `/plugin`, look at **Installed** and the **Errors** tab.

If you can run shell commands but not slash commands, the CLI equivalent is:

```bash
claude plugin marketplace add 1AngelMicka/quality-pack
claude plugin install qp@quality-pack
```

Add `--scope project` to both to share the setup with a team through `.claude/settings.json`, which they then commit.

## 2. Optional extras

Offer these, explain why in one sentence each, and install only with the user's yes.

- **Browser checks and key tasks**: `node <plugin folder>/scripts/qp.mjs browser-setup`, once. It installs Playwright, axe-core and Chromium into the pack's cache, not into the project. `/qp:audit` offers it when needed. Without them, those checks are reported as "not checked".
- **Graphify**, for projects with more than about 60 source files: Claude queries a local code graph instead of re-reading files, which saves tokens. Install with `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project` in the project. It needs Python 3.10 or later.

## 3. First use

In the project, inside Claude Code:

1. `/qp:kickoff`. Claude asks about the project: who it is for, the type (showcase site, web app, SaaS, mobile, API), what it does, the visual direction, and the 2 to 5 key tasks people come for; it writes them as flows the audit will play. It writes `.quality/project.json`, `DESIGN.md` and a section in `CLAUDE.md`. Let the user answer; do not answer for them.
2. `/qp:audit`. The first audit is a full one. It ends with two scores and writes `.quality/AUDIT.md`.
3. `/qp:fix`. It fixes the open blockers first and verifies each fix.
4. Later, `/qp:audit` again. It is incremental: only what changed is checked again.

Cheaper options to mention:
- `/qp:audit quick` runs the automatic checks only.
- `/qp:handoff` writes a short note so the next session resumes without re-exploring the project.

## 4. Common errors

| Symptom | Cause and fix |
| --- | --- |
| "/plugin isn't available in this environment" | Not in Claude Code. Open Claude Code (terminal or desktop app) in the project folder. |
| `/qp:` commands missing after install | Restart Claude Code or run `/reload-plugins`. Check `/plugin` → Installed and the Errors tab. |
| Adding the marketplace fails | git is missing, or there is no GitHub SSH key: set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and retry. |
| `node: command not found` in a hook | Install Node.js 18+ and make sure `node` is on the PATH, then restart Claude Code. |
| A file write is blocked "as a secret" | Intended: the pack blocks API keys and passwords in code. Move the value to an environment variable. If it is truly not secret, add the comment `qp-allow-secret` on that line. |
| Browser checks "not checked" | Playwright or axe-core missing (`qp.mjs browser-setup`), or the app is not running. Start the app locally or add a staging URL in `.quality/project.json` under `urls`. |
| A key task stops at a step | `flows.json` in the audit folder names the step and the error. Fix the selector in `.quality/project.json` › `flows` (`qp.mjs flows --check`), or the bug if it is real. |
| The audit "redoes everything" | Normal on the first audit, after a pack update, after 30 days, or outside a Git repository. |

## 5. Update and uninstall

- Update: `/plugin marketplace update quality-pack`. For automatic updates: `/plugin` → Marketplaces → quality-pack → Enable auto-update.
- Uninstall: `/plugin uninstall qp@quality-pack`, then `/plugin marketplace remove quality-pack`. The project keeps its `.quality/` folder until the user deletes it.

## Rules for you, the agent

- Never install anything on the user's machine without saying what it is and getting a yes.
- Never invent commands or flags. Everything you need is in this guide, the [README](https://github.com/1AngelMicka/quality-pack/blob/main/README.en.md) and `/plugin`.
- The pack does not send telemetry. During an audit, it only contacts the project's own URLs. If the user asks about privacy, point to [SECURITY.md](https://github.com/1AngelMicka/quality-pack/blob/main/SECURITY.md).
- The pack helps spot legal obligations (GDPR, legal notices, licences). It is not legal advice: say so if the user relies on it for compliance.
