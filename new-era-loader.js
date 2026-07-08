// GaCherry New ERA runtime extension.
// Loads Wuthering Waves × Cherry cards from data/new-era.json and merges them into the main database without touching data/cards.json.

const NEW_ERA_URL = './data/new-era.json';

(function installNewEraLoader() {
  const NEW_ERA_ORDER = ['resonance', 'forte', 'awakened'];
  const NEW_ERA_INSERT_AFTER = {
    resonance: 'epic_plus',
    forte: 'legendary_plus',
    awakened: 'mythical_plus'
  };

  let mergeStarted = false;

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

  function ensureRarityRuntimeSupport(payload) {
    Object.entries(payload.rarities || {}).forEach(([id, rarity]) => {
      if (!ORDER.includes(id)) {
        const insertAfter = NEW_ERA_INSERT_AFTER[id];
        const position = ORDER.indexOf(insertAfter);
        ORDER.splice(position >= 0 ? position + 1 : ORDER.length - 1, 0, id);
      }

      LABEL[id] = [rarity.icon || '?', rarity.name || id];

      if (!Array.isArray(db.rarities)) db.rarities = [];
      if (!db.rarities.some(item => item.id === id)) {
        db.rarities.push({
          id,
          name: rarity.name || id,
          icon: rarity.icon || '?',
          iconImage: rarity.iconPath ? rawUrl(payload, rarity.iconPath) : '',
          color: rarity.color || '#8990a3',
          order: rarity.order || 999,
          filterGroup: id
        });
      }
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

    (payload.cards || []).map((entry, index) => buildCard(payload, entry, index)).forEach(card => {
      if (!existingIds.has(card.id) && !existingSlugs.has(card.slug)) {
        db.cards.push(card);
      }
    });
  }

  async function mergeNewEra() {
    const response = await fetch(NEW_ERA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${NEW_ERA_URL} nem érhető el`);

    const payload = await response.json();

    ensureRarityRuntimeSupport(payload);
    ensureCurrencySupport(payload);
    mergeCards(payload);
  }

  const originalRenderAll = renderAll;

  renderAll = function patchedRenderAll(...args) {
    const result = originalRenderAll.apply(this, args);

    if (!mergeStarted) {
      mergeStarted = true;

      mergeNewEra()
        .then(() => originalRenderAll())
        .catch(error => console.warn('New ERA kártyák betöltése sikertelen:', error.message));
    }

    return result;
  };
})();
