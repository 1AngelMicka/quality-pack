// Tests of qp billing against a stand-in for Stripe's test API (no network, no real key). Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/qp.mjs");
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "qp-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const run = (cwd, args, env) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } },
  (e, stdout) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null })));

// The few endpoints the tool uses, with the behaviour of Stripe's test clocks: a trial ends when the clock
// passes it, and a renewal succeeds or fails according to the customer's default card.
function fakeStripe() {
  const state = { clock: null, customer: null, sub: null, deleted: false, calls: [] };
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d)).on("end", () => {
      const p = new URLSearchParams(body);
      const send = (o, code = 200) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
      const path = req.url.replace("/v1", "");
      state.calls.push(`${req.method} ${path}`);
      if (req.headers.authorization !== "Bearer sk_test_stand_in") return send({ error: { message: "Invalid API Key" } }, 401);
      if (req.method === "POST" && path === "/test_helpers/test_clocks") { state.clock = { id: "clock_1", frozen_time: Number(p.get("frozen_time")), status: "ready" }; return send(state.clock); }
      if (req.method === "GET" && path === "/test_helpers/test_clocks/clock_1") return send(state.clock);
      if (req.method === "DELETE" && path === "/test_helpers/test_clocks/clock_1") { state.deleted = true; return send({ deleted: true }); }
      if (req.method === "POST" && path === "/customers") { state.customer = { id: "cus_1", pm: null }; return send(state.customer); }
      if (req.method === "POST" && path === "/customers/cus_1") { state.customer.pm = p.get("invoice_settings[default_payment_method]"); return send(state.customer); }
      const attach = /^\/payment_methods\/(\w+)\/attach$/.exec(path);
      if (req.method === "POST" && attach) return send({ id: attach[1] });
      if (req.method === "POST" && path === "/subscriptions") {
        const days = Number(p.get("trial_period_days") || 0);
        state.sub = { id: "sub_1", status: days ? "trialing" : "active", trial_end: state.clock.frozen_time + days * 86400, price: p.get("items[0][price]") };
        return send(state.sub);
      }
      if (req.method === "POST" && path === "/test_helpers/test_clocks/clock_1/advance") {
        state.clock.frozen_time = Number(p.get("frozen_time"));
        const declined = /Fail/.test(state.customer.pm || "");
        if (state.sub.status === "trialing" && state.clock.frozen_time >= state.sub.trial_end) state.sub.status = declined ? "past_due" : "active";
        else if (state.sub.status === "active" && declined) state.sub.status = "past_due";
        return send(state.clock);
      }
      if (req.method === "GET" && path === "/subscriptions/sub_1") return send(state.sub);
      if (req.method === "DELETE" && path === "/subscriptions/sub_1") { state.sub.status = "canceled"; return send(state.sub); }
      send({ error: { message: `unknown ${req.method} ${path}` } }, 404);
    });
  }).listen(0);
  return { server, state };
}

test("billing: the subscription life cycle is played, and an app that keeps access after cancellation is caught", async () => {
  const { matches, checkKey } = await import("../plugins/core/scripts/lib/billing.mjs");
  assert.equal(matches({ access: true, plan: "pro", extra: 1 }, { access: true }), true);
  assert.equal(matches({ access: true }, { access: false }), false);
  assert.equal(matches({ a: { b: 1 } }, { a: { b: 1 } }), true);
  assert.match(checkKey("sk_live_abc", "STRIPE_SECRET_KEY"), /never runs with a live key/);
  assert.match(checkKey(undefined, "STRIPE_SECRET_KEY"), /is not set/);
  assert.equal(checkKey("sk_test_abc", "K"), null);

  const stripe = fakeStripe();
  // Two apps: one follows the subscription's status, one grants access for ever once a customer exists.
  const app = createServer((req, res) => {
    const status = stripe.state.sub?.status;
    const follows = { trialing: { access: true }, active: { access: true }, past_due: { access: true, banner: "payment" }, canceled: { access: false } }[status] || { access: false };
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(req.url.startsWith("/careless") ? { access: true } : follows));
  }).listen(0);
  const env = { QP_STRIPE_API: `http://localhost:${stripe.server.address().port}`, STRIPE_SECRET_KEY: "sk_test_stand_in" };
  try {
    const dir = fixture();
    const f = join(dir, ".quality/project.json");
    const set = (billing) => writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), billing }));
    const expect = { trialing: { access: true }, active: { access: true }, past_due: { access: true, banner: "payment" }, canceled: { access: false } };
    const probe = (path) => ({ url: `http://localhost:${app.address().port}${path}?customer={customer}`, expect });
    set({ price_id: "price_pro", trial_days: 14, probe: probe("/careful") });
    const good = await run(dir, ["billing", "--wait", "1", "--run", "2026-10-07"], env);
    assert.deepEqual(good.out.stages.map((s) => [s.stage, s.stripe_status, s.app_ok]), [["trial started", "trialing", true], ["trial ended, first invoice paid", "active", true], ["renewal declined", "past_due", true], ["cancelled", "canceled", true]]);
    assert.deepEqual(good.out.summary.must_failed, []);
    assert.equal(good.code, 0);
    assert.equal(stripe.state.deleted, true); // everything created is removed with the test clock
    assert.ok(existsSync(join(dir, ".quality/audits/2026-10-07/billing.json")));
    set({ price_id: "price_pro", trial_days: 14, probe: probe("/careless") });
    const bad = await run(dir, ["billing", "--wait", "1", "--run", "2026-10-07"], env);
    assert.equal(bad.code, 2);
    assert.deepEqual(bad.out.summary.must_failed, ["app_follows_billing"]);
    assert.equal(bad.out.summary.app_disagrees.length, 2); // no banner when the payment failed, access kept after cancellation
    // Without a probe only Stripe's side is played, and the report says so.
    set({ price_id: "price_pro", trial_days: 0 });
    const noProbe = await run(dir, ["billing", "--run", "2026-10-07"], env);
    assert.deepEqual(noProbe.out.summary.should_failed, ["app_not_checked"]);
    assert.equal(noProbe.out.stages[0].stage, "subscribed");
    // A live key, or no key, never runs.
    assert.match((await run(dir, ["billing"], { ...env, STRIPE_SECRET_KEY: "sk_live_x" })).out.hint, /live key/);
    assert.match((await run(dir, ["billing"], { ...env, STRIPE_SECRET_KEY: "" })).out.hint, /is not set/);
  } finally { stripe.server.close(); app.close(); }
});
