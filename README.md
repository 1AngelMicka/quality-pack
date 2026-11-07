# quality-pack

**Français** · [English](README.en.md)

Des plugins pour [Claude Code](https://claude.com/claude-code) qui font coder ton site ou ton application proprement dès le départ, puis l'auditent et lui donnent une note sur 10, domaine par domaine.

- **27 domaines, 153 vérifications** : produit, UX, UI, contenu générique « fait par IA », accessibilité, sécurité, RGPD, performance, SEO, paiements, déploiement, sauvegardes, etc.
- **Une preuve pour chaque vérification** : un fichier et une ligne, le résultat d'une commande ou une capture d'écran. Un point déclaré réussi sans preuve ne compte pas.
- **Une note honnête** : un seul point bloquant ouvert (un secret qui fuit, un parcours principal cassé) plafonne la note.
- **Gratuit, open source, sans télémétrie**, en français et en anglais.

## Le principe

```
/qp:kickoff  →  tu codes (les règles s'appliquent toutes seules)  →  /qp:audit  →  /qp:fix  →  /qp:audit à nouveau
```

| Étape | Ce qui se passe |
| --- | --- |
| `/qp:kickoff` | Claude lit ton projet, pose quelques questions (pour qui, quel type de projet, ce qu'il fait, le style voulu) et écrit `.quality/project.json` et `DESIGN.md`. |
| Pendant que tu codes | Claude suit les règles des domaines qu'il touche et celles de ta techno. Un garde-fou empêche d'écrire un secret dans le code. |
| `/qp:audit` | Scans automatiques (code, en-têtes HTTP, SEO, rendu navigateur à 5 largeurs, accessibilité), puis 7 auditeurs en parallèle. Résultat : `.quality/AUDIT.md` avec la note globale, la note de chaque domaine, l'évolution depuis la dernière fois et les correctifs par priorité. |
| `/qp:fix` | Corrige les problèmes dans l'ordre, les points bloquants d'abord, et vérifie chaque correction. |

## Installation

**Il te faut :** [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) 18 ou plus récent, et `git`.

**1. Ajoute la marketplace et installe le plugin principal.** Dans Claude Code, tape :

```
/plugin marketplace add 1AngelMicka/quality-pack
/plugin install qp@quality-pack
```

**2. Installe les modules de ta techno** (choisis ceux que tu utilises) :

```
/plugin install qp-nextjs@quality-pack      # Next.js, React, TypeScript, Tailwind
/plugin install qp-node-api@quality-pack    # Fastify ou Express, Prisma, PostgreSQL, Redis, Socket.io
/plugin install qp-vps@quality-pack         # Serveur auto-hébergé : Docker Compose, PM2, Nginx ou CloudPanel
```

**3. Redémarre Claude Code** (ou tape `/reload-plugins`), ouvre ton projet et lance :

```
/qp:kickoff
```

**4. Facultatif, pour les vérifications navigateur et accessibilité**, dans ton projet :

```bash
npm i -D @playwright/test axe-core
npx playwright install chromium
```

Sans eux, l'audit fonctionne quand même ; ces vérifications sont marquées « non vérifiées ».

### Installer pour toute une équipe

Dans le dossier du projet, lance une fois dans ton terminal, puis commite `.claude/settings.json` :

```bash
claude plugin marketplace add 1AngelMicka/quality-pack --scope project
claude plugin install qp@quality-pack --scope project
```

Tes collègues reçoivent le pack en ouvrant le projet dans Claude Code et en faisant confiance au dossier.

### Mettre à jour

Tape `/plugin marketplace update quality-pack` dans Claude Code. Pour les mises à jour automatiques : `/plugin` → **Marketplaces** → **quality-pack** → **Enable auto-update**.

### Désinstaller

```
/plugin uninstall qp@quality-pack
/plugin marketplace remove quality-pack
```

Ton projet garde son dossier `.quality/` ; supprime-le si tu n'en veux plus.

## Commandes

| Commande | Pour |
| --- | --- |
| `/qp:kickoff` | Configurer ou mettre à jour le profil qualité du projet |
| `/qp:audit` | Lancer un audit complet |
| `/qp:audit security-data` | Auditer un groupe (`product-experience`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `operations`) |
| `/qp:audit SEC-01 SEC-03` | Revérifier des critères précis ; les autres résultats du dernier audit sont conservés |
| `/qp:audit blockers` | Revérifier seulement les points bloquants |
| `/qp:fix` | Corriger les points bloquants (ou les 5 premiers problèmes) |
| `/qp:fix 10` · `/qp:fix SEC-02` | Corriger les 10 premiers problèmes, ou un problème précis |

## Ce qu'il vérifie

| Groupe | Domaines |
| --- | --- |
| Produit et expérience | Produit, Fonctionnalités, UX, Contenu, Support |
| Design et accessibilité | UI, AI slop, Responsive, Accessibilité, Compatibilité |
| Sécurité et données | Sécurité, Confidentialité, Données, Conformité |
| Fiabilité et qualité du code | Fiabilité, Tests, Code |
| Performance et visibilité | Performance, SEO et meta, Scalabilité |
| Intégrations, paiements et coûts | Intégrations, Paiements, Coûts |
| Exploitation | Infra, Déploiement, Monitoring, Sauvegardes |

Toutes les règles et vérifications sont détaillées dans [docs/fr/REFERENTIEL.md](docs/fr/REFERENTIEL.md).

### Notation

- Chaque vérification est **bloquante** (5 points), **majeure** (3) ou **mineure** (1). Réussie = tous les points, partielle = la moitié, en échec ou non vérifiée = aucun.
- Un point bloquant en échec plafonne son domaine à 3/10 et la note globale à 5,9/10.
- La note globale pondère les domaines selon le type de projet : `vitrine`, `webapp`, `saas`, `mobile` ou `api`. Les domaines sans objet (les paiements pour un site vitrine, par exemple) sont ignorés.

## Ce qu'il crée dans ton projet

```
.quality/
  project.json          le profil du projet (écrit par /qp:kickoff)
  AUDIT.md              le dernier rapport d'audit
  audits/<date>.json    chaque audit, pour suivre la note dans le temps
  fixes.md              journal des corrections faites par /qp:fix
DESIGN.md               la direction visuelle et les tokens de design
CLAUDE.md               une courte section « Quality pack » y est ajoutée
```

Commite `.quality/` pour garder l'historique des notes. Les captures d'écran (`.quality/audits/*/screens/`) sont ignorées par Git.

## En cas de problème

| Problème | Solution |
| --- | --- |
| Les commandes `/qp:...` n'apparaissent pas | Redémarre Claude Code ou tape `/reload-plugins`. Regarde `/plugin` → **Installed** et l'onglet **Errors**. |
| `node: command not found` | Installe Node.js 18+ et vérifie que `node` est dans ton PATH. |
| L'ajout de la marketplace échoue | Vérifie que `git` est installé. Sans clé SSH GitHub, définis `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` et réessaie. |
| Les vérifications navigateur sont « non vérifiées » | Installe Playwright et axe-core dans le projet (étape 4), et vérifie que l'appli tourne en local ou renseigne une URL de préproduction dans `.quality/project.json`. |
| Une écriture est bloquée comme secret | Mets la valeur dans une variable d'environnement. Si ce n'est vraiment pas un secret, ajoute `qp-allow-secret` en commentaire sur la ligne. |

## Confidentialité et sécurité

Le pack n'envoie aucune télémétrie. Pendant un audit, il ne contacte que les URL de ton propre projet. Les hooks tournent en local et sont assez courts pour être relus : [garde-fou anti-secrets](plugins/core/scripts/hooks/secrets-guard.mjs), [rappel de session](plugins/core/scripts/hooks/session-start.mjs). Pour signaler une faille, voir [SECURITY.md](SECURITY.md).

Le pack aide à repérer les obligations légales (RGPD, mentions légales, licences) ; il ne remplace pas l'avis d'un juriste.

## Contribuer

Idées, bugs et nouveaux modules de techno sont les bienvenus : voir [CONTRIBUTING.md](CONTRIBUTING.md). Prévus : Expo / React Native, Laravel, Astro et un module de conformité française.

## Crédits et licence

Conçu après l'étude de projets Claude Code reconnus, crédités dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Licence MIT.
