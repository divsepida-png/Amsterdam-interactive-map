(() => {
  'use strict';

  const status = document.getElementById('status');
  const cacheKey = 'ams-vector-v2-inline-source-20260727b';
  const parts = Array.from({length: 7}, (_, index) =>
    `site-chunks/part-${String(index).padStart(3, '0')}.txt`
  );

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function validSource(source) {
    return typeof source === 'string' &&
      source.includes('maplibregl.Map') &&
      source.includes('navigator.geolocation.watchPosition') &&
      source.includes('addDataLayers');
  }

  function patchStartup(source) {
    const startAnchor = "window.addEventListener('load', () => {";
    if (!source.includes(startAnchor)) return source;

    let patched = source.replace(startAnchor, 'const __startAmsterdamMap = () => {');
    const closeIndex = patched.lastIndexOf('});');
    if (closeIndex < 0) throw new Error('Application startup wrapper is incomplete.');

    patched = `${patched.slice(0, closeIndex)}};\n__startAmsterdamMap();\n${patched.slice(closeIndex + 3)}`;
    return patched;
  }

  function extractApplication(html) {
    const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    const source = matches.map(match => match[1]).find(candidate => validSource(candidate));
    if (!source) throw new Error('Map application script was not found.');
    return patchStartup(source);
  }

  async function decompressBase64(value) {
    const clean = value.replace(/\s+/g, '');
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));

    if ('DecompressionStream' in window) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).text();
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Compatibility decompressor could not load.'));
      document.head.appendChild(script);
    });
    return window.pako.ungzip(bytes, {to: 'string'});
  }

  async function fetchPart(path) {
    const response = await fetch(path, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    return response.text();
  }

  function execute(source) {
    if (!validSource(source)) throw new Error('Map source failed its integrity check.');
    new Function(source)();
  }

  async function start() {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (validSource(cached)) {
        setStatus('Starting cached map engine…');
        execute(cached);
        return;
      }
    } catch (error) {
      console.warn('Map cache unavailable:', error);
    }

    setStatus('Loading map engine…');
    const encoded = (await Promise.all(parts.map(fetchPart))).join('');
    setStatus('Preparing map controls…');
    const html = await decompressBase64(encoded);
    const source = extractApplication(html);

    try { localStorage.setItem(cacheKey, source); } catch {}
    execute(source);
  }

  start().catch(error => {
    console.error(error);
    setStatus(`Map could not start: ${error.message}. Refresh once to retry.`);
  });
})();
