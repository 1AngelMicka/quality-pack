---
name: from-zero
description: "The path from an idea to a launched web app or SaaS, in stages with a gate at the end of each: promise and proof that someone wants it, kickoff, foundations (isolation, accounts, threat model), the first key task end to end, design direction and screens, billing, finish, mobile app if any, launch checks, then tests with real people. Says which skill and which command to use at each stage, what must be true before moving on, and what the tools cannot decide. Use when a product starts from nothing, when the user asks where to begin, what comes next, what is missing before launch, or for a plan or roadmap of a web app, SaaS or web app plus mobile app. FR : partir de zéro, par où commencer, feuille de route, plan de lancement, étapes, lancer un SaaS, que manque-t-il avant le lancement."
---

# From zero to launch

A product built in the wrong order gets rebuilt: billing before knowing the plans, features before isolation between customers, visual polish before the screen is organised, a store submission before the payment rules are understood. This skill gives the order, and a gate at the end of each stage: something that can be shown, not an opinion.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below.

Use it as a map. Find the stage the project is in (ask, and read `.quality/project.json` and the code), state the next gate, and work towards it. Do not run every stage in one go, and do not skip a gate because the code "looks done".

## What the pack cannot decide

Say this at the start, once. Three things stay with people:

1. **Whether anyone wants it.** The pack checks that the thing is built well, not that it is the right thing. Stage 0 asks for evidence.
2. **Whether people manage to use it.** Measures find effort and defects; only watching five people from the audience shows where they get lost (`user-testing` skill, stage 9).
3. **Whether it resists an attacker.** The checks find known patterns. An independent penetration test comes before the first paying customers (`security-testing` skill).

## Stages

| # | Stage | Skill and commands | Gate: what must be true |
| --- | --- | --- | --- |
| 0 | Promise and evidence | conversation | One sentence: for whom, which problem, which outcome. At least one piece of evidence the user can show (people asked, a waiting list, a paid pilot, their own daily need). No evidence: say so and let the user decide; do not invent a market. |
| 1 | Kickoff | `/qp:kickoff` | `.quality/project.json` (profile, flags, 2 to 5 key tasks), `DESIGN.md` started, what is out of scope written. |
| 2 | Foundations | `saas-foundations` steps 1 and 2, `security-testing` step 1 | Customer model chosen; two test accounts seeded; `qp access` passes on the first resource; `qp threats` passes; `qp supply` has no failed must; CI runs build and tests. |
| 3 | First key task, end to end | build skills, `design-screens` | The main task works with real data from a fresh account, on phone and desktop: `qp flows` completes. Plain styling is fine here. |
| 4 | Direction | `design-direction` | References compared, one direction chosen by the user, tokens checked (`qp tokens`), fonts and icons recorded with their licences. |
| 5 | Screens | `design-screens`, `design-review`, `deslop-ui` | Every key task within its effort budgets (`qp flows`: no `over_budget`); the ergonomist's serious findings fixed; `qp deslop` with no high finding. |
| 6 | Money | `saas-foundations` steps 3 to 7 | Plans and rules written; a test clock plays trial end, renewal, declined card and cancellation; limits enforced on the server; every service email received; cancellation in three steps. |
| 7 | Finish | `premium-craft`, `scroll-animation` if used | `qp craft` with no failed must on each kind of screen; `qp look` not "strong" on public pages; every figure and quote traced to a fact. |
| 8 | Mobile app, if any | `mobile-app` | Sales model and storefronts written; key tasks completed on a device (`qp mobile flows`); `qp mobile check` with no failed must; account deletion in the app. |
| 9 | People | `user-testing` | Five people from the audience did the key tasks unaided; what blocked them is fixed or listed. |
| 10 | Launch | `/qp:audit`, `security-testing` | Full audit: no open blocker in either score; `qp access`, `qp auth` and `qp dast` clean on staging; backups restored once; monitoring alerts reach a person; legal pages published; rollback tried. |
| 11 | After | `/qp:audit --incremental`, `/qp:handoff` | An audit at each release; the threat model reviewed when an entry point, a role or a third party is added. |

Stages 4 and 5 can swap for a showcase site (direction first). Stage 8 can run beside 5 to 7 once the web key tasks are stable. Nothing else moves: in particular, 2 before 3 (isolation is not retrofitted), 5 before 7 (finish on a badly organised screen is wasted), and the rules of 6 before its code.

## How to run a stage

1. Say which stage this is and what its gate is, in two lines.
2. Do the work with the stage's skill.
3. Show the gate: the command output or the artefact, not "done". If a gate cannot pass because of a real problem (a task over budget, a leak), that is the finding: fix it or bring the choice to the user.
4. Name what the gate did not cover, then propose the next stage.

## When the user wants to go faster

A prototype to show people is a legitimate goal: stages 0, 1, 3, then 9, with plain styling and fake payments. Say what is missing for a launch (2, 6, 10) and write it in `.quality/project.json` › `out_of_scope`, so that a demo is not mistaken for a product.

What cannot be skipped once real people put real data in: stage 2 (isolation, accounts, threat model), the service emails for account recovery, backups, and the legal pages.

## Scope the pack does not cover

Tell the user rather than improvising: accounting and tax advice, contracts and terms written for their case, trademark search, pricing strategy, marketing and distribution. The pack can prepare a checklist of questions for the professional, not the answers.
