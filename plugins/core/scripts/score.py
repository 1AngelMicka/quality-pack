#!/usr/bin/env python3
"""Compute quality scores from an audit file.

Usage:
  score.py AUDIT.json [--previous OLD.json] [--lang fr|en] [--json OUT.json] [--md OUT.md]

AUDIT.json:
  {
    "date": "2026-11-07",
    "project": "my-app",
    "profile": "webapp",
    "flags": ["has_ui", "has_backend", ...],
    "results": {
      "SEC-01": {"status": "pass|partial|fail|unknown|na", "evidence": "...", "fix": "..."}
    }
  }
A criterion missing from "results" is reported as unknown (not checked).
"""
import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

REF_DIR = Path(__file__).resolve().parent.parent / "referential"
STATUSES = {"pass", "partial", "fail", "unknown", "na"}

TXT = {
    "fr": {
        "title": "Rapport d'audit qualité", "global": "Note globale", "profile": "Profil",
        "domain": "Domaine", "score": "Note", "trend": "Évolution", "blockers": "Points bloquants",
        "to_fix": "À corriger en priorité", "unknown": "Non vérifiés", "na": "sans objet",
        "none": "Aucun", "criterion": "Critère", "severity": "Sévérité", "fix": "Correctif",
        "sev": {"blocker": "bloquant", "major": "majeur", "minor": "mineur"},
        "capped": "plafonnée", "capped_note": "Note plafonnée : un critère bloquant est en échec ou non vérifié.", "date": "Date", "sep": " : ",
    },
    "en": {
        "title": "Quality audit report", "global": "Overall score", "profile": "Profile",
        "domain": "Domain", "score": "Score", "trend": "Trend", "blockers": "Blockers",
        "to_fix": "Fix first", "unknown": "Not checked", "na": "not applicable",
        "none": "None", "criterion": "Criterion", "severity": "Severity", "fix": "Fix",
        "sev": {"blocker": "blocker", "major": "major", "minor": "minor"},
        "capped": "capped", "capped_note": "Capped score: a blocker failed or was not checked.", "date": "Date", "sep": ": ",
    },
}


def load_referential(ref_dir=REF_DIR):
    scoring = yaml.safe_load((ref_dir / "scoring.yaml").read_text(encoding="utf-8"))
    domains = []
    for f in sorted((ref_dir / "domains").glob("*.yaml")):
        group = yaml.safe_load(f.read_text(encoding="utf-8"))
        for d in group["domains"]:
            d["group"] = group["group"]
            domains.append(d)
    return scoring, domains


def resolve_flags(flags, scoring):
    active = set(flags)
    for name, any_of in scoring.get("derived_flags", {}).items():
        if active & set(any_of):
            active.add(name)
    return active


def applies(item, flags):
    return all(f in flags for f in item.get("applies_if", []))


def compute(audit, scoring, domains):
    profile = scoring["profiles"][audit["profile"]]
    flags = resolve_flags(audit.get("flags", profile["default_flags"]), scoring)
    sw = scoring["scoring"]["severity_weight"]
    sv = scoring["scoring"]["status_value"]
    cap = scoring["scoring"]["blocker_cap"]
    results = audit.get("results", {})
    out_domains, issues = [], []
    total, total_w = 0.0, 0.0

    for d in domains:
        weight = profile["weights"].get(d["id"], 0)
        entry = {"id": d["id"], "label": d["label"], "weight": weight, "score": None, "capped": False}
        if weight == 0 or not applies(d, flags):
            out_domains.append(entry)
            continue
        num = den = 0.0
        blocker_failed = False
        for c in d["criteria"]:
            if not applies(c, flags):
                continue
            r = results.get(c["id"], {})
            status = r.get("status", "unknown")
            if status not in STATUSES:
                raise ValueError(f"{c['id']}: unknown status '{status}'")
            if status == "na":
                continue
            if c["severity"] == "blocker" and status == "partial":
                status = "fail"  # a blocker is met or not: partial counts as failed
            value = sv["fail"] if status == "unknown" else sv[status]
            w = sw[c["severity"]]
            num += w * value
            den += w
            if value < 1.0:
                issues.append({"id": c["id"], "domain": d["id"], "severity": c["severity"],
                               "status": status, "label": c["label"], "fix": r.get("fix", ""),
                               "evidence": r.get("evidence", "")})
                if c["severity"] == "blocker" and status in ("fail", "unknown"):
                    blocker_failed = True
        if den == 0:
            out_domains.append(entry)
            continue
        score = 10 * num / den
        if blocker_failed and score > cap:
            score, entry["capped"] = float(cap), True
        entry["score"] = round(score, 1)
        total += score * weight
        total_w += weight
        out_domains.append(entry)

    global_score = round(total / total_w, 1) if total_w else None
    gcap = scoring["scoring"].get("global_blocker_cap")
    open_blockers = [i for i in issues if i["severity"] == "blocker"]
    global_capped = bool(global_score is not None and gcap is not None and open_blockers and global_score > gcap)
    if global_capped:
        global_score = float(gcap)
    order = {"blocker": 0, "major": 1, "minor": 2}
    issues.sort(key=lambda i: (order[i["severity"]], i["status"] == "unknown", i["id"]))
    return {"date": audit.get("date"), "project": audit.get("project"), "profile": audit["profile"],
            "global": global_score, "global_capped": global_capped, "domains": out_domains, "issues": issues}


def grade(score, scoring, lang):
    for g in scoring["scoring"]["grades"]:
        if score >= g["min"]:
            return g[lang]
    return ""


def to_markdown(report, scoring, lang, previous=None):
    t = TXT[lang]
    prev = {d["id"]: d["score"] for d in previous["domains"]} if previous else {}
    profile_label = scoring["profiles"][report["profile"]]["label"][lang]

    def num(x):
        return f"{x}".replace(".", ",") if lang == "fr" else f"{x}"

    def trend(new, old):
        if old is None or new is None:
            return ""
        delta = round(new - old, 1)
        return num(f"{delta:+}") if delta else "="

    lines = [f"# {t['title']}" + (f" — {report['project']}" if report.get("project") else ""), ""]
    g = report["global"]
    head = f"**{t['global']}{t['sep']}{num(g)}/10** ({grade(g, scoring, lang)})" + (f" — {t['capped']}" if report.get("global_capped") else "") if g is not None else f"**{t['global']}{t['sep']}—**"
    if previous and previous.get("global") is not None and g is not None:
        head += f" · {t['trend']} {trend(g, previous['global'])}"
    lines += [head, "", f"{t['profile']}{t['sep']}{profile_label} · {t['date']}{t['sep']}{report.get('date') or '—'}", ""]

    lines += [f"| {t['domain']} | {t['score']} | {t['trend']} |", "| --- | --- | --- |"]
    for d in report["domains"]:
        if d["score"] is None:
            continue
        s = num(d["score"]) + (f" ({t['capped']})" if d["capped"] else "")
        lines.append(f"| {d['label'][lang]} | {s} | {trend(d['score'], prev.get(d['id']))} |")
    skipped = [d["label"][lang] for d in report["domains"] if d["score"] is None]
    if any(d["capped"] for d in report["domains"]) or report.get("global_capped"):
        lines += ["", f"_{t['capped_note']}_"]
    if skipped:
        lines += ["", f"_{t['na'].capitalize()}{t['sep']}{', '.join(skipped)}_"]

    def table(rows, title):
        out = ["", f"## {title}", ""]
        if not rows:
            return out + [t["none"]]
        out += [f"| {t['criterion']} | {t['severity']} | {t['fix']} |", "| --- | --- | --- |"]
        for i in rows:
            out.append(f"| {i['id']} — {i['label'][lang]} | {t['sev'][i['severity']]} | {i['fix'] or '—'} |")
        return out

    checked = [i for i in report["issues"] if i["status"] != "unknown"]
    lines += table([i for i in report["issues"] if i["severity"] == "blocker"], t["blockers"])
    lines += table([i for i in checked if i["severity"] != "blocker"], t["to_fix"])
    lines += table([i for i in report["issues"] if i["status"] == "unknown" and i["severity"] != "blocker"], t["unknown"])
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audit")
    ap.add_argument("--previous")
    ap.add_argument("--lang", default="fr", choices=["fr", "en"])
    ap.add_argument("--json")
    ap.add_argument("--md")
    a = ap.parse_args()
    scoring, domains = load_referential()
    audit = json.loads(Path(a.audit).read_text(encoding="utf-8"))
    report = compute(audit, scoring, domains)
    previous = None
    if a.previous:
        previous = compute(json.loads(Path(a.previous).read_text(encoding="utf-8")), scoring, domains)
    md = to_markdown(report, scoring, a.lang, previous)
    if a.json:
        Path(a.json).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if a.md:
        Path(a.md).write_text(md, encoding="utf-8")
    else:
        sys.stdout.write(md)


if __name__ == "__main__":
    main()
