const DATA_URL = "data/cards.json";
const DEFAULT_ASSET_BASE = "https://cdn.jsdelivr.net/gh/PhantomSouLy/GaCherry-Assets@main/";

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Relic", "Cherished", "Mythical", "Eternity", "Unknown"];
const rarityIcon = { Common:"✿", Uncommon:"✦", Rare:"✦", Epic:"✦", Legendary:"♛", Relic:"✹", Cherished:"♥", Mythical:"✦", Eternity:"✦", Unknown:"?" };

let rawData = null;
let cards = [];
let assetBase = DEFAULT_ASSET_BASE;
let activeView = "collection";
let activeRarity = "All";
let activeSource = "All";
let activeTag = "All";
let currentPage = 1;
let pageSize = 60;
let compactMode = false;
let selectedCard = null;

const stateKey = "gacherry_collection_state_v1";
let userState = loadState();

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const els = {
  ownedCount: $("#ownedCount"), totalCount: $("#totalCount"), progressBar: $("#progressBar"), progressPercent: $("#progressPercent"), nextMilestone: $("#nextMilestone"),
  miniProgressPercent: $("#miniProgressPercent"), miniProgressBar: $("#miniProgressBar"), miniProgressText: $("#miniProgressText"), rarityPanelTotal: $("#rarityPanelTotal"), rarityStatsGrid: $("#rarityStatsGrid"),
  searchInput: $("#searchInput"), clearSearch: $("#clearSearch"), raritySelect: $("#raritySelect"), sourceSelect: $("#sourceSelect"), tagSelect: $("#tagSelect"), sortSelect: $("#sortSelect"),
  quickRarityFilters: $("#quickRarityFilters"), quickSourceFilters: $("#quickSourceFilters"), cardGrid: $("#cardGrid"), resultCount: $("#resultCount"), emptyState: $("#emptyState"), viewTitle: $("#viewTitle"),
  prevPage: $("#prevPage"), nextPage: $("#nextPage"), pageNumbers: $("#pageNumbers"), pageSizeSelect: $("#pageSizeSelect"), gridViewBtn: $("#gridViewBtn"), compactViewBtn: $("#compactViewBtn"),
  missingGrid: $("#missingGrid"), favoriteGrid: $("#favoriteGrid"), setList: $("#setList"), statsDetail: $("#statsDetail"),
  modal: $("#cardModal"), closeModal: $("#closeModal"), modalImage: $("#modalImage"), modalImageWrap: $("#modalImageWrap"), modalId: $("#modalId"), modalRarity: $("#modalRarity"), modalName: $("#modalName"), modalDescription: $("#modalDescription"), modalSource: $("#modalSource"), modalCategory: $("#modalCategory"), modalSeries: $("#modalSeries"), modalEvent: $("#modalEvent"), modalTags: $("#modalTags"), toggleFavorite: $("#toggleFavorite"), toggleOwned: $("#toggleOwned"), openAsset: $("#openAsset"),
  resetStateBtn: $("#resetStateBtn"), favoritesTopBtn: $("#favoritesTopBtn")
};

function loadState(){
  try { return JSON.parse(localStorage.getItem(stateKey)) || { missing: [], favorites: [] }; }
  catch { return { missing: [], favorites: [] }; }
}
function saveState(){ localStorage.setItem(stateKey, JSON.stringify(userState)); }
function isMissing(card){ return userState.missing.includes(card.id); }
function isOwned(card){ return !isMissing(card); }
function isFavorite(card){ return userState.favorites.includes(card.id); }
function toggleList(list, id){
  const arr = userState[list];
  const idx = arr.indexOf(id);
  if(idx >= 0) arr.splice(idx, 1); else arr.push(id);
  saveState();
}

function rarityClass(rarity){ return String(rarity || "Unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
function rarityRank(rarity){ const i = rarityOrder.indexOf(rarity); return i === -1 ? 999 : i; }
function assetUrl(card){
  if(card.image && /^https?:\/\//i.test(card.image)) return card.image;
  return assetBase + encodeURI(card.asset || "").replace(/#/g, "%23");
}
function normalizeCard(card, idx){
  return {
    id: Number(card.id ?? idx + 1),
    slug: card.slug || String(card.name || `card-${idx+1}`).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    name: card.name || "Unknown Card",
    rarity: card.rarity || "Unknown",
    source: card.source || card.type || "Unknown",
    category: card.category || "Uncategorized",
    series: card.series ?? null,
    event: card.event ?? null,
    tags: Array.isArray(card.tags) ? card.tags : [],
    asset: card.asset || "",
    image: card.image || "",
    description: card.description || "",
    hidden: Boolean(card.hidden)
  };
}

async function init(){
  try{
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if(!response.ok) throw new Error(`Nem sikerült betölteni: ${DATA_URL}`);
    rawData = await response.json();
    assetBase = rawData.assetBaseUrl || DEFAULT_ASSET_BASE;
    const list = Array.isArray(rawData) ? rawData : rawData.cards;
    cards = list.map(normalizeCard).filter(card => !card.hidden);
    renderAllControls();
    bindEvents();
    render();
  }catch(error){
    console.error(error);
    els.cardGrid.innerHTML = `<div class="simple-panel glass"><h2>Nem sikerült betölteni a cards.json-t</h2><p>${error.message}</p></div>`;
  }
}

function bindEvents(){
  $$('[data-view-link]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.viewLink)));
  els.searchInput.addEventListener('input', () => { currentPage = 1; renderCollection(); });
  els.clearSearch.addEventListener('click', () => { els.searchInput.value = ""; currentPage = 1; renderCollection(); els.searchInput.focus(); });
  [els.raritySelect, els.sourceSelect, els.tagSelect, els.sortSelect].forEach(el => el.addEventListener('change', () => {
    activeRarity = els.raritySelect.value; activeSource = els.sourceSelect.value; activeTag = els.tagSelect.value; currentPage = 1; renderCollection(); updateQuickFilterState();
  }));
  els.pageSizeSelect.addEventListener('change', () => { pageSize = Number(els.pageSizeSelect.value); currentPage = 1; renderCollection(); });
  els.prevPage.addEventListener('click', () => { if(currentPage > 1){ currentPage--; renderCollection(); scrollToGrid(); }});
  els.nextPage.addEventListener('click', () => { const totalPages = Math.max(1, Math.ceil(getFilteredCards().length / pageSize)); if(currentPage < totalPages){ currentPage++; renderCollection(); scrollToGrid(); }});
  els.gridViewBtn.addEventListener('click', () => setCompact(false));
  els.compactViewBtn.addEventListener('click', () => setCompact(true));
  els.closeModal.addEventListener('click', closeModal);
  els.modal.addEventListener('click', e => { if(e.target === els.modal) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && els.modal.open) closeModal(); });
  els.toggleFavorite.addEventListener('click', () => { if(!selectedCard) return; toggleList('favorites', selectedCard.id); updateModalActions(); render(); });
  els.toggleOwned.addEventListener('click', () => { if(!selectedCard) return; toggleList('missing', selectedCard.id); updateModalActions(); render(); });
  els.resetStateBtn.addEventListener('click', () => {
    if(confirm('Biztos törlöd a kedvencek és missing állapotokat?')){ userState = { missing: [], favorites: [] }; saveState(); render(); }
  });
  els.favoritesTopBtn.addEventListener('click', () => showView('favorites'));
  $('#openCardsBtn').addEventListener('click', () => showView('collection'));
}

function setCompact(value){ compactMode = value; els.gridViewBtn.classList.toggle('active', !value); els.compactViewBtn.classList.toggle('active', value); renderCollection(); }
function scrollToGrid(){ els.cardGrid.scrollIntoView({ behavior:'smooth', block:'start' }); }

function renderAllControls(){
  const rarities = ["All", ...rarityOrder.filter(r => cards.some(c => c.rarity === r))];
  const sources = ["All", ...[...new Set(cards.map(c => c.source))].sort()];
  const tags = ["All", ...[...new Set(cards.flatMap(c => c.tags))].sort((a,b) => a.localeCompare(b, 'hu'))];
  fillSelect(els.raritySelect, rarities, 'Rarity');
  fillSelect(els.sourceSelect, sources, 'Source');
  fillSelect(els.tagSelect, tags, 'Tag');
  els.quickRarityFilters.innerHTML = rarities.map(r => `<button class="chip ${r==='All'?'active':''} ${r==='All'?'':rarityClass(r)}" data-rarity="${escapeHtml(r)}" style="--c:var(--${rarityClass(r)})">${r==='All'?'Összes':r}</button>`).join('');
  els.quickSourceFilters.innerHTML = sources.map(s => `<button class="chip ${s==='All'?'active':''}" data-source="${escapeHtml(s)}">${s==='All'?'Minden source':s}</button>`).join('');
  els.quickRarityFilters.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { activeRarity = btn.dataset.rarity; els.raritySelect.value = activeRarity; currentPage = 1; renderCollection(); updateQuickFilterState(); }));
  els.quickSourceFilters.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { activeSource = btn.dataset.source; els.sourceSelect.value = activeSource; currentPage = 1; renderCollection(); updateQuickFilterState(); }));
}
function fillSelect(select, values, label){ select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}">${value === 'All' ? `${label} (Összes)` : value}</option>`).join(''); }
function updateQuickFilterState(){
  els.quickRarityFilters.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.rarity === activeRarity));
  els.quickSourceFilters.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.source === activeSource));
}

function showView(view){
  activeView = view;
  $$('.view').forEach(el => el.classList.remove('active'));
  const target = $(`#view-${view}`) || $('#view-collection');
  target.classList.add('active');
  $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.viewLink === view));
  if(view === 'missing') renderCardGrid(els.missingGrid, cards.filter(isMissing));
  if(view === 'favorites') renderCardGrid(els.favoriteGrid, cards.filter(isFavorite));
  if(view === 'sets') renderSets();
  if(view === 'stats') renderStatsDetail();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function render(){
  renderDashboard();
  renderCollection();
  if(activeView === 'missing') renderCardGrid(els.missingGrid, cards.filter(isMissing));
  if(activeView === 'favorites') renderCardGrid(els.favoriteGrid, cards.filter(isFavorite));
  if(activeView === 'stats') renderStatsDetail();
}

function renderDashboard(){
  const total = cards.length;
  const owned = cards.filter(isOwned).length;
  const percent = total ? Math.round((owned / total) * 1000) / 10 : 0;
  els.ownedCount.textContent = owned;
  els.totalCount.textContent = total;
  els.progressBar.style.width = `${percent}%`;
  els.progressPercent.textContent = `${percent}%`;
  els.miniProgressPercent.textContent = `${percent}%`;
  els.miniProgressBar.style.width = `${percent}%`;
  els.miniProgressText.textContent = `${owned} / ${total} kártya`;
  const milestone = Math.min(total, Math.ceil((owned + 1) / 50) * 50);
  els.nextMilestone.textContent = owned >= total ? 'Teljes kollekció kész!' : `Következő mérföldkő: ${milestone} kártya`;
  els.rarityPanelTotal.textContent = `${owned} / ${total}`;
  els.rarityStatsGrid.innerHTML = rarityOrder.filter(r => cards.some(c => c.rarity === r)).map(rarity => {
    const all = cards.filter(c => c.rarity === rarity);
    const have = all.filter(isOwned).length;
    const p = all.length ? Math.round((have / all.length) * 1000) / 10 : 0;
    return `<article class="rarity-stat ${rarityClass(rarity)}" style="--c:var(--${rarityClass(rarity)})"><strong>${rarityIcon[rarity] || '✦'} ${rarity}</strong><small>${have} / ${all.length}</small><b>${p}%</b></article>`;
  }).join('');
}

function getFilteredCards(){
  const q = els.searchInput.value.trim().toLowerCase();
  let filtered = cards.filter(card => {
    const text = [card.name, card.rarity, card.source, card.category, card.series, card.event, card.description, ...card.tags].filter(Boolean).join(' ').toLowerCase();
    return (!q || text.includes(q)) &&
      (activeRarity === 'All' || card.rarity === activeRarity) &&
      (activeSource === 'All' || card.source === activeSource) &&
      (activeTag === 'All' || card.tags.includes(activeTag));
  });
  const sort = els.sortSelect.value;
  filtered.sort((a,b) => {
    if(sort === 'name-asc') return a.name.localeCompare(b.name, 'hu');
    if(sort === 'name-desc') return b.name.localeCompare(a.name, 'hu');
    if(sort === 'rarity-desc') return rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name, 'hu');
    if(sort === 'rarity-asc') return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name, 'hu');
    if(sort === 'id-desc') return b.id - a.id;
    return a.id - b.id;
  });
  return filtered;
}

function renderCollection(){
  const filtered = getFilteredCards();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  els.resultCount.textContent = `${filtered.length} kártya`;
  els.emptyState.style.display = filtered.length ? 'none' : 'block';
  els.cardGrid.classList.toggle('compact', compactMode);
  renderCardGrid(els.cardGrid, pageItems);
  renderPagination(totalPages);
}

function renderCardGrid(container, list){
  if(!list.length){ container.innerHTML = ''; return; }
  container.innerHTML = list.map(cardTemplate).join('');
  container.querySelectorAll('.g-card').forEach(el => {
    el.addEventListener('click', () => openModal(cards.find(c => c.id === Number(el.dataset.id))));
    const img = el.querySelector('img');
    if(img.complete && img.naturalWidth) img.classList.add('loaded');
    img.addEventListener('load', () => img.classList.add('loaded'), { once:true });
    img.addEventListener('error', () => el.classList.add('image-error'), { once:true });
  });
}

function cardTemplate(card){
  const cls = rarityClass(card.rarity);
  const owned = isOwned(card);
  const fav = isFavorite(card);
  const url = assetUrl(card);
  return `<article class="g-card ${cls} ${owned ? '' : 'missing'}" data-id="${card.id}" style="--c:var(--${cls})">
    <div class="card-badges"><span class="owned-badge ${owned ? 'owned' : ''}">${owned ? '✓' : '🔒'}</span><span class="fav-badge ${fav ? 'active' : ''}">${fav ? '♥' : '♡'}</span></div>
    <div class="image-shell"><div class="image-placeholder"><span>${escapeHtml(shortName(card.name))}</span></div><img loading="lazy" src="${url}" alt="${escapeHtml(card.name)}"></div>
    <footer class="card-footer"><span class="rarity-label">${escapeHtml(card.rarity)}</span><strong>${escapeHtml(card.name)}</strong></footer>
  </article>`;
}

function renderPagination(totalPages){
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages;
  const pages = getVisiblePages(currentPage, totalPages);
  els.pageNumbers.innerHTML = pages.map(p => p === '…' ? `<span class="page-num dots">…</span>` : `<button class="page-num ${p===currentPage?'active':''}" data-page="${p}">${p}</button>`).join('');
  els.pageNumbers.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); renderCollection(); scrollToGrid(); }));
}
function getVisiblePages(current, total){
  if(total <= 7) return Array.from({ length: total }, (_,i) => i+1);
  const set = new Set([1,total,current,current-1,current+1]);
  const arr = [...set].filter(n => n>=1 && n<=total).sort((a,b)=>a-b);
  return arr.flatMap((n,i) => i && n - arr[i-1] > 1 ? ['…', n] : [n]);
}

function openModal(card){
  if(!card) return;
  selectedCard = card;
  const cls = rarityClass(card.rarity);
  els.modalImage.classList.remove('loaded');
  els.modalImageWrap.className = `modal-image-wrap ${cls}`;
  els.modalImageWrap.style.setProperty('--modal-c', `var(--${cls})`);
  els.modalId.textContent = `#${String(card.id).padStart(3,'0')}`;
  els.modalRarity.textContent = card.rarity;
  els.modalRarity.className = `rarity-pill ${cls}`;
  els.modalName.textContent = card.name;
  els.modalDescription.textContent = card.description || 'Nincs leírás megadva.';
  els.modalSource.textContent = card.source || '-';
  els.modalCategory.textContent = card.category || 'Uncategorized';
  els.modalSeries.textContent = card.series || '-';
  els.modalEvent.textContent = card.event || '-';
  els.modalTags.innerHTML = card.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('') || '<span>Nincs tag</span>';
  const url = assetUrl(card);
  els.modalImage.src = url;
  els.modalImage.alt = card.name;
  els.openAsset.href = url;
  if(els.modalImage.complete && els.modalImage.naturalWidth) els.modalImage.classList.add('loaded');
  els.modalImage.onload = () => els.modalImage.classList.add('loaded');
  updateModalActions();
  els.modal.showModal();
}
function closeModal(){ els.modal.close(); selectedCard = null; }
function updateModalActions(){
  if(!selectedCard) return;
  els.toggleFavorite.textContent = isFavorite(selectedCard) ? '♥ Kedvencből ki' : '♡ Kedvenc';
  els.toggleOwned.textContent = isMissing(selectedCard) ? '✓ Megvan' : '🎁 Missing';
}

function renderSets(){
  const series = groupBy(cards, c => c.series || 'Original / Uncategorized');
  els.setList.innerHTML = Object.entries(series).sort((a,b)=>b[1].length-a[1].length).map(([name,list]) => `<div class="set-tile"><strong>${escapeHtml(name)}</strong><p>${list.filter(isOwned).length} / ${list.length} kártya</p></div>`).join('');
}
function renderStatsDetail(){
  const rarity = groupBy(cards, c => c.rarity);
  const source = groupBy(cards, c => c.source);
  els.statsDetail.innerHTML = [...Object.entries(rarity), ...Object.entries(source)].map(([name,list]) => `<div class="stat-tile"><strong>${escapeHtml(name)}</strong><p>${list.filter(isOwned).length} / ${list.length}</p></div>`).join('');
}
function groupBy(list, getKey){ return list.reduce((acc,item) => { const key = getKey(item) || 'Unknown'; (acc[key] ||= []).push(item); return acc; }, {}); }
function shortName(name){ return String(name).replace(/\[[^\]]+\]/g,'').trim().split(/\s+/).slice(0,2).join(' ') || 'GaCherry'; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

init();
