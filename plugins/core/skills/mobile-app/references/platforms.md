# Platform rules that can be measured

This file gives the numbers and commands behind section 2 of the skill: what iOS and Android expect from a screen, and how to check it with the plugin's mobile flows, `adb` or `xcrun simctl`. Use it while building a screen and during the manual passes after `sw mobile flows`. Pages were read on 2026-11-12. A line marked "not verified on the primary source" comes from memory or a secondary source: confirm it before scoring an app on it.

## Apple (HIG, read 2026-11-12)

| Subject | Rule |
| --- | --- |
| Touch targets | 44 × 44 pt by default on iOS and iPadOS, never under 28 × 28 pt. About 12 pt of padding around elements with a bezel, about 24 pt around elements without. |
| Text size | Default 17 pt, minimum 11 pt. Let people enlarge text by at least 200 %. |
| Contrast | 4.5:1 up to 17 pt; 3:1 from 18 pt or bold. Check light and dark. Honour Increase Contrast. |
| Reduce Motion | Replace sliding and zooming transitions with fades; no depth or blur animation. |
| Safe areas | No content or control under system UI or hardware features such as the Dynamic Island. Lay out by size class, not by device. The HIG gives no margin in points. |
| Tab bars | Navigation only, never actions. Do not hide or disable a tab. Keep the bar visible except in modals. Badges for critical information only. Avoid the overflow "More" tab. The limit of five tabs on iPhone is not verified on the primary source. |
| Sheets | Swipe down closes; with unsaved changes, ask before closing. Grabber on resizable sheets. Cancel on the leading edge, Done on the trailing edge. Never Cancel, Done and Back together. One sheet at a time. |
| Back | Edge swipe from the left stays available in navigation stacks (not verified on the primary source). |

Body text size at each Dynamic Type setting:

| Setting | xSmall | Small | Medium | Large (default) | xLarge | xxLarge | xxxLarge | AX1 | AX2 | AX3 | AX4 | AX5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Body, pt | 14 | 15 | 16 | 17 | 19 | 21 | 23 | 28 | 33 | 40 | 47 | 53 |

Use the system text styles, not fixed sizes, so a screen follows this table.

Sources: [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [typography](https://developer.apple.com/design/human-interface-guidelines/typography), [layout](https://developer.apple.com/design/human-interface-guidelines/layout), [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

## Android and Material (read 2026-11-12)

| Subject | Rule |
| --- | --- |
| Touch targets | At least 48 × 48 dp, with 8 dp or more between targets. |
| Edge-to-edge | An app targeting API 35 or higher is drawn edge-to-edge on Android 15 and later. Targeting API 36, the opt-out is gone on Android 16. Handle system-bar, display-cutout and gesture insets: pad tappable views, let scrolling content pass behind the bars. `enableEdgeToEdge()` covers older versions. |
| Predictive back | Targeting API 36 on Android 16: on by default; `onBackPressed` is not called. Use the back-callback APIs. |
| Large screens | Targeting API 36: orientation, resizability and aspect-ratio locks are ignored when the smallest width is 600 dp or more. |
| Font scale | Android 14 and later scale fonts up to 200 %, on a non-linear curve. Use `sp` for text and line height, never for padding. Test at the largest size. |
| Notifications | Off by default on Android 13 and later for new installs. Ask in context, after a user action. |

Sources: [Accessibility Scanner help](https://support.google.com/accessibility/android/answer/7101858), [edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge), [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16), [font scaling](https://developer.android.com/about/versions/14/features#non-linear-font-scaling), [notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission).

## Behaviours to check on a device

Flow steps are those of `mobile.flows`. Every `tap`, `type`, `back`, `scroll_to`, `swipe`, `open_link`, `offline`, `dark` and `launch` step already saves a screenshot; add `{ "screenshot": "name" }` where one more is needed.

| Behaviour | Passes when | How to check |
| --- | --- | --- |
| Keyboard | The focused field and the main action stay visible with the keyboard open | `{ "type": { "into": { "id": "email" }, "text": "a@test.local" } }` then `{ "expect": { "id": "submit" } }`, with no `hide_keyboard` before. Read the screenshot too: an element can be in the hierarchy and still be covered. |
| Safe areas, insets | No control under the status bar, the Dynamic Island, the home indicator or the gesture bar | Screenshots on a notched simulator and on an emulator with gesture navigation |
| Back | Back returns to the previous screen; no exit with unsaved input without a warning | `{ "back": true }` then `{ "expect": "<previous screen title>" }`. On a form with typed text: `{ "back": true }` then `{ "expect": "<warning text>" }` |
| Dark theme | No unreadable text, no white surface left | `{ "dark": true }` at the start of the flow, then read the screenshots and sample contrast |
| Large text | No clipped or overlapping text at 200 % (Android) or at the AX sizes (iOS) | `adb shell settings put system font_scale 2.0` ; `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`. Then play the flow again. Both commands are not verified on the primary source. |
| Loading | A skeleton or a progress indicator from the first frame, no blank screen | `{ "launch": true }` saves a screenshot right after launch: read it |
| Offline | Cached content readable, a clear offline message, writes handled as declared | `{ "offline": true }`, the task steps, `{ "expect": "<cached item>" }`, `{ "offline": false }` |
| Rotation, tablet | Layout adapts; no forced portrait at 600 dp and more | Play the flow on a tablet emulator. There is no rotation step in the flow vocabulary: rotate the emulator by hand or with its controls, then take a screenshot. |

Reset after the large-text pass: `adb shell settings put system font_scale 1.0`.

## Start-up time and Android vitals (read 2026-11-12)

Android vitals marks start-up as excessive at these times to initial display:

| Start | Excessive from |
| --- | --- |
| Cold | 5 s |
| Warm | 2 s |
| Hot | 1.5 s |

Measure: `adb shell am start -S -W com.example.app/.MainActivity`, read `TotalTime` in milliseconds. Logcat also prints `Displayed …: +3s534ms`. Call `reportFullyDrawn()` to get the time to full display.

The plugin's own scale for a cold start on a mid-range emulator: under 2 s good, under 5 s acceptable, 5 s or more fails. Only the 5 s line is official.

iOS: Apple gives no number on its page. Launch is measured to the first frame, in Xcode Organizer (50th and 90th percentiles), MetricKit and the Instruments App Launch template. The 400 ms target often quoted is not verified on the primary source.

Bad-behaviour thresholds on Google Play, over 28 days, per daily active user:

| Metric | All devices | One phone model |
| --- | --- | --- |
| User-perceived crash rate | 1.09 % | 8 % |
| User-perceived ANR rate | 0.47 % | 8 % |
| Excessive partial wake locks | 5 % | none |

Above a threshold, the app can lose visibility on Play and get a warning on its listing. Memory and code-optimisation thresholds may count from February 2027. These rates are per user, so they do not compare with per-session rates from a crash tool.

Sources: [launch time](https://developer.android.com/topic/performance/vitals/launch-time), [Android vitals](https://developer.android.com/topic/performance/vitals), [reducing launch time (Apple)](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time).

## Offline-first (read 2026-11-12)

- The local store is the source of truth for the screen. At the minimum, reads work with no network.
- Choose one write strategy per kind of data and write it down: **online only** (disable the action offline and say why), **queued** (sent later, order kept), **lazy** (written locally, synced later, needs a conflict rule).
- Conflicts need versions. The common rule is last write wins, with the time decided by the server.
- Retries use exponential backoff. On Android, background sync runs in WorkManager with a connected-network constraint.
- Test: complete a task offline, kill the app, reopen it online. Nothing is lost. Test the conflict rule with two sessions on the same record.

Source: [offline-first guide](https://developer.android.com/topic/architecture/data-layer/offline-first).

## Links into the app (read 2026-11-12)

`sw mobile check` fetches both files on `mobile.links_host` and fails on anything but HTTP 200 with JSON and no redirect. The same check by hand:

```bash
curl -sI https://app.example.com/.well-known/assetlinks.json
curl -sI https://app.example.com/.well-known/apple-app-site-association
```

Android App Links: an intent filter with `android:autoVerify="true"`, the `VIEW` action, the `BROWSABLE` and `DEFAULT` categories and the https scheme.

```bash
adb shell pm verify-app-links --re-verify com.example.app
adb shell pm get-app-links com.example.app        # each domain reads "verified"
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://app.example.com/item/1"
```

Android 15 and later verify again from time to time; a change can take up to 7 days to reach devices.

iOS Universal Links: the file has no extension, is served over https with a valid certificate and no redirect. `applinks.details[].appIDs` holds `<TeamID>.<bundle id>`. The app has the `com.apple.developer.associated-domains` entitlement. Devices fetch the file through Apple's CDN, which refreshes within 24 hours. In a flow: `{ "open_link": "https://app.example.com/item/1" }` then `{ "expect": "<item title>" }`.

Sources: [verify App Links](https://developer.android.com/training/app-links/verify-applinks), [associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

## Push permission (read 2026-11-12)

- Never ask on first launch. Ask after a user action that shows the value, behind a screen that says what will be sent.
- Android 13 and later: `POST_NOTIFICATIONS` is a runtime permission. Show a rationale screen when `shouldShowRequestPermissionRationale()` is true. Test both answers: `adb shell pm grant com.example.app android.permission.POST_NOTIFICATIONS`, and `revoke`.
- iOS: the system prompt shows once per install, which is why the explaining screen comes first (not verified on the primary source).
- A refusal blocks nothing. Settings hold one switch per kind of notification.
- No opt-in rate is scored: only vendor figures exist.

## Security (read 2026-11-12)

Reference: OWASP MASVS 2.1.0 (CC BY-SA 4.0). Eight control groups: STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY. The tests are in the MASTG on the [same site](https://mas.owasp.org/MASVS/).

| Rule | Check |
| --- | --- |
| Session tokens in the Keychain (iOS) or Keystore-backed storage (Android). Never in AsyncStorage, SharedPreferences, localStorage or a plain file. | Search the code for those storage calls. After a login on an emulator: `adb shell run-as com.example.app ls -R` and read the files. Mapping to MASVS-STORAGE is not verified on the primary source. |
| No secret in the shipped app: no API secret key, signing key or service-account file. Public keys only. | `apkleaks -f app.apk`; unzip the `.apk` or `.ipa` and search the JavaScript bundle and the plists |
| TLS only | `sw mobile check`: `android_cleartext`, `ios_ats`, `webview_navigation` |
| Certificate pinning is optional. Android's own guide does not recommend it. If pins exist: at least two, one on a key you control, and an expiry date. | Read `network_security_config.xml`. Do not mark a standard SaaS down for having no pins. |
| Verified https links for authentication callbacks, never a custom URL scheme; every parameter validated | Read the manifest and the link files |
| Only needed components are exported; backups exclude tokens | `sw mobile check`: `android_exported` (more than 3 exported), `android_backup` |
| WebView (Capacitor): loads the app's own origins only, no file access, no mixed content | `sw mobile check`: `webview_navigation` fails on `allowNavigation: ["*"]` or `cleartext: true`. Also search for `addJavascriptInterface` and `setAllowFileAccess`. |
| Biometric unlock releases a key held in the Keychain or Keystore; it is not a boolean in the code | Code review (not verified on the primary source) |
| Release build: not debuggable, code shrinking on, no dev menu | `sw mobile check`: `android_debuggable`. Expo SDK 58 turns R8 on by default. |

Free scanners. Call them as external tools; never copy a GPL tool into the project or the plugin.

| Tool | Licence | Command |
| --- | --- | --- |
| [mobsfscan](https://github.com/MobSF/mobsfscan) | LGPL-3.0 | `pip install mobsfscan` ; `mobsfscan . --json`. Source rules for Java, Kotlin, Swift, Objective-C, manifests and plists. Runs on Windows. |
| [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) | GPL-3.0 | `docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest`, then upload the APK, AAB or IPA through its REST API |
| [apkleaks](https://github.com/dwisiswant0/apkleaks) | Apache-2.0 | `pip3 install apkleaks` ; `apkleaks -f app.apk` (needs jadx) |
| Android Lint | Apache-2.0 (not verified) | `./gradlew lint` |

## Accessibility (read 2026-11-12)

- Every control has a name read by VoiceOver and TalkBack, a role and a state. Decorative images are hidden (WCAG 1.1.1, 4.1.2).
- Targets and text scaling: the platform numbers above. They are stricter than WCAG 2.5.8.
- Any swipe, drag or multi-finger gesture has a single-tap alternative (2.5.1, 2.5.7). Content works in both orientations (1.3.4).
- W3C's guidance for applying WCAG 2.2 to mobile apps is a draft note dated 2025-05-06, informative only, with sections still empty. Use it to read a criterion as "screen" instead of "web page", not as a standard to score against ([WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)).

| Free check | Licence | Runs from a command line |
| --- | --- | --- |
| XCTest `performAccessibilityAudit()` | free with Xcode | Yes, `xcodebuild test` on macOS. Fails a UI test on contrast, Dynamic Type and description issues. |
| [Accessibility Test Framework for Android](https://github.com/google/Accessibility-Test-Framework-for-Android) | Apache-2.0 | Yes, `./gradlew connectedAndroidTest`, through Espresso accessibility checks (not verified on the primary source) |
| Android Lint | Apache-2.0 (not verified) | Yes: missing `contentDescription` and similar |
| Google Accessibility Scanner | free app, closed source | No. Manual pass on a device: 48 dp targets, contrast, labels. |
| Xcode Accessibility Inspector | free with Xcode | No. Manual pass on a simulator. |

The order in which a screen reader announces a screen still needs a person.

## Crash reporting

| Option | Licence | Verdict |
| --- | --- | --- |
| [GlitchTip](https://glitchtip.com/) | MIT backend | First choice. Accepts Sentry SDKs. Light enough to self-host on a small server. |
| Play Console vitals, Xcode Organizer | built in, free | Always on. Store installs only, with user consent. |
| [Sentry self-hosted](https://develop.sentry.dev/self-hosted/) | FSL: source-available, not open source | Allowed for your own use. Needs 4 cores and 16 GB of RAM. Say the licence to the user. |
| [Firebase Crashlytics](https://firebase.google.com/pricing) | free, proprietary | Usable. Data goes to Google; adds Firebase SDKs to the privacy manifest and the store privacy forms. |

## Excluded

- **Paid device clouds**: Maestro Cloud (USD 250 per device per month), BrowserStack, Sauce Labs. The flows run on your own emulator, simulator or device.
- **Paid accessibility tools**: axe DevTools Mobile (Deque). The free checks above and a manual pass cover the same rules.
- **Commercial scanners**: NowSecure, Data Theorem, the paid tiers of Guardsquare AppSweep. mobsfscan, MobSF and apkleaks are free.
- **Maestro AI commands** (`assertWithAI` and similar): results are not repeatable, so no check rests on them.
- **Detox, Appium, Playwright Android**: open source, but not used here. Detox drives React Native only and trails its releases; Appium needs a server and drivers; Playwright's Android support is experimental and limited to Chrome and WebView.
