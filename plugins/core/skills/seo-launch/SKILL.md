---
name: seo-launch
description: "Gets the public pages of a site found on search engines, from the choice of keywords to the launch: picks the searches to be found for (one main phrase per page), writes each page's title, meta description, h1 and first paragraph around it, builds sitemap.xml and robots.txt, declares the site in Google Search Console and submits the sitemap, then checks indexing. Measures it with qp seo. Use when public pages are written or changed, before a launch, when the user mentions SEO, keywords, Google, Search Console, sitemap, title tag, meta description, ranking or indexing. FR : référencement, SEO, mots-clés, Google Search Console, sitemap.xml, balise title, meta description, indexation, ressortir sur Google."
---

# SEO launch

A page is found when it answers a search someone really types, says so where search engines look first, and can be reached and indexed. This skill covers those three things and the launch steps. It cannot promise a position: ranking depends on competition, links and time. Say that to the user instead of promising results.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs"`, written `sw` below. Criteria SEO-01 to SEO-10.

## 1. Choose the searches

One main phrase per page, chosen before the page is written.

1. Ask the user for the words customers use: support messages, reviews, what people say on the phone, the questions asked before buying. People search for their problem ("facture auto-entrepreneur modèle"), not for the product's category name.
2. List the public pages and give each one a search it should answer: home page (what the product is, for whom), each feature or service page (one need each), pricing, each article (one question each). For a local business, the phrase includes the place ("plombier Annecy").
3. Prefer a precise phrase of three to five words that the page can truly answer to a broad word everyone fights for. Do not invent search volumes: without a tool the user trusts (Search Console after launch, Google's keyword planner, the suggestions shown under the search box), say that volume is unknown.
4. No two pages target the same phrase: they would compete with each other. Merge them or split the intent.
5. Record them:

```json
"seo": {
  "keywords": [
    { "page": "/", "keyword": "logiciel de facturation pour indépendants" },
    { "page": "/tarifs", "keyword": "prix logiciel de facturation" },
    { "page": "/blog/facture-auto-entrepreneur", "keyword": "modèle de facture auto-entrepreneur" }
  ],
  "search_console": { "verified": "", "sitemap_submitted": "" }
}
```

## 2. Write each page around its phrase

The phrase goes where a reader and a search engine both look, once each, in a natural sentence:

| Place | Rule |
| --- | --- |
| Address | Short, lower-case, words separated by dashes, containing the phrase's main words: `/logiciel-facturation-independants`. Never change a published address without a 301 redirect. |
| `<title>` | 15 to 60 characters. What the page offers first, the site's name last: "Logiciel de facturation pour indépendants – Nom". Unique to the page. |
| Meta description | 70 to 160 characters. One or two sentences that say what the visitor will find and why to click; it is the text shown under the title in results. Unique to the page. |
| `<h1>` | One per page, close to the title without copying it word for word. |
| First paragraph | Says in plain words what the page answers, with the phrase or its close variant in the first hundred words. |
| Headings | `h2` and `h3` follow the questions a visitor has, in order. No level skipped. |
| Images | Alt text that describes the image; a file name with words, not `IMG_0042.jpg`. |
| Links | Pages link to each other with words that say where the link goes, not "click here". |

What not to do: repeat the phrase in every sentence, stack keywords in the title or the footer, hide text, write a page per city with the same text, or publish pages with nothing to say. Search engines demote these, and readers leave.

The lengths are house settings: results are cut by width, not by a fixed count, so a title of 62 characters is not an error. Write for the reader first.

Content must be in the HTML the server sends (SEO-04): a page built only in the browser may be indexed late or not at all.

## 3. Sitemap and robots.txt

- Generate `sitemap.xml` from the real list of public pages, at build time or on request, never by hand. In it: only canonical https addresses of the production domain that answer 200, each with a `lastmod` date that is the date of its last real change. No private page, no redirect, no page marked `noindex`, no address of the staging site or `localhost`.
- Above 50,000 addresses or 50 MB, split it and add a sitemap index.
- `robots.txt` at the root: it does not block the site in production, and it gives the sitemap's address: `Sitemap: https://example.com/sitemap.xml`.
- Staging is the reverse: not indexable (password, or `noindex` header), and never listed in a sitemap that search engines can reach.

Most frameworks have a built-in or standard way (a `sitemap` route or file in Next.js, an integration in Astro, a module in Nuxt): use it rather than writing XML by hand, and check its output.

## 4. Measure

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/sw.mjs" seo https://example.com
```

It reads the site like a search engine, without running scripts: the sitemap and robots.txt, then each page of the sitemap (60 at most by default). It reports as **must**: no sitemap, an address of another host in it, a sitemap page that does not answer 200 or carries `noindex`, robots.txt blocking the whole site, a missing title or description, a title used on several pages, a keyword not carried by its page, Search Console not confirmed. As **should**: sitemap not declared in robots.txt, missing `lastmod`, title or description outside the lengths, repeated descriptions, pages without exactly one `h1`, thin pages, images without alt text, no keywords declared, one phrase targeted by two pages.

A keyword passes when its page has every meaningful word of the phrase in the title and the h1, and in at least two of: description, first paragraph, address. Accents and case are ignored. Before launch, run it on staging to check the pages; the sitemap checks only make sense on the production address.

## 5. Declare the site (the user does this)

You cannot do these steps: they need the user's Google account and, for the best method, their domain's DNS. Give them the steps, wait, then record the dates.

1. Open Google Search Console and add a property. Choose **Domain** (covers http, https, www and subdomains): Google gives a TXT record to add at the domain's DNS provider. The alternative, **URL prefix**, is verified with an HTML file at the site's root or a `google-site-verification` meta tag in the home page's `<head>`; you can add that file or tag in the code if the user gives you the value.
2. Once verified: **Sitemaps** › enter `sitemap.xml` › Submit. The status should read "Success" after a moment.
3. **URL inspection** on the home page and two key pages: "Request indexing" for each.
4. A few days later, **Pages**: look at "Why pages aren't indexed" and fix real errors (not found, redirect, blocked by robots.txt, noindex, duplicate without canonical).
5. Optional: the same in Bing Webmaster Tools, which can import the property from Search Console.

Then write the two dates in `.quality/project.json` › `seo.search_console` (`verified`, `sitemap_submitted`). `sw seo` counts Search Console as done only when both are there; it can see a verification tag on the home page, not a DNS verification or a submitted sitemap.

## 6. After launch

- When a page moves, redirect the old address (301) and update the sitemap and the internal links.
- A month after launch, read the Search Console performance report with the user: the searches the site really appears for are the best source for the next pages and for rewriting titles that get impressions and few clicks.
- Structured data suited to the site type (SEO-06) and a share image (SEO-03) help how a result looks, not whether it ranks.

## Report

```
Keywords: <n> pages with a target phrase · not carried by their page: <list>
Titles and descriptions: <n> pages read · missing <n> · outside length <n> · repeated <n>
Sitemap: <n> addresses · broken or noindex: <list> · declared in robots.txt: <yes|no>
Search Console: verified <date|not done> · sitemap submitted <date|not done>
Not checked: ranking, search volume, links from other sites
```
