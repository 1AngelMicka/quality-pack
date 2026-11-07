## Quality pack

This project uses the quality pack (`.quality/project.json` holds its promise, profile, flags and stacks).

- Follow the `qp:workflow` skill for every coding task, plus the `qp:build-*` skills of the domains you touch and the stack rules skill.
- Visual direction: `DESIGN.md`. Use its tokens only.
- Before saying a task is done, run the typecheck, lint and tests, and check the "Done means" criteria of the domains you touched.
- `/qp:audit` scores the project and writes `.quality/AUDIT.md`. `/qp:fix` fixes issues by priority.
