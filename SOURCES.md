# Liens examinés

Tous les liens partagés, testés ou utilisés pour le pack, avec leur statut. Les sources des règles des skills design (normes, études) sont dans [plugins/core/SOURCES.md](plugins/core/SOURCES.md).

Règle : rien de payant, de verrouillé (freemium) ni de non redistribuable n'est recommandé. Ces liens n'apparaissent qu'ici, dans « Écartés », avec la raison. Les licences et les prix ont été vérifiés le 2026-11-11 ; ils changent : revérifier avant de s'en servir.

Statuts :
- **Intégré** : une idée ou une valeur reprise dans le pack (avec crédit, sans copie de texte).
- **Compagnon** : proposé par `/qp:kickoff`, installé seulement avec l'accord de l'utilisateur.
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
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | Skill design de Together AI : 50 thèmes, `sloplint --render` à 8 largeurs, relecture à contexte neuf, `redesign` qui vérifie que chaque lien, champ et action survit | MIT, gratuit | **Intégré** : garde de refonte (`qp look --baseline`, REV-09) |
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
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender), [EL4CTEO/blender-skills](https://github.com/EL4CTEO/blender-skills) | Vidéo depuis HTML, Blender piloté par Claude | — | Hors sujet pour quality-pack (vidéo, 3D) ; à voir pour Ultimate Motion Design |
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
