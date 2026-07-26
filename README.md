# Amsterdam Interactive Map V2

A high-contrast, mobile-responsive Amsterdam visitor map built around a GPU-rendered MapLibre vector engine.

## Open the V2 map

https://raw.githack.com/divsepida-png/Amsterdam-interactive-map/dc1b0968ad4cdc6af9b0d3538c3ad9eb9477577a/index.html

The immutable HTTPS build uses a lightweight cached bootstrap. On first opening it downloads seven compressed source parts in parallel, verifies and decompresses the application, then stores the reconstructed interface in local browser storage for faster repeat loading.

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

- `index.html` — cached V2 HTTPS bootstrap
- `site-chunks/part-000.txt` through `part-006.txt` — compressed reproducible application source
- `site.html.gz.b64` — previous assembled source retained for compatibility
- `HOSTING_STATUS.md` — current published-build record

The frontage blocks and highlighted businesses are navigation references, not cadastral building surveys. Adult and regulated venues are 18+. Carry identification, follow Dutch law and venue guidance, and never photograph or film sex workers or their windows.
