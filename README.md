# Amsterdam Interactive Map

A mobile-friendly interactive Amsterdam visitor map with HTTPS geolocation, a shrinking **you are here** marker, walking-trail recording, De Wallen frontage reference layers, adult museums/shops/shows, major landmarks, value food and hotel transport guidance.

## Open the verified live map

https://raw.githack.com/divsepida-png/Amsterdam-interactive-map/e69079764f26f683ac0bb89c30cfa88657f7a24d/index.html

The live URL was automatically checked for an HTTPS 200 response, the correct map content, and the presence of the browser live-GPS tracking code.

## Repository files

- `index.html` — complete interactive map
- `site.html.gz.b64` — compressed reproducible source used to regenerate the page
- `HOSTING_STATUS.md` — latest verified live URL and check status
- `.github/workflows/materialize-and-verify.yml` — automatically rebuilds and verifies the hosted map after source changes

Live location still requires the visitor to grant the browser precise-location permission. The page records movement only while the browser keeps the map active.
