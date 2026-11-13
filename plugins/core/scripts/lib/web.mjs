// HTTP-level checks of a running site: security headers, compression, caching, SEO metadata, robots, sitemap.
// Uses the global fetch of Node 18+. Results are evidence; the auditor decides pass or fail.

const UA = "shipwright-audit";

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 15000);
  try {
    const res = await fetch(url, { redirect: opts.redirect || "follow", signal: ctrl.signal,
      headers: { "user-agent": UA, "accept-encoding": "br, gzip", ...(opts.headers || {}) } });
    const body = opts.body === false ? "" : await res.text();
    return { ok: true, status: res.status, url: res.url, headers: Object.fromEntries(res.headers), body, redirected: res.redirected };
  } catch (e) {
    return { ok: false, error: String(e.cause?.code || e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
};

export function parseHead(html) {
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [html])[0];
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key) => {
    const t = metas.find((m) => [attr(m, "name"), attr(m, "property")].some((v) => v && v.toLowerCase() === key));
    return t ? attr(t, "content") : null;
  };
  const link = (rel) => links.filter((l) => (attr(l, "rel") || "").toLowerCase().split(/\s+/).includes(rel)).map((l) => attr(l, "href"));
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || null;
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  const bodyText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
  return {
    title, description: meta("description"), robots: meta("robots"), viewport: meta("viewport"),
    canonical: link("canonical")[0] || null, lang: attr(htmlTag, "lang"),
    og: { title: meta("og:title"), description: meta("og:description"), image: meta("og:image"), url: meta("og:url"), type: meta("og:type") },
    twitter: { card: meta("twitter:card"), image: meta("twitter:image") },
    icons: [...link("icon"), ...link("shortcut")], apple_touch_icon: link("apple-touch-icon")[0] || null,
    manifest: link("manifest")[0] || null,
    hreflang: links.filter((l) => attr(l, "hreflang")).map((l) => ({ lang: attr(l, "hreflang"), href: attr(l, "href") })),
    json_ld: (html.match(/<script[^>]*application\/ld\+json/gi) || []).length,
    h1_count: (html.match(/<h1\b/gi) || []).length,
    body_text_chars: bodyText.length,
    assets: {
      scripts: [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 5),
      styles: links.filter((l) => /stylesheet/i.test(attr(l, "rel") || "")).map((l) => attr(l, "href")).slice(0, 5),
    },
  };
}

const SECURITY_HEADERS = ["strict-transport-security", "content-security-policy", "x-content-type-options",
  "referrer-policy", "permissions-policy", "x-frame-options", "cross-origin-opener-policy"];

export async function webChecks(url) {
  const out = { url, fetched_at: new Date().toISOString(), notes: [] };
  const page = await get(url);
  if (!page.ok) return { ...out, reachable: false, error: page.error };
  out.reachable = true;
  out.status = page.status;
  out.final_url = page.url;
  const h = page.headers;
  const csp = h["content-security-policy"] || "";
  out.security_headers = Object.fromEntries(SECURITY_HEADERS.map((k) => [k, h[k] ?? null]));
  out.csp = csp ? { unsafe_inline: /'unsafe-inline'/.test(csp), unsafe_eval: /'unsafe-eval'/.test(csp),
    frame_ancestors: /frame-ancestors/.test(csp) } : null;
  out.exposed = { server: h.server ?? null, "x-powered-by": h["x-powered-by"] ?? null };
  out.x_robots_tag = h["x-robots-tag"] ?? null;
  out.html_compression = h["content-encoding"] ?? null;

  const u = new URL(page.url);
  if (u.protocol === "https:") {
    const plain = await get(`http://${u.host}${u.pathname}`, { redirect: "manual", body: false });
    out.http_redirects_to_https = plain.ok ? (plain.status >= 300 && plain.status < 400 && /^https:/i.test(plain.headers.location || "")) : null;
  } else out.notes.push("Site served over plain HTTP: HTTPS and HSTS checks need the staging or production URL.");

  out.head = parseHead(page.body);
  const abs = (p) => { try { return new URL(p, page.url).href; } catch { return null; } };
  const firstAsset = [...out.head.assets.scripts, ...out.head.assets.styles].map(abs).find(Boolean);
  if (firstAsset) {
    const a = await get(firstAsset, { body: false });
    out.static_asset = a.ok ? { url: firstAsset, status: a.status, "content-encoding": a.headers["content-encoding"] ?? null,
      "cache-control": a.headers["cache-control"] ?? null } : { url: firstAsset, error: a.error };
  }
  const robots = await get(new URL("/robots.txt", page.url).href);
  out.robots_txt = robots.ok && robots.status === 200 ? { present: true, disallow_all: /^\s*disallow:\s*\/\s*$/im.test(robots.body),
    sitemaps: [...robots.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) } : { present: false };
  const sitemapUrl = out.robots_txt.sitemaps?.[0] || new URL("/sitemap.xml", page.url).href;
  const sm = await get(sitemapUrl);
  out.sitemap = sm.ok && sm.status === 200 && /<(urlset|sitemapindex)\b/.test(sm.body)
    ? { url: sitemapUrl, present: true, urls: (sm.body.match(/<loc>/g) || []).length } : { url: sitemapUrl, present: false };
  if (out.head.og.image) {
    const img = await get(abs(out.head.og.image), { body: false });
    out.og_image_status = img.ok ? img.status : img.error;
  }
  const fav = out.head.icons[0] ? abs(out.head.icons[0]) : new URL("/favicon.ico", page.url).href;
  const f = await get(fav, { body: false });
  out.favicon = { url: fav, status: f.ok ? f.status : f.error };
  out.indexable = !(/noindex/i.test(out.head.robots || "") || /noindex/i.test(out.x_robots_tag || "") || out.robots_txt.disallow_all);
  return out;
}
