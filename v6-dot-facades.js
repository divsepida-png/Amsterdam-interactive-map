'use strict';
/* V8: readable, zoom-dependent frontage areas.
   - Overview: one compact R/B area badge per category.
   - Street view: one small point per mapped frontage, snapped to a nearby building edge.
   - Close view: one short solid line per frontage, aligned to the building edge.
   The renderer never draws repeated window blocks, dashed ladders or whole-building fills. */
(function applyReadableFrontagesV8(){
  const V8={cache:new Map(),snapped:new Set(),summaries:[],lastKey:'',loading:false};
  state.frontageRecords=[];

  const css=document.createElement('style');
  css.id='readable-frontages-v8-style';
  css.textContent=`
.semantic-badge:not(.major) .badgeCore{width:18px!important;min-width:18px!important;height:18px!important;padding:0!important;border-radius:50%!important;font-size:6.8px!important;border-width:2px!important}
.semantic-badge.major .badgeCore{border-radius:50%!important}
.frontage-summary-badge .badgeCore{width:20px!important;min-width:20px!important;height:20px!important;border-radius:50%!important;font-size:8px!important;border-width:2px!important}
.frontage-summary-badge .badgeName{display:none!important}
body.zoom-street .semantic-badge:not(.major) .badgeName,body.zoom-close .semantic-badge:not(.major) .badgeName{display:none!important}
body.facade-dot-mode .leaflet-overlay-pane path{shape-rendering:geometricPrecision}
`;
  document.head.appendChild(css);

  const previousCategory=category;
  category=function(item){
    if(item.kind==='red-light')return 'Approximate red-light frontage area';
    if(item.kind==='blue-light')return 'Approximate blue-light reference area';
    return previousCategory(item);
  };

  function bindPlace(layer,item){
    layer.bindPopup(popupHtml(item));
    layer.on('click',()=>selectPlace(item,false));
    return layer;
  }

  function groupNameForKind(kind){return kind==='red-light'?'red':'blue'}

  function midpoint(points){
    return[(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2];
  }

  function ensureLayer(group,layer,visible){
    if(!group||!layer)return;
    const present=group.hasLayer(layer);
    if(visible&&!present)group.addLayer(layer);
    if(!visible&&present)group.removeLayer(layer);
  }

  addSemanticPlace=function(group,item,spec=visualSpec(item)){
    const source=[item.lat,item.lon];
    const halo=spec.major?bindPlace(L.circleMarker(source,{renderer:state.renderer,pane:'overlayPane',radius:14,color:spec.colour,weight:4,opacity:.22,fillColor:spec.colour,fillOpacity:.08,interactive:false}),item):null;
    const badge=bindPlace(L.marker(source,{icon:badgeIcon(item,spec),keyboard:false,riseOnHover:true,zIndexOffset:spec.major?700:400}),item);
    if(halo)group.addLayer(halo);
    group.addLayer(badge);
    const record={plot:null,dot:null,halo,badge,item,spec,source,frontageRecord:false};
    state.semanticPlots.push(record);
    state.semanticBadges.push({badge,item,spec});
    return record;
  };

  addFrontages=function(group,frontages,colour,kind,code){
    const groupName=groupNameForKind(kind);
    const records=[];

    frontages.forEach((frontage,index)=>{
      const source=midpoint(frontage.points);
      const item={
        id:`${kind}-frontage-${index}`,
        name:frontage.name,
        kind,
        lat:source[0],
        lon:source[1],
        note:'Approximate area-level frontage reference. It does not identify individual active windows; locations can change.'
      };
      const spec={colour,text:'#fff',code,group:groupName,major:false};
      const dot=bindPlace(L.circleMarker(source,{renderer:state.renderer,pane:'overlayPane',radius:4.4,color:'#fff',weight:1.6,opacity:.98,fillColor:colour,fillOpacity:.98,interactive:true,bubblingMouseEvents:false}),item);
      group.addLayer(dot);
      const record={plot:dot,dot,halo:null,badge:null,item,spec,source,frontage,frontageRecord:true,groupName,tickLayers:null};
      records.push(record);
      state.frontageRecords.push(record);
      state.semanticPlots.push(record);
    });

    if(records.length){
      const centre=[
        records.reduce((sum,record)=>sum+record.source[0],0)/records.length,
        records.reduce((sum,record)=>sum+record.source[1],0)/records.length
      ];
      const summaryItem={
        id:`${kind}-area-summary`,
        name:kind==='red-light'?'Red-light frontage area':'Blue-light reference area',
        kind,
        lat:centre[0],
        lon:centre[1],
        note:'Overview marker for this approximate frontage area. Zoom in for individual frontage references.'
      };
      const spec={colour,text:'#fff',code,group:groupName,major:false};
      const badge=bindPlace(L.marker(centre,{icon:badgeIcon(summaryItem,spec,'frontage-summary-badge'),keyboard:false,riseOnHover:true,zIndexOffset:520}),summaryItem);
      group.addLayer(badge);
      V8.summaries.push({group,badge,item:summaryItem,spec});
      state.semanticBadges.push({badge,item:summaryItem,spec});
    }
  };

  function updateFrontageVisibility(zoom){
    const summaryMode=zoom<=14;
    const closeMode=zoom>=18;

    for(const summary of V8.summaries)ensureLayer(summary.group,summary.badge,summaryMode);

    for(const record of state.frontageRecords||[]){
      const group=state.groups[record.groupName];
      const hasLine=Boolean(record.tickLayers?.length);
      const showDot=!summaryMode&&(!closeMode||!hasLine);
      ensureLayer(group,record.dot,showDot);
      for(const line of record.tickLayers||[])ensureLayer(group,line,closeMode);
      if(record.dot?.setRadius)record.dot.setRadius(zoom>=16?3.8:4.4);
    }
  }

  updateSemanticZoom=function(){
    if(!state.map)return;
    const zoom=state.map.getZoom();
    document.body.classList.toggle('zoom-city',zoom<=12);
    document.body.classList.toggle('zoom-street',zoom>=16);
    document.body.classList.toggle('zoom-close',zoom>=18);
    for(const record of state.semanticPlots||[]){
      if(record.halo?.setRadius)record.halo.setRadius(zoom<=12?15:12);
    }
    updateFrontageVisibility(zoom);
  };

  function debounce(fn,ms){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),ms)}}
  function pointInPoly(point,poly){let inside=false;const x=point[1],y=point[0];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][1],yi=poly[i][0],xj=poly[j][1],yj=poly[j][0];const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-15)+xi);if(hit)inside=!inside}return inside}
  function metres(point,refLat){return{x:point[1]*111320*Math.cos(refLat*Math.PI/180),y:point[0]*110540}}
  function edgeAngle(a,b,refLat){const aa=metres(a,refLat),bb=metres(b,refLat);return Math.atan2(bb.y-aa.y,bb.x-aa.x)}
  function angleDifference(a,b){let d=Math.abs(a-b)%Math.PI;return d>Math.PI/2?Math.PI-d:d}
  function nearestOnSegment(point,a,b){
    const refLat=point[0],p=metres(point,refLat),aa=metres(a,refLat),bb=metres(b,refLat);const dx=bb.x-aa.x,dy=bb.y-aa.y,den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,((p.x-aa.x)*dx+(p.y-aa.y)*dy)/den)):0;const q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],qm=metres(q,refLat);
    return{point:q,t,d:Math.hypot(p.x-qm.x,p.y-qm.y),edge:[a,b],edgeLength:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)};
  }
  function nearestBuildingEdge(point,buildings,maxDistance,preferredPoints=null){
    let best=null;
    const preferredAngle=preferredPoints?edgeAngle(preferredPoints[0],preferredPoints[1],point[0]):null;
    const containing=buildings.filter(building=>pointInPoly(point,building.poly));
    const pool=containing.length?containing:buildings;
    for(const building of pool){
      const poly=building.poly;
      const edgeCount=poly.length>2&&poly[0][0]===poly[poly.length-1][0]&&poly[0][1]===poly[poly.length-1][1]?poly.length-1:poly.length;
      for(let index=0;index<edgeCount;index++){
        const a=poly[index],b=poly[(index+1)%poly.length];
        const hit=nearestOnSegment(point,a,b);
        if(hit.d>maxDistance)continue;
        const orientationPenalty=preferredAngle===null?0:Math.sin(angleDifference(preferredAngle,hit.angle))*18;
        const score=hit.d+orientationPenalty;
        if(!best||score<best.score)best={...hit,building,score};
      }
    }
    return best;
  }
  function shortSegment(hit,lengthMetres){
    const [a,b]=hit.edge,edgeLength=Math.max(hit.edgeLength,.01),half=Math.min(lengthMetres/2,edgeLength/2),dt=half/edgeLength,t1=Math.max(0,hit.t-dt),t2=Math.min(1,hit.t+dt);
    return[[a[0]+(b[0]-a[0])*t1,a[1]+(b[1]-a[1])*t1],[a[0]+(b[0]-a[0])*t2,a[1]+(b[1]-a[1])*t2]];
  }
  function resetRecord(record){
    record.dot?.setLatLng(record.source);
    record.halo?.setLatLng?.(record.source);
    record.badge?.setLatLng?.(record.source);
  }
  function clearFrontageLines(){
    for(const record of state.frontageRecords||[]){
      const group=state.groups[record.groupName];
      for(const layer of record.tickLayers||[])group?.removeLayer(layer);
      record.tickLayers=null;
    }
  }
  function resetToOverview(){
    clearFrontageLines();
    for(const record of V8.snapped)resetRecord(record);
    V8.snapped.clear();
    document.body.classList.remove('facade-dot-mode');
    updateSemanticZoom();
  }
  function overpassQuery(bounds){const s=bounds.getSouth().toFixed(5),w=bounds.getWest().toFixed(5),n=bounds.getNorth().toFixed(5),e=bounds.getEast().toFixed(5);return`[out:json][timeout:18];way[building](${s},${w},${n},${e});out geom tags;`}
  async function fetchBuildings(query){
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let lastError;
    for(const endpoint of endpoints){
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});
        if(!response.ok)throw new Error('HTTP '+response.status);
        return await response.json();
      }catch(error){lastError=error}
    }
    throw lastError;
  }
  async function refreshFacades(){
    if(!state.map)return;
    const zoom=state.map.getZoom();
    if(zoom<16){resetToOverview();V8.lastKey='';return}
    if(V8.loading)return;
    const bounds=state.map.getBounds().pad(.15),centre=bounds.getCenter(),key=`${zoom}:${centre.lat.toFixed(3)}:${centre.lng.toFixed(3)}`;
    if(key===V8.lastKey){updateSemanticZoom();return}
    V8.lastKey=key;V8.loading=true;
    try{
      let data=V8.cache.get(key);
      if(!data){data=await fetchBuildings(overpassQuery(bounds));V8.cache.set(key,data);if(V8.cache.size>8)V8.cache.delete(V8.cache.keys().next().value)}
      drawFacades(data,zoom);
      setStatus(zoom>=18?'Close view: each frontage is shown once as a thin building-edge line. Individual windows are not claimed.':'Street view: compact frontage points are snapped to nearby building fronts.','Ready');
    }catch(error){
      console.warn('V8 façade geometry unavailable',error);
      resetToOverview();
      setStatus('Building-front data unavailable; compact area markers remain visible without blocks or strips.','Fallback');
    }finally{V8.loading=false}
  }
  function drawFacades(data,zoom){
    clearFrontageLines();
    for(const record of V8.snapped)resetRecord(record);
    V8.snapped.clear();

    const buildings=(data.elements||[])
      .filter(element=>element.type==='way'&&element.tags?.building&&Array.isArray(element.geometry)&&element.geometry.length>2)
      .map(element=>({id:element.id,poly:element.geometry.map(point=>[point.lat,point.lon])}));
    const visibleBounds=state.map.getBounds().pad(.08);

    for(const record of state.semanticPlots||[]){
      if(!record.item||!record.source||!visibleBounds.contains(record.source))continue;
      const hit=nearestBuildingEdge(record.source,buildings,record.frontageRecord?30:35,record.frontageRecord?record.frontage.points:null);
      if(!hit)continue;
      record.dot?.setLatLng(hit.point);
      record.halo?.setLatLng?.(hit.point);
      record.badge?.setLatLng?.(hit.point);
      V8.snapped.add(record);

      if(!record.frontageRecord||zoom<18)continue;
      const group=state.groups[record.groupName];
      if(!group)continue;
      const segment=shortSegment(hit,record.item.kind==='red-light'?7:6);
      const outer=L.polyline(segment,{renderer:state.renderer,color:'#fff',weight:4.2,opacity:.96,interactive:false,bubblingMouseEvents:false});
      const inner=bindPlace(L.polyline(segment,{renderer:state.renderer,color:record.spec.colour,weight:2.1,opacity:1,interactive:true,bubblingMouseEvents:false}),record.item);
      group.addLayer(outer);
      group.addLayer(inner);
      record.tickLayers=[outer,inner];
    }

    document.body.classList.add('facade-dot-mode');
    updateSemanticZoom();
  }

  function updateInterfaceCopy(){
    const mapKey=[...document.querySelectorAll('.mapKeyChip')];
    for(const chip of mapKey){
      if(chip.textContent.includes('R Windows'))chip.textContent='R Area';
      if(chip.textContent.includes('B Windows'))chip.textContent='B Area';
    }
    const redToggle=document.querySelector('[data-layer="red"] span');
    const blueToggle=document.querySelector('[data-layer="blue"] span');
    if(redToggle)redToggle.textContent='Red-light frontage areas — red R';
    if(blueToggle)blueToggle.textContent='Blue-light reference areas — blue B';
    const locateCard=document.querySelector('#panel-locate .card');
    if(locateCard)locateCard.innerHTML='<strong>Readable frontage mode</strong><small>Overview zooms show one compact area badge. Street zoom shows one point per approximate frontage, snapped to a nearby building edge. Close zoom replaces each point with one short solid façade line—never repeated blocks or dashed strips.</small>';
    const layerCard=document.querySelector('#panel-layers .card');
    if(layerCard)layerCard.innerHTML='<strong>Three-level frontage display</strong><small>Area badge at overview zoom, one frontage point at street zoom, and one short solid building-edge line at close zoom. The map does not claim to show individual active windows.</small>';
  }
  updateInterfaceCopy();

  const v5BuildLayers=buildLayers;
  buildLayers=function(){
    const nativeSetTimeout=window.setTimeout,nativeMapOn=state.map.on;
    window.setTimeout=function(fn,delay,...args){if(fn?.name==='refreshOsmGeometry')return-1;return nativeSetTimeout.call(window,fn,delay,...args)};
    state.map.on=function(types,fn,context){if(types==='moveend zoomend')return this;return nativeMapOn.call(this,types,fn,context)};
    try{v5BuildLayers()}finally{window.setTimeout=nativeSetTimeout;state.map.on=nativeMapOn}
    updateInterfaceCopy();
    state.map.on('moveend zoomend',debounce(refreshFacades,650));
    nativeSetTimeout.call(window,refreshFacades,650);
    updateSemanticZoom();
  };
})();
