'use strict';

(() => {
  const DATA = window.AMS_MAP_DATA;
  const STORAGE = Object.freeze({
    layers: 'ams-bottom-up-layers-v1',
    preferences: 'ams-bottom-up-preferences-v1',
    activeHotel: 'ams-bottom-up-active-hotel-v1',
    hotels: 'ams-bottom-up-hotels-v1',
    waypoints: 'ams-bottom-up-waypoints-v1'
  });

  const $ = id => document.getElementById(id);
  const categoryById = new Map(DATA.categories.map(category => [category.id, category]));
  const placeById = new Map(DATA.places.map(place => [place.id, place]));

  const defaults = Object.freeze({
    layers: Object.fromEntries(DATA.categories.map(category => [category.id, category.defaultVisible])),
    preferences: {
      abstraction: 'balanced',
      markerSize: 'standard',
      travelMode: 'walking',
      majorLabels: true,
      reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
    }
  });

  const state = {
    map: null,
    popup: null,
    layers: {...defaults.layers, ...load(STORAGE.layers, {})},
    preferences: {...defaults.preferences, ...load(STORAGE.preferences, {})},
    activeHotel: load(STORAGE.activeHotel, DATA.defaultHotel),
    hotels: load(STORAGE.hotels, [DATA.defaultHotel]),
    waypoints: load(STORAGE.waypoints, []),
    user: null,
    gpsWatch: null,
    firstGpsFix: true,
    selected: null,
    interactionMode: null,
    ready: false
  };

  const els = {
    panel: $('controlPanel'),
    menu: $('menuButton'),
    close: $('closePanel'),
    status: $('statusText'),
    detail: $('statusDetail'),
    locate: $('locateButton'),
    toast: $('toast')
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : structuredCloneSafe(fallback);
    } catch {
      return structuredCloneSafe(fallback);
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in private mode. */ }
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function setStatus(primary, secondary = '') {
    els.status.textContent = primary;
    els.detail.textContent = secondary;
  }

  function toast(message, duration = 2800) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  function openPanel(tab = null) {
    els.panel.classList.add('open');
    els.menu.setAttribute('aria-expanded', 'true');
    if (tab) setTab(tab);
  }

  function closePanel() {
    els.panel.classList.remove('open');
    els.menu.setAttribute('aria-expanded', 'false');
  }

  function setTab(name) {
    document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.tab === name));
    document.querySelectorAll('.tabPanel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${name}`));
  }

  function categoryFor(place) {
    return categoryById.get(place.category) || {label: place.category, colour: '#333333', text: '#ffffff', code: '?'};
  }

  function toFeature(place) {
    const category = categoryFor(place);
    return {
      type: 'Feature',
      id: place.id,
      geometry: {type: 'Point', coordinates: [place.lon, place.lat]},
      properties: {
        id: place.id,
        name: place.name,
        category: place.category,
        categoryLabel: category.label,
        colour: category.colour,
        textColour: category.text,
        code: place.code || category.code,
        importance: place.importance || '',
        address: place.address || '',
        cuisine: place.cuisine || '',
        note: place.note || ''
      }
    };
  }

  const placeGeoJSON = {
    type: 'FeatureCollection',
    features: DATA.places.map(toFeature)
  };

  function baseMapStyle() {
    return {
      version: 8,
      name: 'Amsterdam high-contrast raster base',
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'osm-raster': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 19,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {id: 'background', type: 'background', paint: {'background-color': '#dce6ed'}},
        {
          id: 'osm-base',
          type: 'raster',
          source: 'osm-raster',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-saturation': -0.72,
            'raster-contrast': 0.16,
            'raster-brightness-min': 0.12,
            'raster-brightness-max': 0.96,
            'raster-fade-duration': 0
          }
        }
      ]
    };
  }

  function visibleCategoryFilter() {
    const visible = DATA.categories.filter(category => state.layers[category.id]).map(category => category.id);
    if (!visible.length) return ['==', ['get', 'category'], '__none__'];
    return ['match', ['get', 'category'], visible, true, false];
  }

  function addPlaceLayers() {
    state.map.addSource('places', {type: 'geojson', data: placeGeoJSON, promoteId: 'id'});

    state.map.addLayer({
      id: 'place-circles',
      type: 'circle',
      source: 'places',
      filter: visibleCategoryFilter(),
      paint: {
        'circle-color': ['get', 'colour'],
        'circle-radius': 6,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.98,
        'circle-stroke-opacity': 1
      }
    });

    state.map.addLayer({
      id: 'place-codes',
      type: 'symbol',
      source: 'places',
      filter: visibleCategoryFilter(),
      layout: {
        'text-field': ['get', 'code'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-padding': 1
      },
      paint: {
        'text-color': ['get', 'textColour'],
        'text-halo-color': ['get', 'colour'],
        'text-halo-width': 1
      }
    });

    state.map.addLayer({
      id: 'major-labels',
      type: 'symbol',
      source: 'places',
      filter: ['all', visibleCategoryFilter(), ['==', ['get', 'importance'], 'major']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-offset': [0, 1.45],
        'text-anchor': 'top',
        'text-max-width': 12,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#06111b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.4
      }
    });

    state.map.addLayer({
      id: 'minor-labels',
      type: 'symbol',
      source: 'places',
      filter: ['all', visibleCategoryFilter(), ['==', ['get', 'importance'], 'minor']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
        'text-max-width': 11,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#06111b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.7
      }
    });

    state.map.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: 'places',
      filter: ['all', visibleCategoryFilter(), ['==', ['get', 'importance'], '']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10.5,
        'text-offset': [0, 1.15],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#06111b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    });

    // Utility locations are separate point sources. No line or polygon overlay is created.
    state.map.addSource('hotel', {type: 'geojson', data: pointCollection([])});
    state.map.addLayer({
      id: 'hotel-circle', type: 'circle', source: 'hotel',
      paint: {'circle-color': '#087a43', 'circle-radius': 11, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3}
    });
    state.map.addLayer({
      id: 'hotel-code', type: 'symbol', source: 'hotel',
      layout: {'text-field': 'H', 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true},
      paint: {'text-color': '#ffffff'}
    });

    state.map.addSource('waypoints', {type: 'geojson', data: pointCollection([])});
    state.map.addLayer({
      id: 'waypoint-circles', type: 'circle', source: 'waypoints',
      paint: {'circle-color': '#c45100', 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3}
    });
    state.map.addLayer({
      id: 'waypoint-codes', type: 'symbol', source: 'waypoints',
      layout: {'text-field': ['get', 'number'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true},
      paint: {'text-color': '#ffffff'}
    });

    state.map.addSource('user', {type: 'geojson', data: pointCollection([])});
    state.map.addLayer({
      id: 'user-circle', type: 'circle', source: 'user',
      paint: {'circle-color': '#006fc4', 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 4}
    });
    state.map.addLayer({
      id: 'user-code', type: 'symbol', source: 'user',
      layout: {'text-field': 'YOU', 'text-font': ['Noto Sans Bold'], 'text-size': 7, 'text-allow-overlap': true},
      paint: {'text-color': '#ffffff'}
    });

    state.map.addSource('selection', {type: 'geojson', data: pointCollection([])});
    state.map.addLayer({
      id: 'selection-ring', type: 'circle', source: 'selection',
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': 15,
        'circle-stroke-color': '#ffd84d',
        'circle-stroke-width': 4
      }
    });

    assertPointOnlyOverlay();
    updateUtilitySources();
    applyDisplayPreferences();
    applyLayerFilter();
  }

  function assertPointOnlyOverlay() {
    const allowedTypes = new Set(['circle', 'symbol']);
    const managed = [
      'place-circles', 'place-codes', 'major-labels', 'minor-labels', 'poi-labels',
      'hotel-circle', 'hotel-code', 'waypoint-circles', 'waypoint-codes',
      'user-circle', 'user-code', 'selection-ring'
    ];
    for (const id of managed) {
      const layer = state.map.getLayer(id);
      if (!layer || !allowedTypes.has(layer.type)) throw new Error(`Unsafe overlay layer detected: ${id}`);
    }
  }

  function pointCollection(points) {
    return {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {type: 'Point', coordinates: [point.lon, point.lat]},
        properties: {...point}
      }))
    };
  }

  function updateUtilitySources() {
    if (!state.ready && !state.map?.getSource('hotel')) return;
    state.map.getSource('hotel')?.setData(pointCollection([state.activeHotel]));
    state.map.getSource('waypoints')?.setData(pointCollection(state.waypoints.map((waypoint, index) => ({...waypoint, number: String(index + 1)}))));
    state.map.getSource('user')?.setData(pointCollection(state.user ? [state.user] : []));
    state.map.getSource('selection')?.setData(pointCollection(state.selected ? [state.selected] : []));
  }

  function applyLayerFilter() {
    if (!state.ready) return;
    const visible = visibleCategoryFilter();
    state.map.setFilter('place-circles', visible);
    state.map.setFilter('place-codes', visible);
    state.map.setFilter('major-labels', ['all', visible, ['==', ['get', 'importance'], 'major']]);
    state.map.setFilter('minor-labels', ['all', visible, ['==', ['get', 'importance'], 'minor']]);
    state.map.setFilter('poi-labels', ['all', visible, ['==', ['get', 'importance'], '']]);
  }

  function applyDisplayPreferences() {
    syncPreferenceControls();
    if (!state.ready) return;

    const sizeScale = {compact: 0.82, standard: 1, large: 1.28}[state.preferences.markerSize] || 1;
    const abstraction = state.preferences.abstraction;
    const nonLandmarkBase = abstraction === 'overview' ? 4.2 : abstraction === 'detailed' ? 6.2 : 5.2;

    state.map.setPaintProperty('place-circles', 'circle-radius', [
      'interpolate', ['linear'], ['zoom'],
      10, ['*', sizeScale, ['case', ['==', ['get', 'importance'], 'major'], 8.8, ['==', ['get', 'importance'], 'minor'], 6.4, nonLandmarkBase]],
      16, ['*', sizeScale, ['case', ['==', ['get', 'importance'], 'major'], 12, ['==', ['get', 'importance'], 'minor'], 8, nonLandmarkBase + 1.5]]
    ]);
    state.map.setPaintProperty('place-circles', 'circle-stroke-width', sizeScale >= 1.2 ? 3 : 2);

    const codeMinZoom = abstraction === 'overview' ? 15 : abstraction === 'detailed' ? 11.5 : 13.5;
    const minorMinZoom = abstraction === 'overview' ? 15.5 : abstraction === 'detailed' ? 12.8 : 14.2;
    const poiMinZoom = abstraction === 'overview' ? 18 : abstraction === 'detailed' ? 14 : 16;

    state.map.setLayerZoomRange('place-codes', codeMinZoom, 24);
    state.map.setLayerZoomRange('minor-labels', minorMinZoom, 24);
    state.map.setLayerZoomRange('poi-labels', poiMinZoom, 24);
    state.map.setLayoutProperty('major-labels', 'visibility', state.preferences.majorLabels ? 'visible' : 'none');
    state.map.setLayoutProperty('major-labels', 'text-allow-overlap', state.preferences.majorLabels);
    state.map.setLayoutProperty('major-labels', 'text-ignore-placement', state.preferences.majorLabels);
  }

  function syncPreferenceControls() {
    document.querySelectorAll('[data-abstraction]').forEach(button => button.classList.toggle('active', button.dataset.abstraction === state.preferences.abstraction));
    document.querySelectorAll('[data-size]').forEach(button => button.classList.toggle('active', button.dataset.size === state.preferences.markerSize));
    $('travelMode').value = state.preferences.travelMode;
    $('majorLabels').checked = state.preferences.majorLabels;
    $('reduceMotion').checked = state.preferences.reduceMotion;
  }

  function renderLegend() {
    $('mapLegend').innerHTML = DATA.categories
      .filter(category => state.layers[category.id])
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 7)
      .map(category => `<span class="legendChip"><i class="legendSwatch" style="--chip-colour:${category.colour}"></i>${esc(category.short)}</span>`)
      .join('');
  }

  function renderLayerControls() {
    const host = $('layerControls');
    host.innerHTML = '';
    DATA.categories.sort((a, b) => b.priority - a.priority).forEach(category => {
      const row = document.createElement('div');
      row.className = 'toggleRow';
      row.innerHTML = `
        <span class="toggleLabel">
          <i class="dot" style="--dot:${category.colour}"></i>
          <span><strong>${esc(category.label)}</strong><small>${category.id.includes('landmark') ? 'Visible at every zoom when enabled' : 'Frontage-point markers'}</small></span>
        </span>
        <button class="toggleButton ${state.layers[category.id] ? 'on' : ''}" type="button" aria-pressed="${state.layers[category.id]}">${state.layers[category.id] ? 'On' : 'Off'}</button>`;
      const button = row.querySelector('button');
      button.addEventListener('click', () => {
        state.layers[category.id] = !state.layers[category.id];
        save(STORAGE.layers, state.layers);
        renderLayerControls();
        renderLegend();
        applyLayerFilter();
      });
      host.appendChild(row);
    });
  }

  function renderSearchResults(query = '') {
    const host = $('searchResults');
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      host.innerHTML = '<div class="emptyState">Search by name, address, category or cuisine.</div>';
      return;
    }

    const matches = DATA.places
      .filter(place => `${place.name} ${place.address || ''} ${place.cuisine || ''} ${categoryFor(place).label}`.toLowerCase().includes(normalized))
      .slice(0, 30);

    host.innerHTML = '';
    if (!matches.length) {
      host.innerHTML = '<div class="emptyState">No mapped match. The clean rebuild uses a curated point dataset rather than broad approximate areas.</div>';
      return;
    }
    matches.forEach(place => host.appendChild(resultButton(place, () => selectPlace(place, true))));
  }

  function resultButton(place, onClick) {
    const category = categoryFor(place);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'resultButton';
    button.innerHTML = `
      <i class="dot" style="--dot:${category.colour}"></i>
      <span class="resultText"><strong>${esc(place.name)}</strong><small>${esc(category.label)}${place.address ? ` · ${esc(place.address)}` : ''}</small></span>
      <span class="chevron">›</span>`;
    button.addEventListener('click', onClick);
    return button;
  }

  function selectPlace(place, moveMap = false) {
    state.selected = place;
    updateUtilitySources();
    renderSelectedPlace();
    if (moveMap && state.map) {
      state.map.easeTo({center: [place.lon, place.lat], zoom: Math.max(state.map.getZoom(), 16), duration: cameraDuration()});
      openPanel('explore');
    }
  }

  function renderSelectedPlace() {
    const host = $('selectedPlace');
    if (!state.selected) {
      host.innerHTML = '';
      return;
    }
    const place = state.selected;
    const category = categoryFor(place);
    host.innerHTML = `
      <article class="placeCard">
        <strong>${esc(place.name)}</strong>
        <span>${esc(category.label)}</span>
        <small>${esc(place.address || '')}</small>
        <small>${esc(place.note || '')}</small>
        <div class="placeActions">
          <button id="selectedShow" type="button">Show</button>
          <button id="selectedRoute" class="primary" type="button">Route here</button>
          <button id="selectedWaypoint" type="button">Save waypoint</button>
          <button id="selectedHotelRoute" type="button">Here → hotel</button>
        </div>
      </article>`;
    $('selectedShow').onclick = () => {
      state.map.easeTo({center: [place.lon, place.lat], zoom: Math.max(state.map.getZoom(), 16), duration: cameraDuration()});
      closePanel();
    };
    $('selectedRoute').onclick = () => openGoogleRoute(place);
    $('selectedWaypoint').onclick = () => addWaypoint(place.lat, place.lon, place.name);
    $('selectedHotelRoute').onclick = () => openGoogleRoute(state.activeHotel, {origin: place});
  }

  function createPopup(place, coordinates) {
    const category = categoryFor(place);
    const content = document.createElement('div');
    content.innerHTML = `
      <strong class="popupTitle">${esc(place.name)}</strong>
      <span class="popupMeta">${esc(category.label)}</span>
      <span class="popupMeta">${esc(place.address || '')}</span>
      <div class="popupActions">
        <button type="button" data-popup-route class="primary">Google route</button>
        <button type="button" data-popup-waypoint>Save point</button>
      </div>`;
    content.querySelector('[data-popup-route]').onclick = () => openGoogleRoute(place);
    content.querySelector('[data-popup-waypoint]').onclick = () => addWaypoint(place.lat, place.lon, place.name);
    state.popup?.remove();
    state.popup = new maplibregl.Popup({closeButton: true, closeOnClick: true, offset: 14})
      .setLngLat(coordinates)
      .setDOMContent(content)
      .addTo(state.map);
  }

  function addWaypoint(lat, lon, name = '') {
    const waypoint = {
      id: `waypoint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || `Waypoint ${state.waypoints.length + 1}`,
      lat: Number(lat),
      lon: Number(lon)
    };
    state.waypoints = [...state.waypoints, waypoint].slice(-8);
    save(STORAGE.waypoints, state.waypoints);
    updateUtilitySources();
    renderWaypoints();
    state.interactionMode = null;
    syncInteractionButtons();
    toast(`${waypoint.name} saved.`);
  }

  function removeWaypoint(id) {
    state.waypoints = state.waypoints.filter(waypoint => waypoint.id !== id);
    save(STORAGE.waypoints, state.waypoints);
    updateUtilitySources();
    renderWaypoints();
  }

  function renderWaypoints() {
    const host = $('waypointList');
    host.innerHTML = '';
    if (!state.waypoints.length) {
      host.innerHTML = '<div class="emptyState">No saved waypoints. Add one from a place card or tap the map.</div>';
      $('routeAll').disabled = true;
      return;
    }
    $('routeAll').disabled = false;
    state.waypoints.forEach((waypoint, index) => {
      const card = document.createElement('article');
      card.className = 'placeCard';
      card.innerHTML = `
        <strong>${index + 1}. ${esc(waypoint.name)}</strong>
        <small>${waypoint.lat.toFixed(5)}, ${waypoint.lon.toFixed(5)}</small>
        <div class="placeActions">
          <button type="button" data-show>Show</button>
          <button type="button" data-route class="primary">Route here</button>
          <button type="button" data-remove class="danger">Remove</button>
        </div>`;
      card.querySelector('[data-show]').onclick = () => {
        state.map.easeTo({center: [waypoint.lon, waypoint.lat], zoom: Math.max(state.map.getZoom(), 16), duration: cameraDuration()});
        closePanel();
      };
      card.querySelector('[data-route]').onclick = () => openGoogleRoute(waypoint);
      card.querySelector('[data-remove]').onclick = () => removeWaypoint(waypoint.id);
      host.appendChild(card);
    });
  }

  function setHotel(hotel, saveToHistory = true) {
    state.activeHotel = {
      id: hotel.id || `hotel-${Date.now()}`,
      name: hotel.name || 'Custom hotel',
      address: hotel.address || `${Number(hotel.lat).toFixed(6)}, ${Number(hotel.lon).toFixed(6)}`,
      lat: Number(hotel.lat),
      lon: Number(hotel.lon)
    };
    save(STORAGE.activeHotel, state.activeHotel);
    if (saveToHistory) {
      const withoutDuplicate = state.hotels.filter(item => distanceMetres(item, state.activeHotel) > 8 && item.name !== state.activeHotel.name);
      state.hotels = [state.activeHotel, ...withoutDuplicate].slice(0, 6);
      save(STORAGE.hotels, state.hotels);
    }
    updateUtilitySources();
    renderHotel();
    state.map?.easeTo({center: [state.activeHotel.lon, state.activeHotel.lat], zoom: 15.5, duration: cameraDuration()});
    toast(`${state.activeHotel.name} set as the active hotel.`);
  }

  function renderHotel() {
    const hotel = state.activeHotel;
    $('hotelCard').innerHTML = `
      <strong>${esc(hotel.name)}</strong>
      <span>Active hotel / base</span>
      <small>${esc(hotel.address || '')}</small>
      <small>${hotel.lat.toFixed(6)}, ${hotel.lon.toFixed(6)}</small>`;

    const host = $('savedHotelList');
    if (!host) return;
    host.innerHTML = '';
    if (!state.hotels.length) {
      host.innerHTML = '<div class="emptyState">No saved hotels.</div>';
      return;
    }
    state.hotels.forEach(hotelItem => {
      const card = document.createElement('article');
      card.className = 'placeCard';
      card.innerHTML = `
        <strong>${esc(hotelItem.name)}</strong>
        <small>${esc(hotelItem.address || '')}</small>
        <div class="placeActions">
          <button type="button" data-use>Use</button>
          <button type="button" data-route class="primary">Route</button>
          <button type="button" data-remove class="danger">Remove</button>
        </div>`;
      card.querySelector('[data-use]').onclick = () => setHotel(hotelItem, false);
      card.querySelector('[data-route]').onclick = () => openGoogleRoute(hotelItem);
      card.querySelector('[data-remove]').onclick = () => {
        state.hotels = state.hotels.filter(item => item.id !== hotelItem.id);
        save(STORAGE.hotels, state.hotels);
        renderHotel();
      };
      host.appendChild(card);
    });
  }

  async function findHotel() {
    const query = $('hotelSearch').value.trim();
    const host = $('hotelResults');
    if (query.length < 3) {
      toast('Enter at least three characters.');
      return;
    }
    host.innerHTML = '<div class="emptyState">Searching Amsterdam addresses…</div>';
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${query}, Amsterdam`)}&limit=8&lang=en&lat=52.37&lon=4.89`;
      const response = await fetch(url, {headers: {'Accept': 'application/json'}});
      if (!response.ok) throw new Error(`Address service returned ${response.status}`);
      const json = await response.json();
      const results = (json.features || []).map(feature => {
        const [lon, lat] = feature.geometry.coordinates;
        const properties = feature.properties || {};
        return {
          id: `hotel-${lat}-${lon}`,
          name: properties.name || properties.street || query,
          address: [properties.housenumber, properties.street, properties.postcode, properties.city].filter(Boolean).join(' '),
          lat,
          lon
        };
      }).filter(item => item.lat > 52.2 && item.lat < 52.5 && item.lon > 4.6 && item.lon < 5.2);

      host.innerHTML = '';
      if (!results.length) {
        host.innerHTML = '<div class="emptyState">No Amsterdam match found. Use coordinates or set the hotel by tapping the map.</div>';
        return;
      }
      results.forEach(result => host.appendChild(resultButton({...result, category: 'major-landmark'}, () => setHotel(result))));
    } catch (error) {
      console.error(error);
      host.innerHTML = '<div class="emptyState">Address search is unavailable. Use coordinates or set the hotel by tapping the map.</div>';
    }
  }

  function parseCoordinates(value) {
    const matches = String(value).match(/[-+]?\d{1,3}(?:[.,]\d+)?/g);
    if (!matches || matches.length < 2) return null;
    let first = Number(matches[0].replace(',', '.'));
    let second = Number(matches[1].replace(',', '.'));
    if (Math.abs(first) < 20 && Math.abs(second) > 40) [first, second] = [second, first];
    if (first < 52.2 || first > 52.5 || second < 4.6 || second > 5.2) return null;
    return {lat: first, lon: second};
  }

  function googleMapsUrl(destination, options = {}) {
    const parameters = new URLSearchParams({api: '1'});
    const origin = options.origin || state.user;
    if (origin) parameters.set('origin', `${origin.lat},${origin.lon}`);
    parameters.set('destination', `${destination.lat},${destination.lon}`);
    parameters.set('travelmode', options.travelMode || state.preferences.travelMode);
    if (options.waypoints?.length) {
      parameters.set('waypoints', options.waypoints.map(point => `${point.lat},${point.lon}`).join('|'));
    }
    if (origin) parameters.set('dir_action', 'navigate');
    return `https://www.google.com/maps/dir/?${parameters.toString()}`;
  }

  function openGoogleRoute(destination, options = {}) {
    window.open(googleMapsUrl(destination, options), '_blank', 'noopener');
  }

  function routeAllWaypoints() {
    if (!state.waypoints.length) {
      toast('Add at least one waypoint first.');
      return;
    }
    let mode = state.preferences.travelMode;
    if (mode === 'transit') {
      mode = 'walking';
      toast('Google multi-stop URLs do not support transit waypoints, so this circuit opens in walking mode.', 4200);
    }
    openGoogleRoute(state.activeHotel, {waypoints: state.waypoints, travelMode: mode});
  }

  function startGps() {
    if (state.gpsWatch !== null) {
      navigator.geolocation.clearWatch(state.gpsWatch);
      state.gpsWatch = null;
      els.locate.textContent = 'Use GPS';
      setStatus('GPS paused', 'Saved places and routes remain available');
      return;
    }
    if (!window.isSecureContext || location.protocol !== 'https:') {
      toast('Live GPS requires the HTTPS GitHub Pages version.');
      return;
    }
    if (!navigator.geolocation) {
      toast('This browser does not support location.');
      return;
    }
    els.locate.textContent = 'Stop GPS';
    setStatus('Requesting precise location…', 'Allow location access when prompted');
    state.gpsWatch = navigator.geolocation.watchPosition(position => {
      state.user = {
        id: 'current-user',
        name: 'Current location',
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      updateUtilitySources();
      setStatus('GPS active', `Accuracy ±${Math.round(position.coords.accuracy)} m`);
      if (state.firstGpsFix) {
        state.firstGpsFix = false;
        state.map.easeTo({center: [state.user.lon, state.user.lat], zoom: Math.max(state.map.getZoom(), 16), duration: cameraDuration()});
      }
    }, error => {
      if (state.gpsWatch !== null) navigator.geolocation.clearWatch(state.gpsWatch);
      state.gpsWatch = null;
      els.locate.textContent = 'Use GPS';
      const message = error.code === 1 ? 'Location permission was blocked.' : error.code === 2 ? 'Location is currently unavailable.' : 'Location request timed out.';
      setStatus(message, 'Check browser and phone location settings');
      toast(message);
    }, {enableHighAccuracy: true, maximumAge: 3000, timeout: 18000});
  }

  function distanceMetres(a, b) {
    const radius = 6371000;
    const toRadians = degrees => degrees * Math.PI / 180;
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * radius * Math.asin(Math.min(1, Math.sqrt(haversine)));
  }

  function cameraDuration() {
    return state.preferences.reduceMotion ? 0 : 420;
  }

  function beginInteraction(mode) {
    state.interactionMode = state.interactionMode === mode ? null : mode;
    syncInteractionButtons();
    if (state.interactionMode) {
      closePanel();
      toast(state.interactionMode === 'waypoint' ? 'Tap the map to save a waypoint.' : 'Tap the map to set the active hotel.');
    }
  }

  function syncInteractionButtons() {
    const waypointActive = state.interactionMode === 'waypoint';
    const hotelActive = state.interactionMode === 'hotel';
    $('addWaypoint').classList.toggle('active', waypointActive);
    $('addWaypointMap').classList.toggle('active', waypointActive);
    $('hotelFromMap').classList.toggle('active', hotelActive);
    $('addWaypoint').textContent = waypointActive ? 'Cancel map tap' : 'Tap map to add';
    $('addWaypointMap').textContent = waypointActive ? 'Cancel' : '+ Waypoint';
    $('hotelFromMap').textContent = hotelActive ? 'Cancel map tap' : 'Set by map tap';
  }

  function handleMapClick(event) {
    if (state.interactionMode === 'waypoint') {
      addWaypoint(event.lngLat.lat, event.lngLat.lng);
      return;
    }
    if (state.interactionMode === 'hotel') {
      state.interactionMode = null;
      syncInteractionButtons();
      setHotel({name: 'Pinned hotel', address: `${event.lngLat.lat.toFixed(6)}, ${event.lngLat.lng.toFixed(6)}`, lat: event.lngLat.lat, lon: event.lngLat.lng});
    }
  }

  function bindUi() {
    els.menu.onclick = () => els.panel.classList.contains('open') ? closePanel() : openPanel();
    els.close.onclick = closePanel;
    els.locate.onclick = startGps;
    document.querySelectorAll('.tab').forEach(button => button.onclick = () => setTab(button.dataset.tab));

    $('searchInput').addEventListener('input', event => renderSearchResults(event.target.value));
    $('resetLayers').onclick = () => {
      state.layers = {...defaults.layers};
      save(STORAGE.layers, state.layers);
      renderLayerControls();
      renderLegend();
      applyLayerFilter();
    };

    $('addWaypoint').onclick = () => beginInteraction('waypoint');
    $('addWaypointMap').onclick = () => beginInteraction('waypoint');
    $('routeAll').onclick = routeAllWaypoints;
    $('clearWaypoints').onclick = () => {
      state.waypoints = [];
      save(STORAGE.waypoints, state.waypoints);
      updateUtilitySources();
      renderWaypoints();
      toast('All waypoints cleared.');
    };

    $('routeHotel').onclick = () => openGoogleRoute(state.activeHotel);
    $('hotelFromMap').onclick = () => beginInteraction('hotel');
    $('findHotel').onclick = findHotel;
    $('hotelSearch').addEventListener('keydown', event => { if (event.key === 'Enter') findHotel(); });
    $('setHotelCoords').onclick = () => {
      const coordinates = parseCoordinates($('hotelCoords').value);
      if (!coordinates) {
        toast('Use Amsterdam coordinates such as 52.357545, 4.844081.');
        return;
      }
      setHotel({name: 'Coordinate hotel', address: `${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`, ...coordinates});
    };
    $('resetHotel').onclick = () => setHotel(DATA.defaultHotel);

    document.querySelectorAll('[data-abstraction]').forEach(button => button.onclick = () => {
      state.preferences.abstraction = button.dataset.abstraction;
      save(STORAGE.preferences, state.preferences);
      applyDisplayPreferences();
    });
    document.querySelectorAll('[data-size]').forEach(button => button.onclick = () => {
      state.preferences.markerSize = button.dataset.size;
      save(STORAGE.preferences, state.preferences);
      applyDisplayPreferences();
    });
    $('travelMode').onchange = event => {
      state.preferences.travelMode = event.target.value;
      save(STORAGE.preferences, state.preferences);
    };
    $('majorLabels').onchange = event => {
      state.preferences.majorLabels = event.target.checked;
      save(STORAGE.preferences, state.preferences);
      applyDisplayPreferences();
    };
    $('reduceMotion').onchange = event => {
      state.preferences.reduceMotion = event.target.checked;
      save(STORAGE.preferences, state.preferences);
    };
    $('resetDisplay').onclick = () => {
      state.preferences = {...defaults.preferences};
      save(STORAGE.preferences, state.preferences);
      applyDisplayPreferences();
      toast('Display preferences reset.');
    };

    $('zoomCity').onclick = () => state.map.easeTo({center: DATA.centre, zoom: 13, duration: cameraDuration()});
    $('zoomCentre').onclick = () => state.map.easeTo({center: [4.8952, 52.3728], zoom: 15.2, duration: cameraDuration()});

    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        state.interactionMode = null;
        syncInteractionButtons();
        closePanel();
      }
    });
  }

  function showFallback(reason) {
    $('fallbackReason').textContent = reason;
    $('fallback').hidden = false;
    setStatus('Map unavailable', 'Direct Google Maps and OpenStreetMap links remain available');
  }

  async function init() {
    bindUi();
    renderLayerControls();
    renderLegend();
    renderSearchResults();
    renderWaypoints();
    renderHotel();
    syncPreferenceControls();
    syncInteractionButtons();

    if (!window.maplibregl) {
      showFallback('The MapLibre library did not load. Check the connection and reload.');
      return;
    }
    if (!maplibregl.supported()) {
      showFallback('This browser or device does not provide the WebGL support required by the GPU renderer.');
      return;
    }

    state.map = new maplibregl.Map({
      container: 'map',
      style: baseMapStyle(),
      center: DATA.centre,
      zoom: 13,
      minZoom: 3,
      maxZoom: 20,
      attributionControl: true,
      fadeDuration: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: false,
      maxTileCacheSize: 180,
      refreshExpiredTiles: true,
      canvasContextAttributes: {
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        desynchronized: true,
        contextType: 'webgl2withfallback'
      }
    });

    state.map.addControl(new maplibregl.NavigationControl({showCompass: false, visualizePitch: false}), 'bottom-left');
    state.map.addControl(new maplibregl.ScaleControl({maxWidth: 100, unit: 'metric'}), 'bottom-left');

    state.map.on('load', () => {
      addPlaceLayers();
      state.ready = true;
      updateUtilitySources();
      applyDisplayPreferences();
      applyLayerFilter();
      setStatus('Map ready', 'GPU point renderer active · tap any dot for details');
      if (innerWidth >= 1100) openPanel('explore');
    });

    state.map.on('click', handleMapClick);
    state.map.on('click', 'place-circles', event => {
      if (state.interactionMode) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const place = placeById.get(feature.properties.id);
      if (!place) return;
      selectPlace(place, false);
      createPopup(place, feature.geometry.coordinates.slice());
    });
    state.map.on('mouseenter', 'place-circles', () => { state.map.getCanvas().style.cursor = 'pointer'; });
    state.map.on('mouseleave', 'place-circles', () => { state.map.getCanvas().style.cursor = ''; });
    state.map.on('error', event => {
      console.warn('MapLibre error', event.error || event);
      if (!state.ready) setStatus('Map tiles delayed', 'Controls and saved locations remain available');
    });

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker registration failed', error));
    }
  }

  init().catch(error => {
    console.error(error);
    showFallback(`The map hit an unexpected startup error: ${error.message}`);
  });
})();
