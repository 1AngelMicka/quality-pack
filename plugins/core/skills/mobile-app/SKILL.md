---
name: mobile-app
description: "Builds and releases an installed mobile app (iOS, Android) next to a web app without the usual rejections: chooses the approach (PWA, Capacitor, Expo/React Native, Flutter), follows each platform's rules (touch targets, safe areas, keyboard, back, large text, dark theme), plays the key tasks on an emulator or device with Maestro, and checks what blocks a store release (target API level, privacy manifest, account deletion, payment rules, permissions, links into the app, secure storage). Use when a mobile app is planned, built, changed, tested or submitted, and when App Store, Google Play, App Review, in-app purchase, TestFlight, push notifications, deep links or offline come up. FR : application mobile, iOS, Android, App Store, Google Play, publication, achat intégré, suppression de compte, notifications, liens profonds, hors-ligne, émulateur, Maestro."
---

# Mobile app

An app that works in the simulator can still be refused by a store, or be useless with the keyboard open. This skill covers the decisions made before the code, the platform rules that can be measured, and the release blockers that can be read in the project.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs"`, written `qp` below. Flag `native_app` in `.quality/project.json`; criteria MUX (experience) and MRL (release and security). Stack modules: `qp-expo`, `qp-capacitor`.

One limit to state at the start: **iOS builds and simulators need macOS.** On Windows or Linux, Android can be built and played locally; iOS needs a Mac, a macOS CI runner or a cloud build. Say which platforms were really tested.

## 1. Decide before coding

Ask the user, then record the answers in `.quality/project.json` › `mobile`:

```json
"mobile": {
  "approach": "capacitor",
  "app_id": "com.example.app",
  "platforms": ["android", "ios"],
  "monetisation": "b2b-outside-app",
  "storefronts": ["FR", "EU", "US"],
  "account_deletion_url": "https://example.com/delete-account",
  "links_host": "https://app.example.com",
  "flows": []
}
```

**Approach.** Start from what exists and what the app must do that a site cannot:

| Approach | Choose it when | Cost |
| --- | --- | --- |
| PWA | The web app is enough, and store presence is not needed | No store listing; on iOS, install is manual and limited |
| Capacitor | A web app exists and must ship in the stores quickly | It must bring something native (notifications, offline, share, camera): a bare website wrapper is refused by Apple (4.2) |
| Expo / React Native | The app must feel native, and the team writes React | A second interface to build and keep |
| Flutter, Kotlin Multiplatform | A dedicated mobile team, no code shared with a TypeScript web app | Separate stack |

**Money.** The store rules depend on who buys and where; getting this wrong means a rejection or a rebuild:

| Sales model (`monetisation`) | iOS | Android |
| --- | --- | --- |
| `b2b-outside-app`: sold only to organisations, users log in with an existing account | No in-app purchase needed. Outside the United States, no price, sign-up purchase or purchase link in the app | Same logic |
| `consumer-in-app`: individuals can buy in the app | In-app purchase required; a plan bought on the web may be honoured only if it is also sold in the app | Play Billing required, except for users in the United States |
| `companion-no-purchase`: login only, purchase on the web | Allowed if the app shows no purchase path outside the United States | Allowed without steering to another payment |

Fees and the United States and European rules changed several times in 2025 and 2026: check the current store pages before promising a margin, and tell the user this is not legal advice. Details and dates: [references/stores.md](references/stores.md).

## 2. Build to the platform's rules

The measurable ones; the full list with sources is in [references/platforms.md](references/platforms.md).

- Touch targets: 44 × 44 pt on iOS; 48 × 48 dp with 8 dp between them on Android.
- Body text 17 pt on iOS by default, never under 11 pt; text scales to 200 % without clipping (use the platform's scalable units).
- Safe areas respected; edge-to-edge is mandatory on Android when targeting API 36, so handle the insets.
- With the keyboard open, the focused field and the main action stay visible.
- Back works as on the platform: edge swipe on iOS, system back on Android with predictive back; no screen exits with unsaved input without a warning.
- Tab bar for navigation only, never for actions, and without an overflow "More" tab; sheets close by swiping.
- No orientation lock on screens of 600 dp and more.
- Dark theme supported, contrast checked in both.
- Every element a key task touches has a stable identifier (`testID`, `accessibilityIdentifier`, `resource-id`) and an accessible name.
- Notifications: never ask on first launch. Ask after a user action, behind a screen that says why; a refusal blocks nothing; one setting per kind of notification.
- Offline: for each kind of data, write what can be read without network and what happens to a write (refused, queued, synced later with a conflict rule). No data lost when the app is closed offline and reopened online.
- Session tokens in the Keychain or Keystore; no secret in the shipped app; TLS only; verified https links for authentication.

## 3. Play the key tasks on a device

Declare 2 to 5 tasks in `mobile.flows`, with the same idea as web flows and a vocabulary for touch:

```json
"flows": [{
  "id": "send-invoice", "name": "Send an invoice to a client",
  "steps": [
    { "tap": "Log in" },
    { "type": { "into": { "id": "email" }, "text": "demo@test.local" } },
    { "type": { "into": { "id": "password" }, "text": "demo-password" } },
    { "tap": { "id": "submit" } },
    { "wait_for": { "visible": "Invoices", "timeout": 10000 } },
    { "tap": "New invoice" },
    { "scroll_to": "Send" },
    { "tap": "Send" },
    { "expect": "Invoice sent" },
    { "offline": true }, { "tap": "Invoices" }, { "expect": "INV-001" }, { "offline": false }
  ]
}]
```

Steps: `launch`, `tap`, `long_press`, `type`, `erase`, `expect`, `expect_gone`, `wait_for`, `screenshot`, `back`, `scroll_to`, `swipe`, `open_link`, `offline`, `dark`, `hide_keyboard`, `press`. A target is a visible text or `{ "id": "…" }`; prefer ids, they survive translation. The test account is a throwaway one; never the user's.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" mobile flows --check   # validates
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" mobile flows           # writes .maestro/qp/*.yaml and plays them
```

The command writes one Maestro flow per task and plays them on the emulator, simulator or device that is running, with a screenshot after each step that changes the screen. It needs [Maestro](https://github.com/mobile-dev-inc/Maestro) (Apache-2.0; free CLI on your own devices, Java 17 or later) and a running device with the app installed. If Maestro is missing, the files are still written: ask the user before installing it. Never use Maestro's paid cloud.

Then read the screenshots like the web ones (`design-review` skill), and add the passes a flow does not make by itself: keyboard open on each input screen, largest font size, dark theme (`{ "dark": true }`), a tablet, rotation.

## 4. Release blockers

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qp.mjs" mobile check
```

Reads the project, no device needed: Android target API level (Google Play requires 36), debuggable or cleartext builds, backups, exported components; iOS privacy manifest, App Transport Security, permission texts that say why; Capacitor WebView open to any site or loading a live URL; the two link files on the site; the public account-deletion page. With Expo managed builds there is no `android/` or `ios/` folder: run `npx expo prebuild` in a copy to check the generated projects.

What it cannot read, and must be checked by hand before submission (criteria MRL-02 to MRL-09):

- account deletion inside the app, really deleting, not deactivating (Apple and Google both require it);
- the payment rules of step 1, compared with what the screens show;
- the store privacy forms (Google's Data safety, Apple's privacy labels) against the SDKs really shipped;
- a privacy-preserving login option next to any third-party login on iOS;
- 16 KB page alignment of native libraries on Android (check the built package);
- for a new personal Google Play account: 12 testers opted in for 14 days before production access, so start the closed test early;
- crash reporting wired in, staged rollout, and a rollback for over-the-air updates. Over-the-air updates carry fixes and content only: a new feature, permission or payment path goes through the store.

## Report

```
Approach: <…>   Platforms tested: <Android emulator API 36 | iOS simulator | device>   Not tested: <…>
Key tasks: <n> of <n> completed   (failed: <task>: <step and reason>)
Release check: <must failed>, <should failed>
By hand: account deletion <ok|missing>, payment rules <ok|issue>, privacy forms <checked|not>, large text / dark / keyboard <checked|not>
Open before submission: <list>
```
