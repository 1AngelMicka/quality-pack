// How a page looks, measured in the browser (computed styles and DOM, no LLM): signals of the generic
// "AI-made" look, the type system actually used, line length and line height of prose, small targets.
// Signals are weighted and read together: one signal alone never fails a page. In "operate" mode
// (app screens, dashboards, forms), a conventional layout is not a defect: only quality signals count.
import { loadBrowserTools, launch, measureContext, accountSession, watchDenied, reachOf } from "./browser.mjs";

export const LOOK_VERSION = "2026-11";
export const MODES = ["persuade", "operate", "read"];

// Runs in the page. Returns raw measures; scoring happens in Node.
function measurePage() {
  const vw = innerWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
  const all = [...document.querySelectorAll("body *")].filter(visible);
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const textEls = all.filter((e) => ownText(e).length > 0);
  const tally = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  const fam = {}, sizes = {}, weights = {};
  for (const e of textEls) {
    const s = getComputedStyle(e), len = ownText(e).length;
    const f = s.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
    fam[f] = (fam[f] || 0) + len;
    sizes[Math.round(parseFloat(s.fontSize))] = (sizes[Math.round(parseFloat(s.fontSize))] || 0) + 1;
    weights[s.fontWeight] = (weights[s.fontWeight] || 0) + 1;
  }
  const totalText = Object.values(fam).reduce((a, b) => a + b, 0) || 1;
  const families = Object.entries(fam).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, share: Math.round((n / totalText) * 100) / 100 }));
  const boxes = all.filter((e) => { const s = getComputedStyle(e); return s.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== "none"; });
  const radii = tally(boxes.map((e) => Math.round(parseFloat(getComputedStyle(e).borderTopLeftRadius))).filter((r) => r > 0 && r < 999));
  const gradients = all.filter((e) => /gradient\(/.test(getComputedStyle(e).backgroundImage));
  const gradientText = gradients.filter((e) => { const s = getComputedStyle(e); return /text/.test(s.backgroundClip || s.webkitBackgroundClip || "") || s.webkitTextFillColor === "rgba(0, 0, 0, 0)"; }).length;
  const glass = all.filter((e) => /blur\(/.test(getComputedStyle(e).backdropFilter || "")).length;
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return { h: Math.round(h), s: Math.round(s * 100) / 100, l: Math.round(l * 100) / 100 }; };
  const glows = all.filter((e) => { const sh = getComputedStyle(e).boxShadow; if (sh === "none") return false; const m = sh.match(/rgba?\([^)]*\)[^,]*?(\d+)px\s+(\d+)px\s+(\d+)px/); if (!m) return false; const c = hsl(rgb(sh.match(/rgba?\([^)]*\)/)[0])); return Number(m[3]) >= 20 && c.s > 0.4; }).length;
  const buttons = all.filter((e) => e.matches("button, [role=button], a[class*=btn], a[class*=button], input[type=submit]") && getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)");
  const btnColors = tally(buttons.map((e) => getComputedStyle(e).backgroundColor));
  const primary = Object.entries(btnColors).sort((a, b) => b[1] - a[1])[0];
  const primaryHsl = primary ? hsl(rgb(primary[0])) : null;
  const EMOJI = /\p{Extended_Pictographic}/u;
  const emojiUi = all.filter((e) => e.matches("h1, h2, h3, h4, button, nav a, [role=tab], [role=button], li > a, a[class*=btn], a[class*=button], [class*=badge], [class*=chip], [class*=pill]") && EMOJI.test(e.textContent)).slice(0, 10).map((e) => `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 40)}"`);
  const headings = [...document.querySelectorAll("h1, h2, h3")].filter(visible);
  const eyebrows = headings.filter((h) => { const p = h.previousElementSibling; if (!p || !visible(p)) return false; const s = getComputedStyle(p);
    return s.textTransform === "uppercase" && parseFloat(s.fontSize) <= 14 && p.textContent.trim().length < 40; }).length;
  const h1 = document.querySelector("h1");
  const pill = (e) => { if (!e || !visible(e)) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.height < 40 && parseFloat(s.borderTopLeftRadius) >= r.height / 2 - 1 && e.textContent.trim().length < 60; };
  const badgeBeforeH1 = !!h1 && (pill(h1.previousElementSibling) || pill(h1.parentElement?.previousElementSibling));
  // Groups of exactly 3 siblings built the same way (same tag and classes), each with an icon or image and a heading.
  let cardTriplets = 0;
  for (const p of new Set(all.map((e) => e.parentElement).filter(Boolean))) {
    const kids = [...p.children].filter(visible);
    if (kids.length !== 3) continue;
    const sig = (k) => `${k.tagName}.${typeof k.className === "string" ? k.className : ""}`;
    if (new Set(kids.map(sig)).size === 1 && kids.every((k) => k.querySelector("svg, img") && k.querySelector("h2, h3, h4, strong"))) cardTriplets++;
  }
  const sections = [...document.querySelectorAll("section, main > div")].filter(visible);
  const animated = all.filter((e) => getComputedStyle(e).animationName !== "none").length;
  // Prose: a p or li that holds text only. One that contains blocks (a whole layout in a list item) is not a
  // paragraph. Lines are counted from the boxes of the text itself, not from the height of the element.
  const BLOCKISH = /^(block|flex|grid|table|list-item|flow-root)$/;
  const prose = [...document.querySelectorAll("p, li")].filter((e) => visible(e) && e.textContent.trim().length > 120
    && ![...e.querySelectorAll("*")].some((c) => BLOCKISH.test(getComputedStyle(c).display) || /^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/i.test(c.tagName)));
  const textLines = (e, lh) => {
    const range = document.createRange();
    range.selectNodeContents(e);
    const tops = [...range.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1).map((r) => r.top).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    for (const t of tops) if (t > last + lh * 0.5) { n++; last = t; }
    return Math.max(1, n);
  };
  const longLines = [], tightLines = [];
  for (const p of prose) {
    const s = getComputedStyle(p), fs = parseFloat(s.fontSize), lh = s.lineHeight === "normal" ? fs * 1.2 : parseFloat(s.lineHeight);
    const lines = textLines(p, lh);
    const perLine = Math.round(p.textContent.replace(/\s+/g, " ").trim().length / lines);
    if (lines > 1 && perLine > 80) longLines.push({ perLine, sample: `${p.tagName.toLowerCase()}${typeof p.className === "string" && p.className.trim() ? "." + p.className.trim().split(/\s+/)[0] : ""} "${p.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}" ~${perLine} characters per line over ${lines} lines` });
    if (lh / fs < 1.45) tightLines.push(Math.round((lh / fs) * 100) / 100);
  }
  // Point of view: what a page with no design decision looks like (one family and no display face, a flat type
  // scale, nothing to see in the first screen, a single hue). Not a generic signal: it is the absence of any.
  const sizeChars = {};
  for (const e of textEls) { const k = Math.round(parseFloat(getComputedStyle(e).fontSize)); sizeChars[k] = (sizeChars[k] || 0) + ownText(e).length; }
  const bodySize = Number(Object.entries(sizeChars).sort((a, b) => b[1] - a[1])[0]?.[0]) || 16;
  const maxSize = Math.max(0, ...textEls.filter((e) => ownText(e).length >= 2).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  const firstOf = (e) => getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
  const headingFamilies = [...new Set(headings.map(firstOf))];
  const firstScreenVisuals = all.filter((e) => {
    const r = e.getBoundingClientRect();
    if (r.top >= innerHeight || r.bottom <= 0 || r.width * r.height < vw * innerHeight * 0.02) return false;
    return /^(IMG|PICTURE|VIDEO|CANVAS|IFRAME|svg)$/.test(e.tagName) || /url\(/.test(getComputedStyle(e).backgroundImage);
  }).length;
  const hueSet = new Set();
  for (const e of all) {
    const s = getComputedStyle(e);
    for (const c of [s.color, s.backgroundColor, parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : null, ...(s.backgroundImage.match(/rgba?\([^)]*\)/g) || [])]) {
      if (!c) continue;
      const v = rgb(c);
      if (v.length > 3 && v[3] < 0.3) continue;
      const x = hsl(v);
      if (x.s > 0.25 && x.l > 0.12 && x.l < 0.9) hueSet.add(Math.round(x.h / 30) % 12);
    }
  }
  const interactive = all.filter((e) => e.matches("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=checkbox], [role=switch]"));
  const inProse = (e) => e.tagName === "A" && e.closest("p, li") && !e.closest("nav");
  const small = (min) => interactive.filter((e) => { const r = e.getBoundingClientRect(); return !inProse(e) && (r.width < min || r.height < min); });
  // Share of the first screen painted in a saturated colour, sampled on a 40 × 24 grid (accent should stay rare on app screens).
  const bgOf = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/gradient\(/.test(s.backgroundImage)) { const stop = s.backgroundImage.match(/rgba?\([^)]*\)/); if (stop) return stop[0]; }
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) return s.backgroundColor;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  let hits = 0, samples = 0;
  for (let i = 0; i < 40; i++) for (let j = 0; j < 24; j++) {
    const e = document.elementFromPoint(((i + 0.5) * vw) / 40, ((j + 0.5) * innerHeight) / 24);
    if (!e) continue;
    samples++;
    const c = hsl(rgb(bgOf(e)));
    if (c.s > 0.45 && c.l > 0.15 && c.l < 0.85) hits++;
  }
  // Second-generation generic signals: the "tasteful defaults" that replaced purple gradients in generated pages.
  const cardish = boxes.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 120 && r.height > 60 && r.width < vw * 0.95; });
  const cardSet = new Set(cardish);
  const stripeHues = new Set();
  let stripes = 0;
  for (const e of cardish) {
    const s = getComputedStyle(e), l = parseFloat(s.borderLeftWidth), o = parseFloat(s.borderTopWidth);
    if (l >= 2 && l <= 8 && l > o + 1) { const c = hsl(rgb(s.borderLeftColor)); if (c.s > 0.35) { stripes++; stripeHues.add(Math.round(c.h / 20)); } }
  }
  const nestedCards = cardish.filter((e) => { let d = 0; for (let n = e.parentElement; n; n = n.parentElement) if (cardSet.has(n)) d++; return d >= 2; }).length;
  const iconTiles = [...document.querySelectorAll("h2, h3, h4")].filter(visible).filter((h) => {
    const p = h.previousElementSibling; if (!p || !visible(p)) return false;
    const r = p.getBoundingClientRect(), s = getComputedStyle(p);
    return r.width <= 72 && r.height <= 72 && Math.abs(r.width - r.height) < 4 && s.backgroundColor !== "rgba(0, 0, 0, 0)" && parseFloat(s.borderTopLeftRadius) >= 4 && (p.querySelector("svg, img") || EMOJI.test(p.textContent));
  }).length;
  const numberedLabels = all.filter((e) => !e.children.length && /^0[1-9].?$/.test(e.textContent.trim())).length;
  const pulsingDots = all.filter((e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.animationName !== "none" && s.animationIterationCount === "infinite" && r.width <= 16 && r.height <= 16; }).length;
  const h1Style = h1 && visible(h1) ? getComputedStyle(h1) : null;
  const italicAccent = !!h1Style && h1Style.fontStyle !== "italic" && [...h1.querySelectorAll("*")].some((e) => getComputedStyle(e).fontStyle === "italic" && e.textContent.trim().length > 1)
    && !/sans-serif|system-ui/.test(h1Style.fontFamily.split(",").slice(-1)[0]) ;
  const pageBg = hsl(rgb(bgOf(document.body)));
  const bodyText = document.body.innerText || "";
  const wordCount = bodyText.split(/s+/).filter(Boolean).length;
  const emDashes = (bodyText.match(/—/g) || []).length;
  // What a user can act on, by visible name: a redesign must keep all of it (compared with --baseline).
  const nameOf = (e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || e.getAttribute("title") || e.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const inventory = [...new Set(interactive.map((e) => `${e.tagName === "A" ? "link" : e.tagName === "INPUT" || e.tagName === "SELECT" || e.tagName === "TEXTAREA" ? "field" : "button"}: ${nameOf(e) || (e.getAttribute("href") || "?")}`))].slice(0, 300);
  return { width: vw, accent_share: samples ? Math.round((hits / samples) * 100) / 100 : 0, inventory, families, font_sizes: Object.keys(sizes).map(Number).sort((a, b) => a - b), font_weights: Object.keys(weights).sort(),
    radii: Object.entries(radii).sort((a, b) => b[1] - a[1]).map(([r, n]) => ({ px: Number(r), count: n })), boxes: boxes.length,
    gradients: gradients.length, gradient_text: gradientText, glass, glows, primary_button: primaryHsl, emoji_in_ui: emojiUi,
    side_stripes: stripes, side_stripe_hues: stripeHues.size, nested_cards: nestedCards, icon_tiles: iconTiles, numbered_labels: numberedLabels, pulsing_dots: pulsingDots,
    italic_accent_h1: italicAccent, page_bg: pageBg, words: wordCount, em_dashes: emDashes, lang: (document.documentElement.lang || "").slice(0, 2).toLowerCase(),
    eyebrows, badge_before_h1: badgeBeforeH1, card_triplets: cardTriplets, sections: sections.length, animated,
    prose_blocks: prose.length, long_lines: longLines.length, long_line_max: longLines.length ? Math.max(...longLines.map((l) => l.perLine)) : 0,
    long_line_samples: longLines.sort((a, b) => b.perLine - a.perLine).slice(0, 5).map((l) => l.sample), tight_line_height: tightLines.length,
    body_size: bodySize, max_text_size: maxSize, heading_families: headingFamilies, first_screen_visuals: firstScreenVisuals, hues: hueSet.size,
    targets_under_24: small(24).slice(0, 8).map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`),
    targets_under_44: small(44).length, interactive: interactive.length,
    visible_text: headings.map((h) => h.textContent).concat([...document.querySelectorAll("button, p")].slice(0, 200).map((e) => e.textContent)).join("\n").slice(0, 20000) };
}

const GENERIC_FONTS = ["inter", "geist", "roboto", "open sans", "lato", "arial", "helvetica", "system-ui", "-apple-system", "segoe ui", "poppins", "montserrat"];

// Turn raw measures into weighted signals. Thresholds are house settings (no published validation), dated LOOK_VERSION.
export function scoreLook(m, { mode = "persuade", slopWords = [], motion = null } = {}) {
  const desk = m.desktop || m.mobile, mob = m.mobile || m.desktop;
  const sig = [];
  const add = (id, kind, weight, evidence) => sig.push({ id, kind, weight, evidence });
  const top = desk.families[0];
  if (top && GENERIC_FONTS.includes(top.name) && top.share > 0.6) add("LOOK-FONT", "generic", 1, `${top.name} sets ${Math.round(top.share * 100)} % of the text`);
  const p = desk.primary_button;
  if (p && p.h >= 240 && p.h <= 290 && p.s > 0.4) add("LOOK-VIOLET", "generic", 1, `primary buttons hue ${p.h}°, saturation ${p.s}`);
  if (desk.gradient_text) add("LOOK-GRADTEXT", "quality", 1, `${desk.gradient_text} element(s) with gradient text`);
  if (desk.gradients > 2) add("LOOK-GRADIENTS", "generic", 1, `${desk.gradients} gradient backgrounds`);
  if (desk.glass > 1) add("LOOK-GLASS", "generic", 1, `${desk.glass} element(s) with backdrop blur`);
  if (desk.glows > 1) add("LOOK-GLOW", "generic", 1, `${desk.glows} coloured glow shadow(s)`);
  const r0 = desk.radii[0];
  if (r0 && r0.px >= 12 && r0.px <= 24 && desk.boxes >= 6 && r0.count / desk.boxes > 0.7) add("LOOK-RADIUS", "generic", 1, `${Math.round((r0.count / desk.boxes) * 100)} % of boxes share a ${r0.px}px radius`);
  if (desk.card_triplets) add("LOOK-TRIPLETS", "generic", 1, `${desk.card_triplets} group(s) of three identical icon cards`);
  if (desk.badge_before_h1) add("LOOK-BADGE", "generic", 1, "pill badge right above the h1");
  if (desk.eyebrows >= 3) add("LOOK-EYEBROWS", "generic", 1, `${desk.eyebrows} uppercase eyebrow labels above headings`);
  if (desk.side_stripes >= 3) add("LOOK-STRIPES", "generic", 1, `${desk.side_stripes} cards with a coloured side stripe${desk.side_stripe_hues > 1 ? ` in ${desk.side_stripe_hues} hues` : ""}`);
  if (desk.nested_cards >= 3) add("LOOK-NESTED", "quality", 1, `${desk.nested_cards} boxes nested three levels deep (cards inside cards)`);
  if (desk.icon_tiles >= 3) add("LOOK-ICONTILES", "generic", 1, `${desk.icon_tiles} headings topped by a rounded icon tile`);
  if (desk.numbered_labels >= 3) add("LOOK-NUMBERED", "generic", 1, `${desk.numbered_labels} "01 / 02 / 03" labels (number only real steps)`);
  if (desk.pulsing_dots) add("LOOK-PULSE", "generic", 1, `${desk.pulsing_dots} small element(s) pulsing forever (a dot must show a real state)`);
  // Alone, an italic word in a serif headline is a legitimate editorial choice: it weighs only next to other signals.
  if (desk.italic_accent_h1) add("LOOK-ITALIC", "generic", 1, "serif headline with one word in italics (counts only together with other generic signals: alone, it is a legitimate choice)");
  const bg = desk.page_bg;
  if (bg && p && bg.l > 0.9 && bg.s > 0.15 && bg.h >= 25 && bg.h <= 60 && p.h >= 5 && p.h <= 30 && p.s > 0.4) add("LOOK-PALETTE", "generic", 1, "cream page with a terracotta accent");
  else if (bg && p && bg.l < 0.1 && p.h >= 70 && p.h <= 150 && p.s > 0.7 && p.l > 0.45) add("LOOK-PALETTE", "generic", 1, "near-black page with an acid-green accent");
  // A dash in an aside is normal French: the limit is a rate, and higher in French.
  const dashRate = desk.words >= 150 ? (desk.em_dashes / desk.words) * 1000 : 0;
  if (dashRate > (desk.lang === "fr" ? 15 : 8)) add("LOOK-EMDASH", "quality", 1, `${desk.em_dashes} em dashes in ${desk.words} words`);
  if (desk.emoji_in_ui.length) add("LOOK-EMOJI", "quality", 1, `emoji used as icons: ${desk.emoji_in_ui.slice(0, 3).join(", ")}`);
  if (desk.sections >= 4 && desk.animated >= desk.sections) {
    if (motion === "rich") add("LOOK-ANIMATE-ALL", "info", 0, `${desk.animated} animated elements for ${desk.sections} sections: rich motion declared in .quality/project.json › motion, not counted (reduced motion and content without animation are still checked)`);
    else add("LOOK-ANIMATE-ALL", "quality", 1, `${desk.animated} animated elements for ${desk.sections} sections`);
  }
  const words = slopWords.map((w) => new RegExp(w, "i")).filter((re) => re.test(desk.visible_text)).map((re) => desk.visible_text.match(re)[0]);
  if (words.length) add("LOOK-COPY", "quality", Math.min(2, words.length), `hollow wording: ${[...new Set(words)].slice(0, 5).join(", ")}`);
  // No point of view: three of these four signs together. Reported beside the tier, never added to it: a page
  // with no design decision has no generic signal either, which is why a "low" tier does not mean "good".
  const SYSTEM_FONTS = ["system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto", "helvetica", "helvetica neue", "arial", "sans-serif", "serif", "times new roman", "times", "ui-sans-serif", "ui-serif", "georgia", "verdana", "tahoma"];
  const fams = desk.families.filter((f) => f.share > 0.02);
  const plain = [];
  if (desk.body_size != null) {
    if (top && (SYSTEM_FONTS.includes(top.name) || (fams.length <= 1 && (desk.heading_families || []).every((f) => f === top.name)))) plain.push(SYSTEM_FONTS.includes(top.name) ? `system or default font (${top.name})` : `one family (${top.name}) and no display face for headings`);
    const ratio = desk.body_size ? desk.max_text_size / desk.body_size : 0;
    if (ratio < 2.5) plain.push(`largest text ${Math.round(desk.max_text_size)}px for ${desk.body_size}px body text (ratio ${ratio.toFixed(1)}, under 2.5)`);
    if (!desk.first_screen_visuals) plain.push("no image, illustration or product view in the first screen");
    if (desk.hues <= 1) plain.push(desk.hues ? "a single hue" : "no colour at all");
  }
  const pointOfView = desk.body_size == null ? null : plain.length >= 3 ? "none" : plain.length === 2 ? "weak" : "present";
  if (pointOfView === "none") add("LOOK-PLAIN", "bland", 0, `no visual point of view: ${plain.join("; ")}`);
  const counted0 = sig.filter((s) => s.weight > 0 && (mode === "persuade" || s.kind === "quality"));
  const counted = counted0.filter((s) => s.id !== "LOOK-ITALIC" || counted0.some((o) => o.id !== "LOOK-ITALIC"));
  const points = counted.reduce((t, s) => t + s.weight, 0);
  const tier = points >= 4 ? "strong" : points >= 2 ? "some" : "low";
  // Execution checks that hold in every mode.
  const checks = {
    font_sizes: { value: desk.font_sizes.length, sizes: desk.font_sizes, ok: desk.font_sizes.length <= 8, rule: "8 font sizes or fewer per page (house setting)" },
    font_families: { value: desk.families.filter((f) => f.share > 0.02).length, ok: desk.families.filter((f) => f.share > 0.02).length <= 2, rule: "2 families or fewer, plus monospace if needed" },
    radii: { value: desk.radii.length, ok: desk.radii.length <= 5, rule: "5 distinct radii or fewer (house setting)" },
    line_length: { value: desk.long_line_max, ok: desk.long_lines === 0, ...(desk.long_line_samples?.length ? { samples: desk.long_line_samples } : {}),
      rule: "prose lines of 80 characters or fewer (WCAG 1.4.8); counted on the text's own lines, paragraphs and list items holding blocks are not prose" },
    line_height: { value: desk.tight_line_height, ok: desk.tight_line_height === 0, rule: "prose line height at least 1.5 (WCAG 1.4.8 / 1.4.12)" },
    targets_24: { value: mob.targets_under_24.length, samples: mob.targets_under_24, ok: mob.targets_under_24.length === 0, rule: "no target under 24×24 px on phone (WCAG 2.5.8)" },
    targets_44: { value: mob.targets_under_44, ok: mob.interactive === 0 || mob.targets_under_44 / mob.interactive <= 0.2, rule: "primary controls 44×44 px on phone; at most 20 % of controls under 44 px (house setting)" },
    accent_share: { value: desk.accent_share, ok: mode === "persuade" || desk.accent_share <= 0.15,
      rule: mode === "persuade" ? "share of the first screen in a saturated colour (reported only on persuasive pages)" : "saturated colour on 15 % of the first screen or less on app and reading screens (house setting)" },
  };
  if (m.scroll) {
    const s = m.scroll;
    const hijack = s.non_passive_root_listeners.length > 0 || s.smooth_scroll_libraries.length > 0 || s.root_overflow_hidden;
    checks.scroll_hijack = { value: [...s.smooth_scroll_libraries, ...s.non_passive_root_listeners.map((t) => `non-passive ${t} listener`), ...(s.root_overflow_hidden ? ["page root not scrollable"] : [])].join(", ") || "native scrolling",
      ok: !hijack || mode === "persuade",
      rule: mode === "persuade" ? "scrolling replaced or intercepted: allowed on persuasive pages only if keyboard, anchors, find-in-page and reduced motion still work (test them)" : "native scrolling on app and reading screens: no smooth-scroll library, no non-passive wheel or touch listener on the page" };
    checks.content_without_animation = { value: s.text_still_hidden, samples: s.hidden_samples, ok: s.text_still_hidden === 0,
      rule: "with reduced motion requested and the page scrolled through, no text stays invisible (content never depends on an animation)" };
  }
  if (m.reduced_motion) {
    const { normal, reduced } = m.reduced_motion;
    checks.reduced_motion = { value: `${normal} animated → ${reduced} with reduced motion`, ok: normal === 0 || reduced <= normal / 2,
      rule: "with prefers-reduced-motion: reduce, most animations stop or become fades (house setting: at least half of them)" };
  }
  return { version: LOOK_VERSION, mode, tier, points, signals: sig, counted: counted.map((s) => s.id), checks,
    point_of_view: pointOfView, ...(plain.length ? { point_of_view_signs: plain } : {}),
    tier_meaning: "The tier counts signs of a generic, template look. \"low\" means few such signs, not a good design: a page with no design decision at all is also \"low\". Read point_of_view and look at the screenshots.",
    reading: mode === "persuade" ? "0–1 point: low (few generic signals, which does not make the page good), 2–3: some generic signals, 4+: strong. One signal alone is never a defect."
      : "Operate and read modes count quality signals only: a conventional layout is right for app screens (Jakob's law). A low tier is not a verdict on quality." };
}

// Injected before any page script: records wheel and touch listeners that are not passive on the page root
// (they can cancel native scrolling, which is how scroll hijacking works).
const SCROLL_PROBE = `(() => {
  const roots = () => [window, document, document.documentElement, document.body];
  window.__qpScroll = { nonPassive: [] };
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (/^(wheel|mousewheel|DOMMouseScroll|touchmove)$/.test(type)) {
      const passive = typeof opts === "object" && opts !== null && opts.passive === true;
      if (!passive && roots().includes(this)) window.__qpScroll.nonPassive.push(type);
    }
    return orig.call(this, type, fn, opts);
  };
})();`;

// Scroll from top to bottom like a reader, then report what scrolling looks like and what stays invisible.
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const visible = (e) => { const s = getComputedStyle(e); return s.display !== "none" && !e.closest("[hidden], [aria-hidden='true'], dialog:not([open])"); };
    const hidden = [...document.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, figcaption")]
      .filter((e) => visible(e) && e.textContent.trim().length >= 20)
      .filter((e) => { let o = 1; for (let n = e; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o < 0.1 || getComputedStyle(e).visibility === "hidden"; });
    const html = document.documentElement, body = document.body;
    const smooth = [
      (window.Lenis || window.lenis || html.classList.contains("lenis") || html.classList.contains("lenis-smooth")) && "Lenis",
      (html.classList.contains("has-scroll-smooth") || document.querySelector("[data-scroll-container]")) && "Locomotive Scroll",
      (document.querySelector("#smooth-wrapper #smooth-content") || window.ScrollSmoother) && "GSAP ScrollSmoother",
    ].filter(Boolean);
    const timelines = [...document.querySelectorAll("body *")].filter((e) => { const t = getComputedStyle(e).animationTimeline; return t && t !== "auto" && !/^auto(, ?auto)*$/.test(t); }).length;
    return {
      non_passive_root_listeners: [...new Set(window.__qpScroll?.nonPassive || [])],
      smooth_scroll_libraries: smooth,
      root_overflow_hidden: getComputedStyle(html).overflowY === "hidden" || getComputedStyle(body).overflowY === "hidden",
      css_scroll_timelines: timelines,
      text_still_hidden: hidden.length,
      hidden_samples: hidden.slice(0, 5).map((e) => `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 40)}"`),
    };
  });
}

// Redesign guard: every control of the baseline must still exist after a redesign (by kind and visible name).
export function compareInventory(before = [], after = []) {
  const now = new Set(after);
  return { missing: before.filter((x) => !now.has(x)), added: after.filter((x) => !before.includes(x)).length, before: before.length, after: after.length };
}

// .quality/project.json › motion: "rich" for the whole site, or per path ({ "/": "rich", "/app/*": "calm", "*": "calm" }):
// exact path first, then the longest "prefix/*" key, then "*".
export function motionFor(motion, url) {
  if (!motion) return null;
  if (typeof motion === "string") return motion;
  if (typeof motion !== "object") return null;
  let path = "/";
  try { path = new URL(url).pathname.replace(/\/+$/, "") || "/"; } catch { /* keep / */ }
  const norm = (k) => k.replace(/\/+$/, "") || "/";
  const exact = Object.keys(motion).find((k) => !k.endsWith("*") && norm(k) === path);
  if (exact) return motion[exact];
  const prefix = Object.keys(motion).filter((k) => k.endsWith("/*") && (path + "/").startsWith(k.slice(0, -1))).sort((a, b) => b.length - a.length)[0];
  return prefix ? motion[prefix] : motion["*"] ?? null;
}

export async function lookAt(urls, { cwd, mode = "persuade", slopWords = [], baseline = null, before = [], as = null, project = null } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <sw.mjs> browser-setup` once (pack cache, not the project)." };
  const browser = await launch(tools.chromium);
  const pages = [];
  try {
    let session = null;
    if (as) { try { session = await accountSession(browser, project, as, { root: cwd, base: new URL(urls[0]).origin }); } catch (e) { return { available: true, errors: [String(e.message)] }; } }
    const ctxFor = (options) => measureContext(browser, options, { session, before });
    for (const url of urls) {
      const m = {};
      const denied = [];
      let final = null;
      for (const [k, vp] of [["mobile", { width: 390, height: 844, isMobile: true, hasTouch: true }], ["desktop", { width: 1440, height: 900 }]]) {
        const ctx = await ctxFor({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
        const page = await ctx.newPage();
        watchDenied(page, denied);
        try { await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }); } catch (e) { if (!/Timeout/i.test(e.message)) { m.error = String(e.message).slice(0, 200); await ctx.close(); break; } }
        m[k] = await page.evaluate(measurePage);
        if (k === "desktop" || !final) final = page.url();
        await ctx.close();
      }
      if (m.error) { pages.push({ url, error: m.error }); continue; }
      const reach = reachOf(url, final, denied);
      // The same page with reduced motion requested: animations should mostly stop, and the whole content must
      // be readable once scrolled through. Scroll listeners are recorded from the start to spot scroll hijacking.
      const rctx = await ctxFor({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await rctx.addInitScript(SCROLL_PROBE);
      const rpage = await rctx.newPage();
      try { await rpage.goto(url, { waitUntil: "networkidle", timeout: 30000 }); } catch { /* measured as loaded */ }
      const reduced = await rpage.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => getComputedStyle(e).animationName !== "none").length).catch(() => null);
      m.scroll = await scrollThrough(rpage).catch(() => null);
      await rctx.close();
      if (reduced != null) m.reduced_motion = { normal: m.desktop.animated, reduced };
      const scored = scoreLook(m, { mode, slopWords, motion: motionFor(project?.motion, url) });
      for (const k of ["mobile", "desktop"]) delete m[k].visible_text;
      const page = { url, ...(reach.warnings.length ? { warnings: reach.warnings } : {}), reach, ...scored, measures: m };
      if (!reach.same_screen) page.tier = `not measured: redirected (${scored.tier} on ${reach.final})`;
      const base = baseline?.pages?.find((p) => p.url === url) || (baseline?.pages?.length === 1 && urls.length === 1 ? baseline.pages[0] : null);
      if (base?.measures?.desktop?.inventory) page.redesign_guard = compareInventory(base.measures.desktop.inventory, m.desktop.inventory);
      pages.push(page);
    }
  } finally { await browser.close(); }
  return { available: true, version: LOOK_VERSION, mode, ...(as ? { as } : {}), pages };
}
