---
name: handoff
description: "Write a short handoff file (.quality/handoff.md) so the next session resumes the current task without re-exploring the project: goal, decisions, files touched, state, next steps. Use at the end of a session, before /clear, or when the context is getting long. FR : passer le relais, reprendre plus tard, sauvegarder où on en est."
argument-hint: "[what to focus on]"
---

# /sw:handoff

Write `.quality/handoff.md` for the task in progress, so the next session can resume it cheaply. Extra focus from the user: $ARGUMENTS

Keep it under 60 lines. Write facts, not narration. Use the project's report language.

```markdown
# Handoff — <date>

## Goal
<the task in one or two sentences, and its acceptance criteria if any>

## Done
- <what is finished and verified, with how it was verified>

## Decisions
- <decision> — <why, in a few words> (only decisions the next session must not undo)

## Files
- <path>: <what changed or why it matters> (only the files the next step needs)

## State
<what is in progress, what is broken right now, failing tests, uncommitted work>

## Next steps
1. <the very next action>
2. …

## Watch out
- <traps, things that looked wrong but are intended, commands that must not be run>
```

Then:
- Replace any previous `.quality/handoff.md`; keep only the current task.
- Tell the user in one line that the handoff is written. The next session can start with "read .quality/handoff.md and continue".
- When the task is finished, empty the file or delete it, so it does not mislead a later session.
