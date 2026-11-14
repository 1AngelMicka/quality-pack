# shipwright — guide for AI agents

You are an AI agent helping a user install, configure or use shipwright. Follow this guide step by step. Talk to the user in their language. Keep each message short: one step, what to type, what they should see.

## What it is, in one paragraph

Shipwright is a set of Claude Code plugins that take a project from the idea to the launch: showcase site, web app, SaaS, desktop or mobile app. It gives Claude the order of work (the `from-zero` skill: stages with a gate each), build rules across 37 domains, and commands that prove each step (key tasks played on a phone and a desktop, access control tried with two accounts, rendering measured in a real browser). On demand it audits the project (247 criteria, each with evidence) and writes a report with two scores out of 10 (experience; engineering and operations), with fixes by priority. It keeps token usage low. It was called quality-pack until version 0.7, and its commands were `/qp:…`. It is distributed as a Claude Code plugin marketplace, never through npm.

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
/plugin install sw@shipwright
```

Then the stack modules that match the project. Install only the relevant ones:

| The project uses | Command |
| --- | --- |
| Next.js, React, TypeScript, Tailwind | `/plugin install sw-nextjs@shipwright` |
| A Node API: Fastify or Express, Prisma, PostgreSQL, Redis, Socket.io | `/plugin install sw-node-api@shipwright` |
| A self-hosted server: Docker Compose, PM2, Nginx or CloudPanel | `/plugin install sw-vps@shipwright` |
| An Expo or React Native mobile app | `/plugin install sw-expo@shipwright` |
| A web app shipped as a mobile app with Capacitor | `/plugin install sw-capacitor@shipwright` |

Then: restart Claude Code, or type `/reload-plugins`.

**Check:** typing `/sw:` should list `kickoff`, `audit`, `fix` and `handoff`. If not, open `/plugin`, look at **Installed** and the **Errors** tab.

### If you cannot type slash commands

`/plugin` commands are typed by the user: an agent cannot run them. Three other ways, from the lightest to the most complete. Say which one you use.

**A. No installation: read the skills and run the CLI from a clone.** Works in any coding agent, and inside a session that is already open.

```bash
git clone --depth 1 https://github.com/1AngelMicka/quality-pack.git <somewhere outside the project>
node <clone>/plugins/core/scripts/sw.mjs skills            # every skill and agent, with a description and its file
node <clone>/plugins/core/scripts/sw.mjs skill kickoff     # one skill, paths filled in, ready to follow
node <clone>/plugins/core/scripts/sw.mjs skill from-zero
```

Follow the text that `skill` prints as if the plugin had loaded it. Where it names another skill or a `/sw:` command, read that one the same way. A skill listed with `asked_by_the_user_only` is a command (`/sw:kickoff`, `/sw:audit`, `/sw:fix`…): run it only when the user asked for it. What you lose compared with the installed plugin: the hooks (the secrets guard before a commit) and the automatic loading of skills, so read `workflow` and `from-zero` yourself at the start. If the plugin is already installed, the same script is in Claude Code's plugin cache and no clone is needed.

**B. Write the project's settings, so that Claude Code offers the plugin.**

```bash
node <clone>/plugins/core/scripts/sw.mjs enable --modules nextjs,vps
```

It adds the marketplace and the plugins to `.claude/settings.json` of the project and keeps what is already there. Claude Code reads that file when the project is opened: the user restarts the session there and accepts the marketplace. The file can be committed to share the setup with a team. Until the restart, keep using A.

Accepting the marketplace does not always install the plugin: in a real project the marketplace was added on reopening, but `sw@shipwright` was not installed, so no `/sw:` command, skill or hook appeared. B offers the plugin; it does not guarantee it. When the user asked for the installation, C is the sure path. After reopening, check with `node <clone>/plugins/core/scripts/sw.mjs doctor`: it reads Claude Code's files (read only) and says whether the marketplace is known, `sw@shipwright` installed (user or project scope) and enabled for this project, which modules, which hooks are declared, and the versions.

**C. Install it yourself, when the user asked you to install Shipwright.**

```bash
node <clone>/plugins/core/scripts/sw.mjs install            # marketplace, main plugin, modules of the technologies found in the project
node <clone>/plugins/core/scripts/sw.mjs install --modules vps --scope project
```

It runs Claude Code's own command line (`claude plugin marketplace add`, `claude plugin install`) and reports each step. It changes the user's Claude Code configuration, so run it only when the user asked for the installation ("use Shipwright from this repository", "install it") and say that you did. It works from inside a session: the `claude` command normally refuses to start there, to prevent a session inside a session; installing a plugin opens none, and `install` leaves that one variable out of the commands it runs. Do not use that for anything else.

What it cannot do: load the plugin into the session that is already open. End by telling the user, in these words: **type `/reload-plugins`** (or reopen the session). Until they have, keep working with A. If the reload does not start the hooks, the session has to be reopened once.

The same by hand, from a terminal outside any session:

```bash
claude plugin marketplace add 1AngelMicka/quality-pack
claude plugin install sw@shipwright
```

**Which one.** The user gave you the repository link and asked to use or install Shipwright: clone, run C, ask for `/reload-plugins`, and start working with A meanwhile. The user only wants to try it, or there is no `claude` command: A, then B. Whatever the path, `sw.mjs doctor` tells what is really installed and enabled before you say Shipwright is there.

Checked on Claude Code 2.1.45: A, B (the file written is the one `claude plugin install --scope project` writes) and C run from inside a session. Not checked: that `/reload-plugins` starts the hooks without reopening the session.

## 2. Optional extras

Offer these, explain why in one sentence each, and install only with the user's yes.

- **Browser checks and key tasks**: `node <plugin folder>/scripts/sw.mjs browser-setup`, once. It installs Playwright, axe-core and Chromium into the pack's cache, not into the project. `/sw:audit` offers it when needed. Without them, those checks are reported as "not checked".
- **Graphify**, for projects with more than about 60 source files: Claude queries a local code graph instead of re-reading files, which saves tokens. Install with `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project` in the project. It needs Python 3.10 or later.

## 3. First use

In the project, inside Claude Code:

1. `/sw:kickoff`. Claude asks about the project: who it is for, the type (showcase site, web app, SaaS, mobile, API), what it does, the visual direction, and the 2 to 5 key tasks people come for; it writes them as flows the audit will play. It writes `.quality/project.json`, `DESIGN.md` and a section in `CLAUDE.md`. Let the user answer; do not answer for them.
2. `/sw:audit`. The first audit is a full one. It ends with two scores and writes `.quality/AUDIT.md`.
3. `/sw:fix`. It fixes the open blockers first and verifies each fix.
4. Later, `/sw:audit` again. It is incremental: only what changed is checked again.

Cheaper options to mention:
- `/sw:audit quick` runs the automatic checks only.
- `/sw:handoff` writes a short note so the next session resumes without re-exploring the project.

## 4. Common errors

| Symptom | Cause and fix |
| --- | --- |
| "/plugin isn't available in this environment" | Not in Claude Code. Open Claude Code (terminal or desktop app) in the project folder. |
| `/sw:` commands missing after install | Restart Claude Code or run `/reload-plugins`. Check `/plugin` → Installed and the Errors tab. |
| Adding the marketplace fails | git is missing, or there is no GitHub SSH key: set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and retry. |
| `node: command not found` in a hook | Install Node.js 18+ and make sure `node` is on the PATH, then restart Claude Code. |
| A file write is blocked "as a secret" | Intended: the pack blocks API keys and passwords in code. Move the value to an environment variable. If it is truly not secret, add the comment `sw-allow-secret` on that line. |
| Browser checks "not checked" | Playwright or axe-core missing (`sw.mjs browser-setup`), or the app is not running. Start the app locally or add a staging URL in `.quality/project.json` under `urls`. |
| A key task stops at a step | `flows.json` in the audit folder names the step and the error. Fix the selector in `.quality/project.json` › `flows` (`sw.mjs flows --check`), or the bug if it is real. |
| The audit "redoes everything" | Normal on the first audit, after a pack update, after 30 days, or outside a Git repository. |

## 5. Update and uninstall

- Update: `/plugin marketplace update shipwright`. For automatic updates: `/plugin` → Marketplaces → shipwright → Enable auto-update.
- Uninstall: `/plugin uninstall sw@shipwright`, then `/plugin marketplace remove shipwright`. The project keeps its `.quality/` folder until the user deletes it.

## Rules for you, the agent

- Never install anything on the user's machine without saying what it is and getting a yes.
- Never invent commands or flags. Everything you need is in this guide, the [README](https://github.com/1AngelMicka/quality-pack/blob/main/README.en.md) and `/plugin`.
- The pack does not send telemetry. During an audit, it only contacts the project's own URLs. If the user asks about privacy, point to [SECURITY.md](https://github.com/1AngelMicka/quality-pack/blob/main/SECURITY.md).
- The pack helps spot legal obligations (GDPR, legal notices, licences). It is not legal advice: say so if the user relies on it for compliance.
