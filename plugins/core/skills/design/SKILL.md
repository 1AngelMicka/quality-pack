---
name: design
description: "Runs all the design work of the project in the right order with one command: visual direction and tokens if they are missing, how each key screen is organised on phone and desktop, scroll animations if the pages have any, finishing and identity, clean spacing and alignment measured on the real rendering, then a review with the key tasks replayed. Can target one screen, only measure without changing anything, or add the variants and blind jury for the screens that carry the product. FR : tout le design, refaire le design, design complet, vérifier le design, améliorer l'interface."
disable-model-invocation: true
argument-hint: "[check | variants | screen name, flow ID or URL] (empty = the whole interface)"
---

# /sw:design

Do all the design work of the project in order, by chaining the seven design skills. Arguments: `$ARGUMENTS`. Talk to the user in the project's report language.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs"` (written `sw` below), run from the project root. If Playwright is missing, ask the user whether to run `sw browser-setup` (pack cache, not the project). The app must run locally or on a preproduction address: ask for the address if `.quality/project.json` has none.

Each step follows a skill. Before a step, read that skill's file in full and follow it: `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/SKILL.md`. This page only says the order, when to skip a step and what to show the user; the skill says how.

## Arguments

| Argument | What runs |
| --- | --- |
| (empty) | The whole interface: steps 1 to 7 on every key screen |
| a screen name, a flow ID or a URL | Steps 2 to 7 on that screen only; step 1 only if the direction is missing |
| `check` | Measure only, change nothing: step 0, then a report |
| `variants` | Like empty, and step 4 also runs on the screens that carry the product |

Several can be combined: `/sw:design variants pricing`.

## 0. Where the project stands

Read `.quality/project.json` (`surface`, `flows`, `work_screens`, `profile`) and `DESIGN.md`. List the key screens: the screens of `flows`, `work_screens`, and for a public site the home page, pricing and sign-up. Then measure each one, without changing anything:

- `sw tokens` once;
- `sw look <url> --mode <surface>`, `sw deslop <url>` and `sw craft <url>` per screen;
- `sw flows` for the key tasks, phone and desktop.

Open the screenshots. Show the user a short table, one line per screen: generic-look tier, "high" findings of `deslop`, failed "must" of `craft`, tasks over budget. With `check`, stop here and add the three changes that would help most, each with the skill that makes it.

Otherwise, say which steps will run and which are skipped and why, then go on without waiting unless a step below needs the user.

## 1. Direction (`design-direction`)

It also finds the signature moment from the trade and mixes the references axis by axis (DIR-11, DIR-12). Run it when `DESIGN.md` is missing, its tokens say "to define", `sw tokens` fails, or the user asks for a new look. Otherwise skip it and say so. This step needs the user: their references and anti-references, then their choice between the style tiles. Do not invent references to go faster.

## 2. Organisation (`design-screens`)

For each key screen: panes per window width, layout shell, navigation, where the main action and the result sit, phone and desktop separately. Offer the options of `sw patterns` (navigation, sections, effects, motion, features) that fit the site type before building, and write the chosen ones in `DESIGN.md` › "Chosen patterns". Skip a screen whose tasks are within budget in step 0 and whose organisation the user has not questioned.

## 3. Scroll animations (`scroll-animation`)

Only for pages that have, or should have, motion tied to scrolling (mostly public pages in `persuade` mode). Skip it on app screens unless the user asks.

## 4. Variants (`design-variants`)

Only with the `variants` argument, or when the user asks for options. Run it on the screens that carry the product: home page, pricing, the main work screen. It needs the user to choose between finalists. Without the argument, if one of these screens is still in the "generic" tier after step 6, offer it at the end.

## 5. Finishing and identity (`premium-craft`)

Every key screen: states of each control, typography, shadows and radii, loading, dark theme, identity, copy. Until `sw craft` has no failed "must" and each "should" is fixed or justified in `DESIGN.md`.

## 6. Clean rendering (`deslop-ui`)

Every key screen, at every width: spacing, alignment, boxes, controls. Until `sw deslop` has no "high" finding, three passes at most.

## 7. Review (`design-review`)

On the key tasks: replay them on phone and desktop, run the heuristic review and compare with step 0. Fix the findings of severity 3 and 4 that stay within the scope of the request; list the others.

## Report

One table, before and after per screen, with the same columns as step 0. Then:

- what changed, three to six points, each with its cause;
- what was skipped and why;
- what was not checked (states not shown, screens outside the key tasks, real people: that is the `user-testing` skill);
- for the next session, the corrections the user made during this run, written in `DESIGN.md` › "Corrections" once the user has approved them (`design-direction`, step 7).

This command does not change the scores. `/sw:audit design ergonomics` gives the scored view.

## Rules

- Never skip the measures to save time: a step is finished when its check passes, not when the code looks right.
- Ask the user only where a skill says to (references, style tiles, variants). Between those points, keep going.
- The user's instructions and the identity already in `DESIGN.md` come before any recipe of a skill.
- **Defaults, never ceilings.** Every limit in this pack (number of animations, scroll budget, typefaces, radii, generic-look signals, durations…) is a default that gives a good result when nobody asks for more. When the user wants more, build it, and build it well: say its cost once in one sentence (speed, readability, accessibility), then write the choice in `.quality/project.json` › `choices` (`{ "id": "<rule, criterion or check>", "what": "…", "why": "<the user's words>", "date": "…" }`). The measures and the audit then report it as chosen, not as a defect. Never refuse, water down or quietly shrink what the user asked for. Visitors keep their own settings (reduced motion, zoom, keyboard): honouring them never limits what the author builds for everyone else.
- For a long run, write `.quality/handoff.md` (`/sw:handoff`) before the context gets full, with the steps done and the screens left.
