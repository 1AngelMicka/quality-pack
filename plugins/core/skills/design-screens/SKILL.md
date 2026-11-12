---
name: design-screens
description: "Designs how a screen is organised before it is coded: number of panes per window width, layout shell (list-detail, supporting pane, feed), navigation, where the main action and the result sit, and a recipe per task type (editor with preview, wizard, list-detail, settings, checkout, dashboard, search with filters, long form, data table, empty state, first run), separately for phone and desktop. Use when creating or reorganising a screen where users do a task, when a screen is long, crowded or confusing, or when the phone and desktop versions need their own layout. FR : organiser un écran, maquette, mise en page téléphone et ordinateur, onglets ou étapes, éditeur avec aperçu, réglages, paiement, tableau de bord, filtres."
---

# Design a screen

Decide how a screen is organised before writing it, then prove it with the key tasks. Most screens that score well on hygiene and still fail users fail here: everything stacked on one long page, the result out of sight, the main action out of reach.

Read `.quality/project.json` first: `flows` (the key tasks), `work_screens`, `surface` and `profile`. Read `DESIGN.md` › "What we borrow" if it exists: the organisation principles of the references come before any recipe here.

## 1. Write the task, not the page

For the screen you design, write in three lines: the task in the user's words, the decisions the user makes in order, and the result they need to see while deciding. If the screen serves no key task, ask whether it is needed.

## 2. Panes per window width (rule SCR-01, SCR-02)

| Window width | Panes | Typical device |
| --- | --- | --- |
| under 600 px | 1 | phone in portrait |
| 600 to 839 px | 2 at 50/50 at most | large phone in landscape, small tablet, split screen |
| 840 to 1199 px | 2 at 70/30 (or 2/3 and 1/3) | tablet, small laptop window |
| 1200 px and up | 3 possible | desktop |

A phone in landscape is wide but short (height under 480 px): never two panes there. Width classes decide the layout, not "is it a tablet"; they change at runtime (rotation, split screen, a resized window).

## 3. Pick the shell

Choose one of three shells, then a recipe. Details and transitions between widths: [references/shells.md](references/shells.md).

- **List-detail**: two equal kinds of content, a collection and one item (mail, files, orders, settings categories).
- **Supporting pane**: one main content and tools that only make sense next to it (editors, maps, a document and its comments). The main area takes about two thirds.
- **Feed**: many items of the same kind to browse (gallery, catalogue, dashboard cards).

## 4. Navigation and actions (SCR-03 to SCR-05)

- Phone: a bottom bar of 3 to 5 destinations. Wider: a rail or a sidebar; never a bottom bar on a desktop.
- One primary action per view. Secondary actions sit next to the content or in the top bar; rare ones in an overflow menu.
- On a phone, the primary action sits in the lower half of the screen (a bottom action bar), at least 44×44 px. No target under 24×24 px anywhere (WCAG 2.5.8). People touch the centre of the screen most easily; corners need larger targets, and destructive actions sit away from frequent ones.
- Navigation bars navigate, toolbars act: do not mix them.

## 5. Settings and disclosure (SCR-06)

- At most two levels of disclosure (a screen and one level of "more"); deeper than that, usability drops.
- Past about a dozen settings on one screen, group them: tabs or segmented panels when the user jumps between groups, steps when order matters and the steps barely depend on each other, collapsible sections for rare settings. Never one endless page.
- Order settings as the task: what the user decides first comes first. Preselect a recommended option, or offer "choose for me". Put advanced settings apart.
- A preset, theme or template never overwrites what the user already set without saying so and offering undo.

## 6. Apply the recipe for the task

Open the recipe in [references/tasks.md](references/tasks.md): editor with preview, wizard, list-detail, settings, checkout, dashboard, search with filters, long form, data table, empty state, first run. Each gives the phone layout, the desktop layout, the rules with their thresholds and the classic mistakes.

## 7. Write the layout spec, then build

Before coding, write a short spec for the phone and for the desktop, each in a few lines or an ASCII wireframe: panes, where the result is, where the main action is, how settings are grouped, what happens on Back. Check it against the references in DESIGN.md. Then build.

## 8. Prove it

1. If the screen belongs to a key task, play it: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" flows <flow-id>`. Read the summary per device: `over_budget` must be empty, `preview_visible_while_adjusting` at least 0.8 if the flow declares a preview, `primary_visible` true and `primary_in_thumb_zone` true on the phone. If the task has no flow yet, add one (`/sw:kickoff`, step 3, or `sw.mjs record <id>`).
2. Look at the screenshots of each step, phone and desktop, as a user in a hurry.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" look <url>` for targets, line length and type sizes.
4. Compare alternatives with `klm_seconds` from the flow summary: a difference under 20–25 % is a tie (the model is about 21 % off on average); decide on the other criteria then.

## Rules

| ID | Rule | Threshold | Source |
| --- | --- | --- | --- |
| SCR-01 | Panes per width | 1 under 600 px; 2 at 50/50 from 600; 70/30 from 840; 3 from 1200 | Android window size classes, canonical layouts |
| SCR-02 | Phone in landscape | never two panes when height is under 480 px | Android window size classes |
| SCR-03 | Navigation | 3–5 bottom destinations on phone; rail or sidebar wider | Android navigation patterns; Apple HIG tab bars |
| SCR-04 | Primary action | one per view; under the thumb on phone | Android layout patterns; Hoober 2017 |
| SCR-05 | Targets | 44×44 px for primary controls on phone; never under 24×24 | WCAG 2.2 2.5.8; Apple HIG |
| SCR-06 | Disclosure | at most 2 levels; group past ~12 settings | NN/g progressive disclosure |
| SCR-07 | Sheets | one at a time; full height to create content; OK always with Cancel or Back | Apple HIG sheets |
| SCR-08 | Data tables | at most 2 inline actions; edit in a side panel, not a modal; readable first column | NN/g data tables |
| SCR-09 | Checkout | aim for 7–8 visible fields; guest first; total visible before paying | Baymard |
| SCR-10 | Empty states | status, reason, one action; never "no results" before loading ends | NN/g empty states |

The thresholds without a published source (the dozen settings, the 20 % of small targets in `sw look`) are house settings: say so when you rely on them. Sources: [SOURCES.md](../../SOURCES.md).
