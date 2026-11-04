---
name: new-dashboard
description: Create a new tabbed Flourish dashboard (static Netlify site) that follows the structure of the Global_project_dashboard project. Use when the user wants to start a new dashboard, add a new project dashboard, or clone this dashboard for another topic.
---

# New dashboard from the template

The dashboard is a static site with no build step. All of it lives in `template/`:

| File | Role |
|---|---|
| `plots.csv` | Manifest, `;`-separated with header `id;flourish_link;title;data`. One row per Flourish chart. |
| `app.js` | `SHEETS` array defines tabs and which plots appear on each. Reads `plots.csv`, builds the DOM. |
| `index.html` | Page shell: `<title>`, `<h1>` page title, source footnote, empty `#tabs` and `#sheets`. |
| `style.css` | Styling. Reused unchanged. |
| `stations_map.html` | Example of a self-contained HTML page shown in an iframe tab. |

`netlify.toml` at the repo root sets `publish = "template"`. `.gitignore` excludes Google Drive and Netlify cruft.

## Steps

1. **Gather inputs from the user** (ask if missing): dashboard title, source footnote, list of tabs with their charts, and for each chart its public Flourish URL (`https://public.flourish.studio/visualisation/<id>/`), a title, and the published-Google-Sheet CSV URL it is built from.
2. **Create the project folder** next to this one. Copy `template/` (without `stations_map.html` unless an iframe tab is needed), `netlify.toml`, and `.gitignore`. Run `git init` and keep the folder name consistent with the dashboard topic.
3. **Fill `template/plots.csv`.** Keep the header and the UTF-8 BOM. Ids are `plot1`, `plot2`, ... in order. Fields must not contain `;`.
4. **Edit `SHEETS` in `app.js`.** One object per tab:
   - `id` (unique, no spaces), `label` (tab text).
   - `plots`: array of plot ids and/or `{ heading: "..." }` entries (full-width subheader).
   - Layout rule: plots sit in a 2-column grid and the last plot spans the full width; `lastHalf: true` keeps the last two plots side by side.
   - `intro`: optional paragraph above the plots.
   - `iframe: "page.html"` instead of `plots` for a tab showing a self-contained page.
   - Update the header comment in `app.js` if the manifest columns change.
5. **Edit `index.html`**: `<title>`, the `<h1>` in `.page-title`, and the `.source` paragraph.
6. **Check locally**: serve `template/` (`python -m http.server` from inside it), open the page, and confirm in the browser console that there are no `is not in the manifest` errors and no `in the manifest but not on any sheet` warnings, every tab renders its charts, and the tab bar is hidden when there is only one tab.
7. **Publish**: create a Netlify site pointing at the repo (publish dir `template`, no build command). Netlify state goes in `.netlify/`, which is git-ignored.
8. **Commit** with one commit per logical change (add chart, reshape tabs), as in the existing history.

## Checks before publishing

- Every Flourish visualisation is public and its id matches `plots.csv`.
- Every Google Sheet is published to the web as CSV.
- Every plot id in `plots.csv` appears on exactly one sheet.
- No secrets, `desktop.ini`, or `.g*` Drive pointer files are tracked.

## Changing a published dashboard later

- Swap a chart: edit its `flourish_link` row in `plots.csv`.
- Add a chart: append a row to `plots.csv`, then add its id to a `SHEETS` entry in `app.js`.
- Move or reorder a chart, or rename a tab: edit `SHEETS` only.
