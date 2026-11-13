// The subscription life cycle played for real, in Stripe's test mode, with a test clock: a customer starts a
// trial, the trial ends and the first invoice is paid, a renewal fails on a declined card, the subscription is
// cancelled. At each stage the tool reads the subscription's status at Stripe and, when the project declares a
// probe, asks the app what it believes: the two must agree. This is where SaaS billing breaks in production
// (access kept after a failed payment, access cut during the trial, plan never downgraded).
//
// project.json › billing:
//   { "price_id": "price_…", "trial_days": 14, "key_env": "STRIPE_SECRET_KEY",
//     "probe": { "url": "http://localhost:3000/api/test/entitlement?customer={customer}", "headers": {},
//                "expect": { "trialing": { "access": true }, "active": { "access": true },
//                            "past_due": { "access": true, "banner": "payment" }, "canceled": { "access": false } } } }
// The key is read from the environment, never from a file, and must be a test key. Events reach the app only
// if its webhook endpoint receives them: on a local machine, run `stripe listen --forward-to <webhook url>`.
// Everything created is attached to the test clock and deleted with it at the end.
const API = "https://api.stripe.com";
const DAY = 86400;

const form = (obj, prefix = "", out = new URLSearchParams()) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v && typeof v === "object") form(v, key, out); else if (v != null) out.append(key, String(v));
  }
  return out;
};

// Only a subset of the answer is compared: every key of `want` must be equal in `got`.
export function matches(got, want) {
  if (want === null || typeof want !== "object") return got === want;
  if (!got || typeof got !== "object") return false;
  return Object.entries(want).every(([k, v]) => matches(got[k], v));
}

export function checkKey(key, envName) {
  if (!key) return `the environment variable ${envName} is not set: put a Stripe TEST secret key in it yourself (the tool never asks for it and never stores it)`;
  if (!/^(sk|rk)_test_/.test(key)) return `${envName} is not a test key (it must start with sk_test_ or rk_test_). This tool never runs with a live key.`;
  return null;
}

export async function playBilling(project, { apiBase = API, now = Math.floor(Date.now() / 1000), wait = 20000, log = () => {} } = {}) {
  const cfg = project?.billing;
  if (!cfg?.price_id) return { available: true, errors: ["no billing block in .quality/project.json: declare billing.price_id (a recurring price of the Stripe test account) and, to check the app, billing.probe"] };
  const envName = cfg.key_env || "STRIPE_SECRET_KEY";
  const key = process.env[envName];
  const bad = checkKey(key, envName);
  if (bad) return { available: false, hint: bad };
  const call = async (method, path, body) => {
    const res = await fetch(`${apiBase}/v1${path}`, { method, headers: { authorization: `Bearer ${key}`, ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: body ? form(body).toString() : undefined, signal: AbortSignal.timeout(30000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${json.error?.message || res.status}`);
    return json;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const trial = Number(cfg.trial_days ?? 14);
  const stages = [];
  let clock = null;
  const probe = cfg.probe?.url ? async (customer) => {
    try { const res = await fetch(cfg.probe.url.replaceAll("{customer}", encodeURIComponent(customer)), { headers: cfg.probe.headers || {}, signal: AbortSignal.timeout(10000) }); return { status: res.status, body: await res.json().catch(() => null) }; }
    catch (e) { return { error: String(e.cause?.code || e.message).slice(0, 120) }; }
  } : null;
  // The app learns about each change through its webhook: give it a moment, and keep asking until it agrees.
  const stage = async (name, expectStripe, sub, customer) => {
    const s = await call("GET", `/subscriptions/${sub}`);
    const row = { stage: name, stripe_status: s.status, stripe_ok: s.status === expectStripe, expected_stripe: expectStripe };
    const want = cfg.probe?.expect?.[expectStripe];
    if (probe && want) {
      const until = Date.now() + wait;
      let got;
      do { got = await probe(customer); if (got.body && matches(got.body, want)) break; await sleep(Math.min(1500, wait)); } while (Date.now() < until);
      row.app = got.error ? { error: got.error } : got.body;
      row.app_expected = want;
      row.app_ok = !!got.body && matches(got.body, want);
    }
    stages.push(row);
    log(row);
    return row;
  };
  const advance = async (to) => {
    await call("POST", `/test_helpers/test_clocks/${clock.id}/advance`, { frozen_time: to });
    for (let i = 0; i < 60; i++) { const c = await call("GET", `/test_helpers/test_clocks/${clock.id}`); if (c.status === "ready") return; if (c.status === "internal_failure") throw new Error("the test clock failed to advance"); await sleep(apiBase === API ? 2000 : 20); }
    throw new Error("the test clock did not finish advancing");
  };
  try {
    clock = await call("POST", "/test_helpers/test_clocks", { frozen_time: now, name: "shipwright billing run" });
    const customer = await call("POST", "/customers", { test_clock: clock.id, email: "qp-billing@example.test", name: "shipwright test customer" });
    const good = await call("POST", "/payment_methods/pm_card_visa/attach", { customer: customer.id });
    await call("POST", `/customers/${customer.id}`, { invoice_settings: { default_payment_method: good.id } });
    const sub = await call("POST", "/subscriptions", { customer: customer.id, items: { 0: { price: cfg.price_id } }, ...(trial > 0 ? { trial_period_days: trial } : {}), metadata: { created_by: "shipwright" } });
    await stage(trial > 0 ? "trial started" : "subscribed", trial > 0 ? "trialing" : "active", sub.id, customer.id);
    let t = now;
    if (trial > 0) { t += (trial + 1) * DAY; await advance(t); await stage("trial ended, first invoice paid", "active", sub.id, customer.id); }
    // The next renewal is attempted on a card that Stripe declines.
    const failing = await call("POST", "/payment_methods/pm_card_chargeCustomerFail/attach", { customer: customer.id });
    await call("POST", `/customers/${customer.id}`, { invoice_settings: { default_payment_method: failing.id } });
    t += 32 * DAY; await advance(t);
    await stage("renewal declined", "past_due", sub.id, customer.id);
    await call("DELETE", `/subscriptions/${sub.id}`);
    await stage("cancelled", "canceled", sub.id, customer.id);
  } catch (e) {
    return { available: true, errors: [String(e.message).slice(0, 300)], stages };
  } finally {
    if (clock) await call("DELETE", `/test_helpers/test_clocks/${clock.id}`).catch(() => {});
  }
  const stripeBad = stages.filter((s) => !s.stripe_ok).map((s) => `${s.stage}: Stripe says ${s.stripe_status}, expected ${s.expected_stripe}`);
  const appBad = stages.filter((s) => s.app_ok === false).map((s) => `${s.stage}: the app answers ${JSON.stringify(s.app)}, expected ${JSON.stringify(s.app_expected)}`);
  const checked = stages.filter((s) => s.app_ok != null).length;
  return { available: true, mode: "Stripe test mode, test clock", stages,
    summary: { stages: stages.length, stripe_unexpected: stripeBad, app_checked: checked, app_disagrees: appBad,
      must_failed: [...(stripeBad.length ? ["stripe_lifecycle"] : []), ...(appBad.length ? ["app_follows_billing"] : [])], should_failed: checked ? [] : ["app_not_checked"] },
    note: checked ? "The app was asked after each stage and had up to " + Math.round(wait / 1000) + " s to follow. Not covered: plan change and proration, refunds, tax, 3-D Secure, the emails sent."
      : "Only Stripe's side was played: declare billing.probe (an endpoint of the app, on local or staging, that says what a customer is entitled to) to check that the app follows." };
}
