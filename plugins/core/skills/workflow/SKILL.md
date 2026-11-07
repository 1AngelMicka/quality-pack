---
name: workflow
description: "Quality pack working method for any coding task in a project that has a .quality/project.json file: understand before coding, smallest complete change, written acceptance criteria, tests for risky logic, verification before saying done. Use whenever you implement, change, refactor or fix something in such a project. FR : méthode de travail, implémenter une fonctionnalité, corriger un bug, modifier le code."
---

# Quality pack working method

The project's `.quality/project.json` gives its promise, profile, flags and stacks. Read it once per session if you have not.

## Before you write code

1. Restate the task in one or two sentences and list your assumptions. If something is ambiguous and a wrong guess would be costly, ask; otherwise pick the most reasonable reading and say which one you took.
2. For a new feature, write its acceptance criteria first (in the task, a spec file or the ticket): what the user can do, what they see in the empty, loading and error cases, what must never happen.
3. Read the code you will touch and list every place your change must reach: callers, types, tests, fixtures, config, translations.
4. Load the build skills of the quality pack for the domains you will touch (`build-product-experience`, `build-design`, `build-security-data`, `build-reliability-quality`, `build-performance-seo`, `build-integrations-payments`, `build-operations`) and the rules skill of the stack you are in.

## While you write code

- Smallest complete change: reuse what the project already has, add no abstraction, option or dependency nobody asked for, and finish every part the task needs.
- Touch only what the task requires. If you see an unrelated problem, mention it instead of rewriting it.
- Never cut: input validation at trust boundaries, authorisation checks, error handling that prevents data loss, accessibility, anything the user asked for.
- Logic with a branch, a loop, money, parsing, permissions or security gets at least one test. A fixed bug gets a test that would have caught it.
- No secret in code. No debug `console.log` left behind. No filler text or invented content.

## Before you say it is done

1. Run the project's typecheck, lint and tests (the stack rules skill lists the commands) and read the output.
2. For UI changes, open the page (Playwright or the browser) at mobile and desktop widths, check the empty, loading and error states, and read the console.
3. Check the "Done means" criteria of the domains you touched.
4. Report in two or three lines: what changed, how you verified it, and anything you skipped or could not check. Never claim a check you did not run.
