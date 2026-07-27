async function init(){
  const loaded=await ensureLeaflet();if(!loaded){showFallback('Both mobile map-library mirrors failed to load.');return}
  state.engine='leaflet';state.renderer=L.canvas({padding:.35,tolerance:8});
  state.map=L.map('map',{preferCanvas:true,renderer:state.renderer,zoomControl:true,attributionControl:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,inertia:true,inertiaDeceleration:3200,worldCopyJump:false,updateWhenZooming:false,tap:true}).setView([52.3695,4.889],13);
  state.tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,minZoom:3,attribution:'&copy; OpenStreetMap contributors',crossOrigin:true,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:3,detectRetina:false,noWrap:true});
  state.tileLayer.on('tileload',()=>{state.tileCount++;if(state.tileCount===1)setStatus('Map ready. GPS, waypoints and address tools are available.','Ready')});
  state.tileLayer.on('tileerror',()=>{if(state.tileCount===0)setStatus('Street tiles are delayed; overlays and navigation controls are still active.','Tiles delayed')});
  state.tileLayer.addTo(state.map);
  buildLayers();renderWaypoints();
  state.map.on('click',e=>{if(state.dropWaypoint){state.dropWaypoint=false;$('dropWaypoint').classList.remove('active');setWaypoint(e.latlng.lat,e.latlng.lng);return}});
  state.map.on('movestart',()=>{state.lastCameraTime=Date.now()});
  setTimeout(()=>{if(state.tileCount===0)setStatus('Street tiles have not arrived. Check data connection; controls remain usable.','Tiles delayed')},12000);
  setTimeout(()=>state.map.invalidateSize(false),100);
}
init().catch(error=>{console.error(error);showFallback('The app hit an unexpected startup error: '+error.message)});
