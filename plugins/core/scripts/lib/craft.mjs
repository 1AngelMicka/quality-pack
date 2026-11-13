// Finish of the rendered page ("craft"): the details that separate a product someone cared about from a
// first draft. Nothing here is a matter of taste: every check is a measure taken in a real browser, with the
// elements at fault. `qp look` says how generic a page looks and `qp deslop` checks spacing; this one checks
// typography details, states (focus, hover), media, motion and the small things a visitor meets around the
// page (icon, share image, error page).
//
// Two levels: "must" (a defect a visitor can see or that breaks use) and "should" (finish). A "should" that is
// a deliberate choice is fine: say so in the report rather than changing the design to please the tool.
import { loadBrowserTools, launch } from "./browser.mjs";

export const CRAFT_VERSION = 1;

// Runs in the page. One evaluate call, no dependency.
function measureCraft() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const shown = (e) => {
    if (e.closest("[hidden], [aria-hidden='true'], dialog:not([open]), [data-craft-ignore]")) return false;
    const s = getComputedStyle(e);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const name = (e) => {
    const t = (e.getAttribute("aria-label") || e.innerText || e.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${t ? ` "${t}"` : ""}`;
  };
  const px = (v) => parseFloat(v) || 0;
  const all = [...document.querySelectorAll("body *")].filter(shown);
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const textEls = all.filter((e) => ownText(e).length >= 2);

  // --- Typography ---------------------------------------------------------------------------------------
  // Lines of an element, from the boxes of its text.
  const lines = (e) => {
    const range = document.createRange();
    range.selectNodeContents(e);
    const tops = new Map();
    for (const r of range.getClientRects()) {
      if (r.width < 1) continue;
      const k = Math.round(r.top / 4);
      const cur = tops.get(k) || { left: r.left, right: r.right };
      tops.set(k, { left: Math.min(cur.left, r.left), right: Math.max(cur.right, r.right) });
    }
    return [...tops.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v.right - v.left);
  };
  const headings = all.filter((e) => /^H[1-3]$/.test(e.tagName) && e.innerText.trim().length > 0);
  const multi = headings.map((e) => ({ e, l: lines(e) })).filter((x) => x.l.length >= 2);
  const noWrap = multi.filter((x) => !/balance|pretty/.test(getComputedStyle(x.e).textWrap || getComputedStyle(x.e).textWrapStyle || ""));
  const orphans = multi.filter((x) => x.l.at(-1) < Math.max(...x.l) * 0.2 && /\s/.test(x.e.innerText.trim()));
  const looseHeadings = headings.filter((e) => { const s = getComputedStyle(e); const f = px(s.fontSize); return f >= 32 && px(s.lineHeight) / f > 1.3; });

  // Columns of numbers: table cells that hold only a number.
  const NUM = /^[\s\u00a0\u202f€$£¥%+\-−–.,:/\d]*\d[\s\u00a0\u202f€$£¥%+\-−–.,:/\dkKMm]*$/;
  const numCols = [];
  for (const table of document.querySelectorAll("table")) {
    if (!shown(table)) continue;
    const cols = new Map();
    for (const row of table.rows) [...row.cells].forEach((c, i) => { if (c.tagName === "TD" && NUM.test(c.innerText.trim()) && c.innerText.trim().length) (cols.get(i) || cols.set(i, []).get(i)).push(c); });
    for (const cells of cols.values()) if (cells.length >= 3) numCols.push(cells);
  }
  const tabular = (e) => { const s = getComputedStyle(e); return /tabular-nums/.test(s.fontVariantNumeric) || /"tnum"/.test(s.fontFeatureSettings) || /mono|courier|consolas|menlo/i.test(s.fontFamily); };
  const badNumCols = numCols.filter((cells) => !cells.every(tabular));

  // Typewriter characters where the language has proper ones.
  const lang = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
  const prose = textEls.filter((e) => !e.closest("code, pre, kbd, samp, script, style, textarea, input, [contenteditable]"));
  const typo = { straight_apostrophes: 0, straight_quotes: 0, three_dots: 0, hyphen_dash: 0, french_spaces: 0, samples: [] };
  for (const e of prose) {
    const t = ownText(e);
    const hit = (k, re) => { const n = (t.match(re) || []).length; if (n) { typo[k] += n; if (typo.samples.length < 6) typo.samples.push(`${k}: "${t.slice(0, 60)}"`); } };
    hit("straight_apostrophes", /[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/g);
    hit("straight_quotes", /"[^"]{2,}"/g);
    hit("three_dots", /\.\.\./g);
    hit("hyphen_dash", /\s-\s/g);
    // French: a non-breaking space before ; : ! ? » and after «. An ordinary space there can break the line, and none
    // at all before ! ? ; is a mistake too (":" without a space is left alone: addresses, times, code).
    if (lang === "fr") hit("french_spaces", /\u0020[;:!?»]|[A-Za-zÀ-ÿ][!?;](?=\s|$)|«[^\u00a0\u202f]/g);
  }

  const caps = textEls.filter((e) => {
    if (e.closest("code, pre, kbd, samp")) return false;
    const s = getComputedStyle(e), t = ownText(e);
    const upper = s.textTransform === "uppercase" || (t.length >= 6 && /[A-Z]{4}/.test(t) && t === t.toUpperCase() && /[A-Z]/.test(t));
    return upper && t.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 4 && (s.letterSpacing === "normal" || px(s.letterSpacing) <= 0);
  });
  const weights = [...new Set(textEls.map((e) => getComputedStyle(e).fontWeight))].sort();

  // Labels of buttons with two words or more: Title Case and sentence case mixed.
  const labels = [...new Set(all.filter((e) => e.matches("button, [role=button], a[class*=btn], a[class*=button], input[type=submit]"))
    .map((e) => (e.innerText || e.value || "").trim().replace(/\s+/g, " ")).filter((t) => /^[A-Za-zÀ-ÿ]+(\s+[A-Za-zÀ-ÿ]+)+$/.test(t)))];
  const titleCase = labels.filter((t) => t.split(" ").slice(1).some((w) => w.length > 3 && /^[A-Z][a-zà-ÿ]/.test(w)));
  const sentenceCase = labels.filter((t) => t.split(" ").slice(1).every((w) => w === w.toLowerCase()));

  const smallInputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea")]
    .filter(shown).filter((e) => px(getComputedStyle(e).fontSize) < 16);

  // --- Colour and surfaces ------------------------------------------------------------------------------
  const rgb = (c) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || ""); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const body = textEls.filter((e) => e.matches("p, li, td, dd, span, div") && px(getComputedStyle(e).fontSize) <= 20);
  const pure = body.filter((e) => { const c = rgb(getComputedStyle(e).color), b = bgOf(e); if (!c) return false;
    return (c.r + c.g + c.b === 0 && b.r + b.g + b.b === 765) || (c.r + c.g + c.b === 765 && b.r + b.g + b.b === 0); });
  const pageBg = bgOf(document.body);
  const dark = (0.2126 * pageBg.r + 0.7152 * pageBg.g + 0.0722 * pageBg.b) / 255 < 0.25;
  const rootScheme = getComputedStyle(document.documentElement).colorScheme || "";
  const metaScheme = document.querySelector("meta[name=color-scheme]")?.content || "";

  const shadows = new Map();
  for (const e of all) { const s = getComputedStyle(e).boxShadow; if (s && s !== "none") shadows.set(s, (shadows.get(s) || 0) + 1); }
  // One hard layer of plain black: the default drop shadow. Layers are separated by commas outside parentheses.
  const layersOf = (s) => s.split(/,(?![^(]*\))/).length;
  const harsh = [...shadows.keys()].filter((s) => { const c = rgb(s); return layersOf(s) === 1 && !/inset/.test(s) && c && c.r + c.g + c.b === 0 && c.a >= 0.25; });

  const nested = [];
  for (const e of all) {
    const s = getComputedStyle(e), r = px(s.borderTopLeftRadius);
    if (r < 8 || r > 100) continue;
    const pad = Math.min(px(s.paddingTop), px(s.paddingLeft));
    if (pad < 4) continue;
    for (const c of e.children) {
      if (!shown(c)) continue;
      const cs = getComputedStyle(c), cr = px(cs.borderTopLeftRadius);
      const hasSurface = (rgb(cs.backgroundColor)?.a || 0) > 0.1 || px(cs.borderTopWidth) > 0 || c.tagName === "IMG";
      const er = e.getBoundingClientRect(), crr = c.getBoundingClientRect();
      const inCorner = crr.left - er.left <= pad + 2 && crr.top - er.top <= pad + 2;
      if (hasSurface && inCorner && cr > 0 && cr < 100 && cr >= r && pad >= 4) nested.push(`${name(c)} ${cr}px inside ${name(e)} ${r}px with ${pad}px padding`);
    }
  }

  let selectionRule = false, focusRule = false, layoutAnim = 0;
  const sheets = [...document.styleSheets];
  const walk = (rules) => { for (const r of rules) {
    if (r.cssRules && !(r instanceof CSSStyleRule)) { walk(r.cssRules); continue; }
    const sel = r.selectorText || "";
    if (/::selection/.test(sel)) selectionRule = true;
    if (/:focus-visible|:focus(?!-within)/.test(sel)) focusRule = true;
  } };
  let unreadable = 0;
  for (const s of sheets) { try { walk(s.cssRules); } catch { unreadable++; } }

  // --- Motion -------------------------------------------------------------------------------------------
  const interactive = all.filter((e) => e.matches("a[href], button, [role=button], [role=tab], input, select, textarea, summary"));
  const LAYOUT = /\b(width|height|top|left|right|bottom|margin|padding|inset|font-size|line-height)\b/;
  const transAll = [], slow = [], layout = [];
  const durations = new Set();
  for (const e of interactive) {
    const s = getComputedStyle(e);
    const props = s.transitionProperty.split(",").map((x) => x.trim());
    const durs = s.transitionDuration.split(",").map((x) => (x.includes("ms") ? parseFloat(x) : parseFloat(x) * 1000));
    const max = Math.max(...durs, 0);
    if (max <= 0) continue;
    durs.filter((d) => d > 0).forEach((d) => durations.add(Math.round(d)));
    if (props.includes("all")) transAll.push(name(e));
    if (max > 500) slow.push(`${name(e)} ${max} ms`);
    if (props.some((p) => LAYOUT.test(p))) layout.push(`${name(e)} (${props.filter((p) => LAYOUT.test(p)).join(", ")})`);
  }
  layoutAnim = layout.length;

  // --- Media --------------------------------------------------------------------------------------------
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const imgs = [...document.querySelectorAll("img")].filter(shown).filter((i) => i.complete && i.naturalWidth > 0);
  const raster = imgs.filter((i) => !/\.svg(\?|$)|^data:image\/svg/i.test(i.currentSrc || i.src));
  const distorted = imgs.filter((i) => { const r = i.getBoundingClientRect(); const fit = getComputedStyle(i).objectFit;
    return fit === "fill" && r.width >= 24 && Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) / (i.naturalWidth / i.naturalHeight) > 0.03; });
  const blurry = raster.filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 80 && i.naturalWidth < r.width * 0.95; });
  const lowDensity = raster.filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 80 && i.naturalWidth >= r.width * 0.95 && i.naturalWidth < r.width * dpr * 0.9; });
  const unsized = [...document.querySelectorAll("img")].filter(shown).filter((i) => !(i.getAttribute("width") && i.getAttribute("height")) && getComputedStyle(i).aspectRatio === "auto" && !/^\d/.test(i.style.height));

  // Icons: inline SVG up to 40 px. Stroke as drawn on screen = stroke-width × rendered size / viewBox size.
  const icons = [...document.querySelectorAll("svg")].filter(shown).filter((s) => { const r = s.getBoundingClientRect(); return r.width <= 40 && r.height <= 40; });
  const strokes = new Map(), sizes = new Map();
  let lucide = 0, filled = 0, stroked = 0;
  for (const s of icons) {
    const r = s.getBoundingClientRect();
    sizes.set(Math.round(r.width), (sizes.get(Math.round(r.width)) || 0) + 1);
    if (/\blucide\b/.test(s.getAttribute("class") || "")) lucide++;
    const cs = getComputedStyle(s);
    const child = s.querySelector("path, line, circle, rect, polyline, polygon");
    const ccs = child ? getComputedStyle(child) : cs;
    const hasStroke = ccs.stroke && ccs.stroke !== "none";
    if (!hasStroke) { filled++; continue; }
    stroked++;
    const vb = s.viewBox?.baseVal?.width || px(s.getAttribute("width")) || r.width;
    const w = Math.round((px(ccs.strokeWidth) * r.width / (vb || r.width)) * 4) / 4;
    strokes.set(w, (strokes.get(w) || 0) + 1);
  }

  // --- Around the page ----------------------------------------------------------------------------------
  const link = (rel) => [...document.querySelectorAll("link[rel]")].find((l) => l.rel.split(/\s+/).includes(rel))?.href || null;
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content") || null;
  const viewport = meta("meta[name=viewport]") || "";
  const maxScale = /maximum-scale\s*=\s*([\d.]+)/.exec(viewport)?.[1];

  return {
    viewport: { width: vw, height: vh }, lang,
    type: {
      headings_multi_line: multi.length, headings_without_wrap: noWrap.map((x) => name(x.e)).slice(0, 8), headings_orphan: orphans.map((x) => name(x.e)).slice(0, 8),
      loose_headings: looseHeadings.map((e) => `${name(e)} line-height ${(px(getComputedStyle(e).lineHeight) / px(getComputedStyle(e).fontSize)).toFixed(2)}`).slice(0, 8),
      number_columns: numCols.length, number_columns_not_tabular: badNumCols.length,
      typewriter: typo, caps_without_tracking: caps.map(name).slice(0, 8), weights,
      title_case_labels: titleCase.slice(0, 5), sentence_case_labels: sentenceCase.slice(0, 5),
      inputs_under_16px: smallInputs.map((e) => `${name(e)} ${getComputedStyle(e).fontSize}`).slice(0, 8),
    },
    surfaces: {
      pure_black_on_white: pure.length, body_text_elements: body.length, dark_page: dark, color_scheme: `${rootScheme} ${metaScheme}`.trim(),
      shadows: shadows.size, harsh_shadows: harsh.slice(0, 4), nested_radius: nested.slice(0, 8),
      selection_rule: selectionRule, focus_rule: focusRule, unreadable_stylesheets: unreadable,
    },
    motion: { transition_all: transAll.slice(0, 8), slow: slow.slice(0, 8), layout_properties: layout.slice(0, 8), layout_count: layoutAnim, durations_ms: [...durations].sort((a, b) => a - b) },
    media: { images: imgs.length, distorted: distorted.map(name).slice(0, 8), blurry: blurry.map((i) => `${name(i)} ${i.naturalWidth}px shown at ${Math.round(i.getBoundingClientRect().width)}px`).slice(0, 8),
      low_density: lowDensity.length, unsized: unsized.map(name).slice(0, 8),
      icons: icons.length, icon_strokes: Object.fromEntries(strokes), icon_sizes: Object.fromEntries(sizes), icons_filled: filled, icons_stroked: stroked, lucide },
    head: { icon: link("icon") || link("shortcut"), apple_touch_icon: link("apple-touch-icon"), manifest: link("manifest"), theme_color: meta("meta[name=theme-color]"),
      og_image: meta("meta[property='og:image']"), og_title: meta("meta[property='og:title']"), title: document.title,
      viewport_blocks_zoom: /user-scalable\s*=\s*(no|0)/.test(viewport) || (maxScale != null && Number(maxScale) < 2) },
  };
}

// Installed before the page loads: layout shifts (CLS) seen while it settles.
const CLS_PROBE = `(() => { window.__qpCls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__qpCls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} })();`;

const STYLE_KEYS = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "borderTopColor", "borderBottomColor", "backgroundColor", "color", "textDecorationLine", "opacity", "transform", "filter", "backgroundImage"];

// Press Tab through the page and see, at every stop, whether anything shows where the keyboard is.
async function focusProbe(page, max = 25) {
  await page.evaluate((keys) => {
    window.__qpBase = new WeakMap();
    for (const e of document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex], [role=button], [role=tab]")) {
      const s = getComputedStyle(e); window.__qpBase.set(e, Object.fromEntries(keys.map((k) => [k, s[k]])));
    }
  }, STYLE_KEYS);
  const seen = [], bad = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate((keys) => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const base = window.__qpBase.get(e);
      const s = getComputedStyle(e);
      const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      const changed = base ? keys.filter((k) => !/^outline/.test(k) && base[k] !== s[k]) : [];
      // A ring drawn on a wrapper (:focus-within) counts too.
      const p = e.parentElement, ps = p ? getComputedStyle(p) : null;
      const wrapper = ps && ((ps.outlineStyle !== "none" && parseFloat(ps.outlineWidth) > 0) || (window.__qpBase.get(p) && window.__qpBase.get(p).boxShadow !== ps.boxShadow));
      const t = (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || e.name || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const rect = e.getBoundingClientRect();
      return { key: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${t ? ` "${t}"` : ""}`, visible: outline || changed.length > 0 || !!wrapper, on_screen: rect.width > 0 && rect.height > 0 };
    }, STYLE_KEYS).catch(() => null);
    if (!r) continue;
    if (seen.includes(r.key)) break; // went round
    seen.push(r.key);
    if (r.on_screen && !r.visible) bad.push(r.key);
  }
  return { stops: seen.length, without_indicator: bad };
}

// Move the pointer over buttons and links styled as buttons: something should answer.
async function hoverProbe(page, max = 12) {
  const targets = await page.evaluate(() => {
    const out = [];
    let i = 0;
    for (const e of document.querySelectorAll("button:not([disabled]), [role=button], a[class*=btn], a[class*=button], input[type=submit]")) {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      if (r.width < 8 || r.height < 8 || r.top < 0 || r.bottom > window.innerHeight || s.visibility === "hidden" || s.pointerEvents === "none") continue;
      if (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("button, a, [role=button], input") !== e) continue;
      e.dataset.qpHover = String(++i);
      out.push({ id: String(i), name: `${e.tagName.toLowerCase()} "${(e.innerText || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 40)}"`, x: r.left + r.width / 2, y: r.top + r.height / 2 });
      if (out.length >= 12) break;
    }
    return out;
  });
  const snap = (id) => page.evaluate(([i, keys]) => {
    const e = document.querySelector(`[data-qp-hover="${i}"]`); if (!e) return null;
    const pick = (n) => { const s = getComputedStyle(n); return keys.map((k) => s[k]).join("|"); };
    return [pick(e), ...[...e.children].slice(0, 3).map(pick), getComputedStyle(e).transitionDuration].join("§");
  }, [id, STYLE_KEYS]);
  const dead = [], instant = [];
  for (const t of targets.slice(0, max)) {
    await page.mouse.move(0, 0);
    await page.waitForTimeout(60);
    const before = await snap(t.id);
    await page.mouse.move(t.x, t.y);
    await page.waitForTimeout(350);
    const after = await snap(t.id);
    if (before == null || after == null) continue;
    if (before === after) dead.push(t.name);
    else if (/^0s(, 0s)*$/.test(after.split("§").at(-1))) instant.push(t.name);
  }
  await page.mouse.move(0, 0);
  return { tried: Math.min(targets.length, max), no_change: dead, instant_change: instant };
}

async function head(url, timeout = 15000) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeout) });
    const text = /text|json|xml/.test(res.headers.get("content-type") || "") ? await res.text() : "";
    return { status: res.status, type: res.headers.get("content-type") || "", bytes: Number(res.headers.get("content-length")) || text.length, text };
  } catch (e) { return { error: String(e.cause?.code || e.message).slice(0, 120) }; }
}

const DEFAULT_404 = [/This page could not be found/i, /Cannot GET \//i, /<center>nginx/i, /Apache.*Server at/i, /^\s*Not Found\s*$/i, /The requested URL was not found on this server/i, /404: NOT_FOUND/, /Whitelabel Error Page/i];

// What surrounds the page: its icon, its share image, and what a wrong address shows.
async function around(url, headInfo) {
  if (!/^https?:/.test(url)) return { skipped: "local file: icon, share image and error page are checked on a served site" };
  const origin = new URL(url).origin;
  const icon = await head(headInfo.icon || `${origin}/favicon.ico`);
  const og = headInfo.og_image ? await head(new URL(headInfo.og_image, url).href) : null;
  const missing = await head(`${origin}/qp-no-such-page-${Date.now().toString(36)}`);
  const body = missing.text || "";
  const stripped = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    icon: { url: headInfo.icon || `${origin}/favicon.ico`, ok: icon.status === 200 && /image|octet/.test(icon.type), status: icon.status ?? icon.error },
    og_image: og ? { url: headInfo.og_image, ok: og.status === 200 && /image/.test(og.type), status: og.status ?? og.error, absolute: /^https?:\/\//.test(headInfo.og_image) } : null,
    not_found: { status: missing.status ?? missing.error, is_404: missing.status === 404, default_page: DEFAULT_404.some((re) => re.test(body)) || (missing.status === 404 && stripped.length < 40),
      has_way_back: /<a\s[^>]*href=["'](\/|\.\/|https?:\/\/[^"']+)["']/i.test(body), words: stripped.split(" ").filter(Boolean).length },
  };
}

const list = (a, n = 5) => a.slice(0, n).join("; ");

// Measures → checks. Each check: value (what was measured), ok, level ("must" or "should"), rule (the house rule).
export function scoreCraft(m, { mode = "operate", calibration = null } = {}) {
  const d = m.desktop, mob = m.mobile, checks = {};
  const add = (id, level, ok, value, rule, samples) => { checks[id] = { level, ok, value, rule, ...(samples?.length ? { samples: samples.slice(0, 8) } : {}) }; };
  const t = d.type, s = d.surfaces, mo = d.motion, me = d.media, h = d.head;

  // Typography
  if (t.headings_multi_line) add("heading_wrap", "should", t.headings_without_wrap.length === 0, `${t.headings_without_wrap.length} of ${t.headings_multi_line} multi-line headings without text-wrap`,
    "headings on two lines or more use text-wrap: balance (or pretty), so lines have similar lengths", t.headings_without_wrap);
  const orph = [...new Set([...t.headings_orphan, ...(mob?.type.headings_orphan || [])])];
  if (t.headings_multi_line || mob?.type.headings_multi_line) add("heading_orphans", "should", orph.length === 0, `${orph.length} heading(s) ending with a lone short word`,
    "no heading ends with one short word alone on its last line (phone and desktop)", orph);
  if (t.loose_headings.length || t.headings_multi_line) add("heading_line_height", "should", t.loose_headings.length === 0, `${t.loose_headings.length} large heading(s) with line-height above 1.3`,
    "headings of 32 px and more have a line-height of 1.0 to 1.3", t.loose_headings);
  if (t.number_columns) add("tabular_numbers", "must", t.number_columns_not_tabular === 0, `${t.number_columns_not_tabular} of ${t.number_columns} number columns without tabular figures`,
    "columns of numbers use font-variant-numeric: tabular-nums, so digits line up");
  const tw = t.typewriter;
  const twTotal = tw.straight_apostrophes + tw.straight_quotes + tw.three_dots + tw.hyphen_dash + tw.french_spaces;
  add("typographic_characters", "should", twTotal <= 2, `${tw.straight_apostrophes} straight apostrophes, ${tw.straight_quotes} straight quotes, ${tw.three_dots} "...", ${tw.hyphen_dash} hyphens used as dashes${m.desktop.lang === "fr" ? `, ${tw.french_spaces} French spacing mistakes` : ""}`,
    "text uses real typographic characters: ’ “ ” … and a dash, not ' \" ... and a hyphen; in French, a non-breaking space before ; : ! ? and inside « »", tw.samples);
  add("caps_tracking", "should", t.caps_without_tracking.length === 0, `${t.caps_without_tracking.length} all-caps text(s) without letter-spacing`,
    "text in capitals has positive letter-spacing (0.04em to 0.1em)", t.caps_without_tracking);
  add("font_weights", "should", t.weights.length <= 4, `${t.weights.length} weights: ${t.weights.join(", ")}`, "at most 4 font weights on a page");
  if (t.title_case_labels.length + t.sentence_case_labels.length >= 2) add("label_case", "should", !(t.title_case_labels.length && t.sentence_case_labels.length),
    `${t.title_case_labels.length} label(s) in Title Case, ${t.sentence_case_labels.length} in sentence case`, "button labels follow one capitalisation rule", [...t.title_case_labels.slice(0, 3), ...t.sentence_case_labels.slice(0, 3)]);
  if (mob) add("input_font_size", "must", mob.type.inputs_under_16px.length === 0, `${mob.type.inputs_under_16px.length} field(s) under 16 px on phone`,
    "form fields are at least 16 px on phones: below that, iOS Safari zooms the page when the field is focused", mob.type.inputs_under_16px);

  // Colour and surfaces
  if (s.body_text_elements) add("pure_black_text", "should", s.pure_black_on_white / s.body_text_elements < 0.5, `${s.pure_black_on_white} of ${s.body_text_elements} text blocks are pure black on pure white (or the reverse)`,
    "body text is not #000 on #fff: a slightly softened or tinted pair reads better and looks deliberate");
  if (s.dark_page) add("dark_color_scheme", "must", /dark/.test(s.color_scheme), `color-scheme: ${s.color_scheme || "not set"}`,
    "a dark page declares color-scheme: dark, so scrollbars, form controls and autofill are dark too");
  add("shadow_count", "should", s.shadows <= 5, `${s.shadows} different shadows`, "at most 5 different shadows: an elevation scale, not one shadow per component");
  add("shadow_quality", "should", s.harsh_shadows.length === 0, `${s.harsh_shadows.length} single-layer shadow(s) of plain black at 25 % or more`,
    "shadows are soft and layered (two or three layers, low opacity), not one hard black layer", s.harsh_shadows);
  add("nested_radius", "should", s.nested_radius.length === 0, `${s.nested_radius.length} rounded box(es) with the same or a larger radius than their rounded container`,
    "inside a rounded container, inner radius = outer radius − padding", s.nested_radius);
  if (!s.unreadable_stylesheets) add("selection_color", "should", s.selection_rule, s.selection_rule ? "::selection styled" : "browser default selection colour", "text selection uses the brand's colours (::selection)");

  // States
  if (m.focus) add("focus_visible", "must", m.focus.without_indicator.length === 0, `${m.focus.without_indicator.length} of ${m.focus.stops} keyboard stops show no focus indicator`,
    "every control shows where the keyboard is (outline, ring or clear change) when reached with Tab", m.focus.without_indicator);
  if (m.hover?.tried) {
    add("hover_states", "should", m.hover.no_change.length === 0, `${m.hover.no_change.length} of ${m.hover.tried} buttons do not react to the pointer`,
      "every button answers the pointer (colour, shade, shadow or underline)", m.hover.no_change);
    add("hover_transitions", "should", m.hover.instant_change.length <= m.hover.tried / 2, `${m.hover.instant_change.length} of ${m.hover.tried} buttons change with no transition`,
      "state changes are eased over 100 to 200 ms rather than instant", m.hover.instant_change);
  }

  // Motion
  add("transition_all", "should", mo.transition_all.length === 0, `${mo.transition_all.length} control(s) with transition: all`, "transitions name their properties (transition: all animates what was not meant to move and costs layout)", mo.transition_all);
  add("transition_duration", "should", mo.slow.length === 0, `${mo.slow.length} control(s) with a transition above 500 ms`, "interface transitions last 100 to 300 ms, never more than 500 ms on a control", mo.slow);
  add("layout_animation", "should", mo.layout_count === 0, `${mo.layout_count} control(s) animating layout properties`, "animate transform and opacity, not width, height, margins or position", mo.layout_properties);
  if (m.cls != null) add("layout_shift", "must", m.cls <= 0.1, `CLS ${m.cls.toFixed(3)} while loading`, "the page does not jump while it loads (cumulative layout shift of 0.1 or less)");

  // Media
  if (me.images) {
    add("image_distortion", "must", me.distorted.length === 0, `${me.distorted.length} stretched image(s)`, "images keep their proportions (object-fit: cover or contain, or matching dimensions)", me.distorted);
    add("image_sharpness", "must", me.blurry.length === 0, `${me.blurry.length} image(s) smaller than their display size`, "an image file is at least as wide as it is shown (and 2× for dense screens)", me.blurry);
    add("image_dimensions", "should", me.unsized.length === 0, `${me.unsized.length} image(s) without width and height`, "images carry width and height (or aspect-ratio), so the page does not jump when they load", me.unsized);
  }
  const strokeKinds = Object.keys(me.icon_strokes).length;
  if (me.icons >= 4) {
    add("icon_stroke", "should", strokeKinds <= 2, `${strokeKinds} stroke widths on screen: ${Object.entries(me.icon_strokes).map(([w, n]) => `${w}px ×${n}`).join(", ") || "none"}`,
      "icons share one stroke width as drawn (two at most, for two sizes)");
    add("icon_style", "should", !(me.icons_filled >= 2 && me.icons_stroked >= 2 && Math.min(me.icons_filled, me.icons_stroked) / me.icons >= 0.25), `${me.icons_stroked} outline and ${me.icons_filled} filled icons`,
      "icons come from one family and one style (outline or filled), filled being kept for a selected state");
  }

  // Around the page
  add("viewport_zoom", "must", !h.viewport_blocks_zoom, h.viewport_blocks_zoom ? "the viewport tag blocks pinch zoom" : "zoom allowed", "the page can be zoomed (no user-scalable=no, no maximum-scale under 2)");
  const a = m.around;
  if (a && !a.skipped) {
    add("favicon", "must", a.icon.ok, a.icon.ok ? "icon found" : `no icon (${a.icon.status})`, "the site has its own icon (link rel=icon or /favicon.ico)");
    add("touch_icon", "should", !!h.apple_touch_icon, h.apple_touch_icon ? "apple-touch-icon found" : "no apple-touch-icon", "an apple-touch-icon (180 px) for the phone home screen and bookmarks");
    if (mode === "persuade") add("share_image", "must", !!a.og_image?.ok && a.og_image.absolute, !a.og_image ? "no og:image" : a.og_image.ok ? (a.og_image.absolute ? "og:image found" : "og:image is a relative address") : `og:image does not load (${a.og_image.status})`,
      "public pages have a share image (og:image, absolute address, 1200 × 630) that loads");
    add("not_found_status", "must", a.not_found.is_404, `a wrong address answers ${a.not_found.status}`, "an unknown address answers 404, not 200 (search engines and monitors rely on it)");
    add("not_found_page", "should", a.not_found.is_404 ? !a.not_found.default_page && a.not_found.has_way_back : true, a.not_found.default_page ? "the server's or the framework's default error page" : a.not_found.has_way_back ? "own page with a way back" : "no link back to the site",
      "the 404 page is the product's own: its look, a sentence in its voice, a way back");
  }
  // Calibration on the reference bank: how often the sites recognised as excellent fail each check. A "should"
  // that many of them fail does not separate excellent from average: it becomes advice and is no longer counted.
  const advice = [];
  for (const [id, c] of Object.entries(checks)) {
    const cal = calibration?.craft?.[id];
    if (!cal || cal.n < 10) continue;
    c.excellent_sites_failing = `${Math.round(cal.fail_rate * 100)} % of ${cal.n}`;
    if (c.level === "should" && (calibration.advice || []).includes(id)) { c.level = "advice"; if (!c.ok) advice.push(id); }
  }
  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  const should = Object.entries(checks).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
  const signals = [];
  if (me.lucide >= 4 && me.lucide === me.icons && strokeKinds === 1) signals.push("every icon is an unmodified Lucide icon (the default set of generated interfaces): pick a set that fits the brand or adjust stroke and size");
  return { version: CRAFT_VERSION, summary: { checks: Object.keys(checks).length, must_failed: must, should_failed: should, advice }, signals, checks,
    calibrated: calibration ? `on ${calibration.sites} sites of the reference bank, ${calibration.measured}` : "not calibrated (no plugins/core/bank/calibration.json)" };
}

export async function craftAt(urls, { cwd, mode = "operate", calibration } = {}) {
  // undefined: use the pack's calibration file; null: measure without it (used when calibrating).
  if (calibration === undefined) calibration = process.env.QP_NO_CALIBRATION ? null : (await import("./bank.mjs")).loadCalibration();
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (pack cache, not the project)." };
  const browser = await launch(tools.chromium);
  const pages = [];
  try {
    for (const url of urls) {
      const m = {};
      let failed = null;
      for (const [k, vp] of [["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["desktop", { width: 1440, height: 900, deviceScaleFactor: 1 }]]) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor });
        await ctx.addInitScript(CLS_PROBE);
        const page = await ctx.newPage();
        try { await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }); } catch (e) { if (!/Timeout/i.test(e.message)) { failed = String(e.message).split("\n")[0].slice(0, 200); await ctx.close(); break; } }
        await page.waitForTimeout(500);
        m[k] = await page.evaluate(measureCraft);
        if (k === "desktop") {
          m.cls = await page.evaluate(() => window.__qpCls ?? null).catch(() => null);
          m.hover = await hoverProbe(page).catch(() => null);
          m.focus = await focusProbe(page).catch(() => null);
        }
        await ctx.close();
      }
      if (failed) { pages.push({ url, error: failed }); continue; }
      m.around = await around(url, m.desktop.head);
      pages.push({ url, ...scoreCraft(m, { mode, calibration }), measures: m });
    }
  } finally { await browser.close(); }
  return { available: true, version: CRAFT_VERSION, mode, pages,
    reading: "must: a visible defect or something that breaks use. should: finish; a deliberate exception is fine if the report says why. advice: a finish rule that many sites recognised as excellent do not follow either (excellent_sites_failing): apply it when it helps, it is not counted." };
}

export function compactCraft(result) {
  if (!result.pages) return result;
  return { mode: result.mode, version: result.version, full_report: "craft.json", reading: result.reading,
    pages: result.pages.map((p) => p.error ? p : { url: p.url, summary: p.summary, signals: p.signals, calibrated: p.calibrated,
      failed: Object.fromEntries(Object.entries(p.checks).filter(([, c]) => !c.ok).map(([k, c]) => [k, { level: c.level, value: c.value, rule: c.rule, samples: c.samples, excellent_sites_failing: c.excellent_sites_failing }])),
      passed: Object.entries(p.checks).filter(([, c]) => c.ok).map(([k]) => k) }) };
}
