# Amsterdam Frontage Map — Bottom-up rebuild

A mobile-first Amsterdam map rebuilt from a blank rendering architecture.

## Live site

https://divsepida-png.github.io/Amsterdam-interactive-map/

## Rendering rules

- MapLibre GL JS provides a WebGL/GPU-rendered map.
- All mapped places share one GeoJSON point source.
- Places can only be rendered with `circle` and `symbol` layers.
- No place layer uses polygons, building fills, frontage strips, repeated blocks, rectangles or route lines.
- Major and smaller landmark dots are visible throughout the full zoom range while their switches are enabled.
- Abstraction modes change label density and marker prominence without replacing point data with approximate areas.

## User controls

- Toggle every place category independently.
- Choose Overview, Balanced or Detailed abstraction.
- Choose compact, standard or large markers.
- Keep or suppress major landmark labels.
- Set an active hotel by search, coordinates or map tap.
- Save several hotels locally.
- Add up to eight waypoints and open Google Maps to any one from the current location.
- Open a multi-stop circuit that returns to the active hotel.
- Choose walking, public transport, cycling or driving as the default Google Maps mode.

## Performance

- WebGL2 is requested with a high-performance GPU preference and a WebGL fallback.
- Place markers are rendered from one GeoJSON source rather than many DOM elements.
- Tile cache size is bounded.
- The service worker caches only the application shell. OpenStreetMap tiles remain under the browser and provider cache headers.
- Camera motion can be disabled.

## Data and accuracy

The curated venue coordinates are compact point references placed at or near each mapped address/frontage. They are navigation aids, not cadastral surveys. Approximate red-light or blue-light area geometry is deliberately absent from this reset. Adult and regulated venues are 18+.
