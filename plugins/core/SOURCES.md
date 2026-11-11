# Sources

The design skills (`design-screens`, `design-direction`, `design-review`) and the `look`, `tokens` and KLM measures are written in the pack's own words. Thresholds are facts taken from the sources below and cited by rule. No text was copied from other skills. They come from a documented research round in November 2026 (six topics, primary sources preferred); the sources are listed below by topic.

## Standards and guidelines

| Topic | Source | Used in |
| --- | --- | --- |
| Window size classes, canonical layouts, navigation | Android Developers (derived from Material 3): window size classes, canonical layouts, layout and navigation patterns | SCR-01 to SCR-04, shells |
| Tab bars, sheets, targets | Apple Human Interface Guidelines: tab bars, sheets, accessibility | SCR-03, SCR-05, SCR-07 |
| Target size, contrast, text spacing, focus, forms | W3C WCAG 2.2 and its Understanding pages (1.3.5, 1.4.3, 1.4.4, 1.4.8, 1.4.10, 1.4.11, 1.4.12, 2.4.11, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8, 4.1.3) | SCR-05, DIR-02 to DIR-06, REV-05, REV-06, checks |
| WCAG 3 status | W3C WAI, WCAG 3 overview (Working Draft, September 2026) | colour |
| Design tokens | W3C Design Tokens Community Group, Format 2025.10 | DIR-08, tokens-dtcg, `qp tokens` |
| Motion durations and easing | Material 3 motion tokens (AndroidX Compose `MotionTokens.kt`); MDN `prefers-reduced-motion` | DIR-07 |
| Question pages, check answers | GOV.UK Design System | wizard, long form, REV-05 |
| OKLab / OKLCH | Björn Ottosson, "A perceptual color space for image processing" (2020); Evil Martians on OKLCH in CSS | colour, `qp tokens` conversion |
| 12-step colour scale | Radix Colors, "Understanding the scale" (idea of one job per step) | colour |
| Tailwind v4 theme | Tailwind CSS documentation, `@theme` | tokens-dtcg |

## Research

| Topic | Source | Used in |
| --- | --- | --- |
| Progressive disclosure, data tables, empty states, onboarding, wizards, confirmation dialogs, response times, skeleton screens, mood boards, Fitts's law, heuristic evaluation, severity ratings, ten heuristics | Nielsen Norman Group articles | SCR-06, SCR-08, SCR-10, REV-01 to REV-03, REV-07, heuristics |
| Ergonomic criteria | Bastien and Scapin, INRIA technical report RT-0156 (1993) | heuristics |
| Checkout, forms, filtering, search | Baymard Institute (cart abandonment list, checkout form fields 2024, inline validation, product list and filtering) | SCR-09, checkout and search recipes, checks |
| Inline validation | Luke Wroblewski, "Inline validation in web forms", A List Apart | checks |
| Phone grip and touch | Steven Hoober, UXmatters (2013, 2017) | reach and targets |
| Working memory | Cowan (2001), Behavioral and Brain Sciences | heuristics |
| Keystroke-level model | Card, Moran and Newell; operator times and error as summarised in the KLM literature; Sauro's web operators | REV-04, `klmSeconds` |
| Zeigarnik effect | Ghibellini and Meier (2025) meta-analysis | heuristics |
| Style tiles | Samantha Warren, styletil.es | design-direction step 4 |
| Generic look prevalence | Adrian Krebs (2026), deterministic checks on about 1,590 Show HN pages | REV-08, `qp look` |
| Distributional convergence, mode collapse | Anthropic, "Improving frontend design through skills" (2025); Verbalized Sampling, arXiv 2510.01171 | generic-clusters |

## Ideas from other tools (no text copied)

| Idea | From | Licence of the source |
| --- | --- | --- |
| Surface modes (persuade / operate / read) that decide how strict the generic-look check is | Impeccable (Paul Bakaus) | Apache-2.0 |
| A dated list of default clusters, revised over time | Anthropic `frontend-design` skill | Apache-2.0 |
| Deterministic browser checks with rule IDs, JSON output and exit codes | Impeccable `detect`; Taste Skill gate | Apache-2.0; MIT |
| Measuring at fixed phone and desktop widths | Taste Skill; OneRedOak design-review agent | MIT; MIT |
| Dated provenance for data that ages | ui-ux-pro-max | MIT |
| DESIGN.md as persistent design memory | Google `design.md` | Apache-2.0 |
| Elevation values for light and dark themes, accent kept rare | heydamir/unslop (values restated with credit) | CC BY 4.0 |
| Redesign guard: every control must survive a redesign | Nutlope/hallmark (`audit`, `redesign`) | MIT |
| A concept from the product's own world, three directions before committing | Tobi Adonadon, "How to Stop Making your Apps Look Like AI Slop" (article, 2026) | article, no code |
| Spacing audit engine, spacing laws, list of signs of generated UI | the author's own `deslop-ui` skill (ported, translated) | MIT, same author |
| Shader backgrounds: still frame with reduced motion, pause off-screen | scrollshaders.com (observed behaviour) | proprietary site, idea only |

Every link examined for the pack, with its status and licence: `SOURCES.md` at the root of the repository.

House settings without a published validation (adjust them per project): 8 font sizes per page, 5 radii, 20 % of controls under 44 px, about a dozen settings before grouping, every threshold of the generic-look signals.
