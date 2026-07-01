const CORE_DATA_URL = "./data/cards.json";
const CARD_DATA_INDEX_URL = "./data/cards/index.json";

// Ide elég később új sorokat tenni a data/cards/index.json fájlban.
// Példa: "common.json", "rare.json", "epic.json"
const FALLBACK_CARD_DATA_FILES = [
  "cherished.json"
];

const fallbackRarityOrder = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Relic",
  "Cherished",
  "Mythical",
  "Eternity",
  "Unknown"
];

const rarityIcons = {
  Common: "✿",
  Uncommon: "✦",
  Rare: "✦",
  Epic: "✦",
  Legendary: "♛",
  Relic: "✹",
  Cherished: "♥",
  Mythical: "✧",
  Eternity: "✷",
  Unknown: "?"
};

const state = {
  database: null,
  cards: [],
  filtered: [],
  activePage: "collection",
  activeTag: "All",
  activeRarity: "All",
  activeSource: "All",
  sort: "id-asc",
  search: "",
  currentPage: 1,
  perPage: 60,
  compact: false
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function setupElements() {
  [
    "sideTotal", "sideRarityCount", "sideSourceCount", "resultCount",
    "totalCardsNumber", "totalProgressBar", "rarityPanelTotal",
    "rarityStatsGrid", "searchInput", "clearSearchBtn", "raritySelect",
    "sourceSelect", "sortSelect", "quickFilters", "tagFilters",
    "cardGallery", "prevPage", "nextPage", "pageNumbers", "perPageSelect",
    "emptyState", "rarityOverview", "sourceOverview", "gridViewBtn",
    "compactViewBtn", "cardModal", "closeModal", "modalImage",
    "modalPlaceholder", "modalId", "modalRarity", "modalSource",
    "modalTitle", "modalDescription", "modalCategory", "modalSeries",
    "modalEvent", "modalType", "modalSell", "modalBuy", "modalStock",
    "modalMaxUser", "modalRole", "modalTags"
  ].forEach(id => els[id] = $(id));
}

function rarityClass(rarity) {
  return String(rarity || "Unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getAssetBase() {
  return state.database?.assetBaseUrl || "https://cdn.jsdelivr.net/gh/PhantomSouLy/GaCherry-Assets@main/";
}

function getImageUrl(card) {
  if (card.image && /^https?:\/\//i.test(card.image)) return card.image;
  if (card.asset && /^https?:\/\//i.test(card.asset)) return card.asset;
  if (card.asset) return getAssetBase() + card.asset;
  return "";
}

function getRarityOrder() {
  const stats = state.database?.statistics?.rarity || {};
  const fromStats = Object.keys(stats);
  return fallbackRarityOrder.filter(r => fromStats.includes(r)).concat(
    fromStats.filter(r => !fallbackRarityOrder.includes(r))
  );
}

function getRarityRank(rarity) {
  return getRarityOrder().indexOf(rarity);
}

function normalizeSource(value) {
  const text = String(value || "Unknown").trim();
  const upper = text.toUpperCase().replace(/\s+/g, "");

  if (upper === "NODROP" || upper === "NODROP") return "NoDrop";
  if (upper === "STORE") return "Store";
  if (upper === "GACHA") return "Gacha";
  if (upper === "DUNGEON") return "Dungeon";
  if (upper === "CURRENCY") return "Currency";
  if (upper === "BUNDLE") return "Bundle";
  if (upper === "MERGE") return "Merge";

  return text;
}

function normalizeTag(tag) {
  const text = String(tag || "").trim();
  const upper = text.toUpperCase().replace(/\s+/g, "");

  if (upper === "NODROP") return "NoDrop";
  if (upper === "UNTRADABLE") return "Untradable";
  // Lootium Premium csak dev/internal jelzés, a Collectionben ne jelenjen meg tagként.
  if (upper === "PREMIUM") return "";
  if (upper === "LIMITED") return "Limited";
  if (upper === "EVENT") return "Event";

  return text;
}

function uniqueTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : []).map(normalizeTag).filter(Boolean))];
}

function normalizeMergeKey(card) {
  return [card.rarity || "Unknown", card.name || ""].join("|").toLowerCase();
}

function mergeCardLists(cardGroups) {
  const merged = [];
  const indexByKey = new Map();

  cardGroups.forEach(group => {
    group.forEach(card => {
      const key = normalizeMergeKey(card);

      if (indexByKey.has(key)) {
        const existingIndex = indexByKey.get(key);
        const existing = merged[existingIndex];

        merged[existingIndex] = {
          ...existing,
          ...card,
          // A régi cards.json numerikus ID-ja maradjon meg, hogy a sorrend stabil legyen.
          id: existing.id ?? card.id,
          slug: card.slug || existing.slug,
          category: card.category || existing.category,
          series: card.series ?? existing.series ?? null,
          event: card.event ?? existing.event ?? null,
          tags: uniqueTags([...(existing.tags || []), ...(card.tags || [])])
        };
      } else {
        indexByKey.set(key, merged.length);
        merged.push(card);
      }
    });
  });

  return merged;
}

function normalizeCard(card, index) {
  const source = normalizeSource(card.type || card.source || "Unknown");
  const tags = uniqueTags(card.tags);
  const rarityName = card.rarityName || card.rarity || "Unknown";
  const rarityIcon = card.rarityIcon || rarityIcons[rarityName] || "";
  const currency = card.currency || "default";
  const currencyName = card.currencyName || (currency === "default" ? "Default" : currency);

  return {
    _uid: index + 1,
    _sortId: typeof card.id === "number" ? card.id : index + 1,
    id: card.id ?? index + 1,
    slug: card.slug || "",
    name: card.name || `Card ${index + 1}`,
    rarity: card.rarity || "Unknown",
    rarityName,
    rarityIcon,
    source,
    type: source,
    category: card.category || "Uncategorized",
    series: card.series ?? null,
    event: card.event ?? null,
    tags,
    asset: card.asset || "",
    image: card.image || "",
    imageOriginal: card.imageOriginal || "",
    description: card.description || "",
    currency,
    currencyName,
    currencyIcon: card.currencyIcon ?? null,
    tradable: card.tradable ?? null,
    sell: card.sell ?? null,
    buy: card.buy ?? null,
    stock: card.stock ?? null,
    maxPerUser: card.maxPerUser ?? null,
    role: card.role ?? null,
    rawText: card.rawText || ""
  };
}

async function fetchJsonOptional(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Nem sikerült betölteni:", url, error);
    return null;
  }
}

async function getExtraCardFiles() {
  const index = await fetchJsonOptional(CARD_DATA_INDEX_URL);
  const files = Array.isArray(index?.files) ? index.files : FALLBACK_CARD_DATA_FILES;

  return files
    .filter(Boolean)
    .map(file => file.startsWith("./") || file.startsWith("/") || /^https?:\/\//i.test(file)
      ? file
      : `./data/cards/${file}`
    );
}

function calculateStatistics(cards) {
  return {
    rarity: countBy(cards, "rarity"),
    source: countBy(cards, "source"),
    raritySource: cards.reduce((acc, card) => {
      const rarity = card.rarity || "Unknown";
      const source = card.source || "Unknown";
      acc[rarity] ??= {};
      acc[rarity][source] = (acc[rarity][source] || 0) + 1;
      return acc;
    }, {})
  };
}

async function loadDatabase() {
  const response = await fetch(CORE_DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Nem sikerült betölteni a cards.json fájlt.");

  const database = await response.json();
  const extraFiles = await getExtraCardFiles();
  const extraDatabases = (await Promise.all(extraFiles.map(fetchJsonOptional))).filter(Boolean);

  const rawCards = mergeCardLists([
    database.cards || [],
    ...extraDatabases.map(db => db.cards || [])
  ]);

  state.database = {
    ...database,
    generatedAt: new Date().toISOString(),
    totalCards: rawCards.length,
    loadedFiles: [CORE_DATA_URL, ...extraFiles],
    statistics: calculateStatistics(rawCards.map((card, index) => normalizeCard(card, index)))
  };

  state.cards = rawCards.map(normalizeCard);
  state.filtered = [...state.cards];

  renderAll();
}

function renderAll() {
  renderSidebarStats();
  renderRarityDashboard();
  renderControls();
  renderRarityOverview();
  renderSourceOverview();
  applyFilters();
}

function renderSidebarStats() {
  const rarityCount = Object.keys(state.database?.statistics?.rarity || {}).length;
  const sourceCount = Object.keys(state.database?.statistics?.source || {}).length;

  els.sideTotal.textContent = state.cards.length;
  els.sideRarityCount.textContent = rarityCount;
  els.sideSourceCount.textContent = sourceCount;
  els.totalCardsNumber.textContent = state.cards.length;
  els.rarityPanelTotal.textContent = `${state.cards.length} összesen`;
}

function renderRarityDashboard() {
  const stats = state.database?.statistics?.rarity || countBy(state.cards, "rarity");
  const total = state.cards.length || 1;

  els.rarityStatsGrid.innerHTML = getRarityOrder().map(rarity => {
    const count = stats[rarity] || 0;
    const pct = Math.round((count / total) * 1000) / 10;
    return `
      <button class="rarity-stat" data-rarity="${rarity}" title="${rarity}">
        <strong><span class="mini-icon ${rarityClass(rarity)}">${rarityIcons[rarity] || "✦"}</span> ${rarity}</strong>
        <span>${count} / ${total}</span>
        <b class="rarity-badge ${rarityClass(rarity)}">${pct}%</b>
      </button>
    `;
  }).join("");

  els.rarityStatsGrid.querySelectorAll("[data-rarity]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeRarity = btn.dataset.rarity;
      state.currentPage = 1;
      syncControls();
      applyFilters();
    });
  });
}

function renderControls() {
  const rarities = ["All", ...getRarityOrder()];
  const sources = ["All", ...Object.keys(state.database?.statistics?.source || countBy(state.cards, "source")).sort()];
  const tags = getAllTags();

  els.raritySelect.innerHTML = rarities.map(r => `<option value="${r}">${r === "All" ? "Rarity (Összes)" : r}</option>`).join("");
  els.sourceSelect.innerHTML = sources.map(s => `<option value="${s}">${s === "All" ? "Source (Összes)" : s}</option>`).join("");

  els.quickFilters.innerHTML = rarities.map(r => `
    <button class="filter-chip ${r === "All" ? "active" : ""}" data-rarity="${r}">
      ${r === "All" ? "Összes" : r}
    </button>
  `).join("") + sources.filter(s => s !== "All").map(s => `
    <button class="filter-chip source-chip" data-source="${s}">
      ${s}
    </button>
  `).join("");

  els.tagFilters.innerHTML = [`<button class="tag-chip active" data-tag="All">Minden tag</button>`]
    .concat(tags.slice(0, 36).map(tag => `<button class="tag-chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`))
    .join("");

  els.quickFilters.addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;

    if (btn.dataset.rarity) {
      state.activeRarity = btn.dataset.rarity;
    }

    if (btn.dataset.source) {
      state.activeSource = state.activeSource === btn.dataset.source ? "All" : btn.dataset.source;
    }

    state.currentPage = 1;
    syncControls();
    applyFilters();
  });

  els.tagFilters.addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;

    state.activeTag = btn.dataset.tag;
    state.currentPage = 1;
    syncControls();
    applyFilters();
  });
}

function syncControls() {
  els.raritySelect.value = state.activeRarity;
  els.sourceSelect.value = state.activeSource;

  els.quickFilters.querySelectorAll("[data-rarity]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.rarity === state.activeRarity);
  });

  els.quickFilters.querySelectorAll("[data-source]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.source === state.activeSource);
  });

  els.tagFilters.querySelectorAll("[data-tag]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tag === state.activeTag);
  });
}

function renderRarityOverview() {
  const stats = state.database?.statistics?.rarity || countBy(state.cards, "rarity");

  els.rarityOverview.innerHTML = getRarityOrder().map(rarity => `
    <article class="overview-card">
      <h3><span class="rarity-badge ${rarityClass(rarity)}">${rarity}</span></h3>
      <div class="overview-number">${stats[rarity] || 0}</div>
      <small>kártya ebben a rarityben</small>
    </article>
  `).join("");
}

function renderSourceOverview() {
  const stats = state.database?.statistics?.source || countBy(state.cards, "source");

  els.sourceOverview.innerHTML = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => `
      <article class="overview-card">
        <h3><span class="source-badge">${source}</span></h3>
        <div class="overview-number">${count}</div>
        <small>kártya ebben a source-ban</small>
      </article>
    `).join("");
}

function getAllTags() {
  const tags = new Set();
  state.cards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
  return [...tags].sort((a, b) => a.localeCompare(b, "hu"));
}

function countBy(list, key) {
  return list.reduce((acc, item) => {
    const value = item[key] || "Unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function applyFilters() {
  const search = state.search.trim().toLowerCase();

  let result = state.cards.filter(card => {
    const matchesRarity = state.activeRarity === "All" || card.rarity === state.activeRarity;
    const matchesSource = state.activeSource === "All" || card.source === state.activeSource;
    const matchesTag = state.activeTag === "All" || card.tags.includes(state.activeTag);

    const haystack = [
      card.name,
      card.rarity,
      card.source,
      card.category,
      card.series,
      card.event,
      card.description,
      ...card.tags
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = !search || haystack.includes(search);

    return matchesRarity && matchesSource && matchesTag && matchesSearch;
  });

  result.sort(sortCards);

  state.filtered = result;
  clampPage();
  renderCards();
  renderPagination();
}

function sortCards(a, b) {
  switch (state.sort) {
    case "id-desc": return b._sortId - a._sortId;
    case "name-asc": return a.name.localeCompare(b.name, "hu");
    case "name-desc": return b.name.localeCompare(a.name, "hu");
    case "rarity-desc": return getRarityRank(b.rarity) - getRarityRank(a.rarity) || a.name.localeCompare(b.name, "hu");
    case "rarity-asc": return getRarityRank(a.rarity) - getRarityRank(b.rarity) || a.name.localeCompare(b.name, "hu");
    case "id-asc":
    default: return a._sortId - b._sortId;
  }
}

function clampPage() {
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
  if (state.currentPage > maxPage) state.currentPage = maxPage;
  if (state.currentPage < 1) state.currentPage = 1;
}

function renderCards() {
  const start = (state.currentPage - 1) * state.perPage;
  const visible = state.filtered.slice(start, start + state.perPage);

  els.resultCount.textContent = `${state.filtered.length} kártya`;
  els.emptyState.style.display = visible.length ? "none" : "block";
  els.cardGallery.classList.toggle("compact", state.compact);

  els.cardGallery.innerHTML = visible.map(card => createCardHTML(card)).join("");

  els.cardGallery.querySelectorAll(".card").forEach(cardEl => {
    cardEl.addEventListener("click", () => {
      const uid = Number(cardEl.dataset.uid);
      openModal(state.cards.find(card => card._uid === uid));
    });
  });

  els.cardGallery.querySelectorAll("img[data-src]").forEach(img => {
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.addEventListener("error", () => {
      img.alt = "A kép nem tölthető be";
      img.classList.add("loaded");
    }, { once: true });
    img.src = img.dataset.src;
  });
}


function formatCardId(card) {
  return typeof card.id === "number" ? `#${String(card.id).padStart(3, "0")}` : String(card.id || "-");
}

function formatValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatRarityLabel(card) {
  const name = card.rarityName || card.rarity || "Unknown";
  return `${card.rarityIcon ? `${card.rarityIcon} ` : ""}${name}`;
}

function currencyIconHTML(card) {
  if (card.currencyIcon && /^https?:\/\//i.test(card.currencyIcon)) {
    return `<img class="currency-icon" src="${escapeAttr(card.currencyIcon)}" alt="${escapeAttr(card.currencyName || card.currency || "Currency")}">`;
  }

  if (card.currencyIcon) {
    return `<span class="currency-emoji">${escapeHtml(card.currencyIcon)}</span>`;
  }

  if ((card.currency || "default") === "default") {
    return `<span class="currency-emoji">$</span>`;
  }

  return "";
}

function formatCurrencyValue(card, value) {
  if (value === null || value === undefined || value === "") return "-";
  return `<span class="currency-value">${currencyIconHTML(card)}<b>${escapeHtml(value)}</b></span>`;
}

function createCardHTML(card) {
  const cls = rarityClass(card.rarity);
  const imageUrl = getImageUrl(card);

  return `
    <article class="card ${cls}" data-uid="${card._uid}">
      <div class="image-shell">
        <div class="placeholder">${escapeHtml(card.rarity)}</div>
        <img data-src="${escapeAttr(imageUrl)}" alt="${escapeAttr(card.name)}" loading="lazy">
      </div>

      <div class="card-info">
        <div class="card-name">${escapeHtml(card.name)}</div>
        <div class="card-meta">
          <span class="rarity-badge ${cls}">${escapeHtml(formatRarityLabel(card))}</span>
          <span class="card-id">${formatCardId(card)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));

  els.prevPage.disabled = state.currentPage <= 1;
  els.nextPage.disabled = state.currentPage >= totalPages;

  const pages = buildPageList(state.currentPage, totalPages);
  els.pageNumbers.innerHTML = pages.map(page => {
    if (page === "...") return `<span class="dots">...</span>`;
    return `<button class="${page === state.currentPage ? "active" : ""}" data-page="${page}">${page}</button>`;
  }).join("");

  els.pageNumbers.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentPage = Number(btn.dataset.page);
      renderCards();
      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
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

function openModal(card) {
  if (!card) return;

  const cls = rarityClass(card.rarity);
  const imageUrl = getImageUrl(card);

  els.cardModal.classList.add("open");
  els.cardModal.setAttribute("aria-hidden", "false");

  els.modalImage.classList.remove("loaded");
  els.modalImage.src = "";
  els.modalImage.alt = card.name;

  els.modalPlaceholder.className = `modal-placeholder ${cls}`;
  els.modalImage.onload = () => els.modalImage.classList.add("loaded");
  els.modalImage.src = imageUrl;

  els.modalId.textContent = formatCardId(card);
  els.modalRarity.className = `rarity-badge ${cls}`;
  els.modalRarity.textContent = formatRarityLabel(card);
  els.modalSource.textContent = card.source;

  els.modalTitle.textContent = card.name;
  els.modalDescription.textContent = card.description || "Nincs külön leírás megadva.";
  els.modalCategory.textContent = safeText(card.category);
  els.modalSeries.textContent = safeText(card.series);
  els.modalEvent.textContent = safeText(card.event);
  if (els.modalType) els.modalType.textContent = safeText(card.type || card.source);
  if (els.modalSell) els.modalSell.innerHTML = formatCurrencyValue(card, card.sell);
  if (els.modalBuy) els.modalBuy.innerHTML = formatCurrencyValue(card, card.buy);
  if (els.modalStock) els.modalStock.textContent = formatValue(card.stock);
  if (els.modalMaxUser) els.modalMaxUser.textContent = formatValue(card.maxPerUser);
  if (els.modalRole) els.modalRole.textContent = formatValue(card.role);

  els.modalTags.innerHTML = card.tags.length
    ? card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")
    : `<span>Nincs tag</span>`;
}

function closeModal() {
  els.cardModal.classList.remove("open");
  els.cardModal.setAttribute("aria-hidden", "true");
}

function showPage(pageId) {
  state.activePage = pageId;

  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
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

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

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

  els.raritySelect.addEventListener("change", () => {
    state.activeRarity = els.raritySelect.value;
    state.currentPage = 1;
    syncControls();
    applyFilters();
  });

  els.sourceSelect.addEventListener("change", () => {
    state.activeSource = els.sourceSelect.value;
    state.currentPage = 1;
    syncControls();
    applyFilters();
  });

  els.sortSelect.addEventListener("change", () => {
    state.sort = els.sortSelect.value;
    applyFilters();
  });

  els.perPageSelect.addEventListener("change", () => {
    state.perPage = Number(els.perPageSelect.value);
    state.currentPage = 1;
    applyFilters();
  });

  els.prevPage.addEventListener("click", () => {
    state.currentPage -= 1;
    clampPage();
    renderCards();
    renderPagination();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.nextPage.addEventListener("click", () => {
    state.currentPage += 1;
    clampPage();
    renderCards();
    renderPagination();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.gridViewBtn.addEventListener("click", () => {
    state.compact = false;
    els.gridViewBtn.classList.add("active");
    els.compactViewBtn.classList.remove("active");
    renderCards();
  });

  els.compactViewBtn.addEventListener("click", () => {
    state.compact = true;
    els.compactViewBtn.classList.add("active");
    els.gridViewBtn.classList.remove("active");
    renderCards();
  });

  els.closeModal.addEventListener("click", closeModal);
  els.cardModal.addEventListener("click", event => {
    if (event.target.classList.contains("modal-backdrop")) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });
}

async function init() {
  setupElements();
  bindEvents();

  try {
    await loadDatabase();
  } catch (error) {
    console.error(error);
    els.resultCount.textContent = "Nem sikerült betölteni az adatbázist.";
    els.cardGallery.innerHTML = `
      <article class="guide-card">
        <h3>Hiba</h3>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}

init();
