// Tests of the fixes from the pilot project's feedback on the security commands: secrets guard and guard-test,
// threats --check and the launch gate, access --check and "scope": "self", the auth probe (Origin, right login
// first, unreachable login, sign-up and reset), and billing (subscription metadata, app-held trial).
// Local fixtures only: small HTTP servers on localhost, a stand-in for Stripe. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW = join(ROOT, "plugins/core/scripts/sw.mjs");
const GUARD = join(ROOT, "plugins/core/scripts/hooks/secrets-guard.mjs");
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "sw-sec-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const setProject = (dir, patch) => {
  const f = join(dir, ".quality/project.json");
  writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), ...patch }));
};
// Async on purpose: the test's own HTTP server must keep answering while the CLI runs.
const run = (cwd, args, env = {}) => new Promise((resolve) => execFile("node", [SW, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));
const readBody = (req) => new Promise((r) => { let s = ""; req.on("data", (d) => (s += d)).on("end", () => { try { r(JSON.parse(s || "{}")); } catch { r({}); } }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listen = (handler) => new Promise((resolve) => { const s = createServer(handler).listen(0, () => resolve(s)); });

// Fake keys, assembled so that this file never holds one.
const TAIL = "a1B2c3D4e5F6g7H8i9J0k1L2";
const LIVE = ["sk", "live", TAIL].join("_");
const TEST = ["sk", "test", TAIL].join("_");
const RTEST = ["rk", "test", TAIL].join("_");

test("[3][2][4] secrets guard: test keys blocked outside .env, new allow marker, unreadable input reported", () => {
  const guard = (input) => spawnSync(process.execPath, [GUARD], { input: typeof input === "string" ? input : JSON.stringify(input), encoding: "utf8" });
  const write = (file_path, content) => ({ tool_input: { file_path, content } });
  const blocked = guard(write("/p/src/config.ts", `new Stripe("${TEST}")`));
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /Stripe test secret key/);
  assert.match(blocked.stderr, /sw-allow-secret/);
  assert.doesNotMatch(blocked.stderr, /qp-allow-secret/);
  assert.equal(guard(write("/p/src/pay.ts", `const k = "${RTEST}"`)).status, 2);
  assert.equal(guard(write("/p/.env", `STRIPE_SECRET_KEY=${TEST}`)).status, 0);
  assert.equal(guard(write("/p/.env", `STRIPE_SECRET_KEY=${LIVE}`)).status, 0);
  assert.equal(guard(write("/p/.env.example", `STRIPE_SECRET_KEY=${LIVE}`)).status, 2);
  assert.equal(guard(write("/p/.env.example", `STRIPE_SECRET_KEY=${TEST}`)).status, 2);
  assert.equal(guard(write("/p/a.ts", `const k = "${TEST}"; // sw-allow-secret`)).status, 0);
  assert.equal(guard(write("/p/a.ts", `const k = "${TEST}"; // qp-allow-secret`)).status, 0);
  // A short documented placeholder is not a key.
  assert.equal(guard(write("/p/a.ts", 'const k = "sk_test_xxx";')).status, 0);
  const unreadable = guard(`{"tool_input": {"file_path": "/p/a.ts", "content": "${LIVE}"`);
  assert.equal(unreadable.status, 0);
  assert.match(unreadable.stderr, /not valid JSON.*not checked/);
  assert.equal(unreadable.stderr.trim().split("\n").length, 1);
});

test("[4] sw guard-test plays the known cases through the hook", async () => {
  const r = await run(mkdtempSync(join(tmpdir(), "sw-guard-")), ["guard-test"]);
  assert.equal(r.code, 0, JSON.stringify(r.out));
  assert.equal(r.out.ok, true);
  assert.deepEqual(r.out.failed, []);
  assert.ok(r.out.cases.length >= 10);
  assert.ok(r.out.cases.some((c) => /test secret key/.test(c.case) && c.expected_exit === 2 && c.pass));
  assert.ok(r.out.cases.some((c) => /unreadable/.test(c.case) && c.pass));
});

function threatModel() {
  const model = JSON.parse(readFileSync(join(ROOT, "plugins/core/templates/threats.json"), "utf8"));
  model.system = "Teams keep their client invoices here and share them with their accountant.";
  model.reviewed = new Date().toISOString().slice(0, 10);
  return model;
}

test("[9][11] threats: --check answers the shape question, the default answers the launch question", async () => {
  const dir = fixture();
  const file = join(dir, ".quality/threats.json");
  const model = threatModel();
  // A French project: tests played by hand written "manuel : …", or flagged by_hand.
  model.abuse_cases[3].test = "manuel : téléverser un .svg avec un script, ouvrir le fichier stocké";
  model.abuse_cases[5].test = "quota atteint après N requêtes";
  model.abuse_cases[5].by_hand = true;
  writeFileSync(file, JSON.stringify(model));
  const check = await run(dir, ["threats", "--check"]);
  assert.equal(check.code, 0, JSON.stringify(check.out));
  assert.equal(check.out.ok, true);
  assert.match(check.out.question, /well formed.*--check/);
  assert.match(check.out.answer, /^yes/);
  assert.ok(check.out.summary.open_before_launch.length > 0);
  assert.equal(check.out.summary.tested_by_hand, 2);
  const gate = await run(dir, ["threats"]);
  assert.equal(gate.code, 2);
  assert.equal(gate.out.ok, false);
  assert.equal(gate.out.model_ok, true);
  assert.match(gate.out.question, /ready for launch/);
  assert.match(gate.out.answer, /still open before launch/);
  assert.equal((await run(dir, ["threats", "--gate", "launch"])).code, 2);
  // Once every before-launch case is closed, the launch gate passes.
  for (const a of model.abuse_cases) if (a.priority === "before-launch") a.status = "done";
  writeFileSync(file, JSON.stringify(model));
  const ready = await run(dir, ["threats", "--gate", "launch"]);
  assert.equal(ready.code, 0, JSON.stringify(ready.out));
  assert.match(ready.out.answer, /^yes/);
  // A malformed model fails both questions.
  model.abuse_cases[0].response = "ignore";
  writeFileSync(file, JSON.stringify(model));
  const bad = await run(dir, ["threats", "--check"]);
  assert.equal(bad.code, 2);
  assert.equal(bad.out.ok, false);
});

test("[10] access --check: no check yet is a warning, and the exit code follows ok", async () => {
  const dir = fixture();
  const accounts = { alice: { headers: { "x-user": "alice" } }, bob: { headers: { "x-user": "bob" } } };
  setProject(dir, { access: { accounts, checks: [] } });
  const empty = await run(dir, ["access", "--check"]);
  assert.equal(empty.code, 0, JSON.stringify(empty.out));
  assert.equal(empty.out.ok, true);
  assert.deepEqual(empty.out.errors, []);
  assert.match(empty.out.warnings[0], /no check yet/);
  // Playing it has nothing to do: an error that says so.
  const played = await run(dir, ["access"]);
  assert.equal(played.code, 2);
  assert.match(played.out.errors[0], /access.checks is empty/);
  setProject(dir, { access: { accounts: { alice: accounts.alice }, checks: [] } });
  const lone = await run(dir, ["access", "--check"]);
  assert.equal(lone.out.ok, false);
  assert.equal(lone.code, 2);
});

test("[52] access scope self: each account gets its own data, and none of the owner's markers", async () => {
  const data = { alice: { client: "Atelier Alice SARL", invoice: "INV-ALICE-0001", total: 1200 }, bob: { client: "Bob & Co", invoice: "INV-BOB-0001", total: 300 } };
  const server = await listen((req, res) => {
    const user = req.headers["x-user"];
    res.setHeader("content-type", "application/json");
    if (!data[user]) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Log in first" })); }
    // /api/summary answers each account with its own figures; /api/leaky-summary always with alice's.
    res.end(JSON.stringify(req.url === "/api/leaky-summary" ? data.alice : data[user]));
  });
  try {
    const dir = fixture();
    const accounts = { alice: { headers: { "x-user": "alice" } }, bob: { headers: { "x-user": "bob" } } };
    const self = (id, path, markers) => ({ id, path, owner: "alice", scope: "self", markers });
    setProject(dir, { urls: { local: `http://localhost:${server.address().port}` },
      access: { accounts, checks: [self("summary", "/api/summary", ["Atelier Alice SARL", "INV-ALICE-0001"])] } });
    const check = await run(dir, ["access", "--check"]);
    assert.equal(check.code, 0, JSON.stringify(check.out));
    assert.deepEqual(check.out.checks[0].denied_to, ["bob", "anonymous"]);
    const careful = await run(dir, ["access", "--run", "2026-11-14"]);
    assert.equal(careful.code, 0, JSON.stringify(careful.out));
    assert.equal(careful.out.checks[0].attempts, "bob: own, anonymous: own");
    assert.deepEqual(careful.out.summary.leaks, []);
    assert.equal(careful.out.summary.own_data_only, 2);
    setProject(dir, { access: { accounts, checks: [self("summary", "/api/leaky-summary", ["Atelier Alice SARL"])] } });
    const leaky = await run(dir, ["access", "--run", "2026-11-14"]);
    assert.equal(leaky.code, 2);
    assert.match(leaky.out.summary.leaks[0], /summary as bob: .*Atelier Alice SARL/);
    // A marker the owner does not get proves nothing: setup error.
    setProject(dir, { access: { accounts, checks: [self("summary", "/api/summary", ["not in the answer"])] } });
    const unset = await run(dir, ["access", "--run", "2026-11-14"]);
    assert.equal(unset.code, 2);
    assert.match(unset.out.summary.setup_errors[0], /does not get "not in the answer"/);
    // Self is for reads, and needs markers.
    setProject(dir, { access: { accounts, checks: [{ id: "x", method: "POST", path: "/api/summary", owner: "alice", scope: "self" }] } });
    const wrong = await run(dir, ["access", "--check"]);
    assert.equal(wrong.code, 2);
    assert.ok(wrong.out.errors.some((e) => /reads \(GET\)/.test(e)) && wrong.out.errors.some((e) => /needs markers/.test(e)), JSON.stringify(wrong.out.errors));
  } finally { server.close(); }
});

// A login behind an Origin check, like Better Auth's: without the right Origin every request gets 403 in a few ms.
async function authApp() {
  const fails = new Map();
  const users = { "known@example.com": "Right-Pass-123" };
  const seen = [];
  let origin = "";
  const server = await listen(async (req, res) => {
    const b = await readBody(req);
    const send = (code, o) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    seen.push({ url: req.url, origin: req.headers.origin });
    if (req.url === "/bad-body") return send(400, { error: "Invalid body" });
    if (req.headers.origin !== origin) return send(403, { message: "Missing or null Origin", code: "MISSING_OR_NULL_ORIGIN" });
    await sleep(15); // the hash
    if (req.url === "/login") {
      const n = fails.get(b.email) || 0;
      if (n >= 10) return send(429, { error: "Too many attempts" });
      if (users[b.email] && users[b.email] === b.password) { res.setHeader("set-cookie", "session=abc123; Path=/; HttpOnly; SameSite=Lax"); return send(200, { ok: true }); }
      fails.set(b.email, n + 1);
      return send(401, { error: "Wrong email or password" });
    }
    if (req.url === "/signup-leaky") return users[b.email] ? send(409, { error: "This email already has an account" }) : send(200, { message: "Check your email" });
    if (req.url === "/signup") return send(200, { message: "Check your email" });
    if (req.url === "/reset") return send(200, { message: `If an account exists for ${b.email}, we sent a link` });
    send(404, {});
  });
  origin = `http://localhost:${server.address().port}`;
  return { server, seen, base: origin, reset: () => fails.clear() };
}

test("[16][17][50] auth probe: Origin sent, right login first, unreachable login is an error, sign-up and reset compared", async () => {
  const app = await authApp();
  const probe = (extra = {}) => ({ urls: { local: app.base }, auth_probe: { login: { path: "/login" }, known_email: "known@example.com", attempts: 12, ...extra } });
  try {
    const dir = fixture();
    // Origin by default, right password first, sign-up and reset compared.
    setProject(dir, probe({ password_env: "SW_TEST_PASSWORD", signup: { path: "/signup", body: { email: "{email}", password: "{password}", name: "Probe" } }, reset: { path: "/reset", body: { email: "{email}" } } }));
    const ok = await run(dir, ["auth", "--run", "2026-11-14"], { SW_TEST_PASSWORD: "Right-Pass-123" });
    assert.equal(ok.code, 0, JSON.stringify(ok.out));
    assert.equal(ok.out.origin_sent, app.base);
    assert.ok(app.seen.every((s) => s.origin === app.base));
    assert.match(ok.out.reached, /^confirmed/);
    assert.equal(ok.out.checks.session_cookie_flags.ok, true);
    assert.equal(ok.out.checks.signup_enumeration.ok, true);
    assert.equal(ok.out.checks.reset_enumeration.ok, true);
    assert.deepEqual(ok.out.skipped, []);
    // [17] per account or per IP cannot be told from one address.
    assert.equal(ok.out.checks.login_rate_limit.ok, true);
    assert.match(ok.out.checks.login_rate_limit.value, /cannot tell/);
    assert.match(ok.out.checks.login_rate_limit.rule, /Per account \(not only per IP\): not verifiable by this probe/);
    assert.equal(ok.out.checks.login_rate_limit.per_account, "not verifiable by this probe");

    // [50] A sign-up that says the address is taken fails.
    app.reset();
    setProject(dir, probe({ password_env: "SW_TEST_PASSWORD", signup: { path: "/signup-leaky" } }));
    const leaky = await run(dir, ["auth", "--run", "2026-11-14"], { SW_TEST_PASSWORD: "Right-Pass-123" });
    assert.equal(leaky.code, 2);
    assert.deepEqual(leaky.out.summary.must_failed, ["signup_enumeration"]);
    assert.match(leaky.out.checks.signup_enumeration.value, /known address: HTTP 409, unknown address: HTTP 200/);
    assert.ok(leaky.out.skipped.some((s) => s.check === "reset_enumeration" && /no auth_probe.reset/.test(s.why)));

    // The right password refused: stop with an error, not a pass.
    app.reset();
    setProject(dir, probe({ password_env: "SW_TEST_PASSWORD" }));
    const refused = await run(dir, ["auth", "--run", "2026-11-14"], { SW_TEST_PASSWORD: "not-the-password" });
    assert.equal(refused.code, 2);
    assert.match(refused.out.errors[0], /right password .* was refused with HTTP 401/);
    assert.equal(refused.out.checks, undefined);

    // Origin overridden with a wrong one: 403 everywhere, without password_env. The probe does not reach the login.
    app.reset();
    setProject(dir, probe({ login: { path: "/login", headers: { Origin: "http://elsewhere.test" } } }));
    const gated = await run(dir, ["auth", "--run", "2026-11-14"]);
    assert.equal(gated.code, 2);
    assert.match(gated.out.errors[0], /HTTP 403.*does not reach the login/);
    assert.ok(gated.out.skipped.some((s) => s.check === "account_enumeration"));
    // Same with password_env: the right login is refused first.
    const gated2 = await run(dir, ["auth", "--run", "2026-11-14"], { SW_TEST_PASSWORD: "Right-Pass-123" });
    setProject(dir, probe({ login: { path: "/login", headers: { Origin: "http://elsewhere.test" } }, password_env: "SW_TEST_PASSWORD" }));
    const gated3 = await run(dir, ["auth", "--run", "2026-11-14"], { SW_TEST_PASSWORD: "Right-Pass-123" });
    assert.equal(gated2.code, 2);
    assert.equal(gated3.code, 2);
    assert.match(gated3.out.errors[0], /refused with HTTP 403/);

    // The same 400 to every attempt in a few ms: the body never reached the login.
    setProject(dir, probe({ login: { path: "/bad-body" } }));
    const malformed = await run(dir, ["auth", "--run", "2026-11-14"]);
    assert.equal(malformed.code, 2);
    assert.match(malformed.out.errors[0], /same HTTP 400/);

    // Without password_env the skipped checks are listed, with their reason.
    app.reset();
    setProject(dir, probe());
    const plain = await run(dir, ["auth", "--run", "2026-11-14"]);
    assert.equal(plain.code, 0, JSON.stringify(plain.out));
    assert.deepEqual(plain.out.summary.skipped.sort(), ["reset_enumeration", "session_cookie_flags", "signup_enumeration"]);
    assert.match(plain.out.skipped.find((s) => s.check === "session_cookie_flags").why, /no auth_probe.password_env/);
    assert.match(plain.out.reached, /not confirmed/);
    assert.ok(plain.out.warnings.some((w) => /password_env/.test(w)));
  } finally { app.server.close(); }
});

// Stand-in for Stripe's test API, as in billing.test.mjs, plus the subscriptions list and the metadata.
function fakeStripe() {
  const state = { clock: null, customer: null, sub: null, deleted: false };
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d)).on("end", () => {
      const p = new URLSearchParams(body);
      const send = (o, code = 200) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
      const path = req.url.replace("/v1", "");
      if (req.headers.authorization !== "Bearer sk_test_stand_in") return send({ error: { message: "Invalid API Key" } }, 401);
      if (req.method === "POST" && path === "/test_helpers/test_clocks") { state.clock = { id: "clock_1", frozen_time: Number(p.get("frozen_time")), status: "ready" }; return send(state.clock); }
      if (req.method === "GET" && path === "/test_helpers/test_clocks/clock_1") return send(state.clock);
      if (req.method === "DELETE" && path === "/test_helpers/test_clocks/clock_1") { state.deleted = true; return send({ deleted: true }); }
      if (req.method === "POST" && path === "/customers") { state.customer = { id: "cus_1", pm: null }; return send(state.customer); }
      if (req.method === "POST" && path === "/customers/cus_1") { state.customer.pm = p.get("invoice_settings[default_payment_method]"); return send(state.customer); }
      const attach = /^\/payment_methods\/(\w+)\/attach$/.exec(path);
      if (req.method === "POST" && attach) return send({ id: attach[1] });
      if (req.method === "GET" && path.startsWith("/subscriptions?")) return send({ object: "list", data: state.sub ? [state.sub] : [] });
      if (req.method === "POST" && path === "/subscriptions") {
        const days = Number(p.get("trial_period_days") || 0);
        const metadata = Object.fromEntries([...p.entries()].filter(([k]) => k.startsWith("metadata[")).map(([k, v]) => [k.slice(9, -1), v]));
        state.sub = { id: "sub_1", status: days ? "trialing" : "active", trial_end: state.clock.frozen_time + days * 86400, metadata };
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

test("[59] billing: subscription metadata set, and an app-held trial checked before any subscription", async () => {
  const stripe = fakeStripe();
  // The app links the subscription to an account through the metadata; its trial needs no subscription.
  const app = await listen((req, res) => {
    const url = new URL(req.url, "http://x");
    const sub = stripe.state.sub;
    const linked = sub && sub.metadata.account_id === url.searchParams.get("account");
    let body;
    if (!sub) body = url.pathname === "/careless" ? { access: false } : { access: true, trial: true };
    else if (!linked) body = { access: false };
    else body = { active: { access: true }, past_due: { access: true, banner: "payment" }, canceled: { access: false } }[sub.status] || { access: false };
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  });
  const env = { SW_STRIPE_API: `http://localhost:${stripe.server.address().port}`, STRIPE_SECRET_KEY: "sk_test_stand_in" };
  const expect = { app_trial: { access: true, trial: true }, active: { access: true }, past_due: { access: true, banner: "payment" }, canceled: { access: false } };
  const billing = (path, extra = {}) => ({ billing: { price_id: "price_pro", trial: "app", subscription_metadata: { account_id: "acct_test_alice" },
    probe: { url: `http://localhost:${app.address().port}${path}?account=acct_test_alice`, expect }, ...extra } });
  try {
    const dir = fixture();
    setProject(dir, billing("/careful"));
    const good = await run(dir, ["billing", "--wait", "1", "--run", "2026-11-14"], env);
    assert.equal(good.code, 0, JSON.stringify(good.out));
    assert.deepEqual(good.out.stages.map((s) => [s.stage, s.stripe_status, s.app_ok]),
      [["app trial, no subscription yet", "none", true], ["subscribed", "active", true], ["renewal declined", "past_due", true], ["cancelled", "canceled", true]]);
    assert.deepEqual(stripe.state.sub.metadata, { account_id: "acct_test_alice", created_by: "shipwright" });
    assert.deepEqual(good.out.subscription_metadata, ["account_id"]);
    assert.match(good.out.mode, /trial held by the app/);
    assert.match(good.out.note, /app's clock/);
    // An app that gives no access during its own trial is caught before any subscription exists.
    stripe.state.sub = null;
    setProject(dir, billing("/careless"));
    const bad = await run(dir, ["billing", "--wait", "1", "--run", "2026-11-14"], env);
    assert.equal(bad.code, 2);
    assert.deepEqual(bad.out.summary.must_failed, ["app_follows_billing"]);
    assert.match(bad.out.summary.app_disagrees[0], /^app trial, no subscription yet/);
    // Metadata the tool owns, or an unknown trial mode, is refused before anything is created.
    setProject(dir, billing("/careful", { trial: "card", subscription_metadata: { created_by: "me" } }));
    const wrong = await run(dir, ["billing"], env);
    assert.equal(wrong.code, 2);
    assert.equal(wrong.out.errors.length, 2, JSON.stringify(wrong.out.errors));
  } finally { stripe.server.close(); app.close(); }
});
