# Copy that says something

This file is for the words on the screen: buttons, errors, empty states, headlines and the claims of a public page. It gives rules as before and after pairs, the rule on facts, the structures and words that make a text read as generated (English and French), the typography of both languages, and readability targets. The word lists are not bans: rewrite a listed word when it carries no fact.

Checked on 2026-11-12. "House setting" marks a threshold chosen by this pack and not validated. "Not verified" marks a value stated from memory and not read again on its source.

## Microcopy rules

| Where | Before | After | Rule |
| --- | --- | --- | --- |
| Button | Submit | Send invoice | Verb + object. Not "Submit", "Continue", "OK", "Click here" or "Learn more" as the whole label |
| Button in a flow | Publish, then "Done!" | Publish, then "Published" | The same verb through the flow |
| Error | Oops! Something went wrong. | The file is over 10 MB. Choose a smaller file or compress it. | What happened + how to fix it + where. No apology, no blame |
| Error, field | Invalid input | Enter the date as DD/MM/YYYY | Say the expected form, beside the field |
| Empty state | No data | No invoices yet. Create the first one or import a CSV file. | One sentence on what belongs here, one action |
| Placeholder | Email | name@company.com | An example value, never the label. The label stays visible above the field |
| Menu item, loading label | Rename; Loading | Rename…; Saving… | The ellipsis character when the item opens a dialog, and on a loading label, which names the action |
| Headline | The future of invoicing | Send an invoice in 30 seconds, from your phone | What the product does, for whom, in the customer's words |
| Count | Three files selected | 3 files selected | Numerals for counts |
| Naming | "Workspace" here, "Team" there, "Organisation" in billing | "Workspace" everywhere | One word per thing; as few invented terms as possible |

More rules, same sources:

- Active voice, second person, the verb first.
- Sentence case for buttons and headings, unless the house style says otherwise. One rule on the whole product.
- A unit follows its number after a non-breaking space. Currency has 0 or 2 decimals, the same everywhere.
- The "30 seconds" in the headline above must be true and measured. If it is not, write the outcome without a number.
- No customer words to draw on? Ask the user for support messages, reviews or interview notes before writing the headline (house setting).

Measured: `qp craft` checks `label_case` (Title Case and sentence case mixed on buttons). By eye: every other row. Read each button aloud without its screen: does it still say what will happen?

Sources: Vercel Web Interface Guidelines (https://vercel.com/design/guidelines), Anthropic `frontend-design` skill (https://github.com/anthropics/skills/tree/main/skills/frontend-design).

## The facts rule

Every number, quote, customer logo, badge and award on a page traces to something the user supplied. This is a house rule, and criterion BRD-01 treats a breach as a blocker.

Keep a facts file in the project (for example `.quality/facts.md`):

| Claim on the page | Source | Date |
| --- | --- | --- |
| "4,200 invoices sent in October 2026" | Database count, query in `reports/october.sql` | 2026-11-03 |
| Quote from a named customer | Email from the customer, with written permission | 2026-10-21 |
| Logo of a customer company | Written permission from that company | 2026-10-21 |

When there is no source:

| Missing | Do |
| --- | --- |
| A testimonial | Remove the block. Do not write one "as an example" |
| A metric | Describe what the product does, without a number. Or ask the user for the real figure |
| Customer logos | Remove the row. "Trusted by" needs permission from each company |
| A rating, an award, a compliance badge | Remove it until the user provides the proof |
| A photo and name of a person | Remove them. No stock face with an invented name |

Signs of invented content to search for: lorem ipsum, "John Doe", "Jane Smith", "Acme", `example.com`, "Your Company", round statistics ("10,000+ teams", "99.9 %") with no row in the facts file, a copyright year that is not the current one.

Measured: `qp deslop` flags visible filler text (`placeholder-copy`). By eye: compare each claim on the page with the facts file.

Sources: taste-skill (https://github.com/Leonxlnx/taste-skill) for the placeholder and invented-facts check; the facts file is a house rule.

## Structure tells

A text can avoid every listed word and still read as generated, because of its shape.

| Tell | Before | After |
| --- | --- | --- |
| Rule of three | Three cards, each with a three-word heading and one sentence | Two or four items when that is the true count |
| Equal lengths | Every feature text has 18 to 20 words | One short line, one longer explanation, one with an example |
| "Not X, Y" | "It's not a tool, it's a partner." | Say what it is: "It files your receipts while you work." |
| "No X, no Y, just Z" | "No setup, no code, just results." | "Install takes one command." |
| Significance tail | "…, making it a vital part of your workflow." | Stop the sentence at the fact |
| "Serves as", "stands as" | "The dashboard serves as a hub for…" | "The dashboard shows…" |
| Vague authority | "Experts agree that…" | Name the source, or cut the sentence |
| Heading "X and Y" on every section | "Speed and Reliability" | The claim itself: "Pages load in under a second" |
| Dash in nearly every sentence | Two clauses joined by a dash, again and again | A full stop, a comma or a colon |
| Same label repeated in one card | Heading, tag and button all say "Analytics" | Each slot adds something |

Sentence rhythm (house setting): generated text tends toward sentences of 8 to 20 words, all alike. Over ten sentences or more, a standard deviation of sentence length under about 4 words is a sign. Mix a 4-word sentence with a 22-word one.

Measured: `qp look` flags `LOOK-TRIPLETS` (groups of three identical icon cards) and `LOOK-EMDASH` (more than 8 em dashes per 1,000 words, 15 in French, on pages of 150 words or more). Both thresholds are house settings. By eye: the rest.

Sources: Wikipedia, "Signs of AI writing" (https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing; the first 100,000 of about 244,000 characters were read), Impeccable (https://impeccable.style/anti-patterns).

## English: rewrite when they carry no fact

Test each hit: delete the word. If the sentence loses nothing, leave it deleted. If it loses something, write that thing as a fact.

**Words** (from the Wikipedia page above): additionally, boasts, bolstered, crucial, delve, emphasizing, enduring, enhance, foster, garner, highlighting, intricate, intricacies, interplay, key, landscape, leverage, meticulously, multifaceted, pivotal, prioritize, robust, showcase, tapestry, testament, underscore, valuable, vibrant, deep dive, quietly.

**Phrases** (same source): "stands as", "serves as", "is a testament to", "plays a pivotal role", "plays a crucial role", "plays a key role", "setting the stage for", "despite these challenges".

**Marketing set** (house list, not taken from a source that was read): elevate, unleash, unlock, seamless, seamlessly, effortless, effortlessly, supercharge, empower, revolutionize, game-changing, cutting-edge, next-generation, all-in-one, streamline, harness, reimagine, "in today's fast-paced world", "take X to the next level", "built for teams of all sizes", "the future of X", "say goodbye to".

| Before | After |
| --- | --- |
| A robust, seamless platform that empowers teams | Shared inbox for support teams of 2 to 20 people |
| Unlock powerful insights | See which pages lose visitors, by day |

## French: rewrite when they carry no fact

This list rests on a weak source: one commercial blog that sells a product, plus search summaries. No academic source and no French Wikipedia page was found. Use it as a prompt to reread, not as proof. The marketing set is a house list.

- **Empty transitions:** en outre, de plus, par ailleurs, néanmoins, toutefois, ainsi, dès lors, en somme, en définitive.
- **Intensifiers and vague quantities:** divers, nombreux, multiples, particulièrement, considérablement, hautement, grandement.
- **Corporate verbs:** mettre en œuvre, faciliter, permettre de, optimiser, valoriser, mobiliser, déployer.
- **Openers:** il convient de noter que, il est important de souligner que, il est essentiel de comprendre que, force est de constater, à cet égard.
- **Buzzwords:** incontournable, primordial, essentiel, crucial, indispensable, holistique, robuste, paradigme, synergie, écosystème, révolutionner, « dans le monde actuel », « à l'ère du numérique », plongeons, « trouver le juste équilibre », « joue un rôle clé ».
- **False precision:** « les études montrent », « les experts s'accordent ».
- **Marketing set (house list):** boostez, propulsez, « libérez le potentiel », « sans effort », « en toute simplicité », tout-en-un, « nouvelle génération », révolutionnaire, « une expérience fluide », « passez au niveau supérieur », « conçu pour les équipes de toutes tailles », « dites adieu à ».

| Avant | Après |
| --- | --- |
| Une solution tout-en-un qui permet d'optimiser votre gestion | Devis, factures et relances dans un seul écran |
| Il convient de noter que l'export est disponible | L'export CSV se trouve dans Réglages › Données |

Many of these words are ordinary French ("ainsi", "de plus", "essentiel"). One use is not a defect. Three in a paragraph is a reason to rewrite.

Measured: `qp scan` flags the pack's word list (`referential/slop-words.yaml`) in the source; `qp look` reports the same words on the rendered page as `LOOK-COPY`. By eye: whether a hit carries a fact.

Sources: https://gpt-watermark-remover.com/fr/blog/mots-typiques-ia-eviter (commercial blog), https://digitad.ca/comment-savoir-texte-genere-par-chatgpt/ (read through a search summary only).

## Typography of the text

**French** (not verified on a primary source; the rules are standard French typesetting):

| Rule | Characters |
| --- | --- |
| Narrow non-breaking space before `;` `!` `?` | U+202F (`&#8239;`) |
| Non-breaking space before `:` | U+00A0 (`&nbsp;`) or U+202F |
| Guillemets with a non-breaking space inside | `« texte »` |
| Typographic apostrophe | `l’export`, not `l'export` |
| Number and unit, number and `%` or `€` | `12 %`, `30 €` with a non-breaking space |
| Capitals keep their accents | `État`, `À propos` |

Dash rate: a spaced dash around an aside is normal French. One per paragraph is ordinary (from a search summary). So the check is a rate, not a presence: `qp look` flags more than 15 per 1,000 words in French.

**English:**

| Rule | Characters |
| --- | --- |
| Curly quotes and apostrophe | `“ ” ’`, not `" '` |
| Ellipsis | `…` (one character), not `...` |
| A range or an aside uses a dash, not a hyphen | `10–20`, not `10 - 20` |
| Number and unit | Non-breaking space: `10 MB` |
| Shortcuts and names that must not split | Non-breaking space: `Ctrl K`, a product name of two words |

Dash rate in English: `qp look` flags more than 8 em dashes per 1,000 words (house setting).

Measured: `qp craft` check `typographic_characters` counts straight apostrophes, straight quotes, `...`, a hyphen used as a dash and double spaces. On a page with `lang="fr"`, it also counts missing spaces before `; : ! ? »` and after `«`, and accepts U+00A0 or U+202F. More than 2 hits fails. Text in `code`, `pre`, `kbd` and fields is skipped. By eye: accents on capitals, non-breaking spaces between number and unit.

## Readability targets

| Measure | Target | Status |
| --- | --- | --- |
| Flesch Reading Ease (English) | 60 or more for interface and marketing text | Not verified |
| Flesch-Kincaid grade (English) | 8 or less | Not verified |
| Kandel-Moles score (French) | 50 or more | Formula not verified; target is a house setting |
| Mean sentence length | 20 words or less | Not verified (after GOV.UK) |
| Longest sentence in interface or help text | 25 words | Not verified (after GOV.UK) |
| Spread of sentence lengths | Standard deviation of 4 words or more over 10 sentences | House setting |

Formulas, from memory (check them before coding a tool on them):

```
Flesch Reading Ease   = 206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
Flesch-Kincaid grade  = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
Kandel-Moles (French) = 207 − 1.015 × (words / sentences) − 73.6 × (syllables / words)
```

A score is a warning light. A short text of long technical words can score badly and read well to its audience. No `qp` command computes these scores: by eye, or with a tool of your choice.

Source: https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests (not read again).

## Reference style guides

Read them for depth. The rules above are restated in this pack's own words; none of their text is copied.

| Guide | Licence | Use |
| --- | --- | --- |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) ([repository](https://github.com/vercel-labs/web-interface-guidelines)) | MIT | May be adapted with the MIT notice. Source of most microcopy rules here |
| [Anthropic `frontend-design` skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Apache 2.0 for this skill | May be adapted with the Apache notice and a note of changes |
| [Mailchimp Content Style Guide](https://styleguide.mailchimp.com) | CC BY-NC 4.0 | Cite only. Non-commercial: do not copy its text into a product or a plugin |
| [GOV.UK writing guidelines](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/) | Open Government Licence v3 (not verified) | Cite only here: the new site was not read. Known for: reading age of about 9, sentences of 25 words or fewer, the main point first, plain words (not verified) |
| [Shopify Polaris content](https://polaris.shopify.com/content), [Atlassian content](https://atlassian.design/content) | Not read | Cite only |
| [Wikipedia, "Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | CC BY-SA 4.0 (not verified) | Word list quoted as single words; rules restated |

Not used: paid copywriting courses, paid books and paid prompt libraries.
