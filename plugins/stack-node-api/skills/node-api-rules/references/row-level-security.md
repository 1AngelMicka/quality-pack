# Row-level security with a per-transaction customer context

How to apply, with this stack, the isolation that the `saas-foundations` skill recommends (`references/tenancy.md`: which model to pick, the pitfalls, the six checking queries). This file gives the code: the policies, then one function that opens a transaction and sets the customer, written for Prisma and for the `pg` driver. Checked on 2026-11-14 against the PostgreSQL manual (`SET`, `set_config`, row security policies), Prisma's documentation and its example `prisma-client-extensions/row-level-security`.

## Facts the code relies on

- `set_config('app.org_id', value, true)` sets the value for the current transaction only; `true` is `is_local`. It is the same as `SET LOCAL`, but it takes a bind parameter (`$1`), so the customer id never goes into the SQL text. `SET LOCAL` itself accepts no parameter.
- Outside a transaction block, `SET LOCAL` has no effect (PostgreSQL only warns), and `set_config(..., true)` lasts for that one statement. So the context and the queries that need it must run in the same transaction, on the same connection.
- At `COMMIT` or `ROLLBACK` the value goes away, so a pooled connection does not carry one customer's context to the next request. A session-level `SET` (without `LOCAL`) does, which is why it is never used here.
- `current_setting('app.org_id', true)` returns null when the setting does not exist instead of raising an error. A connection that already ran a local set can return an empty string instead: the policy below turns both into null, which matches no row.
- Superusers and roles with `BYPASSRLS` skip every policy, and a table owner skips them unless the table has `FORCE ROW LEVEL SECURITY`.

## 1. Roles and policies (SQL migration)

Two roles: the owner, which runs migrations, and `app_user`, which the app connects as (not superuser, not `BYPASSRLS`, not the owner of any table). Two connection strings follow from it: one for migrations, one for the app.

```sql
alter table invoices enable row level security;
alter table invoices force row level security;

create policy invoices_by_org on invoices to app_user
  using      (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
```

One policy per customer table, in the same migration that creates the table. Prisma Migrate does not write policies: create the migration with `prisma migrate dev --create-only`, add the SQL above to its `migration.sql`, then apply it.

## 2. With the `pg` driver

```ts
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); // app_user

export async function withOrg<T>(orgId: string, work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.org_id', $1, true)", [orgId]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

// in a route: the customer comes from the session, never from the body or the address
app.get("/invoices", async (req) =>
  withOrg(req.session.orgId, (db) => db.query("select id, number, total from invoices order by created_at desc")).then((r) => r.rows));
```

## 3. With Prisma

Prisma ORM 7 (`@prisma/client` 7.x, the current stable release). An interactive transaction keeps every query on one connection; the tagged template sends `orgId` as a parameter.

```ts
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // DATABASE_URL = app_user

export function withOrg<T>(orgId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.org_id', ${orgId}, true)`;
    return work(tx);
  });
}

// in a route
const invoices = await withOrg(req.session.orgId, (tx) => tx.invoice.findMany({ orderBy: { createdAt: "desc" } }));
```

- Inside `work`, every query goes through `tx`. A query on `prisma` runs on another connection, without the context, and returns no row: it fails closed, but it is a bug.
- Never `$executeRawUnsafe` with the id pasted in the string.
- Interactive transactions time out after a few seconds by default (`timeout` and `maxWait` options): keep slow work (emails, calls to other services) outside the transaction.
- Prisma's own example sets the context through a client extension that wraps each query in a batch `$transaction([set_config, query])`. Its README says it is an example not meant for production and that explicit `$transaction` calls may not behave as intended with it: prefer the explicit `withOrg` above.
- Prisma ORM 8 (release candidate on 2026-11-14) has no `$transaction`: it becomes `db.transaction(async (tx) => …)`, and raw SQL is built with `db.raw.sql` and run with `tx.query` or `tx.execute`, values still sent as parameters. The pattern is unchanged: the `set_config(..., true)` statement first, inside the transaction, then every query through `tx`. It has no transaction timeout option: set `idle_in_transaction_session_timeout` on `app_user` instead. Check the exact calls against its documentation when you upgrade.

## 4. Behind a connection pooler

PgBouncer in transaction mode works with this pattern, because the setting lives and dies inside the transaction. Do not use session-level `SET` or prepared state that outlives the transaction.

## 5. Prove it

1. As `app_user`, run the six queries of `tenancy.md` (role, tables without forced RLS, tables without policy, catch-all policies, policies for every role, views that do not run as the caller): each returns what it says.
2. A test runs a query without `withOrg` and expects zero rows; another inserts a row for customer B while the context is customer A and expects an error from `with check`.
3. `sw access` with the two seeded accounts of two customers: no leak, over reused connections.
4. Grep the routes for the pool or the client used outside `withOrg`: `rg "pool\.query|prisma\.[a-z]+\.(find|create|update|delete)" src/routes`. Each hit is either global data on purpose (plans, countries) or a bug.

Sources: [PostgreSQL, SET](https://www.postgresql.org/docs/current/sql-set.html), [PostgreSQL, configuration settings functions](https://www.postgresql.org/docs/current/functions-admin.html), [PostgreSQL, row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Prisma, transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) and [raw SQL](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql), [prisma/prisma-client-extensions, row-level-security](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) (Apache-2.0). See SOURCES.md, batch 6.
