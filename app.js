const state = {
  data: null,
  cards: [],
  filtered: [],
  view: "collection",
  rarity: "All",
  source: "All",
  tag: "All",
  query: "",
  sort: "default",
  page: 1,
  pageSize: 60,
  largeGrid: true,
  owned: new Set(JSON.parse(localStorage.getItem("gacherry_owned") || "[]")),
  favs: new Set(JSON.parse(localStorage.getItem("gacherry_favs") || "[]")),
  activeCard: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const rarityOrder = ["Common","Uncommon","Rare","Epic","Legendary","Relic","Cherished","Mythical","Eternity","Unknown"];
const rarityIcon = {Common:"✿",Uncommon:"★",Rare:"✦",Epic:"✧",Legendary:"♛",Relic:"✸",Cherished:"♥",Mythical:"✽",Eternity:"✹",Unknown:"?"};
const rarityClass = r => `rarity-${String(r || "Unknown").toLowerCase()}`;
const saveOwned = () => localStorage.setItem("gacherry_owned", JSON.stringify([...state.owned]));
const saveFavs = () => localStorage.setItem("gacherry_favs", JSON.stringify([...state.favs]));
const cardId = card => String(card.id ?? card.slug ?? card.name);
const assetUrl = card => {
  if (!card) return "";
  if (card.image && /^https?:/.test(card.image)) return card.image;
  const base = state.data?.assetBaseUrl || "https://cdn.jsdelivr.net/gh/PhantomSouLy/GaCherry-Assets@main/";
  return base + String(card.asset || "").replace(/^\/+/, "");
};

function countBy(items, keyFn){
  return items.reduce((acc,item)=>{const k=keyFn(item)||"Unknown"; acc[k]=(acc[k]||0)+1; return acc;},{});
}

async function init(){
  try {
    const res = await fetch("data/cards.json", {cache:"no-store"});
    if(!res.ok) throw new Error("cards.json nem tölthető be");
    state.data = await res.json();
    state.cards = (state.data.cards || []).filter(c => !c.hidden);
    buildControls();
    bindEvents();
    applyFilters();
    renderAllStats();
  } catch(err){
    $("#gallery").innerHTML = `<div class="empty-state" style="display:block">Hiba: ${err.message}</div>`;
    console.error(err);
  }
}

function buildControls(){
  const rarities = ["All", ...rarityOrder.filter(r => state.cards.some(c => c.rarity === r))];
  const sources = ["All", ...Object.keys(countBy(state.cards, c => c.source)).sort()];
  const tags = ["All", ...[...new Set(state.cards.flatMap(c => c.tags || []))].sort((a,b)=>a.localeCompare(b,"hu"))];

  $("#raritySelect").innerHTML = rarities.map(r => `<option value="${r}">${r === "All" ? "Rarity (Összes)" : r}</option>`).join("");
  $("#sourceSelect").innerHTML = sources.map(s => `<option value="${s}">${s === "All" ? "Source (Összes)" : s}</option>`).join("");
  $("#tagSelect").innerHTML = tags.map(t => `<option value="${t}">${t === "All" ? "Tag (Összes)" : t}</option>`).join("");

  $("#quickFilters").innerHTML = rarities.map(r => `<button class="pill ${r==='All'?'active':''}" data-rarity="${r}">${r === "All" ? "Összes" : r}</button>`).join("");
  $("#sourceFilters").innerHTML = sources.filter(s=>s!=="All").map(s => `<button class="pill" data-source="${s}">${s}</button>`).join("");
}

function bindEvents(){
  $("#searchInput").addEventListener("input", e => {state.query = e.target.value.trim().toLowerCase(); state.page=1; applyFilters();});
  $("#clearSearch").addEventListener("click", () => {$("#searchInput").value=""; state.query=""; state.page=1; applyFilters();});
  $("#raritySelect").addEventListener("change", e => setRarity(e.target.value));
  $("#sourceSelect").addEventListener("change", e => {state.source=e.target.value; state.page=1; applyFilters();});
  $("#tagSelect").addEventListener("change", e => {state.tag=e.target.value; state.page=1; applyFilters();});
  $("#sortSelect").addEventListener("change", e => {state.sort=e.target.value; applyFilters();});
  $("#pageSize").addEventListener("change", e => {state.pageSize=Number(e.target.value); state.page=1; renderGallery();});
  $("#prevPage").addEventListener("click", () => {if(state.page>1){state.page--; renderGallery();}});
  $("#nextPage").addEventListener("click", () => {const max=Math.ceil(state.filtered.length/state.pageSize); if(state.page<max){state.page++; renderGallery();}});
  $("#gridSmall").addEventListener("click", () => {state.largeGrid=false; $("#gallery").classList.remove("large"); $("#gridSmall").classList.add("active"); $("#gridLarge").classList.remove("active");});
  $("#gridLarge").addEventListener("click", () => {state.largeGrid=true; $("#gallery").classList.add("large"); $("#gridLarge").classList.add("active"); $("#gridSmall").classList.remove("active");});
  $("#markVisibleOwned").addEventListener("click", () => {state.filtered.slice((state.page-1)*state.pageSize,state.page*state.pageSize).forEach(c=>state.owned.add(cardId(c))); saveOwned(); renderAllStats(); renderGallery();});
  $("#resetOwned").addEventListener("click", () => {if(confirm("Biztos törlöd a megjelölt kártyákat és kedvenceket?")){state.owned.clear();state.favs.clear();saveOwned();saveFavs();renderAllStats();applyFilters();}});
  $$(".nav-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.querySelector("[data-open-guide]").addEventListener("click", () => setView("guide"));
  $("#closeModal").addEventListener("click", () => $("#cardModal").close());
  $("#toggleOwnedModal").addEventListener("click", () => toggleOwned(state.activeCard));
  $("#toggleFavModal").addEventListener("click", () => toggleFav(state.activeCard));
  $("#cardModal").addEventListener("click", e => { if(e.target.id === "cardModal") $("#cardModal").close(); });
}

function setRarity(rarity){
  state.rarity = rarity; state.page=1;
  $("#raritySelect").value = rarity;
  $$("[data-rarity]").forEach(b => b.classList.toggle("active", b.dataset.rarity === rarity));
  applyFilters();
}

function setView(view){
  state.view = view;
  $$(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view === view));
  $$(".content-view").forEach(v=>v.classList.remove("active"));
  if(view === "stats") {$("#statsView").classList.add("active"); $("#pageTitle").textContent="📊 Stats";}
  else if(view === "guide") {$("#guideView").classList.add("active"); $("#pageTitle").textContent="📖 Guide";}
  else {$("#collectionView").classList.add("active"); $("#pageTitle").textContent = view === "missing" ? "🎁 Missing" : view === "favorites" ? "♡ Favorites" : "✦ Collection"; state.page=1; applyFilters();}
  $("#pageSubtitle").textContent = view === "missing" ? "Kártyák, amiket még nem jelöltél meg." : view === "favorites" ? "Kedvenc kártyáid." : "Gyűjtsd össze az összes Cherry kártyát!";
}

function applyFilters(){
  let list = [...state.cards];
  if(state.view === "missing") list = list.filter(c => !state.owned.has(cardId(c)));
  if(state.view === "favorites") list = list.filter(c => state.favs.has(cardId(c)));
  if(state.rarity !== "All") list = list.filter(c => c.rarity === state.rarity);
  if(state.source !== "All") list = list.filter(c => c.source === state.source);
  if(state.tag !== "All") list = list.filter(c => (c.tags || []).includes(state.tag));
  if(state.query){
    list = list.filter(c => [c.name,c.rarity,c.source,c.category,c.series,c.event,c.description,...(c.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(state.query));
  }
  list.sort(sortCards);
  state.filtered = list;
  renderGallery();
}

function sortCards(a,b){
  if(state.sort === "name") return a.name.localeCompare(b.name,"hu");
  if(state.sort === "rarity") return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity) || a.name.localeCompare(b.name,"hu");
  if(state.sort === "owned") return Number(state.owned.has(cardId(b))) - Number(state.owned.has(cardId(a)));
  if(state.sort === "missing") return Number(state.owned.has(cardId(a))) - Number(state.owned.has(cardId(b)));
  return (a.id || 0) - (b.id || 0);
}

function renderGallery(){
  const start = (state.page-1)*state.pageSize;
  const visible = state.filtered.slice(start,start+state.pageSize);
  $("#resultCount").textContent = `${state.filtered.length} kártya`;
  $("#emptyState").style.display = visible.length ? "none" : "block";
  const gallery = $("#gallery");
  gallery.classList.toggle("large", state.largeGrid);
  gallery.innerHTML = visible.map(cardTemplate).join("");
  gallery.querySelectorAll("img[data-src]").forEach(img => {
    img.onload = () => img.closest(".card")?.classList.add("loaded");
    img.onerror = () => img.closest(".card")?.classList.add("load-error");
    img.src = img.dataset.src;
  });
  gallery.querySelectorAll(".card").forEach(el => el.addEventListener("click", e => {
    if(e.target.closest("button")) return;
    openModal(state.cards.find(c => cardId(c) === el.dataset.id));
  }));
  gallery.querySelectorAll(".owned-toggle").forEach(btn => btn.addEventListener("click", () => toggleOwned(state.cards.find(c => cardId(c) === btn.dataset.id))));
  gallery.querySelectorAll(".fav-toggle").forEach(btn => btn.addEventListener("click", () => toggleFav(state.cards.find(c => cardId(c) === btn.dataset.id))));
  renderPagination();
}

function cardTemplate(card){
  const id = cardId(card); const owned = state.owned.has(id); const fav = state.favs.has(id);
  const r = card.rarity || "Unknown";
  return `<article class="card ${rarityClass(r)}" data-id="${escapeHtml(id)}">
    <div class="image-box">
      <div class="placeholder" style="background:${rarityColor(r)}">${escapeHtml(card.name)}</div>
      <img data-src="${assetUrl(card)}" alt="${escapeHtml(card.name)}" loading="lazy">
      ${owned ? "" : `<div class="lock">🔒</div>`}
      <button class="fav-toggle ${fav?'faved':''}" data-id="${escapeHtml(id)}">♡</button>
      <button class="owned-toggle ${owned?'owned':''}" data-id="${escapeHtml(id)}">✓</button>
    </div>
    <div class="card-footer">
      <div class="meta"><span class="rarity-chip">${rarityIcon[r]||"✦"} ${escapeHtml(r)}</span><span class="source-chip">${escapeHtml(card.source||"-")}</span></div>
      <b>${escapeHtml(card.name)}</b>
    </div>
  </article>`;
}

function renderPagination(){
  const max = Math.max(1, Math.ceil(state.filtered.length/state.pageSize));
  state.page = Math.min(state.page, max);
  $("#prevPage").disabled = state.page <= 1;
  $("#nextPage").disabled = state.page >= max;
  const nums = [];
  for(let i=1;i<=max;i++) if(i===1 || i===max || Math.abs(i-state.page)<=2) nums.push(i); else if(nums.at(-1)!=="...") nums.push("...");
  $("#pageButtons").innerHTML = nums.map(n => n === "..." ? `<span>...</span>` : `<button class="${n===state.page?'active':''}" data-page="${n}">${n}</button>`).join("");
  $("#pageButtons").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {state.page=Number(b.dataset.page); renderGallery(); window.scrollTo({top:0,behavior:"smooth"});}));
}

function renderAllStats(){
  const total = state.cards.length;
  const owned = state.cards.filter(c => state.owned.has(cardId(c))).length;
  const pct = total ? Math.round((owned/total)*1000)/10 : 0;
  $("#ownedCount").textContent = owned; $("#totalCount").textContent = total; $("#progressPercent").textContent = `${pct}%`;
  $("#mainProgress").style.width = `${pct}%`; $("#sidebarProgress").style.width = `${pct}%`; $("#sidebarProgressText").textContent = `${owned} / ${total}`;
  const milestones = [50,100,150,200,300,450,600,750,1000];
  const next = milestones.find(m => m > owned);
  $("#nextMilestone").textContent = next ? `Következő mérföldkő: ${next} kártya` : "Minden mérföldkő kész!";

  const totalByRarity = countBy(state.cards, c=>c.rarity);
  const ownedByRarity = countBy(state.cards.filter(c=>state.owned.has(cardId(c))), c=>c.rarity);
  $("#rarityStats").innerHTML = rarityOrder.filter(r=>totalByRarity[r]).map(r=>{
    const t=totalByRarity[r]||0,o=ownedByRarity[r]||0,p=t?Math.round(o/t*100):0;
    return `<div class="rarity-stat"><b style="color:${rarityColor(r)}">${rarityIcon[r]||"✦"} ${r}</b><small>${o} / ${t}</small><em style="color:${rarityColor(r)}">${p}%</em></div>`;
  }).join("");
  renderStatsDetails(totalByRarity, ownedByRarity);
}

function renderStatsDetails(totalByRarity, ownedByRarity){
  const sourceStats = countBy(state.cards, c=>c.source);
  const categoryStats = countBy(state.cards, c=>c.category);
  $("#statsDetails").innerHTML = [
    ["Rarity", totalByRarity], ["Source", sourceStats], ["Category", categoryStats]
  ].map(([title,obj]) => `<div class="stat-box"><h3>${title}</h3>${Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<p>${escapeHtml(k)}: <b>${v}</b>${ownedByRarity[k]!==undefined?` <small>(${ownedByRarity[k]} megvan)</small>`:""}</p>`).join("")}</div>`).join("");
}

function openModal(card){
  if(!card) return;
  state.activeCard = card;
  const r = card.rarity || "Unknown";
  $("#modalName").textContent = card.name;
  $("#modalDesc").textContent = card.description || "Nincs leírás megadva.";
  $("#modalRarity").textContent = `${rarityIcon[r]||"✦"} ${r}`;
  $("#modalSource").textContent = card.source || "-";
  $("#modalTags").innerHTML = (card.tags || []).map(t=>`<span>${escapeHtml(t)}</span>`).join("");
  $("#modalPlaceholder").style.background = rarityColor(r);
  const img = $("#modalImage"); img.classList.remove("loaded"); img.onload=()=>img.classList.add("loaded"); img.src = assetUrl(card); img.alt = card.name;
  updateModalButtons();
  $("#cardModal").showModal();
}

function toggleOwned(card){
  if(!card) return; const id=cardId(card);
  state.owned.has(id) ? state.owned.delete(id) : state.owned.add(id);
  saveOwned(); renderAllStats(); applyFilters(); updateModalButtons();
}
function toggleFav(card){
  if(!card) return; const id=cardId(card);
  state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id);
  saveFavs(); applyFilters(); updateModalButtons();
}
function updateModalButtons(){
  const card=state.activeCard; if(!card) return; const id=cardId(card);
  $("#toggleOwnedModal").textContent = state.owned.has(id) ? "✓ Megvan" : "Megjelölöm";
  $("#toggleFavModal").textContent = state.favs.has(id) ? "♥ Kedvenc" : "♡ Kedvenc";
}
function rarityColor(r){return getComputedStyle(document.documentElement).getPropertyValue(`--${String(r||"unknown").toLowerCase()}`).trim() || "#6b7280";}
function escapeHtml(str){return String(str ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}

init();
