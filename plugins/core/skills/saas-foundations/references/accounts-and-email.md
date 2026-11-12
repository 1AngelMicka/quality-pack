# Accounts, service emails and product analytics

This file is for choosing the authentication layer, writing the service emails and setting up the sending domain, and for picking a free tool to read the activation funnel. It gives the authentication rules with their OWASP ASVS 5.0.0 requirement IDs, the free auth options with their licence and their state on 2026-11-12, what each service email must contain, the deliverability rules of the large mailbox providers, and the free tools for templates, analytics and feature flags. Licences and maintenance change: check the repository again before adding a dependency.

## Authentication rules

ASVS is published under CC BY-SA 4.0. The rules below are restated in this file's words; quote the ID in an audit, not the text. L1 rules block any product. L2 rules block a product sold to companies or holding sensitive data. L3 is for information.

| Rule | ASVS ID | Level | Check |
| --- | --- | --- | --- |
| Passwords of 8 characters are accepted, shorter ones refused (15 is the advised minimum) | 6.2.1 | L1 | Sign up with 7, then 8 characters |
| New passwords are compared with a list of at least the 3 000 most common | 6.2.4 | L1 | `password1` is refused |
| No composition rules | 6.2.5 | L1 | A long lowercase passphrase is accepted |
| Passwords of 64 characters or more are accepted | 6.2.9 | L2 | Sign up with 64 characters |
| No forced periodic change | 6.2.10 | L2 | Settings and code |
| Passwords are compared with a breached-password set | 6.2.12 | L2 | A known breached password is refused |
| A written and implemented defence against credential stuffing and guessing, which cannot be used to lock someone out on purpose | 6.1.1, 6.3.1 | L1 | `qp auth`: repeated failures are slowed or refused |
| No default accounts | 6.3.2 | L1 | Seed data and first-run code |
| A second factor is available, and required for sensitive products | 6.3.3 | L2 | TOTP or passkey can be enrolled |
| No hints, no secret questions | 6.4.2 | L1 | Reset flow |
| A reset never skips an enrolled second factor | 6.4.3 | L2 | Reset with a second factor on: still asked |
| Recovering a lost second factor proves identity as strongly as enrolment did | 6.4.4 | L2 | Recovery flow |
| Codes sent by email or SMS: single use, at least 20 bits of entropy, bound to the request, rate-limited, 10 minutes at most | 6.5.1, 6.5.4, 6.5.5, 6.6.2, 6.6.3 | L2 | Reuse a code; use one after 11 minutes |
| Email is not an authentication factor at the highest level | 6.3.6 | L3 | information |
| Session tokens are unique, from a secure random source, 128 bits or more | 7.2.3 | L1 | Provided by the library: do not replace it |
| A new token at login and at re-authentication; the old one ends | 7.2.4 | L1 | Compare the cookie before and after login |
| Logout and expiry end the session on the server, self-contained tokens included | 7.4.1 | L1 | Replay the old cookie after logout: refused |
| Inactivity timeout and absolute lifetime, decided in writing | 7.3.1, 7.3.2 | L2 | Session settings |
| Other sessions can be ended after a password or second-factor change | 7.4.3 | L2 | Change the password, replay another session |
| Admins can end the sessions of one user or of all | 7.4.5 | L2 | Admin area |
| Full re-authentication before changing email, phone, second factor or recovery settings | 7.5.1 | L2 | Change the email in an old session: password asked |
| Users list their sessions and end any of them | 7.5.2 | L2 | Account settings |

Rules without an ASVS number, by method:

- Password reset: same answer and similar timing whether the account exists or not. The token is random, single use, short-lived and stored hashed. No automatic login afterwards. Reset requests never lock the account. Limit requests per account. Email the user when the password changes and offer to end other sessions ([OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).
- Magic links and email codes follow the code rule above. Mail scanners open links, which burns a single-use link: require a click on a confirm button, or send a code.
- Passkeys: offer them beside another method, allow several per account, and keep a recovery path that is not weaker. NIST SP 800-63B-4 accepts synced passkeys at AAL2 and not at AAL3 (reported, not verified on the primary source).
- Social login: attach a social identity to an existing account only when the provider states the email is verified. Use PKCE and `state`.
- Email verification comes before accepting an invitation, before a trial without a card and before claiming a domain.
- Second factor: TOTP and passkeys. Recovery codes are single use and shown once. Organisation admins can require it for members.
- Rate limits: ASVS asks for a written policy and gives no numbers. Limit per IP and per account on login, sign-up, reset, code verification and invitation sending. Answer 429 with `Retry-After`. Libraries: [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) (ISC), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) (MIT), [upstash/ratelimit-js](https://github.com/upstash/ratelimit-js) (MIT).
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter.

Sources: [ASVS 5.0.0 V6](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md), [V7](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md), [NIST SP 800-63B-4, syncable authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable).

## Free and open-source auth options

Never write password hashing, session tokens, OAuth or WebAuthn by hand. Licence and last push were read from each repository on 2026-11-12.

| Option | Type | Licence | State on 2026-11-12 | Verdict |
| --- | --- | --- | --- | --- |
| [Better Auth](https://github.com/better-auth/better-auth) | TypeScript library; plugins for organisations, second factor, passkeys, SSO | MIT | active | first choice for TypeScript |
| [Supabase Auth](https://github.com/supabase/auth) | Server, hosted or self-hosted | MIT | active | recommended with Supabase. Free-tier limits and SAML on paid plans were not verified |
| [Keycloak](https://github.com/keycloak/keycloak) | Identity server | Apache-2.0 | active | recommended when a full identity server is needed; heavy to run |
| [Logto](https://github.com/logto-io/logto) | Identity server with organisations and SSO | MPL-2.0 | active | recommended |
| [Ory Kratos and Hydra](https://github.com/ory/kratos) | Identity server, OAuth2 server | Apache-2.0 | last push 2026-07-29 | usable; check activity |
| [ZITADEL](https://github.com/zitadel/zitadel) | Identity server, multi-organisation | AGPL-3.0 | active | usable as a separate service; AGPL duties if you modify it and offer it over a network |
| [authentik](https://github.com/goauthentik/authentik) | Identity server | MIT core; `enterprise/` under another licence | active | usable, MIT part only |
| [SuperTokens core](https://github.com/supertokens/supertokens-core) | Auth server | Apache-2.0 core; `ee/` separate | active | usable, core only |
| [Casdoor](https://github.com/casdoor/casdoor), [Dex](https://github.com/dexidp/dex) | Identity server; OIDC federation | Apache-2.0 | active | usable |
| [Authelia](https://github.com/authelia/authelia) | SSO portal in front of self-hosted apps | Apache-2.0 | active | not a user store for a SaaS |
| [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn), [Arctic](https://github.com/pilcrowonpaper/arctic) | WebAuthn library; OAuth client helpers | MIT | active | building blocks under a library, never a replacement for one |
| [Auth.js / NextAuth](https://github.com/nextauthjs/next-auth) | TypeScript library | ISC | security patches and urgent fixes only since 2025-09-22, when the Better Auth team took it over | trap: keep it in an existing project, do not start a new one on it |
| [Lucia](https://github.com/lucia-auth/lucia) | Was a library | MIT | deprecated in March 2025; now a guide | trap: read it, never depend on it |
| Stack Auth (repository renamed `hexclave/hexclave`) | Auth platform | MIT client, AGPL-3.0 server | active, renamed | trap: mixed licence per package |
| Hanko | Passkey-first auth | not checked | repository not found | no verdict |

### Excluded

| Item | Reason |
| --- | --- |
| Fief | Elastic License 2.0: source-available with a hosting restriction, not open source. Last push 2025-11-24 |
| Clerk, Auth0, WorkOS, Stytch, Kinde | Proprietary, paid beyond a free tier. Audit them when a project already uses one; never prescribe them |
| PocketBase | Shown as archived on GitHub on 2026-11-12; not investigated |

Source for the Auth.js change: [Better Auth blog](https://better-auth.com/blog/authjs-joins-better-auth).

## Service emails

Each email is triggered by a server event, has a text part, reads without images, and has a reply address that is read or says where to write. No marketing content: one promotional block turns it into a marketing email, with consent and unsubscribe duties.

| Email | Trigger | Must contain |
| --- | --- | --- |
| Verify email | Sign-up, email change | Single-use link or code, its lifetime |
| Password reset | Request | Single-use link, its lifetime, what to do if the request was not theirs. Sent or not, the screen says the same thing |
| Password, email or second factor changed | The change | What changed and when, how to react. For an email change, sent to the old address |
| New sign-in (recommended) | Login from a new device | Device, time, link to the session list |
| Invitation | An admin invites | Who invites, which organisation, the role, the expiry |
| Welcome | Sign-up or activation | One next action |
| Receipt | `invoice.paid` | Amount, period, link to the invoice, legal mentions |
| Payment failed | First `invoice.payment_failed` | Link to update the payment method, the date access stops |
| Trial ending | `customer.subscription.trial_will_end` (3 days by default); 7 days before for trials with a card | End date, amount charged or what is lost, how to cancel |
| Plan changed | Upgrade, downgrade | New plan, new price, effective date |
| Cancellation confirmed | Cancel | Effective date, how long data is kept, how to export, how to come back. In France this confirmation on a durable medium is part of the three-click rule (reported, not verified on the primary source) |
| Renewal reminder | Before an annual renewal | Date, amount, how to refuse. French notice window not confirmed: see [billing.md](billing.md) |
| Export ready, deletion confirmed | Data requests | Link with an expiry; what was deleted and what is kept by law |

## Deliverability

| Rule | Number | Source |
| --- | --- | --- |
| Every sender: SPF or DKIM, valid forward and reverse DNS, TLS, DKIM key of 1024 bits or more | spam rate under 0.3 %, advised under 0.1 % | Google [V] |
| Bulk sender to Gmail: SPF and DKIM and DMARC (`p=none` accepted), with the `From:` domain aligned with the SPF or DKIM domain | from 5 000 messages a day | Google [V] |
| Marketing and subscribed messages: one-click unsubscribe plus a visible link in the body | applies to bulk senders | Google, Yahoo [V] |
| Unsubscribes are honoured | within 2 days | Yahoo [V] |
| Outlook.com, Hotmail, Live: SPF, DKIM and aligned DMARC, or the mail goes to junk and is then rejected with `550 5.7.515` | from 5 000 messages a day, since 2025-05-05 | Microsoft (reported, not verified on the primary source) |

Neither Google nor Yahoo states an exemption for service email. Authentication applies to everything; one-click unsubscribe is worded for marketing and subscribed messages.

Set up and check, with `example.com` as the product's domain:

```bash
dig +short TXT example.com                       # one SPF record that includes the sending service
dig +short TXT <selector>._domainkey.example.com # the DKIM public key (2048 bits advised)
dig +short TXT _dmarc.example.com                # v=DMARC1; p=none; rua=mailto:...
```

Then send one of each email to a Gmail and an Outlook address and open the original message. Expected in `Authentication-Results`: `spf=pass`, `dkim=pass` with `header.d` equal to the `From:` domain or a parent of it, `dmarc=pass`.

- Start DMARC at `p=none` with a `rua` address, read the reports, then move to `quarantine` or `reject`.
- Service email and marketing email use separate subdomains or streams, so a marketing complaint does not sink password resets.
- Marketing and product-update emails carry `List-Unsubscribe: <https://...>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). The endpoint accepts a POST without login.
- Bounces and complaints feed a suppression list.

Sources: [Google sender guidelines](https://support.google.com/a/answer/81126), [Yahoo sender best practices](https://senders.yahooinc.com/best-practices/), [Microsoft, error 550 5.7.515](https://support.microsoft.com/en-au/topic/fix-ndr-error-550-5-7-515-in-outlook-com-34cfe8f8-6fbf-457e-9e8b-9e4dbaf4e0ef).

## Free tools: templates, analytics, flags

"Open core" below means the repository mixes an open licence with a directory under a commercial one. Use the open part only, and never copy code from `ee/` or `enterprise/`.

| Tool | Use | Licence | Caveat |
| --- | --- | --- | --- |
| [React Email](https://github.com/resend/react-email) | Email templates as components | MIT | The Resend sending service is a separate, paid product |
| [MJML](https://github.com/mjmlio/mjml) | Responsive email markup | MIT | none |
| [Listmonk](https://github.com/knadh/listmonk), [Plunk](https://github.com/useplunk/plunk) | Self-hosted sending, newsletters | AGPL-3.0 | Run as a separate service |
| [Novu](https://github.com/novuhq/novu) | Notification infrastructure | MIT core | Open core: enterprise packages are proprietary |
| [PostHog](https://github.com/PostHog/posthog) | Product analytics, funnels, flags, replay | MIT except `ee/` | Open core. Cloud free quotas not verified |
| [Umami](https://github.com/umami-software/umami) | Web analytics, events | MIT | none |
| [Plausible](https://github.com/plausible/analytics), [OpenPanel](https://github.com/Openpanel-dev/openpanel) | Web analytics with goals and funnels; product analytics | AGPL-3.0 | Free when self-hosted; Plausible cloud is paid |
| [Matomo](https://github.com/matomo-org/matomo) | Web analytics | GPL-3.0 | Free when self-hosted |
| [OpenFeature](https://github.com/open-feature) | Vendor-neutral flag API | Apache-2.0 | Code against it, so the flag provider can change |
| [GrowthBook](https://github.com/growthbook/growthbook) | Flags, experiments | MIT except enterprise directories | Open core |
| [Flagsmith](https://github.com/Flagsmith/flagsmith), [Unleash](https://github.com/Unleash/unleash) | Flags | BSD-3-Clause; AGPL-3.0 | none |
| [rrweb](https://github.com/rrweb-io/rrweb), [OpenReplay](https://github.com/openreplay/openreplay) | Session replay | MIT; AGPL-3.0 with MIT parts, `ee/` separate | Replay records personal data: consent first |

Sending services (Postmark, SendGrid, Mailgun, Resend, Amazon SES) are proprietary and paid beyond a free tier. They are infrastructure the owner chooses and pays for; this skill does not prescribe one.

Rules for use: billing events are recorded on the server from webhooks, never from the browser. A flag is not a permission, and anything tied to a plan is evaluated on the server. Remove stale flags. Analytics follows the consent rules of the privacy domain.

### Excluded

| Item | Reason |
| --- | --- |
| Flipt | Fair Core License (FCL-1.0-MIT): source-available, not open source until its conversion date |
| Sentry self-hosted | FSL-1.1-Apache-2.0: source-available, becomes Apache-2.0 after 2 years. Not open source today |
| Mixpanel, Amplitude, LaunchDarkly, Statsig, Userpilot, Appcues | Proprietary |
