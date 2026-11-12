# Facto, the pack's reference project

A tiny invoicing app in one file with no dependency, used to prove that the pack's commands work together on a whole application and not only on isolated test pages.

It exists in two states:

| State | Start it | What it is |
| --- | --- | --- |
| draft | `FACTO_DRAFT=1 node server.mjs` | A first attempt: it works when all goes well, and carries the defects the pack must catch |
| careful | `node server.mjs` | The same app with each defect fixed |

`tests/example.test.mjs` starts both, runs the pack's commands on each, and checks that every planted defect is found in the draft and that the careful version passes.

| Planted in the draft | Command that must find it |
| --- | --- |
| A logged-in customer can read another customer's invoice | `qp access` |
| The login says which emails have an account and never slows down | `qp auth` |
| The payment webhook accepts unsigned and forged events | `qp webhooks` |
| No sitemap, no meta description, the same title everywhere, keywords not on the page | `qp seo` |
| No focus indicator, form fields under 16 px, no site icon, unknown addresses answer 200 | `qp craft` |
| Blank list while loading, uncaught error when the server fails, a toolbar that overflows | `qp stress` |
| Invented figures, an invented testimonial, an unearned compliance badge | `qp facts` |

The accounts, passwords and webhook secret in `server.mjs` and `.quality/project.json` are fixtures for this demo: they protect nothing. In a real project, test passwords come from environment variables.

Not covered by this example: a real database, real payments (see `qp billing`), an installed mobile or desktop build.
