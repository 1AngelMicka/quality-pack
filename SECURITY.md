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
- No telemetry, no dependency installed by the pack itself. Browser checks use the Playwright and axe-core already installed in your project.
- Companion tools (Graphify, RTK…) are separate projects that `/qp:kickoff` only suggests; nothing is installed without your yes. When Graphify is installed, the pack refreshes its graph with `GRAPHIFY_BACKEND=none` (code only, no LLM call, nothing leaves your machine).

## Supported versions

Only the latest release receives fixes.
