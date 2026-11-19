/**
 * Global Sand Archive
 * Loads data/sands.xlsx directly via SheetJS and drives:
 * 1. A-Z & Continent -> Country Table (with Country Flags) -> Sand List (sorted by ID)
 * 2. Global Sand Map (Leaflet + MarkerCluster with Olympic-colored continent pins)
 * 3. Sand Statistics (Chart.js visualizations)
 */

const XLSX_PATH = "data/sands.xlsx";

const state = {
  sands: [],
  countriesMap: new Map(), // countryName -> { name, continent, sands: [] }
  continentsMap: new Map(), // continentName -> { name, countries: Set, sandCount: number }
  activeView: "browse",
  filterMode: null, // { type: 'letter' | 'continent', value: string }
  selectedCountry: null,
  countrySort: { column: 'country', direction: 'asc' },
  mapInstance: null,
  markerCluster: null,
  markersById: new Map(),
  charts: {}
};

// Comprehensive Country Name -> ISO 3166-1 alpha-2 code map for crisp flag icons
const COUNTRY_ISO_MAP = {
  "afghanistan": "af", "albania": "al", "algeria": "dz", "andorra": "ad", "angola": "ao",
  "antigua and barbuda": "ag", "argentina": "ar", "armenia": "am", "australia": "au",
  "austria": "at", "azerbaijan": "az", "bahamas": "bs", "the bahamas": "bs", "bahrain": "bh",
  "bangladesh": "bd", "barbados": "bb", "belarus": "by", "belgium": "be", "belize": "bz",
  "benin": "bj", "bhutan": "bt", "bolivia": "bo", "bosnia and herzegovina": "ba",
  "botswana": "bw", "brazil": "br", "brunei": "bn", "bulgaria": "bg", "burkina faso": "bf",
  "burundi": "bi", "cabo verde": "cv", "cape verde": "cv", "cambodia": "kh", "cameroon": "cm",
  "canada": "ca", "central african republic": "cf", "chad": "td", "chile": "cl", "china": "cn",
  "colombia": "co", "comoros": "km", "congo": "cg", "democratic republic of the congo": "cd",
  "costa rica": "cr", "croatia": "hr", "cuba": "cu", "cyprus": "cy", "czech republic": "cz",
  "czechia": "cz", "denmark": "dk", "djibouti": "dj", "dominica": "dm",
  "dominican republic": "do", "ecuador": "ec", "egypt": "eg", "el salvador": "sv",
  "equatorial guinea": "gq", "eritrea": "er", "estonia": "ee", "eswatini": "sz",
  "swaziland": "sz", "ethiopia": "et", "fiji": "fj", "finland": "fi", "france": "fr",
  "gabon": "ga", "gambia": "gm", "georgia": "ge", "germany": "de", "ghana": "gh",
  "greece": "gr", "grenada": "gd", "guatemala": "gt", "guinea": "gn", "guinea-bissau": "gw",
  "guyana": "gy", "haiti": "ht", "honduras": "hn", "hungary": "hu", "iceland": "is",
  "india": "in", "indonesia": "id", "iran": "ir", "iraq": "iq", "ireland": "ie",
  "israel": "il", "italy": "it", "ivory coast": "ci", "côte d'ivoire": "ci", "jamaica": "jm",
  "japan": "jp", "jordan": "jo", "kazakhstan": "kz", "kenya": "ke", "kiribati": "ki",
  "kuwait": "kw", "kyrgyzstan": "kg", "laos": "la", "latvia": "lv", "lebanon": "lb",
  "lesotho": "ls", "liberia": "lr", "libya": "ly", "liechtenstein": "li", "lithuania": "lt",
  "luxembourg": "lu", "madagascar": "mg", "malawi": "mw", "malaysia": "my", "maldives": "mv",
  "mali": "ml", "malta": "mt", "marshall islands": "mh", "mauritania": "mr", "mauritius": "mu",
  "mexico": "mx", "micronesia": "fm", "moldova": "md", "monaco": "mc", "mongolia": "mn",
  "montenegro": "me", "morocco": "ma", "mozambique": "mz", "myanmar": "mm", "burma": "mm",
  "namibia": "na", "nauru": "nr", "nepal": "np", "netherlands": "nl", "the netherlands": "nl",
  "new zealand": "nz", "nicaragua": "ni", "niger": "ne", "nigeria": "ng", "north korea": "kp",
  "north macedonia": "mk", "norway": "no", "oman": "om", "pakistan": "pk", "palau": "pw",
  "palestine": "ps", "panama": "pa", "papua new guinea": "pg", "paraguay": "py", "peru": "pe",
  "philippines": "ph", "poland": "pl", "portugal": "pt", "qatar": "qa", "romania": "ro",
  "russia": "ru", "russian federation": "ru", "rwanda": "rw", "saint kitts and nevis": "kn",
  "saint lucia": "lc", "saint vincent and the grenadines": "vc", "samoa": "ws",
  "san marino": "sm", "sao tome and principe": "st", "saudi arabia": "sa", "senegal": "sn",
  "serbia": "rs", "seychelles": "sc", "sierra leone": "sl", "singapore": "sg", "slovakia": "sk",
  "slovenia": "si", "solomon islands": "sb", "somalia": "so", "south africa": "za",
  "south korea": "kr", "republic of korea": "kr", "south sudan": "ss", "spain": "es",
  "sri lanka": "lk", "sudan": "sd", "suriname": "sr", "sweden": "se", "switzerland": "ch",
  "syria": "sy", "taiwan": "tw", "tajikistan": "tj", "tanzania": "tz", "thailand": "th",
  "timor-leste": "tl", "east timor": "tl", "togo": "tg", "tonga": "to",
  "trinidad and tobago": "tt", "tunisia": "tn", "turkey": "tr", "türkiye": "tr",
  "turkmenistan": "tm", "tuvalu": "tv", "uganda": "ug", "ukraine": "ua",
  "united arab emirates": "ae", "uae": "ae", "united kingdom": "gb", "uk": "gb",
  "great britain": "gb", "england": "gb-eng", "scotland": "gb-sct", "wales": "gb-wls",
  "united states": "us", "united states of america": "us", "usa": "us", "uruguay": "uy",
  "uzbekistan": "uz", "vanuatu": "vu", "vatican city": "va", "venezuela": "ve",
  "vietnam": "vn", "viet nam": "vn", "yemen": "ye", "zambia": "zm", "zimbabwe": "zw",
  "antarctica": "aq", "aruba": "aw", "bermuda": "bm", "cayman islands": "ky",
  "cook islands": "ck", "curaçao": "cw", "curacao": "cw", "faroe islands": "fo",
  "french polynesia": "pf", "gibraltar": "gi", "greenland": "gl", "guadeloupe": "gp",
  "guam": "gu", "hong kong": "hk", "isle of man": "im", "jersey": "je", "guernsey": "gg",
  "macau": "mo", "martinique": "mq", "new caledonia": "nc", "puerto rico": "pr",
  "réunion": "re", "reunion": "re", "sint maarten": "sx", "turks and caicos islands": "tc",
  "british virgin islands": "vg", "u.s. virgin islands": "vi"
};

function getCountryIsoCode(countryName) {
  if (!countryName) return null;
  const key = String(countryName).trim().toLowerCase();
  return COUNTRY_ISO_MAP[key] || null;
}


// Offline bounding-box coordinate fallback for ISO 3166-1 alpha-2 flag lookup
const LAT_LONG_ISO_BOXES = [
  { iso: "aq", minLat: -90, maxLat: -60, minLng: -180, maxLng: 180 },
  { iso: "is", minLat: 63.2, maxLat: 66.7, minLng: -24.7, maxLng: -13.3 },
  { iso: "gb", minLat: 49.8, maxLat: 60.9, minLng: -8.7, maxLng: 1.8 },
  { iso: "ie", minLat: 51.3, maxLat: 55.5, minLng: -10.7, maxLng: -5.3 },
  { iso: "pt", minLat: 36.8, maxLat: 42.2, minLng: -9.6, maxLng: -6.1 },
  { iso: "es", minLat: 27.5, maxLat: 43.9, minLng: -18.2, maxLng: 4.4 },
  { iso: "fr", minLat: 41.3, maxLat: 51.2, minLng: -5.2, maxLng: 9.6 },
  { iso: "be", minLat: 49.5, maxLat: 51.6, minLng: 2.5, maxLng: 6.4 },
  { iso: "nl", minLat: 50.7, maxLat: 53.7, minLng: 3.3, maxLng: 7.3 },
  { iso: "de", minLat: 47.2, maxLat: 55.1, minLng: 5.8, maxLng: 15.1 },
  { iso: "dk", minLat: 54.5, maxLat: 57.8, minLng: 8.0, maxLng: 15.2 },
  { iso: "no", minLat: 57.9, maxLat: 71.2, minLng: 4.5, maxLng: 31.2 },
  { iso: "se", minLat: 55.3, maxLat: 69.1, minLng: 11.0, maxLng: 24.2 },
  { iso: "fi", minLat: 59.7, maxLat: 70.1, minLng: 19.5, maxLng: 31.6 },
  { iso: "ee", minLat: 57.5, maxLat: 59.7, minLng: 21.7, maxLng: 28.2 },
  { iso: "lv", minLat: 55.6, maxLat: 58.1, minLng: 20.9, maxLng: 28.3 },
  { iso: "lt", minLat: 53.8, maxLat: 56.5, minLng: 20.9, maxLng: 26.9 },
  { iso: "pl", minLat: 49.0, maxLat: 54.9, minLng: 14.1, maxLng: 24.2 },
  { iso: "it", minLat: 36.6, maxLat: 47.1, minLng: 6.6, maxLng: 18.6 },
  { iso: "hr", minLat: 42.3, maxLat: 46.6, minLng: 13.4, maxLng: 19.5 },
  { iso: "gr", minLat: 34.8, maxLat: 41.8, minLng: 19.3, maxLng: 29.7 },
  { iso: "tr", minLat: 35.8, maxLat: 42.2, minLng: 25.6, maxLng: 44.8 },
  { iso: "ma", minLat: 27.6, maxLat: 36.0, minLng: -13.2, maxLng: -1.0 },
  { iso: "eg", minLat: 22.0, maxLat: 31.7, minLng: 24.7, maxLng: 36.9 },
  { iso: "na", minLat: -29.0, maxLat: -16.9, minLng: 11.7, maxLng: 25.3 },
  { iso: "za", minLat: -35.0, maxLat: -22.1, minLng: 16.4, maxLng: 32.9 },
  { iso: "tz", minLat: -11.8, maxLat: -0.9, minLng: 29.3, maxLng: 40.5 },
  { iso: "sc", minLat: -10.5, maxLat: -3.7, minLng: 46.2, maxLng: 56.3 },
  { iso: "ae", minLat: 22.6, maxLat: 26.1, minLng: 51.5, maxLng: 56.4 },
  { iso: "jo", minLat: 29.1, maxLat: 33.4, minLng: 34.9, maxLng: 39.3 },
  { iso: "il", minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.9 },
  { iso: "in", minLat: 6.7, maxLat: 35.7, minLng: 68.1, maxLng: 97.4 },
  { iso: "mv", minLat: -0.8, maxLat: 7.2, minLng: 72.6, maxLng: 73.8 },
  { iso: "bd", minLat: 20.5, maxLat: 26.7, minLng: 88.0, maxLng: 92.7 },
  { iso: "th", minLat: 5.6, maxLat: 20.5, minLng: 97.3, maxLng: 105.7 },
  { iso: "my", minLat: 0.8, maxLat: 7.4, minLng: 99.6, maxLng: 119.3 },
  { iso: "id", minLat: -11.1, maxLat: 6.1, minLng: 95.0, maxLng: 141.1 },
  { iso: "ph", minLat: 4.5, maxLat: 21.2, minLng: 116.9, maxLng: 126.7 },
  { iso: "jp", minLat: 24.0, maxLat: 45.6, minLng: 122.9, maxLng: 153.9 },
  { iso: "kr", minLat: 33.1, maxLat: 38.7, minLng: 124.6, maxLng: 131.9 },
  { iso: "cn", minLat: 18.1, maxLat: 53.6, minLng: 73.5, maxLng: 134.8 },
  { iso: "au", minLat: -43.7, maxLat: -10.0, minLng: 112.9, maxLng: 153.7 },
  { iso: "nz", minLat: -47.3, maxLat: -34.4, minLng: 166.4, maxLng: 178.6 },
  { iso: "ca", minLat: 41.7, maxLat: 83.2, minLng: -141.0, maxLng: -52.6 },
  { iso: "us", minLat: 18.9, maxLat: 71.4, minLng: -179.2, maxLng: -66.9 },
  { iso: "mx", minLat: 14.5, maxLat: 32.8, minLng: -118.4, maxLng: -86.7 },
  { iso: "bs", minLat: 20.9, maxLat: 27.3, minLng: -79.9, maxLng: -72.7 },
  { iso: "cu", minLat: 19.8, maxLat: 23.3, minLng: -85.0, maxLng: -74.1 },
  { iso: "ky", minLat: 19.2, maxLat: 19.8, minLng: -81.5, maxLng: -79.7 },
  { iso: "cr", minLat: 8.0, maxLat: 11.3, minLng: -86.0, maxLng: -82.5 },
  { iso: "ec", minLat: -5.1, maxLat: 1.7, minLng: -92.1, maxLng: -75.2 },
  { iso: "pe", minLat: -18.4, maxLat: -0.0, minLng: -81.4, maxLng: -68.6 },
  { iso: "cl", minLat: -56.0, maxLat: -17.5, minLng: -109.5, maxLng: -66.4 },
  { iso: "br", minLat: -33.8, maxLat: 5.3, minLng: -74.0, maxLng: -34.7 }
];

function getIsoCodeFromLatLong(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return null;
  for (const box of LAT_LONG_ISO_BOXES) {
    if (
      numLat >= box.minLat &&
      numLat <= box.maxLat &&
      numLng >= box.minLng &&
      numLng <= box.maxLng
    ) {
      return box.iso;
    }
  }
  return null;
}

function renderCountryFlagHtml(countryName, lat = null, lng = null) {
  const iso = getCountryIsoCode(countryName) || getIsoCodeFromLatLong(lat, lng);
  if (!iso) {
    return `<span class="flag-fallback" title="${escapeHtml(countryName)}">🏳️</span>`;
  }
  const pngUrl = `https://flagcdn.com/w40/${iso}.png`;
  const svgUrl = `https://flagcdn.com/${iso}.svg`;
  return `<img src="${svgUrl}" onerror="this.onerror=null;this.src='${pngUrl}';" alt="${escapeHtml(countryName)} flag" class="country-flag-img" loading="lazy" />`;
}

// Olympic colors mapped by Continent
function getOlympicContinentStyle(continentName) {
  const c = String(continentName || "").trim().toLowerCase();

  if (c.includes("europe") || c.includes("europa")) {
    return {
      key: "europe",
      label: "Europe",
      fill: "#0081C8",      // Olympic Blue
      stroke: "#005587",
      textColor: "#ffffff"
    };
  }
  if (c.includes("asia")) {
    return {
      key: "asia",
      label: "Asia",
      fill: "#FCB131",      // Olympic Yellow
      stroke: "#B37400",
      textColor: "#1A1A1A"
    };
  }
  if (c.includes("africa")) {
    return {
      key: "africa",
      label: "Africa",
      fill: "#1A1A1A",      // Olympic Black
      stroke: "#000000",
      textColor: "#ffffff"
    };
  }
  if (c.includes("oceania") || c.includes("australia") || c.includes("australasia")) {
    return {
      key: "oceania",
      label: "Oceania / Australia",
      fill: "#00A651",      // Olympic Green
      stroke: "#006B34",
      textColor: "#ffffff"
    };
  }
  if (c.includes("america")) {
    return {
      key: "americas",
      label: "Americas",
      fill: "#EE334E",      // Olympic Red
      stroke: "#A8182D",
      textColor: "#ffffff"
    };
  }
  return {
    key: "other",
    label: continentName || "Other",
    fill: "#6C7A89",
    stroke: "#3E4A56",
    textColor: "#ffffff"
  };
}

function createOlympicPinIcon(continentName) {
  const style = getOlympicContinentStyle(continentName);
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38" class="olympic-pin-svg">
      <path d="M14 1C6.82 1 1 6.82 1 14c0 9.75 13 23 13 23s13-13.25 13-23C27 6.82 21.18 1 14 1z"
            fill="${style.fill}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="#ffffff" fill-opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: svgPin,
    className: "olympic-pin-wrapper",
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34]
  });
}

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

  state.filterMode = null;
  state.selectedCountry = null;
  document.getElementById("country-panel").classList.add("hidden");
  document.getElementById("sand-panel").classList.add("hidden");
  document.getElementById("breadcrumb-bar").classList.add("hidden");

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

  const allBtn = document.createElement("button");
  allBtn.className = "letter-btn all-btn";
  allBtn.textContent = "ALL";
  allBtn.disabled = state.sands.length === 0;
  allBtn.title = "List all sand samples";
  allBtn.addEventListener("click", () => {
    selectFilter("all", "ALL");
  });
  container.appendChild(allBtn);

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

  document.querySelectorAll(".letter-btn").forEach((b) => {
    if (b.classList.contains("all-btn")) {
      b.classList.toggle("active", type === "all");
    } else {
      b.classList.toggle("active", type === "letter" && b.textContent === value);
    }
  });
  document.querySelectorAll(".continent-btn").forEach((b) => {
    b.classList.toggle("active", type === "continent" && b.dataset.continent === value);
  });

  if (type === "all") {
    document.getElementById("sand-filter-input").value = "";
    renderSandTable();
    return;
  }

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

  const { column, direction } = state.countrySort;
  countries.sort((a, b) => {
    let valA, valB;
    if (column === "country") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (column === "continent") {
      valA = a.continent.toLowerCase();
      valB = b.continent.toLowerCase();
    } else if (column === "samples") {
      valA = a.sands.length;
      valB = b.sands.length;
    }
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  document.querySelectorAll("#country-table th.sortable-th").forEach((th) => {
    const icon = th.querySelector(".sort-icon");
    if (th.dataset.sort === column) {
      th.classList.add("sort-active");
      if (icon) icon.textContent = direction === "asc" ? "▲" : "▼";
    } else {
      th.classList.remove("sort-active");
      if (icon) icon.textContent = "↕";
    }
  });

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
        <div class="country-cell-flex">
          ${renderCountryFlagHtml(country.name, country.sands[0]?.lat, country.sands[0]?.lng)}
          <span class="country-label">${escapeHtml(country.name)}</span>
          <span class="count-bracket">(${country.sands.length})</span>
        </div>
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
  const backBtn = document.getElementById("back-to-countries-btn");
  const countryColHeader = document.getElementById("sand-country-col-header");
  const query = document.getElementById("sand-filter-input").value.trim().toLowerCase();

  const isAllMode = state.filterMode && state.filterMode.type === "all";
  let sourceSands = [];

  if (isAllMode) {
    sourceSands = [...state.sands].sort(compareById);
    backBtn.classList.add("hidden");
    countryColHeader.classList.remove("hidden");
    titleEl.textContent = `All Sands (${sourceSands.length.toLocaleString()} samples — sorted by ID)`;
  } else {
    const countryObj = state.countriesMap.get(state.selectedCountry);
    if (!countryObj) return;
    sourceSands = countryObj.sands;
    backBtn.classList.remove("hidden");
    countryColHeader.classList.add("hidden");
    titleEl.innerHTML = `<span class="country-title-flex">${renderCountryFlagHtml(countryObj.name, countryObj.sands[0]?.lat, countryObj.sands[0]?.lng)} <span>${escapeHtml(countryObj.name)} (${countryObj.sands.length} samples — sorted by ID)</span></span>`;
  }

  countryPanel.classList.add("hidden");
  sandPanel.classList.remove("hidden");
  updateBreadcrumbs();

  const matchingSands = sourceSands.filter((s) => {
    if (!query) return true;
    return (
      String(s.id).toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      (isAllMode && s.country.toLowerCase().includes(query)) ||
      s.notes.toLowerCase().includes(query)
    );
  });

  tbody.innerHTML = "";

  if (matchingSands.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isAllMode ? 7 : 6}">No samples match your search filter.</td></tr>`;
    return;
  }

  for (const sand of matchingSands) {
    const hasCoords = sand.lat !== null && sand.lng !== null;
    const coordLabel = hasCoords ? `${sand.lat.toFixed(4)}, ${sand.lng.toFixed(4)}` : "N/A";
    const tr = document.createElement("tr");
    const countryCellHtml = isAllMode
      ? `<td><div class="country-cell-flex">${renderCountryFlagHtml(sand.country, sand.lat, sand.lng)} <span>${escapeHtml(sand.country)}</span></div></td>`
      : "";

    tr.innerHTML = `
      <td class="id-col">#${escapeHtml(String(sand.id))}</td>
      <td><strong>${escapeHtml(sand.name)}</strong></td>
      ${countryCellHtml}
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
  if (state.filterMode.type === "all") {
    bar.innerHTML = `<span>Index</span> &rsaquo; <strong>All Sands</strong>`;
    return;
  }

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
    if (state.selectedCountry || (state.filterMode && state.filterMode.type === "all")) {
      renderSandTable();
    }
  });


  document.querySelectorAll("#country-table th.sortable-th").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (state.countrySort.column === col) {
        state.countrySort.direction = state.countrySort.direction === "asc" ? "desc" : "asc";
      } else {
        state.countrySort.column = col;
        state.countrySort.direction = col === "samples" ? "desc" : "asc";
      }
      if (state.filterMode) renderCountryTable();
    });
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
      maxClusterRadius: 40
    });
    state.mapInstance.addLayer(state.markerCluster);

    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "map-olympic-legend");
      const entries = [
        { label: "Europe", color: "#0081C8" },
        { label: "Asia", color: "#FCB131" },
        { label: "Africa", color: "#1A1A1A" },
        { label: "Oceania / Australia", color: "#00A651" },
        { label: "Americas", color: "#EE334E" },
        { label: "Antarctica / Other", color: "#6C7A89" }
      ];
      div.innerHTML =
        `<div class="legend-title">Olympic Continent Pins</div>` +
        entries
          .map(
            (e) =>
              `<div class="legend-item"><span class="legend-dot" style="background:${e.color};"></span><span>${e.label}</span></div>`
          )
          .join("");
      return div;
    };
    legend.addTo(state.mapInstance);
  }

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

    const olympicStyle = getOlympicContinentStyle(sand.continent);
    const marker = L.marker([sand.lat, sand.lng], {
      icon: createOlympicPinIcon(sand.continent)
    });

    const popupHtml = `
      <div class="popup-content">
        <span class="popup-badge" style="background:${olympicStyle.fill};color:${olympicStyle.textColor};">
          ID #${escapeHtml(String(sand.id))} · ${escapeHtml(sand.continent)}
        </span>
        <h4>${escapeHtml(sand.name)}</h4>
        <p class="popup-country-row">${renderCountryFlagHtml(sand.country, sand.lat, sand.lng)} <strong>${escapeHtml(sand.country)}</strong></p>
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
    `Displaying ${validCount.toLocaleString()} mapped sand samples color-coded by Olympic continent colors.`;
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
  renderLetterChart();
  renderLatitudeChart();
  renderLongitudeChart();
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
          backgroundColor: sorted.map((c) => getOlympicContinentStyle(c.name).fill)
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

function formatDegreeBandLabel(start, end, posSuffix, negSuffix) {
  const formatVal = (val) => {
    if (val === 0) return "0°";
    return val < 0 ? `${Math.abs(val)}°${negSuffix}` : `${val}°${posSuffix}`;
  };
  return `${formatVal(start)} to ${formatVal(end)}`;
}

function renderLatitudeChart() {
  destroyChartIfExists("latitudes");
  const bands = [];
  for (let deg = -90; deg < 90; deg += 10) {
    bands.push({
      label: formatDegreeBandLabel(deg, deg + 10, "N", "S"),
      min: deg,
      max: deg === 80 ? 90.0001 : deg + 10,
      count: 0
    });
  }

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
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30
          }
        },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderLongitudeChart() {
  destroyChartIfExists("longitudes");
  const bands = [];
  for (let deg = -180; deg < 180; deg += 10) {
    bands.push({
      label: formatDegreeBandLabel(deg, deg + 10, "E", "W"),
      min: deg,
      max: deg === 170 ? 180.0001 : deg + 10,
      count: 0
    });
  }

  for (const s of state.sands) {
    if (s.lng === null) continue;
    const band = bands.find((b) => s.lng >= b.min && s.lng < b.max);
    if (band) band.count++;
  }

  const ctx = document.getElementById("chart-longitudes");
  if (!ctx) return;
  state.charts.longitudes = new Chart(ctx, {
    type: "bar",
    data: {
      labels: bands.map((b) => b.label),
      datasets: [
        {
          label: "Samples",
          data: bands.map((b) => b.count),
          backgroundColor: "#1f4e5f",
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30
          }
        },
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
