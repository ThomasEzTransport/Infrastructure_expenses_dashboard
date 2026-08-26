// ===========================================================================
// Rail infrastructure investment dashboard
// ---------------------------------------------------------------------------
// Charts come from a manifest file (one "name;url" per line):
//
//   flourish_links.csv : plotN -> the Flourish visualisation to embed
//   data_urls.csv      : plotN -> the published Google Sheet CSV each viz is
//                        built from (kept for reference / traceability)
//
// The dashboard is split into "sheets" (tabs). Each sheet lays its plots out
// in a 2-column grid, and the LAST plot on a sheet spans the full width.
// Edit SHEETS below to move a plot between tabs, reorder it, or rename a tab.
// ===========================================================================

const FLOURISH_MANIFEST = "flourish_links.csv"; // name;flourish_visualisation_url

// Tabs in display order. A sheet either lists Flourish plots (names must match
// the manifest) or points to a self-contained HTML page shown in an iframe.
const SHEETS = [
    { id: "overview", label: "Overview", plots: ["plot1", "plot2", "plot3", "plot4", "plot6"] },
    { id: "real-terms", label: "Rail investment over time", plots: ["plot5"] },
    { id: "map", label: "Stations map", iframe: "stations_map.html" },
];

// --- helpers ---------------------------------------------------------------

// Parse a "name;url" manifest: strips a UTF-8 BOM, ignores blank / # lines,
// and splits on the first ";" only (URLs contain no ";").
function parseManifest(text) {
    return text
        .replace(/^﻿/, "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(line => {
            const i = line.indexOf(";");
            return { name: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
        })
        .filter(entry => entry.name && entry.url);
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
    const text = await fetch(FLOURISH_MANIFEST).then(r => r.text());
    const urlByName = Object.fromEntries(parseManifest(text).map(e => [e.name, e.url]));

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
        if (sheet.iframe) {
            grid.appendChild(iframeCard(sheet.iframe));
        } else {
            (sheet.plots || []).forEach(name => {
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
    const assigned = new Set(SHEETS.flatMap(s => s.plots || []));
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
