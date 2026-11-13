// Search readiness of the public pages, read over HTTP like a search engine does (no browser, no script):
//  - the sitemap: found, declared in robots.txt, every address in it answers 200, is indexable and is its own canonical;
//  - every page: a title and a meta description that are filled, of a workable length and not repeated, one h1;
//  - the keywords the project wants to be found for (.quality/project.json › seo.keywords): each target page
//    carries its phrase in the title, the h1, the description, the address and the first paragraph;
//  - signs that the site was declared to a search engine (verification tag or file). Verification by DNS cannot
//    be seen from outside, and nobody can check from here that the sitemap was submitted: those are confirmed
//    by the user in seo.search_console.
// Lengths are house settings: search engines cut titles and descriptions by width, not by a fixed count.
export const LIMITS = { title: [15, 60], description: [70, 160], pages: 60 };

const strip = (s) => String(s || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
// Compare words without accents, case or punctuation: "Création d'entreprise" matches "creation entreprise".
export const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’'`]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["de", "du", "des", "le", "la", "les", "un", "une", "et", "en", "a", "au", "aux", "pour", "d", "l", "the", "a", "an", "of", "for", "and", "in", "to", "on", "with"]);

// Does a text carry a phrase? exact: the folded phrase appears as such; words: every meaningful word appears.
export function carries(text, phrase) {
  const t = ` ${fold(text)} `, p = fold(phrase);
  if (!p) return { exact: false, words: false };
  const words = p.split(" ").filter((w) => !STOP.has(w));
  return { exact: t.includes(` ${p} `), words: words.length > 0 && words.every((w) => t.includes(` ${w}`)) };
}

export function parsePage(html, url) {
  const head = (/<head[\s\S]*?<\/head>/i.exec(html) || [html])[0];
  const meta = (name) => { const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i"); const tag = re.exec(head)?.[0]; return tag ? (/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? "").trim() : null; };
  const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head) || [])[1] || "");
  const canonicalTag = /<link[^>]+rel=["']canonical["'][^>]*>/i.exec(head)?.[0];
  const canonical = canonicalTag ? /href=["']([^"']+)["']/i.exec(canonicalTag)?.[1] : null;
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const body = (/<body[\s\S]*<\/body>/i.exec(html) || [html])[0];
  const main = (/<main[\s\S]*?<\/main>/i.exec(body) || [body])[0];
  const text = strip(main);
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  let canon = null;
  try { canon = canonical ? new URL(canonical, url).href : null; } catch { /* invalid */ }
  return { title, description: meta("description"), robots: meta("robots") || "", canonical: canon, h1: h1s, lang: /<html[^>]+lang=["']([^"']+)["']/i.exec(html)?.[1] || null,
    words: text.split(" ").filter(Boolean).length, first_words: text.split(" ").slice(0, 100).join(" "),
    images: imgs.length, images_without_alt: imgs.filter((t) => !/\balt=["'][^"']+["']/i.test(t)).length,
    verification: { google: meta("google-site-verification") != null, bing: meta("msvalidate.01") != null } };
}

async function get(url, timeout = 20000) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeout), headers: { "user-agent": "shipwright seo check", accept: "text/html,application/xml;q=0.9,*/*;q=0.5" } });
    const body = res.status === 200 ? await res.text() : "";
    return { status: res.status, body, location: res.headers.get("location"), robots_header: res.headers.get("x-robots-tag") || "", type: res.headers.get("content-type") || "" };
  } catch (e) { return { error: String(e.cause?.code || e.message).slice(0, 120) }; }
}

const same = (a, b) => { try { const x = new URL(a), y = new URL(b); return x.host === y.host && x.pathname.replace(/\/$/, "") === y.pathname.replace(/\/$/, "") && x.search === y.search; } catch { return false; } };

// Addresses of a sitemap, following a sitemap index one level down.
async function sitemapUrls(url, depth = 0) {
  const r = await get(url);
  if (r.error || r.status !== 200) return { url, found: false, status: r.status ?? r.error, urls: [], lastmod: 0 };
  const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (/<sitemapindex\b/i.test(r.body) && depth === 0) {
    const all = { url, found: true, index: true, urls: [], lastmod: 0, children: locs.length };
    for (const child of locs.slice(0, 10)) { const c = await sitemapUrls(child, 1); all.urls.push(...c.urls); all.lastmod += c.lastmod; }
    return all;
  }
  return { url, found: /<urlset\b/i.test(r.body), urls: locs, lastmod: (r.body.match(/<lastmod>/gi) || []).length };
}

export async function seoChecks(base, { keywords = [], searchConsole = null, limit = LIMITS.pages } = {}) {
  let origin;
  try { origin = new URL(base).origin; } catch { return { errors: [`not an address: ${base}`] }; }
  const checks = {};
  const add = (id, level, ok, value, rule, samples) => { checks[id] = { level, ok, value, rule, ...(samples?.length ? { samples: samples.slice(0, 8) } : {}) }; };

  // --- Sitemap and robots.txt
  const robots = await get(`${origin}/robots.txt`);
  const declared = robots.status === 200 ? [...robots.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
  const blocksAll = robots.status === 200 && /^\s*user-agent:\s*\*\s*[\r\n]+(?:\s*#.*[\r\n]+)*\s*disallow:\s*\/\s*$/im.test(robots.body);
  const sm = await sitemapUrls(declared[0] || `${origin}/sitemap.xml`);
  add("sitemap_present", "must", sm.found && sm.urls.length > 0, sm.found ? `${sm.urls.length} address(es) in ${sm.url}${sm.index ? " (index)" : ""}` : `no sitemap at ${sm.url} (${sm.status})`,
    "the site has a sitemap.xml that lists its public pages");
  add("sitemap_in_robots", "should", declared.length > 0, declared.length ? `robots.txt declares ${declared[0]}` : robots.status === 200 ? "robots.txt has no Sitemap line" : `no robots.txt (${robots.status ?? robots.error})`,
    "robots.txt gives the sitemap's address (Sitemap: https://…/sitemap.xml), so every search engine finds it");
  add("robots_allows", "must", !blocksAll, blocksAll ? "robots.txt forbids the whole site to every robot (Disallow: /)" : "robots.txt does not block the site", "robots.txt does not shut the whole site out of search engines in production");
  if (sm.found && sm.urls.length) {
    const foreign = sm.urls.filter((u) => { try { return new URL(u).origin !== origin; } catch { return true; } });
    add("sitemap_same_site", "must", foreign.length === 0, `${foreign.length} address(es) on another host or scheme`, "every address of the sitemap is on the site's own https address (not localhost, not the staging host, not http)", foreign);
    add("sitemap_lastmod", "should", sm.lastmod >= sm.urls.length * 0.8, `${sm.lastmod} of ${sm.urls.length} entries have a lastmod date`, "sitemap entries carry the date of their last real change (lastmod)");
  }

  // --- Pages: those of the sitemap, the home page, and every keyword target.
  const targets = keywords.map((k) => { try { return new URL(k.page || "/", origin).href; } catch { return null; } }).filter(Boolean);
  const list = [...new Set([`${origin}/`, ...targets, ...sm.urls.filter((u) => u.startsWith(origin))])].slice(0, limit);
  const pages = [];
  for (const url of list) {
    const r = await get(url);
    const p = { url, status: r.status ?? null, error: r.error, in_sitemap: sm.urls.some((u) => same(u, url)) };
    if (r.status === 200 && /html/.test(r.type)) Object.assign(p, parsePage(r.body, url), { noindex: /noindex/i.test(r.robots_header) });
    if (p.robots != null && /noindex/i.test(p.robots)) p.noindex = true;
    if (r.status >= 300 && r.status < 400) p.redirects_to = r.location;
    pages.push(p);
  }
  const ok200 = pages.filter((p) => p.status === 200 && p.title != null);
  const inMap = pages.filter((p) => p.in_sitemap);
  const short = (u) => u.replace(origin, "") || "/";
  if (inMap.length) {
    const broken = inMap.filter((p) => p.status !== 200);
    add("sitemap_pages_answer", "must", broken.length === 0, `${broken.length} of ${inMap.length} sitemap address(es) do not answer 200`, "every address of the sitemap answers 200 directly (no redirect, no error)", broken.map((p) => `${short(p.url)} → ${p.status ?? p.error}${p.redirects_to ? ` (${p.redirects_to})` : ""}`));
    const hidden = inMap.filter((p) => p.noindex);
    add("sitemap_pages_indexable", "must", hidden.length === 0, `${hidden.length} sitemap page(s) carry noindex`, "a page listed in the sitemap is not marked noindex", hidden.map((p) => short(p.url)));
    const elsewhere = inMap.filter((p) => p.canonical && !same(p.canonical, p.url));
    add("sitemap_pages_canonical", "should", elsewhere.length === 0, `${elsewhere.length} sitemap page(s) whose canonical points elsewhere`, "the sitemap lists canonical addresses only", elsewhere.map((p) => `${short(p.url)} → ${p.canonical}`));
  }
  if (ok200.length) {
    const [tMin, tMax] = LIMITS.title, [dMin, dMax] = LIMITS.description;
    const noTitle = ok200.filter((p) => !p.title);
    add("title_present", "must", noTitle.length === 0, `${noTitle.length} of ${ok200.length} page(s) without a title`, "every public page has a <title>", noTitle.map((p) => short(p.url)));
    const badTitle = ok200.filter((p) => p.title && (p.title.length < tMin || p.title.length > tMax));
    add("title_length", "should", badTitle.length === 0, `${badTitle.length} title(s) outside ${tMin} to ${tMax} characters`, `titles are ${tMin} to ${tMax} characters: long enough to say what the page is, short enough not to be cut in results`, badTitle.map((p) => `${short(p.url)}: ${p.title.length} characters`));
    const noDesc = ok200.filter((p) => !p.description);
    add("description_present", "must", noDesc.length === 0, `${noDesc.length} of ${ok200.length} page(s) without a meta description`, "every public page has a meta description written for it", noDesc.map((p) => short(p.url)));
    const badDesc = ok200.filter((p) => p.description && (p.description.length < dMin || p.description.length > dMax));
    add("description_length", "should", badDesc.length === 0, `${badDesc.length} description(s) outside ${dMin} to ${dMax} characters`, `descriptions are ${dMin} to ${dMax} characters`, badDesc.map((p) => `${short(p.url)}: ${p.description.length} characters`));
    const dup = (key) => { const m = new Map(); for (const p of ok200) if (p[key]) (m.get(fold(p[key])) || m.set(fold(p[key]), []).get(fold(p[key]))).push(short(p.url)); return [...m.values()].filter((v) => v.length > 1); };
    const dt = dup("title"), dd = dup("description");
    add("title_unique", "must", dt.length === 0, `${dt.length} title(s) used on several pages`, "each page has its own title", dt.map((v) => v.join(" = ")));
    add("description_unique", "should", dd.length === 0, `${dd.length} description(s) used on several pages`, "each page has its own description", dd.map((v) => v.join(" = ")));
    const h1 = ok200.filter((p) => p.h1.length !== 1);
    add("one_h1", "should", h1.length === 0, `${h1.length} page(s) without exactly one h1`, "each page has one h1 that says what the page is about", h1.map((p) => `${short(p.url)}: ${p.h1.length} h1`));
    const same1 = ok200.filter((p) => p.title && p.h1[0] && fold(p.title) === fold(p.h1[0]) && ok200.length > 3);
    const thin = ok200.filter((p) => p.words < 120);
    add("thin_pages", "should", thin.length <= ok200.length * 0.2, `${thin.length} page(s) under 120 words in the served HTML`, "a page meant to be found has real text in the HTML the server sends", thin.map((p) => `${short(p.url)}: ${p.words} words`));
    const noAlt = ok200.filter((p) => p.images_without_alt > 0);
    add("image_alt", "should", noAlt.length === 0, `${noAlt.reduce((t, p) => t + p.images_without_alt, 0)} image(s) without alt text on ${noAlt.length} page(s)`, "images that carry meaning have an alt text (decorative ones have alt=\"\" and are not counted as found content)", noAlt.map((p) => `${short(p.url)}: ${p.images_without_alt}`));
    void same1;
  }

  // --- Keywords
  const kw = [];
  if (!keywords.length) add("keywords_declared", "should", false, "no keywords in .quality/project.json › seo.keywords", "the project names the searches it wants to be found for, one main phrase per page");
  else {
    const byPage = new Map();
    for (const k of keywords) {
      const url = (() => { try { return new URL(k.page || "/", origin).href; } catch { return null; } })();
      const p = pages.find((x) => x.url === url);
      const row = { keyword: k.keyword, page: k.page || "/" };
      if (!p || p.status !== 200 || p.title == null) { kw.push({ ...row, error: p ? `the page answers ${p.status ?? p.error}` : "page not fetched" }); continue; }
      const slug = decodeURIComponent(new URL(p.url).pathname);
      const where = { title: carries(p.title, k.keyword), h1: carries(p.h1.join(" "), k.keyword), description: carries(p.description, k.keyword), first_paragraph: carries(p.first_words, k.keyword), address: carries(slug, k.keyword) };
      const got = Object.entries(where).filter(([, v]) => v.words).map(([n]) => n);
      // The home page has no slug to carry a phrase.
      const missing = ["title", "h1", "description", "first_paragraph", ...(slug === "/" ? [] : ["address"])].filter((n) => !where[n].words);
      kw.push({ ...row, found_in: got, exact_in: Object.entries(where).filter(([, v]) => v.exact).map(([n]) => n), missing, ok: where.title.words && where.h1.words && missing.length <= 1 });
      (byPage.get(url) || byPage.set(url, []).get(url)).push(k.keyword);
    }
    const bad = kw.filter((k) => !k.ok);
    add("keywords_on_page", "must", bad.length === 0, `${bad.length} of ${kw.length} keyword(s) not carried by their page`, "each target page carries its phrase in the title and the h1, and in at least two of: description, first paragraph, address",
      bad.map((k) => `"${k.keyword}" on ${k.page}: ${k.error || `missing in ${k.missing.join(", ")}`}`));
    const seen = new Map();
    for (const k of keywords) { const f = fold(k.keyword); (seen.get(f) || seen.set(f, new Set()).get(f)).add(k.page || "/"); }
    const clash = [...seen.entries()].filter(([, pg]) => pg.size > 1).map(([f, pg]) => `"${f}" targeted by ${[...pg].join(" and ")}`);
    add("keywords_one_page_each", "should", clash.length === 0, `${clash.length} phrase(s) targeted by several pages`, "one page per phrase: two pages aiming at the same search compete with each other", clash);
  }

  // --- Declared to search engines
  const home = pages[0];
  const fileProof = (await get(`${origin}/BingSiteAuth.xml`)).status === 200;
  const tag = !!home?.verification?.google;
  const sc = searchConsole || {};
  add("search_console", "must", !!sc.verified && !!sc.sitemap_submitted, sc.verified && sc.sitemap_submitted ? `property verified ${sc.verified}, sitemap submitted ${sc.sitemap_submitted}`
    : `not confirmed in project.json › seo.search_console${tag ? " (a Google verification tag is on the home page)" : ""}`,
    "the site is a verified property in Google Search Console and its sitemap was submitted there (record the two dates in project.json › seo.search_console once done)");
  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  const should = Object.entries(checks).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
  return { base: origin, pages_read: pages.length, sitemap: { url: sm.url, found: sm.found, addresses: sm.urls.length }, summary: { checks: Object.keys(checks).length, must_failed: must, should_failed: should }, checks, keywords: kw,
    signs: { google_verification_tag: tag, bing_verification: !!home?.verification?.bing || fileProof },
    pages: pages.map((p) => ({ url: short(p.url), status: p.status, title: p.title, title_chars: p.title?.length ?? null, description_chars: p.description?.length ?? null, h1: p.h1?.[0] ?? null, words: p.words ?? null, in_sitemap: p.in_sitemap, noindex: !!p.noindex })),
    note: "Read from the HTML the server sends, without running scripts. This checks that pages are ready to be found; it cannot tell where they rank. Lengths are house settings." };
}
