// Loading, measured the way a visitor on a mid-range phone meets it: CPU slowed four times and a slow 4G
// connection (the profile Lighthouse uses for phones), cold cache. One page load per address:
//   largest contentful paint, cumulative layout shift, total blocking time (long tasks beyond 50 ms),
//   weight of everything transferred and of scripts alone, number of requests, hosts contacted.
// This is a lab measure on one load: it compares versions and catches heavy pages; field data from real
// visitors (Core Web Vitals at the 75th percentile) can differ. Thresholds: web.dev "good" lines for LCP and
// CLS; blocking time and weights are house budgets.
import { loadBrowserTools, launch } from "./browser.mjs";

export const BUDGETS = { lcp_ms: 2500, lcp_poor_ms: 4000, cls: 0.1, tbt_ms: 300, tbt_poor_ms: 600, js_kb: 300, js_poor_kb: 700, total_kb: 1600, requests: 80 };

const PROBE = `(() => {
  window.__qpPerf = { lcp: 0, cls: 0, tbt: 0, long: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__qpPerf.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__qpPerf.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__qpPerf.long++; window.__qpPerf.tbt += Math.max(0, e.duration - 50); } }).observe({ type: "longtask", buffered: true });
  } catch {}
})();`;

export function scorePerf(m) {
  const checks = {};
  const add = (id, level, ok, value, rule) => { checks[id] = { level, ok, value, rule }; };
  const kb = (b) => Math.round(b / 1024);
  if (m.lcp_ms != null) {
    add("largest_paint", "should", m.lcp_ms <= BUDGETS.lcp_ms, `${(m.lcp_ms / 1000).toFixed(1)} s`, `the largest element of the first screen is painted within ${BUDGETS.lcp_ms / 1000} s on a throttled phone`);
    add("largest_paint_poor", "must", m.lcp_ms <= BUDGETS.lcp_poor_ms, `${(m.lcp_ms / 1000).toFixed(1)} s`, `never more than ${BUDGETS.lcp_poor_ms / 1000} s: beyond that, visitors see an unfinished page`);
  }
  add("layout_shift", "must", m.cls <= BUDGETS.cls, m.cls.toFixed(3), `the page does not jump while loading (cumulative layout shift of ${BUDGETS.cls} or less)`);
  add("blocking_time", "should", m.tbt_ms <= BUDGETS.tbt_ms, `${Math.round(m.tbt_ms)} ms in ${m.long_tasks} long task(s)`, `scripts block the page for less than ${BUDGETS.tbt_ms} ms in total while loading`);
  add("blocking_time_poor", "must", m.tbt_ms <= BUDGETS.tbt_poor_ms, `${Math.round(m.tbt_ms)} ms`, `never more than ${BUDGETS.tbt_poor_ms} ms: the page looks ready and does not answer`);
  add("script_weight", "should", kb(m.js_bytes) <= BUDGETS.js_kb, `${kb(m.js_bytes)} kB of scripts transferred`, `at most ${BUDGETS.js_kb} kB of scripts on first load`);
  add("script_weight_poor", "must", kb(m.js_bytes) <= BUDGETS.js_poor_kb, `${kb(m.js_bytes)} kB`, `never more than ${BUDGETS.js_poor_kb} kB of scripts on first load`);
  add("page_weight", "should", kb(m.total_bytes) <= BUDGETS.total_kb, `${kb(m.total_bytes)} kB transferred`, `at most ${BUDGETS.total_kb} kB on first load`);
  add("requests", "should", m.requests <= BUDGETS.requests, `${m.requests} requests to ${m.hosts} host(s)`, `at most ${BUDGETS.requests} requests on first load`);
  if (m.largest_image_kb != null) add("image_weight", "should", m.largest_image_kb <= 400, `largest image ${m.largest_image_kb} kB`, "no single image above 400 kB on first load (right size, modern format)");
  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  // A "should" whose "poor" line is also crossed is reported once, as the must.
  const should = Object.entries(checks).filter(([k, c]) => c.level === "should" && !c.ok && !must.includes(`${k}_poor`)).map(([k]) => k);
  return { summary: { must_failed: must, should_failed: should }, checks };
}

export async function perfAt(urls, { cwd, throttle = true } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (pack cache, not the project)." };
  const browser = await launch(tools.chromium);
  const pages = [];
  try {
    for (const url of urls) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await ctx.addInitScript(PROBE);
      const page = await ctx.newPage();
      const m = { requests: 0, total_bytes: 0, js_bytes: 0, css_bytes: 0, image_bytes: 0, font_bytes: 0, largest_image_kb: null };
      const hosts = new Set();
      try {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Network.enable");
        if (throttle && /^https?:/.test(url)) {
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
        }
        const types = new Map();
        cdp.on("Network.responseReceived", (e) => { types.set(e.requestId, e.type); try { hosts.add(new URL(e.response.url).host); } catch { /* data: */ } });
        cdp.on("Network.loadingFinished", (e) => {
          const size = e.encodedDataLength || 0, t = types.get(e.requestId);
          m.requests++; m.total_bytes += size;
          if (t === "Script") m.js_bytes += size; else if (t === "Stylesheet") m.css_bytes += size; else if (t === "Font") m.font_bytes += size;
          else if (t === "Image") { m.image_bytes += size; m.largest_image_kb = Math.max(m.largest_image_kb || 0, Math.round(size / 1024)); }
        });
        const started = Date.now();
        await page.goto(url, { waitUntil: "load", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const p = await page.evaluate(() => ({ ...window.__qpPerf, dom: performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? null, load: performance.getEntriesByType("navigation")[0]?.loadEventEnd ?? null }));
        Object.assign(m, { lcp_ms: p.lcp ? Math.round(p.lcp) : null, cls: Math.round((p.cls || 0) * 1000) / 1000, tbt_ms: Math.round(p.tbt || 0), long_tasks: p.long || 0,
          dom_ready_ms: p.dom ? Math.round(p.dom) : null, load_ms: p.load ? Math.round(p.load) : null, wall_ms: Date.now() - started, hosts: hosts.size });
        pages.push({ url, ...scorePerf(m), measures: m });
      } catch (e) { pages.push({ url, error: String(e.message).split("\n")[0].slice(0, 200) }); }
      await ctx.close();
    }
  } finally { await browser.close(); }
  return { available: true, profile: throttle ? "phone 390 × 844, CPU slowed 4 times, slow 4G (150 ms latency, 1.6 Mbit/s), cold cache" : "phone 390 × 844, no throttling", budgets: BUDGETS, pages,
    note: "One lab load per page. Use it to compare versions and catch heavy pages; real visitors' data (Core Web Vitals) can differ." };
}
