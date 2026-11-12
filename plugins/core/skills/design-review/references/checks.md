# Specific checks

## Forms

- Labels visible above fields; a placeholder never replaces a label.
- "(optional)" on optional fields; no asterisks.
- Validate when the user leaves the field (or once the input reaches its expected length), remove the error as soon as it is fixed. Inline validation measured: +22 % success, −22 % errors, −42 % time (small study, 22 users). Most sites still show generic error messages: say what is wrong and how to fix it.
- The right input type and `autocomplete` on personal data (WCAG 1.3.5); no information asked twice (WCAG 3.3.7); paste allowed in passwords and codes (WCAG 3.3.8).
- One column. Field width matches the expected input.
- Checkout: about 8 visible fields, one "Full name" field, "Address line 2" collapsed, billing same as delivery by default, guest checkout, total visible before payment (Baymard: 70 % average cart abandonment; extra costs 40 %, forced account 18 %, too long 17 %).

## Confirmations and undo

- A confirmation dialog only for serious or irreversible actions. Its buttons name the result ("Delete 3 photos", "Keep them"), never Yes/No; the destructive choice is never the default.
- Routine actions get undo instead: a dialog that appears too often trains users to click through.
- Typing a word to confirm only for rare, severe actions.

## Accessibility designers break (WCAG 2.2 AA)

| Criterion | Check |
| --- | --- |
| 1.4.3 / 1.4.11 | text 4.5:1 (large 3:1); borders, states and focus 3:1 |
| 1.4.10 | no horizontal scrolling at 320 px wide |
| 1.4.12 | content survives larger line, paragraph, letter and word spacing |
| 2.4.11 | focus never fully hidden by a sticky header, footer or cookie banner |
| 2.5.7 | anything done by dragging can also be done with single taps |
| 2.5.8 | targets at least 24×24 px, or spaced so a 24 px circle on each does not touch another |
| 3.2.6 | help in the same place on every page |
| 3.3.7 | no information asked twice in a process |
| 3.3.8 | no cognitive test to log in; paste and password managers work |
| 4.1.3 | status messages announced (saved, error, results count) |

2.4.13 (focus ring of 2 px at 3:1) is AAA; the pack uses it as a house rule. The European Accessibility Act applies since 28 June 2025 (through EN 301 549, which references WCAG 2.1 AA); WCAG 2.2 AA covers it.

## Generic look

`sw look` gives a tier (low, some, strong) from weighted signals; read the signals, never one alone. In `persuade` mode a strong tier is worth a finding (severity 2 on its own, more if it hides the product). In `operate` mode, only quality signals count: gradient text, emoji as icons, everything animated, hollow wording. The list of signals is dated: see the `design-direction` skill, references/generic-clusters.md.
