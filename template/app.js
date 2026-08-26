// ===========================================================================
// Rail infrastructure investment dashboard
// ---------------------------------------------------------------------------
// The dashboard is driven by a manifest file (one "name;url" per line) so
// adding, removing or reordering a chart only means editing a CSV:
//
//   flourish_links.csv : plotN -> the Flourish visualisation to embed
//   data_urls.csv      : plotN -> the published Google Sheet CSV each viz is
//                        built from (kept for reference / traceability)
//
// Each chart is rendered with Flourish's native embed, so it looks exactly as
// designed in Flourish and stays in sync with its data source through
// Flourish itself.
// ===========================================================================

const FLOURISH_MANIFEST = "flourish_links.csv"; // name;flourish_visualisation_url

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

// --- build -----------------------------------------------------------------

async function buildDashboard() {
    const text = await fetch(FLOURISH_MANIFEST).then(r => r.text());
    const plots = parseManifest(text);
    const grid = document.getElementById("dashboard");

    plots.forEach(plot => {
        const id = flourishId(plot.url);
        const card = document.createElement("div");
        card.className = "chart-card";

        if (id) {
            // Flourish's embed.js scans for `.flourish-embed[data-src]` nodes
            // and replaces them with a responsive, auto-resizing iframe.
            const embed = document.createElement("div");
            embed.className = "flourish-embed";
            embed.setAttribute("data-src", `visualisation/${id}`);
            card.appendChild(embed);
        } else {
            console.error(`Skipping "${plot.name}": no visualisation id in ${plot.url}`);
        }

        grid.appendChild(card);
    });

    // Load the Flourish embed runtime once, after the placeholders exist.
    const script = document.createElement("script");
    script.src = "https://public.flourish.studio/resources/embed.js";
    document.body.appendChild(script);

    hideLoader();
}

buildDashboard().catch(err => {
    console.error("Dashboard failed to load", err);
    hideLoader();
});
