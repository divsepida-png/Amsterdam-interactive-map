# Amsterdam Interactive Map — current published build

Status: corrected direct build published

Edition: high-contrast MapLibre vector V2

HTTPS URL: https://rawcdn.githack.com/divsepida-png/Amsterdam-interactive-map/d344c04b4b253a5f61033982d85dcfe44aa07d65/index.html

Direct-build checks:

- `index.html` is the real application shell rather than a document-replacement loading screen
- MapLibre has jsDelivr and unpkg delivery fallbacks
- `styles.css`, `data.js` and `app.js` are present in the same immutable commit
- all seven verified compressed application parts are present
- `app.js` validates the map source before execution
- the application startup wrapper is patched so it works even after the browser load event
- the prepared map source contains MapLibre, waypoint, distance and live `watchPosition()` tracking logic

Corrected: 2026-07-27

Site commit: d344c04b4b253a5f61033982d85dcfe44aa07d65
