# Shipwright

*Celui qui construit jusqu’à la mise à l’eau.*

> Ce projet s'appelait **quality-pack** jusqu'à la version 0.7. Les commandes `/qp:…` deviennent `/sw:…` ; voir [Passer de quality-pack à Shipwright](#passer-de-quality-pack-à-shipwright).

**Français** · [English](README.en.md)

Des plugins pour [Claude Code](https://claude.com/claude-code) qui accompagnent un projet **de l'idée au lancement** : site vitrine, application web, SaaS, application de bureau ou mobile. Shipwright donne à Claude l'ordre de travail, les règles de chaque métier, et surtout de quoi **prouver** chaque étape : les tâches sont jouées, la sécurité est essayée, le rendu est mesuré.

**Ce qu'il fait**

- **Donne le chemin.** Le skill `from-zero` découpe un projet en étapes, chacune avec une condition de passage que l'on peut montrer : cadrage, socle (comptes, cloisonnement, menaces), première tâche de bout en bout, direction visuelle, écrans, paiement, finitions, lancement.
- **Construit ce qui coûte cher à rattraper.** Cloisonnement entre clients, rôles, abonnements, emails de service, référencement, règles des stores et des applications de bureau : un skill par sujet, chargé quand il sert.
- **Conçoit, puis compare.** Organisation des écrans par type de tâche, direction visuelle tirée de tes références, banque de 197 sites reconnus comme excellents pour 26 types de sites, plusieurs versions d'un écran départagées à l'aveugle par un jury avant que tu choisisses.
- **Joue au lieu de relire.** Tes tâches clés sur téléphone et ordinateur, le contrôle d'accès avec deux comptes, la connexion, les webhooks, le cycle d'abonnement, l'écran avec un réseau lent ou un serveur en panne.
- **Mesure le rendu dans un vrai navigateur.** Espacement, finitions, rendu générique « fait par IA », chargement sur téléphone ralenti, écart avec tes références.
- **Refuse l'inventé.** Aucun témoignage, chiffre, logo de client ou badge sans un fait que tu as fourni.
- **Note honnêtement.** 37 domaines, 247 critères, deux notes sur 10 (Expérience ; Technique et exploitation). Chaque critère exige une preuve, et un point bloquant ouvert plafonne la note.
- **Reste économe et discret.** Règles chargées à la demande, sorties compactes, audits incrémentaux. Gratuit, open source, sans télémétrie, en français et en anglais.

**Ce qu'il ne fait pas, et le dit**

- Il ne sait pas si quelqu'un veut de ton produit.
- Il ne remplace pas le fait de regarder cinq vraies personnes l'utiliser (le skill `user-testing` prépare ce test).
- Il ne remplace pas un test d'intrusion indépendant avant les premiers clients payants.
- Ses skills les plus récents n'ont pas encore été éprouvés sur beaucoup de projets réels : prends ses notes comme un garde-fou, pas comme un label.

## Documentation en ligne et agents IA

- Site de documentation : https://1angelmicka.github.io/quality-pack/
- Tu peux aussi confier l'installation à ton assistant IA : donne-lui le lien du repo ou dis-lui « installe shipwright en suivant https://github.com/1AngelMicka/quality-pack/blob/main/docs/AGENT_GUIDE.md ». Il trouvera [`llms.txt`](llms.txt) et le [guide pour agents](docs/AGENT_GUIDE.md).

## Le principe

```
/sw:kickoff  →  tu construis, étape par étape (from-zero)  →  /sw:audit  →  /sw:fix  →  lancement
```

| Moment | Ce qui se passe |
| --- | --- |
| `/sw:kickoff` | Claude lit ton projet et pose quelques questions : pour qui, quel type de projet, les tâches clés, le style voulu, les comptes de test, les menaces, les recherches visées. Il écrit `.quality/project.json`, `DESIGN.md` et le modèle de menaces. |
| Pendant que tu construis | Le skill `from-zero` dit où en est le projet et ce qui doit être vrai avant l'étape suivante. Claude charge les règles des domaines qu'il touche et le skill du sujet en cours (écrans, SaaS, sécurité, mobile, bureau, finitions, référencement). Un garde-fou empêche d'écrire un secret dans le code. |
| À chaque étape | Les commandes `sw` prouvent ce qui vient d'être fait : tâches jouées, accès essayé, rendu mesuré. Un échec arrête l'étape, pas seulement un rapport. |
| `/sw:audit` | La vue d'ensemble : scans automatiques, tâches clés jouées sur téléphone et ordinateur, un auditeur par groupe de domaines, un ergonome, une contre-vérification. Par défaut, seul ce qui a changé depuis le dernier audit est revérifié. Résultat : deux notes, des preuves, des priorités. |
| `/sw:fix` | Corrige les problèmes dans l'ordre, les points bloquants d'abord, et vérifie chaque correction. |
| `/sw:handoff` | Note où en est la tâche, pour que la session suivante reprenne sans réexplorer le projet. |

## Le chemin, étape par étape

C'est le skill `from-zero` qui le tient. Chaque étape se termine par quelque chose que l'on peut montrer, pas par une impression.

| # | Étape | Ce qui doit être vrai avant de continuer |
| --- | --- | --- |
| 0 | Promesse et preuve | Une phrase : pour qui, quel problème, quel résultat. Au moins un signe que quelqu'un en veut. |
| 1 | Cadrage | `/sw:kickoff` : profil, tâches clés, ce qui est hors périmètre. |
| 2 | Socle | Modèle de client et comptes de test ; `sw access` passe sur la première ressource ; modèle de menaces validé ; chaîne d'approvisionnement verrouillée. |
| 3 | Première tâche de bout en bout | La tâche principale marche avec de vraies données, sur téléphone et ordinateur (`sw flows`). |
| 4 | Direction visuelle | Attentes du type de site lues (`sw bank`), références mesurées, direction choisie par toi, polices et icônes sous licence notée. |
| 5 | Écrans | Chaque tâche clé dans ses budgets d'effort ; espacement sans défaut majeur (`sw deslop`). |
| 6 | Paiement | Règles écrites ; cycle d'abonnement joué (`sw billing`) ; webhooks forgés refusés ; résiliation en trois étapes. |
| 7 | Meilleure version, puis finitions | Écrans phares choisis parmi plusieurs versions ; `sw craft` et `sw stress` sans défaut bloquant sur chaque écran clé ; chaque chiffre relié à un fait. |
| 8 | Application mobile ou de bureau | Tâches jouées sur appareil ou dans la vraie fenêtre ; blocages de publication levés. |
| 9 | Personnes | Cinq personnes de la cible ont fait les tâches clés sans aide. |
| 10 | Lancement | Pages prêtes pour la recherche (`sw seo`), audit complet sans point bloquant, sauvegardes restaurées une fois, alertes qui arrivent à quelqu'un. |

Un prototype à montrer peut sauter des étapes ; le skill dit alors ce qui manque pour un vrai lancement.

## Installation

**Il te faut :** [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) 18 ou plus récent, et `git`.

**1. Ajoute la marketplace et installe le plugin principal.** Dans Claude Code, tape :

```
/plugin marketplace add 1AngelMicka/quality-pack
/plugin install sw@shipwright
```

**2. Installe les modules de ta techno** (choisis ceux que tu utilises) :

```
/plugin install sw-nextjs@shipwright      # Next.js, React, TypeScript, Tailwind
/plugin install sw-node-api@shipwright    # Fastify ou Express, Prisma, PostgreSQL, Redis, Socket.io
/plugin install sw-vps@shipwright         # Serveur auto-hébergé : Docker Compose, PM2, Nginx ou CloudPanel
/plugin install sw-expo@shipwright        # App mobile Expo ou React Native (iOS, Android)
/plugin install sw-capacitor@shipwright   # Webapp livrée en app iOS et Android avec Capacitor
/plugin install sw-tauri@shipwright       # Application de bureau Tauri
/plugin install sw-electron@shipwright    # Application de bureau Electron
```

**Sans taper de commande `/plugin`** (un agent ne peut pas les lancer lui-même) :

```bash
# A. Sans installation, depuis un clone du dépôt : lire les skills et lancer les commandes
node <clone>/plugins/core/scripts/sw.mjs skills          # la liste des skills et des agents
node <clone>/plugins/core/scripts/sw.mjs skill kickoff   # un skill, prêt à être suivi

# B. Écrire les réglages du projet : Claude Code proposera le plugin à la prochaine ouverture
#    (le proposer ne suffit pas toujours : accepter la marketplace ne l'installe pas forcément)
node <clone>/plugins/core/scripts/sw.mjs enable --modules nextjs,vps

# C. Installation complète par l'agent, quand tu la lui demandes (marketplace, plugin, modules détectés
#    ou déclarés dans .quality/project.json) : le chemin sûr
node <clone>/plugins/core/scripts/sw.mjs install
# puis tu tapes /reload-plugins : c'est la seule chose qu'un agent ne peut pas faire à ta place

# Vérifier ce qui est vraiment installé et activé pour le projet (lecture seule)
node <clone>/plugins/core/scripts/sw.mjs doctor
```

Avec B, la marketplace peut être ajoutée à la réouverture sans que le plugin `sw@shipwright` soit installé : aucune commande `/sw:`, aucun skill, aucun hook. C est le chemin sûr ; `sw.mjs doctor` dit où on en est.

Le détail est dans le [guide pour agents](docs/AGENT_GUIDE.md).

**3. Redémarre Claude Code** (ou tape `/reload-plugins`), ouvre ton projet et lance :

```
/sw:kickoff
```

**4. Pour les tâches clés et les vérifications navigateur**, une fois pour toutes (Claude te le propose au premier audit) :

```bash
node <dossier du plugin>/scripts/sw.mjs browser-setup
```

Playwright, axe-core et Chromium s'installent dans le cache du pack, pas dans ton projet. Si ton projet a déjà Playwright, il est utilisé. Sans eux, l'audit fonctionne quand même ; ces vérifications sont marquées « non vérifiées ».

**5. Facultatif, pour économiser des tokens sur les projets moyens et gros :** installe [Graphify](#outils-compagnons) (`/sw:kickoff` te le propose quand c'est utile).

### Installer pour toute une équipe

Dans le dossier du projet, lance une fois dans ton terminal, puis commite `.claude/settings.json` :

```bash
claude plugin marketplace add 1AngelMicka/quality-pack --scope project
claude plugin install sw@shipwright --scope project
```

Tes collègues reçoivent le pack en ouvrant le projet dans Claude Code et en faisant confiance au dossier.

### Mettre à jour

Tape `/plugin marketplace update shipwright` dans Claude Code. Pour les mises à jour automatiques : `/plugin` → **Marketplaces** → **shipwright** → **Enable auto-update**.

### Désinstaller

```
/plugin uninstall sw@shipwright
/plugin marketplace remove shipwright
```

Ton projet garde son dossier `.quality/` ; supprime-le si tu n'en veux plus.

### Passer de quality-pack à Shipwright

Le nom de la marketplace et le préfixe des commandes ont changé en 0.8.0. Dans Claude Code :

```
/plugin uninstall qp@quality-pack
/plugin marketplace remove quality-pack
/plugin marketplace add 1AngelMicka/quality-pack
/plugin install sw@shipwright
```

Fais de même pour chaque module (`qp-nextjs` devient `sw-nextjs`, etc.). Rien ne change dans tes projets : le dossier `.quality/` et ses fichiers restent valables. Le cache navigateur installé sous l'ancien nom continue d'être utilisé. L'adresse du dépôt GitHub n'a pas changé.

## Commandes

| Commande | Pour |
| --- | --- |
| `/sw:kickoff` | Configurer ou mettre à jour le profil qualité du projet |
| `/sw:audit` | Audit incrémental : seul ce qui a changé depuis le dernier audit est revérifié (complet au premier audit, après une mise à jour du pack, ou si le dernier audit complet a plus de 30 jours) |
| `/sw:audit quick` | Vérifications automatiques seulement, sans auditeurs : le moins cher, idéal avant une mise en ligne |
| `/sw:audit full` | Tout revérifier depuis zéro |
| `/sw:audit ergonomics` | Un seul groupe (`product-experience`, `ergonomics`, `design`, `security-data`, `reliability-quality`, `performance-seo`, `integrations-payments`, `saas`, `mobile`, `operations`) |
| `/sw:audit SEC-01 SEC-03` · `/sw:audit blockers` | Des critères précis, ou seulement les points bloquants |
| `/sw:fix` | Corriger les points bloquants (ou les 5 premiers problèmes) |
| `/sw:fix 10` · `/sw:fix SEC-02` · `/sw:fix ERG-R01` | Corriger les 10 premiers problèmes, un problème précis ou un constat de la revue d'ergonomie |
| `/sw:fix experience` | Corriger d'abord ce qui pèse sur la note Expérience |
| `/sw:handoff` | Écrire `.quality/handoff.md` avant de couper une longue tâche |
| `/sw:design-review [tâche ou URL]` | Avis sur un écran : effort mesuré, revue heuristique, deux ou trois réorganisations chiffrées |
| `node sw.mjs look <url>` | Mesurer le rendu : signaux de rendu générique pondérés, tailles de police, longueur des lignes, petites cibles |
| `node sw.mjs deslop <url>` | Mesurer l'espacement et l'alignement du rendu, élément par élément, à 375, 768, 1440 et 1920 px (Chrome ou Edge installé, rien à ajouter) |
| `node sw.mjs craft <url>` | Mesurer les finitions du rendu : détails typographiques, focus et survol, transitions, images, icônes, icône du site, image de partage, page 404 |
| `node sw.mjs stress <url>` | Passes de finition : l'écran avec un réseau lent, un serveur en panne, des textes trois fois plus longs, à 320 px, en thème sombre, au clavier seul, sans scripts |
| `node sw.mjs bank [type]` | Banque de références : par type de site, ce que les visiteurs attendent, des sites reconnus comme excellents avec la raison, ce qu'il faut éviter |
| `node sw.mjs profile <url> --save` · `gap <url>` | Mesurer le profil visuel de références, puis l'écart d'un écran avec elles ou avec la banque (`--type`) |
| `node sw.mjs variants <nom> <url> <url>…` | Plusieurs versions d'un écran : captures sous des lettres mélangées, mesures, paires pour un jury à l'aveugle ; `--tally` les classe |
| `node sw.mjs access` | Jouer le contrôle d'accès : chaque ressource déclarée est demandée par son propriétaire, puis par les comptes qui ne doivent pas l'atteindre. Code de sortie 2 en cas de fuite |
| `node sw.mjs auth` | Tester la connexion (local ou préproduction seulement) : même réponse pour un compte connu et inconnu, mots de passe faux en série ralentis ou refusés |
| `node sw.mjs dast [url]` | Scan passif de l'application avec OWASP ZAP dans Docker : en-têtes, cookies, fuites d'information, bibliothèques vulnérables |
| `node sw.mjs supply` | Lire la chaîne d'approvisionnement du dépôt : fichier de verrouillage, délai avant installation, scripts d'installation, actions de CI épinglées, fichiers .env |
| `node sw.mjs seo [url]` | Référencement : sitemap (présent, déclaré, sans adresse cassée), balises title et meta description de chaque page, mots-clés visés portés par leur page, Search Console |
| `node sw.mjs perf <url>` | Mesurer le chargement sur un téléphone ralenti : plus grand affichage, saut de mise en page, temps de blocage, poids de la page et des scripts |
| `node sw.mjs facts <url>` | Relever les chiffres, citations, noms de clients et badges affichés, et vérifier que chacun est relié à `.quality/facts.json` |
| `node sw.mjs webhooks` | Jouer les webhooks (local ou préproduction) : un événement non signé ou mal signé doit être refusé |
| `node sw.mjs billing` | Jouer le cycle d'abonnement en mode test Stripe avec une horloge de test : essai, premier paiement, renouvellement refusé, résiliation ; l'application est interrogée à chaque étape |
| `node sw.mjs mobile audit` | Android : lire l'écran affiché sur l'émulateur ou l'appareil (cibles tactiles, contrôles sans nom), avec captures en texte à 200 % et en thème sombre |
| `node sw.mjs desktop check` · `flows --attach <port>` | Application de bureau : lire dans le projet l'isolation, les permissions, la signature et les mises à jour ; jouer les tâches clés dans la vraie fenêtre |
| `node sw.mjs threats` | Vérifier le modèle de menaces (`.quality/threats.json`) : points d'entrée couverts, réponse et test pour chaque cas d'abus |
| `node sw.mjs mobile flows` · `mobile check` | App installée : jouer les tâches clés avec Maestro sur émulateur ou appareil ; lire dans le projet ce qui bloque une publication |
| `node sw.mjs tokens` | Vérifier les design tokens : format DTCG, références, contraste dans chaque thème, couleurs hors sRGB |
| `node sw.mjs record <id>` | Enregistrer une tâche clé en la faisant dans un navigateur, au lieu de l'écrire |
| `node sw.mjs report` | Regénérer `.quality/report.html` : notes dans le temps, captures de chaque étape, constats de la revue |

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
| `design-screens` | Organise un écran avant de le coder : nombre de panneaux selon la largeur, coquille (liste-détail, panneau d'appoint, flux), navigation, action principale, et une recette par tâche (éditeur avec aperçu, assistant, réglages, paiement, tableau de bord, filtres, formulaire, tableau, état vide, premier lancement), séparément pour téléphone et ordinateur | Les tâches clés jouées (`sw flows`) : budgets d'effort, aperçu visible, action sous le pouce |
| `design-direction` | Des références aimées (apparence et organisation, séparées) à 4 ou 5 mots d'ambiance, des principes testables, des style tiles, puis des tokens DTCG en OKLCH pour le clair et le sombre | `sw tokens` : contraste WCAG jamais arrondi dans chaque thème, format, couleurs hors sRGB ; `sw look` sur le rendu |
| `deslop-ui` | Rend une interface nette avant de la dire terminée : mesure l'espacement, l'alignement, les boîtes, les contrôles et les signes d'interface générée sur le vrai rendu, avec captures, puis corrige à la racine | `sw deslop` : aucun constat « high », captures relues |
| `scroll-animation` | Construit les animations de scroll de tous types (apparition, défilement lié, progression, parallaxe, scène épinglée, section horizontale, texte, scrollytelling, magnétisme, séquence d'images, 3D, Lottie, transitions de page, smooth scroll) : le CSS natif d'abord, une bibliothèque libre seulement si besoin, toujours avec mouvement réduit | `sw look` : défilement natif, aucun texte qui dépend d'une animation, mouvement réduit respecté |
| `premium-craft` | Finit un écran pour que rien ne trahisse un travail rapide ou généré : états de chaque contrôle, typographie fine, ombres et rayons, attente sans clignotement, annulation, thème sombre construit, identité propre (polices, icônes, images, logo), textes précis et faits vérifiables | `sw craft` : aucun « must » en échec ; chaque « should » corrigé ou justifié dans DESIGN.md |
| `design-variants` | Pour les écrans qui portent le produit : trois versions vraiment différentes, mesurées, comparées deux à deux par un jury d'agents qui ne sait pas laquelle est laquelle ; tu choisis entre les finalistes, puis le meilleur des autres est repris et un directeur artistique relit | `sw variants`, `sw gap` : chaque écart avec les références réduit ou justifié |
| `design-review` (`/sw:design-review`) | Avis sur un écran existant : mesures, revue heuristique (Nielsen, Bastien et Scapin) en deux passes, gravité de 0 à 4 confirmée par trois passes indépendantes, puis deux ou trois réorganisations avec leur écart d'effort (modèle KLM) | Le parcours rejoué avant et après |

Le rendu « fait par IA » se mesure par signaux pondérés (police par défaut, violet, dégradés, trois cartes identiques, badge au-dessus du titre, émojis en guise d'icônes, formules creuses…). Un signal seul n'est jamais un défaut, et les écrans d'application (mode `operate`) ne sont jamais pénalisés parce qu'ils sont conventionnels. Les sources sont listées dans [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

## SaaS, sécurité, référencement, applications de bureau et mobile

| Skill | Ce qu'il fait | Ce qu'il vérifie |
| --- | --- | --- |
| `from-zero` | Donne le chemin d'une idée à un produit lancé, en étapes avec une condition de passage chacune, et dit quel skill utiliser à chaque étape | La condition de chaque étape, montrée par une commande ou un livrable |
| `saas-foundations` | Construit le socle d'un SaaS dans le bon ordre : modèle de client et cloisonnement des données, comptes, rôles et invitations, abonnements (essai, limites, paiement échoué, résiliation, factures et TVA), emails de service, première session, export et suppression | `sw access` sans fuite, `sw auth`, parcours d'un compte neuf jusqu'à l'activation |
| `security-testing` | Teste la sécurité de ta propre application, en local ou en préproduction : modèle de menaces, contrôle d'accès joué à deux comptes, connexion, scan passif, chaîne d'approvisionnement, et ce qui reste à confier à un humain | `sw threats`, `sw access`, `sw auth`, `sw dast`, `sw supply` |
| `mobile-app` | Choisit l'approche (PWA, Capacitor, Expo, Flutter), applique les règles iOS et Android, joue les tâches clés sur appareil et relève ce qui bloque une publication sur les stores | `sw mobile flows`, `sw mobile check` |
| `desktop-app` | Construit et publie une application de bureau Tauri ou Electron qui se comporte comme telle (fenêtre, menus, raccourcis, fichiers, hors-ligne) sans exposer la machine : isolation entre la page et le système, commandes validées, signature, mises à jour signées | `sw desktop check`, `sw flows --attach` |
| `user-testing` | Prépare un test avec cinq vraies personnes de la cible et transforme les notes en corrections classées | Le compte rendu daté (critère ACT-06) |
| `seo-launch` | Choisit les recherches visées (une expression par page), écrit titres, descriptions et premiers paragraphes autour, construit sitemap.xml et robots.txt, puis te guide pour déclarer le site dans Google Search Console et y envoyer le sitemap | `sw seo` : aucun « must » en échec |

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
| **Sorties de commandes compactes** (`sw.mjs run`) | Les tests, le lint, le typage et les audits de dépendances écrivent leur log complet sur le disque. Claude ne reçoit que le code de sortie, les lignes d'erreur et la fin du log. Sur notre test, une sortie de 3 000 lignes passe d'environ 14 700 tokens à environ 190. |
| **Audit incrémental par défaut** | Seuls les critères que les fichiers modifiés (d'après Git) peuvent affecter sont revérifiés ; les autres sont repris du dernier audit et signalés comme tels. Si rien n'a changé, aucun auditeur n'est lancé. |
| **Mode rapide** (`/sw:audit quick`) | Seulement les vérifications automatiques, sans agent auditeur. |
| **Modèle des auditeurs** | `/sw:kickoff` propose Opus (recommandé) ou Fable pour les auditeurs. Les modèles plus petits ont donné de fausses preuves et sont restés sur l'écran vide lors d'audits réels : les économies se font plutôt avec les audits incrémentaux et les sorties compactes. |
| **Passage de relais** (`/sw:handoff`) | Une note de 60 lignes maximum permet à la session suivante de reprendre une longue tâche sans réexplorer le projet. Le hook de démarrage la signale automatiquement. |
| **Réponses courtes** | La méthode de travail demande des comptes rendus de deux ou trois lignes : pas de récapitulatif des étapes, pas de code recopié. |

Le rapport d'audit indique les tokens évités grâce aux sorties compactes. Pour la consommation totale d'une session, tape `/cost` (ou `/usage` selon ton abonnement) dans Claude Code.

### Selon la taille du projet et l'horizon

Taille mesurée en fichiers de code : `node sw.mjs graph` l'affiche, et `/sw:kickoff` s'en sert pour ses recommandations.

| Taille du projet | Court terme : une session | Moyen terme : quelques semaines de développement | Long terme : la vie du projet |
| --- | --- | --- | --- |
| **Petit** (moins de 60 fichiers de code) | Le pack suffit : règles à la demande, sorties compactes. Graphify n'apporte presque rien, une recherche directe coûte déjà peu. | `/sw:audit` incrémental après chaque fonctionnalité, `/sw:audit quick` avant chaque mise en ligne. | Un `/sw:audit full` par mois (forcé automatiquement après 30 jours). `/sw:handoff` pour les tâches sur plusieurs jours. |
| **Moyen** (60 à 400 fichiers) | Installer **Graphify** : Claude interroge le graphe du code au lieu de chercher et relire les fichiers. **RTK** si tes sessions sont longues. | Audits incrémentaux. `graphify hook install` garde le graphe à jour à chaque commit, sans tokens. | Historique des notes dans `.quality/`. Audit complet mensuel, `/sw:handoff` systématique en fin de session. |
| **Gros** (plus de 400 fichiers) | **Graphify fortement recommandé**, RTK recommandé. Lecture des fichiers par plages de lignes, jamais en entier. | Audits incrémentaux ou par groupe (`/sw:audit security-data`). `/sw:audit quick` pour les vérifications rapides. | Audits complets découpés par groupe sur plusieurs sessions. Handoff obligatoire : sans lui, chaque session repaie l'exploration du projet. |

### Outils compagnons

Ces outils ne sont pas inclus dans le pack : ce sont des projets séparés, installés à part. `/sw:kickoff` propose ceux qui conviennent à ton projet et ne les installe qu'avec ton accord.

| Outil | Quand | Ce qu'il apporte | Installation |
| --- | --- | --- | --- |
| [Graphify](https://github.com/Graphify-Labs/graphify) | Projets moyens et gros | Graphe du code construit en local, sans appel à un modèle d'IA. Claude pose une question (« où sont les routes d'API ? ») au lieu de relire les fichiers. Le pack le remet à jour avant chaque audit, sans tokens. | `uv tool install graphifyy` (ou `pipx install graphifyy`), puis `graphify install --project` |
| [RTK](https://github.com/rtk-ai/rtk), édition `rtk-oss` | Longues sessions | Compresse la sortie des commandes courantes (git, tests, ls) avant que Claude la lise. Télémétrie désactivée par défaut. Prends l'édition `rtk-oss`, entièrement sous licence Apache 2.0. | `brew install rtk-ai/tap/rtk-oss`, puis `rtk init -g` |
| [Cloudflare security-audit](https://github.com/cloudflare/security-audit-skill) | Comptes, paiements, données personnelles | Audit de sécurité approfondi pour les versions majeures (critère SEC-11). Très complet mais gourmand : à lancer avant une sortie, pas tous les jours. | `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit` |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Sites vitrines | Méthode de design poussée contre le rendu générique, pour les sites marketing. | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |
| [reanimate](https://github.com/NiazMorshed2007/reanimate) | Animation précise à reproduire | Filme une animation de référence et la reconstruit en mesurant l'écart. Pour s'inspirer, jamais pour copier le site d'un autre. | `npx skills add NiazMorshed2007/reanimate -g` |

**Écartés après étude**, malgré leur intérêt :
- **claude-mem** : des hooks sur tous les événements et une télémétrie activée par défaut. `/sw:handoff` couvre le besoin plus simplement.
- **Context Mode** : licence non open source (Elastic 2.0) et des hooks sur presque tous les outils ; il fait doublon avec RTK.
- **Headroom** : une télémétrie activée par défaut, et il fait doublon avec RTK.
- **Caveman** : une télémétrie qui inclut l'adresse IP, et un mode qui envoie tes demandes à un service en ligne. Son idée utile, des réponses courtes, est reprise dans la méthode de travail du pack.

## Ce qu'il crée dans ton projet

```
.quality/
  project.json          le profil du projet (écrit par /sw:kickoff)
  AUDIT.md              le dernier rapport d'audit
  report.html           le même rapport à ouvrir dans un navigateur, avec les captures des tâches clés
  audits/<run>.json     chaque audit, pour suivre les notes dans le temps (2026-11-11, puis 2026-11-11-2 pour un deuxième audit le même jour)
  audits/<run>/flows/   les captures de chaque étape des tâches clés
  audits/<run>/logs/    les sorties complètes des commandes de l'audit
  fixes.md              journal des corrections faites par /sw:fix
  handoff.md            le passage de relais entre sessions (/sw:handoff)
DESIGN.md               la direction visuelle et les tokens de design
CLAUDE.md               une courte section « Shipwright » y est ajoutée
```

Commite `.quality/` pour garder l'historique des notes. Les captures d'écran et les logs sont lourds : ajoute `.quality/audits/*/screens/`, `.quality/audits/*/flows/` et `.quality/audits/*/logs/` à ton `.gitignore` (`/sw:kickoff` le fait).

## En cas de problème

| Problème | Solution |
| --- | --- |
| Les commandes `/sw:...` n'apparaissent pas | Redémarre Claude Code ou tape `/reload-plugins`. Regarde `/plugin` → **Installed** et l'onglet **Errors**. |
| `node: command not found` | Installe Node.js 18+ et vérifie que `node` est dans ton PATH. |
| L'ajout de la marketplace échoue | Vérifie que `git` est installé. Sans clé SSH GitHub, définis `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` et réessaie. |
| Les vérifications navigateur sont « non vérifiées » | Lance `sw.mjs browser-setup` (étape 4), et vérifie que l'appli tourne en local ou renseigne une URL de préproduction dans `.quality/project.json`. |
| Une tâche clé s'arrête à une étape | `flows.json` donne l'étape et l'erreur. Corrige le sélecteur dans `.quality/project.json` › `flows` (`sw.mjs flows --check` le valide), ou corrige le bug s'il est réel. |
| Une écriture est bloquée comme secret | Mets la valeur dans une variable d'environnement. Si ce n'est vraiment pas un secret, ajoute `qp-allow-secret` en commentaire sur la ligne. |
| L'audit incrémental refait tout | C'est voulu au premier audit, après une mise à jour du pack, si le dernier audit complet a plus de 30 jours, ou hors d'un dépôt Git. |
| Graphify n'est pas utilisé | Vérifie `graphify --version`, puis `node <chemin du plugin>/scripts/sw.mjs graph` dans ton projet. |

## Confidentialité et sécurité

Le pack n'envoie aucune télémétrie. Pendant un audit, il ne contacte que les URL de ton propre projet. Les hooks tournent en local et sont assez courts pour être relus : [garde-fou anti-secrets](plugins/core/scripts/hooks/secrets-guard.mjs), [rappel de session](plugins/core/scripts/hooks/session-start.mjs). Pour signaler une faille, voir [SECURITY.md](SECURITY.md).

Le pack aide à repérer les obligations légales (RGPD, mentions légales, licences) ; il ne remplace pas l'avis d'un juriste.

## Contribuer

Idées, bugs et nouveaux modules de techno sont les bienvenus : voir [CONTRIBUTING.md](CONTRIBUTING.md). Prévus : Expo / React Native, Laravel, Astro et un module de conformité française.

## Crédits et licence

Conçu après l'étude de 27 projets Claude Code, crédités dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Licence MIT.
