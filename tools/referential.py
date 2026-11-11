#!/usr/bin/env python3
"""Validate the referential and generate the human-readable FR/EN docs.

Usage:
  python tools/referential.py validate
  python tools/referential.py docs      # writes docs/fr/REFERENTIEL.md and docs/en/REFERENTIAL.md
"""
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "plugins" / "core" / "referential"
LANGS = ("fr", "en")
SEVERITIES = {"blocker", "major", "minor"}
METHODS = {"auto", "inspect", "manual"}


def load():
    scoring = yaml.safe_load((REF / "scoring.yaml").read_text(encoding="utf-8"))
    checks = yaml.safe_load((REF / "checks.yaml").read_text(encoding="utf-8"))["checks"]
    groups = [yaml.safe_load(f.read_text(encoding="utf-8")) for f in sorted((REF / "domains").glob("*.yaml"))]
    return scoring, checks, groups


def bilingual(obj, where, errors):
    if not isinstance(obj, dict) or any(not str(obj.get(l, "")).strip() for l in LANGS):
        errors.append(f"{where}: needs non-empty fr and en")


def validate():
    scoring, checks, groups = load()
    errors = []
    flags = set(scoring["flags"]) | set(scoring["derived_flags"])
    domain_ids, codes, crit_ids = [], [], []
    for g in groups:
        bilingual(g.get("label"), f"group {g.get('group')}", errors)
        for d in g["domains"]:
            did = d["id"]
            domain_ids.append(did)
            codes.append(d["code"])
            for k in ("label", "summary"):
                bilingual(d.get(k), f"{did}.{k}", errors)
            for i, rule in enumerate(d.get("build", [])):
                bilingual(rule, f"{did}.build[{i}]", errors)
            for f in d.get("applies_if", []):
                if f not in flags:
                    errors.append(f"{did}: unknown flag {f}")
            if not d.get("criteria"):
                errors.append(f"{did}: no criteria")
            for n, c in enumerate(d.get("criteria", []), 1):
                cid = c["id"]
                crit_ids.append(cid)
                if not re.fullmatch(rf"{re.escape(d['code'])}-\d\d", cid):
                    errors.append(f"{cid}: id must be {d['code']}-NN")
                if c.get("severity") not in SEVERITIES:
                    errors.append(f"{cid}: bad severity")
                chk = c.get("check", {})
                if chk.get("method") not in METHODS:
                    errors.append(f"{cid}: bad check.method")
                if chk.get("method") == "auto" and chk.get("tool") not in checks:
                    errors.append(f"{cid}: unknown check.tool {chk.get('tool')}")
                for k in ("label", "verify"):
                    bilingual(c.get(k), f"{cid}.{k}", errors)
                for f in c.get("applies_if", []):
                    if f not in flags:
                        errors.append(f"{cid}: unknown flag {f}")
    for name, cnt in Counter(domain_ids + codes + crit_ids).items():
        if cnt > 1:
            errors.append(f"duplicate id: {name}")
    for p, prof in scoring["profiles"].items():
        missing = set(domain_ids) - set(prof["weights"])
        extra = set(prof["weights"]) - set(domain_ids)
        if missing or extra:
            errors.append(f"profile {p}: missing {sorted(missing)} extra {sorted(extra)}")
        for f in prof["default_flags"]:
            if f not in scoring["flags"]:
                errors.append(f"profile {p}: unknown flag {f}")
    areas = scoring.get("score_areas", {})
    placed = Counter(dom for a in areas.values() for dom in a.get("domains", []))
    for name, a in areas.items():
        for k in ("label", "summary"):
            bilingual(a.get(k), f"score_areas.{name}.{k}", errors)
    for did in domain_ids:
        if placed[did] != 1:
            errors.append(f"domain {did} must belong to exactly one score area (found {placed[did]})")
    for extra in sorted(set(placed) - set(domain_ids)):
        errors.append(f"score_areas: unknown domain {extra}")
    review = scoring["scoring"].get("review", {}).get("criterion")
    if review and review not in crit_ids:
        errors.append(f"scoring.review: unknown criterion {review}")
    for key, per in scoring["scoring"].get("flow_budgets", {}).items():
        if set(per) != {"mobile", "desktop"}:
            errors.append(f"flow_budgets.{key}: needs mobile and desktop")
    used = {c["check"].get("tool") for g in groups for d in g["domains"] for c in d["criteria"]}
    for unused in sorted(set(checks) - used):
        errors.append(f"check {unused} is never used")
    for sf in sorted((ROOT / "plugins").glob("*/stack.yaml")):
        st = yaml.safe_load(sf.read_text(encoding="utf-8"))
        bilingual(st.get("label"), f"{sf.parent.name}.label", errors)
        for key in st.get("checks", {}):
            if key not in checks:
                errors.append(f"{sf.parent.name}: unknown check {key}")
        for i, rule in enumerate(st.get("rules", [])):
            bilingual(rule, f"{sf.parent.name}.rules[{i}]", errors)
        for f in st.get("sets_flags", []):
            if f not in scoring["flags"]:
                errors.append(f"{sf.parent.name}: unknown flag {f}")
    return errors, len(domain_ids), len(crit_ids)


T = {
    "fr": {"title": "Référentiel qualité", "intro": "Ce référentiel définit, pour chacun des {n} domaines, les règles à suivre pendant la construction et les {c} critères vérifiés à l'audit. Il n'est pas un avis juridique.",
           "scoring": "Barème", "build": "Pendant la construction", "audit": "Critères d'audit",
           "sev": {"blocker": "Bloquant", "major": "Majeur", "minor": "Mineur"},
           "meth": {"auto": "auto", "inspect": "lecture", "manual": "manuel"},
           "cols": "| ID | Critère | Sévérité | Vérification |", "applies": "S'applique si",
           "rules": ["Chaque critère vaut 5 (bloquant), 3 (majeur) ou 1 (mineur). Réussi = 100 %, partiel = 50 %, échec ou non vérifié = 0.",
                     "Note du domaine = points obtenus / points possibles × 10.",
                     "Deux notes, chacune avec ses propres points bloquants : {areas}. Chacune est la moyenne de ses domaines pondérée par le profil d'usage (vitrine, webapp, saas, mobile, api).",
                     "Un critère bloquant est réussi ou non (pas de partiel). En échec ou non vérifié, il plafonne la note du domaine à {cap}/10 et la note dont il relève à {gcap}/10. Un bloquant de technique ne plafonne donc pas l'expérience, et inversement.",
                     "La note d'ensemble (moyenne de tous les domaines) est gardée pour l'historique ; elle est plafonnée à {gcap}/10 dès qu'un point bloquant est ouvert.",
                     "Les tâches clés déclarées dans .quality/project.json › flows sont jouées pas à pas sur téléphone et sur ordinateur ; l'ergonomie, l'UX et l'accessibilité sont jugées sur ces états, pas sur l'écran vide.",
                     "Un domaine ou un critère dont les conditions ne s'appliquent pas au projet est ignoré."],
           "toc": "Domaines"},
    "en": {"title": "Quality referential", "intro": "This referential defines, for each of the {n} domains, the rules to follow while building and the {c} criteria checked at audit time. It is not legal advice.",
           "scoring": "Scoring", "build": "While building", "audit": "Audit criteria",
           "sev": {"blocker": "Blocker", "major": "Major", "minor": "Minor"},
           "meth": {"auto": "auto", "inspect": "inspection", "manual": "manual"},
           "cols": "| ID | Criterion | Severity | How to verify |", "applies": "Applies if",
           "rules": ["Each criterion is worth 5 (blocker), 3 (major) or 1 (minor). Pass = 100%, partial = 50%, fail or not checked = 0.",
                     "Domain score = points earned / points possible × 10.",
                     "Two scores, each with its own blockers: {areas}. Each is the average of its domains weighted by the usage profile (vitrine, webapp, saas, mobile, api).",
                     "A blocker is met or not (no partial). Failed or not checked, it caps the domain score at {cap}/10 and the score it belongs to at {gcap}/10. An engineering blocker does not cap the experience score, and the other way round.",
                     "The overall score (average of every domain) is kept for history; it is capped at {gcap}/10 as soon as any blocker is open.",
                     "Key tasks declared in .quality/project.json › flows are played step by step on a phone and a desktop; ergonomics, UX and accessibility are judged on those states, not on the empty screen.",
                     "A domain or criterion whose conditions do not apply to the project is skipped."],
           "toc": "Domains"},
}


def flag_label(f, scoring, lang):
    if f in scoring["flags"]:
        return scoring["flags"][f][lang]
    parts = [scoring["flags"][x][lang] for x in scoring["derived_flags"][f]]
    return (" ou " if lang == "fr" else " or ").join(parts)


def area_text(scoring, groups, lang):
    names = {d["id"]: d["label"][lang] for g in groups for d in g["domains"]}
    sep = " ; " if lang == "fr" else "; "
    return sep.join(f"**{a['label'][lang]}** ({', '.join(names[x] for x in a['domains'])})" for a in scoring.get("score_areas", {}).values())


def docs():
    scoring, checks, groups = load()
    n = sum(len(g["domains"]) for g in groups)
    c = sum(len(d["criteria"]) for g in groups for d in g["domains"])
    cap = scoring["scoring"]["blocker_cap"]
    out_paths = {"fr": ROOT / "docs" / "fr" / "REFERENTIEL.md", "en": ROOT / "docs" / "en" / "REFERENTIAL.md"}
    for lang in LANGS:
        t = T[lang]
        L = [f"# {t['title']}", "", t["intro"].format(n=n, c=c), "",
             "<!-- Generated by tools/referential.py from plugins/core/referential. Do not edit by hand. -->", "",
             f"## {t['scoring']}", ""] + [f"- {r.format(cap=cap, gcap=str(scoring['scoring']['global_blocker_cap']).replace('.', ',' if lang == 'fr' else '.'), areas=area_text(scoring, groups, lang))}" for r in t["rules"]] + ["", f"## {t['toc']}", ""]
        for g in groups:
            L.append(f"- **{g['label'][lang]}** : " + ", ".join(d["label"][lang] for d in g["domains"]))
        for g in groups:
            L += ["", f"## {g['label'][lang]}"]
            for d in g["domains"]:
                L += ["", f"### {d['label'][lang]} ({d['code']})", "", d["summary"][lang]]
                if d.get("applies_if"):
                    L += ["", f"_{t['applies']}{' :' if lang == 'fr' else ':'} " + ", ".join(flag_label(f, scoring, lang) for f in d["applies_if"]) + "_"]
                L += ["", f"**{t['build']}**", ""] + [f"- {r[lang]}" for r in d.get("build", [])]
                L += ["", f"**{t['audit']}**", "", t["cols"], "| --- | --- | --- | --- |"]
                for cr in d["criteria"]:
                    m = cr["check"]
                    how = f"{t['meth'][m['method']]}" + (f" `{m['tool']}`" if m.get("tool") else "")
                    L.append(f"| {cr['id']} | {cr['label'][lang]} | {t['sev'][cr['severity']]} | {cr['verify'][lang]} ({how}) |")
        out_paths[lang].write_text("\n".join(L) + "\n", encoding="utf-8")
        print(f"wrote {out_paths[lang].relative_to(ROOT)}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "validate"
    errs, nd, nc = validate()
    if errs:
        print("\n".join(errs))
        sys.exit(1)
    print(f"OK: {nd} domains, {nc} criteria")
    if cmd == "docs":
        docs()
