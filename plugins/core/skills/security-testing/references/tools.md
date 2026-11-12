# Scanners an agent can run

This file lists the free scanners that go further than `sw dast` and `sw supply`: what each one finds, what it misses, whether it may touch production, and the command. Everything recommended here is free and open source. Tools that are paid, source-available or tied to a paid product are under "Excluded" with the reason. Researched on 2026-11-12; licences and flags change, so check the tool's own page before adding it to CI. Version numbers are left out on purpose: the notes could not confirm them on the release pages.

Marker: **(nv)** means not verified on the primary source during the research (flag or licence quoted from memory or from a secondary page).

## Before any run

- Classify the target as the skill says. "Safe on production" below means read-only on a site the user owns and agreed to scan. "no" means local or staging only, after the user's explicit yes for that target.
- An active scan submits forms, creates junk data, may send emails and may lock accounts. Point email, SMS and payment to sandboxes first.
- Keep third parties out: exclude the login provider, payment, analytics and CDN hosts from the scan scope.
- Reports hold findings and the request that reproduces each one. No dumped data; redact cookies and tokens in saved HAR files.

## Dynamic scanners (need the running app)

| Tool | Licence | Finds | Misses | Safe on production | Command |
| --- | --- | --- | --- | --- | --- |
| [ZAP](https://www.zaproxy.org/docs/docker/baseline-scan/) baseline | Apache-2.0 | missing headers, cookies without flags, information leaks, vulnerable libraries served to the browser | everything behind login, access control, logic; routes a one-minute crawl does not reach | yes, passive (it still crawls every link) | `sw dast <url>`, which runs `zap-baseline.py -t <url> -J zap.json -m 1 -I` in the ZAP Docker image |
| [ZAP](https://www.zaproxy.org/docs/docker/full-scan/) full scan | Apache-2.0 | the above plus injection and XSS candidates found by sending attacks | access control, logic, stored issues, single-page routes the spider misses; active findings need confirming by hand | no | `docker run --rm -v "$(pwd):/zap/wrk/:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000 -m 5 -J zap-full.json` |
| [ZAP](https://www.zaproxy.org/docs/docker/api-scan/) API scan | Apache-2.0 | active scan of the routes listed in an OpenAPI, GraphQL or SOAP description | routes missing from the description, access control | no | `zap-api-scan.py -t openapi.json -f openapi` in the same image **(nv)** |
| [Schemathesis](https://schemathesis.readthedocs.io/en/stable/) | MIT | server errors on unexpected input, invalid input accepted, answers that break the schema, routes declared protected that answer without credentials (`ignored_auth`) | routes missing from the schema, business logic; a schema that is wrong looks like a failure | no: it calls every write route | `uvx schemathesis run http://localhost:3000/openapi.json -H "Authorization: Bearer $TOKEN" --max-examples 50 --rate-limit 100/m --exclude-method DELETE` (`uvx` launcher **(nv)**) |
| [Nuclei](https://github.com/projectdiscovery/nuclei) | MIT (engine and community templates) | exposed files and panels, known misconfigurations, known CVEs, by template | anything without a template: custom code, access control, logic | no by pack policy | `nuclei -u http://localhost:3000 -tags misconfig,exposure,tech -etags dos,intrusive,fuzz -s medium,high,critical -rl 20 -jsonl -o nuclei.jsonl` |
| [testssl.sh](https://github.com/testssl/testssl.sh) | GPL-2.0 | TLS protocols, ciphers, certificate chain, known TLS flaws, HSTS | everything above TLS; useless on `http://localhost` | yes, passive (handshakes only; may trip an intrusion detector) | `docker run --rm -it ghcr.io/testssl/testssl.sh https://<staging host>` |

Notes on ZAP:

- Exit codes of the packaged scans: 0 clean, 1 at least one FAIL, 2 at least one WARN, 3 other failure. `-I` stops warnings from changing the code. `-c rules.conf` sets each rule to INFO, IGNORE or FAIL; `-g` writes a first rules file; `-j` adds the Ajax spider for single-page apps.
- The baseline is documented by ZAP as fit for CI, production included. `sw dast` still refuses the host declared as `urls.production` unless `--allow-production` is passed after the user agreed.
- ZAP only tests access control through a context built in its desktop interface, so that part is not usable by an agent. Use `sw access`.
- The Automation Framework (`zap.sh -cmd -autorun plan.yaml`) is ZAP's preferred path and runs without Docker. The notes could not read its authentication schema: not verified, so no plan is given here.

Notes on Nuclei: the default rate is 150 requests per second, so always set `-rl`. Keep `-code` off and unsigned templates disabled (`-dut`). Do not add `-dast` or fuzzing tags outside local.

Notes on Schemathesis: exit 0 pass, 1 failures, 2 could not run. Treat a conformance failure as "the schema or the code is wrong", not as a vulnerability. It also has an `object_level_authorization` check and takes several users through a shared auth file (`--auth-wfc`); the field names of that file were not read: not verified.

## Static scanners (read the repository, never the running site)

| Tool | Licence | Finds | Misses | Safe on production | Command |
| --- | --- | --- | --- | --- | --- |
| [OSV-Scanner](https://github.com/google/osv-scanner) | Apache-2.0 | known vulnerabilities in dependencies, and packages recorded as malicious (`MAL-` ids) | a malicious release not yet recorded, typosquats; dev-only and unreachable code show as findings | n/a | `osv-scanner scan source -r .` |
| [gitleaks](https://github.com/gitleaks/gitleaks) | MIT | secrets in git history and in the working tree, offline | secrets outside git (CI variables, logs); cannot say if a key is still live; fixtures and hashes show as findings | n/a | `gitleaks git --redact --report-format sarif --report-path gitleaks.sarif` then `gitleaks dir .` |
| [betterleaks](https://github.com/betterleaks/betterleaks) | MIT | same job, by the same maintainers; more sources, optional live validation (`--validate`) | young: its second major version was not stable when checked | n/a (validation calls the provider: off by default, ask first) | read its README; command not captured in the notes |
| [Opengrep](https://github.com/opengrep/opengrep) | LGPL-2.1 | code patterns from the rules you give it, with taint tracking across functions and, with `--enable-interfile`, across files | ships no rules; access-control logic; dependencies | n/a | `opengrep scan -f rules/ --sarif-output=opengrep.sarif .` |
| [Semgrep CE](https://docs.semgrep.dev/licensing) engine | LGPL-2.1 (engine only) | code patterns; taint tracking inside one function | data flow across functions and files (paid edition), secrets and dependency scanning | n/a | `semgrep scan --config rules/ --sarif --output semgrep.sarif --metrics=off --error` **(nv)** |
| [Hadolint](https://github.com/hadolint/hadolint) | GPL-3.0 | Dockerfile mistakes, shell errors in `RUN` lines | the built image; maintenance activity in 2026 not verified | n/a | `hadolint -f sarif -t warning Dockerfile` |
| [Checkov](https://github.com/bridgecrewio/checkov) | Apache-2.0 | misconfigurations in Terraform, Kubernetes, Dockerfiles, CI files | many generic rules that do not fit a small VPS: filter with `--check` or `--skip-check` | n/a | `checkov -d . -o sarif --compact --soft-fail --skip-download` |
| [zizmor](https://github.com/zizmorcore/zizmor) | MIT **(nv)** | GitHub Actions workflows: unpinned actions, injection in `run:`, wide permissions | other CI systems | n/a | `zizmor .` **(nv)** |
| `npm audit signatures` | ships with npm | installed packages whose registry signature or provenance attestation is missing or invalid | whether the signed code is safe | n/a | `npm audit signatures` |
| SBOM: `npm sbom`, or [cdxgen](https://github.com/CycloneDX/cdxgen) (Apache-2.0 **(nv)**) | ships with npm | nothing by itself: a CycloneDX list of what a release contains, to scan again later | vulnerabilities, until scanned | n/a | `npm sbom --sbom-format cyclonedx > sbom.cdx.json` **(nv)** |

Notes:

- gitleaks is in maintenance: its README says it is feature complete and will only get security patches. Its author moved to betterleaks. Use gitleaks today, and move when betterleaks is stable.
- A leaked secret is rotated, not only deleted. No scanner proves a secret was never copied.
- OSV-Scanner on pnpm: a lockfile can hold two YAML documents, and a reader that stops at the first reports zero dependencies. Check that the dependency count is above zero. Do not run `osv-scanner fix` on a project you do not trust: it runs the package manager.
- `npm audit --audit-level=high --omit=dev` and `pnpm audit --prod` list known advisories. They miss a malicious package until an advisory exists. `sw supply` does not look for known vulnerabilities: that is the pack's separate dependency audit check.
- Generate one SBOM per release and store it with the artifact.

### Semgrep's own rules must not be redistributed

The engine is LGPL-2.1, the rules Semgrep maintains in its registry (`p/default`, `p/owasp-top-ten` and others) are not. Since December 2024 they are under the Semgrep Rules License v1.0: use is limited to your own internal purposes, the rules may not be distributed, and they may not be offered to others as a service (https://semgrep.dev/legal/rules-license/). Consequences, as an engineering reading and not legal advice:

- This plugin ships none of those rules and never copies one into a repository.
- A user who runs `semgrep scan --config p/default` on their own code is within internal use. That is their call.
- With Opengrep or the CE engine, use rules you wrote, or third-party packs whose licence you checked one by one (some are AGPL-3.0).

## Excluded

| Tool | Reason |
| --- | --- |
| CodeQL CLI on closed-source repositories | its terms allow open-source codebases, research and demos; any other codebase needs a paid GitHub licence (https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md). Fine on a public repository under an OSI licence, through GitHub's free code scanning |
| Bearer CLI | Elastic License 2.0: source-available, not open source; cross-file analysis is paid (https://github.com/Bearer/bearer) |
| Autorize, AuthMatrix | free extensions, but they run inside Burp Suite, which is proprietary and has no headless mode in its free edition. The method (replay as another account, compare) is what `sw access` does |
| Burp Suite Professional, paid scanners and paid tiers in general | paid |
| Semgrep registry rules, Semgrep Code, Secrets, Supply Chain | rules not redistributable (above); the products are paid |
| trufflehog | not excluded from use, but never bundled: AGPL-3.0, and by default it checks each secret by calling the service that issued it, so secret material leaves the machine. Only with the user's consent, or with `--no-verification` (https://github.com/trufflesecurity/trufflehog) |
| Checkov severity filter and SCA | need a Prisma Cloud API key |
| Trivy | free (Apache-2.0) but not a default here: its release channel was compromised in March 2026 (below) and its state after April 2026 was not verified. If used: a pinned version with a checksum, never `latest` |
| sqlmap | GPL-2.0, but an exploitation tool: it can rewrite a table. Not run by the agent. Fix with parameterised queries instead |
| Dockle | licence unclear (repository metadata and README disagree): not verified |
| securityheaders.com, hosted header graders | hosted service, terms not verified, and they send the hostname to a third party. `sw web` reads the headers locally |
| ZAP Access Control add-on | rules must be created in the desktop interface |

## Pin your tools

A scanner runs with access to the code and often to CI secrets, so it is part of the supply chain. On 19 March 2026 an attacker who had stolen a token published a malicious Trivy binary and moved 76 of the 77 version tags of `trivy-action` to malicious commits; malicious Docker images followed on 22 March (CVE-2026-33634; https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/). Projects that referenced a tag ran the attacker's code.

- Install a named version and check the published checksum or signature (Opengrep signs its releases with Cosign).
- In CI, reference actions by full commit SHA and Docker images by digest (`image@sha256:...`), not by `latest` or a moving tag. `sw dast` uses the `stable` tag of the ZAP image: pin a digest in CI.
- Never pipe an install script from a `main` branch into a shell.
- Write the version of every tool in the report.
- If a tool you ran is later reported compromised, rotate every secret that pipeline could read.

## Rate and time limits

These are the pack's defaults. Lower them on a small staging server.

| Tool | Limit |
| --- | --- |
| ZAP spider | 5 minutes (`-m 5`) |
| ZAP active scan | 20 minutes by default, hard stop at 60; 2 threads per host at most **(nv)** |
| Nuclei | `-rl 20` requests per second; `-rl 5` for a restricted run on a host you own |
| Schemathesis | `--rate-limit 100/m`, `--max-examples 50` |
| `sw auth` | 20 wrong passwords by default, 50 at most |

## Reference standards (as of 2026-11-12)

- OWASP Top 10:2025 is the current edition; A01 is broken access control and now includes SSRF. The exact date it became final was not verified (https://top10.owasp.org/2025).
- OWASP API Security Top 10: the 2023 edition is still current (https://api-security.owasp.org/editions/2023/en/0x11-t10).
- OWASP ASVS 5.0.0, May 2025, CC BY-SA 4.0: cite requirements by id (`v5.0.0-<chapter>.<section>.<requirement>`), never copy their text (https://github.com/OWASP/ASVS).
- OWASP Top 10 for LLM Applications: the 2025 edition is the latest on the official page; a 2026 edition was not verified (https://genai.owasp.org/llm-top-10/).
- CWE Top 25: the 2025 list is current; no 2026 list was published on that date (https://cwe.mitre.org/top25/).

## Sources

- ZAP: https://www.zaproxy.org/docs/docker/baseline-scan/ , https://www.zaproxy.org/docs/docker/full-scan/ , https://www.zaproxy.org/docs/automate/automation-framework/ , https://www.zaproxy.org/docs/desktop/addons/access-control-testing/
- Schemathesis CLI reference: https://schemathesis.readthedocs.io/en/stable/reference/cli/
- Semgrep licensing and editions: https://docs.semgrep.dev/licensing , https://docs.semgrep.dev/semgrep-pro-vs-oss
- npm: https://docs.npmjs.com/cli/v11/commands/npm-audit , https://docs.npmjs.com/cli/v11/commands/npm-sbom (nv)
- pnpm lockfile caveat: https://pnpm.io/supply-chain-security
