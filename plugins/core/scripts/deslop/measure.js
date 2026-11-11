// Measures the rendered interface (spacing, alignment, signs of generated UI) with no dependency.
// Evaluated as is in a page, it returns a JSON object: it is the engine of audit.mjs, and it can also be
// pasted into a browser's JavaScript evaluation tool. To keep a deliberate exception: data-deslop-ignore on the element.
// Ported from the deslop-ui skill (same author as the pack).
(() => {
  const RULES = {
    // Spacing
    'proximity-inverted': ['high', "A heading or label must sit closer to what it introduces than to what precedes it: add space above or remove space below."],
    'uneven-siblings': ['high', "Siblings of the same rank need the same gap: set one gap on the parent and remove the individual margins."],
    'left-edge-drift': ['high', "The text of these items starts a few pixels apart: give the icon area a fixed width or align on one column."],
    'section-edge-drift': ['med', "The large blocks of the page do not share a left edge: put them in one container with one margin."],
    'page-margins': ['med', "The page's left and right margins differ: look for a max-width without margin-inline:auto, or padding on one side only."],
    'uneven-inset': ['med', "This box's padding is unbalanced: use the same value left and right, and top and bottom."],
    'text-cramped': ['high', "Text sits less than 8px from the edge of its box: aim for 12-16px of padding."],
    'gap-exceeds-padding': ['low', "Children are further from each other than from the edge of their box: padding must be at least the inner gap."],
    'control-row-drift': ['med', "These side-by-side controls differ in height or axis: use one height and align-items:center."],
    'control-padding': ['low', "This button's padding is off: horizontal padding must be equal on both sides and at least the vertical padding."],
    'ragged-row': ['med', "Cards in the same row have almost the same height: stretch them (align-items:stretch) or make the difference clear."],
    'edge-text': ['high', "Text sits less than 12px from the screen edge on mobile (8px on desktop): aim for a 16px margin."],
    'overflow-x': ['high', "The page scrolls sideways: fix the element that overflows rather than hiding it with overflow:hidden."],
    'touch-target': ['med', "Touch target too small: aim for 44px tall on mobile (40px at least)."],
    'off-scale': ['med', "Over a quarter of the values are off the scale (multiples of 4, plus 1, 2, 6, 10 and 14): go through tokens."],
    'no-spacing-scale': ['low', "Too many different spacing values: there is no system; reduce to a scale of 6 to 8 values."],
    // Readability
    'line-length': ['low', "Line too long: keep running text to 65-80 characters (max-width in ch)."],
    'text-squeezed': ['high', "Text squeezed into a column a few words wide: look for padding that grows with the screen inside a max-width box, or a page gutter applied to a nested block."],
    'tiny-text': ['low', "Text under 12px: raise it to 12px at least."],
    'type-sprawl': ['low', "Too many text sizes: reduce to 5 or 6 levels."],
    // Signs of generated UI
    'emoji-icons': ['med', "Emoji used as an interface icon: remove it or replace it with a consistent SVG icon."],
    'gradient-text': ['med', "Gradient text: a generated-UI reflex; use a solid colour."],
    'gradient-control': ['med', "Gradient on a button or active element: prefer a solid colour."],
    'glow-shadow': ['med', "Coloured glow shadow: use a subtle neutral shadow, or none."],
    'glass': ['low', "Glass effect (backdrop-filter): keep it for real overlays, otherwise an opaque background."],
    'eyebrow': ['med', "Small uppercase label above a heading: remove it if it repeats the heading or adds no information."],
    'numbered-markers': ['med', "01/02/03 numbering: keep it only if the content is a real sequence."],
    'icon-tile': ['med', "Icon in a repeated rounded tile: keep the icon alone, or remove it if it carries no information."],
    'accent-bar': ['med', "Coloured bar on the left of a rounded box: a generated-UI reflex; remove it."],
    'nested-cards': ['med', "Cards inside cards: flatten and group with space or one background."],
    'nested-radius': ['low', "The inner corner is rounder than the outer one: inner radius = outer radius - padding."],
    'card-kit': ['low', "Everything is cut into identical cards: vary them with the real importance of the content, or remove boxes."],
    'arrow-cta': ['low', "Decorative arrow added to a button or link: remove it unless it signals real movement."],
    'placeholder-copy': ['high', "Visible filler text: replace it with the real content."],
  };

  // clientWidth, not innerWidth: in mobile emulation, an overflowing page widens innerWidth
  const W = document.documentElement.clientWidth || window.innerWidth;
  const H = window.innerHeight;
  const MOBILE = W < 768;
  const MAX_ELEMENTS = 6000;
  const MAX_EXAMPLES = 5;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'BR', 'TITLE', 'OPTION', 'DEFS']);
  const CONTROL_SELECTOR = 'button,select,textarea,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),[role=button]';

  const found = new Map();
  const seen = new Map();
  const add = (rule, el, detail) => {
    const owner = el || document;
    if (!seen.has(owner)) seen.set(owner, new Set());
    const key = `${rule}|${detail}`;
    if (seen.get(owner).has(key)) return;
    seen.get(owner).add(key);
    if (!found.has(rule)) found.set(rule, []);
    found.get(rule).push({ where: el ? describe(el) : 'page', detail });
  };

  const px = (v) => parseFloat(v) || 0;
  const round = (v) => Math.round(v * 10) / 10;
  const styleCache = new Map();
  const rectCache = new Map();
  const css = (el) => {
    if (!styleCache.has(el)) styleCache.set(el, getComputedStyle(el));
    return styleCache.get(el);
  };
  const rect = (el) => {
    if (!rectCache.has(el)) rectCache.set(el, el.getBoundingClientRect());
    return rectCache.get(el);
  };
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  function ownText(el) {
    let text = '';
    for (const node of el.childNodes) if (node.nodeType === 3) text += node.textContent;
    return text.replace(/\s+/g, ' ').trim();
  }
  function describe(el) {
    let label = el.tagName.toLowerCase();
    if (el.id) label += `#${el.id}`;
    const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    if (classes.length) label += `.${classes.join('.')}`;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32);
    return text ? `${label} "${text}"` : label;
  }
  function visible(el) {
    if (SKIP.has(el.tagName)) return false;
    const r = rect(el);
    if (r.width <= 1 || r.height <= 1) return false;
    const s = css(el);
    if (s.display === 'none' || s.visibility !== 'visible' || px(s.opacity) === 0 && s.opacity !== '') return false;
    return r.right > 0 && r.left < W;
  }
  const inFlow = (el) => !['absolute', 'fixed'].includes(css(el).position);
  const kidsOf = (el) => [...el.children].filter((k) => usable.has(k));

  function colorOf(value) {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function shadowLayers(value) {
    return [...String(value).matchAll(/rgba?\([^)]+\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g)]
      .map((m) => ({ color: colorOf(m[0]), x: +m[1], y: +m[2], blur: +m[3], spread: +m[4] }))
      .filter((l) => l.color && l.color.a > 0.02 && (l.x || l.y || l.blur || l.spread));
  }
  const saturated = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 60;
  function effectiveBg(el) {
    for (let cur = el; cur; cur = cur.parentElement) {
      const c = colorOf(css(cur).backgroundColor);
      if (c && c.a > 0.02) return css(cur).backgroundColor;
    }
    return 'rgb(255, 255, 255)';
  }
  function isBox(el) {
    const r = rect(el);
    if (r.width < 40 || r.height < 24) return false;
    if (['IMG', 'SVG', 'VIDEO', 'CANVAS', 'svg'].includes(el.tagName)) return false;
    const s = css(el);
    const bg = colorOf(s.backgroundColor);
    if (bg && bg.a > 0.02 && el.parentElement && s.backgroundColor !== effectiveBg(el.parentElement)) return true;
    const fill = colorOf(s.webkitTextFillColor) || colorOf(s.color);
    const clippedToText = s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text' || (fill && fill.a === 0);
    if (shadowLayers(s.boxShadow).length || (s.backgroundImage !== 'none' && !/url\(/.test(s.backgroundImage) && !clippedToText)) return true;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => {
      const color = colorOf(s[`border${side}Color`]);
      return px(s[`border${side}Width`]) >= 1 && s[`border${side}Style`] !== 'none' && color && color.a > 0.02;
    });
    return sides.length >= 3;
  }
  const isControl = (el) => el.matches(CONTROL_SELECTOR) || (el.tagName === 'A' && isBox(el));

  function textRect(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        if (r.width > 0) return r;
      }
    }
    return null;
  }
  function firstTextLeft(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || !usable.has(node.parentElement)) continue;
      if (css(node.parentElement).textAlign === 'center') return null;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width > 0) return { left: r.left, center: (r.left + r.right) / 2, node };
    }
    return null;
  }
  // Visible edge of a large block: that of its first box, whose inner padding is legitimate.
  function blockEdge(el) {
    const first = firstTextLeft(el);
    if (!first) return null;
    let edge = first.left;
    for (let cur = first.node.parentElement; cur && cur !== el.parentElement; cur = cur.parentElement) {
      if (isBox(cur) && rect(cur).width < W * 0.98) edge = rect(cur).left;
    }
    return edge;
  }

  // Stacking direction of a list of elements, null if it wraps.
  function axisOf(kids) {
    const pairs = kids.slice(1).map((k, i) => [rect(kids[i]), rect(k)]);
    if (pairs.every(([a, b]) => b.top >= a.bottom - 1)) return 'y';
    if (pairs.every(([a, b]) => b.left >= a.right - 1)) return 'x';
    return null;
  }
  function gapsOf(kids, axis) {
    return kids.slice(1).map((k, i) => (axis === 'y' ? rect(k).top - rect(kids[i]).bottom : rect(k).left - rect(kids[i]).right));
  }
  function clusters(values, tolerance = 1.5) {
    const groups = [];
    for (const v of [...values].sort((a, b) => a - b)) {
      if (!groups.length || v - groups[groups.length - 1] > tolerance) groups.push(v);
    }
    return groups;
  }

  const all = [...document.body.querySelectorAll('*')];
  const usable = new Set();
  for (const el of all) {
    if (usable.size >= MAX_ELEMENTS) break;
    if (el.closest('[data-deslop-ignore],[aria-hidden="true"],[inert]')) continue;
    const owner = el.closest('svg');
    if (owner && owner !== el) continue;
    if (visible(el)) usable.add(el);
  }
  const elements = [...usable];
  const textLeaves = elements.filter((el) => ownText(el));

  // --- Spacing scale -------------------------------------------------------
  const spacing = new Map();
  const spacingExample = new Map();
  const onScale = (v) => v <= 2 || Math.abs(v / 4 - Math.round(v / 4)) < 0.03 || [6, 10, 14].includes(Math.round(v));
  const note = (raw, el) => {
    const v = round(Math.abs(raw));
    if (!v || v > 64) return; // beyond that, fluid values (clamp, %) are legitimate
    spacing.set(v, (spacing.get(v) || 0) + 1);
    if (!spacingExample.has(v)) spacingExample.set(v, el);
  };
  for (const el of elements) {
    if (el.tagName === 'svg') continue;
    const s = css(el);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) note(px(s[`padding${side}`]), el);
    note(px(s.marginTop), el);
    note(px(s.marginBottom), el);
    // margin:auto comes back in pixels: only asymmetric margins are choices
    if (Math.abs(px(s.marginLeft) - px(s.marginRight)) > 1) {
      note(px(s.marginLeft), el);
      note(px(s.marginRight), el);
    }
    if (/flex|grid/.test(s.display)) {
      if (s.rowGap !== 'normal') note(px(s.rowGap), el);
      if (s.columnGap !== 'normal') note(px(s.columnGap), el);
    }
  }
  const total = [...spacing.values()].reduce((a, b) => a + b, 0);
  const off = [...spacing].filter(([v]) => !onScale(v)).sort((a, b) => b[1] - a[1]);
  const offCount = off.reduce((a, [, n]) => a + n, 0);
  if (total && offCount >= 5 && offCount / total > 0.25) {
    for (const [v, n] of off.slice(0, MAX_EXAMPLES)) add('off-scale', spacingExample.get(v), `${v}px used ${n} times`);
  }
  if (spacing.size > 20) add('no-spacing-scale', null, `${spacing.size} different values: ${[...spacing.keys()].sort((a, b) => a - b).join(', ')}`);

  // --- Proximity: a heading belongs to what it introduces ------------------
  function neighbour(el, dir) {
    const step = dir < 0 ? 'previousElementSibling' : 'nextElementSibling';
    let block = el;
    for (let depth = 0; depth < 4 && block && block !== document.body; depth++) {
      for (let sib = block[step]; sib; sib = sib[step]) {
        if (usable.has(sib) && inFlow(sib)) return sib;
      }
      const parent = block.parentElement;
      if (!parent || parent === document.body || isBox(parent)) return null;
      block = parent;
    }
    return null;
  }
  for (const el of elements) {
    if (!el.matches('h1,h2,h3,h4,h5,h6,[role=heading],label,legend') || !inFlow(el)) continue;
    let prev = neighbour(el, -1);
    const next = neighbour(el, 1);
    if (!prev || !next) continue;
    const r = rect(el);
    // An overline stuck to the heading is part of its block: measure above the group
    let groupTop = r.top;
    if (prev.textContent.trim().length <= 40 && px(css(prev).fontSize) < px(css(el).fontSize) && r.top - rect(prev).bottom <= 16) {
      groupTop = rect(prev).top;
      prev = neighbour(prev, -1);
      if (!prev) continue;
    }
    const above = groupTop - rect(prev).bottom;
    const below = rect(next).top - r.bottom;
    const overlaps = (o) => rect(o).left < r.right && rect(o).right > r.left;
    if (above < 0 || below < 0 || !overlaps(prev) || !overlaps(next)) continue;
    if (below >= 8 && below <= 64 && above + 2 < below) add('proximity-inverted', el, `${round(above)}px above, ${round(below)}px below`);
  }

  // --- Rhythm and alignment of lists ---------------------------------------
  for (const parent of [document.body, ...elements]) {
    const kids = kidsOf(parent).filter(inFlow);
    if (kids.length < 3) continue;
    const axis = axisOf(kids);
    if (!axis) continue;
    const display = css(parent).display;
    if (axis === 'x' && !/flex|grid/.test(display)) continue;
    const tags = new Set(kids.map((k) => k.tagName));
    const landmark = kids.every((k) => k.matches('section,article,header,footer'));
    const sizes = kids.map((k) => (axis === 'y' ? rect(k).height : rect(k).width));
    // An active item taller than the others does not prevent recognising a list
    const typical = median(sizes);
    const similar = sizes.filter((v) => v / typical <= 1.6 && typical / v <= 1.6).length >= sizes.length * 0.75;
    if (tags.size > 1 && !landmark) continue;
    if (!similar && !landmark) continue;
    if (!landmark && typical > 400) continue;
    if (axis === 'y' && kids.some((k) => css(k).display.startsWith('inline'))) continue;

    const gaps = gapsOf(kids, axis).map(round);
    const groups = clusters(gaps);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    const nearMiss = groups.length === 2 && groups[1] - groups[0] <= 6 && groups[1] / Math.max(1, groups[0]) < 1.5;
    if ((groups.length >= 3 && spread >= 4) || nearMiss) add('uneven-siblings', parent, `gaps ${gaps.join(', ')}px`);

    if (axis === 'y' && !landmark) {
      const firsts = kids.map((k) => firstTextLeft(k));
      const lefts = firsts.map((f) => f?.left ?? null);
      const centers = firsts.map((f) => f?.center ?? 0);
      const centered = Math.max(...centers) - Math.min(...centers) <= 1.5;
      if (lefts.every((v) => v !== null) && !centered) {
        const drift = Math.max(...lefts) - Math.min(...lefts);
        if (drift > 1.5 && drift <= 10) add('left-edge-drift', parent, `text starts at ${lefts.map(round).join(', ')}px (drift ${round(drift)}px)`);
      }
    }
  }

  // Edges of the page's large blocks
  const blocks = [...document.body.children, ...(document.querySelector('main')?.children || [])]
    .filter((el) => usable.has(el) && rect(el).width >= W * 0.6 && !el.matches('main'));
  const edges = blocks.map((el) => [el, blockEdge(el)]).filter(([, v]) => v !== null);
  if (edges.length >= 2) {
    const groups = clusters(edges.map(([, v]) => v), 1);
    if (groups.length === 2 && groups[1] - groups[0] <= 24) {
      const outlier = edges.find(([, v]) => Math.abs(v - groups[1]) <= 1);
      add('section-edge-drift', outlier[0], `left edges at ${groups.map(round).join(' and ')}px`);
    }
  }

  // Page margins (without a sidebar, where asymmetry is structural)
  const hasSidebar = elements.some((el) => {
    const r = rect(el);
    return r.height >= H * 0.6 && r.width < W * 0.4 && r.width > 40 && (r.left <= 1 || r.right >= W - 1);
  });
  if (!hasSidebar) {
    let frame = document.querySelector('main') || document.body;
    for (let depth = 0; depth < 8; depth++) {
      const kids = kidsOf(frame).filter(inFlow);
      if (!kids.length) break;
      const widest = kids.reduce((a, b) => (rect(b).width > rect(a).width ? b : a));
      if (rect(widest).width < rect(frame).width - 1) {
        // Only a wide block alone on its row draws the page frame, not a column or a button
        const alone = !kids.some((k) => k !== widest && rect(k).top < rect(widest).bottom && rect(k).bottom > rect(widest).top);
        if (alone && rect(widest).width >= W * 0.6) frame = widest;
        break;
      }
      frame = widest;
    }
    const left = rect(frame).left;
    const right = W - rect(frame).right;
    // A neighbouring column, even higher in the tree, explains the asymmetry
    let beside = false;
    for (let cur = frame; cur && cur !== document.body; cur = cur.parentElement) {
      for (const sib of cur.parentElement ? kidsOf(cur.parentElement) : []) {
        if (sib !== cur && inFlow(sib) && rect(sib).top < rect(cur).bottom && rect(sib).bottom > rect(cur).top) beside = true;
      }
    }
    if (!beside && left >= 0 && right >= 0 && Math.abs(left - right) > 8 && rect(frame).width < W - 2) {
      add('page-margins', frame, `${round(left)}px left, ${round(right)}px right`);
    }
  }

  // --- Boxes ---------------------------------------------------------------
  const boxes = elements.filter((el) => isBox(el) && !isControl(el));
  const boxSet = new Set(boxes);
  for (const box of boxes) {
    const r = rect(box);
    if (r.height < 40 || r.width < 80) continue;
    const s = css(box);
    const kids = kidsOf(box).filter(inFlow);
    if (!kids.length) continue;
    const pl = px(s.paddingLeft), pr = px(s.paddingRight), pt = px(s.paddingTop), pb = px(s.paddingBottom);
    if (Math.abs(pl - pr) > 2 && Math.max(pl, pr) <= 64 && !/auto|scroll/.test(s.overflowY)) add('uneven-inset', box, `padding ${pl}px left, ${pr}px right`);
    const first = kids[0], last = kids[kids.length - 1];
    const media = (k) => k.matches('img,picture,video,canvas,svg') || isBox(k);
    if (!media(first) && !media(last) && !/auto|scroll/.test(s.overflowY)) {
      const top = pt + Math.max(0, px(css(first).marginTop));
      const bottom = pb + Math.max(0, px(css(last).marginBottom));
      if (Math.max(top, bottom) <= 64 && Math.abs(top - bottom) > Math.max(6, 0.4 * Math.max(top, bottom))) add('uneven-inset', box, `${top}px top, ${bottom}px bottom`);
    }
    if (kids.length >= 2 && pl > 0 && pt > 0) {
      const axis = axisOf(kids);
      // In a row, the measured gap often comes from space-between: only the declared gap counts
      const gap = axis === 'y' ? median(gapsOf(kids, axis)) : axis === 'x' ? px(s.columnGap) : 0;
      const inset = axis === 'y' ? pt : pl;
      if (gap >= 16 && gap > inset + 1) add('gap-exceeds-padding', box, `gap ${round(gap)}px for ${inset}px of padding`);
    }
  }

  // Text stuck to the edge of its box
  for (const el of textLeaves) {
    if (isControl(el) || el.closest(CONTROL_SELECTOR)) continue;
    let box = el;
    for (let depth = 0; box && depth < 5 && !boxSet.has(box); depth++) box = box.parentElement;
    if (!box || !boxSet.has(box)) continue;
    const b = rect(box);
    if (b.height < 32 || b.width >= W * 0.9) continue;
    // A merely decorative gradient draws no edge the text could touch
    const bs = css(box);
    const fill = colorOf(bs.backgroundColor);
    if (bs.backgroundImage !== 'none' && !(fill && fill.a > 0.02) && !shadowLayers(bs.boxShadow).length && px(bs.borderTopWidth) === 0) continue;
    const t = textRect(el);
    if (!t) continue;
    const inset = Math.min(t.left - b.left, b.right - t.right);
    if (inset >= 0 && inset < 8) add('text-cramped', el, `${round(inset)}px from the edge of ${describe(box).split(' ')[0]}`);
  }

  // Controls
  for (const el of elements) {
    if (!isControl(el)) continue;
    const s = css(el), r = rect(el);
    if (el.matches('button,a,[role=button]') && ownText(el) && isBox(el)) {
      const pl = px(s.paddingLeft), pr = px(s.paddingRight), pt = px(s.paddingTop);
      const hasIcon = el.querySelector('svg,img');
      if (!hasIcon && Math.abs(pl - pr) > 2) add('control-padding', el, `padding ${pl}px / ${pr}px`);
      if (r.height < 56 && pl < pt && s.textAlign !== 'left') add('control-padding', el, `horizontal padding ${pl}px, vertical ${pt}px`);
    }
    if (MOBILE && r.height < 40) {
      const inline = s.display === 'inline' && ownText(el.parentElement || el);
      if (!inline) add('touch-target', el, `${round(r.width)}x${round(r.height)}px`);
    }
  }
  if (MOBILE) {
    for (const el of elements) {
      if (el.tagName !== 'A' || isControl(el) || css(el).display === 'inline') continue;
      if (rect(el).height < 40) add('touch-target', el, `${round(rect(el).width)}x${round(rect(el).height)}px`);
    }
  }
  for (const parent of elements) {
    const controls = kidsOf(parent).filter((k) => isControl(k) && inFlow(k));
    for (let i = 1; i < controls.length; i++) {
      const a = rect(controls[i - 1]), b = rect(controls[i]);
      if (a.bottom <= b.top || b.bottom <= a.top) continue;
      const dh = Math.abs(a.height - b.height);
      const dc = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
      if ((dh > 0.5 && dh <= 12) || dc > 1.5) add('control-row-drift', parent, `heights ${round(a.height)} and ${round(b.height)}px, axis offset ${round(dc)}px`);
    }
  }

  // Rows of cards
  for (const parent of elements) {
    const cards = kidsOf(parent).filter((k) => boxSet.has(k));
    if (cards.length < 2) continue;
    const rows = new Map();
    for (const card of cards) {
      const top = Math.round(rect(card).top);
      if (!rows.has(top)) rows.set(top, []);
      rows.get(top).push(rect(card).height);
    }
    for (const heights of rows.values()) {
      if (heights.length < 2) continue;
      const max = Math.max(...heights), min = Math.min(...heights);
      if (max - min >= 8 && (max - min) / max <= 0.35) add('ragged-row', parent, `heights ${heights.map(round).join(', ')}px`);
    }
  }

  // Screen edges
  const overflow = document.documentElement.scrollWidth - W;
  if (overflow > 1) {
    const culprit = elements.find((el) => rect(el).right > W + 1 && rect(el).left >= 0 && !el.closest('[style*="overflow"]'));
    add('overflow-x', culprit || null, `${overflow}px too wide at ${W}px`);
  }
  for (const el of textLeaves) {
    const t = textRect(el);
    if (!t || t.width >= W - 2 || css(el).position === 'fixed' || el.closest('pre,code')) continue;
    let clipped = false;
    for (let cur = el.parentElement, depth = 0; cur && cur !== document.body && depth < 8; cur = cur.parentElement, depth++) {
      if (css(cur).overflowX !== 'visible' && rect(cur).width < W - 1) clipped = true;
    }
    if (clipped) continue;
    const limit = MOBILE ? 12 : 8;
    if (t.left >= 0 && t.left < limit) add('edge-text', el, `${round(t.left)}px from the left edge`);
    else if (t.right <= W && W - t.right < limit) add('edge-text', el, `${round(W - t.right)}px from the right edge`);
  }

  // --- Readability ---------------------------------------------------------
  const fontSizes = new Map();
  const fontFamilies = new Map();
  for (const el of textLeaves) {
    const s = css(el);
    const size = round(px(s.fontSize));
    fontSizes.set(size, (fontSizes.get(size) || 0) + 1);
    const family = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fontFamilies.set(family, (fontFamilies.get(family) || 0) + 1);
    if (size < 12) add('tiny-text', el, `${size}px`);
    const t = textRect(el);
    if (t && ownText(el).length > 120 && t.width / (size * 0.5) > 88) add('line-length', el, `about ${Math.round(t.width / (size * 0.5))} characters per line`);
    // the opposite failure: a paragraph or heading wrapped into a column a few words wide. It never overflows, so
    // no overflow check sees it; it often grows with the screen (a gutter in vw inside a max-width box).
    // Display headings (over 28px) may run short lines on purpose: they are flagged only when truly cramped.
    if (t && ownText(el).length >= 30 && !el.closest('td,th,nav,button,[role=button],figcaption')) {
      const cpl = t.width / (size * 0.5);
      const lines = Math.round(t.height / (px(s.lineHeight) || size * 1.2));
      if (lines >= 3 && cpl < 20 && (size <= 28 || cpl < 12)) add('text-squeezed', el, `about ${Math.round(cpl)} characters per line over ${lines} lines, ${round(t.width)}px wide at ${W}px`);
    }
  }
  if (fontSizes.size > 8) add('type-sprawl', null, `${fontSizes.size} sizes: ${[...fontSizes.keys()].sort((a, b) => a - b).join(', ')}`);

  // --- Signs of generated UI -------------------------------------------------
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{2604}\u{2607}-\u{2712}\u{2718}-\u{27BF}]/u;
  const radii = new Map();
  const kit = new Map();
  const tiles = new Map();
  for (const el of textLeaves) {
    const text = ownText(el);
    const s = css(el);
    if (text.length <= 60 && EMOJI.test(text)) add('emoji-icons', el, `"${text.slice(0, 40)}"`);
    if (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text') add('gradient-text', el, `"${text.slice(0, 40)}"`);
    if (/^0\d[.)]?$/.test(text)) add('numbered-markers', el, `"${text}"`);
    if (/[→➜➔]\s*$/.test(text) && (isControl(el) || el.closest('a,button'))) add('arrow-cta', el, `"${text.slice(0, 40)}"`);
    if (/lorem ipsum|dolor sit amet|john doe|acme corp/i.test(text)) add('placeholder-copy', el, `"${text.slice(0, 40)}"`);
    const upper = s.textTransform === 'uppercase' || (text === text.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(text));
    if (upper && px(s.fontSize) <= 14 && px(s.letterSpacing) >= 0.04 * px(s.fontSize) && text.length <= 40) {
      const next = el.nextElementSibling;
      if (next && next.matches('h1,h2,h3,h4,h5,h6')) add('eyebrow', el, `"${text}" above a heading`);
    }
  }
  for (const el of elements) {
    const s = css(el), r = rect(el);
    if ((isControl(el) || el.matches('nav a,nav li,[aria-current]')) && /gradient/.test(s.backgroundImage)) {
      const stops = [...s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => colorOf(m[0]));
      if (stops.some((c) => c && c.a > 0.2 && saturated(c))) add('gradient-control', el, s.backgroundImage.slice(0, 48));
    }
    if (s.backdropFilter && s.backdropFilter !== 'none' && !['fixed', 'sticky'].includes(s.position)) add('glass', el, s.backdropFilter);
    if (shadowLayers(s.boxShadow).some((l) => l.blur >= 12 && l.color.a >= 0.2 && saturated(l.color))) add('glow-shadow', el, s.boxShadow.slice(0, 60));
    const radius = px(s.borderTopLeftRadius);
    if (boxSet.has(el)) {
      radii.set(radius, (radii.get(radius) || 0) + 1);
      const look = `${radius}|${s.boxShadow}|${s.borderTopWidth}`;
      kit.set(look, (kit.get(look) || 0) + 1);
    }
    if (px(s.borderLeftWidth) >= 2 && radius > 0 && px(s.borderRightWidth) === 0 && s.borderLeftStyle !== 'none') add('accent-bar', el, `left border ${s.borderLeftWidth}, radius ${radius}px`);
    if (r.width >= 28 && r.width <= 72 && Math.abs(r.width - r.height) <= 2 && radius > 0 && isBox(el) && !el.matches('img,button,a')) {
      const only = el.children.length === 1 ? el.children[0] : null;
      const emojiOnly = !el.children.length && EMOJI.test(el.textContent);
      if ((only && only.matches('svg,i,span')) || emojiOnly) {
        const size = Math.round(r.width);
        if (!tiles.has(size)) tiles.set(size, []);
        tiles.get(size).push([el, `${size}x${Math.round(r.height)}px, radius ${radius}px`]);
      }
    }
  }
  for (const group of tiles.values()) {
    if (group.length >= 3) for (const [el, detail] of group) add('icon-tile', el, detail);
  }
  // Isolated markers are not a reflex: it takes at least a pair
  for (const rule of ['eyebrow', 'numbered-markers']) {
    if ((found.get(rule) || []).length < 2) found.delete(rule);
  }
  for (const box of boxes) {
    let depth = 0;
    for (let cur = box.parentElement; cur; cur = cur.parentElement) if (boxSet.has(cur) && inFlow(cur)) depth++;
    if (depth >= 2 && inFlow(box) && box.textContent.trim()) add('nested-cards', box, `${depth + 1} levels of boxes`);
    const outer = (() => {
      for (let cur = box.parentElement; cur; cur = cur.parentElement) if (boxSet.has(cur)) return cur;
      return null;
    })();
    if (outer) {
      const inner = px(css(box).borderTopLeftRadius), o = px(css(outer).borderTopLeftRadius);
      if (o > 0 && inner > o && inner < 100) add('nested-radius', box, `${inner}px inside a ${o}px parent`);
    }
  }
  const dominant = [...kit.values()].sort((a, b) => b - a)[0] || 0;
  if (boxes.length >= 6 && dominant / boxes.length >= 0.8) add('card-kit', null, `${dominant} of ${boxes.length} boxes share the same radius, shadow and border`);

  // --- Report -----------------------------------------------------------------
  const order = { high: 0, med: 1, low: 2 };
  const findings = [...found].map(([rule, hits]) => ({
    rule,
    severity: RULES[rule][0],
    fix: RULES[rule][1],
    count: hits.length,
    examples: hits.slice(0, MAX_EXAMPLES),
  })).sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
  const counts = { high: 0, med: 0, low: 0 };
  for (const f of findings) counts[f.severity] += f.count;

  const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    url: location.href,
    title: document.title,
    viewport: { width: W, height: H },
    scanned: elements.length,
    textLength: (document.body.innerText || '').trim().length,
    truncated: usable.size >= MAX_ELEMENTS,
    counts,
    findings,
    stats: {
      spacing: { distinct: spacing.size, offScaleShare: total ? round(offCount / total * 100) : 0, top: top(spacing, 10) },
      fontSizes: top(fontSizes, 10),
      fontFamilies: top(fontFamilies, 5),
      radii: top(radii, 6),
    },
  };
})();
