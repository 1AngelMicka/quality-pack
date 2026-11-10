// Copy buttons on code blocks, and the referential rendered from referential.json (same source as the plugin).
const lang = document.documentElement.lang.startsWith("fr") ? "fr" : "en";
const T = {
  fr: { copy: "Copier", copied: "Copié", criteria: "critères", rules: "Pendant la construction", checks: "Critères d'audit",
    sev: { blocker: "bloquant", major: "majeur", minor: "mineur" }, filter: "Filtrer : sécurité, SEO, SEC-01…", none: "Aucun résultat.",
    failed: "Le référentiel n'a pas pu être chargé. Voir docs/fr/REFERENTIEL.md sur GitHub." },
  en: { copy: "Copy", copied: "Copied", criteria: "criteria", rules: "While building", checks: "Audit criteria",
    sev: { blocker: "blocker", major: "major", minor: "minor" }, filter: "Filter: security, SEO, SEC-01…", none: "No result.",
    failed: "The referential could not be loaded. See docs/en/REFERENTIAL.md on GitHub." },
}[lang];

for (const pre of document.querySelectorAll("pre")) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "copy";
  b.textContent = T.copy;
  b.addEventListener("click", async () => {
    const text = pre.querySelector("code").innerText.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n").trim();
    try { await navigator.clipboard.writeText(text); b.textContent = T.copied; setTimeout(() => (b.textContent = T.copy), 1500); } catch { /* ignore */ }
  });
  pre.appendChild(b);
}

const mount = document.getElementById("referential");
if (mount) {
  const base = document.querySelector('meta[name="qp-root"]')?.content || ".";
  fetch(`${base}/referential.json`).then((r) => r.json()).then((ref) => {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const html = ref.groups.map((g) => `<h3>${esc(g.label[lang])}</h3>` + g.domains.map((d) => `
      <details class="domain" data-text="${esc([d.code, d.label.fr, d.label.en, d.summary[lang], ...d.criteria.map((c) => `${c.id} ${c.label[lang]}`)].join(" ").toLowerCase())}">
        <summary><span class="code">${esc(d.code)}</span><strong>${esc(d.label[lang])}</strong><span class="count">${d.criteria.length} ${T.criteria}</span></summary>
        <div class="body">
          <p>${esc(d.summary[lang])}</p>
          <p><strong>${T.rules}</strong></p>
          <ul>${d.build.map((r) => `<li>${esc(r[lang])}</li>`).join("")}</ul>
          <p><strong>${T.checks}</strong></p>
          <div class="table-wrap"><table><tbody>${d.criteria.map((c) => `
            <tr><td><code>${esc(c.id)}</code></td><td>${esc(c.label[lang])}<br><small>${esc(c.verify[lang])}</small></td>
            <td><span class="sev ${c.severity}">${T.sev[c.severity]}</span></td></tr>`).join("")}</tbody></table></div>
        </div>
      </details>`).join("")).join("");
    mount.innerHTML = `<div class="filter"><input type="search" aria-label="${T.filter}" placeholder="${T.filter}"></div><div class="list">${html}</div><p class="empty" hidden>${T.none}</p>`;
    const input = mount.querySelector("input");
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      for (const d of mount.querySelectorAll("details.domain")) {
        const hit = !q || d.dataset.text.includes(q);
        d.hidden = !hit;
        if (hit) shown++;
        if (q && hit) d.open = true;
      }
      for (const h of mount.querySelectorAll("h3")) {
        let n = h.nextElementSibling, any = false;
        while (n && n.tagName !== "H3") { if (!n.hidden) any = true; n = n.nextElementSibling; }
        h.hidden = !any;
      }
      mount.querySelector(".empty").hidden = shown > 0;
    });
  }).catch(() => { mount.innerHTML = `<p class="note">${T.failed}</p>`; });
}
