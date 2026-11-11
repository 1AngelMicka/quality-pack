---
name: kickoff
description: "Set up the quality pack in a new or existing project: writes .quality/project.json (promise, profile, flags, stacks, key tasks played by the audit), DESIGN.md and a short CLAUDE.md section. FR : démarrer un projet avec le pack qualité, initialiser, configurer."
disable-model-invocation: true
argument-hint: "[notes about the project]"
---

# /qp:kickoff

Set up the quality pack for the project in the current directory. Talk to the user in their language. Extra notes from the user: $ARGUMENTS

The CLI is `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"` (Node 18+), written `qp` below. Templates are in `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 1. Look before asking

Run `qp detect`, `qp stacks` and `qp graph` (Graphify status and project size: small, medium or large). Read the README and the main entry files if they exist; for a large project, read only the README and the entry points.
If `.quality/project.json` already exists, show its current content in a few lines and ask only what should change. If it has no `flows`, go straight to step 3 for them: an audit without key tasks judges the interface on the empty screen.

## 2. Ask what you cannot detect

Use AskUserQuestion when available (at most 4 questions per call), otherwise ask in plain text. Put what you detected in the question text so the user only confirms or corrects it.

Round 1:
- Surface mode of the screens (has_ui): `persuade` (landing and marketing pages), `operate` (app screens, dashboards, forms) or `read` (documentation). It decides how strict the generic-look check is. Recommend `persuade` for `vitrine`, `operate` otherwise.
- Profile: `vitrine` (showcase site), `webapp`, `saas`, `mobile`, `api`. Recommend the detected one first and give `profile_why`. When detect lists `app_signals` (state, file input, desktop shell, service worker…), the UI is an application: never recommend `vitrine`.
- Report language: fr or en.
- Country of the publisher (drives legal obligations; default FR).
- Stacks: confirm the detected ones (nextjs, node-api, infra-vps, …).

Round 2:
- Flags (multiSelect): list the detected flags in the question and ask which are wrong or missing. Flags: has_ui, has_backend, has_auth, has_user_data, has_db, has_uploads, has_external_api, has_webhooks, has_email, has_payments, uses_paid_services, public_web, self_hosted, multilingual, dark_mode.
- Companion tools (multiSelect), recommended according to the profile and the project size. See "Companion tools" below. Never install them without the user's yes.
- Auditor model: `opus` (recommended: finds what cheaper models miss, such as violations that only show once data is loaded), `fable`, or `inherit` (same as the session). Do not offer `sonnet` or `haiku`: they gave wrong evidence and stayed on empty screens in real audits. Set one of them only if the user asks for it by name.

Then in plain text, in one message:
- The promise in one sentence: for whom, which problem, which outcome. Offer a draft based on what you read; the user corrects it.
- What is out of scope, the success metric, the expected load (concurrent users, peaks).
- If has_ui: the visual direction, following the `design-direction` skill (it can run now or later). In short: ask for 2 or 3 reference sites or apps they like, and for each: what they like in how it **looks** and in how it is **organised** (screen structure, navigation, where the tools are). Then three words for the mood, and what they never want to see. Do not propose a default style.

## 3. Key tasks (has_ui)

The audit plays these tasks in a browser, on a phone and on a desktop, and judges the interface on what it sees at every step. Without them it only sees screens as they load, which is where an empty editor looks fine.

Ask, in plain text:
- The 2 to 5 tasks people come for, in their words ("make a collage from 4 photos and save it", "book a slot", "pay an invoice").
- For each: the screens where the work happens, the test data it needs (files, a test account), what "done" looks like, the result that should stay visible while adjusting (a preview, a total) if any, and the main action.

Then draft the flows yourself from the code (button labels, field labels, routes); do not make the user write selectors. Format: see `flows` in `${CLAUDE_PLUGIN_ROOT}/templates/project.json`.
If the user would rather show the task than describe it, offer `qp record <flow-id> --name "<the task in their words>" [--start /path] [--device mobile]`: a browser opens, they do the task and close the window, and the flow is saved in `.quality/project.json` with the selectors Playwright picked. Then add `decision`, `preview` and `primary` yourself, and copy the files they uploaded into `.quality/fixtures/`.
- Steps take one action each: `goto`, `click`, `fill`, `select`, `check`, `upload`, `press`, `hover`, `wait_for`, `wait`, `expect`, `scroll`. Mark the steps where the user makes a choice with `"decision": true`.
- Selectors use Playwright syntax. Prefer what the user sees: `role=button[name="Save"]`, `role=tab[name="Layout"]`, `text=Saved`; then labels and `data-testid`; avoid CSS classes.
- `preview` and `primary` are selectors for the result and the main action; leave them out when the task has none.
- Test data goes in `.quality/fixtures/`. Use files from the repository or ask the user for some; never use personal files without their yes. Credentials come from environment variables: `"value": "${env:QP_TEST_PASSWORD}"`.
- Devices default to `["mobile", "desktop"]`. Keep both unless the product truly exists on one only.

## 4. Write the files

1. `.quality/project.json`, following `${CLAUDE_PLUGIN_ROOT}/templates/project.json`. Include `package_manager` from detect, `audit_model`, `surface`, the `urls` (local, staging, production) the user knows, `work_screens` and `flows`.
2. If has_ui and there is no `DESIGN.md`: create it from `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`, filled with the direction above. Fill "What we borrow" with principles you can see on a screen, for phone and desktop separately (the audit checks them, criterion ERG-08). Leave tokens the user has not chosen as "to define", never invent a palette silently.
3. Add the section from `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.section.md` to the project's `CLAUDE.md` (create the file if missing; replace the section if it already exists).
4. Add `.quality/audits/*/screens/`, `.quality/audits/*/flows/`, `.quality/audits/*/logs/` and `.quality/logs/` to `.gitignore`. Keep the rest of `.quality/` versioned so scores can be compared over time.

## 5. Check the flows

1. `qp flows --check` validates them without a browser. Fix every error.
2. If the app runs (try `urls.local` with `curl -sI`), play them: `qp flows`. If Playwright is missing, ask the user whether to run `qp browser-setup`: it downloads Playwright, axe-core and Chromium once into the pack's cache, not into the project.
3. Fix the selectors until every run says `completed`. A flow that cannot finish because of a real bug is a finding: keep the flow and tell the user.

## 6. Companion tools

Offer only those that fit. Give the commands; run them only if the user says yes, because they install software on their machine.

| Tool | Offer it when | What it saves or adds | Install |
| --- | --- | --- | --- |
| [Graphify](https://github.com/Graphify-Labs/graphify) | project size medium or large | Claude asks a local code graph instead of searching and re-reading files. The code graph is built locally with no LLM call. | `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project`, then `qp graph refresh`. Optional: `graphify hook install` rebuilds it on every commit. |
| [RTK](https://github.com/rtk-ai/rtk), Apache-2.0 edition `rtk-oss` | long sessions, any size | Compresses the output of everyday shell commands (git, tests, ls) before Claude reads it. Telemetry is off by default. | `brew install rtk-ai/tap/rtk-oss`, or `curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh \| RTK_EDITION=oss sh`, then `rtk init -g`. It adds a global hook to Claude Code: say so. |
| [Cloudflare security-audit](https://github.com/cloudflare/security-audit-skill) | has_auth, has_payments or has_user_data | In-depth security audit for major releases (criterion SEC-11). It is thorough and uses many tokens: run it before a release, not every day. | `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit` |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | profile `vitrine` | A strong anti-generic design method for showcase and marketing sites. | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |
| [Framelink Figma MCP](https://github.com/GLips/Figma-Context-MCP), MIT | the client has mock-ups in Figma | Claude reads the layout, components and styles of a Figma frame instead of guessing from a screenshot. It sends usage analytics by default: say so and set `FRAMELINK_TELEMETRY=off`. | needs a Figma personal access token; see its README for the MCP configuration |
| [reanimate](https://github.com/NiazMorshed2007/reanimate) | the user wants a precise animation inspired by a reference | Records a reference animation and rebuilds it, measuring the gap. Use it as inspiration, never to copy someone's site. | `npx skills add NiazMorshed2007/reanimate -g` |

Record the chosen tools in `.quality/project.json` under `companions`.

## 7. Close

- If a confirmed stack has no installed module, give the install command, e.g. `/plugin install qp-nextjs@quality-pack`.
- If the plugin was added to the project settings in this session, say that its commands load in the next session (or after `/reload-plugins`); until then, run `qp` directly.
- Existing project: suggest running `/qp:audit` now to get the starting scores.
- New project: say that the build skills apply from now on, and suggest the first `/qp:audit` once the first key task works.
Keep the closing message to a few lines.
