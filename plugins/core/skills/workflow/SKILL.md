---
name: workflow
description: "Quality pack working method for any coding task in a project that has a .quality/project.json file: understand before coding, smallest complete change, written acceptance criteria, tests for risky logic, verification before saying done, and a frugal use of tokens. Use whenever you implement, change, refactor or fix something in such a project. FR : méthode de travail, implémenter une fonctionnalité, corriger un bug, modifier le code."
---

# Quality pack working method

The project's `.quality/project.json` gives its promise, profile, flags and stacks. Read it once per session if you have not.
If `.quality/handoff.md` exists and is recent, read it first: it says where the last session stopped.

## Before you write code

1. Restate the task in one or two sentences and list your assumptions. If something is ambiguous and a wrong guess would be costly, ask. Otherwise pick the most reasonable reading and say which one you took.
2. For a new feature, write its acceptance criteria first (in the task, a spec file or the ticket): what the user can do, what they see in the empty, loading and error cases, what must never happen.
3. Find every place your change must reach: callers, types, tests, fixtures, config, translations (see "Find code cheaply" below).
4. For a new or reorganised screen, use the `design-screens` skill before coding; for colours, fonts, spacing or a new look, the `design-direction` skill; for anything that moves with scrolling, the `scroll-animation` skill.
5. Load the build skills of the quality pack for the domains you will touch (`build-product-experience`, `build-ergonomics`, `build-design`, `build-security-data`, `build-reliability-quality`, `build-performance-seo`, `build-integrations-payments`, `build-operations`) and the rules skill of the stack you are in.

## While you write code

- Smallest complete change: reuse what the project already has, add no abstraction, option or dependency nobody asked for, and finish every part the task needs.
- Touch only what the task requires. If you see an unrelated problem, mention it instead of rewriting it.
- Never cut: input validation at trust boundaries, authorisation checks, error handling that prevents data loss, accessibility, anything the user asked for.
- Logic with a branch, a loop, money, parsing, permissions or security gets at least one test. A fixed bug gets a test that would have caught it.
- No secret in code. No debug `console.log` left behind. No filler text or invented content.

## Find code cheaply

- If `graphify-out/graph.json` exists, ask the graph before searching files: `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<name>"`. Then read only the lines it points to.
- Otherwise, use Grep with precise patterns and line numbers, then Read only the needed range (`offset`, `limit`).
- Do not re-read a file that is already in your context and has not changed.
- For commands with long output (tests, lint, builds, audits), use `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" run <label> "<command>"`. You get the exit code and the error lines; the full log stays on disk.

## Before you say it is done

1. Run the project's typecheck, lint and tests (the stack rules skill lists the commands) and read the result.
2. For UI changes, open the page (Playwright or the browser) at mobile and desktop widths, check the empty, loading and error states, and read the console. If the change touches a key task of `.quality/project.json` › `flows`, play it: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" flows <flow-id>`, then look at the screenshots of the steps you changed, on the phone and on the desktop. A screen that passes every check but makes the task long or confusing is not done. Before saying interface work is done, follow the `deslop-ui` skill: `qp.mjs deslop <url>`, fix the high findings, look at the screenshots.
3. Check the "Done means" criteria of the domains you touched.
4. Report in two or three lines: what changed, how you verified it, and anything you skipped or could not check. No recap of the steps, no restating the code. Never claim a check you did not run.

## Long tasks

When a task will continue in another session, or the context is getting long, run `/qp:handoff`. The next session then starts from a short summary instead of exploring the project again.
