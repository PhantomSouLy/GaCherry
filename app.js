const DATA_URL = './data/cards.json';
const GUIDE_URL = './data/guide.json';
const NEWS_URL = './data/news.json';

let db = { cards: [], rarities: [], currencies: [], redeem: { active: [], expired: [] }, craft: { levels: [] } };
let GUIDE = {};
let NEWS = [];
let isRolling = false;

const state = {
  page: 'home',
  guide: 'intro',
  filters: { rarity: 'all', type: 'all', series: 'all', tag: 'all' },
  search: '',
  sort: 'number-asc',
  currentPage: 1,
  perPage: 60
};

const ORDER = ['common', 'uncommon', 'rare', 'epic', 'epic_plus', 'legendary', 'legendary_plus', 'relic', 'mythical', 'cherished', 'eternity', 'dungeon_tier_1', 'dungeon_tier_2', 'dungeon_key', 'unknown'];

const LABEL = {
  common: ['🟢', 'Common'],
  uncommon: ['⚫', 'Uncommon'],
  rare: ['🔵', 'Rare'],
  epic: ['🟣', 'Epic'],
  epic_plus: ['🟪', 'Epic+'],
  legendary: ['🟠', 'Legendary'],
  legendary_plus: ['🟥', 'Legendary+'],
  relic: ['🟡', 'Relic'],
  mythical: ['⚪', 'Mythical'],
  cherished: ['🌸', 'Cherished'],
  eternity: ['🔴', 'Eternity'],
  dungeon_tier_1: ['🔸', 'Dungeon Tier 1'],
  dungeon_tier_2: ['🔶', 'Dungeon Tier 2'],
  dungeon_key: ['🗝️', 'Dungeon Key'],
  unknown: ['?', 'Unknown']
};

const TYPES = ['Gacha', 'Dungeon', 'Store', 'NoDrop', 'Craft', 'Bundle', 'Badge'];
const SERIES = ['Legacy', 'New ERA'];
const TAGS = ['Event', 'Limited', 'Special', 'Dedicated', 'Craft', 'Badge', 'Seasonal', 'Bundle', 'Untradable'];

const DROP = [
  ['common', 20],
  ['uncommon', 25],
  ['rare', 20],
  ['epic', 10],
  ['epic_plus', 5],
  ['legendary', 7.5],
  ['legendary_plus', 4],
  ['relic', 3.45],
  ['mythical', 0.8],
  ['cherished', 0.2],
  ['eternity', 0.05],
  ['dungeon_key', 4]
];

const FALLBACK_NEWS = [
  {
    icon: '✨',
    type: 'Update',
    date: '2026.07.05',
    title: 'Hírek rész a főoldalon',
    text: 'A főoldal kapott egy külön hírek blokkot, ahova update, event, redeem vagy bármilyen fontos GaCherry infó kerülhet.',
    featured: true,
    tags: ['GaCherry', 'Update']
  },
  {
    icon: '🎉',
    type: 'Event',
    date: 'Hamarosan',
    title: 'Event bejelentések helye',
    text: 'Ide jöhetnek a limitált kártyák, szezonális események, új nyitások vagy külön Discord programok.',
    tags: ['Event']
  },
  {
    icon: '📌',
    type: 'Info',
    date: 'Mindig aktuális',
    title: 'Fontos infók egy helyen',
    text: 'Craft változások, új redeem kódok, guide frissítések vagy rendszerüzenetek is szépen kiemelhetők itt.',
    tags: ['Info']
  }
];

const FALLBACK_GUIDE = {
  intro: {
    title: 'Bevezetés',
    body: ['A Guide tartalom akkor töltődik be teljesen, ha a data/guide.json elérhető.']
  }
};

const $ = id => document.getElementById(id);

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} nem érhető el`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

async function load() {
  db = await fetchJson(DATA_URL, db);
  GUIDE = await fetchJson(GUIDE_URL, FALLBACK_GUIDE);
  NEWS = await fetchJson(NEWS_URL, FALLBACK_NEWS);

  if (!Array.isArray(NEWS)) NEWS = FALLBACK_NEWS;
  if (!GUIDE || typeof GUIDE !== 'object') GUIDE = FALLBACK_GUIDE;
  if (!Array.isArray(db.cards)) db.cards = [];
  if (!Array.isArray(db.rarities)) db.rarities = [];
  if (!Array.isArray(db.currencies)) db.currencies = [];

  initTheme();
  bind();
  renderAll();
}

function initTheme() {
  document.body.dataset.theme = localStorage.getItem('gacherry-theme') || 'dark';
  updateTheme();
}

function updateTheme() {
  const label = document.body.dataset.theme === 'dark' ? '🌙 Dark' : '☀️ Light';
  if ($('themeToggle')) $('themeToggle').textContent = label;
  if ($('themeToggleTop')) $('themeToggleTop').textContent = label;
}

function toggleTheme() {
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('gacherry-theme', document.body.dataset.theme);
  updateTheme();
}

function bind() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => showPage(button.dataset.page));
  });

  $('guideToggle')?.addEventListener('click', () => {
    $('guideMenu')?.classList.toggle('collapsed');
    showPage('guide');
  });

  document.querySelectorAll('[data-guide]').forEach(button => {
    button.addEventListener('click', () => {
      state.guide = button.dataset.guide;
      $('guideMenu')?.classList.remove('collapsed');
      showPage('guide');
    });
  });

  if ($('themeToggle')) $('themeToggle').onclick = toggleTheme;
  if ($('themeToggleTop')) $('themeToggleTop').onclick = toggleTheme;

  if ($('searchInput')) {
    $('searchInput').oninput = event => {
      state.search = event.target.value;
      state.currentPage = 1;
      renderCards();
    };
  }

  if ($('clearSearch')) {
    $('clearSearch').onclick = () => {
      state.search = '';
      $('searchInput').value = '';
      state.currentPage = 1;
      renderCards();
    };
  }

  if ($('sortSelect')) {
    $('sortSelect').onchange = event => {
      state.sort = event.target.value;
      renderCards();
    };
  }

  if ($('prevPage')) {
    $('prevPage').onclick = () => {
      state.currentPage -= 1;
      renderCards();
    };
  }

  if ($('nextPage')) {
    $('nextPage').onclick = () => {
      state.currentPage += 1;
      renderCards();
    };
  }

  if ($('closeModal')) $('closeModal').onclick = closeModal;

  if ($('cardModal')) {
    $('cardModal').onclick = event => {
      if (event.target.classList.contains('modal-backdrop')) closeModal();
    };
  }

  if ($('closeCraftModal')) $('closeCraftModal').onclick = closeCraftModal;

  if ($('craftModal')) {
    $('craftModal').onclick = event => {
      if (event.target.classList.contains('modal-backdrop')) closeCraftModal();
    };
  }

  document.querySelectorAll('[data-roll]').forEach(button => {
    button.onclick = () => rollGacha(Number(button.dataset.roll || 1));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal();
      closeCraftModal();
    }
  });
}

function showPage(page) {
  state.page = page;

  document.querySelectorAll('.page').forEach(section => {
    section.classList.remove('active');
  });

  const target = $(`${page}Page`);
  target?.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle(
      'active',
      item.dataset.page === page || (page === 'guide' && item.id === 'guideToggle')
    );
  });

  if (page === 'guide') renderGuide();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderAll() {
  setText('sideTotal', db.cards.length);
  setText('homeCardCount', db.cards.length);
  setText('homeRarityCount', new Set(db.cards.map(card => card.rarityGroup || card.rarity || 'unknown')).size);
  setText('homeCurrencyCount', db.currencies.length);

  renderNews();
  renderStats();
  renderFilters();
  renderCards();
  renderRarities();
  renderCurrencies();
  renderCraft();
  renderGuide();
  renderRedeem();
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function count(items, callback) {
  const map = {};

  items.forEach(item => {
    const key = callback(item);
    map[key] = (map[key] || 0) + 1;
  });

  return map;
}

function lab(group) {
  return LABEL[group] || ['?', group || 'Unknown'];
}

function renderNews() {
  if (!$('newsGrid')) return;

  const items = NEWS.length ? NEWS : FALLBACK_NEWS;

  $('newsGrid').innerHTML = items.map((item, index) => {
    const tags = Array.isArray(item.tags) && item.tags.length ? item.tags : ['GaCherry', item.type || 'Info'];

    return `
      <article class="news-card ${item.featured || index === 0 ? 'featured' : ''}">
        <div class="news-top">
          <span class="news-type">${esc(item.icon || '📌')} ${esc(item.type || 'Info')}</span>
          <span class="news-date">${esc(item.date || '')}</span>
        </div>
        <h3>${esc(item.title || 'Hír')}</h3>
        <p>${esc(item.text || '')}</p>
        <div class="news-footer">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
      </article>
    `;
  }).join('');
}

function renderStats() {
  if (!$('rarityStats')) return;

  const counts = count(db.cards, card => card.rarityGroup || card.rarity || 'unknown');
  const groups = ORDER
    .filter(group => counts[group])
    .concat(Object.keys(counts).filter(group => !ORDER.includes(group)));

  $('rarityStats').innerHTML = groups.length ? groups.map(group => {
    const [icon, label] = lab(group);

    return `
      <button class="rarity-tile ${state.filters.rarity === group ? 'active' : ''}" data-rarity="${esc(group)}">
        <span class="icon">${icon}</span>
        <strong>${esc(label)}</strong>
        <span>${counts[group]} db</span>
      </button>
    `;
  }).join('') : '<div class="empty-state">Nincs betöltött rarity adat.</div>';

  $('rarityStats').querySelectorAll('[data-rarity]').forEach(button => {
    button.onclick = () => {
      state.filters.rarity = button.dataset.rarity;
      state.currentPage = 1;
      showPage('cards');
      syncFilters();
      renderCards();
    };
  });
}

function chip(filter, value, label) {
  return `<button class="chip ${state.filters[filter] === value ? 'active' : ''}" data-filter="${filter}" data-value="${esc(value)}">${esc(label)}</button>`;
}

function uniqueCardValues(callback) {
  return [...new Set(db.cards.map(callback).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'hu'));
}

function renderFilters() {
  const rarityGroups = ORDER.filter(group => db.cards.some(card => (card.rarityGroup || card.rarity) === group));
  const extraRarities = uniqueCardValues(card => card.rarityGroup || card.rarity).filter(group => !ORDER.includes(group));
  const types = [...new Set([...TYPES, ...db.cards.flatMap(card => card.types || [])])].filter(Boolean);
  const series = [...new Set([...SERIES, ...uniqueCardValues(card => card.series)])].filter(Boolean);
  const tags = [...new Set([...TAGS, ...db.cards.flatMap(card => card.tags || [])])].filter(Boolean);

  if ($('rarityFilters')) {
    $('rarityFilters').innerHTML =
      chip('rarity', 'all', 'Összes') +
      rarityGroups.concat(extraRarities).map(group => {
        const [icon, label] = lab(group);
        return chip('rarity', group, `${icon} ${label}`);
      }).join('');
  }

  if ($('typeFilters')) {
    $('typeFilters').innerHTML =
      chip('type', 'all', 'Összes') +
      types.map(type => chip('type', type, type)).join('');
  }

  if ($('seriesFilters')) {
    $('seriesFilters').innerHTML =
      chip('series', 'all', 'Összes') +
      series.map(item => chip('series', item, item)).join('');
  }

  if ($('tagFilters')) {
    $('tagFilters').innerHTML =
      chip('tag', 'all', 'Minden tag') +
      tags.map(tag => chip('tag', tag, tag)).join('');
  }

  document.querySelectorAll('.chip[data-filter]').forEach(button => {
    button.onclick = () => {
      state.filters[button.dataset.filter] = button.dataset.value;
      state.currentPage = 1;
      syncFilters();
      renderCards();
    };
  });
}

function syncFilters() {
  document.querySelectorAll('.chip[data-filter]').forEach(button => {
    button.classList.toggle('active', state.filters[button.dataset.filter] === button.dataset.value);
  });

  renderStats();
}

function matches(card) {
  const rarity = card.rarityGroup || card.rarity || 'unknown';

  if (state.filters.rarity !== 'all' && rarity !== state.filters.rarity) return false;

  if (state.filters.type !== 'all') {
    const types = card.types || [];
    const tags = card.tags || [];

    if (!types.includes(state.filters.type) && !tags.includes(state.filters.type)) return false;
  }

  if (state.filters.series !== 'all' && card.series !== state.filters.series) return false;
  if (state.filters.tag !== 'all' && !(card.tags || []).includes(state.filters.tag)) return false;

  const query = state.search.trim().toLowerCase();

  if (query) {
    const haystack = [
      card.name,
      card.description,
      card.rarityName,
      card.rarity,
      card.rarityGroup,
      card.type,
      card.series,
      card.currencyName,
      ...(card.tags || []),
      ...(card.types || [])
    ].join(' ').toLowerCase();

    if (!haystack.includes(query)) return false;
  }

  return true;
}

function sortCards(a, b) {
  if (state.sort === 'number-desc') return (b.number || 0) - (a.number || 0);
  if (state.sort === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''), 'hu');
  if (state.sort === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''), 'hu');

  if (state.sort === 'rarity-asc') {
    return ORDER.indexOf(a.rarityGroup || a.rarity) - ORDER.indexOf(b.rarityGroup || b.rarity) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'hu');
  }

  return (a.number || 0) - (b.number || 0);
}

function cardHTML(card) {
  return `
    <article class="card" data-number="${esc(card.number)}">
      <div class="image-shell">
        <img src="${esc(card.image || '')}" alt="${esc(card.name || '')}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-name">${esc(card.name || 'Névtelen kártya')}</div>
        <div class="card-meta">
          <span class="rarity-badge">${esc(card.rarityIcon || lab(card.rarityGroup || card.rarity)[0])} ${esc(card.rarityName || lab(card.rarityGroup || card.rarity)[1])}</span>
          <span class="card-id">#${String(card.number || 0).padStart(3, '0')}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCards() {
  if (!$('cardsGrid')) return;

  const list = db.cards.filter(matches).sort(sortCards);
  const pages = Math.max(1, Math.ceil(list.length / state.perPage));

  state.currentPage = Math.min(Math.max(1, state.currentPage), pages);

  const page = list.slice(
    (state.currentPage - 1) * state.perPage,
    state.currentPage * state.perPage
  );

  setText('resultCount', `${list.length} kártya`);

  $('cardsGrid').innerHTML = page.length
    ? page.map(cardHTML).join('')
    : '<div class="empty-state">Nincs találat.</div>';

  $('cardsGrid').querySelectorAll('.card').forEach(element => {
    element.onclick = () => openModal(findCardByNumber(element.dataset.number));
  });

  if ($('prevPage')) $('prevPage').disabled = state.currentPage <= 1;
  if ($('nextPage')) $('nextPage').disabled = state.currentPage >= pages;
  if ($('pageNumbers')) $('pageNumbers').innerHTML = `<button class="active" type="button">${state.currentPage} / ${pages}</button>`;
}

function findCardByNumber(number) {
  return db.cards.find(card => String(card.number) === String(number));
}

function curHTML(value, card) {
  if (value === null || value === undefined || value === '') return '-';

  const currency = db.currencies.find(item => item.id === card.currency) || { icon: '$', name: 'Default' };

  return currency.icon && String(currency.icon).startsWith('data/')
    ? `<span class="currency-value"><img src="${esc(currency.icon)}" alt="${esc(currency.name)}"><b>${esc(value)}</b></span>`
    : `<span class="currency-value"><span>${esc(currency.icon || '$')}</span><b>${esc(value)}</b></span>`;
}

function renderDesc(text) {
  return esc(text || '')
    .replace(/&lt;:RedStar:\d+&gt;/g, '<img class="inline-icon" src="data/Currency/RedStar.webp" alt="RedStar">')
    .replace(/&lt;RedStar:\d+&gt;/g, '<img class="inline-icon" src="data/Currency/RedStar.webp" alt="RedStar">');
}

function openModal(card) {
  if (!card) return;

  $('cardModal')?.classList.add('open');

  if ($('modalImage')) {
    $('modalImage').src = card.image || '';
    $('modalImage').alt = card.name || '';
  }

  setText('modalNumber', `#${String(card.number || 0).padStart(3, '0')}`);
  setText('modalRarity', `${card.rarityIcon || lab(card.rarityGroup || card.rarity)[0]} ${card.rarityName || lab(card.rarityGroup || card.rarity)[1]}`);
  setText('modalTypes', (card.types || []).join(', '));
  setText('modalTitle', card.name || 'Névtelen kártya');

  if ($('modalDescription')) {
    $('modalDescription').innerHTML = renderDesc(card.description || 'Nincs külön leírás megadva.');
  }

  setText('modalSeries', card.series || '-');
  setText('modalTypeList', (card.types || []).join(', ') || '-');

  if ($('modalSell')) $('modalSell').innerHTML = curHTML(card.sell, card);
  if ($('modalBuy')) $('modalBuy').innerHTML = curHTML(card.buy, card);

  setText('modalStock', card.stock ?? '-');
  setText('modalMaxUser', card.maxPerUser ?? '-');
  setText('modalRole', card.role || '-');

  if ($('modalRoleRow')) $('modalRoleRow').style.display = card.role ? 'flex' : 'none';

  const tags = card.tags || [];
  if ($('modalTags')) {
    $('modalTags').innerHTML = tags.length
      ? tags.map(tag => `<span>${esc(tag)}</span>`).join('')
      : '<span>Nincs tag</span>';
  }
}

function closeModal() {
  $('cardModal')?.classList.remove('open');
}

function closeCraftModal() {
  $('craftModal')?.classList.remove('open');
}

function renderRarities() {
  if (!$('rarityList')) return;

  const counts = count(db.cards, card => card.rarityGroup || card.rarity || 'unknown');
  const groups = ORDER
    .filter(group => counts[group])
    .concat(Object.keys(counts).filter(group => !ORDER.includes(group)));

  $('rarityList').innerHTML = groups.length ? groups.map(group => {
    const [icon, label] = lab(group);

    return `
      <button class="rarity-tile" data-rarity-page="${esc(group)}">
        <span class="icon">${icon}</span>
        <strong>${esc(label)}</strong>
        <span>${counts[group]} db</span>
      </button>
    `;
  }).join('') : '<div class="empty-state">Nincs rarity adat.</div>';

  $('rarityList').querySelectorAll('[data-rarity-page]').forEach(button => {
    button.onclick = () => {
      state.filters.rarity = button.dataset.rarityPage;
      state.currentPage = 1;
      showPage('cards');
      syncFilters();
      renderCards();
    };
  });
}

function renderCurrencies() {
  if (!$('currencyList')) return;

  $('currencyList').innerHTML = db.currencies.length ? db.currencies.map(currency => {
    const icon = currency.icon && String(currency.icon).startsWith('data/')
      ? `<img src="${esc(currency.icon)}" alt="${esc(currency.name)}">`
      : `<span class="currency-symbol">${esc(currency.icon || '$')}</span>`;

    return `<article class="currency-tile">${icon}<strong>${esc(currency.name || 'Pénznem')}</strong></article>`;
  }).join('') : '<div class="empty-state">Nincs pénznem adat.</div>';
}

function renderCraft() {
  if (!$('craftTree')) return;

  const levels = db.craft?.levels || [];

  $('craftTree').innerHTML = levels.length ? levels.map(level => `
    <article class="craft-card">
      <h3>${esc(level.title || 'Craft')}</h3>
      <p><strong>Eredmény:</strong> ${linkable(level.result || '')}</p>
      <p><strong>Rarity:</strong> ${esc(level.rarity || '-')} · <strong>Role:</strong> ${esc(level.role || '-')}</p>

      <h4>Szükséges:</h4>
      <ul>
        ${(level.requirements || []).map(item => `<li>${linkable(item)}</li>`).join('')}
      </ul>

      ${(level.subcrafts || []).map(sub => `
        <h4>${esc(sub.title || '')}</h4>
        <ul>
          ${(sub.items || []).map(item => `<li>${linkable(item)}</li>`).join('')}
        </ul>
      `).join('')}
    </article>
  `).join('') : '<div class="empty-state">Nincs craft adat.</div>';

  document.querySelectorAll('[data-craft-search]').forEach(element => {
    element.onclick = () => openCraftPreview(element.dataset.craftSearch);
  });
}

function cleanCraft(text) {
  return String(text || '')
    .replace(/^\s*\d+\s*[
