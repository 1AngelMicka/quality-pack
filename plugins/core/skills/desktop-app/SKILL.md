---
name: desktop-app
description: "Builds and releases a desktop app made with web technology (Tauri, Electron) that behaves like a real desktop app and does not expose the user's machine: window sizes and state, system menus and shortcuts, files and drag and drop, offline use, no lost work, long operations without freezing; isolation between the page and the system (Tauri capabilities and content security policy, Electron context isolation, sandbox and preload), validated commands, signing and notarisation, signed auto-update, installers. Plays the key tasks in the app's real window. Use when a desktop app is planned, built, changed, tested or released, and when Tauri, Electron, installer, code signing, notarisation, auto-update, WebView or system tray come up. FR : application de bureau, Tauri, Electron, fenêtre, menus, raccourcis clavier, fichiers, hors-ligne, signature de code, notarisation, mise à jour automatique, installeur."
---

# Desktop app

A desktop app built with web technology has two ways to disappoint. It can feel like a website in a window: no shortcuts, a frozen window during a long task, work lost on close. And it can be dangerous: the page sits one function call away from the user's files and shell, so a single injected script or a careless command becomes control of the machine.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below. Flag `desktop_app`, profile `desktop`; criteria DUX (experience) and DRL (release and security). Stack modules: `qp-tauri`, `qp-electron`.

Say at the start what you can and cannot test: builds and installers are specific to each system. On Windows you can build and run the Windows app; macOS signing, notarisation and behaviour need a Mac.

## 1. Decide before coding

Ask the user and write the answers in `.quality/project.json`:

- **Why a desktop app** rather than a web app: local files, heavy processing, offline, system integration. If none applies, a web app (installable as a PWA) is cheaper to build and to update.
- **Tauri or Electron.** Tauri: small installers, a Rust core, the system's own WebView (so rendering differs between Windows, macOS and Linux and must be checked on each). Electron: the same Chromium everywhere, a Node main process, larger installers. Keep what the project already uses.
- **Target systems**, and which of them the team can really build and test on.
- **Distribution**: direct download, a store (Microsoft Store, Mac App Store: extra rules and sandboxing), or internal use. Signing certificates cost money and take time to obtain: say so early.
- **Where data lives**: local only, or synced with a server (then the `saas-foundations` and `security-testing` skills apply to the server).

## 2. Behave like a desktop app

- **Window.** Set a minimum size. Lay the interface out for the minimum size, a laptop and a large screen; remember size and position between launches, and survive an unplugged second display. Follow display scaling (125 %, 150 %, 200 %) and the system's light or dark theme.
- **Menus and shortcuts.** Save, undo, redo, copy, paste, find, close, quit and preferences answer the system's shortcuts: Cmd on macOS, Ctrl elsewhere. macOS expects an application menu. Every menu action also exists in the interface, and shortcuts are shown next to their action.
- **No lost work.** Save as the user works, or warn before closing a window with changes. After a crash or a forced quit, the work is recovered or offered back. Undo covers more than one step.
- **Files.** Use the system's open and save dialogs. Accept files dropped on the window. Handle long paths, accented names, other drives, and files that vanished or are locked, with a message that says which file and what to do. Write only where the user chose and in the app's own data folder.
- **Long operations.** Never on the thread that draws the window: Rust async tasks in Tauri, a utility process or worker in Electron. Show progress, allow cancel, and keep the rest of the interface usable.
- **Offline.** The app starts and works on local data without network. What needs the network says so and does not block the rest.
- **Start-up.** A usable window in under two seconds on a cold start; show the window, then load.

Screen organisation, finish and states follow the same skills as on the web: `design-screens`, `premium-craft`, `deslop-ui`.

## 3. Keep the page away from the system

The rule for both frameworks: the page reaches the system only through a short list of named functions, and each of them distrusts what the page sends.

**Tauri**
- Set a content security policy in `tauri.conf.json`, without `'unsafe-eval'` or a wildcard source.
- Give each window only the permissions it needs, in `src-tauri/capabilities/`, narrowed by scopes: which folders, which commands, which hosts. Never `fs`, `shell` or `http` whole.
- No remote page receives the app's permissions.
- Each `#[tauri::command]` is an entry point: resolve a path, then check it is inside an allowed folder (reject `..`); bound sizes; never build a shell command from an argument.

**Electron**
- Every window: `contextIsolation: true`, `nodeIntegration: false`, sandbox left on, `webSecurity` left on.
- A preload script exposes named functions with `contextBridge`. Never expose `ipcRenderer` itself.
- Each `ipcMain` handler checks who is calling (the sender's frame) and validates its arguments.
- Windows load local files or https. Filter navigation and new windows (`will-navigate`, `setWindowOpenHandler`); `shell.openExternal` only opens https addresses the app checked.
- Set a content security policy. Do not use the `remote` module. Stay on one of the three latest major versions.

**Both**
- Secrets in the system keychain (Tauri: a keyring plugin; Electron: `safeStorage`), never in a plain configuration file, never in the shipped package.
- User data in the folder the system provides for it.

## 4. Check

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" desktop check
```

Reads the project: content security policy, capabilities or API list, remote access, the Electron window options above, the updater (signature key, https), the app identifier, signing configuration. It exits with code 2 on a failed "must". It cannot see what a command does with its arguments: read each one (DRL-03).

**Key tasks in the real window.** A browser tab is not the app: the WebView differs, and the system functions are missing. Start the app with its debugging port open, then play the flows of `.quality/project.json` in its window:

```bash
# Tauri on Windows (WebView2)
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 npm run tauri dev
# Electron
npx electron . --remote-debugging-port=9222

node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" flows --attach 9222
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" deslop --attach 9222
```

The flows run once, in the window as it is, on the app's real data: use a test profile, and ask the user first if the app is connected to real data. On macOS and Linux, Tauri's WebView does not offer this port: play the flows in a browser against the dev server with the Tauri stub (`qp deslop --tauri`), and check the real window by hand. Say which was done.

Then by hand, on each target system: the window at its minimum size and full screen; close with unsaved changes; kill the process mid-task and relaunch; unplug the network; open a file with an accented name; run the heaviest operation and try to cancel.

## 5. Release

- **Signing.** Windows installers signed with a code-signing certificate, or SmartScreen warns every user. macOS builds signed with a Developer ID and notarised, or Gatekeeper refuses them. Do it in CI; no certificate or key in the repository.
- **Updates.** Signed, served over https, verified before install. Test the whole path: install the previous version, publish a test release, watch it download, verify and install. The app shows its version and what changed.
- **Clean machine.** Install the released build on a machine that never had the project: it installs without a blocking warning, starts, and uninstalls cleanly. State whether uninstalling keeps the user's data.
- **Size and start-up** of the released build, not of the development build.

## Report

```
Framework: <Tauri | Electron>   Systems built and tested: <…>   Not tested: <…>
Project check: must <n>, should <n>   (kept on purpose: <…>)
Commands exposed to the page: <n> read, <n> validating their arguments
Key tasks: <n> of <n> in the real window (port <n>) | in a browser with the stub
By hand: minimum size <ok|issue> · close with changes <…> · crash recovery <…> · offline <…> · files <…> · long operation <…>
Release: signing <Windows …, macOS …> · update tested end to end <yes|no> · clean-machine install <yes|no>
```
