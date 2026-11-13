// Desktop apps built with web technology (Tauri, Electron): what can be read in the project before a release.
// A desktop app is a web page with the user's files and system within reach, so the settings that keep page
// code away from the system matter more than on a site: Tauri's capabilities and content security policy,
// Electron's context isolation and sandbox. Also read here: signing, the updater, the app's identity.
// What this cannot see: the signed installers themselves, and how the app behaves in its window (play the
// key tasks in the real window with `sw flows --attach <port>`).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
const json = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };

function walk(dir, test, out = [], depth = 0) {
  if (depth > 6 || out.length > 400) return out;
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!/^(node_modules|\.git|target|dist|build|out|\.next|release)$/.test(e.name)) walk(join(dir, e.name), test, out, depth + 1); }
    else if (test(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

export function desktopChecks(root) {
  const rel = (p) => relative(root, p).split("\\").join("/");
  const checks = {};
  const add = (id, level, ok, value, rule, where) => { checks[id] = { level, ok, value, rule, ...(where ? { where } : {}) }; };
  const pkg = json(join(root, "package.json")) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const tauriDir = ["src-tauri", "apps/desktop/src-tauri"].map((d) => join(root, d)).find(existsSync);
  const isElectron = "electron" in deps;
  const kind = tauriDir ? "tauri" : isElectron ? "electron" : "unknown";

  if (tauriDir) {
    const confFile = ["tauri.conf.json", "tauri.conf.json5", "Tauri.toml"].map((f) => join(tauriDir, f)).find(existsSync);
    const conf = confFile?.endsWith(".json") ? json(confFile) : null;
    const where = confFile ? rel(confFile) : rel(tauriDir);
    if (conf) {
      const v2 = !!conf.app || String(conf.$schema || "").includes("/2") || existsSync(join(tauriDir, "capabilities"));
      const security = (v2 ? conf.app?.security : conf.tauri?.security) || {};
      const csp = security.csp;
      const cspText = typeof csp === "string" ? csp : csp ? JSON.stringify(csp) : "";
      add("tauri_csp", "must", !!csp && !/'unsafe-eval'/.test(cspText) && !/default-src[^;]*\*/.test(cspText), !csp ? "no content security policy (csp is null or missing)" : /'unsafe-eval'/.test(cspText) ? "the policy allows 'unsafe-eval'" : /default-src[^;]*\*/.test(cspText) ? "default-src allows any origin" : "a content security policy is set",
        "the app sets a content security policy without 'unsafe-eval' or a wildcard source: page code is one step away from the system", where);
      if (v2) {
        const capDir = join(tauriDir, "capabilities");
        const caps = existsSync(capDir) ? readdirSync(capDir).filter((f) => f.endsWith(".json")).map((f) => ({ f, c: json(join(capDir, f)) })).filter((x) => x.c) : [];
        const perms = caps.flatMap((x) => (x.c.permissions || []).map((p) => (typeof p === "string" ? p : p.identifier)).filter(Boolean));
        const wide = perms.filter((p) => /^(fs|shell|http|process):default$|:allow-(execute|spawn|open)$|^shell:allow|fs:allow-(write|remove|rename)[^-]*$|fs:scope-\$?home|^fs:allow-.*-recursive$/.test(p));
        const scoped = caps.some((x) => JSON.stringify(x.c).includes('"allow"'));
        add("tauri_capabilities", "must", caps.length > 0, caps.length ? `${caps.length} capability file(s), ${perms.length} permissions` : "no capability file", "each window gets only the permissions it needs, listed in src-tauri/capabilities", caps.length ? rel(capDir) : where);
        if (caps.length) add("tauri_wide_permissions", "should", wide.length === 0 || scoped, wide.length ? `${wide.length} broad permission(s): ${[...new Set(wide)].slice(0, 5).join(", ")}${scoped ? " (scopes are declared)" : ""}` : "no broad file, shell or network permission",
          "file, shell and network permissions are narrowed to the folders, commands and hosts the app really uses (scopes), never granted whole", rel(capDir));
        const remote = caps.filter((x) => x.c.remote?.urls?.length).map((x) => x.f);
        if (remote.length) add("tauri_remote_access", "must", false, `remote pages are given app permissions in ${remote.join(", ")}`, "pages loaded from the network never receive the app's permissions", rel(capDir));
      } else {
        const allow = conf.tauri?.allowlist || {};
        add("tauri_allowlist", "must", allow.all !== true, allow.all === true ? "allowlist.all is true: every system API is open to the page" : "the allowlist is not wide open", "only the system APIs the app uses are enabled", where);
        if (conf.tauri?.security?.dangerousRemoteDomainIpcAccess?.length) add("tauri_remote_access", "must", false, "dangerousRemoteDomainIpcAccess is set", "pages loaded from the network never receive the app's permissions", where);
      }
      const bundle = v2 ? conf.bundle : conf.tauri?.bundle;
      const id = v2 ? conf.identifier : bundle?.identifier;
      add("app_identifier", "must", !!id && !/^com\.tauri\.dev$|^com\.example\./.test(id), id || "no identifier", "the app has its own identifier (reverse domain), not the template's", where);
      const updater = v2 ? conf.plugins?.updater : conf.tauri?.updater;
      const usesUpdater = !!updater && updater.active !== false;
      if (usesUpdater) {
        add("updater_signed", "must", !!updater.pubkey, updater.pubkey ? "the updater checks a signature (pubkey set)" : "the updater has no public key", "updates are signed and the app verifies the signature before installing", where);
        const eps = updater.endpoints || [];
        add("updater_https", "must", eps.length > 0 && eps.every((u) => /^https:\/\//.test(u)), eps.length ? eps.join(", ").slice(0, 160) : "no update endpoint", "updates are fetched over https only", where);
      } else add("updater_present", "should", false, "no updater configured", "the app can update itself (or the release notes say how users get fixes): a desktop app with no update path keeps its bugs forever", where);
      const win = bundle?.windows || {};
      const mac = bundle?.macOS || {};
      add("signing_windows", "should", !!(win.certificateThumbprint || win.signCommand || process.env.TAURI_SIGNING_PRIVATE_KEY), win.certificateThumbprint || win.signCommand ? "a Windows signing certificate or command is configured" : "no Windows code signing in the config (it may be set in CI)",
        "Windows installers are signed, or SmartScreen warns every user", where);
      add("signing_macos", "should", !!(mac.signingIdentity || mac.providerShortName), mac.signingIdentity ? "a macOS signing identity is configured" : "no macOS signing identity in the config (it may be set in CI)", "macOS builds are signed and notarised, or Gatekeeper refuses to open them", where);
      const devtools = /devtools\s*=\s*true|features\s*=\s*\[[^\]]*"devtools"/.test(read(join(tauriDir, "Cargo.toml")) || "");
      if (devtools) add("devtools_in_release", "should", false, "the devtools feature is enabled in Cargo.toml", "developer tools are not shipped in release builds", rel(join(tauriDir, "Cargo.toml")));
    } else add("tauri_config", "should", false, confFile ? `${rel(confFile)} could not be read as JSON` : "no tauri.conf.json found", "the Tauri configuration is readable", where);
    // Commands exposed to the page: each one is an entry point.
    const rs = walk(join(tauriDir, "src"), (n) => n.endsWith(".rs"));
    const commands = rs.reduce((t, f) => t + ((read(f) || "").match(/#\[tauri::command/g) || []).length, 0);
    if (commands) add("commands_listed", "should", true, `${commands} command(s) exposed to the page`, "every command the page can call validates its arguments like a server route (paths, sizes, ids)");
  }

  if (isElectron) {
    const files = walk(root, (n) => /\.(c|m)?[jt]s$/.test(n)).filter((f) => !/\.(test|spec)\./.test(f));
    const hits = { nodeIntegration: [], contextIsolation: [], sandbox: [], webSecurity: [], insecure: [], remote: [], http: [], shell: [] };
    let windows = 0, preload = 0, cspSeen = false;
    for (const f of files) {
      const s = read(f) || "";
      if (!/electron/.test(s) && !/BrowserWindow|webPreferences/.test(s)) continue;
      windows += (s.match(/new BrowserWindow\s*\(/g) || []).length;
      if (/preload\s*:/.test(s)) preload++;
      if (/nodeIntegration\s*:\s*true/.test(s)) hits.nodeIntegration.push(rel(f));
      if (/contextIsolation\s*:\s*false/.test(s)) hits.contextIsolation.push(rel(f));
      if (/sandbox\s*:\s*false/.test(s)) hits.sandbox.push(rel(f));
      if (/webSecurity\s*:\s*false/.test(s)) hits.webSecurity.push(rel(f));
      if (/allowRunningInsecureContent\s*:\s*true/.test(s)) hits.insecure.push(rel(f));
      if (/enableRemoteModule\s*:\s*true|@electron\/remote/.test(s)) hits.remote.push(rel(f));
      if (/loadURL\(\s*["'`]http:\/\/(?!localhost|127\.0\.0\.1)/.test(s)) hits.http.push(rel(f));
      if (/shell\.openExternal\(\s*[a-zA-Z_$][\w$.]*\s*\)/.test(s) && !/new URL\(|startsWith\(["'`]https/.test(s)) hits.shell.push(rel(f));
      if (/Content-Security-Policy/i.test(s)) cspSeen = true;
    }
    const html = walk(root, (n) => n.endsWith(".html")).some((f) => /http-equiv=["']Content-Security-Policy/i.test(read(f) || ""));
    const flag = (id, list, value, rule) => add(id, "must", list.length === 0, list.length ? value : "not found", rule, list.slice(0, 4).join(", "));
    flag("electron_node_integration", hits.nodeIntegration, "nodeIntegration: true", "pages never get Node.js (nodeIntegration stays false): one script injection would own the machine");
    flag("electron_context_isolation", hits.contextIsolation, "contextIsolation: false", "context isolation stays on; the page talks to the system only through a preload script with a short, named API");
    flag("electron_web_security", [...hits.webSecurity, ...hits.insecure], "webSecurity: false or insecure content allowed", "web security stays on and no insecure content is allowed");
    flag("electron_remote_content", hits.http, "a window loads an http:// address", "windows load local files or https, never plain http");
    add("electron_sandbox", "should", hits.sandbox.length === 0, hits.sandbox.length ? "sandbox: false" : "the sandbox is not switched off", "renderers stay sandboxed", hits.sandbox.slice(0, 4).join(", "));
    add("electron_remote_module", "should", hits.remote.length === 0, hits.remote.length ? "the remote module is used" : "not used", "the remote module is not used (it hands the main process to the page)", hits.remote.slice(0, 4).join(", "));
    add("electron_open_external", "should", hits.shell.length === 0, hits.shell.length ? "shell.openExternal is called with an unchecked value" : "no unchecked call found", "shell.openExternal only opens https addresses the app built or checked", hits.shell.slice(0, 4).join(", "));
    if (windows) add("electron_preload", "should", preload > 0, preload ? "a preload script is used" : `${windows} window(s) and no preload script`, "system access goes through a preload script (contextBridge) exposing only named functions");
    add("electron_csp", "must", cspSeen || html, cspSeen || html ? "a content security policy is set" : "no content security policy found", "the app sets a content security policy (header in the main process or meta tag)");
    const build = pkg.build || json(join(root, "electron-builder.json")) || null;
    const forge = existsSync(join(root, "forge.config.js")) || existsSync(join(root, "forge.config.ts")) || !!pkg.config?.forge;
    const id = build?.appId;
    if (build) add("app_identifier", "must", !!id && !/^com\.electron\.|^com\.example\./.test(id), id || "no appId", "the app has its own identifier (reverse domain), not the template's");
    const updater = "electron-updater" in deps || "update-electron-app" in deps;
    add("updater_present", "should", updater, updater ? "an updater library is installed" : "no updater library", "the app can update itself (or the release notes say how users get fixes)");
    const signed = !!(build?.win?.certificateFile || build?.win?.certificateSubjectName || build?.win?.signtoolOptions || build?.win?.azureSignOptions || build?.mac?.identity || build?.mac?.notarize || build?.afterSign || forge);
    add("signing", "should", signed, signed ? "signing or notarisation is configured (or handled by Forge: check its config)" : "no signing or notarisation in the build config (it may be set in CI)", "installers are signed (Windows) and notarised (macOS)");
    const v = parseInt(String(deps.electron || "").replace(/[^\d.]/g, ""), 10);
    if (v) add("electron_version", "should", true, `Electron ${v}`, "Electron stays on a supported major version (the three latest): older ones stop receiving Chromium security fixes");
  }
  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  const should = Object.entries(checks).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
  return { kind, summary: { checks: Object.keys(checks).length, must_failed: must, should_failed: should }, checks,
    not_covered: ["the signed installers themselves and whether the system accepts them (SmartScreen, Gatekeeper)", "behaviour in the real window: key tasks, window size and state, menus, shortcuts, files (play them with sw flows --attach)", "what each exposed command does with its arguments",
      "licences of bundled binaries"], note: kind === "unknown" ? "No Tauri folder (src-tauri) and no electron dependency found." : "Read from the project files." };
}
