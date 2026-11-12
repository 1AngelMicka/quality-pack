# quality-pack

**Français** · [English](README.en.md)

Des plugins pour [Claude Code](https://claude.com/claude-code) qui font coder ton site ou ton application proprement dès le départ, l'auditent avec une note sur 10 domaine par domaine, et dépensent le moins de tokens possible pour y arriver.

- **37 domaines, 247 vérifications** : produit, UX, ergonomie, UI, contenu générique « fait par IA », accessibilité, sécurité, RGPD, performance, SEO, paiements, comptes et abonnements d'un SaaS, application mobile, finitions, identité, déploiement, sauvegardes, etc.
- **Tes vraies tâches, jouées sur téléphone et sur ordinateur** : tu déclares 2 à 5 tâches clés (« faire un collage de 4 photos ») ; l'audit les joue pas à pas, prend une capture et lance axe-core à chaque étape, et mesure l'effort : pages à faire défiler, réglages visibles à la fois, aperçu et action principale à portée. L'interface n'est plus jugée sur un écran vide.
- **Deux notes** : **Expérience** (ce que vit l'utilisateur) et **Technique et exploitation** (ce qui garde le projet sûr et en marche), chacune avec ses propres points bloquants. Une sonde de panne manquante ne masque plus l'état de l'interface, et inversement.
- **Une preuve pour chaque vérification** : un fichier et une ligne, le résultat d'une commande ou une capture d'écran. Un point déclaré réussi sans preuve ne compte pas.
- **Concevoir, pas seulement auditer** : trois skills design. Le premier organise un écran (modèles par type de tâche, téléphone et ordinateur). Le deuxième passe des références aimées à des tokens vérifiés (OKLCH, format DTCG, contraste dans chaque thème). Le troisième conseille sur un écran existant (`/qp:design-review`). Chaque conseil se termine par une mesure.
- **La sécurité essayée, pas seulement relue** : l'audit joue le contrôle d'accès avec deux comptes (un client peut-il lire les données d'un autre ?), teste la connexion, lance un scan passif OWASP ZAP et lit la chaîne d'approvisionnement du dépôt. Un modèle de menaces est écrit dès le cadrage.
- **De zéro au lancement** : le skill `from-zero` donne les étapes d'un SaaS ou d'une webapp et ce qui doit être vrai avant de passer à la suivante ; `saas-foundations` construit ce qui coûte cher à ajouter tard (cloisonnement entre clients, rôles, abonnements, emails de service) ; `mobile-app` couvre l'app iOS et Android jusqu'aux blocages des stores.
- **Les finitions mesurées** : `qp craft` vérifie dans un vrai navigateur ce qui sépare un produit soigné d'un premier jet (focus clavier, survol, typographie, images, page 404, image de partage…), et le référentiel refuse tout témoignage, chiffre ou logo de client inventé.
- **Aller au-delà du correct** : une banque de références par type de site (ce que les visiteurs attendent, des sites reconnus comme excellents et pourquoi), des versions comparées à l'aveugle par un jury avant que tu choisisses, un directeur artistique qui relit les captures, et des passes de finition obligatoires (réseau lent, serveur en panne, textes longs, clavier seul).
- **Une note honnête** : un point bloquant ouvert (un secret qui fuit, un parcours principal cassé) plafonne la note dont il relève. Un ergonome passe en revue les tâches clés et une contre-vérification relit les critères réussis sur les captures.
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
| `/qp:kickoff` | Claude lit ton projet, pose quelques questions (pour qui, quel type de projet, ce qu'il fait, le style voulu, les tâches clés), écrit les parcours que l'audit jouera, propose les outils compagnons utiles et écrit `.quality/project.json` et `DESIGN.md`. |
| Pendant que tu codes | Claude suit les règles des domaines qu'il touche et celles de ta techno. Un garde-fou empêche d'écrire un secret dans le code. |
| `/qp:audit` | Scans automatiques (code, en-têtes HTTP, SEO, rendu navigateur à 6 largeurs), tâches clés jouées sur téléphone et ordinateur, puis un auditeur par groupe de domaines en parallèle, un ergonome pour l'organisation des écrans, et une contre-vérification. Par défaut, seul ce qui a changé depuis le dernier audit est revérifié. Résultat : `.quality/AUDIT.md` avec les deux notes, la note de chaque domaine, la revue d'ergonomie, l'évolution et les correctifs par priorité. |
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
/plugin install qp-expo@quality-pack        # App mobile Expo ou React Native (iOS, Android)
/plugin install qp-capacitor@quality-pack   # Webapp livrée en app iOS et Android avec Capacitor
/plugin install qp-tauri@quality-pack       # Application de bureau Tauri
/plugin install qp-electron@quality-pack    # Application de bureau Electron
```

**3. Redémarre Claude Code** (ou tape `/reload-plugins`), ouvre ton projet et lance :

```
/qp:kickoff
```

**4. Pour les tâches clés et les vérifications navigateur**, une fois pour toutes (Claude te le propose au premier audit) :

```bash
node <dossier du plugin>/scripts/qp.mjs browser-setup
```

Playwright, axe-core et Chromium s'installent dans le cache du pack, pas dans ton projet. Si ton projet a déjà Playwright, il est utilisé. Sans eux, l'audit fonctionne quand même ; ces vérifications sont marquées « non vérifiées ».

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
| `/qp:audit ergonomics` | Un seul groupe (`product-experience`, `ergonomics`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `saas`, `mobile`, `operations`) |
| `/qp:audit SEC-01 SEC-03` · `/qp:audit blockers` | Des critères précis, ou seulement les points bloquants |
| `/qp:fix` | Corriger les points bloquants (ou les 5 premiers problèmes) |
| `/qp:fix 10` · `/qp:fix SEC-02` · `/qp:fix ERG-R01` | Corriger les 10 premiers problèmes, un problème précis ou un constat de la revue d'ergonomie |
| `/qp:fix experience` | Corriger d'abord ce qui pèse sur la note Expérience |
| `/qp:handoff` | Écrire `.quality/handoff.md` avant de couper une longue tâche |
| `/qp:design-review [tâche ou URL]` | Avis sur un écran : effort mesuré, revue heuristique, deux ou trois réorganisations chiffrées |
| `node qp.mjs look <url>` | Mesurer le rendu : signaux de rendu générique pondérés, tailles de police, longueur des lignes, petites cibles |
| `node qp.mjs deslop <url>` | Mesurer l'espacement et l'alignement du rendu, élément par élément, à 375, 768, 1440 et 1920 px (Chrome ou Edge installé, rien à ajouter) |
| `node qp.mjs craft <url>` | Mesurer les finitions du rendu : détails typographiques, focus et survol, transitions, images, icônes, icône du site, image de partage, page 404 |
| `node qp.mjs stress <url>` | Passes de finition : l'écran avec un réseau lent, un serveur en panne, des textes trois fois plus longs, à 320 px, en thème sombre, au clavier seul, sans scripts |
| `node qp.mjs bank [type]` | Banque de références : par type de site, ce que les visiteurs attendent, des sites reconnus comme excellents avec la raison, ce qu'il faut éviter |
| `node qp.mjs profile <url> --save` · `gap <url>` | Mesurer le profil visuel de références, puis l'écart d'un écran avec elles ou avec la banque (`--type`) |
| `node qp.mjs variants <nom> <url> <url>…` | Plusieurs versions d'un écran : captures sous des lettres mélangées, mesures, paires pour un jury à l'aveugle ; `--tally` les classe |
| `node qp.mjs access` | Jouer le contrôle d'accès : chaque ressource déclarée est demandée par son propriétaire, puis par les comptes qui ne doivent pas l'atteindre. Code de sortie 2 en cas de fuite |
| `node qp.mjs auth` | Tester la connexion (local ou préproduction seulement) : même réponse pour un compte connu et inconnu, mots de passe faux en série ralentis ou refusés |
| `node qp.mjs dast [url]` | Scan passif de l'application avec OWASP ZAP dans Docker : en-têtes, cookies, fuites d'information, bibliothèques vulnérables |
| `node qp.mjs supply` | Lire la chaîne d'approvisionnement du dépôt : fichier de verrouillage, délai avant installation, scripts d'installation, actions de CI épinglées, fichiers .env |
| `node qp.mjs seo [url]` | Référencement : sitemap (présent, déclaré, sans adresse cassée), balises title et meta description de chaque page, mots-clés visés portés par leur page, Search Console |
| `node qp.mjs perf <url>` | Mesurer le chargement sur un téléphone ralenti : plus grand affichage, saut de mise en page, temps de blocage, poids de la page et des scripts |
| `node qp.mjs facts <url>` | Relever les chiffres, citations, noms de clients et badges affichés, et vérifier que chacun est relié à `.quality/facts.json` |
| `node qp.mjs webhooks` | Jouer les webhooks (local ou préproduction) : un événement non signé ou mal signé doit être refusé |
| `node qp.mjs billing` | Jouer le cycle d'abonnement en mode test Stripe avec une horloge de test : essai, premier paiement, renouvellement refusé, résiliation ; l'application est interrogée à chaque étape |
| `node qp.mjs mobile audit` | Android : lire l'écran affiché sur l'émulateur ou l'appareil (cibles tactiles, contrôles sans nom), avec captures en texte à 200 % et en thème sombre |
| `node qp.mjs desktop check` · `flows --attach <port>` | Application de bureau : lire dans le projet l'isolation, les permissions, la signature et les mises à jour ; jouer les tâches clés dans la vraie fenêtre |
| `node qp.mjs threats` | Vérifier le modèle de menaces (`.quality/threats.json`) : points d'entrée couverts, réponse et test pour chaque cas d'abus |
| `node qp.mjs mobile flows` · `mobile check` | App installée : jouer les tâches clés avec Maestro sur émulateur ou appareil ; lire dans le projet ce qui bloque une publication |
| `node qp.mjs tokens` | Vérifier les design tokens : format DTCG, références, contraste dans chaque thème, couleurs hors sRGB |
| `node qp.mjs record <id>` | Enregistrer une tâche clé en la faisant dans un navigateur, au lieu de l'écrire |
| `node qp.mjs report` | Regénérer `.quality/report.html` : notes dans le temps, captures de chaque étape, constats de la revue |

## Ce qu'il vérifie

| Groupe | Domaines |
| --- | --- |
| Produit et expérience | Produit, Fonctionnalités, UX, Contenu, Support |
| Ergonomie | Ergonomie et architecture de l'information : effort par tâche, réglages visibles à la fois, aperçu et action principale à portée, choix jamais écrasés, références de DESIGN.md suivies, revue heuristique |
| Design et accessibilité | UI, AI slop, Responsive, Accessibilité, Compatibilité, Finitions, Identité et contenu vrai |
| Sécurité et données | Sécurité, Confidentialité, Données, Conformité |
| Fiabilité et qualité du code | Fiabilité, Tests, Code |
| Performance et visibilité | Performance, SEO et meta, Scalabilité |
| Intégrations, paiements et coûts | Intégrations, Paiements, Coûts |
| SaaS | Comptes, équipes et accès (cloisonnement entre clients, rôles, invitations) ; Abonnements (essai, limites, paiement échoué, résiliation, factures) ; Activation et relation client |
| Application mobile installée | Expérience mobile native (tâches jouées sur appareil, règles des plateformes, hors-ligne) ; Publication sur les stores et sécurité mobile |
| Application de bureau | Expérience de bureau (fenêtre, menus, raccourcis, fichiers, hors-ligne, aucun travail perdu) ; Publication et sécurité de bureau (isolation entre la page et le système, signature, mises à jour) |
| Exploitation | Infra, Déploiement, Monitoring, Sauvegardes |

Toutes les règles et vérifications sont détaillées dans [docs/fr/REFERENTIEL.md](docs/fr/REFERENTIEL.md).

### Notation

- Chaque vérification est **bloquante** (5 points), **majeure** (3) ou **mineure** (1). Réussie = tous les points, partielle = la moitié, en échec ou non vérifiée = aucun.
- Deux notes : **Expérience** (produit, fonctionnalités, UX, contenu, support, ergonomie, UI, AI slop, responsive, accessibilité, compatibilité, finitions, identité, performance, activation, expérience mobile) et **Technique et exploitation** (sécurité, confidentialité, données, conformité, fiabilité, tests, code, SEO, scalabilité, intégrations, paiements, coûts, infra, déploiement, monitoring, sauvegardes, comptes et accès, abonnements, publication mobile).
- Un point bloquant en échec plafonne son domaine à 3/10 et la note dont il relève à 5,9/10, pas l'autre.
- Chaque note pondère ses domaines selon le type de projet : `vitrine`, `webapp`, `saas`, `mobile`, `desktop` ou `api`. Les domaines sans objet (les paiements pour un site vitrine, par exemple) sont ignorés.
- La note d'ensemble (tous les domaines) reste dans le rapport pour l'historique ; elle est plafonnée à 5,9/10 dès qu'un point bloquant est ouvert.
- Les constats critiques de la revue d'ergonomie font échouer ERG-09, les majeurs le plafonnent à « partiel ». La contre-vérification ne peut que baisser un résultat, preuve à l'appui.

## Design

Sept skills se chargent quand Claude dessine ou retouche une interface :

| Skill | Ce qu'il fait | Ce qu'il vérifie |
| --- | --- | --- |
| `design-screens` | Organise un écran avant de le coder : nombre de panneaux selon la largeur, coquille (liste-détail, panneau d'appoint, flux), navigation, action principale, et une recette par tâche (éditeur avec aperçu, assistant, réglages, paiement, tableau de bord, filtres, formulaire, tableau, état vide, premier lancement), séparément pour téléphone et ordinateur | Les tâches clés jouées (`qp flows`) : budgets d'effort, aperçu visible, action sous le pouce |
| `design-direction` | Des références aimées (apparence et organisation, séparées) à 4 ou 5 mots d'ambiance, des principes testables, des style tiles, puis des tokens DTCG en OKLCH pour le clair et le sombre | `qp tokens` : contraste WCAG jamais arrondi dans chaque thème, format, couleurs hors sRGB ; `qp look` sur le rendu |
| `deslop-ui` | Rend une interface nette avant de la dire terminée : mesure l'espacement, l'alignement, les boîtes, les contrôles et les signes d'interface générée sur le vrai rendu, avec captures, puis corrige à la racine | `qp deslop` : aucun constat « high », captures relues |
| `scroll-animation` | Construit les animations de scroll de tous types (apparition, défilement lié, progression, parallaxe, scène épinglée, section horizontale, texte, scrollytelling, magnétisme, séquence d'images, 3D, Lottie, transitions de page, smooth scroll) : le CSS natif d'abord, une bibliothèque libre seulement si besoin, toujours avec mouvement réduit | `qp look` : défilement natif, aucun texte qui dépend d'une animation, mouvement réduit respecté |
| `premium-craft` | Finit un écran pour que rien ne trahisse un travail rapide ou généré : états de chaque contrôle, typographie fine, ombres et rayons, attente sans clignotement, annulation, thème sombre construit, identité propre (polices, icônes, images, logo), textes précis et faits vérifiables | `qp craft` : aucun « must » en échec ; chaque « should » corrigé ou justifié dans DESIGN.md |
| `design-variants` | Pour les écrans qui portent le produit : trois versions vraiment différentes, mesurées, comparées deux à deux par un jury d'agents qui ne sait pas laquelle est laquelle ; tu choisis entre les finalistes, puis le meilleur des autres est repris et un directeur artistique relit | `qp variants`, `qp gap` : chaque écart avec les références réduit ou justifié |
| `design-review` (`/qp:design-review`) | Avis sur un écran existant : mesures, revue heuristique (Nielsen, Bastien et Scapin) en deux passes, gravité de 0 à 4 confirmée par trois passes indépendantes, puis deux ou trois réorganisations avec leur écart d'effort (modèle KLM) | Le parcours rejoué avant et après |

Le rendu « fait par IA » se mesure par signaux pondérés (police par défaut, violet, dégradés, trois cartes identiques, badge au-dessus du titre, émojis en guise d'icônes, formules creuses…). Un signal seul n'est jamais un défaut, et les écrans d'application (mode `operate`) ne sont jamais pénalisés parce qu'ils sont conventionnels. Les sources sont listées dans [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

## SaaS, sécurité et application mobile

| Skill | Ce qu'il fait | Ce qu'il vérifie |
| --- | --- | --- |
| `from-zero` | Donne le chemin d'une idée à un produit lancé, en étapes avec une condition de passage chacune, et dit quel skill utiliser à chaque étape | La condition de chaque étape, montrée par une commande ou un livrable |
| `saas-foundations` | Construit le socle d'un SaaS dans le bon ordre : modèle de client et cloisonnement des données, comptes, rôles et invitations, abonnements (essai, limites, paiement échoué, résiliation, factures et TVA), emails de service, première session, export et suppression | `qp access` sans fuite, `qp auth`, parcours d'un compte neuf jusqu'à l'activation |
| `security-testing` | Teste la sécurité de ta propre application, en local ou en préproduction : modèle de menaces, contrôle d'accès joué à deux comptes, connexion, scan passif, chaîne d'approvisionnement, et ce qui reste à confier à un humain | `qp threats`, `qp access`, `qp auth`, `qp dast`, `qp supply` |
| `mobile-app` | Choisit l'approche (PWA, Capacitor, Expo, Flutter), applique les règles iOS et Android, joue les tâches clés sur appareil et relève ce qui bloque une publication sur les stores | `qp mobile flows`, `qp mobile check` |
| `desktop-app` | Construit et publie une application de bureau Tauri ou Electron qui se comporte comme telle (fenêtre, menus, raccourcis, fichiers, hors-ligne) sans exposer la machine : isolation entre la page et le système, commandes validées, signature, mises à jour signées | `qp desktop check`, `qp flows --attach` |
| `user-testing` | Prépare un test avec cinq vraies personnes de la cible et transforme les notes en corrections classées | Le compte rendu daté (critère ACT-06) |
| `seo-launch` | Choisit les recherches visées (une expression par page), écrit titres, descriptions et premiers paragraphes autour, construit sitemap.xml et robots.txt, puis te guide pour déclarer le site dans Google Search Console et y envoyer le sitemap | `qp seo` : aucun « must » en échec |

Trois choses restent humaines, et le pack le dit : savoir si quelqu'un veut du produit, regarder de vraies personnes l'utiliser, et un test d'intrusion indépendant avant les premiers clients payants. Les tests actifs (mots de passe faux, écritures) ne visent jamais la production.

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
| **Modèle des auditeurs** | `/qp:kickoff` propose Opus (recommandé) ou Fable pour les auditeurs. Les modèles plus petits ont donné de fausses preuves et sont restés sur l'écran vide lors d'audits réels : les économies se font plutôt avec les audits incrémentaux et les sorties compactes. |
| **Passage de relais** (`/qp:handoff`) | Une note de 60 lignes maximum permet à la session suivante de reprendre une longue tâche sans réexplorer le projet. Le hook de démarrage la signale automatiquement. |
| **Réponses courtes** | La méthode de travail demande des comptes rendus de deux ou trois lignes : pas de récapitulatif des étapes, pas de code recopié. |

Le rapport d'audit indique les tokens évités grâce aux sorties compactes. Pour la consommation totale d'une session, tape `/cost` (ou `/usage` selon ton abonnement) dans Claude Code.

### Selon la taille du projet et l'horizon

Taille mesurée en fichiers de code : `node qp.mjs graph` l'affiche, et `/qp:kickoff` s'en sert pour ses recommandations.

| Taille du projet | Court terme : une session | Moyen terme : quelques semaines de développement | Long terme : la vie du projet |
| --- | --- | --- | --- |
| **Petit** (moins de 60 fichiers de code) | Le pack suffit : règles à la demande, sorties compactes. Graphify n'apporte presque rien, une recherche directe coûte déjà peu. | `/qp:audit` incrémental après chaque fonctionnalité, `/qp:audit quick` avant chaque mise en ligne. | Un `/qp:audit full` par mois (forcé automatiquement après 30 jours). `/qp:handoff` pour les tâches sur plusieurs jours. |
| **Moyen** (60 à 400 fichiers) | Installer **Graphify** : Claude interroge le graphe du code au lieu de chercher et relire les fichiers. **RTK** si tes sessions sont longues. | Audits incrémentaux. `graphify hook install` garde le graphe à jour à chaque commit, sans tokens. | Historique des notes dans `.quality/`. Audit complet mensuel, `/qp:handoff` systématique en fin de session. |
| **Gros** (plus de 400 fichiers) | **Graphify fortement recommandé**, RTK recommandé. Lecture des fichiers par plages de lignes, jamais en entier. | Audits incrémentaux ou par groupe (`/qp:audit security-data`). `/qp:audit quick` pour les vérifications rapides. | Audits complets découpés par groupe sur plusieurs sessions. Handoff obligatoire : sans lui, chaque session repaie l'exploration du projet. |

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
  report.html           le même rapport à ouvrir dans un navigateur, avec les captures des tâches clés
  audits/<run>.json     chaque audit, pour suivre les notes dans le temps (2026-11-11, puis 2026-11-11-2 pour un deuxième audit le même jour)
  audits/<run>/flows/   les captures de chaque étape des tâches clés
  audits/<run>/logs/    les sorties complètes des commandes de l'audit
  fixes.md              journal des corrections faites par /qp:fix
  handoff.md            le passage de relais entre sessions (/qp:handoff)
DESIGN.md               la direction visuelle et les tokens de design
CLAUDE.md               une courte section « Quality pack » y est ajoutée
```

Commite `.quality/` pour garder l'historique des notes. Les captures d'écran et les logs sont lourds : ajoute `.quality/audits/*/screens/`, `.quality/audits/*/flows/` et `.quality/audits/*/logs/` à ton `.gitignore` (`/qp:kickoff` le fait).

## En cas de problème

| Problème | Solution |
| --- | --- |
| Les commandes `/qp:...` n'apparaissent pas | Redémarre Claude Code ou tape `/reload-plugins`. Regarde `/plugin` → **Installed** et l'onglet **Errors**. |
| `node: command not found` | Installe Node.js 18+ et vérifie que `node` est dans ton PATH. |
| L'ajout de la marketplace échoue | Vérifie que `git` est installé. Sans clé SSH GitHub, définis `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` et réessaie. |
| Les vérifications navigateur sont « non vérifiées » | Lance `qp.mjs browser-setup` (étape 4), et vérifie que l'appli tourne en local ou renseigne une URL de préproduction dans `.quality/project.json`. |
| Une tâche clé s'arrête à une étape | `flows.json` donne l'étape et l'erreur. Corrige le sélecteur dans `.quality/project.json` › `flows` (`qp.mjs flows --check` le valide), ou corrige le bug s'il est réel. |
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
