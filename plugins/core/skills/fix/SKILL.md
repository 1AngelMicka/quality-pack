---
name: fix
description: "Fix the issues found by the latest quality pack audit, by priority (blockers first), verifying each fix with the criterion's own check. FR : corriger les problèmes de l'audit qualité, corriger les points bloquants."
disable-model-invocation: true
argument-hint: "[criterion IDs | blockers | number of issues]"
---

# /qp:fix

Fix issues from the latest audit of the project in the current directory. Selection: `$ARGUMENTS`. Talk to the user in the project's report language.

## 1. Pick the issues

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" status --json` and read the report it names (`report_json`). If there is none, suggest `/qp:audit` and stop.
2. Its `issues` list is already sorted: blockers, then major, then minor, with unchecked items last within each level. Each issue says which score it belongs to (`area`: experience or operations). Its `review` list holds the findings of the ergonomics review (IDs `ERG-R01`…), sorted critical, major, minor: treat a critical finding like a blocker and a major one like a major issue.
3. Selection:
   - criterion or finding IDs → those issues;
   - `blockers` → every open blocker;
   - a number N → the first N issues;
   - `experience` or `operations` → the issues of that score, by priority;
   - empty → every open blocker and critical finding, or the first 5 issues and findings if there are none.
4. For `unknown` issues, first try to check the criterion. If it actually passes, record the evidence, and fix only what really fails.
5. Show the list in the order you will work. Ask for confirmation first if there are more than 5 fixes, or if a fix touches data migrations, payments, authentication, deletion of files or production configuration. Otherwise start.

## 2. Fix one issue at a time

For each issue:

1. Read the criterion (its ID is in the build skills and in the run's `plan.json`) or the finding (its screenshot shows the problem), the evidence and the suggested fix.
2. Load the build skill of its group and the stack rules skill, and follow the `workflow` skill.
3. Apply the smallest complete fix.
4. Verify it with the criterion's own check: run the command through `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" run <criterion-id> "<command>"`, re-read the changed lines, or re-run `qp.mjs scan` / `web` / `browser` / `flows <flow-id>` as relevant. For an interface or ergonomics fix, play the flow again and look at the new screenshots on the phone and on the desktop. To find every place a fix must reach, query the Graphify graph first if `graphify-out/graph.json` exists.
5. Append one line to `.quality/fixes.md`: date, criterion ID, what changed (files), how it was verified.

If a fix cannot be done safely (missing access, a decision only the user can make, a risk to data), stop on that issue. Say what is needed and move on to the next one.

## 3. Close

Never edit audit files to mark issues as fixed: the score only changes through an audit.
Reply with what was fixed and verified, what remains, and how to re-score: `/qp:audit` (incremental, re-checks what the fixes changed) or `/qp:audit <IDs>`.
