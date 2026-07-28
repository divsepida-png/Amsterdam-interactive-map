'use strict';
/* V7: hard removal guard for obsolete V4 rectangles and V5 building polygons. */
(function applyLegacyArtifactCleanup(){
  const previousBuildLayers=buildLayers;

  function isLegacyAreaLayer(layer){
    return Boolean(window.L&&L.Polygon&&layer instanceof L.Polygon);
  }

  function purgeContainer(container){
    if(!container?.eachLayer||!container?.removeLayer)return 0;
    let removed=0;
    const layers=[];
    container.eachLayer(layer=>layers.push(layer));
    for(const layer of layers){
      if(isLegacyAreaLayer(layer)){
        container.removeLayer(layer);
        removed++;
      }else if(layer?.eachLayer){
        removed+=purgeContainer(layer);
      }
    }
    return removed;
  }

  function purgeLegacyAreas(){
    if(!state.map||!window.L)return 0;
    let removed=0;

    for(const group of Object.values(state.groups||{})){
      removed+=purgeContainer(group);
    }

    const mapLayers=[];
    state.map.eachLayer(layer=>mapLayers.push(layer));
    for(const layer of mapLayers){
      if(isLegacyAreaLayer(layer)){
        state.map.removeLayer(layer);
        removed++;
      }else if(layer?.eachLayer){
        removed+=purgeContainer(layer);
      }
    }

    for(const record of state.semanticPlots||[]){
      if(isLegacyAreaLayer(record.plot))record.plot=null;
    }
    state.frontageLines=[];
    document.body.classList.remove('real-footprints');
    return removed;
  }

  buildLayers=function(){
    previousBuildLayers();
    purgeLegacyAreas();

    state.map.on('layeradd',event=>{
      const layer=event.layer;
      if(isLegacyAreaLayer(layer)){
        state.map.removeLayer(layer);
        return;
      }
      if(layer?.eachLayer)purgeContainer(layer);
    });

    state.map.on('moveend zoomend',purgeLegacyAreas);
    window.setTimeout(purgeLegacyAreas,250);
    window.setTimeout(purgeLegacyAreas,1200);
    window.setTimeout(purgeLegacyAreas,3500);
  };
})();