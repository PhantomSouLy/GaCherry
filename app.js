// ==========================
// TEST CARDS
// ==========================

const cards = [

{
    name: "Cookie",
    rarity: "Common",
    image: "https://placehold.co/400x600/4caf50/ffffff?text=Cookie",
    tags: ["Food"],
    description: "A simple cookie."
},

{
    name: "Casual Cherry",
    rarity: "Rare",
    image: "https://placehold.co/400x600/2196f3/ffffff?text=Casual+Cherry",
    tags: ["Cherry"],
    description: "A casual Cherry outfit."
},

{
    name: "Mage Cherry",
    rarity: "Epic",
    image: "https://placehold.co/400x600/9c27b0/ffffff?text=Mage+Cherry",
    tags: ["Cherry"],
    description: "A magical Cherry skin."
},

{
    name: "Angel Cherry",
    rarity: "Legendary",
    image: "https://placehold.co/400x600/ff9800/ffffff?text=Angel+Cherry",
    tags: ["Event"],
    description: "A legendary angelic Cherry."
},

{
    name: "Bunny Goddess",
    rarity: "Mythical",
    image: "https://placehold.co/400x600/f5f5f5/000000?text=Bunny+Goddess",
    tags: ["Limited"],
    description: "A mythical bunny goddess."
},

{
    name: "Dedicated by Cherry",
    rarity: "Legendary",
    image: "https://placehold.co/400x600/ff9800/ffffff?text=Dedicated",
    tags: ["Dedicated"],
    description: "A special dedicated card."
}

];

// ==========================
// PAGE SYSTEM
// ==========================

const pages =
document.querySelectorAll(".page");

function showPage(pageId){

pages.forEach(page => {

page.classList.remove("active");

});

document
.getElementById(pageId)
.classList.add("active");

window.scrollTo({
top:0,
behavior:"smooth"
});

}

// ==========================
// MENU BUTTONS
// ==========================

document
.querySelectorAll(".menu-card")
.forEach(button => {

button.addEventListener("click", () => {

const target =
button.dataset.page;

showPage(target);

});

});

// ==========================
// BACK BUTTONS
// ==========================

document
.querySelectorAll(".back-btn")
.forEach(button => {

button.addEventListener("click", () => {

showPage("home");

});

});

// ==========================
// CARD GALLERY
// ==========================

const gallery =
document.getElementById("cardGallery");

function renderCards(cardList){

gallery.innerHTML = "";

cardList.forEach(card => {

const cardElement =
document.createElement("div");

cardElement.className = "card";

cardElement.innerHTML = `

<img src="${card.image}" alt="${card.name}">

<div class="card-info">

<div class="card-name">
${card.name}
</div>

<div class="card-rarity">
${card.rarity}
</div>

</div>

`;

cardElement.addEventListener("click", () => {

openModal(card);

});

gallery.appendChild(cardElement);

});

}

renderCards(cards);

// ==========================
// SEARCH
// ==========================

const searchInput =
document.getElementById("searchInput");

searchInput.addEventListener("input", () => {

const value =
searchInput.value.toLowerCase();

const filtered =
cards.filter(card =>

card.name
.toLowerCase()
.includes(value)

);

renderCards(filtered);

});

// ==========================
// MODAL
// ==========================

const modal =
document.getElementById("cardModal");

const modalImage =
document.getElementById("modalImage");

const modalTitle =
document.getElementById("modalTitle");

const modalRarity =
document.getElementById("modalRarity");

const modalTags =
document.getElementById("modalTags");

const modalDescription =
document.getElementById("modalDescription");

function openModal(card){

modal.style.display = "flex";

modalImage.src = card.image;

modalTitle.textContent =
card.name;

modalRarity.textContent =
card.rarity;

modalDescription.textContent =
card.description;

modalTags.innerHTML = "";

card.tags.forEach(tag => {

const badge =
document.createElement("span");

badge.style.background =
"#ff73c8";

badge.style.padding =
"6px 10px";

badge.style.borderRadius =
"999px";

badge.style.fontSize =
"12px";

badge.textContent = tag;

modalTags.appendChild(badge);

});

}

document
.getElementById("closeModal")
.addEventListener("click", () => {

modal.style.display = "none";

});

modal.addEventListener("click", e => {

if(e.target === modal){

modal.style.display = "none";

}

});

// ==========================
// START PAGE
// ==========================

showPage("home");
