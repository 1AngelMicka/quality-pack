---
name: audit
description: "Run a scored quality audit of the current project across the quality pack's domains (or a subset), with evidence for every criterion: key tasks played on a phone and a desktop, an ergonomics review, a counter-check, then .quality/AUDIT.md with two scores (experience, engineering and operations) and prioritised fixes. Incremental by default: only what changed since the last audit is re-checked. FR : audit qualité, noter le projet, vérifier la sécurité, l'ergonomie, l'accessibilité, le SEO…"
disable-model-invocation: true
argument-hint: "[full | quick | group | domain | criterion IDs | blockers] (empty = incremental)"
---

# /qp:audit

Audit the project in the current directory. Arguments: `$ARGUMENTS`. Talk to the user in the project's report language.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"` (written `qp` below). It finds the project root (the folder with `.quality/project.json`) by itself; still run it from the root, and tell every agent to.

## Modes, cheapest first

| Arguments | Mode | Cost |
| --- | --- | --- |
| `quick` | Automatic checks only, no agents | Lowest |
| empty | Incremental: only criteria that the changes since the last audit can affect; the rest is carried over. Falls back to full on the first audit, after a pack update, or when the last full audit is older than 30 days | Low to medium |
| a group, domain, criterion IDs or `blockers` | Scoped: only those criteria; the rest is kept from the last audit | Low to medium |
| `full` | Everything, from scratch | Highest |

Every audit gets its own run folder (`2026-11-11`, then `2026-11-11-2`…): a scoped audit never overwrites an earlier one, and the report compares with the previous run, even the same day.

## 1. Plan

1. If `.quality/project.json` is missing, say so and suggest `/qp:kickoff`, then stop.
2. Run the plan:
   - empty arguments: `qp plan --incremental`;
   - otherwise: `qp plan $ARGUMENTS`.
3. From the JSON, note `run`, `out_dir`, `mode`, `incremental`, `criteria_count`, `groups` (each with its `agent`), `urls`, `flows`, `graph`, `audit_model` and `missing_stack_modules`. Pass `--run <run>` to every later `qp` command. If stack modules are missing, tell the user in one line how to install them.
4. If `incremental.no_changes` is true, nothing changed since the last audit. Run `qp assemble --run <run>`, tell the user the scores are unchanged and that `/qp:audit full` re-checks everything, then stop.
5. If `flows.missing` is set and the plan has the design, product-experience or ergonomics group, tell the user in one line that without key tasks the interface is judged on screens as they load, and ask: declare them now (follow step 3 of `/qp:kickoff`, then continue) or audit without them (ERG-01 fails). If `flows.errors` is not empty, fix the flows first with `qp flows --check`.

## 2. Code graph (Graphify)

If `graph.installed` is true:
- if the graph is missing or `graph.stale` is true, run `qp graph refresh` (code only, no LLM call, no tokens);
- then tell each agent to use the graph.

If Graphify is not installed and `graph.project_size.tier` is `medium` or `large`, mention once that installing it would make audits cheaper (`uv tool install graphifyy`, then `graphify install --project`).

## 3. Collect shared evidence once

Run these before starting the agents, so every agent reads the same evidence instead of re-collecting it:

1. `qp scan --run <run>`, which writes `scan.json` (files ignored by Git are skipped).
2. Choose URLs:
   - For headers, HTTPS and SEO, use `urls.staging` or `urls.production` when set.
   - For browser checks and flows, use the local app if it runs, otherwise staging. Check with `curl -sI <url>`.
   - If the local app is not running and there is an obvious start script, ask the user whether to start it, and run it in the background.
3. `qp web <url> --run <run>`, which writes `web.json`.
4. `qp browser <url> <url>… --run <run>` with the home page and 2 to 4 main pages, which writes `browser.json` and screenshots of pages as they load.
5. If the project has a UI: `qp deslop <url> --run <run>` on the main work screen (spacing and alignment per element at 375, 768, 1440 and 1920 px, including text squeezed into a column a few words wide, `deslop.json`), and `qp look <url> <url>… --run <run>` on the same pages as `browser`, which writes `look.json` (generic-look signals weighted by the project's surface mode, type sizes, line length, small targets).
6. If the project has a UI: `qp craft <url> <url>… --run <run>` on one page of each kind (landing, a work screen with data, a form, a table), which writes `craft.json`: typography details, focus and hover states, transitions, images, icons, site icon, share image and 404 page, as "must" and "should".
7. Security evidence, according to the flags:
   - always: `qp supply --run <run>` (`supply.json`: lockfile, release cooldown, install scripts, pinned CI actions, env files) and, with has_backend, `qp threats` (the threat model in `.quality/threats.json`);
   - has_auth and an `access` block: `qp access --run <run>` on local or staging (`access.json`). It refuses production: only pass `--allow-production` if the user agreed in this conversation, and never when a check writes. With no `access` block, say so in the report: access control was only read, not played;
   - has_auth and an `auth_probe` block, on local or staging only: `qp auth --run <run>` (`auth.json`). It sends failed logins and may lock the test account; tell the user before running it;
   - has_backend or public_web: `qp dast <url> --run <run>` (`zap.json`, passive scan with OWASP ZAP in Docker). If Docker is missing or its image is not there (about 2 GB), ask the user before pulling it; if they decline, the criterion is "unknown" with that reason.
8. native_app: `qp mobile check --run <run>` (`mobile-check.json`, read from the project) and, when an emulator, simulator or device runs with the app installed, `qp mobile flows --run <run>` (`mobile.json`). If Maestro is not installed, the flow files are still written: ask the user before installing it, and otherwise mark MUX-01 "unknown" with that reason. Say which platforms were played.
9. `qp flows --run <run> [--base <url>]`, which plays every key task on a phone and a desktop and writes `flows.json` and a screenshot per step in `flows/`. This is the main evidence for the interface: features, UX, ergonomics, accessibility and responsive criteria rely on it.

If `browser` or `flows` says Playwright is not available, ask the user whether to run `qp browser-setup` (one-time download of Playwright, axe-core and Chromium into the pack's cache, never into the project). Never install them in the project.

In incremental mode, skip `web`, `browser`, `look`, `deslop`, `craft`, `dast` and `flows` when no changed file can affect the pages, styles, headers or server config; skip `access` and `auth` only when no route, middleware, data-access or auth file changed.

A check that could not run is "unknown" with the reason, never "pass". A clean security result is written as "nothing found by these checks", never as "secure".

## 4. Check the criteria

**Quick mode:** do not start agents. For each criterion in the plan:
- if it has a `command`, run `qp run <criterion-id> "<command>" --run <run>`;
- otherwise use the evidence files.

Write `<out_dir>/parts/quick.json` in the auditor format (see the `qp:auditor` agent), then go to step 6.

**Other modes:** launch one subagent per group in the plan, all in the same message so they run in parallel. Use the group's `agent`: `qp:ergonomist` for the ergonomics group, `qp:auditor` for the others. If `audit_model` is not `inherit`, pass it as the subagent's model. Give each one this prompt, filled in:

```
Audit group <group> of the quality pack in <absolute project path>. Run every command from that folder.
Plan: <out_dir>/plan.json (use only the criteria of group <group>). Mode: <mode>. Run: <run>.
Evidence: <out_dir>/scan.json, <out_dir>/web.json, <out_dir>/browser.json, <out_dir>/look.json, <out_dir>/deslop.json, <out_dir>/flows.json and its screenshots in <out_dir>/flows/ (some may be missing).
Code graph: <"available, query it first" or "not available">.
CLI: node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" (pass --run <run>)
Write your results to <out_dir>/parts/<group>.json. Write "fix" in <language>.
```

## 5. Counter-check

Not in quick mode. When the agents have finished, and if the product-experience, design or ergonomics group was checked in this run (not only carried over), launch one `qp:challenger` subagent (same model rule) with:

```
Counter-check the passed interface criteria of run <run> in <absolute project path>.
Plan: <out_dir>/plan.json. Results: <out_dir>/parts/product-experience.json, design.json, ergonomics.json.
Evidence: <out_dir>/flows.json and the screenshots in <out_dir>/flows/, <out_dir>/browser.json.
Write <out_dir>/parts/challenge.json. Write "fix" in <language>.
```

The counter-check can only lower a result, with its own evidence; `assemble` refuses anything else.

## 6. Score and report

1. Run `qp assemble --run <run>`.
2. If assemble prints warnings (an invalid part, a pass without evidence, criteria not returned), fix the part only by re-running that agent. Never edit a result to raise a score.
3. Reply in a few lines:
   - the two scores first: **Experience** and **Engineering and operations**, each with its grade, its change since the previous run and whether it is capped by one of its own blockers;
   - the overall score in one short line;
   - the mode used;
   - the open blockers, grouped by score, each with its fix in one line;
   - the ergonomics review: number of critical and major findings, the worst one in one line;
   - the counter-check: how many passes it lowered, if any;
   - the number of other issues and of criteria not checked;
   - the tokens saved by compact outputs (`token_savings.saved`), if any;
   - `.quality/AUDIT.md` for the full report, `.quality/report.html` to see the scores over time and the screenshots of every step of the key tasks (open it in a browser), and `/qp:fix` to fix the issues by priority.

A score is only worth the evidence behind it: never mark a criterion as passed because it is probably fine.
