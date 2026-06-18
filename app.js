let activeRarity = "All";
let activeTag = "All";

const pages = document.querySelectorAll(".page");

const statsGrid = document.getElementById("statsGrid");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const rarityFilters = document.getElementById("rarityFilters");
const tagFilters = document.getElementById("tagFilters");

const cardGallery = document.getElementById("cardGallery");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

const rarityList = document.getElementById("rarityList");
const tagBrowser = document.getElementById("tagBrowser");

const randomBtn = document.getElementById("randomBtn");
const randomResult = document.getElementById("randomResult");

const cardModal = document.getElementById("cardModal");
const closeModal = document.getElementById("closeModal");

const modalImage = document.getElementById("modalImage");
const modalNumber = document.getElementById("modalNumber");
const modalRarity = document.getElementById("modalRarity");
const modalTitle = document.getElementById("modalTitle");
const modalTags = document.getElementById("modalTags");
const modalDescription = document.getElementById("modalDescription");

/* ==========================
   PAGE SYSTEM
========================== */

function showPage(pageId) {
  pages.forEach(page => {
    page.classList.remove("active");
  });

  const targetPage = document.getElementById(pageId);

  if (targetPage) {
    targetPage.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll(".back-btn").forEach(button => {
  button.addEventListener("click", () => {
    showPage("home");
  });
});

/* ==========================
   HELPERS
========================== */

function getRarityClass(rarity) {
  return rarity.toLowerCase();
}

function getRarityIndex(rarity) {
  return rarityOrder.indexOf(rarity);
}

function getAllTags() {
  const allTags = cards.flatMap(card => card.tags);
  const uniqueTags = [...new Set(allTags)];

  return uniqueTags.sort((a, b) => {
    return a.localeCompare(b, "hu");
  });
}

function getCardsByTag(tag) {
  return cards.filter(card => {
    return card.tags.includes(tag);
  });
}

function getCardsByRarity(rarity) {
  return cards.filter(card => {
    return card.rarity === rarity;
  });
}

/* ==========================
   STATS
========================== */

function renderStats() {
  const totalCards = cards.length;

  const legendaryPlus = cards.filter(card => {
    return ["Legendary", "Mythical", "Eternity"].includes(card.rarity);
  }).length;

  const totalTags = getAllTags().length;

  statsGrid.innerHTML = `
    <article class="stat-card">
      <span class="stat-number">${totalCards}</span>
      <span class="stat-label">Kártya</span>
    </article>

    <article class="stat-card">
      <span class="stat-number">${legendaryPlus}</span>
      <span class="stat-label">Legendary+</span>
    </article>

    <article class="stat-card">
      <span class="stat-number">${totalTags}</span>
      <span class="stat-label">Tag</span>
    </article>
  `;
}

/* ==========================
   FILTERS
========================== */

function renderRarityFilters() {
  const filters = ["All", ...rarityOrder];

  rarityFilters.innerHTML = filters.map(rarity => {
    const isActive = activeRarity === rarity;

    return `
      <button
        class="filter-btn ${isActive ? "active" : ""}"
        data-rarity="${rarity}"
      >
        ${rarity === "All" ? "Összes ritkaság" : rarity}
      </button>
    `;
  }).join("");

  rarityFilters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeRarity = button.dataset.rarity;

      renderRarityFilters();
      renderCards();
    });
  });
}

function renderTagFilters() {
  const filters = ["All", ...getAllTags()];

  tagFilters.innerHTML = filters.map(tag => {
    const isActive = activeTag === tag;

    return `
      <button
        class="tag-btn ${isActive ? "active" : ""}"
        data-tag="${tag}"
      >
        ${tag === "All" ? "Minden tag" : tag}
      </button>
    `;
  }).join("");

  tagFilters.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.tag;

      renderTagFilters();
      renderCards();
    });
  });
}

/* ==========================
   CARD RENDER
========================== */

function getFilteredCards() {
  const searchValue = searchInput.value.trim().toLowerCase();

  let filteredCards = cards.filter(card => {
    const matchesSearch =
      card.name.toLowerCase().includes(searchValue) ||
      card.rarity.toLowerCase().includes(searchValue) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchValue));

    const matchesRarity =
      activeRarity === "All" ||
      card.rarity === activeRarity;

    const matchesTag =
      activeTag === "All" ||
      card.tags.includes(activeTag);

    return matchesSearch && matchesRarity && matchesTag;
  });

  const sortValue = sortSelect.value;

  filteredCards.sort((a, b) => {
    if (sortValue === "number-asc") {
      return a.number - b.number;
    }

    if (sortValue === "number-desc") {
      return b.number - a.number;
    }

    if (sortValue === "name-asc") {
      return a.name.localeCompare(b.name, "hu");
    }

    if (sortValue === "rarity-desc") {
      return getRarityIndex(b.rarity) - getRarityIndex(a.rarity);
    }

    return 0;
  });

  return filteredCards;
}

function renderCards() {
  const filteredCards = getFilteredCards();

  resultCount.textContent =
    `${filteredCards.length} kártya`;

  emptyState.style.display =
    filteredCards.length === 0
    ? "block"
    : "none";

  cardGallery.innerHTML = filteredCards.map(card => {
    return `
      <article class="card" data-card-number="${card.number}">
        <img src="${card.image}" alt="${card.name}" loading="lazy" />

        <div class="card-info">
          <div class="card-name">${card.name}</div>
          <div class="card-number">#${String(card.number).padStart(3, "0")}</div>

          <span class="rarity-pill ${getRarityClass(card.rarity)}">
            ${card.rarity}
          </span>
        </div>
      </article>
    `;
  }).join("");

  cardGallery.querySelectorAll(".card").forEach(cardElement => {
    cardElement.addEventListener("click", () => {
      const cardNumber = Number(cardElement.dataset.cardNumber);

      const selectedCard = cards.find(card => {
        return card.number === cardNumber;
      });

      openCardModal(selectedCard);
    });
  });
}

/* ==========================
   RARITY PAGE
========================== */

function renderRarityList() {
  rarityList.innerHTML = rarityOrder.map(rarity => {
    const info = rarityInfo[rarity];
    const count = getCardsByRarity(rarity).length;

    return `
      <article class="rarity-card">
        <span class="rarity-pill ${info.className}">
          ${info.label}
        </span>

        <h3>${rarity}</h3>

        <p>${info.description}</p>

        <small>${count} kártya jelenleg</small>
      </article>
    `;
  }).join("");
}

/* ==========================
   TAG PAGE
========================== */

function renderTagBrowser() {
  const tags = getAllTags();

  tagBrowser.innerHTML = tags.map(tag => {
    const count = getCardsByTag(tag).length;

    return `
      <button class="tag-btn tag-browser-btn" data-tag="${tag}">
        ${tag}
        <span>${count}</span>
      </button>
    `;
  }).join("");

  tagBrowser.querySelectorAll(".tag-browser-btn").forEach(button => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.tag;
      activeRarity = "All";
      searchInput.value = "";

      renderTagFilters();
      renderRarityFilters();
      renderCards();

      showPage("collection");
    });
  });
}

/* ==========================
   RANDOM CARD
========================== */

function renderRandomCard() {
  const randomIndex = Math.floor(Math.random() * cards.length);
  const card = cards[randomIndex];

  randomResult.innerHTML = `
    <article class="card random-card" data-card-number="${card.number}">
      <img src="${card.image}" alt="${card.name}" />

      <div class="card-info">
        <div class="card-name">${card.name}</div>
        <div class="card-number">#${String(card.number).padStart(3, "0")}</div>

        <span class="rarity-pill ${getRarityClass(card.rarity)}">
          ${card.rarity}
        </span>
      </div>
    </article>
  `;

  randomResult.querySelector(".card").addEventListener("click", () => {
    openCardModal(card);
  });
}

randomBtn.addEventListener("click", renderRandomCard);

/* ==========================
   MODAL
========================== */

function openCardModal(card) {
  if (!card) {
    return;
  }

  cardModal.classList.add("open");
  cardModal.setAttribute("aria-hidden", "false");

  modalImage.src = card.image;
  modalImage.alt = card.name;

  modalNumber.textContent =
    `#${String(card.number).padStart(3, "0")}`;

  modalRarity.textContent =
    card.rarity;

  modalTitle.textContent =
    card.name;

  modalDescription.textContent =
    card.description;

  modalTags.innerHTML = card.tags.map(tag => {
    return `<span>${tag}</span>`;
  }).join("");
}

function closeCardModal() {
  cardModal.classList.remove("open");
  cardModal.setAttribute("aria-hidden", "true");
}

closeModal.addEventListener("click", closeCardModal);

cardModal.addEventListener("click", event => {
  if (event.target === cardModal) {
    closeCardModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCardModal();
  }
});

/* ==========================
   EVENTS
========================== */

searchInput.addEventListener("input", renderCards);
sortSelect.addEventListener("change", renderCards);

/* ==========================
   INIT
========================== */

renderStats();
renderRarityFilters();
renderTagFilters();
renderCards();
renderRarityList();
renderTagBrowser();
