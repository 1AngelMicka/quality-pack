// Facto: a tiny invoicing app used as the pack's reference project. No dependency, one file.
// It exists in two states, chosen with FACTO_DRAFT=1:
//   draft    what a first attempt often looks like: it works when everything goes well, and has the defects the
//            pack is meant to catch (one customer can read another's invoice, the login tells which accounts
//            exist, the webhook accepts anything, no waiting or error state, invented figures, no sitemap…)
//   careful  the same app with each of those fixed.
// tests/example.test.mjs runs the pack's commands on both and checks that every planted defect is found and that
// the careful version passes. Test data only: the accounts and the secret below are fixtures, not credentials.
import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DRAFT = process.env.FACTO_DRAFT === "1";
const PORT = Number(process.env.PORT) || 4310;
const WEBHOOK_SECRET = "whsec_facto_fixture";
const USERS = { "alice@atelier-nord.test": { password: "alice-fixture-pass", org: "nord" }, "bob@studio-sud.test": { password: "bob-fixture-pass", org: "sud" } };
const INVOICES = [
  { id: "inv_nord_1", org: "nord", number: "NORD-2026-001", client: "Mairie de Brest", amount: 1240.0, status: "paid" },
  { id: "inv_nord_2", org: "nord", number: "NORD-2026-002", client: "Librairie Dialogues", amount: 380.5, status: "sent" },
  { id: "inv_sud_1", org: "sud", number: "SUD-2026-001", client: "Port de Sète", amount: 2990.0, status: "sent" },
];
const sessions = new Map();
const failures = new Map();

const css = `
:root { --paper: #f6f4ee; --ink: #1d1f1c; --muted: #5b6058; --line: #d9d5c8; --card: #ffffff; --accent: #1f5a43; --accent-ink: #ffffff; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.55 Georgia, "Times New Roman", serif; }
header, main, footer { max-width: 960px; margin: 0 auto; padding: 0 24px; }
header { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: center; justify-content: space-between; padding-top: 20px; padding-bottom: 20px; }
nav { display: flex; flex-wrap: wrap; gap: 4px 20px; }
nav a, .brand { color: var(--ink); text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; }
.brand { font-weight: 700; letter-spacing: 0.01em; }
h1 { font-size: clamp(32px, 5vw, 48px); line-height: 1.1; margin: 32px 0 16px; max-width: 18ch; text-wrap: balance; }
h2 { font-size: 26px; line-height: 1.2; margin: 48px 0 12px; text-wrap: balance; }
p { max-width: 62ch; margin: 0 0 16px; }
.lead { font-size: 20px; color: var(--muted); }
.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 20px; border-radius: 6px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink); font: inherit; font-size: 17px; text-decoration: none; cursor: pointer; transition: background-color 150ms ease-out; }
@media (hover: hover) { .btn:hover { background: #2b7458; } }
.btn:active { transform: scale(0.98); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
::selection { background: var(--accent); color: var(--accent-ink); }
label { display: block; margin: 16px 0 6px; }
input { width: 100%; max-width: 360px; min-height: 48px; padding: 0 12px; border: 1px solid #8b9088; border-radius: 6px; font: inherit; font-size: 17px; background: var(--card); color: var(--ink); }
table { border-collapse: collapse; width: 100%; max-width: 720px; }
th, td { text-align: left; padding: 12px 16px 12px 0; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; padding-right: 0; }
.skeleton { height: 18px; max-width: 720px; margin: 14px 0; border-radius: 4px; background: #e6e2d6; }
[role=alert] { border-left: 4px solid #a1341c; padding: 8px 16px; background: #fbeee9; max-width: 62ch; }
.plan { border: 1px solid var(--line); border-radius: 8px; padding: 24px; background: var(--card); max-width: 420px; }
.price { font-size: 36px; font-variant-numeric: tabular-nums; }
footer { color: var(--muted); padding-top: 48px; padding-bottom: 32px; font-size: 15px; }
footer a { color: inherit; }
`;
// What the draft does differently in its styles: no focus ring, small fields, a bar that cannot shrink.
const draftCss = `
* { outline: none !important; }
input { font-size: 13px; min-height: 28px; }
h1 { text-wrap: wrap; line-height: 1.6; }
.toolbar { display: flex; gap: 8px; width: 900px; }
.toolbar button { white-space: nowrap; padding: 4px 8px; font-size: 12px; }
.btn { transition: none; }
`;

const page = ({ title, description, path, body, noindex = false }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${DRAFT ? "Facto" : title}</title>
${DRAFT || !description ? "" : `<meta name="description" content="${description}">`}
${noindex ? '<meta name="robots" content="noindex">' : ""}
${DRAFT ? "" : `<link rel="canonical" href="{ORIGIN}${path}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/touch-icon.png">
<meta property="og:title" content="${title}">
<meta property="og:image" content="{ORIGIN}/share.png">`}
<style>${css}${DRAFT ? draftCss : ""}</style>
</head>
<body>
${DRAFT ? "" : '<a href="#main" class="btn" style="position:absolute;left:-999px" onfocus="this.style.left=\'8px\'" onblur="this.style.left=\'-999px\'">Skip to content</a>'}
<header><a class="brand" href="/">Facto</a><nav><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/login">Log in</a></nav></header>
<main id="main">${body}</main>
<footer><p>Facto is a fixture used to test shipwright. <a href="/">Home</a></p></footer>
</body></html>`;

const home = () => page({ path: "/", title: "Invoicing software for freelancers – Facto", description: "Facto is invoicing software for freelancers: write an invoice in two minutes, send it, and see who has paid.",
  body: `<h1>${DRAFT ? "The all-in-one platform to supercharge your billing" : "Invoicing software for freelancers"}</h1>
<p class="lead">${DRAFT ? "Seamless invoicing for teams of all sizes." : "Write an invoice in two minutes, send it, and see who has paid."}</p>
<p><a class="btn" href="/demo">${DRAFT ? "Get Started" : "See a demo invoice list"}</a></p>
${DRAFT ? `<p>Trusted by 12,000+ teams in 40 countries. Rated 4.9/5 by our customers.</p>
<blockquote><p>Facto changed everything for our business, we could not live without it any more.</p><cite>Sarah Johnson, CEO at TechCorp</cite></blockquote>
<p>SOC 2 certified.</p>` : `<h2>Your invoices, in one list</h2>
<table><thead><tr><th>Number</th><th>Client</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>
<tr><td>NORD-2026-001</td><td>Mairie de Brest</td><td>paid</td><td class="num">1240.00 €</td></tr>
<tr><td>NORD-2026-002</td><td>Librairie Dialogues</td><td>sent</td><td class="num">380.50 €</td></tr></tbody></table>
<p style="margin-top:16px">Each invoice has a number, a client, an amount and a status. Only the people of your account can read them.</p>`}` });

const pricing = () => page({ path: "/pricing", title: "Price of the invoicing software: 9 € a month – Facto", description: "The price of Facto, the invoicing software for freelancers: one plan at 9 € a month excluding tax, 14-day trial, cancel online at any time.",
  body: `<h1>${DRAFT ? "Pricing" : "Price of the invoicing software"}</h1>
<p class="lead">${DRAFT ? "Simple pricing." : "The price of the invoicing software is one plan, for one freelancer."}</p>
<div class="plan"><h2 style="margin-top:0">Solo</h2><p class="price">9 € <span style="font-size:17px">a month, excluding tax</span></p>
<p>Unlimited invoices, 1 user. 14-day trial without a card. Cancel online in three steps, effective at the end of the paid month.</p>
<a class="btn" href="/login">Start the trial</a></div>` });

const login = () => page({ path: "/login", title: "Log in to your invoices – Facto", description: "Log in to Facto to see and send your invoices.", noindex: true,
  body: `<h1>Log in</h1>
<form id="f"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required>
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
<p style="margin-top:20px"><button class="btn">Log in</button></p><p id="msg" role="status"></p></form>
<script>
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: e.target.email.value, password: e.target.password.value }) });
  if (res.ok) location.href = "/app"; else document.getElementById("msg").textContent = (await res.json()).error;
});
</script>` });

// The invoice list, used by /app (the logged-in customer's invoices) and /demo (sample data, public).
const list = (api, heading) => `<h1>${heading}</h1>
${DRAFT ? '<div class="toolbar"><button>New invoice</button><button>Export the list</button><button>Send reminders</button><button>Print</button><button>Archive paid invoices</button></div>' : '<p><button class="btn" id="new">New invoice</button></p>'}
<div id="list"${DRAFT ? "" : ' aria-busy="true"'}>${DRAFT ? "" : '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'}</div>
<script>
const list = document.getElementById("list");
const show = (rows) => { list.removeAttribute("aria-busy"); list.innerHTML = rows.length
  ? "<table><thead><tr><th>Number</th><th>Client</th><th>Status</th><th class=num>Amount</th></tr></thead><tbody>" + rows.map((r) => "<tr><td>" + r.number + "</td><td>" + r.client + "</td><td>" + r.status + "</td><td class=num>" + r.amount.toFixed(2) + " €</td></tr>").join("") + "</tbody></table>"
  : "<p>No invoice yet. Create the first one with “New invoice”.</p>"; };
${DRAFT ? `fetch("${api}").then((r) => r.json()).then(show);`
  : `function load() { list.setAttribute("aria-busy", "true");
  fetch("${api}").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(show)
    .catch(() => { list.removeAttribute("aria-busy"); list.innerHTML = '<p role="alert">The invoices could not be loaded. Check your connection.</p><p><button class="btn" id="retry">Try again</button></p>'; document.getElementById("retry").onclick = load; }); }
load();`}
</script>`;

const notFound = () => page({ path: "/404", title: "Page not found – Facto", description: "This page does not exist.", noindex: true,
  body: `<h1>We could not find that page</h1><p>The address may be wrong, or the page was moved. <a href="/">Go back to the home page</a>.</p>` });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const body = (req) => new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)).on("end", () => resolve(Buffer.concat(chunks))); });
const json = (res, code, obj) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const origin = `http://${req.headers.host}`;
  const html = (text, code = 200) => { res.statusCode = code; res.setHeader("content-type", "text/html; charset=utf-8"); res.end(text.replaceAll("{ORIGIN}", origin)); };
  const sid = /(?:^|;\s*)facto_session=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
  const user = sid ? sessions.get(sid) : null;
  const p = url.pathname;

  if (p === "/") return html(home());
  if (p === "/pricing") return html(pricing());
  if (p === "/login") return html(login());
  if (p === "/demo") return html(page({ path: "/demo", title: "Demo invoice list – Facto", description: "A demo of Facto's invoice list, with sample invoices: number, client, status and amount.", body: list("/api/demo-invoices", "Demo invoices") }));
  if (p === "/app") return user ? html(page({ path: "/app", title: "Your invoices – Facto", description: "Your invoices.", noindex: true, body: list("/api/invoices", "Your invoices") })) : (res.statusCode = 302, res.setHeader("location", "/login"), res.end());
  if (!DRAFT && p === "/favicon.svg") { res.setHeader("content-type", "image/svg+xml"); return res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#1f5a43"/><path d="M5 4h6v2H7v2h3v2H7v3H5z" fill="#fff"/></svg>'); }
  if (!DRAFT && (p === "/share.png" || p === "/touch-icon.png")) { res.setHeader("content-type", "image/png"); return res.end(PNG); }
  if (p === "/robots.txt") { res.setHeader("content-type", "text/plain"); return res.end(DRAFT ? "User-agent: *\nAllow: /\n" : `User-agent: *\nAllow: /\nDisallow: /app\nSitemap: ${origin}/sitemap.xml\n`); }
  if (!DRAFT && p === "/sitemap.xml") { res.setHeader("content-type", "application/xml");
    return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/pricing", "/demo"].map((u) => `<url><loc>${origin}${u}</loc><lastmod>2026-11-12</lastmod></url>`).join("")}</urlset>`); }

  if (p === "/api/demo-invoices") return json(res, 200, INVOICES.filter((i) => i.org === "nord").map(({ org, ...i }) => i));
  if (p === "/api/login" && req.method === "POST") {
    let creds = {};
    try { creds = JSON.parse((await body(req)).toString() || "{}"); } catch { return json(res, 400, { error: "Invalid request" }); }
    const email = String(creds.email || "").toLowerCase();
    const account = USERS[email];
    if (DRAFT) {
      // Says which accounts exist, and never slows down.
      if (!account) return json(res, 404, { error: "No account with this email" });
      if (account.password !== creds.password) return json(res, 401, { error: "Wrong password" });
    } else {
      const n = failures.get(email) || 0;
      if (n >= 8) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
      if (!account || account.password !== creds.password) { failures.set(email, n + 1); return json(res, 401, { error: "Wrong email or password" }); }
      failures.delete(email);
    }
    const id = randomBytes(24).toString("hex");
    sessions.set(id, { email, org: account.org });
    res.setHeader("set-cookie", `facto_session=${id}; Path=/; HttpOnly; SameSite=Lax`);
    return json(res, 200, { ok: true });
  }
  if (p === "/api/invoices") return user ? json(res, 200, INVOICES.filter((i) => i.org === user.org)) : json(res, 401, { error: "Log in first" });
  const one = /^\/api\/invoices\/([\w-]+)$/.exec(p);
  if (one) {
    if (!user) return json(res, 401, { error: "Log in first" });
    const inv = INVOICES.find((i) => i.id === one[1]);
    // The draft checks that someone is logged in, not that the invoice is theirs.
    if (!inv || (!DRAFT && inv.org !== user.org)) return json(res, 404, { error: "Not found" });
    return json(res, 200, inv);
  }
  if (p === "/webhooks/stripe" && req.method === "POST") {
    const raw = await body(req);
    if (!DRAFT) {
      const header = String(req.headers["stripe-signature"] || "");
      const t = /t=(\d+)/.exec(header)?.[1], v1 = /v1=([a-f0-9]+)/.exec(header)?.[1];
      const expected = t ? createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${raw}`).digest("hex") : "";
      const ok = !!v1 && v1.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected)) && Math.abs(Date.now() / 1000 - Number(t)) < 300;
      if (!ok) return json(res, 400, { error: "Invalid signature" });
    }
    return json(res, 200, { received: true });
  }
  // The draft answers 200 with the home page for any unknown address.
  return DRAFT ? html(home()) : html(notFound(), 404);
});

server.listen(PORT, () => console.log(`Facto (${DRAFT ? "draft" : "careful"}) on http://localhost:${server.address().port}`));
