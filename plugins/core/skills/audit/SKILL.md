---
name: audit
description: "Run a scored quality audit of the current project across the quality pack's 27 domains (or a subset), with evidence for every criterion, then write .quality/AUDIT.md with the score and prioritised fixes. Incremental by default: only what changed since the last audit is re-checked. FR : audit qualité, noter le projet, vérifier la sécurité, l'accessibilité, le SEO…"
disable-model-invocation: true
argument-hint: "[full | quick | group | domain | criterion IDs | blockers] (empty = incremental)"
---

# /qp:audit

Audit the project in the current directory. Arguments: `$ARGUMENTS`. Talk to the user in the project's report language.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"` (written `qp` below).

## Modes, cheapest first

| Arguments | Mode | Cost |
| --- | --- | --- |
| `quick` | Automatic checks only, no auditor agents | Lowest |
| empty | Incremental: only criteria that the changes since the last audit can affect; the rest is carried over. Falls back to full on the first audit, after a pack update, or when the last full audit is older than 30 days | Low to medium |
| a group, domain, criterion IDs or `blockers` | Scoped: only those criteria; the rest is kept from the last audit | Low to medium |
| `full` | Everything, from scratch | Highest |

## 1. Plan

1. If `.quality/project.json` is missing, say so and suggest `/qp:kickoff`, then stop.
2. Run the plan:
   - empty arguments: `qp plan --incremental`;
   - otherwise: `qp plan $ARGUMENTS`.
3. From the JSON, note `date`, `out_dir`, `mode`, `incremental`, `criteria_count`, `groups`, `urls`, `graph`, `audit_model` and `missing_stack_modules`. If stack modules are missing, tell the user in one line how to install them.
4. If `incremental.no_changes` is true, nothing changed since the last audit. Run `qp assemble --date <date>`, tell the user the score is unchanged and that `/qp:audit full` re-checks everything, then stop.

## 2. Code graph (Graphify)

If `graph.installed` is true:
- if the graph is missing or `graph.stale` is true, run `qp graph refresh` (code only, no LLM call, no tokens);
- then tell each auditor to use the graph.

If Graphify is not installed and `graph.project_size.tier` is `medium` or `large`, mention once that installing it would make audits cheaper (`uv tool install graphifyy`, then `graphify install --project`).

## 3. Collect shared evidence once

Run these before starting the auditors, so every auditor reads the same evidence instead of re-collecting it:

1. `qp scan`, which writes `scan.json`.
2. Choose URLs:
   - For headers, HTTPS and SEO, use `urls.staging` or `urls.production` when set.
   - For browser checks, use the local app if it runs, otherwise staging. Check with `curl -sI <url>`.
   - If the local app is not running and there is an obvious start script, ask the user whether to start it, and run it in the background.
3. `qp web <url>`, which writes `web.json`.
4. `qp browser <url> <url>…` with the home page and 2 to 4 main pages, which writes `browser.json` and screenshots. If Playwright or axe-core is missing, tell the user the install command.

In incremental mode, skip `web` and `browser` when no changed file can affect the pages, styles, headers or server config.

## 4. Check the criteria

**Quick mode:** do not start auditors. For each criterion in the plan:
- if it has a `command`, run `qp run <criterion-id> "<command>"`;
- otherwise use the evidence files.

Write `<out_dir>/parts/quick.json` in the auditor format (see the `qp:auditor` agent), then go to step 5.

**Other modes:** launch one `qp:auditor` subagent per group in the plan, all in the same message so they run in parallel. If `audit_model` is not `inherit`, pass it as the subagent's model. Give each one this prompt, filled in:

```
Audit group <group> of the quality pack in <absolute project path>.
Plan: <out_dir>/plan.json (use only the criteria of group <group>). Mode: <mode>.
Evidence: <out_dir>/scan.json, <out_dir>/web.json, <out_dir>/browser.json (some may be missing).
Code graph: <"available, query it first" or "not available">.
CLI: node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"
Write your results to <out_dir>/parts/<group>.json. Write "fix" in <language>.
```

## 5. Score and report

1. When every auditor has finished, run `qp assemble --date <date>`.
2. If assemble prints warnings (an invalid part, a pass without evidence, criteria not returned), fix the part only by re-running that auditor. Never edit a result to raise the score.
3. Reply in a few lines:
   - the overall score, the grade and the change since the last audit;
   - the mode used;
   - the open blockers, each with its fix in one line;
   - the number of other issues and of criteria not checked;
   - the tokens saved by compact command outputs (`token_savings.saved`), if any;
   - `.quality/AUDIT.md` for the full report;
   - `/qp:fix` to fix the issues by priority.

A score is only worth the evidence behind it: never mark a criterion as passed because it is probably fine.
