GaCherry New ERA patch

GitHubban ezt tedd:

1. Töltsd fel ezt:
   data/new-era.json

2. Töltsd fel ezt a fő mappába:
   new-era-loader.js

3. Az index.html alján ezt:

   <script src="app.js"></script>

   cseréld erre:

   <script src="app.js"></script>
   <script src="new-era-loader.js?v=1"></script>

Mit csinál:
- Nem írja át a data/cards.json fájlt.
- Betölti a Wuthering Waves × Cherry New ERA adatokat külön data/new-era.json fájlból.
- Hozzáadja a 3 új rarityt:
  - Resonance
  - Forte
  - Awakened
- Hozzáadja az Echo Bloom currencyt.
- Hozzáadja a 44 új kártyát 660-as sorszámtól.
- A képeket közvetlenül a GaCherry-Assets repóból tölti.
