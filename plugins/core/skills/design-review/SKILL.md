---
name: design-review
description: "Reviews an existing screen or key task and advises how to improve it, outside the scored audit: plays the task on phone and desktop, measures effort (pages, controls, scrolling, keystroke-level time), runs a heuristic review (Nielsen, Bastien and Scapin) with severity 0 to 4, checks forms, feedback, accessibility and generic-look signals, then proposes two or three reorganisations with their trade-offs and effort gap. Use when the user asks what is wrong with a screen, how to make it more practical or less generic, or to compare two versions. FR : critique d'écran, avis sur l'interface, revue ergonomique, ce qui ne va pas, rendre plus pratique, comparer deux versions."
argument-hint: "[flow-id | URL | screen name]"
---

# Review a screen and advise

Target: `$ARGUMENTS` (a flow ID from `.quality/project.json`, a URL, or a screen the user names). Talk to the user in their language. This review is advice; it does not change the scores (that is `/qp:audit`).

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below. If Playwright is missing, ask the user whether to run `qp browser-setup` (pack cache, not the project).

## 1. Frame it

- The task the screen serves, in the user's words, and who does it how often.
- The surface mode from `.quality/project.json` › `surface` (`persuade`, `operate`, `read`). In `operate` and `read`, convention is a quality: never ask for originality on app screens.
- The references in `DESIGN.md`, look and organisation.

## 2. Measure first

1. The task: `qp flows <flow-id>`. If the task has no flow, write one (or `qp record <id>`) before judging: a review of an empty screen misses what matters. Read the summary per device: `over_budget`, `max_controls_rendered`, `scroll_screens`, `preview_visible_while_adjusting`, `primary_visible`, `primary_in_thumb_zone`, `axe_states_with_serious`, `klm_seconds`.
2. The page: `qp deslop <url>` for spacing, alignment and execution per element (see the `deslop-ui` skill), and `qp look <url> --mode <surface>`: generic-look tier and signals, font sizes and families, radii, line length and height, small targets.
3. The screenshots of every step in `.quality/audits/<run>/flows/`, phone and desktop. Open them; judge phone and desktop separately.

## 3. Heuristic review, in two passes

First pass: walk through the task as a hurried first-time user, without noting anything; understand what the screen asks. Second pass: note each problem against Nielsen's ten heuristics and Bastien and Scapin's eight criteria ([references/heuristics.md](references/heuristics.md)), with the specific checks for forms, feedback and accessibility in [references/checks.md](references/checks.md).

Each finding: the heuristic or criterion, the device, the step and its screenshot, what the user sees, why it is a problem, a severity from 0 to 4 ([references/severity-and-effort.md](references/severity-and-effort.md)).

One reviewer's severities are unreliable; three independent ones averaged are enough. For every finding rated 3 or 4, run two more independent passes (subagents with fresh context, given only the screenshots, the measures and the heuristics, not your findings) and keep the median severity. Say in the report how many passes rated each serious finding.

## 4. Propose reorganisations

For each finding of severity 3 or 4, or a group of related ones, propose two or three options, not one:

- the change, as a short spec or an ASCII wireframe, for the phone and for the desktop (recipes in the `design-screens` skill);
- what it fixes and what it costs (development, a new convention for users, what moves);
- the effort gap: actions, screens scrolled and KLM seconds before and after, estimated from the flow. A gap under 20–25 % is a tie.

Recommend one, say why.

## 5. Report

```
Screen: <name> — task: <task> — mode: <surface>
Measures (phone / desktop): <pages tall> · <controls on screen> · <screens scrolled> · <KLM s> · preview <…> · main action <…>
Generic look: <tier> (<signals>), execution checks: <failing ones>

Findings (most severe first)
1. [4 · Workload] desktop, step 3 — <what the user sees> — <why> (rated by 3 passes: 4, 4, 3)
…

Options for 1
A. <change> — phone: … desktop: … — fixes … — costs … — effort −35 % (KLM 41 s → 27 s)
B. …
Recommendation: A, because …

Not checked: <states not played, devices, real users>
```

Keep it short. Then offer to implement the recommended option and to re-measure: play the flow again and compare the summary before and after.

Before implementing a redesign, keep the current `look.json` (`qp look <url>` writes it in the run folder). After, run `qp look <url> --baseline <that look.json>`: `redesign_guard.missing` lists the links, buttons and fields that disappeared. It must be empty, or each removal must be intended and said; the key tasks must still play to the end.

## Rules

| ID | Rule | Source |
| --- | --- | --- |
| REV-01 | Each finding names a heuristic or criterion, a device, a step, evidence and a severity 0–4 | NN/g severity ratings |
| REV-02 | Severity 3–4 is confirmed by three independent passes (median) | NN/g heuristic evaluation |
| REV-03 | Feedback: visible response within 0.1 s; busy state after 1 s; progress and cancel after 10 s | NN/g response times |
| REV-04 | Effort comparisons: a KLM gap under 20–25 % is a tie | Card, Moran and Newell; KLM error about 21 % |
| REV-05 | Forms: visible labels above fields, "(optional)", validation on leaving the field, `autocomplete` on personal data | GOV.UK; Baymard; WCAG 1.3.5 |
| REV-06 | Focus never fully hidden by a sticky element; a 2 px focus ring at 3:1 (house rule from the AAA criterion) | WCAG 2.2 2.4.11, 2.4.13 |
| REV-07 | Confirmation only for irreversible actions, buttons named by their result, the destructive one never the default; undo for routine actions | NN/g confirmation dialogs |
| REV-08 | Generic look: weighted tiers, never one signal alone; strict in persuade mode only | Krebs 2026; surface modes |
| REV-09 | A redesign keeps every control and every key task: `redesign_guard.missing` empty, flows complete | idea from Nutlope/hallmark |

Sources: [SOURCES.md](../../SOURCES.md).
