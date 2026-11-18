/**
 * Global Sand Archive
 * Loads data/sands.xlsx directly via SheetJS and drives:
 * 1. A-Z & Continent -> Country Table -> Sand List (sorted by ID)
 * 2. Global Sand Map (Leaflet + MarkerCluster for 2,000+ pins)
 * 3. Sand Statistics (Chart.js visualizations)
 */

const XLSX_PATH = "data/sands.xlsx";

const state = {
  sands: [],
  countriesMap: new Map(), // countryName -> { name, continent, sands: [] }
  continentsMap: new Map(), // continentName -> { name, countrySet: Set, sandCount: number }
  activeView: "browse",
  filterMode: null, // { type: 'letter' | 'continent', value: string }
  selectedCountry: null,
  mapInstance: null,
  markerCluster: null,
  markersById: new Map(),
  charts: {}
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindBrowseControls();
  bindMapControls();
  bindFileUploadPreview();
  loadExcelFromServer(XLSX_PATH);
});

async function loadExcelFromServer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Could not fetch ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    parseWorkbookBuffer(arrayBuffer);
  } catch (err) {
    console.error(err);
    showStatus(
      `Note: Could not auto-load <strong>${url}</strong> (${err.message}). ` +
      `If you opened index.html directly via <code>file://</code>, use GitHub Pages, a local web server, or click <strong>"Preview custom .xlsx"</strong> in the footer.`
    );
  }
}

function parseWorkbookBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  // Exact column names: ID, Name, Lat, Long, Desc1, Desc2, Country
  // Desc1 = Continent, Desc2 = Notes / miscalculated information
  const normalized = rawRows.map((row, idx) => {
    const rawId = row.ID !== undefined && row.ID !== "" ? row.ID : idx + 1;
    const numericId = Number(rawId);
    const lat = parseFloat(row.Lat);
    const lng = parseFloat(row.Long);

    return {
      id: rawId,
      numericId: Number.isNaN(numericId) ? null : numericId,
      name: String(row.Name || "Unnamed Location").trim(),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      continent: String(row.Desc1 || "Unknown").trim() || "Unknown",
      notes: String(row.Desc2 || "").trim(),
      country: String(row.Country || "Unknown").trim() || "Unknown"
    };
  });

  state.sands = normalized;
  buildIndexes();
  hideStatus();

  document.getElementById("header-subtitle").textContent =
    `${state.sands.length.toLocaleString()} samples across ${state.countriesMap.size} countries`;

  renderAlphabetBar();
  renderContinentBar();

  // Reset drilldown state cleanly
  state.filterMode = null;
  state.selectedCountry = null;
  document.getElementById("country-panel").classList.add("hidden");
  document.getElementById("sand-panel").classList.add("hidden");
  document.getElementById("breadcrumb-bar").classList.add("hidden");

  // Re-render map or stats if currently active
  if (state.activeView === "map") {
    initOrRefreshMap();
  } else if (state.activeView === "stats") {
    renderStatistics();
  }
}

function buildIndexes() {
  state.countriesMap.clear();
  state.continentsMap.clear();

  for (const sand of state.sands) {
    // Country grouping
    if (!state.countriesMap.has(sand.country)) {
      state.countriesMap.set(sand.country, {
        name: sand.country,
        continent: sand.continent,
        sands: []
      });
    }
    const cEntry = state.countriesMap.get(sand.country);
    cEntry.sands.push(sand);
    if (cEntry.continent === "Unknown" && sand.continent !== "Unknown") {
      cEntry.continent = sand.continent;
    }

    // Continent grouping
    if (!state.continentsMap.has(sand.continent)) {
      state.continentsMap.set(sand.continent, {
        name: sand.continent,
        countries: new Set(),
        sandCount: 0
      });
    }
    const contEntry = state.continentsMap.get(sand.continent);
    contEntry.countries.add(sand.country);
    contEntry.sandCount += 1;
  }

  // Pre-sort sands inside every country by ID
  for (const cEntry of state.countriesMap.values()) {
    cEntry.sands.sort(compareById);
  }
}

function compareById(a, b) {
  if (a.numericId !== null && b.numericId !== null) {
    return a.numericId - b.numericId;
  }
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: "base" });
}

/* ---------------- NAVIGATION ---------------- */

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
    });
  });

  document.getElementById("brand-home").addEventListener("click", () => {
    switchView("browse");
  });
}

function switchView(viewName) {
  state.activeView = viewName;

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  document.querySelectorAll(".view-section").forEach((sec) => {
    sec.classList.add("hidden");
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove("hidden");

  if (viewName === "map") {
    initOrRefreshMap();
  } else if (viewName === "stats") {
    renderStatistics();
  }
}

/* ---------------- BROWSE INDEX (A-Z & CONTINENTS) ---------------- */

function renderAlphabetBar() {
  const container = document.getElementById("alphabet-bar");
  container.innerHTML = "";

  const availableLetters = new Set();
  for (const countryName of state.countriesMap.keys()) {
    const firstChar = countryName.charAt(0).toUpperCase();
    if (firstChar >= "A" && firstChar <= "Z") {
      availableLetters.add(firstChar);
    }
  }

  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    const btn = document.createElement("button");
    btn.className = "letter-btn";
    btn.textContent = letter;
    btn.disabled = !availableLetters.has(letter);
    btn.title = availableLetters.has(letter)
      ? `Show countries starting with ${letter}`
      : `No countries starting with ${letter}`;

    btn.addEventListener("click", () => {
      selectFilter("letter", letter);
    });
    container.appendChild(btn);
  }
}

function renderContinentBar() {
  const container = document.getElementById("continent-bar");
  container.innerHTML = "";

  const continents = Array.from(state.continentsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  for (const cont of continents) {
    const btn = document.createElement("button");
    btn.className = "continent-btn";
    btn.dataset.continent = cont.name;
    btn.innerHTML = `
      <span>${escapeHtml(cont.name)}</span>
      <span class="pill-count">${cont.countries.size} countries · ${cont.sandCount}</span>
    `;
    btn.addEventListener("click", () => {
      selectFilter("continent", cont.name);
    });
    container.appendChild(btn);
  }
}

function selectFilter(type, value) {
  state.filterMode = { type, value };
  state.selectedCountry = null;

  // Highlight active button
  document.querySelectorAll(".letter-btn").forEach((b) => {
    b.classList.toggle("active", type === "letter" && b.textContent === value);
  });
  document.querySelectorAll(".continent-btn").forEach((b) => {
    b.classList.toggle("active", type === "continent" && b.dataset.continent === value);
  });

  document.getElementById("country-filter-input").value = "";
  renderCountryTable();
}

function getFilteredCountries() {
  if (!state.filterMode) return [];
  const { type, value } = state.filterMode;

  let list = Array.from(state.countriesMap.values());
  if (type === "letter") {
    list = list.filter((c) => c.name.charAt(0).toUpperCase() === value);
  } else if (type === "continent") {
    list = list.filter((c) => c.continent.toLowerCase() === value.toLowerCase());
  }

  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function renderCountryTable() {
  const countryPanel = document.getElementById("country-panel");
  const sandPanel = document.getElementById("sand-panel");
  const tbody = document.getElementById("country-table-body");
  const titleEl = document.getElementById("country-panel-title");
  const searchQuery = document.getElementById("country-filter-input").value.trim().toLowerCase();

  sandPanel.classList.add("hidden");
  countryPanel.classList.remove("hidden");

  const { type, value } = state.filterMode;
  titleEl.textContent =
    type === "letter"
      ? `Countries starting with "${value}"`
      : `Countries in ${value}`;

  updateBreadcrumbs();

  const countries = getFilteredCountries().filter((c) =>
    c.name.toLowerCase().includes(searchQuery)
  );

  tbody.innerHTML = "";

  if (countries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No matching countries found.</td></tr>`;
    return;
  }

  for (const country of countries) {
    const tr = document.createElement("tr");
    tr.className = "country-row";
    tr.innerHTML = `
      <td>
        <span class="country-label">${escapeHtml(country.name)}</span>
        <span class="count-bracket">(${country.sands.length})</span>
      </td>
      <td>${escapeHtml(country.continent)}</td>
      <td class="num-col"><strong>${country.sands.length}</strong></td>
      <td class="action-col"><button class="table-btn">View Sands &rarr;</button></td>
    `;
    tr.addEventListener("click", () => openCountrySands(country.name));
    tbody.appendChild(tr);
  }
}

function openCountrySands(countryName) {
  state.selectedCountry = countryName;
  document.getElementById("sand-filter-input").value = "";
  renderSandTable();
}

function renderSandTable() {
  const countryPanel = document.getElementById("country-panel");
  const sandPanel = document.getElementById("sand-panel");
  const tbody = document.getElementById("sand-table-body");
  const titleEl = document.getElementById("sand-panel-title");
  const query = document.getElementById("sand-filter-input").value.trim().toLowerCase();

  const countryObj = state.countriesMap.get(state.selectedCountry);
  if (!countryObj) return;

  countryPanel.classList.add("hidden");
  sandPanel.classList.remove("hidden");

  titleEl.textContent = `${countryObj.name} (${countryObj.sands.length} samples — sorted by ID)`;
  updateBreadcrumbs();

  const matchingSands = countryObj.sands.filter((s) => {
    if (!query) return true;
    return (
      String(s.id).toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      s.notes.toLowerCase().includes(query)
    );
  });

  tbody.innerHTML = "";

  if (matchingSands.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No samples match your search filter.</td></tr>`;
    return;
  }

  for (const sand of matchingSands) {
    const hasCoords = sand.lat !== null && sand.lng !== null;
    const coordLabel = hasCoords ? `${sand.lat.toFixed(4)}, ${sand.lng.toFixed(4)}` : "N/A";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="id-col">#${escapeHtml(String(sand.id))}</td>
      <td><strong>${escapeHtml(sand.name)}</strong></td>
      <td>${escapeHtml(sand.continent)}</td>
      <td class="coords-text">${coordLabel}</td>
      <td>${escapeHtml(sand.notes || "—")}</td>
      <td class="action-col">
        ${
          hasCoords
            ? `<button class="pin-link-btn" data-id="${escapeHtml(String(sand.id))}">Show Pin</button>`
            : "—"
        }
      </td>
    `;

    const pinBtn = tr.querySelector(".pin-link-btn");
    if (pinBtn) {
      pinBtn.addEventListener("click", () => jumpToSandOnMap(sand.id));
    }

    tbody.appendChild(tr);
  }
}

function updateBreadcrumbs() {
  const bar = document.getElementById("breadcrumb-bar");
  if (!state.filterMode) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  const filterLabel =
    state.filterMode.type === "letter"
      ? `Letter "${state.filterMode.value}"`
      : `Continent: ${state.filterMode.value}`;

  if (!state.selectedCountry) {
    bar.innerHTML = `<span>Index</span> &rsaquo; <strong>${escapeHtml(filterLabel)}</strong>`;
  } else {
    bar.innerHTML = `
      <span>Index</span> &rsaquo;
      <span class="breadcrumb-link" id="crumb-back">${escapeHtml(filterLabel)}</span> &rsaquo;
      <strong>${escapeHtml(state.selectedCountry)}</strong>
    `;
    document.getElementById("crumb-back").addEventListener("click", () => {
      state.selectedCountry = null;
      renderCountryTable();
    });
  }
}

function bindBrowseControls() {
  document.getElementById("country-filter-input").addEventListener("input", () => {
    if (state.filterMode) renderCountryTable();
  });

  document.getElementById("sand-filter-input").addEventListener("input", () => {
    if (state.selectedCountry) renderSandTable();
  });

  document.getElementById("back-to-countries-btn").addEventListener("click", () => {
    state.selectedCountry = null;
    renderCountryTable();
  });
}

/* ---------------- GLOBAL SAND MAP ---------------- */

function initOrRefreshMap() {
  if (!state.mapInstance) {
    state.mapInstance = L.map("global-map", {
      worldCopyJump: true
    }).setView([20, 10], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(state.mapInstance);

    state.markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45
    });
    state.mapInstance.addLayer(state.markerCluster);
  }

  // Ensure Leaflet recalculates container size after becoming visible
  setTimeout(() => {
    state.mapInstance.invalidateSize();
  }, 60);

  populateMapMarkers();
}

function populateMapMarkers() {
  if (!state.markerCluster) return;
  state.markerCluster.clearLayers();
  state.markersById.clear();

  let validCount = 0;
  const markers = [];

  for (const sand of state.sands) {
    if (sand.lat === null || sand.lng === null) continue;
    validCount++;

    const marker = L.marker([sand.lat, sand.lng]);
    const popupHtml = `
      <div class="popup-content">
        <span class="popup-badge">ID #${escapeHtml(String(sand.id))}</span>
        <h4>${escapeHtml(sand.name)}</h4>
        <p><strong>Country:</strong> ${escapeHtml(sand.country)} (${escapeHtml(sand.continent)})</p>
        <p><strong>Coordinates:</strong> ${sand.lat.toFixed(4)}, ${sand.lng.toFixed(4)}</p>
        ${sand.notes ? `<p><strong>Notes:</strong> ${escapeHtml(sand.notes)}</p>` : ""}
      </div>
    `;
    marker.bindPopup(popupHtml);
    markers.push(marker);
    state.markersById.set(String(sand.id), marker);
  }

  state.markerCluster.addLayers(markers);
  document.getElementById("map-count-hint").textContent =
    `Displaying ${validCount.toLocaleString()} mapped sand samples. Click any pin or cluster to inspect details.`;
}

function jumpToSandOnMap(sandId) {
  switchView("map");
  setTimeout(() => {
    const marker = state.markersById.get(String(sandId));
    if (marker && state.markerCluster && state.mapInstance) {
      state.markerCluster.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    }
  }, 150);
}

function bindMapControls() {
  document.getElementById("map-reset-btn").addEventListener("click", () => {
    if (state.mapInstance) {
      state.mapInstance.setView([20, 10], 2);
    }
  });

  document.getElementById("map-search-input").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;

    const match = state.sands.find(
      (s) =>
        s.lat !== null &&
        s.lng !== null &&
        (String(s.id).toLowerCase() === q ||
          s.name.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q))
    );

    if (match) {
      jumpToSandOnMap(match.id);
    }
  });
}

/* ---------------- SAND STATISTICS ---------------- */

function renderStatistics() {
  renderKpis();
  renderContinentChart();
  renderTopCountriesChart();
  renderLatitudeChart();
  renderLetterChart();
}

function renderKpis() {
  const totalSands = state.sands.length;
  const totalCountries = state.countriesMap.size;
  const totalContinents = state.continentsMap.size;

  let northern = 0;
  let southern = 0;
  let withNotes = 0;

  for (const s of state.sands) {
    if (s.lat !== null) {
      if (s.lat >= 0) northern++;
      else southern++;
    }
    if (s.notes) withNotes++;
  }

  const topCountry = Array.from(state.countriesMap.values()).sort(
    (a, b) => b.sands.length - a.sands.length
  )[0];

  const kpis = [
    {
      label: "Total Sand Samples",
      value: totalSands.toLocaleString(),
      sub: `${withNotes.toLocaleString()} with field notes`
    },
    {
      label: "Countries Represented",
      value: totalCountries.toLocaleString(),
      sub: `Across ${totalContinents} continents`
    },
    {
      label: "Top Country",
      value: topCountry ? topCountry.name : "—",
      sub: topCountry ? `${topCountry.sands.length} samples` : ""
    },
    {
      label: "Hemisphere Split",
      value: `${northern} N / ${southern} S`,
      sub: "Based on sample latitude"
    }
  ];

  const grid = document.getElementById("kpi-grid");
  grid.innerHTML = kpis
    .map(
      (k) => `
      <div class="kpi-card">
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        <div class="kpi-value">${escapeHtml(k.value)}</div>
        <div class="kpi-sub">${escapeHtml(k.sub)}</div>
      </div>
    `
    )
    .join("");
}

function destroyChartIfExists(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

function renderContinentChart() {
  destroyChartIfExists("continents");
  const sorted = Array.from(state.continentsMap.values()).sort(
    (a, b) => b.sandCount - a.sandCount
  );

  const ctx = document.getElementById("chart-continents");
  state.charts.continents = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: sorted.map((c) => c.name),
      datasets: [
        {
          data: sorted.map((c) => c.sandCount),
          backgroundColor: [
            "#1f4e5f",
            "#c58f36",
            "#3c7a89",
            "#e0a96d",
            "#5c9ead",
            "#8c5e35",
            "#a3b18a"
          ]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" }
      }
    }
  });
}

function renderTopCountriesChart() {
  destroyChartIfExists("topCountries");
  const top15 = Array.from(state.countriesMap.values())
    .sort((a, b) => b.sands.length - a.sands.length)
    .slice(0, 15);

  const ctx = document.getElementById("chart-top-countries");
  state.charts.topCountries = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top15.map((c) => c.name),
      datasets: [
        {
          label: "Sand Samples",
          data: top15.map((c) => c.sands.length),
          backgroundColor: "#1f4e5f",
          borderRadius: 5
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderLatitudeChart() {
  destroyChartIfExists("latitudes");
  const bands = [
    { label: "60°S–90°S (Antarctic)", min: -90, max: -60, count: 0 },
    { label: "30°S–60°S (South Temperate)", min: -60, max: -30, count: 0 },
    { label: "0°–30°S (South Tropical)", min: -30, max: 0, count: 0 },
    { label: "0°–30°N (North Tropical)", min: 0, max: 30, count: 0 },
    { label: "30°N–60°N (North Temperate)", min: 30, max: 60, count: 0 },
    { label: "60°N–90°N (Arctic)", min: 60, max: 90.1, count: 0 }
  ];

  for (const s of state.sands) {
    if (s.lat === null) continue;
    const band = bands.find((b) => s.lat >= b.min && s.lat < b.max);
    if (band) band.count++;
  }

  const ctx = document.getElementById("chart-latitudes");
  state.charts.latitudes = new Chart(ctx, {
    type: "bar",
    data: {
      labels: bands.map((b) => b.label),
      datasets: [
        {
          label: "Samples",
          data: bands.map((b) => b.count),
          backgroundColor: "#c58f36",
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderLetterChart() {
  destroyChartIfExists("letters");
  const letters = [];
  const sampleCounts = [];

  for (let code = 65; code <= 90; code++) {
    const ch = String.fromCharCode(code);
    letters.push(ch);
    let total = 0;
    for (const c of state.countriesMap.values()) {
      if (c.name.charAt(0).toUpperCase() === ch) {
        total += c.sands.length;
      }
    }
    sampleCounts.push(total);
  }

  const ctx = document.getElementById("chart-letters");
  state.charts.letters = new Chart(ctx, {
    type: "bar",
    data: {
      labels: letters,
      datasets: [
        {
          label: "Samples by Country Initial",
          data: sampleCounts,
          backgroundColor: "#3c7a89",
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

/* ---------------- UTILITIES ---------------- */

function bindFileUploadPreview() {
  const input = document.getElementById("xlsx-upload-input");
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      parseWorkbookBuffer(evt.target.result);
    };
    reader.readAsArrayBuffer(file);
  });
}

function showStatus(html) {
  const bar = document.getElementById("status-bar");
  bar.innerHTML = html;
  bar.classList.remove("hidden");
}

function hideStatus() {
  const bar = document.getElementById("status-bar");
  bar.classList.add("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
