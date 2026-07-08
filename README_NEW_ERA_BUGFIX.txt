GaCherry New ERA bugfix pack

1. Replace this file in the repo root:
   new-era-loader.js

2. Upload this file to the repo root:
   new-era-mobile-fix.css

3. In index.html HEAD, after style.css, add:
   <link rel="stylesheet" href="new-era-mobile-fix.css?v=1">

4. At the bottom of index.html, change:
   <script src="new-era-loader.js?v=2"></script>

   to:
   <script src="new-era-loader.js?v=3"></script>

What it fixes:
- Echo Bloom uses the existing local icon: data/Currency/echobloom.webp
- New ERA Sell / Buy / Stock / Max/User show ? instead of raw URLs or temporary numbers
- Mobile modal images no longer overflow
- Long text values inside modal details wrap instead of pushing outside the card
