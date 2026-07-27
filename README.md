# Amsterdam Interactive Map — Android V3

A direct static mobile-first Amsterdam visitor map designed for Android Chrome.

## Architecture

- ordinary HTML, CSS and JavaScript files
- Leaflet canvas overlays rather than WebGL
- no compressed bootstrap, runtime reconstruction, document rewriting or eval
- zoom and tile fade animations disabled
- portrait bottom control dock and landscape side dock
- graceful fallback with direct Google Maps and OpenStreetMap links when both Leaflet mirrors fail

## Tested edge cases

The exact release asset set was exercised in Chromium using Android-sized portrait and landscape viewports, including GPS success, travelled-distance updates, permission denial, waypoint placement, failed street tiles and failed Leaflet mirrors.

## Safety

Adult and regulated venues are 18+. Coloured frontage blocks are approximate navigation references, not a live cadastral record. Never photograph sex workers or their windows.
