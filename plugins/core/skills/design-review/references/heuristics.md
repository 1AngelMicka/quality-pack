# Heuristics

Two grids, used together. Nielsen's ten heuristics (1994, definitions refined in 2020) are the main labels. Bastien and Scapin's criteria (INRIA, 1993: 8 criteria, 18 elementary ones) are finer on workload and grouping, which makes them better for measurable findings. The wording below is a summary, not a quotation.

## Nielsen's ten heuristics

| # | Heuristic | Typical violations on a task screen |
| --- | --- | --- |
| 1 | Visibility of system status | no feedback after a tap; saving with no confirmation; the result of a setting out of sight |
| 2 | Match with the real world | the code's vocabulary on screen; options ordered as the data model, not as the task |
| 3 | User control and freedom | no undo; Back loses the work; a theme overwrites choices with no way back |
| 4 | Consistency and standards | the same thing named twice; a custom control where a platform one exists |
| 5 | Error prevention | destructive action next to Save; free text where a choice would do |
| 6 | Recognition rather than recall | settings hidden behind icons without labels; the user must remember a value from another screen |
| 7 | Flexibility and efficiency | no default, no "choose for me"; experts forced through every step |
| 8 | Aesthetic and minimalist design | every option of every tool on one page; decoration competing with content |
| 9 | Help users recover from errors | a red border without a message; a message that does not say how to fix it |
| 10 | Help and documentation | help that is not where the question arises |

## Bastien and Scapin

| Criterion | Elementary criteria | What to check |
| --- | --- | --- |
| Guidance | prompting · grouping by location · grouping by format · immediate feedback · legibility | does the screen say what to do next; are related controls together and look alike; does each action answer at once; can the text be read |
| Workload | brevity (concision, minimal actions) · information density | number of actions and screens for the task; number of controls shown at once; text the user must read |
| Explicit control | explicit user action · user control | nothing happens without the user's action; the user can interrupt, cancel, go back |
| Adaptability | flexibility · users' experience level | shortcuts and defaults for experts, guidance for newcomers |
| Error management | error protection · quality of error messages · error correction | errors prevented, explained, easy to fix |
| Consistency | — | same place, same name, same behaviour across screens and devices |
| Significance of codes | — | icons, colours and labels mean what users expect |
| Compatibility | — | the screen matches the user's task and habits, including platform conventions |

## Laws worth citing, and how strong they are

| Principle | Evidence | Use |
| --- | --- | --- |
| Fitts's law | strong | bigger and closer targets are faster; an icon and its label form one target; put Submit near the last field. On touch screens, edges are not "infinite" targets |
| Working memory | strong for about 4 items (Cowan 2001), not 7±2 | do not make users hold values between screens; "7±2" does not limit menu length (menus are recognition) |
| Hick–Hyman | holds for simple choice, predicts real menus poorly | fewer equal choices at a decision point; do not cite it to cap a menu |
| Progressive disclosure | well established (NN/g) | two levels at most; a clear label on the way to the second |
| Response times (0.1 / 1 / 10 s) | well established | see checks.md |
| Jakob's law | a maxim | convention first on app screens |
| Aesthetic-usability effect | real, but on perceived ease only | a pretty screen hides problems in tests: measure the task |
| Zeigarnik effect | failed a 2025 meta-analysis | do not cite it; the tendency to resume interrupted tasks (Ovsiankina) holds |
