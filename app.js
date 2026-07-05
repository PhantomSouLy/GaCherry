const DATA_URL = './data/cards.json';
const GUIDE_URL = './data/guide.json';
let db = { cards: [], rarities: [], currencies: [], redeem: { active: [], expired: [] }, craft: { levels: [] } };
let GUIDE = {};
const state = { page: 'home', guide: 'intro', filters: { rarity: 'all', type: 'all', series: 'all', tag: 'all' }, search: '', sort: 'number-asc', currentPage: 1, perPage: 60 };
const ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'relic', 'mythical', 'cherished', 'eternity', 'dungeon_tier_1', 'dungeon_tier_2', 'dungeon_key', 'unknown'];
const LABEL = { common: ['🟢', 'Common'], uncommon: ['⚫', 'Uncommon'], rare: ['🔵', 'Rare'], epic: ['🟣', 'Epic'], legendary: ['🟠', 'Legendary'], relic: ['🟡', 'Relic'], mythical: ['⚪', 'Mythical'], cherished: ['🌸', 'Cherished'], eternity: ['🔴', 'Eternity'], dungeon_tier_1: ['🔸', 'Dungeon Tier 1'], dungeon_tier_2: ['🔶', 'Dungeon Tier 2'], dungeon_key: ['🗝️', 'Dungeon Key'], unknown: ['?', 'Unknown'] };
const TYPES = ['Gacha', 'Dungeon', 'Store', 'NoDrop', 'Craft', 'Bundle', 'Badge'], SERIES = ['Legacy', 'New ERA'], TAGS = ['Event', 'Limited', 'Special', 'Dedicated', 'Craft', 'Badge', 'Seasonal', 'Bundle', 'Untradable'];
const DROP = [['common', 20], ['uncommon', 25], ['rare', 20], ['epic', 10], ['epic_plus', 5], ['legendary', 7.5], ['legendary_plus', 4], ['relic', 3.45], ['mythical', 0.8], ['cherished', 0.2], ['eternity', 0.05], ['dungeon_key', 4]];
const $ = id => document.getElementById(id); const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
async function load() {
    db = await (await fetch(DATA_URL, { cache: 'no-store' })).json();
    GUIDE = await (await fetch(GUIDE_URL, { cache: 'no-store' })).json();

    initTheme();
    bind();
    renderAll();
}
function initTheme() { document.body.dataset.theme = localStorage.getItem('gacherry-theme') || 'dark'; updateTheme() } function updateTheme() { const t = document.body.dataset.theme === 'dark' ? '🌙 Dark' : '☀️ Light'; $('themeToggle').textContent = t; $('themeToggleTop').textContent = t } function toggleTheme() { document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('gacherry-theme', document.body.dataset.theme); updateTheme() }
function bind() { document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page))); $('guideToggle').addEventListener('click', () => { $('guideMenu').classList.toggle('collapsed'); showPage('guide') }); document.querySelectorAll('[data-guide]').forEach(b => b.addEventListener('click', () => { state.guide = b.dataset.guide; $('guideMenu').classList.remove('collapsed'); showPage('guide') })); $('themeToggle').onclick = toggleTheme; $('themeToggleTop').onclick = toggleTheme; $('searchInput').oninput = e => { state.search = e.target.value; state.currentPage = 1; renderCards() }; $('clearSearch').onclick = () => { state.search = ''; $('searchInput').value = ''; state.currentPage = 1; renderCards() }; $('sortSelect').onchange = e => { state.sort = e.target.value; renderCards() }; $('prevPage').onclick = () => { state.currentPage--; renderCards() }; $('nextPage').onclick = () => { state.currentPage++; renderCards() }; $('closeModal').onclick = closeModal; $('cardModal').onclick = e => { if (e.target.classList.contains('modal-backdrop')) closeModal() }; $('closeCraftModal').onclick = closeCraftModal; $('craftModal').onclick = e => { if (e.target.classList.contains('modal-backdrop')) closeCraftModal() }; document.querySelectorAll('[data-roll]').forEach(b => b.onclick = () => rollGacha(+b.dataset.roll)); document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCraftModal() } }) }
function showPage(p) { state.page = p; document.querySelectorAll('.page').forEach(x => x.classList.remove('active')); $(`${p}Page`)?.classList.add('active'); document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === p || (p === 'guide' && n.id === 'guideToggle'))); if (p === 'guide') renderGuide(); scrollTo({ top: 0, behavior: 'smooth' }) }
function renderAll() { $('sideTotal').textContent = db.cards.length; $('homeCardCount').textContent = db.cards.length; $('homeRarityCount').textContent = new Set(db.cards.map(c => c.rarityGroup)).size; $('homeCurrencyCount').textContent = db.currencies.length; renderStats(); renderFilters(); renderCards(); renderRarities(); renderCurrencies(); renderCraft(); renderGuide(); renderRedeem(); renderDrop() }
function count(arr, fn) { const m = {}; arr.forEach(x => { const k = fn(x); m[k] = (m[k] || 0) + 1 }); return m } function lab(g) { return LABEL[g] || ['?', g || 'Unknown'] }
function renderStats() { const c = count(db.cards, x => x.rarityGroup || 'unknown'); $('rarityStats').innerHTML = ORDER.filter(g => c[g]).map(g => { const [i, l] = lab(g); return `<button class="rarity-tile ${state.filters.rarity === g ? 'active' : ''}" data-rarity="${esc(g)}"><span class="icon">${i}</span><strong>${esc(l)}</strong><span>${c[g]} db</span></button>` }).join(''); $('rarityStats').querySelectorAll('[data-rarity]').forEach(b => b.onclick = () => { state.filters.rarity = b.dataset.rarity; state.currentPage = 1; showPage('cards'); syncFilters(); renderCards() }) }
function chip(f, v, l) { return `<button class="chip ${state.filters[f] === v ? 'active' : ''}" data-filter="${f}" data-value="${esc(v)}">${esc(l)}</button>` } function renderFilters() { $('rarityFilters').innerHTML = chip('rarity', 'all', 'Összes') + ORDER.filter(g => db.cards.some(c => c.rarityGroup === g)).map(g => { const [i, l] = lab(g); return chip('rarity', g, `${i} ${l}`) }).join(''); $('typeFilters').innerHTML = chip('type', 'all', 'Összes') + TYPES.map(t => chip('type', t, t)).join(''); $('seriesFilters').innerHTML = chip('series', 'all', 'Összes') + SERIES.map(s => chip('series', s, s)).join(''); $('tagFilters').innerHTML = chip('tag', 'all', 'Minden tag') + TAGS.map(t => chip('tag', t, t)).join(''); document.querySelectorAll('.chip[data-filter]').forEach(b => b.onclick = () => { state.filters[b.dataset.filter] = b.dataset.value; state.currentPage = 1; syncFilters(); renderCards() }) } function syncFilters() { document.querySelectorAll('.chip[data-filter]').forEach(b => b.classList.toggle('active', state.filters[b.dataset.filter] === b.dataset.value)); renderStats() }
function matches(c) { if (state.filters.rarity !== 'all' && c.rarityGroup !== state.filters.rarity) return false; if (state.filters.type !== 'all') { if (['Craft', 'Bundle', 'Badge'].includes(state.filters.type)) { if (!(c.tags || []).includes(state.filters.type)) return false } else if (!(c.types || []).includes(state.filters.type)) return false } if (state.filters.series !== 'all' && c.series !== state.filters.series) return false; if (state.filters.tag !== 'all' && !(c.tags || []).includes(state.filters.tag)) return false; let q = state.search.trim().toLowerCase(); if (q) { let h = [c.name, c.description, c.rarityName, c.rarity, c.rarityGroup, c.type, c.series, c.currencyName, ...(c.tags || []), ...(c.types || [])].join(' ').toLowerCase(); if (!h.includes(q)) return false } return true }
function sortCards(a, b) { if (state.sort === 'number-desc') return (b.number || 0) - (a.number || 0); if (state.sort === 'name-asc') return a.name.localeCompare(b.name, 'hu'); if (state.sort === 'name-desc') return b.name.localeCompare(a.name, 'hu'); if (state.sort === 'rarity-asc') return ORDER.indexOf(a.rarityGroup) - ORDER.indexOf(b.rarityGroup) || a.name.localeCompare(b.name, 'hu'); return (a.number || 0) - (b.number || 0) }
function cardHTML(c) { return `<article class="card" data-number="${esc(c.number)}"><div class="image-shell"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"></div><div class="card-info"><div class="card-name">${esc(c.name)}</div><div class="card-meta"><span class="rarity-badge">${esc(c.rarityIcon)} ${esc(c.rarityName)}</span><span class="card-id">#${String(c.number).padStart(3, '0')}</span></div></div></article>` }
function renderCards() { let list = db.cards.filter(matches).sort(sortCards); let pages = Math.max(1, Math.ceil(list.length / state.perPage)); state.currentPage = Math.min(Math.max(1, state.currentPage), pages); let page = list.slice((state.currentPage - 1) * state.perPage, state.currentPage * state.perPage); $('resultCount').textContent = `${list.length} kártya`; $('cardsGrid').innerHTML = page.map(cardHTML).join(''); $('cardsGrid').querySelectorAll('.card').forEach(e => e.onclick = () => openModal(db.cards.find(c => String(c.number) === e.dataset.number))); $('prevPage').disabled = state.currentPage <= 1; $('nextPage').disabled = state.currentPage >= pages; $('pageNumbers').innerHTML = `<button class="active">${state.currentPage}</button>` }
function curHTML(v, c) { if (v === null || v === undefined || v === '') return '-'; let cur = db.currencies.find(x => x.id === c.currency) || { icon: '$', name: 'Default' }; return cur.icon && cur.icon.startsWith('data/') ? `<span class="currency-value"><img src="${esc(cur.icon)}" alt="${esc(cur.name)}"><b>${esc(v)}</b></span>` : `<span class="currency-value"><span>${esc(cur.icon || '$')}</span><b>${esc(v)}</b></span>` } function renderDesc(t) { return esc(t || '').replace(/&lt;:RedStar:\d+&gt;/g, '<img class="inline-icon" src="data/Currency/RedStar.webp" alt="RedStar">').replace(/&lt;RedStar:\d+&gt;/g, '<img class="inline-icon" src="data/Currency/RedStar.webp" alt="RedStar">') }
function openModal(c) { if (!c) return; $('cardModal').classList.add('open'); $('modalImage').src = c.image; $('modalImage').alt = c.name; $('modalNumber').textContent = `#${String(c.number).padStart(3, '0')}`; $('modalRarity').textContent = `${c.rarityIcon} ${c.rarityName}`; $('modalTypes').textContent = (c.types || []).join(', '); $('modalTitle').textContent = c.name; $('modalDescription').innerHTML = renderDesc(c.description || 'Nincs külön leírás megadva.'); $('modalSeries').textContent = c.series || '-'; $('modalTypeList').textContent = (c.types || []).join(', ') || '-'; $('modalSell').innerHTML = curHTML(c.sell, c); $('modalBuy').innerHTML = curHTML(c.buy, c); $('modalStock').textContent = c.stock ?? '-'; $('modalMaxUser').textContent = c.maxPerUser ?? '-'; $('modalRole').textContent = c.role || '-'; $('modalRoleRow').style.display = c.role ? 'flex' : 'none'; let tags = c.tags || []; $('modalTags').innerHTML = tags.length ? tags.map(t => `<span>${esc(t)}</span>`).join('') : '<span>Nincs tag</span>' } function closeModal() { $('cardModal').classList.remove('open') } function closeCraftModal() { $('craftModal').classList.remove('open') }
function renderRarities() { let cs = count(db.cards, c => c.rarityGroup); $('rarityList').innerHTML = ORDER.filter(g => cs[g]).map(g => { let [i, l] = lab(g); return `<button class="rarity-tile" data-rarity-page="${esc(g)}"><span class="icon">${i}</span><strong>${esc(l)}</strong><span>${cs[g]} db</span></button>` }).join(''); $('rarityList').querySelectorAll('[data-rarity-page]').forEach(b => b.onclick = () => { state.filters.rarity = b.dataset.rarityPage; state.currentPage = 1; showPage('cards'); syncFilters(); renderCards() }) } function renderCurrencies() { $('currencyList').innerHTML = db.currencies.map(c => { let icon = c.icon?.startsWith('data/') ? `<img src="${esc(c.icon)}" alt="${esc(c.name)}">` : `<span class="currency-symbol">${esc(c.icon || '$')}</span>`; return `<article class="currency-tile">${icon}<strong>${esc(c.name)}</strong></article>` }).join('') }
function renderCraft() { let lv = db.craft?.levels || []; $('craftTree').innerHTML = lv.map(l => `<article class="craft-card"><h3>${esc(l.title)}</h3><p><strong>Eredmény:</strong> ${linkable(l.result)}</p><p><strong>Rarity:</strong> ${esc(l.rarity)} · <strong>Role:</strong> ${esc(l.role)}</p><h4>Szükséges:</h4><ul>${l.requirements.map(x => `<li>${linkable(x)}</li>`).join('')}</ul>${l.subcrafts.map(s => `<h4>${esc(s.title)}</h4><ul>${s.items.map(x => `<li>${linkable(x)}</li>`).join('')}</ul>`).join('')}</article>`).join(''); document.querySelectorAll('[data-craft-search]').forEach(e => e.onclick = () => openCraftPreview(e.dataset.craftSearch)) } function cleanCraft(t) { return String(t).replace(/^\d+×?\s*/, '').replace(/\s*\((Store|Gacha|Dungeon)\)/i, '').replace(/\s*\[\d+x\]/i, '').replace(/\s*→.*$/, '').trim() } function linkable(t) { let n = cleanCraft(t); return `<span class="craft-chip" data-craft-search="${esc(n)}">${esc(t)}</span>` }
function openCraftPreview(q) { let query = q.toLowerCase(); let card = db.cards.find(c => c.name.toLowerCase() === query) || db.cards.find(c => c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase())); let cur = db.currencies.find(c => c.name.toLowerCase() === query || query.includes(c.name.toLowerCase())); let html = ''; if (card) { html = `<img src="${esc(card.image)}" alt=""><h3>${esc(card.name)}</h3><p>${esc(card.rarityIcon)} ${esc(card.rarityName)} · ${esc((card.types || []).join(', '))}</p><button class="primary-action" id="openPreviewCard">Kártya megnyitása</button>` } else if (cur) { let icon = cur.icon.startsWith('data/') ? `<img src="${esc(cur.icon)}" alt="">` : `<div class="currency-symbol">${esc(cur.icon)}</div>`; html = `${icon}<h3>${esc(cur.name)}</h3><p>Pénznem</p>` } else html = `<h3>${esc(q)}</h3><p>Ehhez még nincs pontos kártya találat.</p>`; $('craftPreviewBody').innerHTML = html; $('craftModal').classList.add('open'); if (card) $('openPreviewCard').onclick = () => { closeCraftModal(); openModal(card) } }
function guideBodyToHTML(guide) {
    let html = '';

    if (guide.body) {
        html += guide.body.map((text) => `<p>${text}</p>`).join('');
    }

    if (guide.items) {
        html += `<ul>${guide.items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
    }

    if (guide.note) {
        html += `<p><strong>${guide.note}</strong></p>`;
    }

    return html;
}

function renderGuide() {
    $('guideTabs').innerHTML = Object.entries(GUIDE)
        .map(([id, guide]) => {
            return `<button class="${state.guide === id ? 'active' : ''}" data-guide-tab="${id}">
        ${esc(guide.title)}
      </button>`;
        })
        .join('');

    $('guideTabs').querySelectorAll('[data-guide-tab]').forEach((button) => {
        button.onclick = () => {
            state.guide = button.dataset.guideTab;
            renderGuide();
        };
    });

    const guide = GUIDE[state.guide] || GUIDE.intro;

    $('guideContent').innerHTML = `
    <h3>${esc(guide.title)}</h3>
    ${guideBodyToHTML(guide)}
  `;
} function renderRedeem() { let a = db.redeem?.active || [], e = db.redeem?.expired || []; $('redeemGrid').innerHTML = `<article class="redeem-card"><h3>🟢 Aktív kódok</h3>${a.map(codeCard).join('') || '<p>Nincs aktív kód.</p>'}</article><article class="redeem-card"><h3>🔴 Lejárt kódok</h3>${e.map(codeCard).join('') || '<p>Nincs lejárt kód feltöltve.</p>'}</article>` }
function codeCard(c) { let ex = c.status === 'Expired' ? '<span class="expired-badge">Expired</span>' : ''; return `<div class="redeem-item"><div>${ex}</div><div class="redeem-code">${esc(c.code)}</div>${c.reward ? `<p><strong>Jutalom:</strong> ${esc(c.reward)}</p>` : ''}${c.expires ? `<p><strong>Lejár:</strong> ${esc(c.expires)}</p>` : ''}<small>${esc(c.note || 'Beváltás Discordon: /redeem')}</small></div>` }
function renderDrop() { $('dropTable').innerHTML = DROP.map(([r, p]) => { let m = db.rarities.find(x => x.id === r), name = m ? `${m.icon} ${m.name}` : r; return `<div class="drop-row"><span>${esc(name)}</span><strong>${p}%</strong></div>` }).join('') }
function rollRarity() { let total = DROP.reduce((s, x) => s + x[1], 0), r = Math.random() * total; for (let [id, p] of DROP) { r -= p; if (r <= 0) return id } return DROP[0][0] }
function rollGacha(n) { let res = []; for (let i = 0; i < n; i++) { let rid = rollRarity(); let pool = db.cards.filter(c => (c.types || []).includes('Gacha') && c.rarity === rid); if (!pool.length) pool = db.cards.filter(c => (c.types || []).includes('Gacha') && c.rarityGroup === rid); if (pool.length) res.push(pool[Math.floor(Math.random() * pool.length)]) } $('simResults').innerHTML = res.map(cardHTML).join(''); $('simResults').querySelectorAll('.card').forEach(e => e.onclick = () => openModal(db.cards.find(c => String(c.number) === e.dataset.number))) }
load().catch(err => { console.error(err); document.body.innerHTML = `<main style="padding:30px;color:white;font-family:sans-serif"><h1>Hiba</h1><p>${esc(err.message)}</p></main>` });

from pathlib import Path

snippet = r"""/* GaCherry homepage news section
   Beillesztés: app.js legvégére, a load().catch(...) sor után.
   Szerkesztés: a NEWS_ITEMS tömbben írd át a híreket.
*/

const NEWS_ITEMS = [
    {
        icon: '✨',
        type: 'Update',
        date: '2026.07.05',
        title: 'Hírek rész a főoldalon',
        text: 'A főoldal kapott egy külön hírek blokkot, ahova update, event, redeem vagy bármilyen fontos GaCherry infó kerülhet.'
    },
    {
        icon: '🎉',
        type: 'Event',
        date: 'Hamarosan',
        title: 'Event bejelentések helye',
        text: 'Ide jöhetnek a limitált kártyák, szezonális események, új nyitások vagy külön Discord programok.'
    },
    {
        icon: '📌',
        type: 'Info',
        date: 'Mindig aktuális',
        title: 'Fontos infók egy helyen',
        text: 'Craft változások, új redeem kódok, guide frissítések vagy rendszerüzenetek is szépen kiemelhetők itt.'
    }
];

function injectNewsStyles() {
    if (document.getElementById('newsStyles')) return;

    const style = document.createElement('style');
    style.id = 'newsStyles';
    style.textContent = `
        .news-panel{margin-bottom:18px;position:relative;overflow:hidden}
        .news-panel::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,rgba(255,101,183,.18),transparent 42%);pointer-events:none}
        .news-panel>*{position:relative;z-index:1}
        .news-grid{display:grid;grid-template-columns:1.15fr .9fr .9fr;gap:14px}
        .news-card{border:1px solid var(--line);border-radius:20px;padding:18px;background:rgba(255,255,255,.055);display:flex;flex-direction:column;gap:10px;min-height:190px;box-shadow:0 16px 42px rgba(0,0,0,.12)}
        .news-card.featured{background:linear-gradient(135deg,rgba(255,101,183,.22),rgba(168,79,229,.14));border-color:rgba(255,147,212,.55)}
        .news-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .news-type{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);border-radius:999px;padding:7px 10px;font-weight:900;color:var(--pink2)}
        .news-date{color:var(--muted);font-size:13px;font-weight:800;text-align:right}
        .news-card h3{font-size:24px;margin:4px 0 0}
        .news-card p{color:var(--muted);line-height:1.55;margin:0}
        .news-footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
        .news-footer span{border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.07);font-size:12px;font-weight:900;color:var(--muted)}
        body[data-theme=light] .news-card{background:rgba(255,255,255,.72)}
        @media(max-width:1000px){.news-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
}

function insertNewsSection() {
    const home = $('homePage');
    if (!home || document.getElementById('newsSection')) return;

    injectNewsStyles();

    const section = document.createElement('section');
    section.className = 'panel news-panel';
    section.id = 'newsSection';
    section.innerHTML = `
        <div class="panel-head">
            <div>
                <span class="section-kicker">GaCherry News</span>
                <h2>Hírek</h2>
            </div>
            <small>Update · Event · Infó</small>
        </div>
        <div class="news-grid">
            ${NEWS_ITEMS.map((item, index) => `
                <article class="news-card ${index === 0 ? 'featured' : ''}">
                    <div class="news-top">
                        <span class="news-type">${esc(item.icon)} ${esc(item.type)}</span>
                        <span class="news-date">${esc(item.date)}</span>
                    </div>
                    <h3>${esc(item.title)}</h3>
                    <p>${esc(item.text)}</p>
                    <div class="news-footer"><span>GaCherry</span><span>${esc(item.type)}</span></div>
                </article>
            `).join('')}
        </div>
    `;

    const homeGrid = home.querySelector('.home-grid');
    if (homeGrid) homeGrid.insertAdjacentElement('afterend', section);
    else home.prepend(section);
}

insertNewsSection();
"""

path = Path("/mnt/data/gacherry_homepage_news_snippet.js")
path.write_text(snippet, encoding="utf-8")
path.as_posix()
