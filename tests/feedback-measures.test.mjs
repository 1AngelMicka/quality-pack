// Tests of the measure fixes that came from a pilot project's feedback: redirects and refused answers reported,
// --before and --as on look, craft, stress and deslop, intended exceptions and tilted layouts in deslop, prose and
// point of view in look, click reached and local addresses in craft, robots and sitemap in web, sw tiles.
// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/sw.mjs");
const FIX = join(ROOT, "tests/fixtures/feedback");
const lib = (f) => import(`../plugins/core/scripts/lib/${f}`);
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "qp-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const run = (cwd, args) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...process.env, QP_NO_CALIBRATION: "1" } },
  (e, stdout, stderr) => { let out = null; try { out = stdout ? JSON.parse(stdout) : null; } catch { /* not JSON */ } resolve({ code: e?.code ?? 0, out, stderr }); }));
const browser = async (t) => { const { loadBrowserTools } = await lib("browser.mjs"); if (await loadBrowserTools(ROOT)) return true; t.skip("Playwright not installed (run sw.mjs browser-setup)"); return false; };
const listen = (server) => new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${server.address().port}`)));
const html = (body, head = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>App</title>${head}</head><body><main>${body}</main></body></html>`;

// An app behind a login: /app sends a visitor to /login, whose page asks /api/me (401). Signing in sets a cookie.
// Every other address answers the home page with 200, as a development server does for a single-page app.
function loginApp() {
  return createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const logged = /sid=alice/.test(req.headers.cookie || "");
    const send = (status, body, type = "text/html; charset=utf-8", headers = {}) => { res.writeHead(status, { "content-type": type, ...headers }); res.end(body); };
    if (url.pathname === "/login" && req.method === "POST") return send(303, "", "text/plain", { location: "/app", "set-cookie": "sid=alice; Path=/; HttpOnly" });
    if (url.pathname === "/login") return send(200, html(`<h1>Sign in</h1><form method="post" action="/login"><label>Email <input name="email" type="email"></label> <button>Sign in</button></form><script>fetch("/api/me")</script>`));
    if (url.pathname === "/api/me") return logged ? send(200, "{}", "application/json") : send(401, "{}", "application/json");
    if (url.pathname === "/app") return logged ? send(200, html(`<h1>Dashboard</h1><p>Twelve invoices waiting, three of them late since last week.</p><button type="button">New invoice</button>`))
      : send(302, "", "text/plain", { location: "/login?next=/app" });
    if (url.pathname === "/og.png") return send(200, Buffer.from("89504e470d0a1a0a", "hex"), "image/png");
    return send(200, html(`<h1>Home</h1><p>The public page of the app, with a way in.</p><a href="/app">Open the app</a>`, `<meta property="og:image" content="/og.png">`));
  });
}

const withAccount = (dir, base) => {
  const file = join(dir, ".quality/project.json");
  const proj = JSON.parse(readFileSync(file, "utf8"));
  writeFileSync(file, JSON.stringify({ ...proj, urls: { local: base }, access: { accounts: { alice: { login: [{ goto: "/login" }, { fill: { selector: "input[name=email]", value: "alice@example.test" } }, { click: "button" }] } } } }));
};

// --- Without a browser ----------------------------------------------------------------------------------------

test("same screen: a redirect to another path or hash route is caught, a query added on the way is not", async () => {
  const { sameScreen, isLocalUrl, reachOf } = await lib("browser.mjs");
  assert.equal(sameScreen("http://a.test/app", "http://a.test/app/"), true);
  assert.equal(sameScreen("http://a.test/app", "http://a.test/app?tab=2"), true);
  assert.equal(sameScreen("http://a.test/app", "http://a.test/login?next=/app"), false);
  assert.equal(sameScreen("http://a.test/#/invoices", "http://a.test/#/login"), false);
  assert.equal(sameScreen("http://a.test/", "http://a.test/#/"), true);
  for (const u of ["http://localhost:5173/", "http://127.0.0.1:3000/x", "http://shop.localhost/", "http://app.test/"]) assert.equal(isLocalUrl(u), true, u);
  for (const u of ["https://example.com/", "https://staging.example.com/", "file:///C:/x.html"]) assert.equal(isLocalUrl(u), false, u);
  const r = reachOf("http://a.test/app", "http://a.test/login", [{ status: 429, url: "http://a.test/login" }]);
  assert.equal(r.same_screen, false);
  assert.match(r.warnings[0], /NOT THE REQUESTED SCREEN/);
  assert.match(r.warnings[1], /429.*rate limit/);
});

test("look scoring: an italic word alone does not count, rich motion declared is information, no point of view is said", async () => {
  const { scoreLook, motionFor } = await lib("look.mjs");
  const desk = (over = {}) => ({ families: [{ name: "fraunces", share: 0.7 }, { name: "work sans", share: 0.3 }], primary_button: null, gradient_text: 0, gradients: 0, glass: 0, glows: 0, radii: [], boxes: 0,
    card_triplets: 0, badge_before_h1: false, eyebrows: 0, side_stripes: 0, side_stripe_hues: 0, nested_cards: 0, icon_tiles: 0, numbered_labels: 0, pulsing_dots: 0, italic_accent_h1: false,
    page_bg: { h: 0, s: 0, l: 1 }, words: 0, em_dashes: 0, lang: "en", emoji_in_ui: [], sections: 5, animated: 0, visible_text: "", font_sizes: [16, 64], long_line_max: 0, long_lines: 0,
    tight_line_height: 0, targets_under_24: [], targets_under_44: 0, interactive: 0, accent_share: 0, body_size: 16, max_text_size: 64, heading_families: ["fraunces"], first_screen_visuals: 2, hues: 3, ...over });
  const score = (over, opts = {}) => scoreLook({ desktop: desk(over), mobile: desk(over) }, { mode: "persuade", ...opts });
  const italic = score({ italic_accent_h1: true });
  assert.ok(italic.signals.some((s) => s.id === "LOOK-ITALIC" && /only together with other/.test(s.evidence)));
  assert.deepEqual(italic.counted, []);
  assert.equal(italic.points, 0);
  const two = score({ italic_accent_h1: true, badge_before_h1: true });
  assert.deepEqual(two.counted.sort(), ["LOOK-BADGE", "LOOK-ITALIC"]);
  const busy = score({ animated: 9 });
  assert.ok(busy.counted.includes("LOOK-ANIMATE-ALL"));
  const rich = score({ animated: 9 }, { motion: "rich" });
  assert.equal(rich.signals.find((s) => s.id === "LOOK-ANIMATE-ALL").kind, "info");
  assert.ok(!rich.counted.includes("LOOK-ANIMATE-ALL"));
  assert.equal(motionFor({ "/": "rich", "/app/*": "calm" }, "http://a.test/"), "rich");
  assert.equal(motionFor({ "/": "rich", "/app/*": "calm" }, "http://a.test/app/settings"), "calm");
  assert.equal(motionFor({ "/": "rich" }, "http://a.test/pricing"), null);
  assert.equal(motionFor("rich", "http://a.test/pricing"), "rich");
  assert.equal(score({}).point_of_view, "present");
  const plain = score({ families: [{ name: "arial", share: 1 }], heading_families: ["arial"], max_text_size: 28, first_screen_visuals: 0, hues: 1 });
  assert.equal(plain.point_of_view, "none");
  assert.equal(plain.tier, "low", "no point of view is reported beside the tier, not added to it");
  assert.ok(plain.signals.some((s) => s.id === "LOOK-PLAIN" && s.weight === 0));
  assert.match(plain.tier_meaning, /not a good design/);
});

test("web: robots.txt and sitemap.xml answered by a single-page app fallback are absent", async () => {
  const { robotsProblem, sitemapProblem } = await lib("web.mjs");
  const res = (body, type, status = 200) => ({ ok: true, status, body, headers: { "content-type": type } });
  const index = "<!doctype html><html><body><div id=root></div></body></html>";
  assert.match(robotsProblem(res(index, "text/html")), /HTML page/);
  assert.match(robotsProblem(res(index, "")), /HTML page/);
  assert.equal(robotsProblem(res("User-agent: *\nAllow: /\n", "text/plain; charset=utf-8")), null);
  assert.match(sitemapProblem(res(index, "text/html")), /HTML page/);
  assert.match(sitemapProblem(res("{}", "application/json")), /not XML/);
  assert.equal(sitemapProblem(res('<?xml version="1.0"?><urlset><url><loc>https://a.test/</loc></url></urlset>', "application/xml")), null);
  const fallback = createServer((req, res2) => { res2.writeHead(200, { "content-type": "text/html" }); res2.end(index); });
  const base = await listen(fallback);
  try {
    const r = await run(fixture(), ["web", `${base}/`, "--run", "2026-11-01"]);
    assert.equal(r.out.robots_txt.present, false);
    assert.match(r.out.robots_txt.why, /HTML page/);
    assert.equal(r.out.sitemap.present, false);
  } finally { fallback.close(); }
});

// --- In a browser ---------------------------------------------------------------------------------------------

test("deslop: checkbox labels, tilted layouts and intended exceptions are not findings; the rest still is", async (t) => {
  const dir = fixture();
  const r = await run(dir, ["deslop", join(FIX, "deslop-intended.html"), "--widths", "375,1440", "--run", "2026-11-01"]);
  if (r.code !== 0 && /Chrome or Edge not found|needs Node 22/.test(r.stderr)) return t.skip("no Chrome or Edge, or Node under 22");
  assert.equal(r.code, 0, r.stderr);
  const rules = (w) => w.findings.flatMap((f) => f.examples.map((e) => `${f.rule} ${e.where}`));
  for (const w of r.out.widths) {
    const found = rules(w);
    assert.ok(!found.some((x) => x.startsWith("proximity-inverted")), `checkbox label not a heading at ${w.width}: ${found}`);
    assert.ok(!found.some((x) => /^(control-row-drift|uneven-siblings|left-edge-drift)/.test(x)), `tilted groups not measured as drifts at ${w.width}: ${found}`);
    assert.ok(!found.some((x) => x.includes("div.book")), "the binding is intended");
    assert.ok(found.some((x) => x.startsWith("uneven-inset div.uneven")), "an unexplained uneven inset is still found");
    assert.ok(w.intended.some((i) => i.rule === "uneven-inset" && i.reason === "cloth binding drawn on the left"));
    assert.ok(w.not_checked.some((n) => n.rule === "control-row-drift" && /rotated or 3D/.test(n.detail)));
    assert.ok(w.not_checked.some((n) => n.rule === "uneven-siblings"));
  }
});

test("a redirect to the login page is reported, not measured as a pass; --as logs in once and reaches the screen", async (t) => {
  if (!(await browser(t))) return;
  const server = loginApp();
  const base = await listen(server);
  try {
    const dir = fixture();
    withAccount(dir, base);
    const d = await run(dir, ["deslop", `${base}/app`, "--widths", "375", "--run", "2026-11-02"]);
    if (d.code !== 0 && /Chrome or Edge not found/.test(d.stderr)) return t.skip("no Chrome or Edge");
    assert.equal(d.code, 2, d.stderr);
    assert.match(d.out.warnings[0], /NOT THE REQUESTED SCREEN.*\/login/);
    assert.ok(d.out.warnings.some((w) => /401/.test(w)), "the refused API call is listed");
    assert.match(d.out.verdict, /not measured/);
    const da = await run(dir, ["deslop", `${base}/app`, "--widths", "375,1440", "--as", "alice", "--run", "2026-11-02"]);
    assert.equal(da.code, 0, da.stderr);
    assert.ok(!(da.out.warnings || []).some((w) => /NOT THE REQUESTED/.test(w)), JSON.stringify(da.out.warnings));
    assert.ok(da.out.widths.every((w) => w.measured_url.endsWith("/app")));

    const l = await run(dir, ["look", `${base}/app`, "--run", "2026-11-02"]);
    assert.equal(l.code, 2);
    assert.match(l.out.warnings[0], /NOT THE REQUESTED SCREEN/);
    assert.match(l.out.pages[0].tier, /^not measured/);

    const c = await run(dir, ["craft", `${base}/app`, "--as", "alice", "--run", "2026-11-02"]);
    assert.equal(c.code, 0, c.stderr);
    assert.equal(c.out.as, "alice");
    assert.ok(!c.out.warnings, JSON.stringify(c.out.warnings));
    const s = await run(dir, ["stress", `${base}/app`, "--only", "narrow", "--run", "2026-11-02"]);
    assert.equal(s.code, 2);
    assert.match(s.out.summary.verdict, /not measured/);
    const sa = await run(dir, ["stress", `${base}/app`, "--only", "narrow", "--as", "alice", "--run", "2026-11-02"]);
    assert.ok(!sa.out.summary.verdict, JSON.stringify(sa.out));
    const bad = await run(dir, ["craft", `${base}/app`, "--as", "bob", "--run", "2026-11-02"]);
    assert.equal(bad.code, 2);
    assert.match(bad.out.errors[0], /access\.accounts\.bob/);
  } finally { server.close(); }
});

test("look: a list item holding a layout is not prose, real long lines are named; --before runs before the page", async (t) => {
  if (!(await browser(t))) return;
  const dir = fixture();
  const l = await run(dir, ["look", join(FIX, "look-steps.html"), "--mode", "persuade", "--run", "2026-11-03"]);
  assert.equal(l.code, 0, l.stderr);
  const page = l.out.pages[0];
  assert.equal(page.checks.line_length.ok, false);
  assert.equal(page.checks.line_length.samples.length, 1, JSON.stringify(page.checks.line_length.samples));
  assert.match(page.checks.line_length.samples[0], /^p\.wide "Cette ligne/);
  assert.ok(page.signals.some((s) => s.id === "LOOK-ITALIC") && !page.counted.includes("LOOK-ITALIC"));
  assert.match(l.out.tier_meaning, /not a good design/);
  const plain = await run(dir, ["stress", join(FIX, "look-steps.html"), "--only", "narrow", "--run", "2026-11-03"]);
  const prepared = await run(dir, ["stress", join(FIX, "look-steps.html"), "--only", "narrow", "--before", "window.__swBefore = true", "--run", "2026-11-03"]);
  assert.ok(prepared.out.baseline.chars > plain.out.baseline.chars + 30, `${prepared.out.baseline.chars} vs ${plain.out.baseline.chars}`);
});

test("craft: a covered control fails click reached; on a local address the 404 status and share image wait for preproduction", async (t) => {
  if (!(await browser(t))) return;
  const dir = fixture();
  const c = await run(dir, ["craft", join(FIX, "craft-covered.html"), "--run", "2026-11-04"]);
  assert.equal(c.code, 0, c.stderr);
  const covered = c.out.pages[0].failed.click_reached;
  assert.equal(covered.level, "must");
  assert.ok(covered.samples.some((x) => /button#issue .*covered by div\.desk/.test(x)), JSON.stringify(covered.samples));
  assert.ok(!covered.samples.some((x) => x.includes("#free")));

  const server = loginApp();
  const base = await listen(server);
  // A single-page app with its own 404 page, drawn by script; the server answers 404 only to page requests.
  const spa = createServer((req, res) => {
    const page = /text\/html/.test(req.headers.accept || "");
    if (req.url === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(html("<h1>Home</h1><p>Welcome to the shop, open every day.</p>")); }
    res.writeHead(page ? 404 : 200, { "content-type": "text/html" });
    res.end(html(`<div id="root"></div><script>document.getElementById("root").innerHTML = '<h1>This page does not exist</h1><p>The address may be old.</p><a href="/">Back to the shop</a>';</script>`));
  });
  const spaBase = await listen(spa);
  try {
    const local = await run(dir, ["craft", `${base}/`, "--mode", "persuade", "--run", "2026-11-04"]);
    const p = local.out.pages[0];
    assert.deepEqual(Object.keys(p.to_check_in_preproduction).sort(), ["not_found_status", "share_image"]);
    assert.ok(!p.summary.must_failed.includes("not_found_status") && !p.summary.must_failed.includes("share_image"), JSON.stringify(p.summary));
    assert.ok(!p.failed.not_found_status && !p.failed.share_image);
    const s = await run(dir, ["craft", `${spaBase}/`, "--run", "2026-11-04"]);
    const sp = s.out.pages[0];
    assert.ok(sp.passed.includes("not_found_status"), "the request asks for a page (Accept: text/html)");
    assert.ok(sp.passed.includes("not_found_page"), JSON.stringify(sp.failed.not_found_page));
    const full = JSON.parse(readFileSync(join(dir, ".quality/audits/2026-11-04/craft.json"), "utf8"));
    assert.match(full.pages[0].measures.around.not_found.read_in, /browser/);
  } finally { server.close(); spa.close(); }
});

test("tiles: the style tiles are served, captured side by side, and a font that does not load is reported", async (t) => {
  if (!(await browser(t))) return;
  const dir = fixture();
  const tiles = join(dir, ".quality/design/tiles");
  mkdirSync(tiles, { recursive: true });
  cpSync(join(FIX, "tiles"), tiles, { recursive: true });
  const r = await run(dir, ["tiles"]);
  assert.equal(r.code, 2, r.stderr);
  assert.equal(r.out.tiles.length, 2);
  const ink = r.out.tiles.find((x) => x.file === "a-ink.html");
  assert.ok(ink.problems.some((p) => /Ink Display.*not loaded|not loaded: Ink Display/.test(p)), JSON.stringify(ink.problems));
  assert.ok(ink.problems.some((p) => /"Paper Text" is asked for but never declared/.test(p)), JSON.stringify(ink.problems));
  const plain = r.out.tiles.find((x) => x.file === "b-plain.html");
  assert.deepEqual(plain.problems, []);
  for (const f of [r.out.sheet.html, r.out.sheet.image, ink.screenshots.desktop, ink.screenshots.phone]) assert.ok(existsSync(join(dir, f)), f);
  assert.match(readFileSync(join(dir, r.out.sheet.html), "utf8"), /a-ink-desktop\.png[\s\S]*b-plain-desktop\.png/);
  const none = await run(dir, ["tiles", "no-such-folder"]);
  assert.equal(none.code, 2);
  assert.match(none.out.errors[0], /no folder/);
});
