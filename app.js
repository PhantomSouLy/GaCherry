const DATA_URL = "./data/cards.json";

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
    "modalEvent", "modalTags"
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

function normalizeCard(card, index) {
  return {
    id: card.id ?? index + 1,
    slug: card.slug || "",
    name: card.name || `Card ${index + 1}`,
    rarity: card.rarity || "Unknown",
    source: card.source || card.type || "Unknown",
    category: card.category || "Uncategorized",
    series: card.series ?? null,
    event: card.event ?? null,
    tags: Array.isArray(card.tags) ? card.tags : [],
    asset: card.asset || "",
    image: card.image || "",
    description: card.description || ""
  };
}

async function loadDatabase() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Nem sikerült betölteni a cards.json fájlt.");

  const database = await response.json();
  state.database = database;
  state.cards = (database.cards || []).map(normalizeCard);
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
    case "id-desc": return b.id - a.id;
    case "name-asc": return a.name.localeCompare(b.name, "hu");
    case "name-desc": return b.name.localeCompare(a.name, "hu");
    case "rarity-desc": return getRarityRank(b.rarity) - getRarityRank(a.rarity) || a.name.localeCompare(b.name, "hu");
    case "rarity-asc": return getRarityRank(a.rarity) - getRarityRank(b.rarity) || a.name.localeCompare(b.name, "hu");
    case "id-asc":
    default: return a.id - b.id;
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
      const id = Number(cardEl.dataset.id);
      openModal(state.cards.find(card => card.id === id));
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

function createCardHTML(card) {
  const cls = rarityClass(card.rarity);
  const imageUrl = getImageUrl(card);

  return `
    <article class="card ${cls}" data-id="${card.id}">
      <div class="image-shell">
        <div class="placeholder">${escapeHtml(card.rarity)}</div>
        <img data-src="${escapeAttr(imageUrl)}" alt="${escapeAttr(card.name)}" loading="lazy">
      </div>

      <div class="card-info">
        <div class="card-name">${escapeHtml(card.name)}</div>
        <div class="card-meta">
          <span class="rarity-badge ${cls}">${escapeHtml(card.rarity)}</span>
          <span class="card-id">#${String(card.id).padStart(3, "0")}</span>
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

  els.modalId.textContent = `#${String(card.id).padStart(3, "0")}`;
  els.modalRarity.className = `rarity-badge ${cls}`;
  els.modalRarity.textContent = card.rarity;
  els.modalSource.textContent = card.source;

  els.modalTitle.textContent = card.name;
  els.modalDescription.textContent = card.description || "Nincs külön leírás megadva.";
  els.modalCategory.textContent = safeText(card.category);
  els.modalSeries.textContent = safeText(card.series);
  els.modalEvent.textContent = safeText(card.event);

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
