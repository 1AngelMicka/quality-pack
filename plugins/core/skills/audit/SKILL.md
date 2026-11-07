---
name: audit
description: "Run a scored quality audit of the current project across the quality pack's 27 domains (or a subset), with evidence for every criterion, then write .quality/AUDIT.md with the score and prioritised fixes. FR : audit qualité, noter le projet, vérifier la sécurité, l'accessibilité, le SEO…"
disable-model-invocation: true
argument-hint: "[group | domain | criterion IDs | blockers] (empty = full audit)"
---

# /qp:audit

Audit the project in the current directory. Scope requested by the user: `$ARGUMENTS` (empty means everything). Talk to the user in the project's report language.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`.

## 1. Plan

1. If `.quality/project.json` is missing, say so and suggest `/qp:kickoff`, then stop.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" plan $ARGUMENTS`. Note `date`, `out_dir`, `criteria_count`, the groups, `urls` and `missing_stack_modules`.
3. If stack modules are missing, tell the user in one line which ones and how to install them; continue anyway.

## 2. Collect shared evidence once

Run these before starting the auditors, so every auditor reads the same evidence:

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" scan`, which writes `scan.json`.
2. Choose URLs:
   - For headers, HTTPS and SEO, use `urls.staging` or `urls.production` when set.
   - For browser checks, use the local app if it runs, otherwise staging. Check with `curl -sI <url>`.
   - If the local app is not running and the project has an obvious start script, ask the user whether to start it (`{pm} run dev`, or build then start), and run it in the background.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" web <url>`, which writes `web.json`.
4. `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" browser <url> <url>…` with the home page and 2 to 4 main pages, which writes `browser.json` and screenshots. If it reports that Playwright or axe-core is missing, tell the user the install command. The criteria that depend on them will be `unknown` unless the auditors can verify them another way.

If no URL is reachable at all, continue: auditors will inspect the code and mark runtime-only criteria `unknown`.

## 3. Audit each group in parallel

Launch one `qp:auditor` subagent per group in the plan, all in the same message so they run in parallel. Give each one this prompt, filled in:

```
Audit group <group> of the quality pack in <absolute project path>.
Plan: <out_dir>/plan.json (use only the criteria of group <group>).
Evidence: <out_dir>/scan.json, <out_dir>/web.json, <out_dir>/browser.json (some may be missing).
Write your results to <out_dir>/parts/<group>.json.
Write "fix" in <language>.
```

## 4. Score and report

1. When every auditor has finished, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" assemble --date <date>`.
2. If assemble prints warnings (an invalid part, a pass without evidence), fix the part only by re-running that auditor. Never edit a result to raise the score.
3. Reply in a few lines:
   - the overall score, the grade and the change since the last audit;
   - the open blockers, each with its fix in one line;
   - the number of other issues and of criteria not checked, with the reason in one line;
   - `.quality/AUDIT.md` for the full report;
   - `/qp:fix` to fix the issues by priority.

A score is only worth the evidence behind it: never mark a criterion as passed because it is probably fine.
