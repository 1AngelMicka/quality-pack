// Visual profile of a rendered page: the handful of numbers that describe how it is built, so that a page can be
// compared with references instead of with adjectives. Used three ways:
//  - `qp profile <url>` measures any page (a reference the user likes, a screen of the project);
//  - `qp gap <url>` compares a screen with the project's references (.quality/references.json) or with the
//    reference bank of its site type, and lists the properties that differ most;
//  - `qp bank measure` profiles the sites of the reference bank, to calibrate thresholds on real sites.
// A profile describes; it does not judge. A gap is a question to ask ("references use 2 typefaces, this screen 4"),
// not a defect by itself.
import { loadBrowserTools, launch } from "./browser.mjs";

export const PROFILE_VERSION = 1;

// Runs in the page, on the first screen and on the whole page.
function measureProfile() {
  const vw = innerWidth, vh = innerHeight;
  const shown = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const all = [...document.querySelectorAll("body *")].filter(shown);
  const px = (v) => parseFloat(v) || 0;
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const textEls = all.filter((e) => ownText(e).length >= 2);
  const rgb = (c) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || ""); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
  const hsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: (h * 60 + 360) % 360, s, l }; };

  // Type: sizes weighted by the amount of text set in them.
  const sizes = new Map(), families = new Map(), weights = new Set();
  let chars = 0;
  for (const e of textEls) {
    const s = getComputedStyle(e), n = ownText(e).length;
    chars += n;
    const size = Math.round(px(s.fontSize));
    sizes.set(size, (sizes.get(size) || 0) + n);
    const fam = s.fontFamily.split(",")[0].trim().replace(/["']/g, "").toLowerCase();
    families.set(fam, (families.get(fam) || 0) + n);
    weights.add(s.fontWeight);
  }
  const sizeList = [...sizes.entries()].filter(([, n]) => n / chars >= 0.005 || n >= 20).map(([s]) => s).sort((a, b) => a - b);
  const body = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 16;
  const h1 = document.querySelector("h1");
  const largest = Math.max(...sizeList, body);
  // Median ratio between neighbouring sizes above the body size: the step of the type scale.
  const above = sizeList.filter((s) => s >= body);
  const ratios = above.slice(1).map((s, i) => s / above[i]).filter((r) => r > 1.04).sort((a, b) => a - b);
  const prose = [...document.querySelectorAll("p, li")].filter((e) => shown(e) && e.textContent.trim().length > 120);
  const lineLens = prose.map((p) => { const s = getComputedStyle(p), fs = px(s.fontSize), lh = s.lineHeight === "normal" ? fs * 1.2 : px(s.lineHeight);
    const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh)); return { len: Math.round(p.textContent.trim().length / lines), lh: lh / fs }; }).filter((x) => x.len > 10);
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

  // First screen, sampled on a 48 × 30 grid: what the eye meets before scrolling.
  const bgOf = (e) => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n);
    if (/gradient\(/.test(s.backgroundImage)) { const c = rgb(s.backgroundImage.match(/rgba?\([^)]*\)/)?.[0]); if (c) return c; }
    const c = rgb(s.backgroundColor); if (c && c.a > 0.5) return c; } return rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; };
  const page = bgOf(document.body), pageHsl = hsl(page);
  let samples = 0, image = 0, accent = 0, empty = 0, text = 0;
  const hues = new Map();
  for (let i = 0; i < 48; i++) for (let j = 0; j < 30; j++) {
    const e = document.elementFromPoint(((i + 0.5) * vw) / 48, ((j + 0.5) * vh) / 30);
    if (!e) continue;
    samples++;
    const media = e.closest("img, picture, video, canvas, svg") || (/url\(/.test(getComputedStyle(e).backgroundImage) ? e : null);
    if (media && media.getBoundingClientRect().width > 48) { image++; continue; }
    const c = bgOf(e), h = hsl(c);
    if (h.s > 0.45 && h.l > 0.15 && h.l < 0.85) { accent++; hues.set(Math.round(h.h / 30), (hues.get(Math.round(h.h / 30)) || 0) + 1); }
    const leaf = ownText(e).length > 0 || e.matches("input, button, select, textarea");
    if (leaf) text++;
    else if (Math.abs(c.r - page.r) + Math.abs(c.g - page.g) + Math.abs(c.b - page.b) < 12) empty++;
  }
  const share = (n) => samples ? Math.round((n / samples) * 100) / 100 : 0;

  // Colours in use: text and surface colours, grouped by hue family; neutrals counted apart.
  const palette = new Map();
  for (const e of all.slice(0, 4000)) {
    const s = getComputedStyle(e);
    for (const c of [rgb(s.color), rgb(s.backgroundColor), rgb(s.borderTopColor)]) {
      if (!c || c.a < 0.5) continue;
      const h = hsl(c);
      const key = h.s < 0.12 ? "neutral" : `hue-${Math.round(h.h / 30) * 30}`;
      palette.set(key, (palette.get(key) || 0) + 1);
    }
  }
  const hueFamilies = [...palette.entries()].filter(([k, n]) => k !== "neutral" && n >= 3).length;

  // Surfaces.
  const boxes = all.filter((e) => { const s = getComputedStyle(e); return (rgb(s.backgroundColor)?.a || 0) > 0.1 || px(s.borderTopWidth) > 0 || s.boxShadow !== "none"; });
  const radii = new Map(), shadows = new Set();
  let bordered = 0, shadowed = 0;
  for (const e of boxes) { const s = getComputedStyle(e); const r = Math.round(px(s.borderTopLeftRadius)); if (r > 0 && r < 999) radii.set(r, (radii.get(r) || 0) + 1);
    if (px(s.borderTopWidth) > 0) bordered++; if (s.boxShadow !== "none") { shadowed++; shadows.add(s.boxShadow); } }
  // Layout basics: spacing, sizes of blocks and objects, regularity. Measured on groups of three or more
  // siblings laid out in a row or a column (a list, a grid row, a stack of sections).
  const rectOf = (e) => e.getBoundingClientRect();
  const spread = (a) => (a.length ? Math.max(...a) - Math.min(...a) : 0);
  const gaps = [];
  let groups = 0, evenGaps = 0, evenSizes = 0;
  for (const p of new Set(all.map((e) => e.parentElement).filter(Boolean))) {
    const kids = [...p.children].filter(shown);
    if (kids.length < 3 || kids.length > 40) continue;
    const rs = kids.map(rectOf);
    const col = rs.every((r, i) => i === 0 || r.top >= rs[i - 1].bottom - 1);
    const row = !col && rs.every((r, i) => i === 0 || r.left >= rs[i - 1].right - 1);
    if (!col && !row) continue;
    const g = rs.slice(1).map((r, i) => Math.round(col ? r.top - rs[i].bottom : r.left - rs[i].right)).filter((x) => x >= 0 && x < 400);
    if (g.length < 2) continue;
    groups++;
    gaps.push(...g);
    if (spread(g) <= 1) evenGaps++;
    // Same size across the other axis: columns of equal width, rows of equal height.
    if (spread(rs.map((r) => Math.round(col ? r.width : r.height))) <= 1) evenSizes++;
  }
  const positive = gaps.filter((x) => x > 0);
  const gapValues = new Map();
  for (const x of positive) gapValues.set(x, (gapValues.get(x) || 0) + 1);
  // The values that carry the layout: each used for at least 3 % of the gaps.
  const scale = [...gapValues.entries()].filter(([, n]) => n / positive.length >= 0.03).map(([v]) => v).sort((a, b) => a - b);
  const pads = boxes.map((e) => { const s = getComputedStyle(e); return Math.round(Math.min(px(s.paddingTop), px(s.paddingLeft))); }).filter((x) => x >= 4);
  const padValues = new Set(pads);
  // Left edges of text: a few shared edges means things line up.
  const lefts = new Map();
  for (const e of textEls) { const l = Math.round(rectOf(e).left); lefts.set(l, (lefts.get(l) || 0) + 1); }
  const topEdges = [...lefts.values()].sort((a, b) => b - a).slice(0, 3).reduce((t, n) => t + n, 0);
  // Only what is inside the viewport's width: skip links and off-canvas menus sit outside it.
  const textRects = textEls.map(rectOf).filter((r) => r.top < vh * 3 && r.left >= 0 && r.right <= vw + 1 && r.width > 8);
  const contentLeft = textRects.length ? Math.min(...textRects.map((r) => r.left)) : 0;
  const contentRight = textRects.length ? Math.max(...textRects.map((r) => r.right)) : vw;
  const btns = all.filter((e) => e.matches("button, [role=button], a[class*=btn], a[class*=button], input[type=submit]")).map(rectOf).filter((r) => r.height >= 16 && r.height <= 120);
  const fields = all.filter((e) => e.matches("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")).map(rectOf);
  const iconSizes = [...document.querySelectorAll("svg")].filter(shown).map(rectOf).filter((r) => r.width <= 40 && r.height <= 40).map((r) => Math.round(r.width));
  const cards = boxes.map(rectOf).filter((r) => r.width >= 150 && r.width <= 720 && r.height >= 80 && r.height <= 900 && r.width < vw * 0.9);
  const pics = [...document.querySelectorAll("img, video, picture")].filter(shown).map(rectOf).filter((r) => r.width >= 80 && r.height >= 40);
  const picRatios = new Set(pics.map((r) => Math.round((r.width / r.height) * 4) / 4));
  const sectionEls = [...document.querySelectorAll("section, main > div, body > div > section, article")].filter(shown).map(rectOf).filter((r) => r.height >= 120 && r.width >= vw * 0.6);
  const meanOf = (a) => a.reduce((t, x) => t + x, 0) / (a.length || 1);
  const cvOf = (a) => { if (a.length < 3) return null; const m = meanOf(a); return m ? Math.round((Math.sqrt(meanOf(a.map((x) => (x - m) ** 2))) / m) * 100) / 100 : null; };
  const hSize = (sel) => { const e = [...document.querySelectorAll(sel)].find(shown); return e ? Math.round(px(getComputedStyle(e).fontSize)) : null; };
  const layout = {
    content_width_px: Math.round(contentRight - contentLeft), gutter_px: Math.round(Math.max(0, contentLeft)),
    gap_values: scale.length, gap_median_px: med(positive), gap_largest_px: scale.length ? scale[scale.length - 1] : null,
    gaps_on_4px_grid: positive.length ? Math.round((positive.filter((x) => x % 4 === 0).length / positive.length) * 100) / 100 : null,
    padding_values: padValues.size, padding_median_px: med(pads),
    even_gap_groups: groups ? Math.round((evenGaps / groups) * 100) / 100 : null, even_size_groups: groups ? Math.round((evenSizes / groups) * 100) / 100 : null,
    aligned_left_edges: textEls.length ? Math.round((topEdges / textEls.length) * 100) / 100 : null,
    button_height_px: med(btns.map((r) => Math.round(r.height))), button_heights: new Set(btns.map((r) => Math.round(r.height))).size,
    field_height_px: med(fields.map((r) => Math.round(r.height))), icon_size_px: med(iconSizes), icon_sizes: new Set(iconSizes).size,
    card_width_px: med(cards.map((r) => Math.round(r.width))), card_height_px: med(cards.map((r) => Math.round(r.height))),
    image_ratios: picRatios.size, image_ratio: med(pics.map((r) => Math.round((r.width / r.height) * 100) / 100)),
    section_height_screens: sectionEls.length ? Math.round((med(sectionEls.map((r) => r.height)) / vh) * 100) / 100 : null, section_height_variation: cvOf(sectionEls.map((r) => r.height)),
    h1_px: hSize("h1"), h2_px: hSize("h2"), h3_px: hSize("h3"),
  };
  const controls = all.filter((e) => e.matches("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab]"));
  const firstControls = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.top < vh && r.bottom > 0; }).length;
  const animated = all.filter((e) => getComputedStyle(e).animationName !== "none").length;
  const imgs = [...document.querySelectorAll("img, picture, video")].filter(shown).length;
  const docH = document.documentElement.scrollHeight;
  const words = (document.body.innerText || "").split(/\s+/).filter(Boolean).length;
  const firstWords = textEls.filter((e) => { const r = e.getBoundingClientRect(); return r.top < vh && r.bottom > 0; }).reduce((t, e) => t + ownText(e).split(/\s+/).filter(Boolean).length, 0);

  return {
    type: { body_px: body, largest_px: largest, h1_px: h1 && shown(h1) ? Math.round(px(getComputedStyle(h1).fontSize)) : null, largest_to_body: Math.round((largest / body) * 100) / 100,
      sizes: sizeList.length, scale_step: ratios.length ? Math.round(med(ratios) * 100) / 100 : null, families: [...families.entries()].filter(([, n]) => n / chars >= 0.03).length,
      weights: weights.size, line_length: med(lineLens.map((x) => x.len)), line_height: lineLens.length ? Math.round(med(lineLens.map((x) => x.lh)) * 100) / 100 : null },
    first_screen: { image_share: share(image), accent_share: share(accent), empty_share: share(empty), text_share: share(text), accent_hues: hues.size, controls: firstControls, words: firstWords },
    colour: { hue_families: hueFamilies, dark_page: pageHsl.l < 0.25, page_saturation: Math.round(pageHsl.s * 100) / 100 },
    surface: { radii: radii.size, main_radius_px: [...radii.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0, shadows: shadows.size,
      bordered_share: boxes.length ? Math.round((bordered / boxes.length) * 100) / 100 : 0, shadowed_share: boxes.length ? Math.round((shadowed / boxes.length) * 100) / 100 : 0 },
    layout,
    page: { screens: Math.round((docH / vh) * 10) / 10, words, images: imgs, controls: controls.length, controls_per_screen: Math.round((controls.length / (docH / vh)) * 10) / 10, animated },
  };
}

// The properties compared between profiles: [group, key, label, kind]. kind "share" is compared in points, the rest as a ratio.
export const PROPERTIES = [
  ["type", "body_px", "body text size (px)"], ["type", "largest_to_body", "largest text ÷ body text"], ["type", "scale_step", "step of the type scale"],
  ["type", "sizes", "text sizes"], ["type", "families", "typefaces"], ["type", "weights", "font weights"], ["type", "line_length", "characters per line"], ["type", "line_height", "line height"],
  ["first_screen", "image_share", "first screen covered by images", "share"], ["first_screen", "accent_share", "first screen in a saturated colour", "share"],
  ["first_screen", "empty_share", "first screen left empty", "share"], ["first_screen", "controls", "controls on the first screen"], ["first_screen", "words", "words on the first screen"],
  ["colour", "hue_families", "hue families"], ["surface", "radii", "different radii"], ["surface", "main_radius_px", "most used radius (px)"], ["surface", "shadows", "different shadows"],
  ["surface", "bordered_share", "boxes with a border", "share"], ["surface", "shadowed_share", "boxes with a shadow", "share"],
  ["layout", "content_width_px", "width of the content (px)"], ["layout", "gutter_px", "page gutter (px)"],
  ["layout", "gap_values", "different gaps between elements"], ["layout", "gap_median_px", "usual gap between elements (px)"], ["layout", "gap_largest_px", "largest gap of the scale (px)"],
  ["layout", "gaps_on_4px_grid", "gaps that are multiples of 4 px", "share"], ["layout", "padding_values", "different paddings"], ["layout", "padding_median_px", "usual padding of boxes (px)"],
  ["layout", "even_gap_groups", "groups of siblings with identical gaps", "share"], ["layout", "even_size_groups", "groups of siblings of identical size", "share"],
  ["layout", "aligned_left_edges", "text sitting on the three main left edges", "share"],
  ["layout", "button_height_px", "button height (px)"], ["layout", "button_heights", "different button heights"], ["layout", "field_height_px", "field height (px)"],
  ["layout", "icon_size_px", "icon size (px)"], ["layout", "icon_sizes", "different icon sizes"], ["layout", "card_width_px", "card width (px)"], ["layout", "card_height_px", "card height (px)"],
  ["layout", "image_ratios", "different image proportions"], ["layout", "section_height_screens", "usual section height (screens)"], ["layout", "section_height_variation", "variation of section heights"],
  ["layout", "h1_px", "h1 size (px)"], ["layout", "h2_px", "h2 size (px)"], ["layout", "h3_px", "h3 size (px)"],
  ["page", "screens", "page length (screens)"], ["page", "controls_per_screen", "controls per screen"], ["page", "animated", "animated elements"],
];

const quant = (a, q) => { const s = a.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * q; const lo = Math.floor(i), hi = Math.ceil(i); return Math.round((s[lo] + (s[hi] - s[lo]) * (i - lo)) * 100) / 100; };

// Several profiles → for each property, the range where most of them sit (quartiles), per device.
export function summarize(profiles) {
  const out = { n: profiles.length };
  for (const device of ["desktop", "mobile"]) {
    out[device] = {};
    for (const [g, k] of PROPERTIES) {
      const vals = profiles.map((p) => p[device]?.[g]?.[k]).filter((v) => v != null);
      if (vals.length) out[device][`${g}.${k}`] = { low: quant(vals, 0.25), mid: quant(vals, 0.5), high: quant(vals, 0.75), min: Math.min(...vals), max: Math.max(...vals), n: vals.length };
    }
  }
  return out;
}

// A page against a summary of references: the properties outside the range the references share, widest gap first.
export function gap(profile, summary, { device = "desktop" } = {}) {
  const rows = [];
  for (const [g, k, label, kind] of PROPERTIES) {
    const v = profile[device]?.[g]?.[k], ref = summary[device]?.[`${g}.${k}`];
    if (v == null || !ref || ref.n < 2) continue;
    // Tolerance around the references' middle half, so that two close references do not make everything a gap.
    const pad = kind === "share" ? 0.05 : Math.max((ref.high - ref.low) * 0.25, Math.abs(ref.mid) * 0.1, k === "scale_step" || k === "line_height" || k === "largest_to_body" ? 0.05 : 0.5);
    const lo = ref.low - pad, hi = ref.high + pad;
    if (v >= lo && v <= hi) continue;
    const dist = v < lo ? lo - v : v - hi;
    const scale = kind === "share" ? 0.1 : Math.max(Math.abs(ref.mid), 1) * 0.25;
    rows.push({ property: `${g}.${k}`, label, value: v, references: `${ref.low} to ${ref.high} (middle ${ref.mid})`, direction: v < lo ? "below" : "above", distance: Math.round((dist / scale) * 10) / 10 });
  }
  rows.sort((a, b) => b.distance - a.distance);
  return { device, compared: PROPERTIES.length, outside: rows.length, gaps: rows,
    reading: "A gap is a difference from the references, not a defect: keep it when it is a choice, and say why. distance: how far outside the references' range, in rough steps." };
}

export async function profileAt(urls, { cwd, shots = null } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (pack cache, not the project)." };
  const browser = await launch(tools.chromium);
  const pages = [];
  try {
    for (const [n, url] of urls.entries()) {
      const p = { url };
      for (const [k, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1, reducedMotion: "reduce" });
        const page = await ctx.newPage();
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => { if (!/Timeout/i.test(e.message)) throw e; });
          await page.waitForTimeout(600);
          p[k] = await page.evaluate(measureProfile);
          if (shots) { const f = shots(n, k); if (f) await page.screenshot({ path: f }).catch(() => {}); }
        } catch (e) { p.error = String(e.message).split("\n")[0].slice(0, 200); }
        await ctx.close();
        if (p.error) break;
      }
      pages.push(p);
    }
  } finally { await browser.close(); }
  return { available: true, version: PROFILE_VERSION, pages };
}
