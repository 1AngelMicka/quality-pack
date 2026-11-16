## Shipwright

This project uses Shipwright (`.quality/project.json` holds its promise, profile, flags and stacks).

- **Defaults, never ceilings.** Every limit in this pack (number of animations, scroll budget, typefaces, radii, generic-look signals, durations…) is a default that gives a good result when nobody asks for more. When the user wants more, build it, and build it well: say its cost once in one sentence (speed, readability, accessibility), then write the choice in `.quality/project.json` › `choices` (`{ "id": "<rule, criterion or check>", "what": "…", "why": "<the user's words>", "date": "…" }`). The measures and the audit then report it as chosen, not as a defect. Never refuse, water down or quietly shrink what the user asked for. Visitors keep their own settings (reduced motion, zoom, keyboard): honouring them never limits what the author builds for everyone else.
- Follow the `sw:workflow` skill for every coding task, plus the `sw:build-*` skills of the domains you touch and the stack rules skill.
- Visual direction: `DESIGN.md`. Use its tokens only, and follow how its references are organised ("What we borrow"), on phone and desktop.
- Designing a screen: `sw:design-screens`; colours, type and tokens: `sw:design-direction`; advice on an existing screen: `/sw:design-review`; spacing and polish, measured before saying it is done: `sw:deslop-ui`.
- Finish, identity and copy before calling a screen done: `sw:premium-craft` (measured with `sw.mjs craft`). Never invent a testimonial, a figure, a customer logo or a badge. Every key screen also goes through `sw.mjs stress` (slow network, failing server, long texts, 320 px, keyboard). For the screens that carry the product, `sw:design-variants` (several versions, blind jury, the user chooses); what excellent sites of this type do: `sw.mjs bank <type>`.
- Accounts, customers, subscriptions, service emails: `sw:saas-foundations`. Security tests on local or staging only: `sw:security-testing` (`sw.mjs access`, `auth`, `dast`, `supply`, `threats`). Installed mobile app: `sw:mobile-app`. Where the project stands and what comes next: `sw:from-zero`.
- When you add a kind of resource or a role, add its check to `.quality/project.json` › `access` in the same change; when you add an entry point, a role or a third party, update `.quality/threats.json`.
- Key tasks: `.quality/project.json` › `flows`. When you change a screen they go through, play them (`sw.mjs flows <id>`) and look at the screenshots.
- Before saying a task is done, run the typecheck, lint and tests, and check the "Done means" criteria of the domains you touched.
- `/sw:audit` scores the project with two scores, experience and engineering (incremental by default), and writes `.quality/AUDIT.md`. `/sw:fix` fixes issues by priority.
- Save tokens: if `graphify-out/graph.json` exists, query the graph before reading files; run long commands through `sw.mjs run`; write `/sw:handoff` before ending a long task.
