# Isolation between customers

This file is for the moment you design the first table, and for every later change that adds a kind of resource, a cache, a job or a file store. It says which isolation model to pick, which Postgres and Supabase row-level security (RLS) mistakes to check for and how, where the customer must travel once work leaves the request, how to prove isolation with two accounts, and which organisation features to postpone. Checked on 2026-11-12. Examples use `org_id` as the customer key; use the project's own name.

## Pick the model

| Model | Boundary | Cost | Pick it when |
| --- | --- | --- | --- |
| Shared tables, customer key on every row, RLS | Logical. Holds only if every table has policies, the request role is constrained and negative tests run | Lowest. One migration for everyone | Default for a product started from zero |
| One schema per customer | Stronger. Needs strict grants, separate roles and `search_path` discipline | Each migration runs once per customer | Tens to a few hundred customers and a need to restore one customer alone |
| One database per customer | Strongest | Highest: provisioning, migrations, monitoring per customer | A regulated or enterprise customer requires it by contract |
| Hybrid | Shared for most, dedicated for some | The code supports both paths | Dedicated isolation is sold as a paid tier |

Start with the first row. Moving one customer out to a dedicated database later is possible if every row already carries the key. Adding the key later means touching every query.

Standards to cite in an audit, by ID only: OWASP ASVS 5.0.0 8.4.1 (cross-customer operations), 8.2.2 (object-level access), 8.2.3 (field-level access), 8.3.1 (enforcement on the server). OWASP API Security Top 10 2023 ranks broken object-level authorization first (API1:2023).

Sources: [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html), [Azure Architecture Center, tenancy models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models), [ASVS 5.0.0 V8](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md), [API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).

## Row-level security: pitfalls and their checks

Run the checks through the same role and the same pooling mode as production. A check run as `postgres` proves nothing, because superusers skip RLS.

| Pitfall | Rule | Check |
| --- | --- | --- |
| The request role skips RLS | The application connects with a role that is neither superuser nor `BYPASSRLS`. Privileged connections are for migrations and approved admin jobs | Query 1 returns `f, f` |
| The table owner skips RLS | Table owners bypass policies unless RLS is forced | `alter table t force row level security;` then query 2 returns no row |
| A table has no policy | RLS on with no policy denies everything; RLS off exposes everything to any role with a grant | Query 2 and query 3 return no row. Fail the build otherwise |
| One policy `for all` | Write one policy per `select`, `insert`, `update`, `delete`. An `update` also needs a matching `select` policy | Query 4 returns no row |
| Policy without a role | Name the role (`to authenticated`), or the policy also runs for anonymous requests | Query 5 returns no row |
| `using` without `with check` | `using` filters existing rows, `with check` validates new ones. Without it, a row can be written into another customer | As Alice, insert a row with Bob's `org_id`: refused |
| Unique and foreign-key checks ignore RLS | A constraint error reveals that a value exists at another customer | Every unique constraint on customer data includes `org_id` |
| `TRUNCATE` and `REFERENCES` ignore RLS | Do not grant them to the request role | `\dp t` shows neither privilege for that role |
| Views run as their creator | On Postgres 15 or later create views `with (security_invoker = true)` | Query 6 returns no row |
| Customer context set per session | Set it per transaction with `set local`, fail closed when it is missing, and clear it before the connection returns to the pool | Send requests for two customers over reused connections; each sees only its rows |
| Stale token claims (Supabase) | A removed member stays in `auth.jwt()` until the token refreshes. Checks that must be immediate read the membership table | Remove a member, replay with the old token: refused |
| User-writable metadata (Supabase) | Authorisation data lives in `raw_app_meta_data`. `raw_user_meta_data` can be edited by the user | Search policies for `user_metadata`: no hit |
| Secret key in the browser (Supabase) | `service_role` skips RLS. Server only | Search the built bundle for the key: no hit |
| `security definer` functions | `set search_path = ''`, and never in an exposed schema | Read each function definition |
| Slow policies | Index every column used in a policy. Write `(select auth.uid())` so it is evaluated once per statement | `explain analyze` on a large table shows an index scan |

```sql
-- 1. Request role: expect rolsuper = f and rolbypassrls = f
select rolsuper, rolbypassrls from pg_roles where rolname = current_user;

-- 2. Tables without RLS enabled and forced: expect no row
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and (not c.relrowsecurity or not c.relforcerowsecurity);

-- 3. Tables with RLS on and no policy: expect no row
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p
                  where p.schemaname = n.nspname and p.tablename = c.relname);

-- 4. Catch-all policies: expect no row
select tablename, policyname from pg_policies where schemaname = 'public' and cmd = 'ALL';

-- 5. Policies that apply to every role: expect no row
select tablename, policyname from pg_policies where schemaname = 'public' and roles = '{public}';

-- 6. Views that do not run as the caller (Postgres 15+): expect no row
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
  and not coalesce(c.reloptions::text ilike '%security_invoker=true%', false);
```

Replace `public` with the schemas that hold customer data. Tables that are global on purpose (plans, countries) go on a written allow-list that the build subtracts from query 2.

A policy shape that fails closed (plain Postgres; `current_setting` raises an error when the setting is absent):

```sql
create policy invoices_select on invoices for select to app_user
  using (org_id = current_setting('app.org_id')::uuid);
-- per request, inside the transaction:
set local app.org_id = '6f1c...';
```

On Supabase, a second-factor gate is a restrictive policy on `(select auth.jwt()->>'aal') = 'aal2'`. Restrictive policies combine with AND, permissive ones with OR.

Sources: [PostgreSQL manual, row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Supabase, row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), OWASP cheat sheet above.

## Outside the request

A database policy protects nothing once the data has been copied elsewhere. For each place below, the customer is part of the key and is checked again by the code that reads.

| Place | Rule | Check |
| --- | --- | --- |
| Cache | Classify each cached value as global, per customer or per user. The customer ID is in the key. Authorise before reading the cache | Read the key builder; warm the cache as Alice, request as Bob |
| Background jobs | The customer travels in a payload that cannot be altered. The worker restores the context and authorises again. Re-check membership when the job can run late. Idempotency keys, dead-letter queues and concurrency caps are per customer | Enqueue a job with a forged customer: refused |
| Files | A path prefix is not a boundary. Use storage policies or one bucket per customer. Authorise customer, object and operation before upload, download and delete. Reject path traversal. Delete by exact prefix with a trailing slash | Ask for Alice's file path as Bob: refused |
| Signed links | Created only after the same authorisation. One object, one operation, with an expiry | Change the object name in the link: signature invalid. Wait past expiry: refused |
| Search and vector indexes | The customer filter is applied on the server for every query. The source does not name search indexes; this rule extends the cache rule | Search as Bob for a word that exists only at Alice: no result |
| Exports, outgoing webhooks, emails, PDFs | They run as jobs, so the job rule applies | Export as Bob contains no row of Alice |
| Logs and audit trail | Each entry carries the verified customer and actor. A customer's admins never read platform-wide logs. Alert on refused cross-customer attempts | Read the audit view as Bob's admin |
| Rate limits | The customer is one dimension beside global, endpoint, user and IP. Counters are shared and atomic. Answer 429 with `Retry-After` | Burst as Alice: Bob is not slowed |
| Backups | A restore of one customer leaves the other untouched | Restore test with two customers |

Source: OWASP Multi-Tenant Security Cheat Sheet (all rows except search, derived).

## Test with two accounts

1. Seed two customers, Alice and Bob, each with one user and one object of every customer-scoped kind. For roles, add a member and an admin inside the same customer.
2. For every route that takes an object ID (path, query, header, body), replay Alice's request with Bob's object ID. Cover read, update, delete and nested resources.
3. Expected: the owner gets 200 and their data. Anyone else gets 403 or 404, with nothing of the owner in the body. `sw access` also counts 401 and a redirect as a refusal. A 200 with the owner's content, or an accepted write, is a leak.
4. Database level, per table: the cross-customer statement is refused or returns zero rows, and the same-customer statement succeeds. A test that only checks refusals passes on a table that denies everyone.
5. Coverage is itself a check. Generate the route list from the router or the OpenAPI file and fail when a route with an ID parameter has no cross-customer test.
6. Run all of it in CI on each pull request. A failure blocks deployment.

On Supabase, write pgTAP tests and run `supabase test db`. Each test runs in a transaction that is rolled back, sets `request.jwt.claims`, and switches with `set local role authenticated`. Cover the anonymous role too ([Supabase testing overview](https://supabase.com/docs/guides/local-development/testing/overview)).

The two-user ID-swap is the method of OWASP WSTG-ATHZ-04. That page could not be fetched (reported, not verified on the primary source).

| Tool | Use | Licence | Note |
| --- | --- | --- | --- |
| `sw access` (this pack, Playwright underneath) | Route-level two-account test | Apache-2.0 (Playwright) | first choice |
| [pgTAP](https://github.com/theory/pgtap) | SQL tests for policies | PostgreSQL-style permissive | recommended |
| [Schemathesis](https://github.com/schemathesis/schemathesis) | Fuzzing from an OpenAPI file | MIT | recommended |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy), Access Control Testing add-on | Access matrix by role | Apache-2.0 | recommended |
| [Basejump](https://github.com/usebasejump/basejump) | Reference schema: accounts, members, billing | MIT | reading material |
| [supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) | pgTAP helpers to act as a user | MIT | last push 2024-05-15: copy the idea, do not depend on it |
| [Akto](https://github.com/akto-api-security/akto) community | API tests including object-level access | MIT | which features are cloud-only was not verified |

Excluded: Autorize (no licence file), AuthMatrix (last push 2024-03-07, needs Burp).

## Roles, invitations, last owner, impersonation

ASVS 5.0.0 IDs: 8.1.1 (rules written down), 8.2.1 (function-level permission), 8.3.1 (server side), 8.3.2 (changes apply at once), 7.5.1 (re-authentication before sensitive changes). The lifecycle rules below are design rules; no standard states them.

- The model is `user`, `membership(role)`, `organisation`. The role is on the membership. A user can belong to several organisations.
- Three fixed roles: owner, admin, member. Add read-only or billing if asked. Code checks a permission (a verb on a resource), never a role name, so roles can change later.
- Invitations: random token, single use, expiring, bound to the invited email, listed and revocable by admins, never above the inviter's role. Seven days is a common expiry; no standard sets a number. Accepting with another verified email is refused. Seat limits are checked when inviting and when accepting.
- Last owner: leave, demote and delete are refused by the server and explained by the interface. Test: in a single-owner organisation, call the three actions and expect three refusals.
- Owner transfer: the current owner re-authenticates, the new owner confirms, both get an email, the audit log gets an entry.
- Member removal: their sessions and API keys lose access to the organisation at once. With self-contained tokens, keep them short-lived or read the membership table. Test: remove, replay with the old session, expect a refusal. Their content is reassigned, not orphaned.
- Impersonation by support (no normative source): named staff roles only, second factor, written reason, time-boxed, banner on every screen. Password, second factor, payment method, deletion and API keys are blocked during the session. Actions are attributed to the staff member. One log entry holds staff identity, target, start, end and reason, and the customer's admins can read it. Never done by sharing or resetting the customer's password.
- Audit log from day one, append-only: role changes, invitations, removals, owner transfer, billing changes, API keys, exports, deletions, impersonation. Each entry has actor, customer, origin, UTC server time, a stable event name and the target ([EnterpriseReady, audit log](https://www.enterpriseready.io/features/audit-log/)).

## Postpone, with the trigger

| Feature | Build it when | Keep the door open with | Free building blocks |
| --- | --- | --- | --- |
| SSO (SAML or OIDC) | The first customer asks for it in a security questionnaire or a contract. Never for a consumer product | An auth library that can add SSO, verified email domains, password login kept for admins as a way back in | Keycloak (Apache-2.0), Better Auth SSO plugin (MIT), Logto (MPL-2.0), node-saml (MIT), Dex (Apache-2.0). Ory Polis (Apache-2.0): last push 2026-07-27, check activity first |
| SCIM | The same customer needs members removed automatically. Accounts created on the fly at SSO login can never be deprovisioned; SCIM fixes that | Membership as its own table | The identity servers above |
| Custom roles, sharing per resource | A customer cannot work with the fixed roles | Permission checks instead of role names | CASL (MIT), Casbin (Apache-2.0), OpenFGA (Apache-2.0), Cerbos (Apache-2.0) |
| Schema or database per customer | A contract requires it, or one customer must be restored alone | The customer key on every row | none needed |

Source: [EnterpriseReady, single sign-on](https://www.enterpriseready.io/features/single-sign-on/).
