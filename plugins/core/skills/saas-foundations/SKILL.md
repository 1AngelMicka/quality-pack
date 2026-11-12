---
name: saas-foundations
description: "Builds the parts every SaaS needs and that are costly to add late: the customer model and data isolation between customers, organisations with members, roles and invitations, authentication through a maintained library, subscriptions (trial, plan limits, failed payments, plan changes, cancellation, invoices and VAT), service emails, onboarding to the activation event, account settings with export and deletion, support tools, pricing and trust pages. Use at the start of any product with accounts or paying customers, and whenever one of these parts is added, changed or reviewed. FR : SaaS, multi-tenant, cloisonnement des données, organisation, membres, rôles, invitations, authentification, abonnement, essai gratuit, offres et limites, paiement échoué, résiliation, factures, TVA, onboarding, activation, emails de service, export et suppression du compte."
---

# SaaS foundations

A SaaS fails in a few known places: one customer reads another's data, a plan limit only exists in the interface, a failed payment silently cuts access, nobody can cancel without writing to support. These parts are cheap at the start and expensive later, so they come before the features.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below. The criteria are in the referential: accounts (ACC), subscriptions (SUB), activation (ACT). Flags in `.quality/project.json`: `multi_tenant` when customers are organisations with members, `has_subscriptions` when plans renew.

## Order of work

Each step is usable before the next one starts. Do not reorder 1 and 2 after the features: retrofitting isolation means touching every query.

| Step | What exists when it is done | Proof |
| --- | --- | --- |
| 1. Customer model and isolation | Every customer-scoped table carries its key; access is filtered in the data layer; two test accounts are seeded | `qp access` passes on one resource of each kind |
| 2. Accounts | Sign-up, login, reset, verification, sessions through a maintained library; organisations, roles and invitations if `multi_tenant` | `qp auth` passes; invitation and last-owner tests |
| 3. Subscriptions | Plans, checkout, signed webhooks → entitlements table → limits enforced on the server | Test clock: trial end, renewal, declined card, cancellation |
| 4. Service emails | Every email of the list below, sent from an authenticated domain | Each one triggered and received |
| 5. First session | A fresh account reaches the activation event without a blank screen | A flow from a fresh account (`qp flows`) |
| 6. Self-service account | Profile, security, notifications, billing, plan change, cancellation | Cancellation in three steps at most |
| 7. Leaving | Export in a machine-readable format, account deletion | Both run on a test account |
| 8. Support tools | Admin area with time-boxed, logged impersonation | Log line after one use |
| 9. Public pages | Pricing that matches checkout, security page, legal pages | Amounts compared with checkout |
| 10. Operations pages | Status page, dated changelog | Linked from the footer |

Not before a customer asks for it by contract: SSO/SAML, SCIM, custom roles, one database per customer, a SOC 2 audit. Say so when the user asks for them on day one, and keep the door open (roles on the membership, an audit log from the start).

## 1. Isolation between customers

Read [references/tenancy.md](references/tenancy.md) before writing the first table. The short version:

- Put the customer key on every customer-scoped table and filter in the data layer: Postgres row-level security, or a data-access layer that cannot be called without a customer. A check written in each route handler will be forgotten in one.
- A customer identifier coming from the browser only selects among the customers the user belongs to. The server re-checks membership on every request.
- Carry the customer everywhere a request hands work over: cache keys, background jobs, storage paths, signed links, search indexes, exports.
- Declare the two-account test as soon as the first resource exists, in `.quality/project.json` › `access`:

```json
"access": {
  "accounts": {
    "alice": { "login": [{ "goto": "/login" }, { "fill": { "selector": "role=textbox[name=\"Email\"]", "value": "alice@test.local" } },
                          { "fill": { "selector": "role=textbox[name=\"Password\"]", "value": "${env:QP_TEST_PASSWORD}" } }, { "click": "role=button[name=\"Log in\"]" }, { "expect": "text=Dashboard" }] },
    "bob":   { "headers": { "Authorization": "Bearer ${env:QP_TEST_BOB_TOKEN}" } }
  },
  "checks": [
    { "id": "invoice", "path": "/api/invoices/inv_alice_1", "owner": "alice", "denied_to": ["bob", "anonymous"], "secret": "ACME-2026-001" },
    { "id": "invoice-delete", "method": "DELETE", "path": "/api/invoices/inv_alice_1", "owner": "alice", "denied_to": ["bob"] },
    { "id": "admin", "path": "/api/admin/users", "owner": "alice", "denied_to": ["bob", "anonymous"] }
  ]
}
```

`qp access` asks for each resource as its owner (it must answer, and contain `secret` when given), then as every account in `denied_to` and as a visitor. Refused means 401, 403, 404 or a redirect. A 200 with the owner's answer, or an accepted write, is a leak and the command exits with code 2. Declare one check per kind of resource and per role, and two for writes (update, delete). Alice and Bob belong to two different customers; for roles, add a member and an admin of the same customer. Run it on local or staging; it refuses production unless the user agreed. Put the same command in CI so a leak blocks deployment.

A clean result covers the declared resources only. When you add a kind of resource, add its check in the same change.

## 2. Accounts

- Use a maintained library or identity server; never write hashing, tokens or sessions. Check its licence and last release before choosing: [references/accounts-and-email.md](references/accounts-and-email.md) lists free options and the traps (some are no longer developed, some are not open source).
- Passwords: 8 characters minimum, 64 or more accepted, no composition rules, refuse the most common ones. Offer a passkey or TOTP as second factor.
- A failed login, a reset request and a sign-up answer the same way whether the account exists or not, and repeated failures are slowed or refused. Declare the probe and run `qp auth` (local or staging only: it sends wrong passwords and may lock the test account):

```json
"auth_probe": { "login": { "path": "/api/auth/login", "body": { "email": "{email}", "password": "{password}" } }, "known_email": "probe@test.local", "password_env": "QP_TEST_PASSWORD" }
```

- Verify the email before invitations, card-less trials and anything sensitive. Reset links and codes are random, single-use and short-lived, and never bypass the second factor.
- Logout and password change end the sessions on the server. Sessions are listed in the account, with remote sign-out.
- If `multi_tenant`: roles live on the membership; the last owner cannot leave, be demoted or be deleted; invitations are single-use, bound to the invited email, expiring, revocable, and never grant more than the inviter's role; removing a member takes effect on their open sessions and API keys.

## 3. Subscriptions

Read [references/billing.md](references/billing.md) before the first checkout. The rules that are broken most often:

- One source of truth: an entitlements table on the server, written by the provider's signed webhooks. Never grant access from the return page or from a value the browser sends.
- Enforce every plan limit where the write happens, on the server. The interface only announces it.
- Webhooks: verify the signature on the raw body, answer 2xx quickly, process each event once by its ID, and accept any order of arrival.
- Write the rules before the code and show them to the user: trial (length, card or not, what happens at the end), grace period after a failed payment, what happens to data on downgrade.
- Cancellation is online, three steps at most from the account, confirmed by email with the date it takes effect. In France this is the law for consumers (three-click cancellation); in the EU a withdrawal function is required for distance contracts.
- Taxes are part of the build: collect the billing country and VAT number, configure the regime, and write down what the country's e-invoicing rules ask (a PDF from the payment provider is not always enough). This is not legal advice: tell the user to confirm with their accountant.

**Play the life cycle.** Reading the handler does not show that access follows the subscription. With a Stripe test key in the environment (the user puts it there; never ask for it in chat, never write it in a file) and the app's webhook receiving events (`stripe listen --forward-to <webhook url>` on a local machine):

```json
"billing": { "price_id": "price_…", "trial_days": 14,
  "probe": { "url": "http://localhost:3000/api/test/entitlement?customer={customer}",
             "expect": { "trialing": { "access": true }, "active": { "access": true }, "past_due": { "access": true, "banner": "payment" }, "canceled": { "access": false } } } }
```

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" billing
```

It creates a test clock and a test customer, starts the trial, moves time past the trial, switches to a card Stripe declines and moves past the renewal, then cancels. After each stage it reads the subscription's status at Stripe and asks the app's probe what that customer is entitled to; the two must agree. Everything is deleted with the test clock. It refuses any key that is not a test key. The probe is a small endpoint to add to the app, available on local and staging only. Not covered: plan changes and proration, refunds, tax, 3-D Secure, the emails.

The signature check of the webhook itself is played with `qp webhooks`: an unsigned or wrongly signed event must be refused.

## 4. Service emails

All of these exist before launch, in the product's voice and look, with a text version, sent from a domain with SPF, DKIM and DMARC aligned: email verification, password reset, invitation, receipt, payment failed (with a link to fix the card), trial ending, plan changed, cancellation (with the effective date), account deletion. Marketing email is separate and carries one-click unsubscribe.

## 5. First session and activation

- Name the activation event with the user: the first time someone gets what the product promises ("first invoice sent", "first collage saved"). Record it in `.quality/project.json` (`success_metric` or a note) and emit it in the code, with sign-up and first payment, so the funnel can be read. Billing events are recorded on the server.
- A fresh account never lands on a blank screen: an empty state with one action, or sample data it can delete.
- No forced tour. If the first screen needs a tour, the screen is the problem (see the `design-screens` skill).
- Declare a flow that starts from a fresh account and ends on the activation event; `qp flows` plays it on phone and desktop.
- Do not quote conversion or activation benchmarks: the published figures contradict each other. Measure the product's own funnel.

## 6 to 10. Account, leaving, support, public pages

- Account settings are complete: profile, security (password, second factor, sessions), notifications, billing (plan, invoices, payment method, cancel), data export, delete account.
- Export is machine-readable (JSON or CSV) and covers the customer's own data; deletion is self-service or completed within a month, with the retention stated.
- Support never uses a shared password or the database directly: impersonation is time-boxed, shows a banner, asks for a reason and writes to a log the customer's admins can read.
- The pricing page gives price, period, unit, tax mention, limits in numbers, trial and cancellation rules, and the amounts match checkout. Show prices: hiding them costs trust.
- Trust pages say only what is true: security practices, data processing agreement and sub-processors, status page. No compliance badge that was not earned (BRD-01, ACT-05).

## Before calling it done

Run what applies and report the result of each, not a general "it works":

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" access     # no leak, no unexplained "unclear"
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" auth       # local or staging only
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" flows      # the fresh-account flow completes
```

Then say what was not tested: payment paths not played with a test clock, emails not received, roles without a check.
