# Security policy / Politique de sécurité

## Report a vulnerability / Signaler une faille

Please do not open a public issue. Use GitHub's private reporting instead:
**Security** tab of this repository → **Report a vulnerability**.

Merci de ne pas ouvrir d'issue publique. Utilise le signalement privé de GitHub :
onglet **Security** du dépôt → **Report a vulnerability**.

You will get an answer within 7 days. / Tu recevras une réponse sous 7 jours.

## What the pack runs on your machine

- Two hooks, both local and readable: `plugins/core/scripts/hooks/secrets-guard.mjs` (blocks secrets in Write and Edit) and `plugins/core/scripts/hooks/session-start.mjs` (adds a short reminder in projects that use the pack).
- The `qp.mjs` engine, run by the `/qp:*` commands. It reads your project, writes only inside `.quality/`, and contacts only the URLs you give it during an audit.
- Security tests of your own app, since 0.6.0. They only contact the address you give or the ones in `.quality/project.json`, and only when the command is run:
  - `qp access` sends ordinary HTTP requests as the test accounts you declared. It refuses the production address unless `--allow-production` is passed.
  - `qp auth` sends failed logins to a test account. It only runs on `localhost` or the staging address, with no override.
  - `qp dast` runs OWASP ZAP's passive baseline scan in Docker (image `ghcr.io/zaproxy/zaproxy:stable`, pulled by Docker, never by the pack on its own). It refuses the production address unless `--allow-production` is passed.
  - `qp supply`, `qp threats` and `qp mobile check` read files; `mobile check` also fetches the two link files and the deletion page of your own site.
  - `qp mobile flows` runs Maestro if you installed it, on the emulator or device you started.
  - `qp webhooks` sends unsigned and wrongly signed events to the webhook endpoints you declared; local or staging only, with no override.
  - `qp flows --attach <port>` drives the window of an app you started with its debugging port open; it acts on that app's real data.
  - `qp billing` calls Stripe's API with a TEST key read from an environment variable you set; it refuses any other key, creates a test clock and a test customer, and deletes them at the end.
  - `qp mobile audit` reads the screen of the Android device or emulator you started, with adb, and changes two display settings (text size, dark theme) that it puts back.
  Test passwords and tokens are read from environment variables and are not written to reports. Use these commands only on applications you own or are authorised to test.
- No telemetry, no dependency installed by the pack itself. Browser checks use the Playwright and axe-core already installed in your project.
- Companion tools (Graphify, RTK…) are separate projects that `/qp:kickoff` only suggests; nothing is installed without your yes. When Graphify is installed, the pack refreshes its graph with `GRAPHIFY_BACKEND=none` (code only, no LLM call, nothing leaves your machine).

## Supported versions

Only the latest release receives fixes.
