# Identity from zero

This file is for a product that has no identity yet, or still wears the default one of its component kit. It gives a method for the name, the wordmark, type, icons, colour and imagery, using free resources only, with the licence of each and what the licence forbids. It ends with the table the project keeps so that every asset can be traced.

Licences were checked on 2026-11-12 unless a row says "not verified": those were stated from memory and the licence page was not read. Licences change. Read the licence file of each asset before shipping it. Steps marked "house setting" come from this pack, not from an outside authority.

## Name and wordmark

House settings, in order:

1. **Name.** One to three syllables. Easy to say in each target language. Not a dictionary word with "ly", "ify" or "AI" attached.
2. **Check before committing:** the domain, the trademark databases (EUIPO, INPI, USPTO: free search), and the package registries you will publish to.
3. **Wordmark first.** Set the name in the display face. Make two or three deliberate changes: a custom joint between two letters, a cut terminal, adjusted spacing, one redrawn glyph.
4. **Check the font licence** allows logo use and converting to outlines. The SIL Open Font License does.
5. **Symbol second,** and only if needed. It must hold at 16 px in one colour.
6. **Derive everything from one drawing:** site icon, app icon, share image, social avatar, on the same grid.

Never use a glyph from an icon set as the logo. It looks like the set, and some licences forbid it (Remix Icon does, see below).

By eye: print the wordmark at 16 px, in black, then in white on black. If a letter closes up, simplify.

## Font sources

| Source | Licence | May the font files go in a repository? | Notes |
| --- | --- | --- | --- |
| [Google Fonts](https://fonts.google.com) | Mostly SIL OFL 1.1, some Apache 2.0 or Ubuntu Font Licence (not verified per font) | Yes under OFL: keep the licence file, do not sell the font alone, respect Reserved Font Names if you modify it | The widest catalogue |
| [Fontsource](https://fontsource.org) | Per font (not verified) | As the font's own licence | npm packages of open fonts: self-hosting with no third-party request. A good default channel |
| [Fontshare](https://www.fontshare.com) (Indian Type Foundry) | ITF Free Font License: free of charge, proprietary, not open source | **Unverified. Treat as no.** The licence text could not be read (the page needs JavaScript). Secondary summaries say redistribution and modification are restricted | Free for personal and commercial use. The end project may load or self-host these fonts. Do not copy them into a template, a starter or this pack |
| [Velvetyne](https://velvetyne.fr) | Libre, mostly OFL (not verified) | Per font: the licence file in the download decides | Expressive display faces: one accent role only |
| [Collletttivo](https://www.collletttivo.it) | OFL (not verified) | As OFL | |
| [The League of Moveable Type](https://www.theleagueofmoveabletype.com) | OFL (not verified) | As OFL | |
| [Open Foundry](https://open-foundry.com) | Curated open-source fonts (not verified) | Per font | |
| [Uncut.wtf](https://uncut.wtf) | Mixed licences (not verified) | Per font: check each | A catalogue, not a foundry |
| Vendor faces: IBM Plex, Mona Sans and Hubot Sans (GitHub), JetBrains Mono, Inter, Geist (Vercel) | OFL (not verified) | As OFL | Inter and Geist are the two most common faces of generated pages: not as the only face |

Sources: https://openfontlicense.org, https://www.indiantypefoundry.com/news/introducing-fontshare (announcement only, not the licence text).

## Pairing rules

- Two families at most, plus a monospace if the product shows code or data.
- The text face has real italics (drawn, not slanted by the browser), tabular figures and four weights or more.
- The display face is used above about 24 px only (house setting).
- Pair by role: one face with character for headings, one quiet face for text. A serif text face gets a little more line height.
- Not Inter or Geist alone. House setting: treat Roboto, Poppins, Montserrat and Space Grotesk as over-familiar too.
- Choose from the subject and the audience: what do printed things in this field look like? What did the user's references use?

Delivery:

```css
@font-face {
  font-family: "Text";
  src: url("/fonts/text-latin.woff2") format("woff2");
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC;
}
@font-face {
  font-family: "Text Fallback";
  src: local("Arial");
  size-adjust: 104%; /* tune until the swap moves nothing */
}
body { font-family: "Text", "Text Fallback", sans-serif; }
```

Self-host, subset to the scripts in use, preload the one or two files needed above the fold. `size-adjust` on the fallback keeps the layout still when the font arrives (not verified on MDN; the percentage is an example).

Measured by `sw look`: `LOOK-FONT` (a common default face sets more than 60 % of the text), `font_families` (2 at most above 2 % of the text). Measured by `sw craft`: `font_weights`, `layout_shift`. By eye: italics, tabular figures, the licence record.

## Icon sets

Licences read on GitHub on 2026-11-12.

| Set | Licence | Notes |
| --- | --- | --- |
| [Phosphor](https://github.com/phosphor-icons/core) | MIT | Six weights, duotone included: the easiest to move away from a default look |
| [Tabler](https://github.com/tabler/tabler-icons) | MIT | Stroke width adjustable |
| [Iconoir](https://github.com/iconoir-icons/iconoir) | MIT | |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | MIT | |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC; the parts derived from Feather are MIT (that part not verified) | The default of shadcn/ui, so the most recognisable when left untouched |

**Excluded from anything redistributed: Remix Icon.** Since January 2026 it is under the Remix Icon License v1.0, which is not open source. It still allows free commercial use inside a product and modification. It forbids selling the icons as a pack, building a competing set, and using an icon as a logo or trademark. Versions before 4.9.0 were Apache 2.0. A project that ships its own product may use it. A template, a starter, a component kit or this pack may not include version 4.9.0 or later. Licence text: https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/License

## Making a set not look default

House settings:

- One set per product. One stroke width as drawn on screen.
- Set the stroke by size so the icon weighs the same as the text beside it: 1.5 px at 20 to 24 px, 1.25 px at 16 px.
- Change two defaults or more: stroke width, corner join, size grid, or a filled or duotone variant for the active state.
- Draw the three to six icons of the product's own objects (the thing users create, send or track) on the same grid, same stroke, same joins. Never a generic icon for the core concept.
- No icon tile above every heading. No sparkles for "AI". An icon-only button carries an `aria-label`.

```css
.icon { width: 20px; height: 20px; stroke-width: 1.5; stroke-linejoin: round; }
.icon-sm { width: 16px; height: 16px; stroke-width: 1.25; }
```

Measured by `sw craft`: `icon_stroke` (two stroke widths on screen at most), `icon_style` (outline and filled mixed), and the signal "every icon is an unmodified Lucide icon". Measured by `sw look`: `LOOK-ICONTILES`, `LOOK-EMOJI`. By eye: the custom icons, the optical weight next to text.

## Colour system

The scale and contrast rules are in [color.md](../../design-direction/references/color.md). The method for an identity:

1. **Start from the subject.** List the colours the field already owns (its materials, its documents, its places) and the ones the competitors all use. Pick the hue from the first list, away from the second.
2. **Few inputs.** Linear builds each theme from three: a base colour, an accent colour and a contrast level. Everything else is computed. Fewer inputs means fewer colours that drift.
3. **A perceptually uniform space** (OKLCH, LCH or CIELAB), so one lightness step looks the same in every hue and elevation can be computed from lightness.
4. **Steps that predict contrast.** After Stripe: a fixed step distance guarantees 4.5:1 or 3:1 in every hue. See details.md.
5. **Neutral chrome.** Keep the chroma of bars, panels and borders low and lean it toward the brand hue. One accent per view.
6. **A contrast input** gives a high-contrast theme from the same system.

The three reflex palettes to avoid unless `DESIGN.md` gives a reason: purple to indigo; cream with terracotta; near-black with acid green. Test: would this palette be the same for a plant shop and an accounting tool? Then it was not chosen.

Measured by `sw look`: `LOOK-VIOLET` (primary hue 240 to 290°), `LOOK-PALETTE` (the cream and near-black pairs), `accent_share`. All thresholds are house settings. By eye: the link between the hue and the subject.

Sources: Linear (https://linear.app/now/how-we-redesigned-the-linear-ui), Stripe (https://stripe.com/blog/accessible-color-systems), Vercel guidelines (https://vercel.com/design/guidelines), ibelick/ui-skills (https://github.com/ibelick/ui-skills), Impeccable (https://impeccable.style/anti-patterns), Anthropic `frontend-design` skill (https://github.com/anthropics/skills/tree/main/skills/frontend-design).

## Imagery

Ranked. Go down one level only when the level above is not possible.

1. **The real product:** screenshot crops, annotated screens, live components in the page.
2. **Diagrams and data made for this page.**
3. **Own photos** of the real team, place or object.
4. **Archive or public-domain images,** all given one treatment: the same duotone, crop ratio and grain.
5. **Nothing.** Type and space carry a page better than a filler image.

| Free source | Licence | Limits |
| --- | --- | --- |
| [Unsplash](https://unsplash.com/license) | Unsplash License: free commercial use, no credit required | Not CC0. No selling unmodified copies, no compiling into a competing service. People, brands and artworks in a photo are not cleared |
| [Pexels](https://www.pexels.com/license/) | Pexels License, similar (not verified) | Same cautions |
| [Openverse](https://openverse.org) | Search across Creative Commons and public-domain works (not verified) | Licence per item; credit is usually required; NC and ND items exist |
| Museum open access: The Met, Rijksmuseum, Smithsonian | CC0 on items flagged as open access (not verified) | Check the flag on each item |

Stock photos are the most familiar material on the web. Museum and archive items are less used; that is the reason for level 4. Credits go in one footer line or a credits page.

## Generated imagery

House settings. The usual defects: unreadable text and interface inside the image, wrong hands and reflections, a style that changes from one image to the next, the glossy 3D blob, compression halos, a wrong aspect ratio.

- No generated image that contains text, an interface or people.
- A generated texture or abstract background is acceptable when every image of the product comes from the same recipe (same prompt base, same treatment). Record the recipe.
- A generated picture of the product is a false claim about the product: use the real screen.
- Record the tool, the date and the tool's terms of use, like any other source.

Every image, generated or not, has a real `alt`, explicit dimensions and a row in the record.

Measured by `sw craft`: `image_distortion`, `image_sharpness`, `image_dimensions`. By eye: the content of each image, the consistency of treatment.

## Record it

Keep this table in the project (`SOURCES.md`, or a section of `DESIGN.md`). One row per font, icon set, image, illustration and sound. Add the row when the asset enters the repository, not at launch.

| Asset | Source | Licence | Date | Notes |
| --- | --- | --- | --- | --- |
| Text face: Example Sans, 4 weights | fontsource.org/fonts/example-sans | SIL OFL 1.1 | 2026-11-12 | Self-hosted, Latin subset, licence file in `/fonts` |
| Icons: Phosphor, regular and fill | github.com/phosphor-icons/core | MIT | 2026-11-12 | Stroke set to 1.5 px; 4 custom icons drawn in-house |
| Hero photo `team.jpg` | Own photo, taken by a team member | Own work | 2026-10-30 | Written consent of the people shown |
| `archive-01.jpg` | Museum collection, object number | CC0 (open-access flag checked) | 2026-11-02 | Duotone treatment |

Rules for the record:

- No row, no asset. An image whose source nobody can name is removed.
- The date is the day the licence was read.
- Restricted licences are written out in Notes: "not to be redistributed", "credit required", "no logo use".
- Fonts from Fontshare and Remix Icon 4.9.0 or later get the note "do not copy into a public template".

`sw craft` and `sw look` do not read this table. The report line "Identity" in `SKILL.md` states whether it exists.

## Excluded

| Item | Reason |
| --- | --- |
| Paid inspiration galleries (Mobbin, Refero) | Paid or freemium |
| Paid UI kits, paid icon packs, paid stock photos, paid prompt libraries | Paid |
| Paid courses and books on design | Paid; nothing from them is used here |
| Illustration kits (unDraw, Open Peeps, Humaaans) | Free (licences not verified), but recognised at once as kits: a tell |
| Remix Icon 4.9.0 and later, in anything redistributed | Not open source since January 2026 |
| Fontshare fonts copied into a repository meant for reuse | Licence text not verified |
| An icon-set glyph as a logo | Default look; forbidden by some licences |
| Generated images with text, an interface or people | Visible defects; a false picture of the product |
| A fixed catalogue of styles or palettes to pick from | Produces the same recognisable outputs for everyone |
