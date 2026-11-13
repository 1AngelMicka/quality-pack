---
name: workflow
description: "Shipwright working method for any coding task in a project that has a .quality/project.json file: understand before coding, smallest complete change, written acceptance criteria, tests for risky logic, verification before saying done, and a frugal use of tokens. Use whenever you implement, change, refactor or fix something in such a project. FR : méthode de travail, implémenter une fonctionnalité, corriger un bug, modifier le code."
---

# Shipwright working method

The project's `.quality/project.json` gives its promise, profile, flags and stacks. Read it once per session if you have not.
If `.quality/handoff.md` exists and is recent, read it first: it says where the last session stopped.

## Before you write code

1. Restate the task in one or two sentences and list your assumptions. If something is ambiguous and a wrong guess would be costly, ask. Otherwise pick the most reasonable reading and say which one you took.
2. For a new feature, write its acceptance criteria first (in the task, a spec file or the ticket): what the user can do, what they see in the empty, loading and error cases, what must never happen.
3. Find every place your change must reach: callers, types, tests, fixtures, config, translations (see "Find code cheaply" below).
4. For a new or reorganised screen, use the `design-screens` skill before coding; for colours, fonts, spacing or a new look, the `design-direction` skill; for anything that moves with scrolling, the `scroll-animation` skill; to finish a screen (states, typography details, waiting, identity, copy), the `premium-craft` skill.
5. For accounts, customers, roles, subscriptions or service emails, use the `saas-foundations` skill; for an installed mobile app, the `mobile-app` skill; for a desktop app (Tauri, Electron), the `desktop-app` skill; for public pages to be found on search engines, the `seo-launch` skill. When the project starts from nothing or you do not know what comes next, the `from-zero` skill gives the stages and their gates.
6. Load the build skills of Shipwright for the domains you will touch (`build-product-experience`, `build-ergonomics`, `build-design`, `build-security-data`, `build-reliability-quality`, `build-performance-seo`, `build-integrations-payments`, `build-saas`, `build-mobile`, `build-operations`) and the rules skill of the stack you are in.

## While you write code

- Smallest complete change: reuse what the project already has, add no abstraction, option or dependency nobody asked for, and finish every part the task needs.
- Touch only what the task requires. If you see an unrelated problem, mention it instead of rewriting it.
- Never cut: input validation at trust boundaries, authorisation checks, error handling that prevents data loss, accessibility, anything the user asked for.
- Logic with a branch, a loop, money, parsing, permissions or security gets at least one test. A fixed bug gets a test that would have caught it.
- No secret in code. No debug `console.log` left behind. No filler text or invented content: no testimonial, figure, customer logo or badge that the user did not supply.
- A new kind of resource or a new role gets its line in `.quality/project.json` › `access` in the same change. A new entry point (route, webhook, upload) or third party gets its abuse case in `.quality/threats.json`.
- Before adding a dependency, check on the registry that the exact name exists, how old it is and where its repository is.

## Find code cheaply

- If `graphify-out/graph.json` exists, ask the graph before searching files: `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<name>"`. Then read only the lines it points to.
- Otherwise, use Grep with precise patterns and line numbers, then Read only the needed range (`offset`, `limit`).
- Do not re-read a file that is already in your context and has not changed.
- For commands with long output (tests, lint, builds, audits), use `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" run <label> "<command>"`. You get the exit code and the error lines; the full log stays on disk.

## Before you say it is done

1. Run the project's typecheck, lint and tests (the stack rules skill lists the commands) and read the result.
2. For UI changes, open the page (Playwright or the browser) at mobile and desktop widths, check the empty, loading and error states, and read the console. If the change touches a key task of `.quality/project.json` › `flows`, play it: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" flows <flow-id>`, then look at the screenshots of the steps you changed, on the phone and on the desktop. A screen that passes every check but makes the task long or confusing is not done. Before saying interface work is done, follow the `deslop-ui` skill: `sw.mjs deslop <url>`, fix the high findings, look at the screenshots.
3. If the change touches routes, permissions or data access and the project declares `access`, play it on the local app: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" access`. A leak is a blocker, not a note.
4. For a screen meant to be finished, measure it: `sw.mjs craft <url>` (no failed "must") and `sw.mjs deslop <url>`.
5. Check the "Done means" criteria of the domains you touched.
6. Report in two or three lines: what changed, how you verified it, and anything you skipped or could not check. No recap of the steps, no restating the code. Never claim a check you did not run.

## Long tasks

When a task will continue in another session, or the context is getting long, run `/sw:handoff`. The next session then starts from a short summary instead of exploring the project again.
