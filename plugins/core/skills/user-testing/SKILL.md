---
name: user-testing
description: "Prepares, runs and reports a test of the product with five real people from its audience: who to recruit, the tasks to give (the project's key tasks, as goals and not as instructions), the script, what to note, how to turn what was seen into ranked fixes. Use before a launch, after a redesign, when a score is good but people still struggle, or when the user asks how to know whether the product is usable. The assistant prepares and analyses; a person runs the sessions. FR : test utilisateur, test d'utilisabilité, cinq utilisateurs, faire tester, protocole de test, compte rendu de test."
---

# User testing

The measures of the pack count effort: screens to scroll, controls on screen, actions. They do not see a person read a label, hesitate, and click the wrong thing. A product can pass every check and still lose people on its first screen. Five sessions of twenty minutes show most of what blocks, and nothing else shows it.

The assistant cannot run the sessions. It prepares them, and turns the notes into fixes. Criterion ACT-06 asks for the dated report.

## 1. Prepare

Write `.quality/user-tests/<date>/plan.md` from [templates/plan.md](templates/plan.md):

- **Who.** Five people from the audience named in the promise (`.quality/project.json` › `promise`). Not the team, not friends who heard about the project, not people who already use it for the tasks tested. If the audience has two clear groups (say, the accountant and the client), three of each.
- **Tasks.** The key tasks of `.quality/project.json` › `flows`, three to five, rewritten as goals with a reason, without the words of the interface: "You just finished a job for a client and want to be paid. Do what you would do." Never "click New invoice". Start from a fresh account, with the data a real person would have (their own files if they agree, otherwise realistic samples).
- **Device.** The one they would really use. If the product is used on a phone, test on a phone.
- **What done looks like** for each task, so the observer knows when to stop.

## 2. Run (the user does this)

Give the user the script of the template. The rules that make a session useful:

- One person at a time, twenty to thirty minutes, on their own device when possible.
- Say it once: "We are testing the product, not you. Say what you think as you go."
- Then do not help, do not explain, do not defend. When they ask "what do I do here?", answer "What would you do if I were not here?" Silence is where the findings are.
- Note what they do and say, in their words, with the time: where they stop, what they click first, what they read aloud, what they expected.
- A task is abandoned after about three minutes without progress: note it as failed and move on.
- At the end, two questions: "What was the hardest?" and "What did you expect that was not there?" Do not ask whether they like it or would pay.
- Recording the screen needs their agreement, said before starting; notes alone are enough.

## 3. Report

Ask the user for the notes (pasted, or files in the folder), then write `.quality/user-tests/<date>/report.md` from [templates/report.md](templates/report.md):

1. A table: task × person, with done unaided / done with trouble / failed, and the time.
2. Each problem once, with how many of the five met it, where (screen and element), what they did and said, and a severity: **blocks** (the task failed), **slows** (done with trouble or a wrong path), **irritates** (remarked, no effect on the task).
3. Rank by people affected, then severity. A problem met by one person out of five stays in the list, below.
4. For each of the top problems, the cause in the interface and one change, tied to a criterion when there is one (ERG, UX, CRF) so that the next audit checks it. Do not turn a wish ("I would like a dark mode") into a problem; note wishes apart.
5. What the test did not cover: tasks not given, audience groups not seen, devices.

Do not generalise from five people to percentages. "Three of five did not find Export" is the finding; "60 % of users" is not.

## 4. Fix, then test again

Fix the blocks first. After a change to a screen that blocked people, test that task again with two or three new people: the fix may move the problem. Keep each dated folder; the reports show whether the product is getting easier.

A test with no failed task is possible and is a result: say so, with the tasks and the people, and do not go looking for problems to fill the report.
