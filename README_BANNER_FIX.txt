Banner fix:
- A csomag tartalmazza: assets/images/banner.png
- A hero most ezt használja háttérként.
- background-size: contain, ezért a banner nem lesz levágva/kilógva.
- A beépített hero szöveg el van rejtve, mert a banner már tartalmazza a GaCherry feliratot.
- A Gacha Simulator orb közepéből ki lett véve a virág emoji.

Ha mégis teljes szélességet akarsz crop-pal:
style.css -> .hero background sorban cseréld: center/contain -> center/cover
