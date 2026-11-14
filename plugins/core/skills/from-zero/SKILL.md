---
name: from-zero
description: "The path from an idea to a launched web app or SaaS, in stages with a gate at the end of each: promise and proof that someone wants it, kickoff, foundations (isolation, accounts, threat model), the first key task end to end, design direction and screens, billing, finish, mobile app if any, launch checks, then tests with real people. Says which skill and which command to use at each stage, what must be true before moving on, and what the tools cannot decide. Use when a product starts from nothing, when the user asks where to begin, what comes next, what is missing before launch, or for a plan or roadmap of a web app, SaaS or web app plus mobile app. FR : partir de zéro, par où commencer, feuille de route, plan de lancement, étapes, lancer un SaaS, que manque-t-il avant le lancement."
---

# From zero to launch

A product built in the wrong order gets rebuilt: billing before knowing the plans, features before isolation between customers, visual polish before the screen is organised, a store submission before the payment rules are understood. This skill gives the order, and a gate at the end of each stage: something that can be shown, not an opinion.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs"`, written `sw` below.

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
| 1 | Kickoff | `/sw:kickoff` | `.quality/project.json` (profile, flags, 2 to 5 key tasks), `DESIGN.md` started, what is out of scope written. |
| 2 | Foundations | `saas-foundations` steps 1 and 2, `security-testing` step 1 | Customer model chosen; two test accounts seeded; `sw access` passes on the first resource; `sw threats --check` passes (the model is well formed; cases open before launch are expected here, and `sw threats` with no option, the launch gate, must pass at step 10); `sw supply` has no failed must; CI runs build and tests. Before the first push (which waits for the user's yes), the proof is provisional: the workflow file is written and each of its commands passes locally, run one by one; say "provisional" in the gate and replace it with the first green run once the repository is pushed. |
| 3 | First key task, end to end | build skills, `design-screens` | The main task works with real data from a fresh account, on phone and desktop: `sw flows` completes. Profile `saas` with `public_web`: a minimal public home page exists (what the product does, for whom, a button to create an account), and the root address opened without a session is not only a login form. Styling stays neutral until stage 4, and neutral styling is never shown as a result (see below). |
| 4 | Direction | `design-direction`, `sw bank`, `sw profile` | The site type's expectations read (`sw bank <type>`); the user's references measured (`sw profile <url> <url> --save`); one direction chosen by the user; tokens checked (`sw tokens`); fonts and icons recorded with their licences. |
| 5 | Screens | `design-screens`, `design-review`, `deslop-ui` | Every key task within its effort budgets (`sw flows`: no `over_budget`); the ergonomist's serious findings fixed; `sw deslop` with no high finding. |
| 6 | Money | `saas-foundations` steps 3 to 7 | Plans and rules written; the life cycle is played (`sw billing`: trial end, first payment, declined renewal, cancellation, with the app agreeing at each stage) and forged webhooks are refused (`sw webhooks`); limits enforced on the server; every service email received; cancellation in three steps. |
| 7 | Best version, then finish | `design-variants`, `premium-craft`, `scroll-animation` if used | The screens that carry the product (public home page, main work screen) chosen by the user among versions compared by a blind jury; an art-director review applied; each gap to the references closed or justified (`sw gap`); `sw craft` and `sw stress` with no failed must on **every key screen**; `sw look` not "strong" on public pages; every figure and quote traced to a fact (`sw facts`, no untraced claim); `sw perf` with no failed must on the main pages. This gate does not open on a general impression: one line per screen, with its two commands. |
| 8 | Mobile or desktop app, if any | `mobile-app`, `desktop-app` | Mobile: sales model and storefronts written; key tasks completed on a device (`sw mobile flows`); `sw mobile check` with no failed must; account deletion in the app. Desktop: `sw desktop check` with no failed must; every command exposed to the page read; key tasks played in the real window (`sw flows --attach`); update tested end to end; installers signed. |
| 9 | People | `user-testing` | Five people from the audience did the key tasks unaided; what blocked them is fixed or listed. |
| 10 | Launch | `/sw:audit`, `security-testing`, `seo-launch` | Public pages ready to be found: keywords chosen, `sw seo` with no failed must, site declared in Search Console and sitemap submitted. Full audit: no open blocker in either score; `sw access`, `sw auth` and `sw dast` clean on staging; backups restored once; monitoring alerts reach a person; legal pages published; rollback tried. |
| 11 | After | `/sw:audit --incremental`, `/sw:handoff` | An audit at each release; the threat model reviewed when an entry point, a role or a third party is added. |

### Neutral styling is not a result

Until stage 4 the screens carry no visual decision, and the measures (`sw look`, `sw deslop`, `sw craft`) find nothing wrong with a page that has no design at all: "low" in `sw look` means few signs of a generic look, not a good look. So:

- Never present a neutral screen to the user as the result. When you show that a task works, say first that the look is not designed yet.
- Any screen a visitor sees (public home page, sign-up, pricing, the main work screen) goes through the `design-variants` skill before it is presented as designed: several versions, a blind jury, the user's choice. For a `saas` with `public_web`, run it on the home page as soon as stage 4 has a direction, not at stage 7.

Stages 4 and 5 can swap for a showcase site (direction first). Stage 8 can run beside 5 to 7 once the web key tasks are stable. Nothing else moves: in particular, 2 before 3 (isolation is not retrofitted), 5 before 7 (finish on a badly organised screen is wasted), and the rules of 6 before its code.

### The finishing gate, screen by screen

Stage 7 is where average products stop early. List the key screens (the pages of `flows`, `work_screens`, and each public page), and for each one show:

| Screen | `sw craft` | `sw stress` | By hand |
| --- | --- | --- | --- |
| <address> | must 0 · should n (kept: why) | must 0 · should n (kept: why) | empty state · very long data · error message read |

`sw stress <url>` shows the screen with a slow network, a failing server, texts three times longer, at 320 px, in the dark scheme, with the keyboard only and with scripts off, with a screenshot of each. A screen that starts empty is stressed after the steps that fill it too. The stage is not passed while a screen has a failed "must" or was not run.

## How to run a stage

1. Say which stage this is and what its gate is, in two lines.
2. Do the work with the stage's skill.
3. Show the gate: the command output or the artefact, not "done". If a gate cannot pass because of a real problem (a task over budget, a leak), that is the finding: fix it or bring the choice to the user.
4. Name what the gate did not cover, then propose the next stage.

## When the user wants to go faster

A prototype to show people is a legitimate goal: stages 0, 1, 3, then 9, with neutral styling (shown as such, never as the design) and fake payments. Say what is missing for a launch (2, 6, 10) and write it in `.quality/project.json` › `out_of_scope`, so that a demo is not mistaken for a product.

What cannot be skipped once real people put real data in: stage 2 (isolation, accounts, threat model), the service emails for account recovery, backups, and the legal pages.

## Scope the pack does not cover

Tell the user rather than improvising: accounting and tax advice, contracts and terms written for their case, trademark search, pricing strategy, marketing and distribution. The pack can prepare a checklist of questions for the professional, not the answers.
