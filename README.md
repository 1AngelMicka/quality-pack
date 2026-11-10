# quality-pack

**Français** · [English](README.en.md)

Des plugins pour [Claude Code](https://claude.com/claude-code) qui font coder ton site ou ton application proprement dès le départ, l'auditent avec une note sur 10 domaine par domaine, et dépensent le moins de tokens possible pour y arriver.

- **27 domaines, 153 vérifications** : produit, UX, UI, contenu générique « fait par IA », accessibilité, sécurité, RGPD, performance, SEO, paiements, déploiement, sauvegardes, etc.
- **Une preuve pour chaque vérification** : un fichier et une ligne, le résultat d'une commande ou une capture d'écran. Un point déclaré réussi sans preuve ne compte pas.
- **Une note honnête** : un seul point bloquant ouvert (un secret qui fuit, un parcours principal cassé) plafonne la note.
- **Économe en tokens** : règles chargées à la demande, sorties de commandes compactes, audits incrémentaux, graphe du code avec [Graphify](https://github.com/Graphify-Labs/graphify). Voir [Économie de tokens](#économie-de-tokens).
- **Gratuit, open source, sans télémétrie**, en français et en anglais.

## Documentation en ligne et agents IA

- Site de documentation : https://1angelmicka.github.io/quality-pack/
- Tu peux aussi confier l'installation à ton assistant IA : donne-lui le lien du repo ou dis-lui « installe quality-pack en suivant https://github.com/1AngelMicka/quality-pack/blob/main/docs/AGENT_GUIDE.md ». Il trouvera [`llms.txt`](llms.txt) et le [guide pour agents](docs/AGENT_GUIDE.md).

## Le principe

```
/qp:kickoff  →  tu codes (les règles s'appliquent toutes seules)  →  /qp:audit  →  /qp:fix  →  /qp:audit
```

| Étape | Ce qui se passe |
| --- | --- |
| `/qp:kickoff` | Claude lit ton projet, pose quelques questions (pour qui, quel type de projet, ce qu'il fait, le style voulu), propose les outils compagnons utiles et écrit `.quality/project.json` et `DESIGN.md`. |
| Pendant que tu codes | Claude suit les règles des domaines qu'il touche et celles de ta techno. Un garde-fou empêche d'écrire un secret dans le code. |
| `/qp:audit` | Scans automatiques (code, en-têtes HTTP, SEO, rendu navigateur à 5 largeurs, accessibilité), puis un auditeur par groupe de domaines, en parallèle. Par défaut, seul ce qui a changé depuis le dernier audit est revérifié. Résultat : `.quality/AUDIT.md` avec la note globale, la note de chaque domaine, l'évolution et les correctifs par priorité. |
| `/qp:fix` | Corrige les problèmes dans l'ordre, les points bloquants d'abord, et vérifie chaque correction. |
| `/qp:handoff` | Note où en est la tâche, pour que la session suivante reprenne sans réexplorer le projet. |

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

**5. Facultatif, pour économiser des tokens sur les projets moyens et gros :** installe [Graphify](#outils-compagnons) (`/qp:kickoff` te le propose quand c'est utile).

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
| `/qp:audit` | Audit incrémental : seul ce qui a changé depuis le dernier audit est revérifié (complet au premier audit, après une mise à jour du pack, ou si le dernier audit complet a plus de 30 jours) |
| `/qp:audit quick` | Vérifications automatiques seulement, sans auditeurs : le moins cher, idéal avant une mise en ligne |
| `/qp:audit full` | Tout revérifier depuis zéro |
| `/qp:audit security-data` | Un seul groupe (`product-experience`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `operations`) |
| `/qp:audit SEC-01 SEC-03` · `/qp:audit blockers` | Des critères précis, ou seulement les points bloquants |
| `/qp:fix` | Corriger les points bloquants (ou les 5 premiers problèmes) |
| `/qp:fix 10` · `/qp:fix SEC-02` | Corriger les 10 premiers problèmes, ou un problème précis |
| `/qp:handoff` | Écrire `.quality/handoff.md` avant de couper une longue tâche |

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

## Économie de tokens

Le pack réduit les tokens à trois endroits :
- **ce qui est chargé en permanence** : le moins possible ;
- **ce que Claude lit** : des résumés et des requêtes ciblées plutôt que des fichiers entiers et des sorties de milliers de lignes ;
- **ce qui est refait** : on ne revérifie que ce qui a changé, et on ne réexplore pas le projet à chaque session.

### Ce que le pack fait tout seul, sans rien installer

| Mécanisme | Effet |
| --- | --- |
| **Règles chargées à la demande** | Environ 1 150 tokens chargés en permanence (les descriptions des skills). Le détail des règles (300 à 1 800 tokens par skill) ne se charge que quand Claude touche le domaine concerné. |
| **Scans en scripts** | Texte de remplissage, formules creuses, logs oubliés, en-têtes HTTP, SEO et tests navigateur tournent en Node. Claude lit un résumé JSON au lieu de parcourir le code. |
| **Sorties de commandes compactes** (`qp.mjs run`) | Les tests, le lint, le typage et les audits de dépendances écrivent leur log complet sur le disque. Claude ne reçoit que le code de sortie, les lignes d'erreur et la fin du log. Sur notre test, une sortie de 3 000 lignes passe d'environ 14 700 tokens à environ 190. |
| **Audit incrémental par défaut** | Seuls les critères que les fichiers modifiés (d'après Git) peuvent affecter sont revérifiés ; les autres sont repris du dernier audit et signalés comme tels. Si rien n'a changé, aucun auditeur n'est lancé. |
| **Mode rapide** (`/qp:audit quick`) | Seulement les vérifications automatiques, sans agent auditeur. |
| **Modèle moins cher pour les auditeurs** | `/qp:kickoff` propose de faire tourner les auditeurs sur Sonnet ou Haiku pendant que ta session reste sur ton modèle habituel. |
| **Passage de relais** (`/qp:handoff`) | Une note de 60 lignes maximum permet à la session suivante de reprendre une longue tâche sans réexplorer le projet. Le hook de démarrage la signale automatiquement. |
| **Réponses courtes** | La méthode de travail demande des comptes rendus de deux ou trois lignes : pas de récapitulatif des étapes, pas de code recopié. |

Le rapport d'audit indique les tokens évités grâce aux sorties compactes. Pour la consommation totale d'une session, tape `/cost` (ou `/usage` selon ton abonnement) dans Claude Code.

### Selon la taille du projet et l'horizon

Taille mesurée en fichiers de code : `node qp.mjs graph` l'affiche, et `/qp:kickoff` s'en sert pour ses recommandations.

| Taille du projet | Court terme : une session | Moyen terme : quelques semaines de développement | Long terme : la vie du projet |
| --- | --- | --- | --- |
| **Petit** (moins de 60 fichiers de code) | Le pack suffit : règles à la demande, sorties compactes. Graphify n'apporte presque rien, une recherche directe coûte déjà peu. | `/qp:audit` incrémental après chaque fonctionnalité, `/qp:audit quick` avant chaque mise en ligne. | Un `/qp:audit full` par mois (forcé automatiquement après 30 jours). `/qp:handoff` pour les tâches sur plusieurs jours. |
| **Moyen** (60 à 400 fichiers) | Installer **Graphify** : Claude interroge le graphe du code au lieu de chercher et relire les fichiers. **RTK** si tes sessions sont longues. | Audits incrémentaux. `graphify hook install` garde le graphe à jour à chaque commit, sans tokens. Auditeurs sur Sonnet. | Historique des notes dans `.quality/`. Audit complet mensuel, `/qp:handoff` systématique en fin de session. |
| **Gros** (plus de 400 fichiers) | **Graphify fortement recommandé**, RTK recommandé. Lecture des fichiers par plages de lignes, jamais en entier. | Audits incrémentaux ou par groupe (`/qp:audit security-data`). Auditeurs sur Sonnet, Haiku pour les audits rapides. | Audits complets découpés par groupe sur plusieurs sessions. Handoff obligatoire : sans lui, chaque session repaie l'exploration du projet. |

### Outils compagnons

Ces outils ne sont pas inclus dans le pack : ce sont des projets séparés, installés à part. `/qp:kickoff` propose ceux qui conviennent à ton projet et ne les installe qu'avec ton accord.

| Outil | Quand | Ce qu'il apporte | Installation |
| --- | --- | --- | --- |
| [Graphify](https://github.com/Graphify-Labs/graphify) | Projets moyens et gros | Graphe du code construit en local, sans appel à un modèle d'IA. Claude pose une question (« où sont les routes d'API ? ») au lieu de relire les fichiers. Le pack le remet à jour avant chaque audit, sans tokens. | `uv tool install graphifyy` (ou `pipx install graphifyy`), puis `graphify install --project` |
| [RTK](https://github.com/rtk-ai/rtk), édition `rtk-oss` | Longues sessions | Compresse la sortie des commandes courantes (git, tests, ls) avant que Claude la lise. Télémétrie désactivée par défaut. Prends l'édition `rtk-oss`, entièrement sous licence Apache 2.0. | `brew install rtk-ai/tap/rtk-oss`, puis `rtk init -g` |
| [Cloudflare security-audit](https://github.com/cloudflare/security-audit-skill) | Comptes, paiements, données personnelles | Audit de sécurité approfondi pour les versions majeures (critère SEC-11). Très complet mais gourmand : à lancer avant une sortie, pas tous les jours. | `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit` |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Sites vitrines | Méthode de design poussée contre le rendu générique, pour les sites marketing. | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |
| [reanimate](https://github.com/NiazMorshed2007/reanimate) | Animation précise à reproduire | Filme une animation de référence et la reconstruit en mesurant l'écart. Pour s'inspirer, jamais pour copier le site d'un autre. | `npx skills add NiazMorshed2007/reanimate -g` |

**Écartés après étude**, malgré leur intérêt :
- **claude-mem** : des hooks sur tous les événements et une télémétrie activée par défaut. `/qp:handoff` couvre le besoin plus simplement.
- **Context Mode** : licence non open source (Elastic 2.0) et des hooks sur presque tous les outils ; il fait doublon avec RTK.
- **Headroom** : une télémétrie activée par défaut, et il fait doublon avec RTK.
- **Caveman** : une télémétrie qui inclut l'adresse IP, et un mode qui envoie tes demandes à un service en ligne. Son idée utile, des réponses courtes, est reprise dans la méthode de travail du pack.

## Ce qu'il crée dans ton projet

```
.quality/
  project.json          le profil du projet (écrit par /qp:kickoff)
  AUDIT.md              le dernier rapport d'audit
  audits/<date>.json    chaque audit, pour suivre la note dans le temps
  audits/<date>/logs/   les sorties complètes des commandes de l'audit
  fixes.md              journal des corrections faites par /qp:fix
  handoff.md            le passage de relais entre sessions (/qp:handoff)
DESIGN.md               la direction visuelle et les tokens de design
CLAUDE.md               une courte section « Quality pack » y est ajoutée
```

Commite `.quality/` pour garder l'historique des notes. Les captures d'écran et les logs sont lourds : ajoute `.quality/audits/*/screens/` et `.quality/audits/*/logs/` à ton `.gitignore` (`/qp:kickoff` le fait).

## En cas de problème

| Problème | Solution |
| --- | --- |
| Les commandes `/qp:...` n'apparaissent pas | Redémarre Claude Code ou tape `/reload-plugins`. Regarde `/plugin` → **Installed** et l'onglet **Errors**. |
| `node: command not found` | Installe Node.js 18+ et vérifie que `node` est dans ton PATH. |
| L'ajout de la marketplace échoue | Vérifie que `git` est installé. Sans clé SSH GitHub, définis `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` et réessaie. |
| Les vérifications navigateur sont « non vérifiées » | Installe Playwright et axe-core dans le projet (étape 4), et vérifie que l'appli tourne en local ou renseigne une URL de préproduction dans `.quality/project.json`. |
| Une écriture est bloquée comme secret | Mets la valeur dans une variable d'environnement. Si ce n'est vraiment pas un secret, ajoute `qp-allow-secret` en commentaire sur la ligne. |
| L'audit incrémental refait tout | C'est voulu au premier audit, après une mise à jour du pack, si le dernier audit complet a plus de 30 jours, ou hors d'un dépôt Git. |
| Graphify n'est pas utilisé | Vérifie `graphify --version`, puis `node <chemin du plugin>/scripts/qp.mjs graph` dans ton projet. |

## Confidentialité et sécurité

Le pack n'envoie aucune télémétrie. Pendant un audit, il ne contacte que les URL de ton propre projet. Les hooks tournent en local et sont assez courts pour être relus : [garde-fou anti-secrets](plugins/core/scripts/hooks/secrets-guard.mjs), [rappel de session](plugins/core/scripts/hooks/session-start.mjs). Pour signaler une faille, voir [SECURITY.md](SECURITY.md).

Le pack aide à repérer les obligations légales (RGPD, mentions légales, licences) ; il ne remplace pas l'avis d'un juriste.

## Contribuer

Idées, bugs et nouveaux modules de techno sont les bienvenus : voir [CONTRIBUTING.md](CONTRIBUTING.md). Prévus : Expo / React Native, Laravel, Astro et un module de conformité française.

## Crédits et licence

Conçu après l'étude de 27 projets Claude Code, crédités dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Licence MIT.
