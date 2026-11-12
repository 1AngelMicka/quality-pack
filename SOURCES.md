# Liens examinés

Tous les liens partagés, testés ou utilisés pour le pack, avec leur statut. Les sources des règles des skills design (normes, études) sont dans [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

Règle : rien de payant, de verrouillé (freemium) ni de non redistribuable n'est recommandé. Ces liens n'apparaissent qu'ici, dans « Écartés », avec la raison. Les licences et les prix ont été vérifiés le 2026-11-11 ; ils changent : revérifier avant de s'en servir.

Statuts :
- **Intégré** : une idée ou une valeur reprise dans le pack (avec crédit, sans copie de texte).
- **Compagnon** : proposé par `/sw:kickoff`, installé seulement avec l'accord de l'utilisateur.
- **Référence libre** : gratuit, sans compte, utile pour trouver des références (skill `design-direction`).
- **Utilisable en projet** : code ou ressource sous licence libre, qu'un projet peut employer. Le pack ne l'embarque pas.
- **Référence seulement** : à regarder, pas à copier (licence absente, restrictive ou inconnue).
- **Écarté** : payant, freemium, non redistribuable, hors sujet ou non vérifiable.

## Lot 1 — signets X « Design, UI/UX, frontend » (57 posts, 2026-11-11)

Posts lus un par un. Beaucoup répètent les mêmes listes de sites (souvent promotionnelles) ; les tutoriels vidéo sans lien et les anecdotes n'apportent rien d'intégrable.

### Skills et outils pour agents

| Lien | Ce que c'est | Licence, prix | Statut |
| --- | --- | --- | --- |
| [heydamir/unslop](https://github.com/heydamir/unslop) | Skill « unslop » : audit, direction, passes de correction, valeurs précises d'espacement, d'ombres et de couleurs | CC BY 4.0, gratuit | **Intégré** : valeurs d'élévation clair/sombre, accent rare (avec crédit) |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | Skill design de Together AI : 50 thèmes, `sloplint --render` à 8 largeurs, relecture à contexte neuf, `redesign` qui vérifie que chaque lien, champ et action survit | MIT, gratuit | **Intégré** : garde de refonte (`sw look --baseline`, REV-09) |
| Tobi Adonadon, article « How to Stop Making your Apps Look Like AI Slop » | Skill de refonte d'apps : concept, 3 directions, rendu iPhone, critique anti-slop | pas de dépôt public, envoyé par e-mail, Mac | **Intégré** (idée : concept tiré du monde du produit, 3 directions) ; outil écarté, non inspectable |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Skill pour sites vitrines avec vérification à 5 largeurs et hook Stop | MIT, gratuit | Déjà étudié (0.5.0) ; reste compagnon pour les vitrines. Appels réseau (jsDelivr, Wikimedia, picsum, Google Fonts) |
| [tasteskill/tasteskill](https://github.com/tasteskill/tasteskill) | Copie figée de l'ancienne Taste Skill, auteur changé, URL d'installation cassée | MIT (copie non officielle) | **Écarté** : copie non officielle |
| [anthropics/skills — frontend-design](https://github.com/anthropics/skills) | Skill officiel d'Anthropic (4 posts le citent) | Apache-2.0 | Déjà étudié (0.5.0) |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Base de palettes, polices, règles | MIT | Déjà étudié (0.5.0) |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Commandes de critique, détecteur | Apache-2.0 | Déjà étudié (0.5.0) |
| [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) | Design en chinois d'abord : 6 vignettes → 3 directions, sorties HTML/PPTX/MP4, captures Playwright | MIT (autocollants de démo sous PolyForm Shield) | Référence seulement |
| [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) | 273 skills de designer, instructions seulement | MIT | Référence seulement |
| [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | Principes de motion, tableaux de durées et d'easing | MIT | Référence seulement (utile pour Ultimate Motion Design) |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 8 skills GSAP ; poussent à « recommander GSAP » | skills MIT ; GSAP gratuit mais licence propriétaire Webflow, non open source | Référence seulement |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) et getdesign.md | 84+ DESIGN.md extraits de sites de marques | dépôt MIT, mais ne licencie ni l'identité des marques ni leurs polices | Référence seulement pour le format ; ne jamais réutiliser l'identité d'une marque (règle ajoutée à `design-direction`) |
| [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) (Framelink) | MCP qui donne à Claude la mise en page d'une maquette Figma | MIT, gratuit (jeton Figma) ; télémétrie active par défaut | **Compagnon** (si maquettes Figma), télémétrie à couper |
| [finktheartist/pixel-worlds](https://github.com/finktheartist/pixel-worlds) | Composants pixel art (indicateur de mot de passe animé) et un skill qui capture des images d'animation | MIT | Référence seulement |
| React Doctor ([millionco/react-doctor](https://github.com/millionco/react-doctor)) | Audit déterministe du code React (score sur 100), skill, GitHub Action | « Modified MIT » non libre : interdit sans accord dans les chaînes d'entraînement ou d'évaluation d'IA ; télémétrie active | **Écarté** : licence restrictive |
| [ceilf6/FrontAgent](https://github.com/ceilf6/FrontAgent) | Plateforme d'agent frontend complète | MIT | **Écarté** : hors sujet |
| [nexu-io/open-design](https://github.com/nexu-io/open-design) (open-design.ai) | Studio de bureau où l'agent écrit des prototypes HTML | Apache-2.0 ; analytics actives par défaut ; offres hébergées payantes | Référence seulement |
| neuform.ai | Pages et DESIGN.md générés | propriétaire, payant après essai | **Écarté** : payant |
| styles.refero.design | 2 000+ styles DESIGN.md tirés de sites, MCP | freemium, MCP réservé au Pro | **Écarté** : freemium |
| designeng.tools | Annuaire de ressources (catégorie skills vide) | — | Référence seulement |
| skill-issue.in | Annuaire de skills classés, sans dépôt | gratuit | Référence seulement |
| Outil « navigateur live dans Claude Code » (Om Patel, avril 2026) | Cliquer un élément pour le modifier | introuvable | **Écarté** : non identifié. L'app Claude a son propre panneau navigateur depuis avril 2026 |
| [NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate) | Recrée une animation vue ailleurs | MIT | Déjà **compagnon** |
| [Graphify](https://github.com/Graphify-Labs/graphify) | Graphe du code | MIT | Déjà **compagnon** |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender), [EL4CTEO/blender-skills](https://github.com/EL4CTEO/blender-skills) | Vidéo depuis HTML, Blender piloté par Claude | — | Hors sujet pour shipwright (vidéo, 3D) ; à voir pour Ultimate Motion Design |
| Google DESIGN.md (spec ouverte, avril 2026) | Format de règles de design pour agents | Apache-2.0 | Déjà intégré (format de `DESIGN.md`) |

### Composants, animations, 3D

| Lien | Ce que c'est | Licence, prix | Statut |
| --- | --- | --- | --- |
| [microkit.co](https://microkit.co) | 55 micro-interactions React/CSS, gère le mouvement réduit | MIT, gratuit | Utilisable en projet |
| [evilcharts.com](https://evilcharts.com) | Graphiques animés shadcn (Recharts), gère le mouvement réduit | MIT, gratuit | Utilisable en projet |
| [motion-lexicon.pages.dev](https://motion-lexicon.pages.dev) | 100 composants de motion React + un skill | MIT ; pas de gestion du mouvement réduit trouvée | Utilisable en projet (ajouter le mouvement réduit) |
| [uiverse.io](https://uiverse.io) | Éléments CSS/Tailwind de la communauté | MIT (README du dépôt) | Utilisable en projet, extrait par extrait |
| [glass.samasante.com](https://glass.samasante.com) (`@samasante/liquid-glass`) | Effet verre qui réfracte la page, sans dépendance | MIT | Utilisable en projet (réfraction réelle : Chrome et Edge seulement) |
| [3dsvg](https://github.com/renatoworks/3dsvg) (3dsvg.design) | SVG ou texte → composant 3D React, export 4K, vidéo, GLB | MIT, gratuit | Utilisable en projet (identifié pour le post de @karlarboledas) |
| [3dicons.co](https://3dicons.co) | 1 500+ icônes 3D | CC0 (jeu gratuit) | Utilisable en projet |
| [kapishdima/soundcn](https://github.com/kapishdima/soundcn) | 700+ sons d'interface | code MIT, sons surtout CC0 ; 110 sons World of Warcraft non commerciaux | Utilisable en projet, **sans** les sons WoW |
| [crafterui.com](https://crafterui.com) | Composants de motion Tailwind | MIT ; très petit projet | Utilisable en projet |
| [React Bits](https://github.com/DavidHDev/react-bits) | Composants animés React | MIT + Commons Clause | Utilisable dans une app, **pas redistribuable** (jamais dans un kit ou un plugin) |
| reactdrops.dev | Effets React | licence maison ReactDrops | Utilisable dans une app, pas redistribuable |
| backgrounds.supply | 1 839 fonds | propriétaire, 49 $ ; quelques fonds gratuits | **Écarté** : payant |
| library.aimran.es | 814 composants animés | aucune licence | Référence seulement |
| beyond-media.ai/aiweb-design (« Motion Atlas ») | Atlas de 200 sites de motion avec prompts | aucune licence, gratuit | Référence seulement |
| Casberry (particles.casberry.in) | Image ou dessin → particules 3D, export React/three.js | ni licence ni conditions trouvées | Référence seulement |
| rewampui.com | Composants Framer Motion et three.js | pas de LICENSE ; le README dit que les designs ne sont pas originaux | **Écarté** |
| 21st.dev | Place de marché de composants, MCP | conditions qui interdisent redistribution et entraînement ; freemium | **Écarté** : freemium, conditions restrictives |
| motionkitui.com | 186 composants React + Motion | gratuit sans licence, Plus payant | **Écarté** : freemium sans licence |
| bencho.dev | Micro-interactions et sons | licence non vérifiée, Pro 99 €/an | **Écarté** : freemium |
| scrolltide.co (6 posts) | Prompts et composants 3D et scroll | propriétaire, 39 $/mois à 299 $ à vie ; 145 modèles, pas « 600+ » | **Écarté** : payant, promotion répétée |
| scrollshaders.com | Fonds WebGL animés | propriétaire, payant | **Écarté** : payant (idée retenue : image fixe en mouvement réduit, pause hors écran) |
| motionsites.ai, studio.motionsites.ai | Prompts de sites animés, générateur de sites | propriétaire, payant | **Écarté** : payant |
| jiro.build | 1 400+ modèles de prompts | propriétaire, freemium | **Écarté** : freemium |
| grainient.supply | Dégradés et outil de shaders | propriétaire, payant | **Écarté** : payant |
| unicorn.studio | Éditeur WebGL sans code | SDK propriétaire ; gratuit non commercial | **Écarté** |
| aligncanvas.com | Image → boucle 3D | propriétaire, freemium | **Écarté** : freemium |
| sceneai.art | Scènes 3D et fonds | propriétaire, payant | **Écarté** : payant |

### Galeries de références

| Lien | Ce que c'est | Accès | Statut |
| --- | --- | --- | --- |
| [navbar.gallery](https://navbar.gallery) | Barres de navigation de vrais sites | gratuit (sponsor Mobbin) | Référence libre |
| [footer.design](https://footer.design) | Pieds de page de vrais sites | gratuit | Référence libre |
| [recent.design](https://recent.design) (ancien godly.website) | Sélection quotidienne de sites | gratuit, cartes sponsorisées | Référence libre |
| [good-web-design.com](https://good-web-design.com) | 8 657 sites réels (japonais) | gratuit | Référence libre |
| [designforb2b.com](https://designforb2b.com) | 102 sites B2B réels | gratuit | Référence libre |
| [supahero.io](https://supahero.io) | ~500 sections hero, surtout de vrais sites | gratuit | Référence libre |
| cta.gallery | Appels à l'action, mêlés à des modèles vendus | gratuit | Référence libre, faible |
| inspora.design | Fil de travaux visuels, concepts mêlés au réel | gratuit | Référence libre, faible |
| saaspo.com | Sites SaaS réels | gratuit selon des tiers (non vérifié, 403) | Non vérifié |
| mobbin.com | Écrans d'apps réels | freemium (Pro 10 à 15 $/mois) | **Écarté** : freemium |
| land-book.com | Landing pages | freemium (non vérifié, 403) | **Écarté** : freemium |
| 60fps.design | Animations d'apps | freemium | **Écarté** |
| appllama.io | Écrans iOS | freemium | **Écarté** |
| appshots.design, screensdesign.com | Écrans d'apps | Pro payant | **Écarté** |
| refero.design | Écrans web et iOS | freemium | **Écarté** |
| landdding.com | Landing pages (réseau Azwedo) | freemium | **Écarté** |
| appkittie.com | Veille marketing d'apps, pas une galerie | payant | **Écarté** |
| horizonx.so | Kits UI | payant | **Écarté** |
| brandguidelines.net, posts.design | Chartes de marque, posts sociaux | gratuit | **Écarté** : hors sujet (pas des écrans) |
| templens.com | Recherche de modèles | gratuit | **Écarté** : modèles seulement |
| on.design | Communauté sur invitation | — | **Écarté** : hors sujet |
| wonderlist.design | Vente de modèles Figma (réseau Azwedo) | payant, affiliation | **Écarté** : commercial |

### Polices, icônes, outils de génération

| Lien | Accès | Statut |
| --- | --- | --- |
| fontshare.com | gratuit pour usage commercial sous licence maison, redistribution des fichiers interdite | **Écarté** : non redistribuable (préférer les polices sous licence OFL) |
| fontinlogo.com, iconly.design | freemium (réseau Azwedo) | **Écarté** |
| Google Stitch (stitch.google.com) | gratuit avec crédits quotidiens | Hors sujet (générateur) ; son format DESIGN.md est déjà intégré |
| v0.app, magicpatterns.com, uizard.io, base44.com, iter0.com, recraft.ai, banani.co, relume.io, visily.ai, modulify.ai | freemium | **Écarté** : freemium |
| remove.bg | gratuit en basse définition et usage personnel | **Écarté** : freemium |
| shotbase.com | payant après essai | **Écarté** : payant |
| Website to App (Shipper, @chhddavid) | mobile réservé au Pro | **Écarté** : freemium |
| domaingrowth.co | vente de liens SEO sur des sites de design (probablement le réseau Azwedo) | **Écarté** : spam |

### Posts sans lien exploitable

Tutoriels vidéo (n0tisma, bernirov, twetsfyp, viktoroddy ×2, SilenceCaPrompt), anecdotes (cluelessdone, sonuv_dev « glass UI », samuelrizzondev portfolio), annonces de produits (Claude Design, Google Stitch), comparatif vidéo [Benjamin Code](https://youtu.be/yjAVeHeviXY) (Claude, Gemini, Codex, Kimi). Deux conseils retenus sous forme de règle : « savoir ce qui est beau avant de dire construis un site » (Aykut Üçeş, déjà au cœur de `design-direction`) et « pas de colonnes dans les menus mobiles » (Zander Whitehurst, ajouté à `design-screens`). Un fichier Figma de widgets « Live Activity » (abu_uiuxdesign) est vendu via Polar : écarté.

Réseaux à connaître : Azwedo (landdding, modulify, wonderlist, fontinlogo, iconly) et le groupe ScreensDesign (supahero, appshots) se citent entre eux ; navbar.gallery et 60fps.design portent des liens d'affiliation Mobbin.

## Lot 2 — animations de scroll (recherche du 2026-11-11)

Quatre recherches : bibliothèques JavaScript, techniques CSS natives, ressources pour agents, UX/accessibilité/galeries. Ce qui est retenu est dans le skill `scroll-animation` (`plugins/core/skills/scroll-animation/`), avec les recettes de code et le catalogue détaillé.

### Recommandés (gratuits, licence libre ou standard du web)

| Lien | Rôle | Licence |
| --- | --- | --- |
| CSS scroll-driven animations, View Transitions, scroll snap (MDN, Chrome for Developers, web.dev, WebKit) | premier choix pour presque tous les effets (Baseline octobre 2026) | standards ; MDN code CC0 |
| [scroll-driven-animations.style](https://scroll-driven-animations.style) | démos, visualiseurs, cours gratuit, extension DevTools | Apache-2.0 |
| [Motion](https://motion.dev), son llms.txt et son MCP gratuit | scroll(), useScroll, inView | MIT (Motion+ payant : écarté) |
| [GSAP](https://gsap.com) et [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | ScrollTrigger, SplitText, ScrollSmoother | gratuit, licence propriétaire Webflow (interdit dans les constructeurs visuels concurrents) ; skills MIT |
| [Lenis](https://github.com/darkroomengineering/lenis) 1.3.27+ | smooth scroll, pages vitrines seulement | MIT |
| [Scrollama](https://github.com/russellsamora/scrollama) | scrollytelling par étapes | MIT |
| [three.js](https://threejs.org), [drei](https://github.com/pmndrs/drei), [r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig), [pmndrs/examples](https://github.com/pmndrs/examples) | scènes 3D au scroll | MIT |
| [dotLottie web](https://github.com/LottieFiles/dotlottie-web) | Lottie piloté par le scroll | MIT |
| [Swup](https://swup.js.org) + plugin a11y, Astro view transitions | transitions de page accessibles | MIT |
| VueUse, motion-v, Svelte (transitions, svelte-inview) | équivalents Vue et Svelte | MIT |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | goût et revue du mouvement, retrait des animations en trop | MIT |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) `gsap-framer-scroll-animation` | références ScrollTrigger et Motion avec mouvement réduit | MIT |
| [NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate) | recrée et compare une animation par position de scroll | MIT (déjà compagnon) |
| Galeries gratuites : [Awwwards](https://www.awwwards.com) (catégorie Scrolling), [Httpster](https://httpster.net), [recent.design](https://recent.design), [Motion Atlas](https://beyond-media.ai/aiweb-design), [GSAP showcase](https://gsap.com/showcase/), [CodePen](https://codepen.io) (pens publics MIT), [One Page Love](https://onepagelove.com), [Minimal Gallery](https://minimal.gallery) | références de sites animés | accès libre |

### Utilisables avec précaution

simpleParallax 7, react-spring, Anime.js v4, react-scroll-parallax, Rive runtime (éditeur freemium), Taxi.js (BSD-3), Splitting.js (ajouter l'ARIA), Swiper (carrousels), scrolly-video (pré-1.0), drei ScrollControls (clavier et ancres non gérés), Spline (runtime sans licence déclarée), [Codrops](https://tympanus.net/codrops/) (démos MIT sauf mention, vérifier chaque dépôt), React Bits et Animate UI (MIT + Commons Clause : dans une app seulement, jamais redistribués), Magic UI, Cult UI, motion-primitives, Aceternity UI gratuit (souvent sans mouvement réduit), gabros20/scroll-animation-skill et MengTo/Skills (MIT, récents ou inégaux), LottieFiles/motion-design-skill (MIT, une seule ligne sur le scroll).

### Écartés

| Lien | Raison |
| --- | --- |
| fullPage.js, ScrollReveal | GPL-3.0 ou licence commerciale payante |
| Locomotive Scroll v5 | embarque un Lenis sans mouvement réduit |
| Theatre.js | arrêté depuis 2024 ; studio sous AGPL-3.0 |
| AOS, Sal.js, ScrollOut, Rellax, Pageable, SplitType, ScrollMagic v2, lottie-interactivity, smooth-scrollbar | abandonnés, archivés ou faux défilement |
| flackr/scroll-timeline (polyfill, Apache-2.0) | inutile depuis Safari 26 et Firefox 159, tourne sur le fil principal |
| Motion+, Aceternity All-Access, Magic UI Pro, Josh W. Comeau « Whimsical Animations », cours Frontend Masters | payants |
| scrolltide.co, motionsites.ai, jiro.build, scrollshaders.com | bibliothèques de prompts payantes |
| oso95/scroll-world, roeea2/scroll-site-claude, nateherkai/scroll-craft | dépendent de génération vidéo payante |
| davila7 `scroll-experience`, freshtechbro/claudedesignskills, dylantarre/animation-principles | sans mouvement réduit ou périmés |
| LottieFiles MCP | demande un compte, rien sur le scroll de page |
| Land-book, Mobbin, Refero, Lapa Ninja (modèles payants) | freemium |
| Siteinspire, The FWA, SaaS Landing Page, Made in Webflow | modèle d'accès non vérifié |

## Lot 3 — de zéro à un SaaS lancé (recherche du 2026-11-12)

Quatre recherches : ce qui est propre à un SaaS, les tests de sécurité de sa propre application, l'application mobile installée, et ce qui donne un rendu soigné. Même méthode que pour les lots précédents : chaque source est lue, sa licence et son prix sont notés, rien de payant ni de non redistribuable n'est recommandé, et aucun texte n'est copié (les règles sont reformulées ; les standards sont cités par identifiant).

Les tableaux ci-dessous sont en anglais, comme les fiches de référence des skills qu'ils documentent. Statuts : *used as a rule* (une règle en vient), *recommended* (outil ou ressource conseillé), *cited only* (cité, licence qui ne permet pas la reprise), *excluded* (écarté, avec la raison). « not verified » signale une licence ou un fait qui n'a pas été relu sur la source d'origine.

Les 242 liens des fiches et de ce lot ont été testés le 2026-11-12 : tous répondent (six refusent les robots : Légifrance, economie.gouv.fr, Unsplash, Pexels, Openverse, Indian Type Foundry).

### SaaS : comptes, abonnements, emails (skill `saas-foundations`)

#### Standards, documentation and legal sources

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS), chapters V6, V7, V8 | requirement IDs for authentication, sessions, authorisation | CC BY-SA 4.0 (IDs only, no text copied) | rule [V] |
| [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | isolation rules, cache, jobs, files, tests | CC BY-SA (OWASP Cheat Sheet Series; summarised) | rule [V] |
| [OWASP API Security Top 10 2023, API1](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) | object-level authorisation | CC BY-SA | rule [V] |
| [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) | reset flow rules | CC BY-SA | rule [V] |
| OWASP WSTG-ATHZ-04 | two-user ID-swap method | CC BY-SA | cited [U] (page moved, not fetched) |
| [PostgreSQL manual, row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | RLS behaviour and bypasses | PostgreSQL licence | rule [V] |
| [Supabase docs, row level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [testing](https://supabase.com/docs/guides/local-development/testing/overview) | RLS pitfalls, pgTAP in CI | documentation, free access | rule [V] |
| [Azure Architecture Center, tenancy models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models) | isolation models | documentation, free access | rule [V] |
| [EnterpriseReady](https://www.enterpriseready.io/features/single-sign-on/) (SSO, audit log) | what to postpone, audit log fields | free access | rule [V] |
| Stripe docs: [trials](https://docs.stripe.com/billing/subscriptions/trials), [free trials](https://docs.stripe.com/billing/subscriptions/trials/free-trials), [trial compliance](https://docs.stripe.com/billing/subscriptions/trials/manage-trial-compliance), [prorations](https://docs.stripe.com/billing/subscriptions/prorations), [Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries), [webhooks](https://docs.stripe.com/webhooks), [entitlements](https://docs.stripe.com/billing/entitlements) | subscription behaviour and defaults | documentation, free access; the service is paid per transaction | rule [V] |
| Stripe docs: [EU tax](https://docs.stripe.com/tax/supported-countries/european-union), [customer tax IDs](https://docs.stripe.com/billing/customer/tax-ids) | reverse charge, VAT number validation | documentation | cited [S] (pages disagree) |
| [European Commission, One Stop Shop](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en) | 10 000 EUR threshold, OSS return dates | official EU site | rule [V] |
| [Légifrance, decree 2023-417](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047314374); [INC](https://www.inc-conso.fr/content/vous-pouvez-resilier-votre-contrat-dabonnement-en-quelques-clics) | French three-click cancellation | official text (not fetched); consumer agency page | rule [S] |
| [Hogan Lovells](https://www.hoganlovells.com/en/publications/eu-consumer-protection-law-update-new-mandatory-withdrawal-button-what-online-traders-need-to-know), [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts) | EU withdrawal function, 2026-06-19 | law-firm notes | rule [S] |
| [Latham & Watkins](https://www.lw.com/en/insights/2025/08/EU-Data-Act-Significant-New-Switching-Requirements-Due-to-Take-Effect-for-Data-Processing-Services) | EU Data Act switching and export | law-firm note | cited [S] |
| [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses), [Sidley](https://www.sidley.com/en/insights/newsupdates/2026/02/us-ftc-signals-renewed-interest-in-click-to-cancel-rulemaking) | US click-to-cancel status | law-firm notes | cited [S] |
| [economie.gouv.fr, electronic invoicing](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises) | French e-invoicing dates | official page (HTTP 403, not fetched) | cited [S] |
| [Google sender guidelines](https://support.google.com/a/answer/81126) | authentication, 5 000 a day, spam rate | free access | rule [V] |
| [Yahoo sender best practices](https://senders.yahooinc.com/best-practices/) | unsubscribe within 2 days, DMARC | free access | rule [V] |
| [Microsoft, error 550 5.7.515](https://support.microsoft.com/en-au/topic/fix-ndr-error-550-5-7-515-in-outlook-com-34cfe8f8-6fbf-457e-9e8b-9e4dbaf4e0ef) | Outlook.com bulk-sender rule | free access | cited [S] |
| RFC 8058 | one-click unsubscribe headers | IETF | rule |
| [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/syncable) | synced passkeys at AAL2 | US public domain | cited [S] |
| [Better Auth blog](https://better-auth.com/blog/authjs-joins-better-auth) | Auth.js maintenance status | free access | rule [V] |

#### Tools

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| Playwright (under `sw access`) | two-account route tests | Apache-2.0 | recommended |
| [pgTAP](https://github.com/theory/pgtap) | SQL tests for policies | PostgreSQL-style permissive (no SPDX tag) | recommended |
| [Schemathesis](https://github.com/schemathesis/schemathesis) | OpenAPI fuzzing | MIT | recommended |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) + Access Control Testing add-on | access matrix | Apache-2.0 | recommended |
| [Basejump](https://github.com/usebasejump/basejump) | reference Supabase schema | MIT | cited (reading material) |
| [supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) | pgTAP helpers | MIT | cited (last push 2024-05-15) |
| Akto community | API security tests | MIT | cited (paid-only features not verified) |
| Autorize | Burp extension, second-session replay | no licence file | excluded: no licence |
| AuthMatrix | Burp extension, role matrix | MIT | excluded: last push 2024-03-07, needs Burp |
| CASL, Casbin, OpenFGA, Cerbos | authorisation libraries and engines | MIT; Apache-2.0 for the other three | cited (only when custom roles are needed) |
| Ory Polis (`ory/polis`) | SAML and SCIM bridge | Apache-2.0 | cited (last push 2026-07-27) |
| node-saml | SAML library | MIT | cited (postponed feature) |
| [Better Auth](https://github.com/better-auth/better-auth) | auth library | MIT | recommended |
| [Supabase Auth](https://github.com/supabase/auth) | auth server | MIT | recommended (hosted limits not verified) |
| Keycloak | identity server | Apache-2.0 | recommended |
| Logto | identity server | MPL-2.0 | recommended |
| Ory Kratos, Ory Hydra | identity and OAuth2 servers | Apache-2.0 | cited (last push 2026-07-29) |
| ZITADEL | identity server | AGPL-3.0 | cited (AGPL duties) |
| authentik | identity server | MIT core, `enterprise/` separate | cited (open core) |
| SuperTokens core | auth server | Apache-2.0 core, `ee/` separate | cited (open core) |
| Casdoor, Dex, Authelia | identity server, OIDC federation, SSO portal | Apache-2.0 | cited |
| SimpleWebAuthn, [Arctic](https://github.com/pilcrowonpaper/arctic) | WebAuthn and OAuth helpers | MIT | cited (building blocks) |
| [Auth.js / NextAuth](https://github.com/nextauthjs/next-auth) | auth library | ISC | cited as a trap: security patches only since 2025-09-22 |
| [Lucia](https://github.com/lucia-auth/lucia) | former auth library | MIT | cited as a trap: deprecated March 2025 |
| Stack Auth (`hexclave/hexclave`) | auth platform | MIT client, AGPL-3.0 server | cited as a trap: mixed licence, renamed |
| Hanko | passkey auth | not checked | cited, no verdict [U] |
| Fief | auth server | Elastic License 2.0 | excluded: not open source, last push 2025-11-24 |
| Clerk, Auth0, WorkOS, Stytch, Kinde | hosted auth | proprietary | excluded: paid beyond a free tier |
| PocketBase | backend with auth | not checked | excluded: shown as archived, not investigated |
| rate-limiter-flexible, express-rate-limit, upstash/ratelimit-js | rate limiting | ISC, MIT, MIT | recommended |
| [React Email](https://github.com/resend/react-email), [MJML](https://github.com/mjmlio/mjml) | email templates | MIT | recommended |
| Listmonk, Plunk | self-hosted sending | AGPL-3.0 | cited |
| Novu | notifications | MIT core, enterprise packages proprietary | cited (open core) |
| Postmark, SendGrid, Mailgun, Resend, Amazon SES | sending services | proprietary | excluded from recommendations: paid beyond a free tier; owner's choice |
| PostHog | product analytics, flags, replay | MIT except `ee/` | recommended, MIT part (open core; cloud quotas not verified) |
| Umami | web analytics | MIT | recommended |
| Plausible, OpenPanel | analytics | AGPL-3.0 | recommended self-hosted |
| Matomo | web analytics | GPL-3.0 | recommended self-hosted |
| OpenFeature | flag API | Apache-2.0 | recommended |
| GrowthBook | flags, experiments | MIT except enterprise directories | recommended, MIT part (open core) |
| Flagsmith, Unleash | flags | BSD-3-Clause; AGPL-3.0 | recommended |
| rrweb, OpenReplay | session replay | MIT; AGPL-3.0 with MIT parts, `ee/` separate | cited |
| Flipt | flags | Fair Core License (FCL-1.0-MIT) | excluded: source-available |
| Sentry self-hosted | errors | FSL-1.1-Apache-2.0 | excluded: source-available |
| Mixpanel, Amplitude, LaunchDarkly, Statsig, Userpilot, Appcues | analytics, flags, onboarding | proprietary | excluded: paid |
| Stripe Tax | threshold monitoring | proprietary, paid add-on | excluded from recommendations: paid; owner's choice |

### Tests de sécurité (skill `security-testing`)

#### Standards and guidance

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) | four questions, STRIDE, responses, review over time | not captured in the notes | used as a rule |
| [LINDDUN GO](https://linddun.org/go/) | the seven privacy threat types | licence of the cards not stated on the page (nv) | used as a rule (names only, no card text) |
| [OWASP Top 10:2025](https://top10.owasp.org/2025) | current edition, A01 and A10 referenced | not captured in the notes | cited only (date of final release nv) |
| [OWASP API Security Top 10, 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10) | object, property and function level authorisation, resource consumption | not captured in the notes | cited only |
| [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS) | chapters V5, V6, V7, V8, V9, V13, V14 named next to the checks | CC BY-SA 4.0 | cited only (by chapter; no requirement text copied) |
| [OWASP Top 10 for LLM Applications, 2025](https://genai.owasp.org/llm-top-10/) | unbounded consumption and excessive agency in the threat model | not captured in the notes | cited only (a 2026 edition is nv) |
| [CWE Top 25, 2025](https://cwe.mitre.org/top25/) | current edition stated | not captured in the notes | cited only |
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | password policy, generic answers, repeated failures, re-authentication | not captured in the notes | used as a rule |
| [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | cookie flags, fixation, logout, timeouts, browser storage, `no-store` | not captured in the notes | used as a rule |
| [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) | reset token checks, host-header check | not captured in the notes | used as a rule (nv) |
| [RFC 8725, JWT best current practices](https://www.rfc-editor.org/rfc/rfc8725) | JWT checks | IETF document | used as a rule (nv) |
| [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | CSRF checks | not captured in the notes | used as a rule (nv) |
| [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) | CORS checks | not captured in the notes | used as a rule (nv) |
| [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html) | open redirect checks | not captured in the notes | used as a rule (nv) |
| [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) | SSRF probe list and the ranges to refuse | not captured in the notes | used as a rule |
| [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | upload checks | not captured in the notes | used as a rule |
| [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html) | extra-field check | not captured in the notes | used as a rule (nv) |
| [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) | env files, client bundle, fail at boot | not captured in the notes | used as a rule (nv) |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | what logs must and must not contain, canary check | not captured in the notes | used as a rule (nv) |
| [PostgreSQL documentation, row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | database role query, row level security flags | not captured in the notes | used as a rule (nv) |
| [RFC 9116, security.txt](https://www.rfc-editor.org/rfc/rfc9116) | required and optional fields, expiry | IETF document | used as a rule |
| [OWASP Vulnerability Disclosure Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html) | contents of a disclosure policy | not captured in the notes | used as a rule |

#### Tools recommended

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [ZAP](https://github.com/zaproxy/zaproxy) | passive baseline scan (`sw dast`), full scan, API scan | Apache-2.0 | recommended tool (API scan command nv) |
| [ZAP baseline scan documentation](https://www.zaproxy.org/docs/docker/baseline-scan/) | options and exit codes | not captured in the notes | used as a rule |
| [ZAP full scan documentation](https://www.zaproxy.org/docs/docker/full-scan/) | options, "performs attacks" | not captured in the notes | used as a rule |
| [ZAP API scan documentation](https://www.zaproxy.org/docs/docker/api-scan/) | command | not captured in the notes | cited only (nv) |
| [ZAP Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/) | preferred non-Docker path | not captured in the notes | cited only (authentication schema nv) |
| [Schemathesis](https://schemathesis.readthedocs.io/en/stable/) | API fuzzing from an OpenAPI or GraphQL schema | MIT | recommended tool (local or staging) |
| [Schemathesis CLI reference](https://schemathesis.readthedocs.io/en/stable/reference/cli/) | checks, exit codes, rate limit | not captured in the notes | used as a rule |
| [Nuclei](https://github.com/projectdiscovery/nuclei) | template scanner for exposure and misconfiguration | MIT (engine and community templates) | recommended tool (local or staging) |
| [testssl.sh](https://github.com/testssl/testssl.sh) | TLS configuration | GPL-2.0 | recommended tool (run as a separate program, not bundled) |
| [OSV-Scanner](https://github.com/google/osv-scanner) | known vulnerabilities and malicious-package records | Apache-2.0 | recommended tool |
| [gitleaks](https://github.com/gitleaks/gitleaks) | secrets in git and working tree | MIT | recommended tool (maintenance mode) |
| [betterleaks](https://github.com/betterleaks/betterleaks) | successor of gitleaks | MIT | recommended tool once its second version is stable |
| [Opengrep](https://github.com/opengrep/opengrep) | static analysis engine, fork of Semgrep CE | LGPL-2.1 | recommended tool (with your own rules) |
| [Semgrep CE engine](https://docs.semgrep.dev/licensing) | static analysis engine | LGPL-2.1 | recommended tool (engine only; flags nv) |
| [Semgrep CE and paid editions compared](https://docs.semgrep.dev/semgrep-pro-vs-oss) | limits of the free engine | not captured in the notes | used as a rule |
| [Hadolint](https://github.com/hadolint/hadolint) | Dockerfile linter | GPL-3.0 | recommended tool (2026 activity nv; not bundled) |
| [Checkov](https://github.com/bridgecrewio/checkov) | infrastructure-as-code checks | Apache-2.0 | recommended tool (parts needing an API key excluded) |
| [zizmor](https://github.com/zizmorcore/zizmor) | GitHub Actions linter | MIT (nv) | recommended tool (licence and command nv) |
| [npm audit, npm audit signatures](https://docs.npmjs.com/cli/v11/commands/npm-audit) | advisories; registry signatures and provenance | ships with npm | recommended tool |
| [npm sbom](https://docs.npmjs.com/cli/v11/commands/npm-sbom) | CycloneDX SBOM | ships with npm | recommended tool (nv) |
| [cdxgen](https://github.com/CycloneDX/cdxgen) | CycloneDX SBOM for other stacks | Apache-2.0 (nv) | cited only (nv) |
| [pnpm supply chain security](https://pnpm.io/supply-chain-security) | two-document lockfile caveat | not captured in the notes | used as a rule |
| [Mailpit](https://github.com/axllent/mailpit) | local mail catcher for the reset checks | not captured in the notes (nv) | cited only as an example |

#### Excluded

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Semgrep Rules License v1.0](https://semgrep.dev/legal/rules-license/) | terms of the rules Semgrep maintains | internal use only, no distribution, no service | excluded: rules not redistributable |
| Semgrep Code, Secrets, Supply Chain | cross-file analysis, secrets, dependencies | paid | excluded: paid |
| [CodeQL CLI](https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md) | static analysis | GitHub terms: open-source codebases only without a paid licence | excluded on closed-source repositories |
| [Bearer CLI](https://github.com/Bearer/bearer) | static analysis with data-flow report | Elastic License 2.0 | excluded: source-available, not open source |
| [Autorize](https://github.com/PortSwigger/autorize) | access-control replay inside Burp | extension licence not captured | excluded: needs Burp Suite (proprietary); method kept (nv) |
| [AuthMatrix](https://github.com/SecurityInnovation/AuthMatrix) | role matrix inside Burp | extension licence not captured | excluded: needs Burp Suite (nv) |
| Burp Suite Professional | proxy and scanner | paid | excluded: paid |
| [trufflehog](https://github.com/trufflesecurity/trufflehog) | secret scanner with live verification | AGPL-3.0 | excluded from defaults: never bundled, calls provider APIs; optional with consent |
| [Trivy](https://github.com/aquasecurity/trivy) | dependency, secret and configuration scanner | Apache-2.0 | excluded from defaults: compromised in March 2026, later state nv |
| [sqlmap](https://github.com/sqlmapproject/sqlmap) | SQL injection exploitation | GPL-2.0 | excluded: exploitation tool, not run by the agent |
| [Dockle](https://github.com/goodwithtech/dockle) | built-image linter | unclear, Apache-2.0 or AGPL-3.0 (nv) | excluded: licence unclear |
| securityheaders.com | hosted header grader | hosted service, terms nv | excluded: not open source, sends the hostname out |
| [ZAP Access Control Testing add-on](https://www.zaproxy.org/docs/desktop/addons/access-control-testing/) | access-control scan | Apache-2.0 | excluded: rules need the desktop interface |
| Checkov severity filter and SCA | needs a Prisma Cloud API key | paid service | excluded: paid |

#### Incident used as a reason

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Aqua Security: Trivy supply chain attack](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/) | facts of the March 2026 compromise (CVE-2026-33634), reason to pin tools | vendor blog | cited only |
#### Read in the notes, not used in the references

Left out because the notes mark them as unverified or because the skill does not depend on them: OWASP Threat Dragon, pytm and Threagile (threat-model tools), Web Fuzzing Commons auth file (field names nv), the OWASP Authorization Testing Automation Cheat Sheet (the `sw access` format already exists), MDN HTTP Observatory and CSP Evaluator (`sw web` reads headers), garak and promptfoo (nv), `possession` and `bola` (found by search only), SLSA levels, hosting-provider testing policies (AWS from memory, OVHcloud nv), NIST failure ceiling (nv), version numbers of every tool (release pages did not render).

#### Weak points to re-check before hard-coding

1. ASVS: only chapters are cited. The notes hold no requirement ids, so none is given; add them after reading the 5.0.0 text.
2. Every row marked nv above: reset tokens, JWT, CSRF, CORS, open redirects, mass assignment, secrets, logging, PostgreSQL roles, one-time code limit.
3. Flags quoted from memory: `zap-api-scan.py`, `semgrep scan`, `zizmor`, `npm sbom`, `uvx`, testssl.sh options, ZAP thread limit.
4. Licences not confirmed: zizmor, cdxgen, Dockle, LINDDUN GO cards, Mailpit, and the licence of each OWASP cheat sheet page.
5. Dates: final release of OWASP Top 10:2025; existence of a 2026 LLM list.

### Application mobile (skill `mobile-app`)

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | 5.1.1(v), 4.8, 4.2, 2.5.2, 3.1.1, 3.1.1(a), 3.1.2(a), 3.1.3 (a)(b)(c)(f) | Apple page, paraphrased | used as a rule |
| [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | what a valid deletion is | Apple page | used as a rule |
| [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) | privacy manifest, date 2024-05-01 | Apple page | used as a rule (category list from memory, flagged) |
| [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) | SDKs that need a manifest and a signature | Apple page | used as a rule |
| [App privacy details](https://developer.apple.com/app-store/app-privacy-details/) | privacy labels | Apple page | used as a rule |
| [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/) | Xcode 26, iOS 13 target, age rating, EU trader status | Apple page | used as a rule |
| [Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes/) | 4 GB, 500 MB `__TEXT` | Apple page | used as a rule |
| [DMA and apps in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/) | EU commissions in force 2026-10-01 | Apple page | used as a rule, with "check the current page" |
| [MacRumors, 2025-05-01](https://www.macrumors.com/2025/05/01/apple-updates-u-s-app-review-guidelines-epic/) | history of the US external-link change and fee status | press | cited only (secondary; fee marked not verified) |
| [TestFlight](https://developer.apple.com/testflight/) | tester limits | included in the Apple Developer Program | recommended tool (90-day expiry not verified) |
| [HIG: accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | 44 pt targets, contrast, 200 % text, Reduce Motion | Apple page | used as a rule |
| [HIG: typography](https://developer.apple.com/design/human-interface-guidelines/typography) | 17 pt, 11 pt, Dynamic Type table | Apple page | used as a rule |
| [HIG: layout](https://developer.apple.com/design/human-interface-guidelines/layout) | safe areas | Apple page | used as a rule |
| [HIG: tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | tab bar rules | Apple page | used as a rule (five-tab limit not verified) |
| [HIG: sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | sheet rules | Apple page | used as a rule |
| [Reducing your app's launch time](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time) | how iOS launch is measured | Apple page | cited only (no numeric target) |
| [Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains) | Universal Links file and entitlement | Apple page | used as a rule |
| [WWDC 2023, session 10035](https://developer.apple.com/videos/play/wwdc2023/10035/) | XCTest `performAccessibilityAudit()` | free with Xcode | recommended tool (macOS only) |
| [Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk) | API 36 since 2026-08-31 | Google page | used as a rule |
| [App testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465) | 12 testers, 14 days | Google page | used as a rule |
| [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes) | rule, 2027-02-01 date, check commands | Google page | used as a rule (earlier dates not verified) |
| [Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469) | form scope | Google page | used as a rule |
| [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) | in-app path and web link | Google page | used as a rule |
| [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738) | Play Billing scope | Google page | used as a rule (no B2B exemption found) |
| [US payments changes](https://support.google.com/googleplay/android-developer/answer/15582165) | 2025-10-29, fees from 2026-10-01 | Google page | used as a rule, with "check the current page" |
| [Play app size limits](https://support.google.com/googleplay/android-developer/answer/9859372) | 500 MB, 4 GB, 200 MB warning | Google page | used as a rule |
| [Play policy on self-updates and downloaded code](https://support.google.com/googleplay/android-developer/answer/9888379) | self-update and executable code ban, interpreter exception | Google page | used as a rule |
| [Play internal testing](https://support.google.com/googleplay/android-developer/answer/9845334) | 100 testers, review per track | included in the Play account | recommended tool |
| [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16) | edge-to-edge, predictive back, large screens | Google page | used as a rule |
| [Edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge) | insets handling | Google page | used as a rule |
| [Android 14 non-linear font scaling](https://developer.android.com/about/versions/14/features#non-linear-font-scaling) | 200 %, `sp` | Google page | used as a rule |
| [Notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission) | Android 13 permission, `pm grant` test | Google page | used as a rule |
| [Accessibility Scanner help](https://support.google.com/accessibility/android/answer/7101858) | 48 dp targets, 8 dp spacing; the Scanner app | free app, closed source | used as a rule; app for manual passes only |
| [App startup time](https://developer.android.com/topic/performance/vitals/launch-time) | 5 s, 2 s, 1.5 s lines; `am start -W` | Google page | used as a rule |
| [Android vitals](https://developer.android.com/topic/performance/vitals) | crash, ANR and wake-lock thresholds | Google page | used as a rule |
| [Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first) | read, write and sync rules | Google page | used as a rule |
| [Verify App Links](https://developer.android.com/training/app-links/verify-applinks) | `pm verify-app-links` commands | Google page | used as a rule |
| [Security with network protocols](https://developer.android.com/privacy-and-security/security-ssl) | TLS, pinning advice | Google page | used as a rule |
| [OWASP MASVS 2.1.0](https://mas.owasp.org/MASVS/) | control groups | CC BY-SA 4.0 | used as a rule (cited, text not copied) |
| [WCAG2Mobile draft note](https://www.w3.org/TR/wcag2mobile-22/) | criteria that matter on mobile | W3C document licence | cited only (draft, informative) |
| [EAS Update](https://docs.expo.dev/eas-update/introduction/) | what an over-the-air update can change | Expo docs | used as a rule |
| [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58) | R8 on by default | Expo docs | cited only |
| [Maestro](https://github.com/mobile-dev-inc/Maestro) | flow engine behind `sw mobile flows` | Apache-2.0 | recommended tool (local CLI only) |
| [Fastlane](https://github.com/fastlane/fastlane) | signing, TestFlight and Play uploads | MIT | recommended tool |
| [EAS Build free plan](https://expo.dev/pricing) | cloud builds without a Mac | proprietary service, free tier | usable with care (quota; reset period not stated) |
| [GitHub Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing), [billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | per-minute prices, free allowance | proprietary service, free on public repositories | usable with care (macOS minutes cost 10 times Linux) |
| [mobsfscan](https://github.com/MobSF/mobsfscan) | source security scan | LGPL-3.0 | recommended tool, called as an external tool |
| [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) | static and dynamic scan of built apps | GPL-3.0 | recommended tool, called only, never embedded |
| [apkleaks](https://github.com/dwisiswant0/apkleaks) | secrets in an APK | Apache-2.0 | recommended tool |
| Android Lint | security and accessibility lint | Apache-2.0 (not verified) | recommended tool |
| [Accessibility Test Framework for Android](https://github.com/google/Accessibility-Test-Framework-for-Android) | accessibility checks in instrumented tests | Apache-2.0 | recommended tool |
| Xcode Accessibility Inspector | manual audit on a simulator | free with Xcode | usable, manual only |
| [GlitchTip](https://glitchtip.com/) ([backend](https://gitlab.com/glitchtip/glitchtip-backend)) | crash reporting, Sentry-compatible | MIT | recommended tool |
| [Sentry self-hosted](https://develop.sentry.dev/self-hosted/) | crash reporting | FSL (source-available, not OSI) | usable with care (licence, 16 GB RAM) |
| [Firebase Crashlytics](https://firebase.google.com/pricing) | crash reporting | proprietary, free | usable with care (data goes to Google) |
| Play Console vitals, Xcode Organizer | store crash and launch data | built in | recommended tool |
| [Maestro Cloud](https://maestro.dev/pricing) | hosted devices | paid, USD 250 per device per month | excluded: paid |
| BrowserStack, Sauce Labs | device clouds | paid | excluded: paid |
| axe DevTools Mobile (Deque) | accessibility scanner | paid | excluded: paid |
| NowSecure, Data Theorem, Guardsquare AppSweep paid tiers | security scanners | commercial | excluded: commercial |
| Maestro AI commands (`assertWithAI`…) | assertions by a model | part of Maestro | excluded: results not repeatable |
| [Detox](https://github.com/wix/Detox), [Appium](https://github.com/appium/appium), [Playwright Android](https://playwright.dev/docs/api/class-android) | other flow engines | MIT, Apache-2.0, Apache-2.0 (the last two not verified) | excluded: React Native only and trailing; heavy setup; experimental and WebView only |

### Finitions, identité et textes (skill `premium-craft`)

#### Articles, guidelines and standards

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) ([repository](https://github.com/vercel-labs/web-interface-guidelines)) | typography characters, states, loader timing, forms, URL state, dark theme, microcopy | MIT | used as a rule |
| [Rauno Freiberg, interfaces](https://github.com/raunofreiberg/interfaces) | tabular figures, weights, focus, lists, hover media query, touch, theme switch | none detected | cited only (rules restated, no text reused) |
| [Jakub Krehel, "Details that make interfaces feel better"](https://jakub.kr/writing/details-that-make-interfaces-feel-better) and [skill](https://github.com/jakubkrehel/make-interfaces-feel-better) | ring edge values, image outline, concentric radii, stagger, enter and exit, spring | article: none stated; skill: MIT | used as a rule |
| [Emil Kowalski, "7 practical animation tips"](https://emilkowal.ski/ui/7-practical-animation-tips) and ["Great animations"](https://emilkowal.ski/ui/great-animations) | durations, press scale, entry scale, tooltips, blur on crossfade | none stated (free articles) | cited only (values restated) |
| [Josh W. Comeau, "Designing shadows"](https://www.joshwcomeau.com/css/designing-shadows/) | shadow layers, one light direction, shadow tint | none stated (free article) | cited only (rules restated) |
| [Linear, "How we redesigned the Linear UI"](https://linear.app/now/how-we-redesigned-the-linear-ui) | three-input themes in LCH, elevation from lightness, display and text cuts | none stated | cited only |
| [Linear, "Invisible details"](https://linear.app/now/invisible-details) | nested-menu triangle | none stated | cited only |
| [Stripe, "Designing accessible color systems"](https://stripe.com/blog/accessible-color-systems) | contrast-predictable steps (5 steps for 4.5:1, 4 for 3:1) | none stated | cited only |
| [Nielsen Norman Group, response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | 0.1 s, 1 s, 10 s | all rights reserved | cited only (figures) |
| [Nielsen Norman Group, skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) | loader policy by duration | all rights reserved | cited only (thresholds) |
| [web.dev, Web Vitals](https://web.dev/articles/vitals) | LCP, INP, CLS good thresholds; "poor" bands, TTFB and FCP not verified | not checked | used as a rule |
| [Impeccable anti-pattern catalogue](https://impeccable.style/anti-patterns) and [repository](https://github.com/pbakaus/impeccable) | second-generation tells, tracking, border plus shadow, overused fonts, copy tells | Apache 2.0 | used as a rule |
| [Anthropic `frontend-design` skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | second-generation tells, reflex palettes, copy rules | Apache 2.0 for this skill | used as a rule |
| [ibelick/ui-skills](https://github.com/ibelick/ui-skills) `baseline-ui` | z-index scale, `dvh`, feedback under 200 ms, one accent per view | MIT | used as a rule |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | placeholder and invented-facts check, real photos and real UI | MIT | used as a rule |
| [Fountain Institute, signs of vibe-coded UI](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui) | side stripes, status dots, nested cards | none stated | cited only |
| [kaplich, survey of 100 generated sites (DEV, 2025-08-06)](https://dev.to/kaplich/i-analyzed-100-vibe-coded-websites-and-found-these-common-mistakes-5275) | launch hygiene (icon, share tags, copyright year); qualitative, no percentages | none stated | cited only |
| [Wikipedia, "Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | English word list, structure tells; first 100,000 of about 244,000 characters read | CC BY-SA 4.0 (not verified) | used as a rule (single words listed, rules restated) |
| [gpt-watermark-remover.com, French word list](https://gpt-watermark-remover.com/fr/blog/mots-typiques-ia-eviter) | French word categories | none stated; commercial blog with a product to sell | cited only (weak source, flagged in copy.md) |
| [Digitad, generated text in French](https://digitad.ca/comment-savoir-texte-genere-par-chatgpt/) | French signs, dash rate; read through a search summary only | none stated | cited only (weak source) |
| [Wikipedia, Flesch-Kincaid tests](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests) | readability formulas and targets; not read again | CC BY-SA 4.0 (not verified) | cited only (formulas from memory) |
| [Mailchimp Content Style Guide](https://styleguide.mailchimp.com) | reference style guide | CC BY-NC 4.0 | cited only (non-commercial) |
| [GOV.UK writing guidelines](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/) | sentence length targets; new site not read | Open Government Licence v3 (not verified) | cited only |
| [Shopify Polaris content](https://polaris.shopify.com/content), [Atlassian content](https://atlassian.design/content) | reference style guides; not read | not checked | cited only |
| MDN: [`hanging-punctuation`](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation), [`size-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust) | browser support, fallback metrics; not read again | not checked | cited only (not verified) |
| [Apple, WWDC 2023 session 10158](https://developer.apple.com/videos/play/wwdc2023/10158/) | spring bounce values; not read again | all rights reserved | cited only (not verified) |
| [SIL Open Font License](https://openfontlicense.org) | what OFL allows; not read again | n/a | cited only (not verified) |

#### Font sources

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Google Fonts](https://fonts.google.com) | text and display faces | mostly SIL OFL 1.1, some Apache 2.0 or UFL (not verified per font) | recommended resource |
| [Fontsource](https://fontsource.org) | npm delivery for self-hosting | per font (not verified) | recommended resource |
| [Fontshare](https://www.fontshare.com) | free faces from Indian Type Foundry | ITF Free Font License, proprietary; primary text NOT read ([announcement](https://www.indiantypefoundry.com/news/introducing-fontshare) only) | recommended resource for an end project; excluded from any redistributed repository until the licence is read |
| [Velvetyne](https://velvetyne.fr) | display faces | libre, mostly OFL (not verified) | recommended resource (check each font) |
| [Collletttivo](https://www.collletttivo.it) | open faces | OFL (not verified) | recommended resource (check each font) |
| [The League of Moveable Type](https://www.theleagueofmoveabletype.com) | open faces | OFL (not verified) | recommended resource (check each font) |
| [Open Foundry](https://open-foundry.com) | curated open faces | per font (not verified) | recommended resource (check each font) |
| [Uncut.wtf](https://uncut.wtf) | catalogue | mixed (not verified) | recommended resource (check each font) |
| IBM Plex, Mona Sans, Hubot Sans, JetBrains Mono, Inter, Geist | vendor faces | OFL (not verified) | recommended resource; Inter and Geist not as the only face |

#### Icon sets

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Phosphor](https://github.com/phosphor-icons/core) | icons, six weights | MIT (GitHub API) | recommended resource |
| [Tabler](https://github.com/tabler/tabler-icons) | icons | MIT (GitHub API) | recommended resource |
| [Iconoir](https://github.com/iconoir-icons/iconoir) | icons | MIT (GitHub API) | recommended resource |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | icons | MIT (GitHub API) | recommended resource |
| [Lucide](https://github.com/lucide-icons/lucide) | icons | ISC (LICENSE file); Feather-derived parts MIT (not verified) | recommended resource, with the "default look" warning |
| [Remix Icon](https://github.com/Remix-Design/RemixIcon) | icons | [Remix Icon License v1.0](https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/License) since January 2026 (from 4.9.0); Apache 2.0 before | excluded from anything redistributed: not open source, no resale as a pack, no competing set, no logo use |

#### Imagery

| Link | Role | Licence | Status |
| --- | --- | --- | --- |
| [Unsplash](https://unsplash.com/license) | photos | Unsplash License (read): free commercial use, not CC0, no resale of unmodified copies, no competing service | recommended resource, with limits |
| [Pexels](https://www.pexels.com/license/) | photos | Pexels License (not verified) | recommended resource, with limits |
| [Openverse](https://openverse.org) | search across CC and public-domain works | per item (not verified) | recommended resource (check each item) |
| The Met, Rijksmuseum, Smithsonian open access | archive images | CC0 on flagged items (not verified) | recommended resource (check each item) |
| unDraw, Open Peeps, Humaaans | illustration kits | free (not verified) | excluded: recognised at once as kits, a tell |

#### Excluded

| Link | Reason |
| --- | --- |
| Mobbin, Refero | paid or freemium galleries |
| Paid UI kits, paid icon packs, paid stock photos, paid prompt libraries | paid |
| Emil Kowalski's course (animations.dev), Josh W. Comeau's courses | paid; only their free articles are cited |
| Refactoring UI (book) | paid; nothing from it was read or used |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | no licence detected at the repository root; not used in the references |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT, but a fixed catalogue of styles and palettes gives recognisable outputs; content not read |
| Linear "quality" post | URL returned 404; nothing sourced |
| French Wikipedia page on signs of generated text | not found |

## Lot 4 — banque de références (recherche du 2026-11-12)

La banque (`plugins/core/bank/`) décrit, par type de site, des sites reconnus comme excellents. Elle ne contient que des adresses, des descriptions écrites pour le pack et des mesures : aucune capture d'écran de sites tiers, qui sont protégées par le droit d'auteur. Chaque fichier liste ses propres sources dans `sources`, avec leur mode d'accès.

| Source | Rôle | Accès |
| --- | --- | --- |
| [Awwwards](https://www.awwwards.com/websites/) (Site of the Day, Honorable Mention, catégories) | reconnaissance datée des sites | gratuit |
| [Webby Awards](https://winners.webbyawards.com/) | lauréats 2024 à 2026 | gratuit |
| [WebAwards](https://www.webaward.org/) | lauréats « Small Business » pour les commerces de proximité | gratuit |
| [One Page Love](https://onepagelove.com), [SaaS Landing Page](https://saaslandingpage.com), [recent.design](https://recent.design), [Typewolf](https://www.typewolf.com) | sélection éditoriale ; dates pas toujours affichées | gratuit |
| [Baymard Institute](https://baymard.com/blog), articles publics | attentes d'une boutique en ligne | gratuit (les rapports complets sont payants : non utilisés) |
| [Nielsen Norman Group](https://www.nngroup.com/articles/) | attentes : prix affichés, formulaires | gratuit |

Écartés : Mobbin, Refero, Pageflows (payants ou freemium), Lapa Ninja (bloque les robots), toute capture d'écran.

Limites connues : les règles `expects` sont en majorité des règles de bon sens marquées non vérifiées ; la source d'une reconnaissance est souvent la page de catégorie et non la fiche du site ; les sites changent, la mesure et la calibration sont à refaire avant chaque version. Une première passe automatique (105 agents) n'avait vérifié que 4 familles de sites ; la banque vient d'une seconde passe ciblée, un agent par groupe de types, chaque site chargé avant d'être gardé.

## Lot 5 — lien envoyé le 2026-11-12

| Lien | Rôle | Licence | Statut |
| --- | --- | --- | --- |
| [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) | 228 guides sur les fonctions récentes de la plateforme web (dialog, popover, positionnement par ancre, container queries, view transitions, validation de formulaires, Core Web Vitals, sécurité), avec compatibilité navigateurs et solutions de repli ; commande `legacy-scan` pour repérer les anciens motifs | Apache-2.0 | proposé comme outil compagnon au kickoff ; ses guides ne sont pas copiés dans le pack, pour rester à jour |

Lu le 2026-11-12 par l'API GitHub : dépôt créé en mars 2026, dernier envoi le 2026-11-10, non archivé, porté par les équipes Chrome, Edge, Firefox et MDN. Gratuit. Points d'attention : demande Node 22 ; chaque recherche lance son paquet avec `npx` ; le README ne dit rien d'une éventuelle télémétrie (non vérifié) ; la description de son skill demande à passer en premier sur toute tâche HTML ou CSS, ce que le pack ne suit pas. Le post X qui le signalait n'a pas été lu.
