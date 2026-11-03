// ===========================================================================
// Rail infrastructure investment dashboard
// ---------------------------------------------------------------------------
// Charts come from one manifest file, plots.csv (";"-separated, with a header):
//
//   id;flourish_link;title;data
//
//   id             : plotN, referenced by SHEETS below
//   flourish_link  : the Flourish visualisation to embed
//   title          : the chart title (reference)
//   data           : the published Google Sheet CSV the viz is built from
//                    (kept for reference / traceability)
//
// The dashboard is split into "sheets" (tabs). Each sheet lays its plots out
// in a 2-column grid, and the LAST plot on a sheet spans the full width.
// Edit SHEETS below to move a plot between tabs, reorder it, or rename a tab.
// ===========================================================================

const PLOTS_MANIFEST = "plots.csv";

// Tabs in display order. A sheet either lists Flourish plots (names must match
// the manifest) or points to a self-contained HTML page shown in an iframe.
// An optional "intro" string is shown as a paragraph above the sheet's plots.
// A { heading: "..." } entry in "plots" renders a full-width subheader; the plot after it spans the full width.
const SHEETS = [
    {
        id: "ranking",
        label: "Punctuality ranking",
        plots: [{ heading: "Ranking of European rail operators punctuality" }, "plot1"]
    },
    {
        id: "details",
        label: "More details on punctuality",
        plots: [{ heading: "How punctuality evolved in the last years?" }, "plot2", { heading: "What are the cause of these delays?" }, "plot3"]
    },
    {
        id: "investments",
        label: "Rail infrastructure investments",
        // The last two plots sit side by side instead of the last one spanning the full width.
        lastHalf: true,
        plots: [{ heading: "Overall, investments for rail are not progressing enough in Europe" }, "plot4", "plot5", "plot6"]
    },
    { id: "map", label: "French infrastructure state and stations punctuality", iframe: "stations_map.html" },
];

// --- helpers ---------------------------------------------------------------

// Parse the ";"-separated manifest: strips a UTF-8 BOM, ignores blank / # lines,
// reads the first line as the header and returns one object per row keyed by
// column name (fields contain no ";").
function parseManifest(text) {
    const [header, ...rows] = text
        .replace(/^﻿/, "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
    const columns = header.split(";").map(c => c.trim());
    return rows.map(row => {
        const cells = row.split(";").map(c => c.trim());
        return Object.fromEntries(columns.map((c, i) => [c, cells[i]]));
    });
}

// Pull the numeric visualisation id out of a Flourish URL.
function flourishId(url) {
    const match = String(url).match(/visualisation\/(\d+)/);
    return match ? match[1] : null;
}

function hideLoader() {
    const loader = document.getElementById("loader-wrapper");
    if (!loader) return;
    loader.classList.add("fade-out");
    setTimeout(() => { loader.style.display = "none"; }, 600);
}

// Build one chart card (Flourish embed placeholder) for a plot.
function chartCard(url) {
    const card = document.createElement("div");
    card.className = "chart-card";
    const id = flourishId(url);
    if (id) {
        const embed = document.createElement("div");
        embed.className = "flourish-embed";
        embed.setAttribute("data-src", `visualisation/${id}`);
        card.appendChild(embed);
    }
    return card;
}

// Build a full-width card that embeds a self-contained HTML page (e.g. a map).
function iframeCard(src) {
    const card = document.createElement("div");
    card.className = "chart-card map-card";
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.loading = "lazy";
    frame.title = "Embedded page";
    card.appendChild(frame);
    return card;
}

// Show one sheet, hide the others, and nudge Flourish to re-measure the
// now-visible embeds (they can render at the wrong size while hidden).
function activateSheet(sheetId) {
    document.querySelectorAll(".tab-bar button").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.sheet === sheetId));
    document.querySelectorAll("#sheets .dashboard-grid").forEach(grid =>
        grid.classList.toggle("active", grid.dataset.sheet === sheetId));
    window.dispatchEvent(new Event("resize"));
}

// --- build -----------------------------------------------------------------

async function buildDashboard() {
    const text = await fetch(PLOTS_MANIFEST).then(r => r.text());
    const urlByName = Object.fromEntries(parseManifest(text).map(e => [e.id, e.flourish_link]));

    const tabBar = document.getElementById("tabs");
    const sheetsWrap = document.getElementById("sheets");

    SHEETS.forEach((sheet, index) => {
        // Tab button
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = sheet.label;
        btn.dataset.sheet = sheet.id;
        btn.addEventListener("click", () => activateSheet(sheet.id));
        tabBar.appendChild(btn);

        // Sheet grid with its plots (or a single embedded page)
        const grid = document.createElement("div");
        grid.className = "dashboard-grid";
        grid.dataset.sheet = sheet.id;
        if (sheet.lastHalf) grid.classList.add("last-half");
        // Optional intro paragraph, spanning the full width above the plots.
        if (sheet.intro) {
            const intro = document.createElement("p");
            intro.className = "sheet-intro";
            intro.textContent = sheet.intro;
            grid.appendChild(intro);
        }
        if (sheet.iframe) {
            grid.appendChild(iframeCard(sheet.iframe));
        } else {
            (sheet.plots || []).forEach(name => {
                if (name.heading) {
                    const h = document.createElement("h2");
                    h.className = "section-heading";
                    h.textContent = name.heading;
                    grid.appendChild(h);
                    return;
                }
                const url = urlByName[name];
                if (!url) {
                    console.error(`Sheet "${sheet.id}": "${name}" is not in the manifest`);
                    return;
                }
                grid.appendChild(chartCard(url));
            });
        }
        sheetsWrap.appendChild(grid);
    });

    // Warn about any plot that isn't shown on a sheet.
    const assigned = new Set(SHEETS.flatMap(s => s.plots || []).filter(p => !p.heading));
    Object.keys(urlByName).filter(n => !assigned.has(n))
        .forEach(n => console.warn(`Plot "${n}" is in the manifest but not on any sheet`));

    // Load the Flourish embed runtime once, after the placeholders exist.
    const script = document.createElement("script");
    script.src = "https://public.flourish.studio/resources/embed.js";
    document.body.appendChild(script);

    // Show the first sheet.
    if (SHEETS.length) activateSheet(SHEETS[0].id);
    // Hide the tab bar if there's only one sheet.
    if (SHEETS.length < 2) tabBar.style.display = "none";

    hideLoader();
}

buildDashboard().catch(err => {
    console.error("Dashboard failed to load", err);
    hideLoader();
});
