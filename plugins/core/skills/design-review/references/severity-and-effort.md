# Severity and effort

## Severity, 0 to 4 (Nielsen)

| Rating | Meaning |
| --- | --- |
| 0 | not a usability problem |
| 1 | cosmetic: fix if there is time |
| 2 | minor: low priority |
| 3 | major: important to fix, high priority |
| 4 | catastrophe: fix before release |

Rate on three factors together: how often it happens, how much it hurts when it does, and whether users get past it once they know (persistence). A problem met by everyone on every visit and that blocks the task is a 4; a problem met once that users learn to avoid is a 1 or 2.

In the audit's ergonomics review, 4 maps to `critical`, 3 to `major`, 1–2 to `minor`.

## Effort of a task

Count, per device, from the flow (`qp flows`): actions (taps, entries, uploads, key presses), decisions (`"decision": true` steps), screens scrolled, the longest page in screens, controls on screen. Add back-navigations and fields typed if you redesign the flow on paper.

Estimate time with the keystroke-level model (Card, Moran and Newell), as `klm_seconds` in the flow summary does:

| Operator | Time |
| --- | --- |
| P, point at a target | 1.1 s |
| B, press | 0.1 s |
| K, key press (average typist) | 0.28 s |
| H, move hand between pointer and keyboard | 0.4 s |
| M, mental preparation before a decision | 1.35 s |

The pack counts a click as P + B, a field as P + B + H + K per character + H, a decision as one M, a screen scrolled as one P. Real web interactions take longer (measured averages: a click about 3.7 s, a date picker about 6.8 s), so use KLM to compare two designs, never to promise a time. Its error is about 21 % on average: a gap under 20–25 % is a tie.

## Response times

| Delay | Requirement |
| --- | --- |
| under 0.1 s | feels instant: direct manipulation, toggles, typing |
| up to 1 s | flow kept; no indicator needed |
| 1 to 10 s | a busy indicator (a light one; no flickering progress bar between 2 and 10 s) |
| over 10 s | percentage done, an estimate and a way to cancel |

Show a loading state only after about 150–300 ms, and keep it at least 300–500 ms once shown, to avoid flicker. A skeleton helps only if it matches the real layout.
