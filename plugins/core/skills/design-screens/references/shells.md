# Layout shells

Three shells cover almost every task screen. Pick the shell from the question "does the secondary content make sense on its own?", then adapt it to the window width.

## List-detail

Two kinds of content of equal weight: a collection and the item selected in it.

- **Under 600 px:** one pane at a time. Selecting an item pushes the detail; Back returns to the list with the scroll position kept.
- **600 px and up:** both panes side by side. When nothing is selected, the detail pane shows a useful placeholder (the most recent item, or what to do), never an empty box.
- **Resizing:** going wide from the list alone shows the placeholder; going wide from the detail alone shows both panes with the item highlighted in the list. Going narrow keeps whatever the user was looking at.
- Creation: a single "New" action, at the top of the list on desktop, as the primary action on phone.

## Supporting pane

One main content, and tools or information that only make sense next to it: an editor and its palettes, a document and its comments, a map and its results.

- **Under 600 px:** the main content stays on screen; the supporting content goes below it or into a bottom sheet that does not cover the part being edited.
- **600 to 839 px:** 50/50.
- **840 px and up:** about 70/30, main content first. A third pane (layers, timeline) is possible from 1200 px.
- The supporting pane holds controls for the current selection; it changes with the selection rather than listing everything.

## Feed

Many items of the same kind to browse: a gallery, a catalogue, cards on a dashboard.

- An adaptive grid whose columns follow the width (a minimum column of about 180 px), not a fixed number of columns.
- Size signals importance: the key indicator or the featured item is bigger; identical cards everywhere say nothing.
- Filters and sorting live in a sticky bar on phone and a side or top bar on desktop (see the search recipe).

## Sheets, dialogs and panels

- One sheet at a time. A half-height sheet is for progressive disclosure (options of a tool, a short choice); creating content takes the full height.
- A non-modal sheet or a panel lets the user keep acting on the view behind it: use it when the user adjusts and watches the result, again and again (formatting, filters, tool options).
- OK always comes with Cancel or Back, never all three together. On iOS, Cancel sits on the left and the confirming action on the right.
- Editing a photo or a document: full-screen on a phone, a window or the main pane on a desktop.
- A modal over the thing being edited hides what the user needs to see: prefer a panel.

## Navigation by width

| Width | Navigation |
| --- | --- |
| under 600 px | bottom bar, 3 to 5 destinations, labels under icons |
| 600 to 839 px | navigation rail, or bottom bar if 3 destinations |
| 840 px and up | rail or sidebar; a top bar for a site |

On a phone, a menu is one column: no multi-column mega-menu squeezed to phone width. Avoid a "More" destination that hides frequent places. Never hide or disable a destination depending on state: show it and explain what is missing inside.

## Reach and targets on a phone

- About three people in four tap with one thumb at least part of the time. They reach the centre most easily: 7 mm targets suffice there, about 12 mm in the corners. The green-yellow-red "thumb zone" chart is not accurate: the top of the screen is usable, it just needs larger targets.
- Primary and frequent actions go in a bottom bar; destructive actions go away from them, never next to "Save".
- 44×44 px for primary controls (Apple 44 pt, Android 48 dp), never under 24×24 px (WCAG 2.2 AA), with spacing so that small targets do not overlap.
