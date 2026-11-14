# SPA without a framework (Vite + React), shared between the web and Tauri

For a product whose interface is one React app built with Vite, served as a web app and shipped in a Tauri window, often with one server API behind both (a desktop app synchronised with a SaaS). There is no separate Shipwright module for Vite + React: this page and the core build skills cover it; `stacks` in `.quality/project.json` lists `tauri` (and `node-api` for the server). Checked on 2026-11-14 against the Tauri v2 guide "Vite" and the Vite documentation.

## 1. One interface, one platform module

```
src/
  app/            screens and components, the same for both
  platform/
    index.ts      export const getPlatform = () => (isTauri() ? import("./tauri") : import("./web"));
    web.ts        files through <input type=file> and downloads, storage in the browser, links in a new tab
    tauri.ts      the only file that imports @tauri-apps/* (dialogs, fs, keychain, updater, window)
```

- `isTauri()` comes from `@tauri-apps/api/core`. Screens call `(await getPlatform()).openFile()`, never `@tauri-apps/*` directly: the web build stays free of Tauri code and does not break in a browser.
- What exists only on one side (system menus, tray, auto-update; or a public sign-up page) is a feature of that module or a route that only one build mounts, not an `if` scattered through the screens.
- Write the differences down in `DESIGN.md` or the spec: the key tasks are the same on both, and the audit plays both.

## 2. Vite settings for Tauri

From the Tauri v2 Vite guide: in `tauri.conf.json` › `build`, `devUrl` `http://localhost:5173`, `frontendDist` `../dist`, and `beforeDevCommand` / `beforeBuildCommand` running the Vite scripts. In `vite.config`: `clearScreen: false`, `server.port: 5173` with `strictPort: true`, `server.watch.ignored: ["**/src-tauri/**"]`, `envPrefix: ["VITE_", "TAURI_ENV_*"]`, and a build target that matches the WebView (`chrome105` on Windows, `safari13` on macOS and Linux). `TAURI_ENV_PLATFORM` tells, at build time, which system the build is for.

- `VITE_*` variables end up in the shipped JavaScript: never a secret there, on either side.
- Two builds from one source: `vite build` for the web (a `web` mode if needed), `tauri build` for the app. CI runs both.

## 3. The server API seen from both

- The window's origin is not the web site's: `http://tauri.localhost` on Windows, `tauri://localhost` on macOS and Linux. The API's CORS list names them explicitly, next to the web origin; never a wildcard with credentials.
- Cookies set by the API are third-party from the window's origin, and WebViews treat them differently. For the desktop app prefer a token obtained by a sign-in flow, kept in the system keychain on the Rust side and sent as a header; keep cookie sessions for the web.
- The Tauri content security policy (`connect-src`) lists the API host, and nothing broader.
- The access test (`sw access`) covers the API once; both clients go through it.

## 4. Routing and public pages

- Client routing (React Router or similar). On the web host, unknown paths serve `index.html` and the app shows its own 404 screen; check that a reload on a deep address works in the built app, not only in development.
- A Vite SPA renders nothing without JavaScript. If the product has public pages that must be found (`public_web`, `seo-launch` skill), prerender them or serve them from a small static site; the app itself can stay a SPA.

## 5. Check both

1. Typecheck, lint and tests once for the shared code (`{pm} exec tsc --noEmit`, `{pm} run lint`, `{pm} test`), plus the Rust checks of this module.
2. Web: `sw flows` on the web address, `sw deslop` and `sw craft` on its screens.
3. Window: start the app with its debugging port (rules above), then `sw flows --attach 9222` and `sw deslop --attach 9222`. The WebView is not the browser: a layout that holds in Chrome can break in WebKit on macOS.
4. Search the web build for Tauri code: `rg "@tauri-apps" dist/` returns nothing outside the chunk loaded by `platform/tauri.ts`.

Sources: [Tauri v2, Vite](https://v2.tauri.app/start/frontend/vite/), [Tauri v2, Content Security Policy](https://v2.tauri.app/security/csp/), [Vite, env variables and modes](https://vite.dev/guide/env-and-mode). See SOURCES.md, batch 6.
