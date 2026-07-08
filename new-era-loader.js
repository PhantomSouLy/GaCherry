// GaCherry New ERA runtime extension.
// Loads Wuthering Waves × Cherry cards from data/new-era.json and merges them into the main database without touching data/cards.json.

const NEW_ERA_URL = './data/new-era.json';

(function installNewEraLoader() {
  const NEW_ERA_INSERT_AFTER = {
    resonance: 'epic_plus',
    forte: 'legendary_plus',
    awakened: 'mythical_plus'
  };

  let mergeStarted = false;
  let merged = false;
  let pollTimer = null;

  function encodePath(path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function rawUrl(payload, path) {
    return `${payload.assetRepoRaw}/${encodePath(path)}`;
  }

  function blobUrl(payload, path) {
    return `${payload.assetRepoBlob}/${encodePath(path)}?raw=true`;
  }

  function stem(path) {
    return String(path).split('/').pop().replace(/\.[^.]+$/, '');
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function mainDbReady() {
    return typeof db !== 'undefined' && db && Array.isArray(db.cards) && db.cards.length > 0;
  }

  function ensureRarityRuntimeSupport(payload) {
    Object.entries(payload.rarities || {}).forEach(([id, rarity]) => {
      if (typeof ORDER !== 'undefined' && Array.isArray(ORDER) && !ORDER.includes(id)) {
        const insertAfter = NEW_ERA_INSERT_AFTER[id];
        const position = ORDER.indexOf(insertAfter);
        ORDER.splice(position >= 0 ? position + 1 : Math.max(0, ORDER.length - 1), 0, id);
      }

      if (typeof LABEL !== 'undefined') {
        LABEL[id] = [rarity.icon || '?', rarity.name || id];
      }

      if (!Array.isArray(db.rarities)) db.rarities = [];

      const rarityEntry = {
        id,
        name: rarity.name || id,
        icon: rarity.icon || '?',
        iconImage: rarity.iconPath ? rawUrl(payload, rarity.iconPath) : '',
        color: rarity.color || '#8990a3',
        order: rarity.order || 999,
        filterGroup: id
      };

      const existing = db.rarities.find(item => item.id === id);
      if (existing) Object.assign(existing, rarityEntry);
      else db.rarities.push(rarityEntry);
    });
  }

  function ensureCurrencySupport(payload) {
    if (!payload.currency) return;
    if (!Array.isArray(db.currencies)) db.currencies = [];

    const currency = {
      id: payload.currency.id,
      name: payload.currency.name,
      icon: payload.currency.iconPath ? rawUrl(payload, payload.currency.iconPath) : '$',
      order: payload.currency.order || 999
    };

    const existing = db.currencies.find(item => item.id === currency.id);
    if (existing) Object.assign(existing, currency);
    else db.currencies.push(currency);
  }

  function buildCard(payload, entry, index) {
    const rarity = payload.rarities?.[entry.rarity] || {};
    const cardName = entry.name || `Cherry: ${stem(entry.path)}`;
    const types = entry.types || rarity.types || ['Gacha'];
    const sell = entry.sell ?? rarity.sell ?? 0;
    const tradable = entry.tradable ?? rarity.tradable ?? true;

    return {
      id: entry.id || slugify(`new-era-${stem(entry.path)}`),
      number: entry.number || ((payload.startNumber || 660) + index),
      slug: entry.slug || slugify(`new-era-${stem(entry.path)}`),
      name: cardName,
      description: entry.description || 'Wuthering Waves × Cherry New ERA event card.',
      image: rawUrl(payload, entry.path),
      imageOriginal: blobUrl(payload, entry.path),
      rarity: entry.rarity,
      rarityName: rarity.name || entry.rarity,
      rarityIcon: rarity.icon || '?',
      rarityIconImage: rarity.iconPath ? rawUrl(payload, rarity.iconPath) : '',
      rarityGroup: entry.rarity,
      types,
      type: types.join(', '),
      series: payload.series || 'New ERA',
      currency: payload.currency?.id || 'default',
      currencyName: payload.currency?.name || 'Default',
      currencyIcon: payload.currency?.iconPath ? rawUrl(payload, payload.currency.iconPath) : '$',
      sell,
      buy: entry.buy ?? sell,
      stock: entry.stock ?? 'Event',
      maxPerUser: entry.maxPerUser ?? 1,
      role: entry.role ?? null,
      tradable,
      tags: entry.tags || ['Event', 'Limited', 'New ERA', 'Wuthering Waves'].concat(tradable ? [] : ['Untradable'])
    };
  }

  function mergeCards(payload) {
    if (!Array.isArray(db.cards)) db.cards = [];

    const existingIds = new Set(db.cards.map(card => card.id));
    const existingSlugs = new Set(db.cards.map(card => card.slug));
    let added = 0;

    (payload.cards || []).map((entry, index) => buildCard(payload, entry, index)).forEach(card => {
      if (!existingIds.has(card.id) && !existingSlugs.has(card.slug)) {
        db.cards.push(card);
        existingIds.add(card.id);
        existingSlugs.add(card.slug);
        added += 1;
      }
    });

    return added;
  }

  async function mergeNewEra() {
    const response = await fetch(NEW_ERA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${NEW_ERA_URL} nem érhető el`);

    const payload = await response.json();

    ensureRarityRuntimeSupport(payload);
    ensureCurrencySupport(payload);
    return mergeCards(payload);
  }

  async function applyNewEra() {
    if (merged || mergeStarted || !mainDbReady()) return;

    mergeStarted = true;

    try {
      const added = await mergeNewEra();
      merged = true;
      console.info(`[GaCherry] New ERA betöltve. Hozzáadott kártyák: ${added}`);

      if (typeof renderAll === 'function') {
        renderAll();
      }
    } catch (error) {
      mergeStarted = false;
      console.warn('[GaCherry] New ERA kártyák betöltése sikertelen:', error.message);
    }
  }

  if (typeof renderAll === 'function') {
    const originalRenderAll = renderAll;

    renderAll = function patchedRenderAll(...args) {
      const result = originalRenderAll.apply(this, args);
      window.setTimeout(applyNewEra, 0);
      return result;
    };
  }

  pollTimer = window.setInterval(() => {
    if (merged) {
      window.clearInterval(pollTimer);
      return;
    }

    applyNewEra();
  }, 100);

  window.setTimeout(() => {
    if (pollTimer) window.clearInterval(pollTimer);
  }, 15000);
})();
