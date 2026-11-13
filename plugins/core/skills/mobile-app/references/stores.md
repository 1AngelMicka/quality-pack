# Store release rules

This file lists what blocks a release on the App Store and on Google Play, with the guideline number, the date and the check. Use it at kickoff to choose the sales model, and before each submission. It is not legal advice: store rules and fees change, so read the linked page again before a decision that costs money. Every rule below was read on 2026-11-12 unless a line says "not verified on the primary source".

`sw mobile check` reads part of this in the project files (target API level, privacy manifest present, permission texts, the public deletion page). The rest is checked by hand; the last section says which is which.

## Apple (read 2026-11-12)

Source for guideline numbers: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

### Account, login, minimum functionality, downloaded code

| Guideline | Rule | Check |
| --- | --- | --- |
| 5.1.1(v) | An app without significant account-based features works without a login. An app that lets people create an account also lets them delete it inside the app. | Play a flow from the home screen to the deletion confirmation with a throwaway account |
| 4.8 | If the main account uses a third-party or social login, offer one more login service that collects only name and email, lets the user hide the email, and does not use interactions for advertising without consent. Sign in with Apple meets the three conditions. | List the login buttons on the sign-in screen |
| 4.8, exemptions | Not required when the app uses only your own account system, is an education, enterprise or business app that needs an existing account, uses a government or industry-backed identity, or is a client for one specific third-party service. | Write which exemption applies in the review notes |
| 4.2 | The app must be more than a "repackaged website". | Name at least one native feature that works: notifications, offline reading, share sheet, camera, biometrics, verified links |
| 2.5.2 | The app does not download or run code that adds or changes features. | See "Over-the-air updates" below |

A valid account deletion, from [Apple's support page](https://developer.apple.com/support/offering-account-deletion-in-your-app/):

- Easy to find, usually in account settings.
- Deletes the whole account record and the personal data. Deactivating or disabling is not enough.
- Revokes Sign in with Apple tokens through the REST API when that login is used.
- Confirmation steps are allowed; obstacles are not.
- Tells the user how long deletion takes and confirms when it is done.
- Warns that a subscription billed by Apple continues until the user cancels it.
- A direct link to a web page that completes the deletion is accepted. Phone, email or chat only is reserved to highly regulated industries.

### In-app purchase: decision table for a SaaS

| Your situation | Guideline | Result on iOS |
| --- | --- | --- |
| The app unlocks features, a subscription or a full version for an individual | 3.1.1 | In-app purchase required. No licence keys or QR codes to unlock. |
| A plan bought on the web or another platform is used in the app | 3.1.3(b) | Allowed only if the same plan is also sold as an in-app purchase in the app. |
| Sold only by you to organisations or groups for their employees or students | 3.1.3(c) | No in-app purchase needed; users reach what the organisation bought. Any consumer, single-user or family sale goes back to 3.1.1. |
| Free companion to a paid web tool | 3.1.3(f) | No in-app purchase only for VoIP, cloud storage, email services or web hosting, and with no purchase or call to action in the app. A general SaaS is not in that list. |
| "Reader" app | 3.1.3(a) | Only for magazines, newspapers, books, audio, music and video. A general SaaS does not qualify. |
| Link, button or text pointing to a purchase outside the app | 3.1.1(a), 3.1.3 | United States storefront: allowed without an entitlement. Every other storefront: not allowed in the app or its metadata, unless a regional entitlement applies. Messages sent outside the app (email) are allowed. |
| Auto-renewable subscription sold in the app | 3.1.2(a) | Ongoing value, at least seven days, available on all the user's devices. |

How to apply it: record `monetisation` and `storefronts` in `.quality/project.json`, then search the bundle and the flow screenshots for prices, "Upgrade" or "Subscribe" buttons and checkout links. Compare each hit with the row that matches the storefront.

### Privacy manifest, SDKs, privacy labels

- **Privacy manifest.** Since 2024-05-01, App Store Connect refuses an app that uses a required-reason API without declaring it in `PrivacyInfo.xcprivacy`. Each entry under `NSPrivacyAccessedAPITypes` carries `NSPrivacyAccessedAPIType` and `NSPrivacyAccessedAPITypeReasons` ([Apple documentation](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)). The API categories (file timestamp, system boot time, disk space, active keyboards, user defaults) and the reason codes are not verified on the primary source here: read them on that page.
- **Third-party SDKs.** SDKs on Apple's list ship their own privacy manifest, and a signature when they are a binary dependency. The list includes Capacitor, Cordova, Flutter, hermes and many Firebase pods ([list](https://developer.apple.com/support/third-party-SDK-requirements/)). Check: each listed SDK in the lockfile has a `PrivacyInfo.xcprivacy` in its package.
- **Privacy labels.** Required to submit a new app or an update. They cover the data collected by third-party SDKs. "Collect" means sent off the device and kept longer than needed to serve the request. A privacy policy URL is required. Answers can be changed without a new build ([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). Check: list the SDKs really shipped, then compare with the answers.
- **Permission texts.** `sw mobile check` fails a `NS…UsageDescription` shorter than 20 characters. Write what the app does with the access, in the user's words.

### Build and size

| Rule | Date | Check |
| --- | --- | --- |
| Uploads built with Xcode 26 or later and an OS 26 SDK | since 2026-04-28 | `xcodebuild -version` on the build machine |
| iOS and iPadOS apps target iOS 13 or later | since 2026-09-09 | deployment target in the Xcode project |
| New age-rating questionnaire answered | due 2026-01-31 | App Store Connect |
| Trader status declared to ship in the EU | updates blocked since 2024-10-16, apps removed from 2025-02-17 | App Store Connect |
| App at most 4 GB uncompressed, executable `__TEXT` at most 500 MB | current | App Store Connect size report |

Sources: [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes/). An Xcode 27 minimum had not been announced on 2026-11-12.

## Google Play (read 2026-11-12)

| Rule | Detail | Check |
| --- | --- | --- |
| Target API level | New apps and updates target API 36 since 2026-08-31. Existing apps target API 35 or higher to stay visible to new users on newer Android versions. | `sw mobile check` (`android_target_api`), or `aapt dump badging app.apk` on the built app |
| 12 testers, 14 days | Personal accounts created after 2023-11-13 need a closed test with at least 12 testers opted in for 14 days in a row, then an application for production access. Organisation accounts are exempt. | Start the closed test two to three weeks before the planned release |
| 16 KB page size | Apps targeting API 35 or higher support 16 KB memory pages on 64-bit devices. The page states that from 2027-02-01 a non-compliant update cannot be released. Pure Kotlin or Java apps comply. Native code needs AGP 8.5.1 or later and NDK r28 or later, or the linker flag `-Wl,-z,max-page-size=16384`. | Commands below |
| Data safety form | Required for closed, open and production tracks (internal testing only is exempt). Privacy policy link required even with no data collected. Covers third-party SDKs. A wrong declaration can block updates or remove the app. | Compare the form with the SDK list |
| Account deletion | An app with account creation gives a path inside the app to delete the account and its data, and a working web link where deletion can be requested without reinstalling. Retention is disclosed. The form asks about it. | `sw mobile check` (`account_deletion_page`) for the web page; a flow for the in-app path |
| Payments | Play Billing for digital features, subscriptions and cloud software sold in the app. Never for physical goods. Outside the eligible programs, the app does not lead users to another payment method. | Search screens for checkout links |
| Payments, United States | Since 2025-10-29 Play Billing is not required for users in the United States. Links to external content and alternative billing go through enrolment programs. Enrolled developers report transactions and pay service fees from 2026-10-01; reporting of successful downloads for link-outs is due by 2027-02-01. | Read the programme page before enabling a link |
| Size | Base module 500 MB compressed download; 4 GB for all install-time modules; legacy APK 100 MB. Above 200 MB the user gets a mobile-data warning. | Stay under 200 MB |

16 KB checks (from the [page sizes guide](https://developer.android.com/guide/practices/page-sizes)):

```bash
zipalign -c -P 16 -v 4 app.apk                               # ends with "Verification successful"
llvm-objdump -p lib.so | grep LOAD                           # each LOAD segment aligned 2**14
bundletool dump config --bundle=app.aab | grep alignment     # PAGE_ALIGNMENT_16K
adb shell getconf PAGE_SIZE                                  # 16384 on a 16 KB emulator image
```

Earlier 16 KB deadlines (2025-11-01, then an extension) are not verified on the primary source; the 2027-02-01 date is what the page said on 2026-11-12.

Behaviour changes when the app targets API 36, on Android 16 devices:

- Edge-to-edge cannot be turned off: `windowOptOutEdgeToEdgeEnforcement` is disabled.
- Predictive back is on by default: `onBackPressed` is not called and `KEYCODE_BACK` is not dispatched. Temporary opt-out: `android:enableOnBackInvokedCallback="false"`.
- On displays 600 dp wide or more, orientation, resizability and aspect-ratio locks are ignored. Temporary opt-out: `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`, removed at API 37.

One gap: no enterprise exemption equal to Apple's 3.1.3(c) was found in the Play payments policy. For a B2B app with login only, show no purchase path in the app and read the policy page.

Sources: [target API](https://developer.android.com/google/play/requirements/target-sdk), [testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [payments](https://support.google.com/googleplay/android-developer/answer/9858738), [US changes](https://support.google.com/googleplay/android-developer/answer/15582165), [size limits](https://support.google.com/googleplay/android-developer/answer/9859372), [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16).

## Fees and external links, 2025-2026 (read 2026-11-12)

**Check the current page before deciding.** These lines changed several times in two years. Never promise a margin from this file.

| Where | What changed | Date | Evidence |
| --- | --- | --- | --- |
| Apple, United States | External purchase links and buttons need no entitlement in United States storefront apps. This is now in guideline 3.1.1(a). | May 2025 | Guideline text read; the history comes from the press |
| Apple, United States | Commission on those external sales: reported as zero in 2025. Court steps continued in 2026 (rehearing refused in March, Supreme Court review granted on 2026-06-30). | 2025-2026 | Not verified on the primary source. Do not rely on a fee figure. |
| Apple, EU | Single business terms, announced 2026-08-18. Commission 26 % with Apple's in-app purchase (15 % reduced rate: Small Business Program, subscriptions after year one). 20 % or 10 % with another payment processor in the app. 15 % or 10 % on sales made within 7 days of a tap on a link to an offer outside the app. | in force 2026-10-01 | [Apple DMA page](https://developer.apple.com/support/dma-and-apps-in-the-eu/) |
| Apple, EU | Apps distributed outside the App Store: 5 % Core Technology Commission on digital transactions, replacing the per-install fee. The payment options chosen are kept 12 months. Monthly transaction report within 15 days. | in force 2026-10-01 | same page |
| Google Play, United States | Play Billing not required for United States users; programmes, reporting and service fees as in the table above. | 2025-10-29, fees from 2026-10-01 | [Play help](https://support.google.com/googleplay/android-developer/answer/15582165) |

Account costs often quoted (Apple Developer Program USD 99 a year, Google Play USD 25 once) are not verified on the primary source.

## Over-the-air updates (read 2026-11-12)

- Apple 2.5.2 forbids downloaded code that adds or changes features.
- Google Play forbids an app that updates itself outside Play or downloads executable code (dex, JAR, `.so`). Code that runs in a virtual machine or an interpreter with indirect access to Android APIs, such as JavaScript in a WebView, is not covered by that ban ([policy](https://support.google.com/googleplay/android-developer/answer/9888379)).
- Expo EAS Update ships JavaScript, styles and images. It cannot change native code, permissions or the SDK version. Runtime versions keep an update tied to a compatible binary ([docs](https://docs.expo.dev/eas-update/introduction/)).

Rule: an over-the-air update carries fixes and content inside the feature set that was reviewed. A new feature, a new permission or a new payment path goes through the store. Keep a rollback command written down and roll out in stages.

## Free release pipeline

| Piece | Licence, price | Limits |
| --- | --- | --- |
| [Fastlane](https://github.com/fastlane/fastlane) | MIT | Screenshots, signing, TestFlight and Play uploads. Ruby. iOS lanes need macOS. |
| [EAS Build free plan](https://expo.dev/pricing) | proprietary service, free tier | 15 Android and 15 iOS builds, low priority, 45 min timeout, store submit included. The page does not state the reset period. |
| [GitHub Actions](https://docs.github.com/en/billing/reference/actions-runner-pricing) | free on public repositories (standard runners) | Private: Linux USD 0.006, Windows USD 0.010, macOS USD 0.062 per minute. The Free plan's USD 12 a month is about 2,000 Linux minutes or 190 macOS minutes. Self-hosted runners are free. |
| [TestFlight](https://developer.apple.com/testflight/) | included in the Apple Developer Program | 100 internal testers, 10,000 external; the first external build goes through Beta App Review. The 90-day build expiry is not verified on the primary source. |
| [Play internal testing](https://support.google.com/googleplay/android-developer/answer/9845334) | included in the Play account | Up to 100 testers, available in minutes. Closed and open tracks are reviewed. |

Cheapest path per stack:

- **Expo.** `eas build --platform all --profile production`, then `eas submit`, then TestFlight and Play internal testing. No Mac needed.
- **Capacitor, Flutter, Kotlin Multiplatform.** Android: `./gradlew bundleRelease` locally or on a Linux runner. iOS: a macOS runner (free on a public repository) with Fastlane `match` and `pilot`, or a borrowed Mac.

## Pre-submission checklist

| # | Line | How |
| --- | --- | --- |
| 1 | Android targets API 36 | `sw mobile check` |
| 2 | Release build not debuggable, no cleartext traffic, App Transport Security on | `sw mobile check` |
| 3 | Privacy manifest present, with reasons; listed SDKs carry theirs | `sw mobile check` for presence; reasons and SDKs by hand |
| 4 | Each permission text says why | `sw mobile check`, then read them |
| 5 | Public deletion page answers 200 | `sw mobile check` |
| 6 | Account deletion inside the app really deletes | flow with a throwaway account, then try to log in again |
| 7 | Payment screens match the decision table for each storefront | by hand, on the flow screenshots |
| 8 | An equivalent private login next to any third-party login (iOS), or a written exemption | by hand |
| 9 | Privacy labels and Data safety form match the SDKs shipped | by hand |
| 10 | Native libraries aligned to 16 KB | `zipalign` command above, on the built package |
| 11 | Built with Xcode 26 or later; deployment target iOS 13 or later | `xcodebuild -version` |
| 12 | App under 200 MB on Play, under 4 GB on Apple | store size reports |
| 13 | Closed test with 12 testers for 14 days done (new personal Play account) | Play Console |
| 14 | At least one working native feature beyond the web content (4.2); no live `server.url` in a Capacitor build | `sw mobile check` (`webview_live_url`), then by hand |
| 15 | Crash reporting wired, staged rollout chosen, over-the-air rollback written | by hand |
