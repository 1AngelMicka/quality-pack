# quality-pack

[English](README.md) · **Français**

Un pack de plugins Claude Code pour construire et auditer des sites, des applications web et des applications mobiles sur **27 domaines qualité**, avec une note sur 10 qui progresse d'un audit à l'autre.

> Version 0.1.0 : le référentiel, le barème et le calcul des notes sont prêts. Les commandes `/kickoff`, `/audit` et `/fix` arrivent en 0.2.0.

## Ce qu'il fait

- **Pendant la construction**, Claude suit les règles de chaque domaine : états vides et erreurs, validation des entrées, contrastes, budgets de performance, pas de contenu générique, etc.
- **À l'audit**, chacun des 153 critères est vérifié avec une preuve (commande, fichier et ligne, capture). La note de chaque domaine et la note globale sont calculées, comparées à l'audit précédent, et les correctifs sont classés par priorité.

Les 27 domaines : Produit, Fonctionnalités, UX, Contenu, Support, UI, AI slop, Responsive, Accessibilité, Compatibilité, Sécurité, Confidentialité, Données, Conformité, Fiabilité, Tests, Code, Performance, SEO et meta, Scalabilité, Intégrations, Paiements, Coûts, Infra, Déploiement, Monitoring, Sauvegardes.

Le détail complet : [docs/fr/REFERENTIEL.md](docs/fr/REFERENTIEL.md).

## Plugins

| Plugin | Rôle |
| --- | --- |
| `qp-core` | Socle commun : référentiel, barème, profils d'usage, notation |
| `qp-stack-nextjs` | Next.js, React, TypeScript, Tailwind |
| `qp-stack-node-api` | API Node : Fastify ou Express, Prisma, PostgreSQL, Redis, Socket.io |
| `qp-infra-vps` | VPS auto-hébergé : Docker Compose, PM2, Nginx ou CloudPanel, sauvegardes |

Prévus : Expo / React Native, Laravel, Astro, module de conformité France.

## Notation

- Chaque critère vaut 5 (bloquant), 3 (majeur) ou 1 (mineur).
- Un critère réussi rapporte tous ses points, un critère partiel la moitié. Un critère en échec ou non vérifié ne rapporte rien.
- Un critère bloquant est réussi ou non, sans partiel. S'il échoue, la note du domaine est plafonnée à 3/10 et la note globale à 5,9/10.
- La note globale pondère les domaines selon le profil du projet : `vitrine`, `webapp`, `saas`, `mobile` ou `api`.

```bash
python3 plugins/core/scripts/score.py .quality/audits/2026-11-07.json --previous .quality/audits/2026-10-01.json --lang fr
```

## Principes

- Aucune télémétrie.
- Des hooks courts et lisibles uniquement.
- Les sources tierces sont créditées et figées à un commit précis ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
- Ce référentiel n'est pas un avis juridique.

## Contribuer

Le référentiel se trouve dans `plugins/core/referential/` (YAML bilingue). Après chaque modification :

```bash
python3 tools/referential.py docs   # valide puis régénère docs/fr et docs/en
```

Licence MIT.
