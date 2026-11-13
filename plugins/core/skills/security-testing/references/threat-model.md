# Threat model

This file explains how to write `.quality/threats.json` at kickoff: the four questions, every field `sw threats` reads, the questions to ask at each entry point, and how each line of the model becomes a test. Budget 30 to 60 minutes. The result is one JSON file of one or two screens, kept next to the code and reviewed when the product changes.

## The four questions

The method is the one of the OWASP Threat Modeling Cheat Sheet, reduced to what one person can keep up to date.

| Question | What to write | Done when |
| --- | --- | --- |
| 1. What are we building? | `system`, `assets`, `actors`, `entry_points`, `trust_boundaries` | every route group, webhook, upload and admin screen is an entry point |
| 2. What can go wrong? | `abuse_cases`, one line each, from the six questions below | every entry point has at least one abuse case |
| 3. What do we do about it? | `response`, `test` or `why`, `priority` on each abuse case | no abuse case is left without a response |
| 4. Did we do enough? | run `sw threats`, then give the file to a second reader | no error, and the open cases are known |

A diagram is optional. If one helps, draw boxes for actors, processes and data stores, arrows for data flows, and a dotted line wherever trust changes. A photo of a whiteboard is enough.

## Fields of threats.json

Copy `${CLAUDE_PLUGIN_ROOT}/templates/threats.json` and rewrite every value. The file is JSON, not YAML.

| Field | Checked by `sw threats` | How to fill it |
| --- | --- | --- |
| `version` | no | keep `1` |
| `reviewed` | required, a date `YYYY-MM-DD`; warning when older than 180 days | the day the model was last read against the product |
| `system` | required; refused if it still starts with "One sentence", starts with `<` or contains `TODO` | one sentence: what the product does and for whom |
| `assets` | required, non-empty list | what an attacker wants: `{ "id": "A1", "name": "...", "kind": "secret" }`. Kinds used by the template: `secret`, `personal-data`, `money`. Item fields are not checked |
| `actors` | required, non-empty list of strings | `anonymous`, each role, staff, each third party that calls the app |
| `entry_points` | required, non-empty; each `id` present and unique | `{ "id": "E2", "what": "/api/documents/{id}", "auth": "member", "owner": "customer" }`. `auth` is `none`, a role name or `signature`. Add `owner` when the resource belongs to a user or a customer |
| `trust_boundaries` | no | strings such as `"internet → app"`, `"customer A ↔ customer B"`, `"member → admin"` |
| `abuse_cases` | required, non-empty; see below | one object per plausible misuse |

Fields of one abuse case:

| Field | Rule enforced | How to fill it |
| --- | --- | --- |
| `id` | none (used in messages) | `AB1`, `AB2`, ... |
| `actor` | none | one of `actors` |
| `text` | at least 15 characters | "As a member I read another customer's invoice by changing the id." Who, what harm, how |
| `entry` | required; a string or a list; each value must be an existing entry point id | `["E2"]` |
| `response` | one of `mitigate`, `eliminate`, `transfer`, `accept` | see "Responses" |
| `test` | required when `response` is `mitigate` | `access check: <id>`, `sw auth`, a test file path with what it asserts, or `manual: <how>` |
| `why` | required when `response` is `accept` | the reason, who decided, when to revisit |
| `priority` | optional; if present, one of `before-launch`, `before-paying-customers`, `accepted` | see "Priority" |
| `status` | only the value `open` has a meaning | `open` until the test passes, then any other word, for example `done` |

What the command reports: errors (the model is refused), warnings, and a summary with the cases still `open` before launch, the number open for later, the number tested by hand (`test` starting with `manual`) and the number accepted. An open case without `priority` counts as `before-launch`.

What it does not check: that the test named in `test` exists or passes, that `actor` is in `actors`, that the list of entry points is complete, or that the abuse cases are the right ones. Extra fields are ignored. That is why question 4 also needs a person.

## What can go wrong: six questions per entry point (STRIDE)

Ask all six at each entry point and at each arrow that crosses a trust boundary. Write down only the plausible answers.

| Question | Property at stake | SaaS example to write as an abuse case |
| --- | --- | --- |
| Can someone pretend to be another user or system? (Spoofing) | authentication | "As a visitor I take over an account by guessing its password or by using a reset link that never expires." |
| Can someone change data they should not? (Tampering) | integrity | "As a visitor I send a forged payment webhook to get a paid plan." |
| Can someone deny having done something? (Repudiation) | accountability | "As an admin of a customer I delete the team's documents and no log says who did it." |
| Can someone read what they should not? (Information disclosure) | confidentiality | "As a member I read another customer's invoice by changing the id in the address." |
| Can someone make it unavailable or expensive? (Denial of service) | availability | "As a member I run up the AI or email bill with a loop of requests." |
| Can someone gain rights they were not given? (Elevation of privilege) | authorisation | "As a member I add `role: admin` to the profile update and become admin." |

Three places deserve the questions twice in a multi-customer product: every id in an address or a body, every route that lists things, and everything the admin area can do.

## Privacy questions (LINDDUN)

Add them only for flows and stores that carry personal data: profiles, uploaded documents, messages, analytics, logs, exports. Skip them for a product that stores nothing about people beyond a login email. LINDDUN names seven kinds of privacy threat; as questions:

| Kind | Question |
| --- | --- |
| Linking | Can two records or actions be tied to the same person when they should not be (same id across features, same tracking id across customers)? |
| Identifying | Can a person be recognised from data meant to be anonymous or pseudonymous? |
| Non-repudiation | Does the system keep proof of what a person did that the person should be able to deny or erase? |
| Detecting | Can an outsider tell that a person has an account or did something, without seeing the data (answer differs, timing, a public page)? |
| Data disclosure | Is more personal data collected, stored, sent to a third party or shown than the feature needs? |
| Unawareness | Does the person know what is collected, and can they see, correct and delete it? |
| Non-compliance | Does the flow break a rule the product is bound by (consent, retention, where data is hosted)? |

Write the plausible ones as abuse cases like the others: "As support staff I read a customer's documents without a reason being recorded." LINDDUN GO is the lightest form of the method (a deck of threat cards and a sketch of the system). The licence of the cards is not stated on its page: not verified, so the pack uses the seven names only and ships no card text.

## Responses

| `response` | Meaning | What the file must then contain |
| --- | --- | --- |
| `mitigate` | a control reduces the risk | `test`: the check that proves the control works |
| `eliminate` | the feature or the data is removed | nothing more; remove the entry point when it is gone |
| `transfer` | someone else carries it (a payment provider holds the card data) | say who in `text` or `why`; the validator asks for nothing |
| `accept` | the risk stays, knowingly | `why`: the reason, the person who decided, the date to revisit |

Accepting a risk is the user's decision. The agent proposes, records the answer, and never writes `accept` on its own.

## Priority: three buckets

Likelihood times impact is the textbook ranking. It is hard to compute and ignores the cost of the fix, so the pack uses three buckets (a simplification made for this pack, not an OWASP rule).

| `priority` | Use it for | Effect |
| --- | --- | --- |
| `before-launch` | anything that lets one account reach another's data, take over an account, forge a payment or run code | listed by `sw threats` while `status` is `open` |
| `before-paying-customers` | abuse that costs money or availability once people depend on the product (quotas, flooding, missing audit log) | counted as open for later |
| `accepted` | a risk recorded with `response: accept` and a `why` | counted as accepted, never as open |

## Model element → test to write

The model is the test list. For each line below that exists in the model, the test must exist before the abuse case leaves `open`.

| Model element | Test | Pass condition |
| --- | --- | --- |
| Entry point with an `owner` | one access check per method in `.quality/project.json` › `access`, played by `sw access` | owner gets the resource; another customer's account and `anonymous` are refused; no `leak`, no `unclear` |
| Entry point with `auth: <role>` | an access check with every lower role and `anonymous` in `denied_to` | all refused, including the write methods |
| Public auth route (`auth: none`: login, sign-up, reset, one-time code) | `sw auth` for login; the same two probes by hand on the others ([checks.md](checks.md)) | same answer for a known and an unknown account; repeated failures slowed, refused or locked |
| Webhook (`auth: signature`) | a test that posts the event unsigned, with a wrong signature, and a second time with a valid old one | all three refused; the event has no effect |
| Upload | the upload test of [checks.md](checks.md) | active files refused or stored inert; the stored file is served as a download and only to its owner |
| Outbound fetch of a URL given by a user | the SSRF probe list of [checks.md](checks.md), with a local canary listener | every probe refused; the listener receives nothing |
| Usage-billed service (asset of kind `money`: AI, email, SMS) | a quota test: send requests past the limit for one account | the app answers 429 or an explicit refusal before the bill grows; the limit is per account or per customer |
| Personal data store | log check with canary values, backup checks, database role query ([checks.md](checks.md)) | no canary in the logs; backups encrypted and not public; the app role has no admin right |

Name the test in `test` so a reader can find it: `access check: documents-read`, `sw auth`, `tests/webhooks.test: unsigned and replayed events are refused`, `manual: upload .html, open the stored file`.

## When to review

- A new entry point: route group, webhook, upload, import, public page with a form.
- A new kind of data, a new role, a new third party that receives data or calls the app.
- A new AI feature that can call tools or read documents: it acts with someone's rights, so it is an entry point.
- After an incident or a pentest finding: add the abuse case that was missed.
- At the latest every 180 days: `sw threats` warns past that age. Set `reviewed` to the day of the review, even when nothing changed.

## What a second reader should look for

Give the file and the list of routes to someone who did not write it. Ask them to answer these, in order:

1. Is an entry point missing? Compare with the router, the webhooks configured at each provider, and the admin area.
2. Does every resource that belongs to a user or a customer carry `owner`, and does a matching access check exist?
3. For each `mitigate`, does the named test exist, and would it fail if the control were removed?
4. Is any `accept` missing a reason, a name or a date, or accepting something that exposes customer data?
5. Are the routes that list, export or download things covered, not only the ones that read one object by id?
6. Which third parties hold data or keys, and what happens to the product if one of them is compromised?
7. Is anything marked `before-paying-customers` that should block the launch?

Their remarks go back into the file as new abuse cases. Record their name and the date in the commit message; the file has no field for it.

## Sources

- OWASP Threat Modeling Cheat Sheet: four questions, STRIDE, responses, review over time (https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- LINDDUN GO: the seven privacy threat types (https://linddun.org/go/)
- OWASP API Security Top 10, 2023 edition: object, property and function level authorisation, resource consumption (https://api-security.owasp.org/editions/2023/en/0x11-t10)
- OWASP Top 10 for LLM Applications, 2025 edition: unbounded consumption, excessive agency (https://genai.owasp.org/llm-top-10/)
- OWASP ASVS 5.0.0, chapters V8 (authorisation) and V14 (data protection), cited by chapter only (https://github.com/OWASP/ASVS)
