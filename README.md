# Amsterdam Interactive Map — Semantic Buildings V4

A mobile-first Amsterdam visitor map designed for fast visual recognition on Android Chrome.

## Open the V4 release

https://cdn.githubraw.com/divsepida-png/Amsterdam-interactive-map/384f4e2ff304aee1b2f598b152c4d1abc13b3395/index.html

## Visual hierarchy

- 98 fixed-size semantic category badges remain visible throughout the permitted city zoom range
- 15 major landmarks use enlarged badges and dominant abstract building plots
- minor landmarks remain smaller but clearly visible
- street zoom reveals address-centred coloured building plots
- normal museums and galleries use cyan
- activities and attractions use orange
- parks, gardens and the zoo use green
- markets and shopping activities use amber
- historic and religious places use brown
- strong-value cuisine uses yellow cuisine codes
- cannabis coffeeshops use green C badges
- smartshops use pink T badges
- adult museums, shops and shows use distinct purple, magenta and orange 18+ badges
- red-light and blue-light frontage references use thick high-contrast lines, repeated plot blocks and R/B badges

## Mobile architecture

- Leaflet canvas overlays rather than WebGL
- ordinary static HTML, CSS and JavaScript
- no compressed bootstrap, runtime reconstruction, document rewriting or eval
- zoom and tile-fade animations disabled
- portrait bottom control dock and landscape side dock
- fallback links to Google Maps and OpenStreetMap if both Leaflet mirrors fail

## Verification

The release was exercised in Android-sized Chromium portrait and landscape layouts using a Leaflet-compatible runtime harness. Tests confirmed 98 category badges, 15 enlarged major badges, all layer toggles, street-level labels, the mobile control layout, and no JavaScript errors. The full application script also passed `node --check`.

## Safety and map accuracy

Adult and regulated venues are 18+. Coloured plots and frontage blocks are navigation abstractions centred on mapped addresses or frontage references; they are not cadastral surveys or a live record of occupied windows. Never photograph sex workers or their windows.
