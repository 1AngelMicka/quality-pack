# Subscriptions, cancellation and taxes

This file is for the moment before the first checkout, and for every change to plans, trials, failed-payment handling or cancellation. It gives the Stripe behaviours to build on, what the application does in each subscription state, the rules to write down before coding, the scenarios to play with a test clock, and the cancellation and tax obligations with their dates. Stripe facts were read in its documentation on 2026-11-12; defaults change, so read the linked page before relying on a number. Other providers have the same concepts under other names.

## Stripe facts to build on

**Trials** ([free trials](https://docs.stripe.com/billing/subscriptions/trials/free-trials), [trials](https://docs.stripe.com/billing/subscriptions/trials), [trial compliance](https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance))

- Without a card: Checkout with `payment_method_collection=if_required`. At the end, `trial_settings.end_behavior.missing_payment_method` is `cancel`, `pause` or `create_invoice`. The default is `create_invoice`, which leads to `past_due`. Choose `cancel` or `pause` on purpose.
- A trial lasts 730 days at most.
- `customer.subscription.trial_will_end` is sent 3 days before the end by default, or at once when the trial is shorter.
- With a card, card networks ask for a reminder before the end, a cancellation link on receipts and in the reminder, and trial text on the bank statement. Stripe's own reminder goes out 7 days before the end, or at the start of a trial shorter than 7 days. If you send your own emails, these duties stay yours.
- Trials without a card attract fake sign-ups. Verify the email and run a bot check before the trial starts.
- Stripe recommends its Trial Offer API (API version `2026-09-30` or later) for new integrations, but Checkout support was in private beta on 2026-11-12. With Checkout, the legacy trial settings above remain the working path.

**Plan changes** ([prorations](https://docs.stripe.com/billing/subscriptions/prorations))

- `proration_behavior` defaults to `create_prorations`: proration lines are created and billed on the next invoice. `always_invoice` bills at once. `none` turns proration off for that request.
- Proration is computed to the second.
- A negative proration becomes a credit on the customer balance, not a refund.
- Preview the change with the invoice preview API and send the same `proration_date` when applying it. The amount shown is then the amount charged.
- If the latest invoice is unpaid, use `proration_behavior=none`, or the customer is credited for time never paid.
- `cancel_at_period_end` does not prorate.

**Failed payments** ([Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries))

- Smart Retries is on by default for new accounts: up to 8 attempts within 2 weeks. The window can be 1, 2 or 3 weeks, 1 month or 2 months. A custom schedule allows up to 3 retries.
- Hard declines are not retried until a new payment method is supplied: `incorrect_number`, `lost_card`, `pickup_card`, `stolen_card`, `revocation_of_authorization`, `revocation_of_all_authorizations`, `authentication_required`, `highest_risk_level`, `transaction_not_allowed`.
- After the last attempt you choose: cancel, mark `unpaid`, leave `past_due`, or pause.
- `invoice.payment_failed` carries `attempt_count` and `next_payment_attempt`.
- SEPA Direct Debit: 2 retries at most within 30 days, configured separately.

**Webhooks** ([webhooks](https://docs.stripe.com/webhooks))

| Fact | What to build | Check |
| --- | --- | --- |
| The `Stripe-Signature` header is computed on the raw body | Verify with the endpoint secret before parsing. A framework that re-serialises the body breaks it | An unsigned POST gets 400 |
| The official libraries accept a timestamp up to 5 minutes old | Keep the tolerance. Zero turns the freshness check off | A captured event replayed after 6 minutes is refused |
| Delivery is retried for up to 3 days in live mode, with growing delays | Answer 2xx before slow work; process from a queue; keep failed events visible | The handler answers before the email or API call it triggers |
| Order is not guaranteed | Do not sort by `created`. Fetch the current object from the API when order matters | Deliver `deleted` then `updated`: the state ends `canceled` |
| Duplicates happen, sometimes under distinct event IDs | Unique constraint on the event ID, and a second key on `data.object.id` plus `event.type` | The same event sent twice changes nothing |
| Requests you send can be repeated too | Idempotency keys on calls that create charges or subscriptions | A retried call creates one object |

Test and live use different secrets and keys, stored as secrets.

**Entitlements** ([entitlements](https://docs.stripe.com/billing/entitlements))

- Create `Feature` objects with a `lookup_key` and attach them to products. Stripe sends `entitlements.active_entitlement_summary.updated` on subscribe, upgrade, downgrade, cancel and cancellation for non-payment.
- The event carries 10 entitlements at most. Beyond that, call the list API.
- Stripe advises storing entitlements in your own database. That table is the source of truth for the application (ASVS 5.0.0 8.3.1). A plan name sent by the browser, a price ID in local storage and the `success_url` redirect prove nothing.
- A scheduled job compares the table with the provider and repairs differences after a missed webhook.

Events to handle at least: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, plus `paused` and `resumed` if you pause.

## What the application does in each state

| State | Meaning | Access | Shown to the customer | Email |
| --- | --- | --- | --- | --- |
| `trialing` | Trial running | Full, within the trial plan's limits | End date at all times; what happens at the end | Trial ending |
| `active` | Paid and current | Full, within plan limits | Plan, usage against each limit, next renewal date and amount | Receipt on each `invoice.paid` |
| `active` with `cancel_at_period_end` | Cancelled, period still paid | Full until the period ends | Date access ends; a way to resume | Cancellation confirmed, with the date |
| `past_due` | Renewal failed, retries running | Kept, or read-only. Never cut on the first failure | Banner on every screen with a link to fix the card and the date access stops | Payment failed, sent on the first failure |
| `unpaid` | Retries exhausted, subscription kept | Read-only or blocked; export still possible | What is owed and how to pay | Final notice |
| `paused` | Trial ended without a card, or paused by choice | Read-only; nothing deleted | Add a payment method to continue | Trial ended |
| `canceled` | Over | Free plan or none; data kept for the stated retention period | Reactivate; export | Cancellation confirmed, with retention |
| `incomplete` | First payment not finished | None | Finish the payment | none |

The `incomplete` row is not covered by the research notes: read Stripe's status list before coding it. `authentication_required` needs its own path in any state: the customer comes back to the product and confirms the payment in session.

After a downgrade that leaves the customer over a limit: reading stays possible, creating is blocked, nothing is deleted silently.

## Rules to write before coding

Write the answers in the repository, show them to the user, and repeat the customer-facing ones on the pricing or billing page.

1. Trial: length, card or no card, and what happens at the end (amount and date of the first charge, or downgrade, or pause).
2. How long data is kept after a trial that expired without payment.
3. Grace period after a failed payment. Make it equal to the retry window (14 days by default) so access is not cut while Stripe is still retrying.
4. What `past_due` allows: full use or read-only.
5. What happens after the last retry: cancel, `unpaid` or pause.
6. Upgrade: effective at once, proration billed now or on the next invoice.
7. Downgrade: effective at the period end, or at once with a visible credit.
8. Limits of each plan as data in a plan table, with the behaviour when one is reached.
9. Cancellation: access until the end of the paid period, then how long data is kept and how to export it.
10. Refunds: one sentence.

Every limit is checked on the server where the write happens. Test: with a free account, call the API directly past the limit and expect a refusal.

## Test-clock scenarios

Play each one in test mode with a Stripe test clock and Stripe's published test cards. Write down the state reached, the emails received and what the product shows.

| Scenario | Expected |
| --- | --- |
| Trial with a card, advance to 7 days before the end, then past the end | Reminder with date, amount and cancellation link; then `active`; receipt |
| Trial without a card, advance past the end | The end behaviour you chose (`cancel` or `pause`), never an unexplained `past_due`; data still there |
| Renewal with a valid card | `invoice.paid`; entitlements unchanged; receipt |
| Renewal with a card that declines, then fix the card on day 3 | `past_due`; banner and email on the first failure; back to `active` after payment; banner gone |
| Renewal declines until retries run out | Access kept for the grace period, then the state you chose; nothing deleted |
| Card that requires authentication | The customer is brought back to confirm; no silent failure |
| Upgrade in mid-period | The preview amount equals the invoice amount; new limits apply at once |
| Downgrade below current usage | Applied per your rule; reading still works; creating is refused |
| Cancel, then advance to the period end | Access until that date; confirmation email with the date; then `canceled` |
| Open the success page without paying | No entitlement granted |
| Replay one webhook event twice; send an unsigned one | No change; 400 |

## Cancellation and withdrawal law

Not legal advice: confirm with an accountant or lawyer. Most points below come from law-firm notes and consumer-agency pages, because the official texts could not be fetched. Each carries its tag: [V] read on the primary source, [S] reported, not verified on the primary source, [U] not verified at all.

| Where | Rule | Date | Tag |
| --- | --- | --- | --- |
| France, consumers and non-professionals | A contract that can be concluded online must be cancellable online through a free, permanent, directly reachable function ("résiliation en trois clics"): a readable button labelled "résilier votre contrat" or an unambiguous equivalent, a page to identify the contract, a summary page where the customer confirms, then a confirmation on a durable medium with the effective date. Code de la consommation art. L215-1-1, decree 2023-417 | In force since 2023-06-01 | [S] |
| France | Fine of up to 15 000 EUR for a natural person and 75 000 EUR for a legal person (art. L241-3-1) | same | [S] |
| France, fixed-term contracts renewed tacitly | The customer must be told in writing, before renewal, the deadline to refuse it (art. L215-1). The exact notice window was not confirmed: ask the lawyer | not confirmed | [U] |
| EU, consumers, distance contracts with a right of withdrawal | A withdrawal function ("withdraw from contract here" or equivalent), prominent and available during the whole withdrawal period (14 days). Directive (EU) 2023/2673, new art. 11a of Directive 2011/83/EU. This is not cancellation: it covers the cooling-off period only. National transpositions vary | Applies from 2026-06-19 | [S] |
| EU, business and consumer customers | Data Act, Regulation (EU) 2023/2854, chapter VI: the customer can switch provider and export its data. Switching charges limited to cost, then prohibited from 2027-01-12 (some sources say 2027-01-11). Notice and transition durations not verified | Applicable since 2025-09-12 | [S] |
| United States, federal | The FTC "click-to-cancel" rule is not in force. A federal appeals court (Eighth Circuit) vacated it on 2025-07-08. The FTC restarted the rulemaking in early 2026 (March 2026 according to one summary) | No rule in force on 2026-11-12 | [S] |
| United States, other | Enforcement continues under ROSCA and section 5 of the FTC Act. State automatic-renewal laws apply: California requires online cancellation for online sign-ups; New York's amended law is in force since 2025-11-05 | varies | [S] |

One build satisfies all of them: state the terms before taking payment details, get express consent, and make cancellation online, from the account, in three steps at most, without a call, a chat or a mandatory survey, confirmed by email with the effective date and what happens to the data. For EU consumers add the withdrawal function during the first 14 days.

Sources: [Institut national de la consommation](https://www.inc-conso.fr/content/vous-pouvez-resilier-votre-contrat-dabonnement-en-quelques-clics), [decree 2023-417 on Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047314374) (not fetched), [Hogan Lovells](https://www.hoganlovells.com/en/publications/eu-consumer-protection-law-update-new-mandatory-withdrawal-button-what-online-traders-need-to-know), [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts), [Latham & Watkins](https://www.lw.com/en/insights/2025/08/EU-Data-Act-Significant-New-Switching-Requirements-Due-to-Take-Effect-for-Data-Processing-Services), [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses), [Sidley](https://www.sidley.com/en/insights/newsupdates/2026/02/us-ftc-signals-renewed-interest-in-click-to-cancel-rulemaking).

## Taxes and invoices

The same warning applies: not legal advice, and the tags mean the same.

| Point | Rule | Date | Tag |
| --- | --- | --- | --- |
| EU VAT, sales to consumers | VAT is due in the customer's member state. A supplier established in one EU state may charge home-country VAT while its cross-border consumer sales stay under 10 000 EUR per year (current and previous year). Above that: register in each state or use the One Stop Shop (OSS). Suppliers outside the EU have no threshold | current | [V] |
| OSS return | Quarterly, due by the end of the month after the quarter: 30 April, 31 July, 31 October, 31 January | current | [V] |
| Proof of the customer's country, OSS record keeping | Two matching pieces of evidence and ten years of records are often cited. Not found in the pages read | not confirmed | [U] |
| EU VAT, sales to businesses in another state | Reverse charge when the customer gives a valid VAT number; never for domestic sales. Stripe's pages disagree on whether it validates the number: test it | current | [S] |
| France, e-invoicing, receiving | Every business established in France must be able to receive electronic invoices through an approved platform. Large and mid-size companies must issue them and report | 2026-09-01 | [S] |
| France, e-invoicing, issuing | Small and very small businesses and micro-entrepreneurs must issue electronic invoices for domestic business sales, and report consumer and international sales (e-reporting) | 2027-09-01 | [S] |
| France, penalties and new invoice mentions | Sources conflict on amounts; the new mentions were not confirmed. No figure given here | not confirmed | [U] |

Consequences for the build:

- Collect the billing country and address before the first charge. Let the customer edit the company name and VAT number.
- Invoices are numbered in sequence, downloadable from the account, with seller and buyer legal details, the VAT number for business customers, and the VAT rate and amount per line. A wrong invoice is corrected by a credit note, never edited.
- For a French seller, a PDF from the payment provider will not meet the issuing duty once it applies. Write in the repository whether the billing provider is, or connects to, an approved platform.
- Stripe Tax tracks registration thresholds, including the 10 000 EUR one (reported, not verified on the primary source). It is a paid add-on: the owner may choose it, the skill does not prescribe it.

Sources: [European Commission, One Stop Shop](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en), [Stripe, EU tax](https://docs.stripe.com/tax/supported-countries/european-union), [Stripe, customer tax IDs](https://docs.stripe.com/billing/customer/tax-ids), [economie.gouv.fr, electronic invoicing](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises) (returned HTTP 403; dates match across several accounting sources).
