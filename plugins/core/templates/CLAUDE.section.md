## Quality pack

This project uses the quality pack (`.quality/project.json` holds its promise, profile, flags and stacks).

- Follow the `qp:workflow` skill for every coding task, plus the `qp:build-*` skills of the domains you touch and the stack rules skill.
- Visual direction: `DESIGN.md`. Use its tokens only, and follow how its references are organised ("What we borrow"), on phone and desktop.
- Designing a screen: `qp:design-screens`; colours, type and tokens: `qp:design-direction`; advice on an existing screen: `/qp:design-review`; spacing and polish, measured before saying it is done: `qp:deslop-ui`.
- Finish, identity and copy before calling a screen done: `qp:premium-craft` (measured with `qp.mjs craft`). Never invent a testimonial, a figure, a customer logo or a badge. Every key screen also goes through `qp.mjs stress` (slow network, failing server, long texts, 320 px, keyboard). For the screens that carry the product, `qp:design-variants` (several versions, blind jury, the user chooses); what excellent sites of this type do: `qp.mjs bank <type>`.
- Accounts, customers, subscriptions, service emails: `qp:saas-foundations`. Security tests on local or staging only: `qp:security-testing` (`qp.mjs access`, `auth`, `dast`, `supply`, `threats`). Installed mobile app: `qp:mobile-app`. Where the project stands and what comes next: `qp:from-zero`.
- When you add a kind of resource or a role, add its check to `.quality/project.json` › `access` in the same change; when you add an entry point, a role or a third party, update `.quality/threats.json`.
- Key tasks: `.quality/project.json` › `flows`. When you change a screen they go through, play them (`qp.mjs flows <id>`) and look at the screenshots.
- Before saying a task is done, run the typecheck, lint and tests, and check the "Done means" criteria of the domains you touched.
- `/qp:audit` scores the project with two scores, experience and engineering (incremental by default), and writes `.quality/AUDIT.md`. `/qp:fix` fixes issues by priority.
- Save tokens: if `graphify-out/graph.json` exists, query the graph before reading files; run long commands through `qp.mjs run`; write `/qp:handoff` before ending a long task.
