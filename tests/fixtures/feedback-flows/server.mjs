// A tiny app for the flows tests: a public page with a demo, a sign-up that refuses an address used twice, a
// sign-in that counts how many times it is used, quotes that are used up when accepted, and a theme read from
// localStorage. The page changes colours with prefers-color-scheme: dark.
import { createServer } from "node:http";

const css = `<style>body{background:#fff;color:#111;font:16px system-ui;margin:24px}button{font:inherit;padding:10px 16px}
@media (prefers-color-scheme: dark){body{background:#111;color:#eee}}</style>`;
const page = (title, body, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title>${css}</head><body><main><h1>${title}</h1>${body}</main>${script ? `<script>${script}</script>` : ""}</body></html>`;

export function startApp() {
  const state = { users: new Set(), logins: 0, quotes: 0, sessions: new Set() };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const body = req.method === "POST" ? await new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); }) : "";
    const json = (code, o) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    const html = (h) => { res.writeHead(200, { "content-type": "text/html" }); res.end(h); };
    const sid = /sid=(\w+)/.exec(req.headers.cookie || "")?.[1];
    if (url.pathname === "/api/seed") { state.quotes = Number(url.searchParams.get("n") || 1); return json(200, { quotes: state.quotes }); }
    if (url.pathname === "/api/stats") return json(200, { logins: state.logins, users: state.users.size, quotes: state.quotes });
    if (url.pathname === "/api/signup") {
      const { email } = JSON.parse(body || "{}");
      if (state.users.has(email)) return json(409, { error: "This address is already used" });
      state.users.add(email);
      return json(200, { ok: true });
    }
    if (url.pathname === "/api/login") {
      state.logins++;
      const id = Math.random().toString(36).slice(2);
      state.sessions.add(id);
      res.writeHead(200, { "content-type": "application/json", "set-cookie": `sid=${id}; Path=/; HttpOnly` });
      return res.end("{}");
    }
    if (url.pathname === "/api/accept") { if (state.quotes > 0) state.quotes--; return json(200, { quotes: state.quotes }); }
    if (url.pathname === "/") return html(page("Invoices made simple", `<p>Try it without an account.</p><button onclick="document.getElementById('out').hidden=false">Try the demo</button>
<p id="out" hidden>Demo works: invoice <span>undefined</span> F-0004</p>`));
    if (url.pathname === "/signup") return html(page("Create your account", `<label>Email <input id="email" type="email"></label> <button id="go">Sign up</button><p id="msg" role="status"></p>`,
      `go.onclick=async()=>{const r=await fetch('/api/signup',{method:'POST',body:JSON.stringify({email:email.value})});msg.textContent=r.ok?'Welcome '+email.value:(await r.json()).error;}`));
    if (url.pathname === "/login") return html(page("Sign in", `<label>Email <input id="email" type="email"></label> <button id="go">Sign in</button>`,
      `go.onclick=async()=>{await fetch('/api/login',{method:'POST'});location.href='/app';}`));
    if (url.pathname === "/app") {
      if (!sid || !state.sessions.has(sid)) { res.writeHead(302, { location: "/login" }); return res.end(); }
      const items = Array.from({ length: state.quotes }, (_, i) => `<li>Quote Q-${i + 1} <button onclick="fetch('/api/accept',{method:'POST'}).then(()=>{this.parentNode.remove();if(!document.querySelector('li'))empty.hidden=false;done.hidden=false})">Accept</button></li>`).join("");
      return html(page("Your quotes", `<p id="theme"></p><ul>${items}</ul><p id="empty" ${state.quotes ? "hidden" : ""}>Nothing to accept</p><p id="done" hidden>Accepted</p>`,
        `document.getElementById('theme').textContent='Theme: '+(localStorage.getItem('theme')||'default');`));
    }
    res.writeHead(404); res.end("not found");
  }).listen(0);
  return { server, state, url: () => `http://localhost:${server.address().port}` };
}
