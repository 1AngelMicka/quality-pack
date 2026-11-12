// Tests of the 0.7.0 commands: stress, profile, gap, bank, variants. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/qp.mjs");
const lib = (f) => import(`../plugins/core/scripts/lib/${f}`);
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "qp-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const run = (cwd, args) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...process.env, QP_NO_CALIBRATION: "1" } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));
const browser = async (t) => { const { loadBrowserTools } = await lib("browser.mjs"); if (await loadBrowserTools(ROOT)) return true; t.skip("Playwright not installed (run qp.mjs browser-setup)"); return false; };

// Serves the two stress pages; /api/items answers with a list.
function site() {
  const page = (f) => readFileSync(join(ROOT, "tests/fixtures/stress", f), "utf8");
  return createServer((req, res) => {
    if (req.url === "/api/items") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(["First item of the list", "Second item of the list", "Third item of the list"])); }
    res.setHeader("content-type", "text/html");
    res.end(page(req.url.startsWith("/sturdy") ? "sturdy.html" : "fragile.html"));
  }).listen(0);
}

test("stress: a screen with no waiting or error state fails the passes, a careful one holds", async (t) => {
  if (!(await browser(t))) return;
  const server = site();
  try {
    const dir = fixture();
    const base = `http://localhost:${server.address().port}`;
    const fragile = await run(dir, ["stress", `${base}/fragile`, "--run", "2026-09-01"]);
    assert.equal(fragile.code, 2);
    assert.ok(fragile.out.baseline.data_requests >= 1);
    for (const k of ["failing_no_crash", "long_no_overflow", "narrow_reflow"]) assert.ok(fragile.out.summary.must_failed.includes(k), `must ${k}: ${JSON.stringify(fragile.out.summary)}`);
    for (const k of ["slow_indicator", "failing_message", "long_no_clipping"]) assert.ok(fragile.out.summary.should_failed.includes(k), `should ${k}: ${JSON.stringify(fragile.out.summary)}`);
    const sturdy = await run(dir, ["stress", `${base}/sturdy`, "--run", "2026-09-01"]);
    assert.deepEqual(sturdy.out.summary.must_failed, [], JSON.stringify(sturdy.out.failed));
    assert.deepEqual(sturdy.out.summary.should_failed, [], JSON.stringify(sturdy.out.failed));
    for (const k of ["slow_not_blank", "slow_indicator", "failing_message", "failing_retry", "keyboard_reaches_content"]) assert.ok(sturdy.out.passed.includes(k), `passed ${k}`);
    assert.equal(sturdy.code, 0);
    // Both screens are kept in the run, with their screenshots.
    const saved = JSON.parse(readFileSync(join(dir, ".quality/audits/2026-09-01/stress.json"), "utf8"));
    assert.equal(saved.pages.length, 2);
    assert.ok(readdirSync(join(dir, ".quality/audits/2026-09-01/stress")).length >= 10);
    // --only limits the passes.
    const narrow = await run(dir, ["stress", `${base}/sturdy`, "--only", "narrow", "--run", "2026-09-02"]);
    assert.deepEqual(Object.keys(narrow.out.failed).concat(narrow.out.passed), ["narrow_reflow"]);
  } finally { server.close(); }
});

test("profile and gap: a screen is compared with the references in numbers", async (t) => {
  const { summarize, gap, PROPERTIES } = await lib("profile.mjs");
  const p = (families, image, body) => ({ desktop: { type: { families, body_px: body, sizes: 5 }, first_screen: { image_share: image } }, mobile: { type: { families, body_px: body, sizes: 5 }, first_screen: { image_share: image } } });
  const refs = [p(2, 0.5, 17), p(2, 0.6, 18), p(1, 0.55, 17), p(2, 0.45, 16)];
  const sum = summarize(refs);
  assert.equal(sum.n, 4);
  assert.equal(sum.desktop["type.families"].mid, 2);
  const g = gap(p(5, 0.02, 12), sum);
  const props = g.gaps.map((x) => x.property);
  assert.ok(props.includes("type.families") && props.includes("first_screen.image_share") && props.includes("type.body_px"), JSON.stringify(g.gaps));
  assert.equal(g.gaps.find((x) => x.property === "type.families").direction, "above");
  assert.equal(g.gaps.find((x) => x.property === "first_screen.image_share").direction, "below");
  assert.ok(!props.includes("type.sizes"));
  assert.equal(gap(p(2, 0.52, 17), sum).outside, 0);
  assert.ok(PROPERTIES.length >= 20);
  if (!(await browser(t))) return;
  const dir = fixture();
  const page = (f) => join(ROOT, "tests/fixtures", f);
  const saved = await run(dir, ["profile", page("craft/polished.html"), page("look/plain.html"), "--save"]);
  assert.equal(saved.out.saved.references, 2);
  assert.ok(saved.out.pages[0].desktop.type.body_px >= 14 && saved.out.pages[0].mobile.first_screen.text_share >= 0);
  // Layout basics are measured too: spacing, sizes of blocks and objects, regularity.
  const lay = saved.out.pages[0].desktop.layout;
  for (const k of ["content_width_px", "gutter_px", "gap_values", "gap_median_px", "gaps_on_4px_grid", "even_gap_groups", "even_size_groups", "aligned_left_edges", "button_height_px", "h1_px"]) assert.ok(lay[k] != null, `layout.${k}`);
  assert.ok(lay.content_width_px <= 1440 && lay.button_height_px >= 20);
  const refsFile = JSON.parse(readFileSync(join(dir, ".quality/references.json"), "utf8"));
  assert.equal(refsFile.summary.n, 2);
  const cmp = await run(dir, ["gap", page("look/generic.html"), "--run", "2026-09-03"]);
  assert.match(cmp.out.against, /2 project references/);
  assert.ok(Array.isArray(cmp.out.gaps));
  assert.ok(existsSync(join(dir, ".quality/audits/2026-09-03/gap.json")));
});

test("bank: every type is well formed and the list can be read", async () => {
  const { loadBank, validateType, listBank } = await lib("bank.mjs");
  const bank = loadBank();
  const ids = Object.keys(bank.types);
  assert.ok(ids.length >= 12, `only ${ids.length} site types in the bank`);
  const errors = ids.flatMap((id) => validateType(bank.types[id], id));
  assert.deepEqual(errors, []);
  const all = ids.flatMap((id) => bank.types[id].sites.map((s) => s.url));
  assert.ok(all.length >= 80, `only ${all.length} reference sites`);
  assert.equal(listBank(bank).types.length, ids.length);
  const one = listBank(bank, ids[0]);
  assert.ok(one.expects.length && one.sites.length && one.avoid.length);
  assert.ok(listBank(bank, "no-such-type").errors);
  assert.ok(validateType({ label: { fr: "x", en: "x" }, expects: [{ rule: "r" }], avoid: ["a"], sites: [{ url: "http://x", name: "", why: "short" }] }, "t").length >= 3);
});

test("variants: letters are shuffled, pairs listed, and votes ranked", async (t) => {
  const { tallyVariants, variantsDir } = await lib("variants.mjs");
  // Tally alone, from votes written by hand.
  const dir = fixture();
  const vdir = variantsDir(dir, "hero");
  mkdirSync(join(vdir, "votes"), { recursive: true });
  const m = (must) => ({ finish_must_failed: must, finish_should_failed: 0 });
  writeFileSync(join(vdir, "variants.json"), JSON.stringify({ name: "hero", variants: [{ letter: "A", measures: m([]) }, { letter: "B", measures: m(["focus_visible"]) }, { letter: "C", measures: m([]) }] }));
  writeFileSync(join(vdir, "key.json"), JSON.stringify({ key: { A: "http://x/a", B: "http://x/b", C: "http://x/c" } }));
  const vote = (j, pair, winner, extra = {}) => ({ juror: j, device: "desktop", pair, winner, margin: "clear", reasons: [`${winner} reads faster`], ...extra });
  writeFileSync(join(vdir, "votes", "j1.json"), JSON.stringify([vote("j1", ["A", "B"], "B"), vote("j1", ["C", "A"], "C"), vote("j1", ["B", "C"], "B", { loser_keeps: ["C has the clearer price table"] })]));
  writeFileSync(join(vdir, "votes", "j2.json"), JSON.stringify([vote("j2", ["B", "A"], "B"), vote("j2", ["A", "C"], "A"), vote("j2", ["C", "B"], "B")]));
  writeFileSync(join(vdir, "votes", "j3.json"), JSON.stringify([vote("j3", ["A", "B"], "A"), vote("j3", ["A", "C"], "C"), vote("j3", ["B", "C"], "C"), { pair: ["A", "Z"], winner: "A" }]));
  const r = tallyVariants("hero", { root: dir });
  assert.deepEqual(r.ranking.map((x) => x.letter), ["B", "C", "A"]);
  assert.equal(r.ranking[0].pairs_won, 2);
  assert.equal(r.ranking[0].address, "http://x/b");
  assert.equal(r.invalid_votes.length, 1);
  assert.ok(r.warnings.some((w) => w.includes("focus_visible")));
  assert.ok(r.ranking.find((x) => x.letter === "C").keeps.includes("C has the clearer price table"));
  assert.match(r.verdict, /^B leads/);
  assert.ok(tallyVariants("nothing", { root: dir }).errors);
  if (!(await browser(t))) return;
  const page = (f) => join(ROOT, "tests/fixtures", f);
  const shot = await run(dir, ["variants", "landing", page("craft/polished.html"), page("craft/rough.html"), page("look/plain.html")]);
  assert.deepEqual(shot.out.variants.map((v) => v.letter), ["A", "B", "C"]);
  assert.equal(shot.out.pairs.length, 3);
  for (const v of shot.out.variants) { assert.ok(existsSync(join(dir, v.screenshots.desktop)) && existsSync(join(dir, v.screenshots.mobile))); assert.ok(Array.isArray(v.measures.finish_must_failed)); }
  // What the jurors are given never names the source; the key is kept apart.
  assert.ok(!JSON.stringify(shot.out).includes("rough.html"));
  const key = JSON.parse(readFileSync(join(dir, ".quality/variants/landing/key.json"), "utf8")).key;
  const roughLetter = Object.entries(key).find(([, u]) => u.includes("rough.html"))[0];
  assert.ok(shot.out.variants.find((v) => v.letter === roughLetter).measures.finish_must_failed.length >= 3);
  assert.equal((await run(dir, ["variants", "x", page("craft/polished.html")])).code, 2);
});

test("calibration: a finish rule that most excellent sites break becomes advice", async () => {
  const { summarizeCalibration, ADVICE_RATE } = await lib("bank.mjs");
  const { scoreCraft } = await lib("craft.mjs");
  const site = (wrapOk, focusOk) => ({ craft: { checks: { heading_wrap: { level: "should", ok: wrapOk }, focus_visible: { level: "must", ok: focusOk }, caps_tracking: { level: "should", ok: true } } }, look: { tier: "low", points: 1, signals: ["LOOK-FONT"] } });
  // 12 excellent sites: 7 do not balance their headings, 3 have a focus problem, none fails caps tracking.
  const pages = [...Array(7).fill(site(false, true)), ...Array(2).fill(site(true, true)), ...Array(3).fill(site(true, false)), { error: "did not load" }];
  const cal = summarizeCalibration(pages);
  assert.equal(cal.sites, 12);
  assert.equal(cal.craft.heading_wrap.fail_rate, 0.58);
  assert.ok(cal.craft.heading_wrap.fail_rate >= ADVICE_RATE);
  assert.deepEqual(cal.advice, ["heading_wrap"]);
  assert.deepEqual(cal.frequent_must, ["focus_visible (25 %)"]);
  assert.equal(cal.look.signals["LOOK-FONT"].rate, 1);
  // The same page, scored without and with the calibration.
  const empty = { headings_multi_line: 1, headings_without_wrap: ["h1"], headings_orphan: [], loose_headings: [], number_columns: 0, number_columns_not_tabular: 0,
    typewriter: { straight_apostrophes: 0, straight_quotes: 0, three_dots: 0, hyphen_dash: 0, french_spaces: 0, samples: [] }, caps_without_tracking: ["p"], weights: ["400"], title_case_labels: [], sentence_case_labels: [], inputs_under_16px: [] };
  const m = { desktop: { lang: "en", type: empty, surfaces: { pure_black_on_white: 0, body_text_elements: 0, dark_page: false, color_scheme: "", shadows: 0, harsh_shadows: [], nested_radius: [], selection_rule: true, focus_rule: true, unreadable_stylesheets: 0 },
    motion: { transition_all: [], slow: [], layout_properties: [], layout_count: 0, durations_ms: [] }, media: { images: 0, distorted: [], blurry: [], low_density: 0, unsized: [], icons: 0, icon_strokes: {}, icon_sizes: {}, icons_filled: 0, icons_stroked: 0, lucide: 0 },
    head: { viewport_blocks_zoom: false } }, focus: { stops: 3, without_indicator: ["a"] } };
  const plain = scoreCraft(structuredClone(m));
  assert.deepEqual(plain.summary.should_failed.sort(), ["caps_tracking", "heading_wrap"]);
  const calibrated = scoreCraft(structuredClone(m), { calibration: { ...cal, measured: "2026-11-12" } });
  assert.deepEqual(calibrated.summary.should_failed, ["caps_tracking"]);
  assert.deepEqual(calibrated.summary.advice, ["heading_wrap"]);
  assert.equal(calibrated.checks.heading_wrap.level, "advice");
  // A "must" stays a must, with its rate shown.
  assert.deepEqual(calibrated.summary.must_failed, ["focus_visible"]);
  assert.equal(calibrated.checks.focus_visible.excellent_sites_failing, "25 % of 12");
});

test("seo: sitemap, titles, descriptions, keywords and Search Console are read like a search engine", async () => {
  const { carries, parsePage, fold } = await lib("seo.mjs");
  assert.equal(fold("Création d’entreprise !"), "creation d entreprise");
  assert.deepEqual(carries("Logiciel de facturation pour les indépendants", "logiciel facturation independants"), { exact: false, words: true });
  assert.equal(carries("Facturation en ligne", "logiciel de facturation").words, false);
  const p = parsePage('<html lang="fr"><head><title> Tarifs </title><meta name="description" content="Nos prix"><link rel="canonical" href="/tarifs"></head><body><main><h1>Tarifs</h1><img src="a.png"><img src="b.png" alt="Capture"></main></body></html>', "https://x.test/tarifs");
  assert.equal(p.title, "Tarifs"); assert.equal(p.canonical, "https://x.test/tarifs"); assert.equal(p.images_without_alt, 1); assert.deepEqual(p.h1, ["Tarifs"]);
  const html = (title, desc, h1, body = "") => `<!doctype html><html lang="fr"><head><title>${title}</title>${desc ? `<meta name="description" content="${desc}">` : ""}</head><body><main><h1>${h1}</h1><p>${body}</p></main></body></html>`;
  const long = "Créez et envoyez vos factures en deux minutes, suivez les paiements et relancez vos clients sans y penser. ".repeat(8);
  let good = false;
  const server = createServer((req, res) => {
    const o = `http://localhost:${server.address().port}`;
    const send = (type, body, code = 200) => { res.statusCode = code; res.setHeader("content-type", type); res.end(body); };
    if (req.url === "/robots.txt") return send("text/plain", good ? `User-agent: *\nAllow: /\nSitemap: ${o}/sitemap.xml\n` : "User-agent: *\nAllow: /\n");
    if (req.url === "/sitemap.xml") return send("application/xml", `<urlset>${["/", "/tarifs", ...(good ? [] : ["/ancienne", "/cachee"])].map((u) => `<url><loc>${o}${u}</loc>${good ? "<lastmod>2026-11-01</lastmod>" : ""}</url>`).join("")}${good ? "" : "<url><loc>http://localhost:1/x</loc></url>"}</urlset>`);
    if (req.url === "/") return send("text/html", good ? html("Logiciel de facturation pour indépendants – Facto", "Facto est un logiciel de facturation pour indépendants : créez une facture en deux minutes et suivez vos paiements.", "Le logiciel de facturation des indépendants", `Un logiciel de facturation pensé pour les indépendants. ${long}`)
      : html("Accueil", "", "Bienvenue", "Bonjour."));
    if (req.url === "/tarifs") return send("text/html", good ? html("Prix du logiciel de facturation Facto : 9 € par mois", "Le prix du logiciel de facturation Facto : une offre à 9 € par mois, sans engagement, essai gratuit de 14 jours.", "Prix du logiciel de facturation", `Le prix de notre logiciel de facturation est simple. ${long}`)
      : html("Accueil", "", "Tarifs", "Nos prix."));
    if (req.url === "/cachee") { res.setHeader("x-robots-tag", "noindex"); return send("text/html", html("Page cachée du site", "", "Cachée")); }
    send("text/html", "<h1>Introuvable</h1>", 404);
  }).listen(0);
  try {
    const dir = fixture();
    const base = `http://localhost:${server.address().port}`;
    const f = join(dir, ".quality/project.json");
    const set = (patch) => writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), ...patch }));
    set({ urls: { production: base }, seo: { keywords: [{ page: "/", keyword: "logiciel de facturation pour indépendants" }, { page: "/tarifs", keyword: "prix logiciel de facturation" }] } });
    const bad = await run(dir, ["seo", "--run", "2026-10-01"]);
    assert.equal(bad.code, 2);
    for (const k of ["sitemap_same_site", "sitemap_pages_answer", "sitemap_pages_indexable", "description_present", "title_unique", "keywords_on_page", "search_console"]) assert.ok(bad.out.summary.must_failed.includes(k), `must ${k}: ${JSON.stringify(bad.out.summary)}`);
    for (const k of ["sitemap_in_robots", "sitemap_lastmod", "title_length", "thin_pages"]) assert.ok(bad.out.summary.should_failed.includes(k), `should ${k}: ${JSON.stringify(bad.out.summary)}`);
    good = true;
    set({ seo: { keywords: [{ page: "/", keyword: "logiciel de facturation pour indépendants" }, { page: "/tarifs", keyword: "prix logiciel de facturation" }], search_console: { verified: "2026-11-10", sitemap_submitted: "2026-11-10" } } });
    const ok = await run(dir, ["seo", "--run", "2026-10-01"]);
    assert.deepEqual(ok.out.summary.must_failed, [], JSON.stringify(ok.out.failed));
    assert.deepEqual(ok.out.summary.should_failed, [], JSON.stringify(ok.out.failed));
    assert.ok(ok.out.keywords.every((k) => k.ok && k.found_in.includes("title")));
    assert.equal(ok.code, 0);
    assert.ok(existsSync(join(dir, ".quality/audits/2026-10-01/seo.json")));
  } finally { server.close(); }
});
