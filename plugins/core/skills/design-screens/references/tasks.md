# Recipes by task

Each recipe: when it applies, the phone layout (under 600 px), the desktop layout (840 px and up), the rules, the classic mistakes. Between 600 and 839 px, take the desktop layout with two panes at 50/50 at most.

Contents: [Editor with preview](#editor-with-preview) · [Wizard](#wizard) · [List-detail](#list-detail) · [Settings](#settings) · [Checkout](#checkout) · [Dashboard](#dashboard) · [Search with filters](#search-with-filters) · [Long form](#long-form) · [Data table](#data-table) · [Empty state](#empty-state) · [First run](#first-run)

## Editor with preview

Photo, collage, video, document, design or configuration with a visible result.

- **Phone:** the preview sticks at the top and takes the space it needs. Below it, a scrolling bar of tool categories; picking one turns the bar into that tool's options or opens a non-modal half-height sheet that never covers the edited part. Undo, Redo and Export or Save at the top. Press-and-hold to compare before and after.
- **Desktop:** canvas in the centre, a rail of tools on the left, an inspector for the current selection on the right (about 30 %), a timeline at the bottom for video. Panels, not modals.
- **Rules:** the preview stays visible while adjusting (flows: `preview_visible_while_adjusting` at least 0.8). One primary action (Save or Export). Each tool category shows its options only when chosen: never every option of every tool at once. A theme or template keeps what the user already chose, or says what it replaces and offers undo.
- **Mistakes:** a modal over the canvas; options covering the edited zone; a step-by-step wizard for creative work (it must stay non-linear); a long page of settings with the preview scrolling away.

## Wizard

A linear task done rarely, with steps that barely depend on each other: a first configuration, a public form, an application.

- **Phone:** one question or one topic per screen, a sticky action bar, Back at the top. At most "Step 3 of 7". Save and resume.
- **Desktop:** the same single column, two thirds of the width at most; a review page at the end with a "Change" link per answer that returns straight to the review.
- **Rules:** choose one convention per project. Public, rare, high-stakes forms: one question per page, "Continue" aligned left, test without a progress indicator first (GOV.UK). Configuration inside software: a list of steps with the current one highlighted, and a button that names the next step (NN/g).
- **Mistakes:** losing answers on Back; clickable steps that let users skip required ones; a wizard for something users do every day.

## List-detail

See the shell. Phone: full-screen list pushing the detail, a "New" action. Desktop: list on a third, detail on two thirds, a placeholder when nothing is selected.

- **Mistakes:** an empty detail pane; the selection lost on resize; the list's scroll position lost on Back.

## Settings

- **Phone:** a grouped list of categories pushing sub-pages; each sub-page holds one group.
- **Desktop:** a sidebar of categories and a content pane; search at the top past about 20 settings.
- **Rules:** at most two levels. Each setting shows its current value in the list. Apply immediately when the change is safe and reversible; otherwise an explicit Save with Cancel. Group by the user's goals, not by the code's modules.
- **Mistakes:** one endless page; OK without Cancel; settings that need a restart without saying so.

## Checkout

- **Phone:** one column; the total and the pay button stick at the bottom; guest checkout offered first; about 8 fields.
- **Desktop:** the form on two thirds, a sticky order summary on one third; a review step with "Change" links.
- **Rules (Baymard):** aim for 7–8 visible fields (the average site shows 11 to 15). One "Full name" field rather than first and last name (42 % of users type their full name into "First name"). "Address line 2" collapsed behind a link. Billing address same as delivery by default. Coupon field collapsed. Total cost, delivery included, visible before payment. Inline validation when the user leaves the field, error removed as soon as it is fixed.
- **Mistakes:** a forced account (18 % of abandons); hidden costs (40 %); a checkout too long (17 %).

## Dashboard

- **Phone:** a single-column feed, the key indicator first, filters in a sheet.
- **Desktop:** an adaptive grid; global filters (period, scope) in a toolbar; the key figures bigger than the rest.
- **Rules:** each card answers a question the user actually asks, with a comparison (previous period, target). Every number links to its detail. A new account gets an empty state with the first action, not a grid of zeros.
- **Mistakes:** identical cards of the same size; charts without a question; a blank dashboard without a call to action.

## Search with filters

- **Phone:** a sticky bar with "Filter (n)" and "Sort"; filters in a full-height sheet ending with "Show n results"; chips of applied filters above the results, each removable.
- **Desktop:** facets on the left, applied filters as removable chips above the results, sort above the results.
- **Rules (Baymard):** several values per filter; an overview of applied filters; the four useful sorts; a "no results" page that offers a way out (spelling, broader filters, similar items). Autocomplete that suggests queries and categories, not just products.
- **Mistakes:** a separate filter page that forces back-and-forth (most mobile catalogues fail here); losing filters on Back.

## Long form

- **Phone and desktop:** one column (two thirds of the width at most on desktop), labels above fields, never inside as placeholders. Expert users: titled sections on one page. Occasional users: one thing per page.
- **Rules:** mark optional fields with "(optional)", not required ones with asterisks. Field width matches the expected input. The right input type and `autocomplete` on personal data. Errors next to the field, in words that say how to fix it; the input is kept. No information asked twice.
- **Mistakes:** several fields per row (except closely related pairs such as postcode and city); sliders for precise values; links inside help text; blocking paste in passwords.

## Data table

- **Phone:** do not shrink the table. One card per row with 2 to 4 fields, or horizontal scrolling with the first column frozen.
- **Desktop:** sticky header, frozen first column, checkboxes with a bulk action bar, editing in a side panel.
- **Rules:** the first column is a readable identifier, not a technical ID. At most two inline actions per row; more go in a menu. Numbers right-aligned with the same precision.
- **Mistakes:** editing in a modal that hides the neighbouring rows; a table squeezed to phone width.

## Empty state

- **Phone and desktop:** the status, why it is empty, one primary action, and a secondary help link. Inside the pane on desktop, not a full page.
- **Rules:** while loading, show a skeleton that matches the real layout; "no results" only once loading has finished.
- **Mistakes:** a blank area; an illustration with no action.

## First run

- **Rules:** skip it if you can. Ask only what is indispensable, then land the user in the product with its empty states teaching the next action. Offer optional help when it is needed, in context.
- **Evidence:** slide-deck tutorials did not improve success or time on 70 users across 4 apps, and made tasks feel harder (NN/g).
- **Mistakes:** an intro carousel; a tour that blocks the screen.
