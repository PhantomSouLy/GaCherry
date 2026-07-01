const CARD_DATA_INDEX_URL = "./data/cards/index.json";
const CURRENCY_DATA_URL = "./data/currencies/currencies.json";

const RARITY_META = {
  common: { id: "common", name: "Common", icon: "🟢", order: 10, className: "common" },
  uncommon: { id: "uncommon", name: "Uncommon", icon: "⚫", order: 20, className: "uncommon" },
  rare: { id: "rare", name: "Rare", icon: "🔵", order: 30, className: "rare" },
  epic: { id: "epic", name: "Epic", icon: "🟣", order: 40, className: "epic" },
  legendary: { id: "legendary", name: "Legendary", icon: "🟠", order: 50, className: "legendary" },
  relic: { id: "relic", name: "Relic", icon: "🟡", order: 60, className: "relic" },
  mythical: { id: "mythical", name: "Mythical", icon: "⚪", order: 70, className: "mythical" },
  cherished: { id: "cherished", name: "Cherished", icon: "🌸", order: 80, className: "cherished" },
  eternity: { id: "eternity", name: "Eternity", icon: "🔴", order: 90, className: "eternity" },
  dungeon_tier_1: { id: "dungeon_tier_1", name: "Dungeon Tier 1", icon: "🔸", order: 100, className: "dungeon" },
  dungeon_tier_2: { id: "dungeon_tier_2", name: "Dungeon Tier 2", icon: "🔶", order: 101, className: "dungeon" },
  dungeon_key: { id: "dungeon_key", name: "Dungeon Key", icon: "🗝️", order: 102, className: "dungeon" },
  unknown: { id: "unknown", name: "Unknown", icon: "?", order: 999, className: "unknown" }
};

const DEFAULT_CURRENCIES = {
  default: { id: "default", name: "Default", icon: "$", type: "symbol" },
  unknown: { id: "default", name: "Default", icon: "$", type: "symbol" }
};

const FUNCTION_FILTERS = [
  { id: "Gacha", label: "Gacha", mode: "type" },
  { id: "Dungeon", label: "Dungeon", mode: "type" },
  { id: "Store", label: "Store", mode: "type" },
  { id: "NoDrop", label: "NoDrop", mode: "type" },
  { id: "Craft", label: "Craft", mode: "tag" },
  { id: "Bundle", label: "Bundle", mode: "tag" },
  { id: "Badge", label: "Badge", mode: "tag" }
];

const TAG_FILTERS = ["Event", "Limited", "Special", "Dedicated", "Seasonal", "Untradable"];
const SERIES_FILTERS = ["Legacy", "New ERA"];

const state = {
  cards: [],
  filtered: [],
  currencies: { ...DEFAULT_CURRENCIES },
  activeRarity: "All",
  activeFunction: "All",
  activeTag: "All",
  activeSeries: "All",
  search: "",
  sort: "order-asc",
  currentPage: 1,
  perPage: 60
};

const els = {};

function $(id) { return document.getElementById(id); }

function setupElements() {
  [
    "themeToggle", "themeIcon", "themeLabel", "statTotal", "statRarities", "statCurrencies", "statVisible",
    "rarityTotal", "rarityStatsGrid", "searchInput", "clearSearchBtn", "raritySelect", "sortSelect",
    "rarityChips", "functionChips", "seriesChips", "tagChips", "resultCount", "perPageSelect",
    "cardGallery", "emptyState", "prevPage", "nextPage", "pageNumbers", "cardModal", "closeModal",
    "modalPlaceholder", "modalImage", "modalId", "modalRarity", "modalTypeBadge", "modalTitle", "modalDescription",
    "modalDetails", "modalTags"
  ].forEach(id => els[id] = $(id));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " plus ")
    .replace(/\[(.*?)\]/g, " $1 ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function getRarityMeta(id) {
  const key = normalizeRarity(id);
  return RARITY_META[key] || RARITY_META.unknown;
}

function normalizeRarity(value) {
  const key = normalizeKey(value || "unknown");
  if (key.includes("dungeon_tier_1")) return "dungeon_tier_1";
  if (key.includes("dungeon_tier_2")) return "dungeon_tier_2";
  if (key.includes("dungeon_key")) return "dungeon_key";
  if (key.includes("cherished")) return "cherished";
  if (key.includes("eternity")) return "eternity";
  if (key.includes("mythical")) return "mythical";
  if (key.includes("relic")) return "relic";
  if (key.includes("legendary")) return "legendary";
  if (key.includes("epic")) return "epic";
  if (key.includes("rare")) return "rare";
  if (key.includes("uncommon")) return "uncommon";
  if (key.includes("common")) return "common";
  return RARITY_META[key] ? key : "unknown";
}

function normalizeType(value) {
  const key = String(value || "Gacha").trim().toLowerCase().replace(/\s+/g, "");
  if (key === "nodrop" || key === "no-drop") return "NoDrop";
  if (key === "store") return "Store";
  if (key === "dungeon") return "Dungeon";
  if (key === "gacha") return "Gacha";
  return "Gacha";
}

function normalizeTag(tag) {
  const text = String(tag || "").trim();
  const key = text.toLowerCase().replace(/\s+/g, "");
  if (!text || key === "premium" || key === "nodrop") return "";
  if (key === "event") return "Event";
  if (key === "limited") return "Limited";
  if (key === "special") return "Special";
  if (key === "craft") return "Craft";
  if (key === "badge") return "Badge";
  if (key === "seasonal") return "Seasonal";
  if (key === "bundle" || key === "bundles") return "Bundle";
  if (key === "dedicated") return "Dedicated";
  if (key === "untradable") return "Untradable";
  return text;
}

function uniqueTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : []).map(normalizeTag).filter(Boolean))];
}

function getImageUrl(card) {
  return card.image || card.asset || "";
}

function getCurrencyMeta(card) {
  const id = normalizeKey(card.currency || card.currencyName || "default");
  const meta = state.currencies[id] || state.currencies.default || DEFAULT_CURRENCIES.default;
  return {
    id: meta.id || id,
    name: card.currencyName && card.currencyName !== "Unknown" ? card.currencyName : (meta.name || "Default"),
    icon: card.currencyIcon && card.currencyIcon !== "❔" ? card.currencyIcon : (meta.icon || "$"),
    type: meta.type || (/^https?:|^\.\//.test(meta.icon || "") ? "image" : "symbol")
  };
}

function normalizeCard(card, index) {
  const rarityId = normalizeRarity(card.rarity || card.rarityName);
  const rarityMeta = getRarityMeta(rarityId);
  const type = normalizeType(card.type || card.source);
  const tags = uniqueTags(card.tags);
  const currency = getCurrencyMeta(card);
  return {
    ...card,
    _uid: index + 1,
    order: Number(card.order || index + 1),
    id: card.id || `card-${index + 1}`,
    slug: card.slug || card.id || `card-${index + 1}`,
    name: card.name || `Card ${index + 1}`,
    rarity: rarityId,
    rarityName: rarityMeta.name,
    rarityIcon: rarityMeta.icon,
    rarityClass: rarityMeta.className,
    series: card.series || "Legacy",
    type,
    source: type,
    tags,
    currency: currency.id,
    currencyName: currency.name,
    currencyIcon: currency.icon,
    currencyType: currency.type,
    description: card.description || ""
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Nem sikerült betölteni: ${url}`);
  return response.json();
}

async function fetchJsonOptional(url) {
  try { return await fetchJson(url); }
  catch (error) { console.warn(error); return null; }
}

async function loadCurrencies() {
  const data = await fetchJsonOptional(CURRENCY_DATA_URL);
  const map = { ...DEFAULT_CURRENCIES };
  for (const item of data?.currencies || []) {
    map[item.id] = item;
  }
  state.currencies = map;
}

async function loadCards() {
  const index = await fetchJson(CARD_DATA_INDEX_URL);
  const files = (index.files || []).map(file => file.startsWith("./") || file.startsWith("/") ? file : `./data/cards/${file}`);
  const groups = await Promise.all(files.map(fetchJson));
  const cards = groups.flatMap(group => group.cards || []);
  state.cards = cards.map(normalizeCard).sort((a, b) => a.order - b.order);
  state.filtered = [...state.cards];
}

function countBy(list, getter) {
  return list.reduce((acc, item) => {
    const key = typeof getter === "function" ? getter(item) : item[getter];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getActiveRarities() {
  const used = new Set(state.cards.map(card => card.rarity));
  return Object.values(RARITY_META).filter(meta => used.has(meta.id)).sort((a, b) => a.order - b.order);
}

function renderSummary() {
  const rarityCount = new Set(state.cards.map(c => c.rarity)).size;
  const currencyCount = new Set(state.cards.map(c => c.currency)).size;
  els.statTotal.textContent = state.cards.length;
  els.statRarities.textContent = rarityCount;
  els.statCurrencies.textContent = currencyCount;
  els.statVisible.textContent = state.filtered.length;
  els.rarityTotal.textContent = `${state.cards.length} összesen`;
}

function renderRarityStats() {
  const counts = countBy(state.cards, "rarity");
  els.rarityStatsGrid.innerHTML = getActiveRarities().map(meta => `
    <button class="rarity-stat ${state.activeRarity === meta.id ? "active" : ""}" data-rarity="${escapeAttr(meta.id)}" type="button">
      <span class="stat-name">${escapeHtml(meta.icon)} ${escapeHtml(meta.name)}</span>
      <span class="stat-count">${counts[meta.id] || 0} db</span>
    </button>
  `).join("");

  els.rarityStatsGrid.querySelectorAll("[data-rarity]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeRarity = state.activeRarity === button.dataset.rarity ? "All" : button.dataset.rarity;
      state.currentPage = 1;
      syncControls();
      applyFilters();
    });
  });
}

function makeChip(label, value, active, attr = "filter") {
  return `<button class="filter-chip ${active ? "active" : ""}" data-${attr}="${escapeAttr(value)}" type="button">${escapeHtml(label)}</button>`;
}

function renderControls() {
  const rarities = getActiveRarities();
  els.raritySelect.innerHTML = `<option value="All">Rarity (Összes)</option>` + rarities.map(meta => `<option value="${escapeAttr(meta.id)}">${escapeHtml(meta.icon)} ${escapeHtml(meta.name)}</option>`).join("");

  els.rarityChips.innerHTML = makeChip("Összes", "All", state.activeRarity === "All", "rarity") + rarities.map(meta => makeChip(`${meta.icon} ${meta.name}`, meta.id, state.activeRarity === meta.id, "rarity")).join("");

  els.functionChips.innerHTML = makeChip("Összes", "All", state.activeFunction === "All", "function") + FUNCTION_FILTERS.map(filter => makeChip(filter.label, filter.id, state.activeFunction === filter.id, "function")).join("");

  els.seriesChips.innerHTML = makeChip("Összes", "All", state.activeSeries === "All", "series") + SERIES_FILTERS.map(series => makeChip(series, series, state.activeSeries === series, "series")).join("");

  const availableTags = new Set(state.cards.flatMap(card => card.tags));
  const tags = TAG_FILTERS.filter(tag => availableTags.has(tag));
  els.tagChips.innerHTML = makeChip("Minden tag", "All", state.activeTag === "All", "tag") + tags.map(tag => makeChip(tag, tag, state.activeTag === tag, "tag")).join("");

  els.rarityChips.querySelectorAll("[data-rarity]").forEach(btn => btn.addEventListener("click", () => setFilter("activeRarity", btn.dataset.rarity)));
  els.functionChips.querySelectorAll("[data-function]").forEach(btn => btn.addEventListener("click", () => setFilter("activeFunction", btn.dataset.function)));
  els.seriesChips.querySelectorAll("[data-series]").forEach(btn => btn.addEventListener("click", () => setFilter("activeSeries", btn.dataset.series)));
  els.tagChips.querySelectorAll("[data-tag]").forEach(btn => btn.addEventListener("click", () => setFilter("activeTag", btn.dataset.tag)));
}

function setFilter(key, value) {
  state[key] = value;
  state.currentPage = 1;
  syncControls();
  applyFilters();
}

function syncControls() {
  els.raritySelect.value = state.activeRarity;
  renderControls();
  renderRarityStats();
}

function matchesFunction(card) {
  if (state.activeFunction === "All") return true;
  const filter = FUNCTION_FILTERS.find(item => item.id === state.activeFunction);
  if (!filter) return true;
  if (filter.mode === "type") return card.type === filter.id;
  return card.tags.includes(filter.id);
}

function applyFilters() {
  const search = state.search.trim().toLowerCase();
  state.filtered = state.cards.filter(card => {
    const matchesRarity = state.activeRarity === "All" || card.rarity === state.activeRarity;
    const matchesTag = state.activeTag === "All" || card.tags.includes(state.activeTag);
    const matchesSeries = state.activeSeries === "All" || card.series === state.activeSeries;
    const haystack = [card.name, card.description, card.rarityName, card.type, card.series, card.currencyName, card.role, ...card.tags].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesRarity && matchesFunction(card) && matchesTag && matchesSeries && matchesSearch;
  });

  sortCards();
  state.currentPage = Math.min(state.currentPage, getMaxPage());
  renderSummary();
  renderRarityStats();
  renderCards();
  renderPagination();
}

function sortCards() {
  state.filtered.sort((a, b) => {
    switch (state.sort) {
      case "order-desc": return b.order - a.order;
      case "name-asc": return a.name.localeCompare(b.name, "hu");
      case "name-desc": return b.name.localeCompare(a.name, "hu");
      case "rarity-asc": return getRarityMeta(a.rarity).order - getRarityMeta(b.rarity).order || a.order - b.order;
      case "order-asc":
      default: return a.order - b.order;
    }
  });
}

function getMaxPage() {
  return Math.max(1, Math.ceil(state.filtered.length / state.perPage));
}

function formatCardId(card) {
  return `#${String(card.order).padStart(3, "0")}`;
}

function createCardHTML(card) {
  const cls = card.rarityClass || getRarityMeta(card.rarity).className;
  const imageUrl = getImageUrl(card);
  return `
    <article class="card ${cls}" data-uid="${card._uid}">
      <div class="image-shell">
        <img data-src="${escapeAttr(imageUrl)}" alt="${escapeAttr(card.name)}" loading="lazy">
        <div class="placeholder">${escapeHtml(card.rarityName)}</div>
      </div>
      <div class="card-info">
        <div class="card-name">${escapeHtml(card.name)}</div>
        <div class="card-meta">
          <span class="rarity-badge ${cls}">${escapeHtml(card.rarityIcon)} ${escapeHtml(card.rarityName)}</span>
          <span class="card-id">${formatCardId(card)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCards() {
  const start = (state.currentPage - 1) * state.perPage;
  const visible = state.filtered.slice(start, start + state.perPage);
  els.resultCount.textContent = `${state.filtered.length} kártya`;
  els.emptyState.style.display = visible.length ? "none" : "block";
  els.cardGallery.innerHTML = visible.map(createCardHTML).join("");

  els.cardGallery.querySelectorAll(".card").forEach(cardEl => {
    cardEl.addEventListener("click", () => {
      const uid = Number(cardEl.dataset.uid);
      openModal(state.cards.find(card => card._uid === uid));
    });
  });

  els.cardGallery.querySelectorAll("img[data-src]").forEach(img => {
    img.addEventListener("load", () => {
      img.classList.add("loaded");
      img.closest(".image-shell")?.classList.add("loaded");
    }, { once: true });
    img.addEventListener("error", () => {
      img.alt = "A kép nem tölthető be";
      img.closest(".image-shell")?.classList.remove("loaded");
      console.warn("Kép nem tölthető be:", img.dataset.src);
    }, { once: true });
    img.src = img.dataset.src;
  });
}

function renderPagination() {
  const max = getMaxPage();
  els.prevPage.disabled = state.currentPage <= 1;
  els.nextPage.disabled = state.currentPage >= max;
  const pages = buildPageList(state.currentPage, max);
  els.pageNumbers.innerHTML = pages.map(page => page === "..." ? `<span class="dots">...</span>` : `<button class="${page === state.currentPage ? "active" : ""}" data-page="${page}" type="button">${page}</button>`).join("");
  els.pageNumbers.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => {
    state.currentPage = Number(btn.dataset.page);
    renderCards();
    renderPagination();
    window.scrollTo({ top: els.cardGallery.offsetTop - 120, behavior: "smooth" });
  }));
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 4) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push("...");
  pages.push(total);
  return pages;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatCurrencyValue(value, card) {
  if (value === null || value === undefined || value === "") return "-";
  const icon = card.currencyIcon || "$";
  const name = card.currencyName || "Default";
  const amount = `<b>${escapeHtml(value)}</b>`;
  if (/^https?:\/\//i.test(icon) || icon.startsWith("./") || icon.startsWith("/")) {
    return `<span class="currency-value" title="${escapeAttr(name)}"><img class="currency-icon" src="${escapeAttr(icon)}" alt="${escapeAttr(name)}"> ${amount}</span>`;
  }
  return `<span class="currency-value" title="${escapeAttr(name)}"><span class="currency-symbol">${escapeHtml(icon)}</span> ${amount}</span>`;
}

function detailRow(label, value, html = false) {
  if (value === null || value === undefined || value === "" || value === "Uncategorized") return "";
  return `<div class="detail-row"><dt>${escapeHtml(label)}</dt><dd>${html ? value : escapeHtml(value)}</dd></div>`;
}

function openModal(card) {
  if (!card) return;
  const cls = card.rarityClass || getRarityMeta(card.rarity).className;
  els.cardModal.classList.add("open");
  els.cardModal.setAttribute("aria-hidden", "false");
  els.modalImage.classList.remove("loaded");
  els.modalImage.src = "";
  els.modalImage.alt = card.name;
  els.modalImage.onload = () => els.modalImage.classList.add("loaded");
  els.modalImage.onerror = () => console.warn("Modal kép nem tölthető be:", getImageUrl(card));
  els.modalImage.src = getImageUrl(card);
  els.modalPlaceholder.className = `modal-placeholder ${cls}`;

  els.modalId.textContent = formatCardId(card);
  els.modalRarity.className = `rarity-badge ${cls}`;
  els.modalRarity.textContent = `${card.rarityIcon} ${card.rarityName}`;
  els.modalTypeBadge.textContent = card.type;
  els.modalTitle.textContent = card.name;
  els.modalDescription.textContent = card.description || "Nincs külön leírás megadva.";

  els.modalDetails.innerHTML = [
    detailRow("Series", card.series),
    detailRow("Type", card.type),
    detailRow("Sell", formatCurrencyValue(card.sell, card), true),
    detailRow("Buy", formatCurrencyValue(card.buy, card), true),
    detailRow("Stock", formatValue(card.stock)),
    detailRow("Max/User", formatValue(card.maxPerUser)),
    detailRow("Role", card.role)
  ].join("");

  els.modalTags.innerHTML = card.tags.length
    ? card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")
    : `<span>Nincs tag</span>`;
}

function closeModal() {
  els.cardModal.classList.remove("open");
  els.cardModal.setAttribute("aria-hidden", "true");
}

function setupTheme() {
  const saved = localStorage.getItem("gacherry-theme") || "dark";
  document.documentElement.dataset.theme = saved;
  updateThemeButton(saved);
  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("gacherry-theme", next);
    updateThemeButton(next);
  });
}

function updateThemeButton(theme) {
  els.themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  els.themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value;
    state.currentPage = 1;
    applyFilters();
  });
  els.clearSearchBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    state.search = "";
    state.currentPage = 1;
    applyFilters();
  });
  els.raritySelect.addEventListener("change", () => setFilter("activeRarity", els.raritySelect.value));
  els.sortSelect.addEventListener("change", () => { state.sort = els.sortSelect.value; applyFilters(); });
  els.perPageSelect.addEventListener("change", () => { state.perPage = Number(els.perPageSelect.value); state.currentPage = 1; applyFilters(); });
  els.prevPage.addEventListener("click", () => { state.currentPage = Math.max(1, state.currentPage - 1); renderCards(); renderPagination(); });
  els.nextPage.addEventListener("click", () => { state.currentPage = Math.min(getMaxPage(), state.currentPage + 1); renderCards(); renderPagination(); });
  els.closeModal.addEventListener("click", closeModal);
  els.cardModal.addEventListener("click", event => { if (event.target.classList.contains("modal-backdrop")) closeModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
}

async function init() {
  setupElements();
  setupTheme();
  bindEvents();
  try {
    await loadCurrencies();
    await loadCards();
    renderControls();
    applyFilters();
  } catch (error) {
    console.error(error);
    els.resultCount.textContent = "Nem sikerült betölteni az adatbázist.";
    els.cardGallery.innerHTML = `<article class="empty-state" style="display:block">${escapeHtml(error.message)}</article>`;
  }
}

init();
