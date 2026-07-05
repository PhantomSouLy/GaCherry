GaCherry Rebuild csomag

Tartalom:
- index.html: teljes új oldalstruktúra
- style.css: teljes design, új Hírek blokk, új Gacha Simulator animáció
- app.js: teljes új működés, javított kattintások, craft preview resolver
- data/news.json: szerkeszthető hírek
- assets/: üres asset mappák későbbi ikonoknak/képeknek

Beépítés:
1. A GitHub repóban először javítsd/töröld a törött app.js Python részét, vagy egyszerűen cseréld le az app.js-t erre.
2. Cseréld le az index.html-t, style.css-t és app.js-t a csomagban lévő fájlokra.
3. A data/news.json fájlt másold be a repó data mappájába.
4. A meglévő data/cards.json és data/guide.json maradjon meg, különben nem lesz kártyaadat.
5. GitHub Pages frissítés után Ctrl+F5.

Javítások:
- Gacha Simulatorból kikerült a drop rate lista.
- Simulator középre rendezve, gacha orb animációval és reveal effekttel.
- Craft preview javítva: LVL 1 / [LVL1] / 1x LVL 1 névvariációkat is próbálja feloldani.
- Discord gomb kapott ikont.
- Twitch gomb bekerült a felső gombsorba.
- Hírek rész külön data/news.json-ból töltődik.
