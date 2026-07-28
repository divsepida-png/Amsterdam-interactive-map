'use strict';

(() => {
  const RELEASE = 'ams-point-only-v2';
  const blockedLayerTypes = new Set(['line', 'fill', 'fill-extrusion']);
  const legacySelectors = [
    '.leaflet-pane',
    '.leaflet-control-container',
    '.leaflet-marker-icon',
    '.leaflet-marker-shadow',
    '.leaflet-tooltip-pane',
    '.leaflet-popup-pane',
    'svg.leaflet-zoom-animated',
    'canvas.leaflet-zoom-animated',
    '[data-frontage-layer]',
    '[data-red-frontage]',
    '[data-blue-frontage]'
  ];

  function removeLegacyStorage() {
    try {
      const exactKeys = [
        'ams-v3-base',
        'ams-v3-active-waypoint',
        'ams-v3-waypoints',
        'ams-v3-trail'
      ];
      exactKeys.forEach(key => localStorage.removeItem(key));
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index) || '';
        if (/^ams-(?:v[4-9]|v10)-/i.test(key) || /frontage|red[-_ ]?light|blue[-_ ]?light/i.test(key)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem('ams-clean-release', RELEASE);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }

  function removeLegacyNodes(root = document) {
    legacySelectors.forEach(selector => {
      root.querySelectorAll?.(selector).forEach(node => node.remove());
    });

    root.querySelectorAll?.('script[src],link[href]').forEach(node => {
      const reference = node.getAttribute('src') || node.getAttribute('href') || '';
      if (/android-v3|v10-clean-renderer|leaflet/i.test(reference)) node.remove();
    });
  }

  function clearOldCaches() {
    if (!('caches' in window)) return;
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== 'ams-frontage-shell-v2').map(key => caches.delete(key))))
      .catch(() => {});
  }

  function installMapLibreGuard() {
    if (!window.maplibregl?.Map?.prototype || window.maplibregl.Map.prototype.__pointOnlyGuard) return;
    const prototype = window.maplibregl.Map.prototype;
    const originalAddLayer = prototype.addLayer;

    prototype.addLayer = function guardedAddLayer(layer, beforeId) {
      if (layer && blockedLayerTypes.has(layer.type)) {
        console.warn(`Blocked non-point overlay layer: ${layer.id || layer.type}`);
        return this;
      }
      return originalAddLayer.call(this, layer, beforeId);
    };

    Object.defineProperty(prototype, '__pointOnlyGuard', {value: true});
  }

  removeLegacyStorage();
  clearOldCaches();
  removeLegacyNodes();
  installMapLibreGuard();

  document.addEventListener('DOMContentLoaded', () => removeLegacyNodes());

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) removeLegacyNodes(node);
      });
    });
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
})();
