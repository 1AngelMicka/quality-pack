---
name: kickoff
description: "Set up the quality pack in a new or existing project: writes .quality/project.json (promise, profile, flags, stacks), DESIGN.md and a short CLAUDE.md section. FR : démarrer un projet avec le pack qualité, initialiser, configurer."
disable-model-invocation: true
argument-hint: "[notes about the project]"
---

# /qp:kickoff

Set up the quality pack for the project in the current directory. Talk to the user in their language. Extra notes from the user: $ARGUMENTS

The CLI is `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"` (Node 18+). Templates are in `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 1. Look before asking

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" detect` and `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" stacks`. Read the README and the main entry files if they exist.
If `.quality/project.json` already exists, show its current content in a few lines and ask only what should change.

## 2. Ask what you cannot detect

Use AskUserQuestion when available (at most 4 questions per call), otherwise ask in plain text. Put what you detected in the question text so the user only confirms or corrects it.

Round 1:
- Profile: `vitrine` (showcase site), `webapp`, `saas`, `mobile`, `api`. Recommend the detected one first.
- Report language: fr or en.
- Country of the publisher (drives legal obligations; default FR).
- Stacks: confirm the detected ones (nextjs, node-api, infra-vps, …).

Round 2:
- Flags (multiSelect): list the detected flags in the question and ask which are wrong or missing. Flags: has_ui, has_backend, has_auth, has_user_data, has_db, has_uploads, has_external_api, has_webhooks, has_email, has_payments, uses_paid_services, public_web, self_hosted, multilingual, dark_mode.

Then in plain text, in one message:
- The promise in one sentence: for whom, which problem, which outcome. Offer a draft based on what you read; the user corrects it.
- What is out of scope, the success metric, the expected load (concurrent users, peaks).
- If has_ui: the visual direction. Ask for 2 or 3 reference sites or apps they like and why, three words for the mood, and what they never want to see. Do not propose a default style.

## 3. Write the files

1. `.quality/project.json`, following `${CLAUDE_PLUGIN_ROOT}/templates/project.json`. Include `package_manager` from detect and the `urls` (local, staging, production) the user knows.
2. If has_ui and there is no `DESIGN.md`: create it from `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`, filled with the direction above. Leave tokens the user has not chosen as "to define", never invent a palette silently.
3. Add the section from `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.section.md` to the project's `CLAUDE.md` (create the file if missing; replace the section if it already exists).
4. Add `.quality/audits/*/screens/` to `.gitignore`. Keep the rest of `.quality/` versioned so scores can be compared over time.

## 4. Close

- If a confirmed stack has no installed module, give the install command, e.g. `/plugin install qp-nextjs@quality-pack`.
- Existing project: suggest running `/qp:audit` now to get the starting score.
- New project: say that the build skills apply from now on, and suggest the first `/qp:audit` once the first main flow works.
Keep the closing message to a few lines.
