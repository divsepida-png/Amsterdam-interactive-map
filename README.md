# Amsterdam Interactive Map V2

A high-contrast, mobile-responsive Amsterdam visitor map built around a GPU-rendered MapLibre vector engine.

## Open the fixed V2 map

https://rawcdn.githack.com/divsepida-png/Amsterdam-interactive-map/d344c04b4b253a5f61033982d85dcfe44aa07d65/index.html

This corrected build starts from a normal application page. It no longer replaces the browser document during startup. The control interface appears immediately, the verified compressed map source is loaded in the background, the late-load event bug is patched before execution, and the reconstructed map logic is cached for faster repeat openings.

## V2 highlights

- MapLibre/OpenFreeMap vector rendering instead of Leaflet raster tiles and DOM-marker redraws
- persistent control dock occupying approximately one fifth of the screen
- five compact menus: Locate, Explore, Route, Layers and Base
- filtered live GPS updates, shrink-on-zoom **you are here** point and smoothed travelled path
- travelled-distance indicator
- address-search and coordinate controls for moving the hotel/base marker
- drop, save and route to waypoints through Google Maps
- large schematic building blocks for major landmarks and smaller symbols for monuments
- red and blue De Wallen frontage references
- green licensed cannabis coffeeshops
- pink smartshops
- yellow curated cuisine-value picks with immediate cuisine badges
- adult museums, shops and shows, hotel transit lines and major tourist places

## Source layout

- `index.html` — direct application shell
- `styles.css` — high-contrast responsive interface
- `data.js` — mapped locations and route data
- `app.js` — deterministic startup and cached map-logic loader
- `site-chunks/part-000.txt` through `part-006.txt` — verified compressed application source
- `HOSTING_STATUS.md` — current published-build record

The frontage blocks and highlighted businesses are navigation references, not cadastral building surveys. Adult and regulated venues are 18+. Carry identification, follow Dutch law and venue guidance, and never photograph or film sex workers or their windows.
