'use strict';

(() => {
  if (!window.maplibregl || typeof window.maplibregl.supported === 'function') return;

  window.maplibregl.supported = function supported() {
    if (!window.WebGLRenderingContext) return false;

    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl2', {failIfMajorPerformanceCaveat: false}) ||
        canvas.getContext('webgl', {failIfMajorPerformanceCaveat: false}) ||
        canvas.getContext('experimental-webgl', {failIfMajorPerformanceCaveat: false});

      return Boolean(context && typeof context.getParameter === 'function');
    } catch (error) {
      console.warn('WebGL support check failed', error);
      return false;
    }
  };
})();
