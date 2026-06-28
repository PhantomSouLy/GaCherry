const DATA_URL = "./data/cards.json";
const PAGE_SIZE = 60;

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Relic", "Cherished", "Mythical", "Eternity", "Unknown"];
const rarityInfo = {
  Common: "Zöld alap kártyák, gyakori dropok.",
  Uncommon: "Szürke ritkaság, alapnál ritkább itemek és kártyák.",
  Rare: "Kék ritkaság, erősebb és látványosabb lapok.",
  Epic: "Lila ritkaság, tematikusabb és részletesebb lapok.",
  Legendary: "Narancs ritkaság, kiemelt Cherry skinek és event lapok.",
  Relic: "Citromsárga különleges ritkaság Legendary és Mythical között.",
  Cherished: "Cherry pink különleges gyűjthető lapok és itemek.",
  Mythical: "Fehér ritkaság, nagyon ritka és kiemelt lapok.",
  Eternity: "Piros, Mythical fölötti extra ritkaság.",
  Unknown: "Még kategorizálatlan vagy rendszer itemek."
};

const rarityColors = {
  Common: "#4caf50",
  Uncommon: "#9ca3af",
  Rare: "#2196f3",
  Epic: "#9c27b0",
  Legendary: "#ff9800",
  Relic: "#ffd54a",
  Cherished: "#ff73c8",
  Mythical: "#f4f4f4",
  Eternity: "#e53935",
  Unknown: "#36cfc9"
};

let database = null;
let cards = [];
let assetBaseUrl = "";
let activeRarity = "All";
let activeSource = "All";
let activeTag = "All";
let currentPage = 1;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const pages = $$(".page");
const statsGrid = $("#statsGrid");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");
const rarityFilters = $("#rarityFilters");
const sourceFilters = $("#sourceFilters");
const tagFilters = $("#tagFilters");
const cardGallery = $("#cardGallery");
const resultCount = $("#resultCount");
const emptyState = $("#emptyState");
const rarityList = $("#rarityList");
const tagBrowser = $("#tagBrowser");
const randomBtn = $("#randomBtn");
const randomResult = $("#randomResult");
const prevPage = $("#prevPage");
const nextPage = $("#nextPage");
const pageInfo = $("#pageInfo");
const prevPageTop = $("#prevPageTop");
const nextPageTop = $("#nextPageTop");
const pageInfoTop = $("#pageInfoTop");

const cardModal = $("#cardModal");
const closeModal = $("#closeModal");
const modalImage = $("#modalImage");
const modalPlaceholder = $("#modalPlaceholder");
const modalNumber = $("#modalNumber");
const modalRarity = $("#modalRarity");
const modalSource = $("#modalSource");
const modalTitle = $("#modalTitle");
const modalTags = $("#modalTags");
const modalDescription = $("#modalDescription");

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugClass(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function getRarityClass(rarity) {
  return slugClass(rarity || "Unknown");
}

function getRarityIndex(rarity) {
  const index = rarityOrder.indexOf(rarity);
  return index === -1 ? -1 : index;
}

function imageUrl(card) {
  if (card.image) return card.image;
  if (!card.asset) return "";
  return assetBaseUrl + encodeURI(card.asset).replace(/#/g, "%23");
}

function getAllTags() {
  return [...new Set(cards.flatMap(card => card.tags || []))].sort((a, b) => a.localeCompare(b, "hu"));
}

function getAllSources() {
  return [...new Set(cards.map(card => card.source || "Unknown"))].sort((a, b) => a.localeCompare(b, "hu"));
}

function showPage(pageId) {
  pages.forEach(page => page.classList.remove("active"));
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStats() {
  const rarityStats = database.statistics?.rarity || {};
  const legendaryPlus = cards.filter(card => ["Legendary", "Relic", "Cherished", "Mythical", "Eternity"].includes(card.rarity)).length;

  statsGrid.innerHTML = `
    <article class="stat-card"><span class="stat-number">${cards.length}</span><span class="stat-label">Kártya / item</span></article>
    <article class="stat-card"><span class="stat-number">${legendaryPlus}</span><span class="stat-label">Legendary+</span></article>
    <article class="stat-card"><span class="stat-number">${getAllTags().length}</span><span class="stat-label">Tag</span></article>
    <article class="stat-card"><span class="stat-number">${rarityStats.Unknown || 0}</span><span class="stat-label">Uncategorized</span></article>
  `;
}

function renderRarityFilters() {
  const filters = ["All", ...rarityOrder.filter(rarity => cards.some(card => card.rarity === rarity))];
  rarityFilters.innerHTML = filters.map(rarity => `
    <button class="filter-btn ${activeRarity === rarity ? "active" : ""}" data-rarity="${rarity}">
      ${rarity === "All" ? "Összes ritkaság" : rarity}
    </button>
  `).join("");

  rarityFilters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeRarity = button.dataset.rarity;
      currentPage = 1;
      renderRarityFilters();
      renderCards();
    });
  });
}

function renderSourceFilters() {
  const filters = ["All", ...getAllSources()];
  sourceFilters.innerHTML = filters.map(source => `
    <button class="filter-btn ${activeSource === source ? "active" : ""}" data-source="${source}">
      ${source === "All" ? "Minden source" : source}
    </button>
  `).join("");

  sourceFilters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeSource = button.dataset.source;
      currentPage = 1;
      renderSourceFilters();
      renderCards();
    });
  });
}

function renderTagFilters() {
  const filters = ["All", ...getAllTags()];
  tagFilters.innerHTML = filters.map(tag => `
    <button class="tag-btn ${activeTag === tag ? "active" : ""}" data-tag="${tag}">
      ${tag === "All" ? "Minden tag" : tag}
    </button>
  `).join("");

  tagFilters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.tag;
      currentPage = 1;
      renderTagFilters();
      renderCards();
    });
  });
}

function getFilteredCards() {
  const search = normalizeText(searchInput.value.trim());

  const filteredCards = cards.filter(card => {
    const text = normalizeText([
      card.name,
      card.rarity,
      card.source,
      card.category,
      card.series,
      card.event,
      ...(card.tags || [])
    ].filter(Boolean).join(" "));

    const matchesSearch = !search || text.includes(search);
    const matchesRarity = activeRarity === "All" || card.rarity === activeRarity;
    const matchesSource = activeSource === "All" || card.source === activeSource;
    const matchesTag = activeTag === "All" || (card.tags || []).includes(activeTag);
    const visible = card.hidden !== true;

    return visible && matchesSearch && matchesRarity && matchesSource && matchesTag;
  });

  const sortValue = sortSelect.value;
  filteredCards.sort((a, b) => {
    if (sortValue === "id-asc") return a.id - b.id;
    if (sortValue === "id-desc") return b.id - a.id;
    if (sortValue === "name-asc") return a.name.localeCompare(b.name, "hu");
    if (sortValue === "rarity-desc") return getRarityIndex(b.rarity) - getRarityIndex(a.rarity) || a.name.localeCompare(b.name, "hu");
    return 0;
  });

  return filteredCards;
}

function updatePagination(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const label = `${currentPage} / ${pages} oldal`;
  pageInfo.textContent = label;
  pageInfoTop.textContent = label;
  prevPage.disabled = prevPageTop.disabled = currentPage <= 1;
  nextPage.disabled = nextPageTop.disabled = currentPage >= pages;
}

function createCardHtml(card) {
  const rarityColor = rarityColors[card.rarity] || rarityColors.Unknown;
  const url = imageUrl(card);

  return `
    <article class="card" data-card-id="${card.id}" style="--rarity-color:${rarityColor}">
      <div class="card-image-wrap">
        <div class="card-placeholder"></div>
        <img src="${url}" alt="${card.name}" loading="lazy" decoding="async" />
      </div>
      <div class="card-info">
        <div class="card-name">${card.name}</div>
        <div class="card-number">#${String(card.id).padStart(3, "0")}</div>
        <div class="pill-row">
          <span class="rarity-pill ${getRarityClass(card.rarity)}">${card.rarity}</span>
          <span class="source-pill">${card.source || "Unknown"}</span>
        </div>
      </div>
    </article>
  `;
}

function bindCardImages(container) {
  container.querySelectorAll("img").forEach(img => {
    if (img.complete) img.classList.add("loaded");
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.addEventListener("error", () => img.closest(".card")?.classList.add("image-error"), { once: true });
  });
}

function renderCards() {
  const filteredCards = getFilteredCards();
  resultCount.textContent = `${filteredCards.length} találat / ${cards.length} összesen`;
  emptyState.style.display = filteredCards.length === 0 ? "block" : "none";

  updatePagination(filteredCards.length);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageCards = filteredCards.slice(start, start + PAGE_SIZE);
  cardGallery.innerHTML = pageCards.map(createCardHtml).join("");

  bindCardImages(cardGallery);

  cardGallery.querySelectorAll(".card").forEach(cardElement => {
    cardElement.addEventListener("click", () => {
      const id = Number(cardElement.dataset.cardId);
      openCardModal(cards.find(card => card.id === id));
    });
  });
}

function renderRarityList() {
  rarityList.innerHTML = rarityOrder.filter(rarity => cards.some(card => card.rarity === rarity)).map(rarity => {
    const count = cards.filter(card => card.rarity === rarity).length;
    return `
      <article class="rarity-card">
        <span class="rarity-pill ${getRarityClass(rarity)}">${rarity}</span>
        <h3>${rarity}</h3>
        <p>${rarityInfo[rarity] || "Ritkaság."}</p>
        <small>${count} elem jelenleg</small>
      </article>
    `;
  }).join("");
}

function renderTagBrowser() {
  tagBrowser.innerHTML = getAllTags().map(tag => {
    const count = cards.filter(card => (card.tags || []).includes(tag)).length;
    return `<button class="tag-btn tag-browser-btn" data-tag="${tag}">${tag}<span>${count}</span></button>`;
  }).join("");

  tagBrowser.querySelectorAll(".tag-browser-btn").forEach(button => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.tag;
      activeRarity = "All";
      activeSource = "All";
      searchInput.value = "";
      currentPage = 1;
      renderTagFilters();
      renderRarityFilters();
      renderSourceFilters();
      renderCards();
      showPage("collection");
    });
  });
}

function renderRandomCard() {
  const visibleCards = cards.filter(card => card.hidden !== true);
  const card = visibleCards[Math.floor(Math.random() * visibleCards.length)];
  randomResult.innerHTML = createCardHtml(card);
  bindCardImages(randomResult);
  randomResult.querySelector(".card").addEventListener("click", () => openCardModal(card));
}

function openCardModal(card) {
  if (!card) return;

  const rarityColor = rarityColors[card.rarity] || rarityColors.Unknown;
  modalPlaceholder.style.background = `linear-gradient(135deg, ${rarityColor}, rgba(255,255,255,.08))`;
  modalImage.classList.remove("loaded");
  modalImage.src = imageUrl(card);
  modalImage.alt = card.name;
  if (modalImage.complete) modalImage.classList.add("loaded");
  modalImage.onload = () => modalImage.classList.add("loaded");

  modalNumber.textContent = `#${String(card.id).padStart(3, "0")}`;
  modalRarity.textContent = card.rarity;
  modalSource.textContent = card.source || "Unknown";
  modalTitle.textContent = card.name;
  modalDescription.textContent = card.description || "Nincs leírás.";
  modalTags.innerHTML = (card.tags || []).map(tag => `<span>${tag}</span>`).join("");

  cardModal.classList.add("open");
  cardModal.setAttribute("aria-hidden", "false");
}

function closeCardModal() {
  cardModal.classList.remove("open");
  cardModal.setAttribute("aria-hidden", "true");
}

function changePage(direction) {
  currentPage += direction;
  renderCards();
  document.getElementById("collection").scrollIntoView({ behavior: "smooth" });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Nem sikerült betölteni: ${DATA_URL}`);
    database = await response.json();
    cards = database.cards || [];
    assetBaseUrl = database.assetBaseUrl || "https://cdn.jsdelivr.net/gh/PhantomSouLy/GaCherry-Assets@main/";

    renderStats();
    renderRarityFilters();
    renderSourceFilters();
    renderTagFilters();
    renderCards();
    renderRarityList();
    renderTagBrowser();
  } catch (error) {
    console.error(error);
    resultCount.textContent = "Nem sikerült betölteni a cards.json fájlt.";
    emptyState.textContent = "Ellenőrizd, hogy a data/cards.json létezik-e.";
    emptyState.style.display = "block";
  }
}

$$('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$$('.back-btn').forEach(button => button.addEventListener('click', () => showPage('home')));
searchInput.addEventListener('input', () => { currentPage = 1; renderCards(); });
sortSelect.addEventListener('change', () => { currentPage = 1; renderCards(); });
prevPage.addEventListener('click', () => changePage(-1));
nextPage.addEventListener('click', () => changePage(1));
prevPageTop.addEventListener('click', () => changePage(-1));
nextPageTop.addEventListener('click', () => changePage(1));
randomBtn.addEventListener('click', renderRandomCard);
closeModal.addEventListener('click', closeCardModal);
cardModal.addEventListener('click', event => { if (event.target === cardModal) closeCardModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCardModal(); });

init();
