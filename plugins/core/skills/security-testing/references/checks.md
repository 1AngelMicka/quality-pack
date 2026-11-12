# Checks the CLI does not automate

This file lists the security checks to play by hand or to write as tests, each as "what to try" and "what must happen". All of them are active tests: they send wrong input, create and change data, and can lock accounts. Run them only on local or on staging, with disposable accounts created by seed, and with email, SMS and payment pointed to sandboxes. Never on production, never on a third party.

Marker used below: **(nv)** means the rule comes from memory in the research notes and was not verified on the primary source. Treat it as common practice and read the linked page before making it a hard requirement.

## What the CLI already does

| Command | Covers | Does not cover |
| --- | --- | --- |
| `sw auth` | login only: same status and message for a known and an unknown account, timing as a warning, repeated wrong passwords slowed or refused. Cookie flags (`HttpOnly`, `SameSite`, `Secure` over HTTPS) when `auth_probe.password_env` names the environment variable holding the test account's password | sign-up, reset, one-time codes, everything below |
| `sw access` | declared resources requested by the owner, by the accounts in `denied_to` and by a visitor | mass assignment, list isolation, routes not declared |
| `sw dast` | passive ZAP scan: headers, cookie flags on pages reached without login, information leaks | anything behind login, any attack |
| `sw supply` | lockfile, cooldown, install scripts, pinned actions, `.env` tracked by git | secrets inside the bundle, logs, backups, database roles |

## Password policy

Source: OWASP Authentication Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). ASVS chapter V6.

| Try | Must happen |
| --- | --- |
| Sign up with a 7-character password | refused. Minimum 8 with a second factor, 15 without |
| Sign up with a 64-character password, and one with accents or emoji | accepted |
| Set a 70-character password, then log in with its first 64 characters | login fails (no silent truncation) |
| Sign up with `password1` | refused as a known breached password |

## Session cookies and session life

Source: OWASP Session Management Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). ASVS chapter V7.

| Try | Must happen |
| --- | --- |
| Log in, read the `Set-Cookie` of the session | `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, no `Domain`. Best: name starting with `__Host-` and `Path=/` |
| Look at the session id | at least 64 bits of randomness (16 hex characters or more), never in an address |
| Note the session cookie before login, log in, read it again | the value changed (no session fixation) |
| Log out, then replay a request with the old cookie | 401 or a redirect to login. Clearing the cookie in the browser is not enough |
| Log in on two browsers, change the password in the first, send a request from the second | the second is refused |
| Do the same with a password reset | every older session is refused |
| Change the email or the password without giving the current password | refused: the current password or a fresh second factor is required |
| Leave a session idle, then use it | refused after the idle limit. Cheat sheet values: 15 to 30 minutes for low-risk apps, 2 to 5 for high-value ones, and an absolute limit of 4 to 8 hours. Check the server setting if the clock cannot be moved |
| Open the browser storage after login | no session id, JWT or refresh token in `localStorage` or `sessionStorage` |
| Read the headers of a page showing personal data | `Cache-Control: no-store` |

## Sign-up, reset request and one-time codes

Play the two probes of `sw auth` by hand on each of these routes, with a disposable account.

| Try | Must happen |
| --- | --- |
| Ask for a reset for a known and for an unknown email | same status, same body, similar delay. Same for sign-up with an email already used |
| Send 20 reset requests, 20 sign-ups, 20 magic-link requests in a row | slowed, refused (429) or asked for a challenge before the 20th. One mailbox does not receive 20 emails |
| Enter a wrong one-time code repeatedly | refused after a small number of tries, 10 at most **(nv)**; the code then stops working |

## Reset tokens

Source: OWASP Forgot Password Cheat Sheet **(nv)** (https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). Needs a local mail catcher such as Mailpit so the emails can be read.

| Try | Must happen |
| --- | --- |
| Use a reset link twice | second use refused |
| Use a reset link after its lifetime | refused. One hour or less is common practice **(nv)** |
| Ask for a second link, then use the first | first refused |
| Open the reset page and look at the requests it makes to other hosts | the token is not in a `Referer` header sent to a third party |
| Host-header poisoning: send the reset request with `Host: evil.test`, then again with `X-Forwarded-Host: evil.test`, and read the email in the mail catcher | the link still points to the app's own origin, or the request is refused. `evil.test` never appears in the email |

```bash
curl -s -X POST http://localhost:3000/api/password-reset \
  -H "X-Forwarded-Host: evil.test" -H "Content-Type: application/json" \
  -d '{"email":"qp-reset@example.test"}'
```

## JWT handling

Source: RFC 8725 **(nv)** (https://www.rfc-editor.org/rfc/rfc8725). ASVS chapter V9. Only on tokens issued by the app under test to a test account.

| Try | Must happen |
| --- | --- |
| Send a token whose header says `alg: none`, without signature | 401 |
| Change one claim in the payload, keep the original signature | 401 |
| For an RS256 app: send a token signed as HS256 with the public key as secret | 401 (the server fixes the algorithm, it does not read it from the token) |
| Send an expired token | 401 |
| Send a token with another `aud` or `iss` | 401 |
| Read the token's header and payload | no `kid`, `jku` or `x5u` the client can point elsewhere; no secret and no personal data in the payload |
| Read the signing configuration | an HMAC secret of 256 bits or more, generated at random, not a word |
| Log out, replay the token | refused, or the token lifetime is short and a revocation path is documented |

## CSRF, CORS, open redirects

Sources, all **(nv)**: OWASP CSRF Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), MDN CORS guide (https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS), OWASP Unvalidated Redirects and Forwards Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html).

| Try | Must happen |
| --- | --- |
| CSRF: on each state-changing route that uses a cookie session, replay the request without the CSRF token, with another account's token, and with `Origin: https://evil.test` | all three refused. `SameSite` supplements the token, it does not replace it. APIs that accept only a bearer header are exempt |
| CSRF: look for a `GET` route that changes state | none |
| CORS: send an authenticated request with `Origin: https://evil.test`, `Origin: null`, `Origin: https://app.example.com.evil.test`, `Origin: https://evilapp.example.com` (adapt to the app's domain) | `Access-Control-Allow-Origin` never repeats that origin together with `Access-Control-Allow-Credentials: true` |
| CORS: read the header on authenticated JSON routes | not `*`, unless the route is public on purpose |
| Redirects: on every parameter named `next`, `redirect`, `return`, `returnTo`, `url`, `continue`, `callback` or `dest`, try `https://evil.test`, `//evil.test`, `/\evil.test`, `https://app.example.com@evil.test` | the `Location` host stays the app's own or one on an explicit list. On login and on an OAuth `redirect_uri`, exact match only |

## Requests to internal addresses (SSRF)

Source: OWASP SSRF Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). Applies to every feature that fetches a URL given by a user: outgoing webhooks, avatar by URL, link preview, import, PDF rendering. Start a small HTTP listener on the test machine as a canary, then submit each of these as the URL:

| Probe | Why |
| --- | --- |
| `http://127.0.0.1:<canary port>/` | loopback |
| `http://[::1]/` and `http://[::ffff:127.0.0.1]/` | IPv6 loopback and mapped IPv4 |
| the loopback address written as a decimal or hex number | parser differences |
| `http://169.254.169.254/latest/meta-data/` | cloud metadata address |
| a public URL that answers 302 to the canary | redirects followed after validation |
| `file:///etc/passwd`, `gopher://127.0.0.1/` | schemes other than http and https |

Must happen: every probe is refused with a clear error, and the canary listener logs no request. In the code, expect: an allow list where possible; otherwise loopback, `0.0.0.0/8`, private ranges, `169.254.0.0/16`, `fc00::/7`, `fe80::/10` and mapped IPv6 refused; the name resolved once, every address validated, and the connection made to the validated address; redirects not followed; http and https only.

## File upload

Source: OWASP File Upload Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). ASVS chapter V5.

| Try | Must happen |
| --- | --- |
| Upload an `.html` file and an `.svg` containing a script | refused, or stored and served so they cannot run (see the last two rows) |
| Upload a server script extension (`.php`, `.jsp`) and a double extension (`a.jpg.php`) | refused |
| Upload a file whose content does not match its extension or its declared type | refused: the type is read from the content, not from `Content-Type` |
| Upload a file above the size limit, and a nested archive | refused; the limit also applies to the unpacked size |
| Upload with the filename `../../x` | stored under a random server-side name, outside the web root or on another host |
| Fetch the stored file as its owner | served from another origin or a download handler, with `Content-Disposition: attachment` or a safe type, and `X-Content-Type-Options: nosniff` |
| Fetch it as another account and as a visitor | refused. Add it to `sw access` |

## Mass assignment and error handling

Sources: OWASP Mass Assignment Cheat Sheet **(nv)** (https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html); OWASP Top 10:2025 A10 (https://top10.owasp.org/2025).

| Try | Must happen |
| --- | --- |
| As a normal member, add `role`, `isAdmin`, `tenantId`, `ownerId`, `plan`, `emailVerified` or `price` to a create or update request the member may send, then read the object again | the extra fields are unchanged |
| Read your own profile and a list of users as a member | no password hash, no token, no email of people outside your team |
| Call a list route as two accounts of different customers and compare the ids | no id in common |
| Send malformed JSON, a wrong type, a very large body | 400 or 413 with a short message. No stack trace, no SQL, no file path, no 500 |
| Make a dependency fail (stop the database, or point a provider key to a wrong value on local) | the request is refused. Nothing is granted because a check could not run |

## Secrets and configuration

Sources, all **(nv)**: OWASP Secrets Management Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), OWASP Logging Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), PostgreSQL row security documentation (https://www.postgresql.org/docs/current/ddl-rowsecurity.html). ASVS chapters V13 and V14.

| Try | Must happen |
| --- | --- |
| `git ls-files` filtered on `.env`, then read `.env.example` | only `.env.example` is tracked, and it holds no real value |
| Build, then search the client bundle for the names and prefixes of server keys | none. Variables with a public prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`) hold no secret |
| Start the app with a required secret missing | it stops at boot with a message naming the variable |
| Connect as the app's database role and run the query below | all four columns false; the role does not own the schema and cannot create or drop tables; migrations use another role |
| Multi-customer tables on PostgreSQL with row level security: read `relrowsecurity` and `relforcerowsecurity` in `pg_class` | both true on each customer table. `sw access` remains the proof |
| Request the backup location without credentials | refused |
| Ask where backups are, how they are encrypted, where the key is, and when a restore was last tested | encrypted, key stored apart, a copy off site, a restore date on record. These are answers from the user, not something a tool proves |
| Run the end-to-end flows with canary values (a unique email, password and token), then search the logs | no canary found. Logs do contain login successes and failures, refusals and admin actions, with a user id and a time |

```sql
SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```

## security.txt and disclosure policy

Sources: RFC 9116 (https://www.rfc-editor.org/rfc/rfc9116); OWASP Vulnerability Disclosure Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). Checked on the public host with one GET, so this one is safe on production.

| Try | Must happen |
| --- | --- |
| `curl -si https://<host>/.well-known/security.txt` | 200 over HTTPS, `text/plain` |
| Read the fields | `Contact:` present (email or page), `Expires:` present, in the future and less than one year ahead. Optional: `Policy`, `Preferred-Languages`, `Canonical`, `Encryption`, `Acknowledgments`, `Hiring` |
| Check each host that serves the app | the file applies only to the host it is served from |
| Open the page named in `Policy:` | it states: the channel to report, what a report should contain, which hosts are in scope and which are not (third parties), that good-faith research will not be met with legal threats (take legal advice on the wording), when the reporter gets an acknowledgement, the expected delay before public disclosure (90 days is the usual reference), and how researchers are credited |

ASVS references are to version 5.0.0, by chapter (https://github.com/OWASP/ASVS). The notes hold no requirement ids, so none is given here.
