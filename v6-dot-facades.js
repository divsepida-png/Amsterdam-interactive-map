'use strict';
/* V6: replace abstract blocks and whole-building fills with compact dots and façade-snapped ticks. */
(function applyDotFacadeV6(){
  const V6={cache:new Map(),ticks:[],snapped:new Set(),lastKey:'',loading:false};
  const css=document.createElement('style');
  css.id='dot-facade-v6-style';
  css.textContent=`
.semantic-badge:not(.major) .badgeCore{width:18px!important;min-width:18px!important;height:18px!important;padding:0!important;border-radius:50%!important;font-size:6.8px!important;border-width:2px!important}
.semantic-badge.major .badgeCore{border-radius:50%!important}
.frontage-badge .badgeCore{width:18px!important;min-width:18px!important;height:18px!important;border-radius:50%!important}
body.zoom-street .semantic-badge:not(.major) .badgeName,body.zoom-close .semantic-badge:not(.major) .badgeName{display:none!important}
body.facade-dot-mode .leaflet-overlay-pane path{shape-rendering:geometricPrecision}
`;
  document.head.appendChild(css);

  function bindDot(layer,item){layer.bindPopup(popupHtml(item));layer.on('click',()=>selectPlace(item,false));return layer}

  addSemanticPlace=function(group,item,spec=visualSpec(item)){
    const source=[item.lat,item.lon];
    const halo=spec.major?bindDot(L.circleMarker(source,{renderer:state.renderer,pane:'overlayPane',radius:14,color:spec.colour,weight:4,opacity:.22,fillColor:spec.colour,fillOpacity:.08,interactive:false}),item):null;
    const badge=bindDot(L.marker(source,{icon:badgeIcon(item,spec),keyboard:false,riseOnHover:true,zIndexOffset:spec.major?700:400}),item);
    if(halo)group.addLayer(halo);group.addLayer(badge);
    const record={plot:null,dot:null,halo,badge,item,spec,source};
    state.semanticPlots.push(record);state.semanticBadges.push({badge,item,spec});return record;
  };

  addFrontages=function(group,frontages,colour,kind,code){
    let n=0;
    for(const frontage of frontages){
      const a={lat:frontage.points[0][0],lon:frontage.points[0][1]},b={lat:frontage.points[1][0],lon:frontage.points[1][1]};
      const count=Math.max(1,Math.ceil(distance(a,b)/13));const records=[];
      for(let i=0;i<count;i++){
        const t=(i+.5)/count;
        const item={id:`${kind}-${n}-${i}`,name:frontage.name,kind,lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t,note:'Approximate public frontage reference; active individual windows can change.'};
        const source=[item.lat,item.lon];
        const dot=bindDot(L.circleMarker(source,{renderer:state.renderer,pane:'overlayPane',radius:4.2,color:'#fff',weight:1.7,fillColor:colour,fillOpacity:.98,interactive:true,bubblingMouseEvents:false}),item);
        group.addLayer(dot);
        const record={plot:dot,dot,halo:null,badge:null,item,spec:{colour,text:'#fff',code,group:kind==='red-light'?'red':'blue',major:false},source};
        records.push(record);state.semanticPlots.push(record);state.frontageDots.push(record);
      }
      const middle=records[Math.floor(records.length/2)];
      if(middle){
        const badge=bindDot(L.marker(middle.source,{icon:badgeIcon(middle.item,middle.spec,'frontage-badge'),keyboard:false,riseOnHover:true,zIndexOffset:500}),middle.item);
        group.addLayer(badge);middle.badge=badge;state.semanticBadges.push({badge,item:middle.item,spec:middle.spec});
      }
      n++;
    }
  };

  updateSemanticZoom=function(){
    if(!state.map)return;
    const z=state.map.getZoom();
    document.body.classList.toggle('zoom-city',z<=12);
    document.body.classList.toggle('zoom-street',z>=16);
    document.body.classList.toggle('zoom-close',z>=18);
    for(const record of state.semanticPlots||[]){
      if(record.dot?.setRadius){
        const frontage=record.item?.kind==='red-light'||record.item?.kind==='blue-light';
        record.dot.setRadius(frontage?(z>=18?3.1:4.1):(record.spec?.major?9:4.5));
      }
      if(record.halo?.setRadius)record.halo.setRadius(z<=12?15:12);
    }
  };

  function debounce(fn,ms){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),ms)}}
  function pointInPoly(point,poly){let inside=false;const x=point[1],y=point[0];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][1],yi=poly[i][0],xj=poly[j][1],yj=poly[j][0];const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-15)+xi);if(hit)inside=!inside}return inside}
  function metres(point,refLat){return{x:point[1]*111320*Math.cos(refLat*Math.PI/180),y:point[0]*110540}}
  function nearestOnSegment(point,a,b){
    const refLat=point[0],p=metres(point,refLat),aa=metres(a,refLat),bb=metres(b,refLat);const dx=bb.x-aa.x,dy=bb.y-aa.y,den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,((p.x-aa.x)*dx+(p.y-aa.y)*dy)/den)):0;const q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],qm=metres(q,refLat);
    return{point:q,t,d:Math.hypot(p.x-qm.x,p.y-qm.y),edge:[a,b],edgeLength:Math.hypot(dx,dy)};
  }
  function nearestBuildingEdge(point,buildings,maxDistance){
    let best=null;const containing=buildings.filter(building=>pointInPoly(point,building.poly));const pool=containing.length?containing:buildings;
    for(const building of pool){for(let i=0;i<building.poly.length-1;i++){const hit=nearestOnSegment(point,building.poly[i],building.poly[i+1]);if(!best||hit.d<best.d)best={...hit,building}}}
    return best&&best.d<=maxDistance?best:null;
  }
  function shortSegment(hit,lengthMetres){
    const [a,b]=hit.edge,edgeLength=Math.max(hit.edgeLength,.01),half=Math.min(lengthMetres/2,edgeLength/2),dt=half/edgeLength,t1=Math.max(0,hit.t-dt),t2=Math.min(1,hit.t+dt);
    return[[a[0]+(b[0]-a[0])*t1,a[1]+(b[1]-a[1])*t1],[a[0]+(b[0]-a[0])*t2,a[1]+(b[1]-a[1])*t2]];
  }
  function recordGroup(record){if(record.item.kind==='red-light')return'red';if(record.item.kind==='blue-light')return'blue';return record.spec?.group||visualSpec(record.item).group}
  function resetRecord(record){record.dot?.setLatLng(record.source);record.halo?.setLatLng?.(record.source);record.badge?.setLatLng?.(record.source)}
  function clearTicks(){for(const tick of V6.ticks){const group=state.groups[tick.group];for(const layer of tick.layers)group?.removeLayer(layer)}V6.ticks=[]}
  function resetToDots(){clearTicks();for(const record of V6.snapped)resetRecord(record);V6.snapped.clear();document.body.classList.remove('facade-dot-mode')}
  function overpassQuery(bounds){const s=bounds.getSouth().toFixed(5),w=bounds.getWest().toFixed(5),n=bounds.getNorth().toFixed(5),e=bounds.getEast().toFixed(5);return`[out:json][timeout:18];way[building](${s},${w},${n},${e});out geom tags;`}
  async function fetchBuildings(query){
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let lastError;
    for(const endpoint of endpoints){try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});if(!response.ok)throw new Error('HTTP '+response.status);return await response.json()}catch(error){lastError=error}}
    throw lastError;
  }
  async function refreshFacades(){
    if(!state.map)return;
    const zoom=state.map.getZoom();
    if(zoom<16){resetToDots();V6.lastKey='';return}
    if(V6.loading)return;
    const bounds=state.map.getBounds().pad(.15),centre=bounds.getCenter(),key=`${zoom}:${centre.lat.toFixed(3)}:${centre.lng.toFixed(3)}`;
    if(key===V6.lastKey)return;V6.lastKey=key;V6.loading=true;
    try{
      let data=V6.cache.get(key);if(!data){data=await fetchBuildings(overpassQuery(bounds));V6.cache.set(key,data);if(V6.cache.size>8)V6.cache.delete(V6.cache.keys().next().value)}
      drawFacades(data,zoom);
      setStatus(zoom>=18?'Close view: dots are pinned to building fronts with short façade ticks.':'Street view: dots are pinned to the nearest building fronts.','Ready');
    }catch(error){console.warn('V6 façade geometry unavailable',error);resetToDots();setStatus('Building-front data unavailable; compact dots remain visible without blocks.','Fallback')}
    finally{V6.loading=false}
  }
  function drawFacades(data,zoom){
    resetToDots();
    const buildings=(data.elements||[]).filter(element=>element.type==='way'&&element.tags?.building&&Array.isArray(element.geometry)&&element.geometry.length>2).map(element=>({id:element.id,poly:element.geometry.map(point=>[point.lat,point.lon])}));
    const visibleBounds=state.map.getBounds().pad(.08),drawTicks=zoom>=18;
    for(const record of state.semanticPlots||[]){
      if(!record.item||!record.source||!visibleBounds.contains(record.source))continue;
      const frontage=record.item.kind==='red-light'||record.item.kind==='blue-light',hit=nearestBuildingEdge(record.source,buildings,frontage?24:35);if(!hit)continue;
      record.dot?.setLatLng(hit.point);record.halo?.setLatLng?.(hit.point);record.badge?.setLatLng?.(hit.point);V6.snapped.add(record);
      if(!drawTicks)continue;
      const groupName=recordGroup(record),group=state.groups[groupName];if(!group)continue;
      const segment=shortSegment(hit,frontage?5.5:3.5),colour=record.spec?.colour||visualSpec(record.item).colour;
      const outer=L.polyline(segment,{renderer:state.renderer,color:'#fff',weight:frontage?5:4,opacity:.96,interactive:false});
      const inner=L.polyline(segment,{renderer:state.renderer,color:colour,weight:frontage?2.5:2,opacity:1,interactive:false});
      group.addLayer(outer);group.addLayer(inner);V6.ticks.push({group:groupName,layers:[outer,inner]});
    }
    document.body.classList.add('facade-dot-mode');
  }

  const v5BuildLayers=buildLayers;
  buildLayers=function(){
    const nativeSetTimeout=window.setTimeout,nativeMapOn=state.map.on;
    window.setTimeout=function(fn,delay,...args){if(fn?.name==='refreshOsmGeometry')return-1;return nativeSetTimeout.call(window,fn,delay,...args)};
    state.map.on=function(types,fn,context){if(types==='moveend zoomend')return this;return nativeMapOn.call(this,types,fn,context)};
    try{v5BuildLayers()}finally{window.setTimeout=nativeSetTimeout;state.map.on=nativeMapOn}
    const layerCard=document.querySelector('#panel-layers .card');if(layerCard)layerCard.innerHTML='<strong>Dot and façade display</strong><small>Low and medium zooms use dots only. From zoom 16, dots snap to real building edges. From zoom 18, short thin ticks show frontage orientation without filling buildings.</small>';
    state.map.on('moveend zoomend',debounce(refreshFacades,650));
    nativeSetTimeout.call(window,refreshFacades,650);updateSemanticZoom();
  };
})();
