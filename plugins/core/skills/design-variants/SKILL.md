---
name: design-variants
description: "Raises the quality of a key screen or page by building several versions that really differ, measuring them, and having a blind jury compare them two by two before the user chooses, instead of producing one version and polishing it. Uses the reference bank of the site type and the project's references as the target. Use for the screens that carry the product (landing page, first screen of the app, pricing, the main work screen), when the user wants the best possible result, asks for options or alternatives, or says a screen is fine but not good enough. FR : variantes, plusieurs propositions, comparer des versions, jury, meilleur résultat possible, pas assez bien, aller plus loin, banque de références."
---

# Design variants

One attempt gives the average of what is usually done. The way to land above it is the one studios use: several directions, a comparison, a choice, then the best ideas of the losers carried into the winner. This skill does that for one screen at a time, and keeps the user as the one who chooses.

It costs three builds and a jury, so keep it for the screens that carry the product: usually two to four per project. For the others, build once and finish with `premium-craft`.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below.

## 1. Set the target

A comparison needs something to compare with.

1. **The brief**, in three lines: who arrives on this screen, what they want, what they must be able to do next. Take it from `.quality/project.json` (`promise`, `flows`) and confirm it with the user.
2. **The site type.** `qp bank` lists the types (SaaS marketing site, restaurant, online shop, documentation…); `qp bank <type>` gives what visitors of that type expect, real sites recognised as excellent with what to look at on each, their shared traits, and what to avoid. Open two or three of the sites it lists before designing. They are there to learn from, never to copy: no layout, text or image is taken from them.
3. **The project's own references**, when the user named sites they like: measure them once.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" profile https://reference-one.example https://reference-two.example --save
```

This writes `.quality/references.json`: for each reference, numbers that describe how it is built (type scale, typefaces, share of the first screen taken by images, colour, density) and the range the references share.

## 2. Build three versions that differ in structure

Three versions with three colour schemes are one version. Make them differ in what the screen **is**:

| Axis | Examples |
| --- | --- |
| What leads | the product's real interface · a sentence and nothing else · a result or a number that is true · a person and their words |
| Structure | one column to read · split screen · a grid to scan · a single interactive demo |
| Density | airy, one idea per screen · dense, everything at a glance |
| Voice | plain and factual · warm and direct · technical and exact |

Write the three choices down before coding, one line each, and check that no two share the same lead and the same structure. Each version must meet the type's expectations (`qp bank <type>` › `expects`), use `DESIGN.md`'s tokens if they exist, and use only real content: no invented testimonial, figure or logo (BRD-01).

Build each as a real page (a route, a branch or a standalone HTML file), with real text and real images. A wireframe cannot be judged.

## 3. Shoot and measure

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" variants pricing-page http://localhost:3000/v/one http://localhost:3000/v/two http://localhost:3000/v/three
```

It takes desktop and phone screenshots of each version under shuffled letters (A, B, C), measures each (finish defects, generic-look signals, first-screen composition), lists the pairs to judge, and keeps the key (which letter is which address) in a separate file. Before the jury:

- fix any `finish_must_failed` on every version, so that the jury compares designs and not bugs, then shoot again;
- a version whose generic look is "strong" is rebuilt or dropped: say why.

## 4. Jury

For each pair and each device, start **three** `qp:juror` agents in the same message, so they cannot see each other's votes. Give each one only:

- the brief of step 1;
- the device;
- the two screenshot paths and their letters, in the order listed in `pairs` for half of the jurors and reversed for the others;
- a juror name (`j1`, `j2`, `j3`) and its vote file: `.quality/variants/<name>/votes/<juror>-<pair>-<device>.json`.

Never give a juror the key, the measures, the addresses, or your own opinion. Three versions on two devices are six pairs and eighteen short agents; for two versions, six. If that is too many for the session, judge the desktop only and say so.

Then:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" variants pricing-page --tally
```

It ranks the versions by pairs won, shows where the jurors split, reveals the key, and lists what each loser was said to do better.

## 5. The user chooses

Show the user the two finalists side by side (the screenshots, or the live pages), with for each: why the jury preferred it, what the other does better, and its measures. The jury ranks; it does not decide. If the user prefers the second, or a mix, that is the result.

If the jury split on most pairs, the versions are too close or the brief is unclear: say so rather than declaring a winner.

## 6. Merge, then finish

1. Carry into the chosen version what the others did better (`keeps`), one item at a time, and check after each that it still reads as one idea.
2. Ask a `qp:art-director` agent for a review of the merged screen (desktop and phone screenshots, the brief, the site type): at most seven concrete changes, most of them removals. Apply the ones the user accepts.
3. Compare with the target:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" gap http://localhost:3000/pricing                  # against the project's references
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" gap http://localhost:3000/pricing --type pricing-page   # against the bank
```

A gap is a difference, not a defect. For each one, decide: close it, or keep it and write the reason in `DESIGN.md`. A screen that matches its references on every number and has no idea of its own is not the goal either.

4. Finish with `premium-craft` (measure, states, copy) and the finishing passes (`qp stress <url>`).

## Report

```
Screen: <name>   Type: <site type>   Brief: <three lines>
Versions: A <lead and structure> · B <…> · C <…>
Jury: <n> votes on <n> pairs · ranking A > C > B · split on: <pairs>
Chosen by the user: <letter>, because <their words>
Carried over from the others: <list>
Art director: <changes applied> · left: <changes declined, and why>
Gap to references: <n> properties outside · closed: <…> · kept on purpose: <…>
Not done: <devices not judged, states not shown>
```

Keep `.quality/variants/<name>/` (screenshots, votes, tally): it records why the screen looks the way it does.
