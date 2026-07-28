/* V5: real OSM building contours + nearby pubs/convenience shops. */
(function(){
const V5={cache:new Map(),footprints:null,livePoi:null,lastKey:'',loading:false};
const PUBS=[
{id:'cafe-hoppe',name:'Café Hoppe',kind:'pub',symbol:'PUB',address:'Spui 18-20',lat:52.36868,lon:4.88945,note:'Historic brown café.'},
{id:'cafe-de-dokter',name:'Café de Dokter',kind:'pub',symbol:'PUB',address:'Rozenboomsteeg 4',lat:52.37054,lon:4.88991,note:'Tiny historic Amsterdam bar.'},
{id:'proeflokaal-arendsnest',name:"Proeflokaal Arendsnest",kind:'pub',symbol:'PUB',address:'Herengracht 90',lat:52.37661,lon:4.88691,note:'Dutch beer bar.'},
{id:'waterhole',name:'The Waterhole',kind:'bar',symbol:'BAR',address:'Korte Leidsedwarsstraat 49',lat:52.36389,lon:4.88348,note:'Live-music bar.'},
{id:'molly-malone',name:"Molly Malone's Irish Pub",kind:'pub',symbol:'PUB',address:'Oudezijds Kolk 9',lat:52.37679,lon:4.90091,note:'Irish pub near Centraal.'}
];
const SHOPS=[
{id:'spar-weteringschans',name:'SPAR city Weteringschans',kind:'convenience',symbol:'SP',address:'Weteringschans 165',lat:52.36069,lon:4.88696,note:'Convenience food, drinks and sandwich options.'},
{id:'spar-nieuwezijds',name:'SPAR city Nieuwezijds',kind:'convenience',symbol:'SP',address:'Nieuwezijds Voorburgwal 55',lat:52.37577,lon:4.89272,note:'Convenience food and snacks.'},
{id:'albert-heijn-jodenbreestraat',name:'Albert Heijn Jodenbreestraat',kind:'supermarket',symbol:'AH',address:'Jodenbreestraat 21',lat:52.36942,lon:4.90309,note:'Supermarket for cheap snacks, drinks and meal deals.'},
{id:'albert-heijn-museumplein',name:'Albert Heijn Museumplein',kind:'supermarket',symbol:'AH',address:'Cornelis Schuytstraat area',lat:52.35702,lon:4.87765,note:'Supermarket near Museumplein.'},
{id:'dirk-warmoesstraat',name:'Dirk van den Broek Warmoesstraat',kind:'supermarket',symbol:'DK',address:'Warmoesstraat 120',lat:52.37480,lon:4.89711,note:'Budget supermarket.'}
];
DATA.bars=[...(DATA.bars||[]),...PUBS];DATA.shops=[...(DATA.shops||[]),...SHOPS];
const oldAllPlaces=allPlaces;allPlaces=()=>[...oldAllPlaces(),...DATA.bars,...DATA.shops];
const oldVisualSpec=visualSpec;visualSpec=function(item){
 if(item.kind==='pub'||item.kind==='bar')return {colour:'#b83b2f',text:'#fff',code:item.kind==='pub'?'PUB':'BAR',group:'bars',w:20,h:14};
 if(item.kind==='supermarket'||item.kind==='convenience')return {colour:'#1b8fda',text:'#fff',code:item.symbol||'SHOP',group:'shops',w:20,h:14};
 return oldVisualSpec(item)
};
const oldCategory=category;category=function(item){if(item.kind==='pub'||item.kind==='bar')return 'Bar / pub';if(item.kind==='supermarket'||item.kind==='convenience')return 'Low-cost grocery / convenience shop';return oldCategory(item)};
const layerPanel=document.getElementById('panel-layers');
if(layerPanel){
 const anchor=layerPanel.querySelector('[data-layer="transit"]');
 const bars=document.createElement('button');bars.className='toggle on';bars.dataset.layer='bars';bars.innerHTML='<span>Bars and pubs — brick red PUB/BAR</span><b>✓</b>';
 const shops=document.createElement('button');shops.className='toggle on';shops.dataset.layer='shops';shops.innerHTML='<span>Budget supermarkets and convenience shops — blue SHOP</span><b>✓</b>';
 anchor?.before(bars,shops);
 const legend=layerPanel.querySelector('.legend');if(legend)legend.insertAdjacentHTML('beforeend','<i style="background:#b83b2f"></i><span>Bar / pub — PUB or BAR</span><i style="background:#1b8fda"></i><span>Budget supermarket / convenience shop</span>');
}
Object.assign(state.visible,{bars:true,shops:true});
const oldBuild=buildLayers;buildLayers=function(){
 oldBuild();
 const bars=makeGroup('bars');DATA.bars.forEach(x=>addSemanticPlace(bars,x));
 const shops=makeGroup('shops');DATA.shops.forEach(x=>addSemanticPlace(shops,x));
 bindNewToggles();
 setTimeout(refreshOsmGeometry,700);
 state.map.on('moveend zoomend',debounce(refreshOsmGeometry,700));
};
function bindNewToggles(){document.querySelectorAll('.toggle').forEach(b=>{if(b.dataset.v5Bound)return;b.dataset.v5Bound='1';b.onclick=()=>{const k=b.dataset.layer;state.visible[k]=!state.visible[k];b.classList.toggle('on',state.visible[k]);b.querySelector('b').textContent=state.visible[k]?'✓':'×';const g=state.groups[k];if(g){state.visible[k]?g.addTo(state.map):state.map.removeLayer(g)}}})}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function pointInPoly(point,poly){let inside=false;const x=point[1],y=point[0];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][1],yi=poly[i][0],xj=poly[j][1],yj=poly[j][0];const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-15)+xi);if(hit)inside=!inside}return inside}
function centroid(poly){let a=0,x=0,y=0;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const f=poly[j][1]*poly[i][0]-poly[i][1]*poly[j][0];a+=f;x+=(poly[j][1]+poly[i][1])*f;y+=(poly[j][0]+poly[i][0])*f}a*=.5;if(Math.abs(a)<1e-12)return poly[0];return [y/(6*a),x/(6*a)]}
function dist(a,b){return distance({lat:a[0],lon:a[1]},{lat:b[0],lon:b[1]})}
function overpassQuery(bounds){const s=bounds.getSouth().toFixed(5),w=bounds.getWest().toFixed(5),n=bounds.getNorth().toFixed(5),e=bounds.getEast().toFixed(5);return `[out:json][timeout:18];(way[building](${s},${w},${n},${e});nwr[amenity~"^(bar|pub)$"](${s},${w},${n},${e});nwr[shop~"^(supermarket|convenience)$"](${s},${w},${n},${e}););out center geom tags;`}
async function fetchOverpass(q){const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let last;for(const ep of endpoints){try{const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){last=e}}throw last}
async function refreshOsmGeometry(){
 if(!state.map||state.map.getZoom()<16||V5.loading)return;
 const b=state.map.getBounds().pad(.15);const c=b.getCenter();const key=`${state.map.getZoom()}:${c.lat.toFixed(3)}:${c.lng.toFixed(3)}`;if(key===V5.lastKey)return;V5.lastKey=key;V5.loading=true;
 try{
  let data=V5.cache.get(key);if(!data){data=await fetchOverpass(overpassQuery(b));V5.cache.set(key,data);if(V5.cache.size>8)V5.cache.delete(V5.cache.keys().next().value)}
  drawRealFootprints(data);
  setStatus('Street geometry loaded: real building contours preserve roads and paths.','Ready');
 }catch(e){console.warn('OSM geometry unavailable',e);setStatus('Real building outlines unavailable; semantic fallback plots remain active.','Fallback')}
 finally{V5.loading=false}
}
function drawRealFootprints(data){
 if(V5.footprints)state.map.removeLayer(V5.footprints);if(V5.livePoi)state.map.removeLayer(V5.livePoi);
 V5.footprints=L.layerGroup().addTo(state.map);V5.livePoi=L.layerGroup().addTo(state.map);
 const buildings=(data.elements||[]).filter(e=>e.type==='way'&&e.tags?.building&&Array.isArray(e.geometry)&&e.geometry.length>2).map(e=>({poly:e.geometry.map(g=>[g.lat,g.lon]),tags:e.tags,id:e.id}));
 const mapped=allPlaces().filter(x=>x.lat&&x.lon&&visualSpec(x).group!=='transit');
 for(const item of mapped){const p=[item.lat,item.lon];let candidates=buildings.filter(b=>pointInPoly(p,b.poly));if(!candidates.length)candidates=buildings.map(b=>({b,d:dist(p,centroid(b.poly))})).filter(x=>x.d<35).sort((a,b)=>a.d-b.d).slice(0,1).map(x=>x.b);const building=candidates[0];if(!building)continue;const spec=visualSpec(item);const layer=L.polygon(building.poly,{renderer:state.renderer,color:'#fff',weight:2.2,fillColor:spec.colour,fillOpacity:.88,interactive:true,bubblingMouseEvents:false}).bindPopup(popupHtml(item));layer.on('click',()=>selectPlace(item,false));layer.addTo(V5.footprints)}
 for(const e of data.elements||[]){const tags=e.tags||{};let kind=null;if(tags.amenity==='pub'||tags.amenity==='bar')kind=tags.amenity;else if(tags.shop==='supermarket'||tags.shop==='convenience')kind=tags.shop;if(!kind)continue;const lat=e.lat??e.center?.lat??e.geometry?.[0]?.lat,lon=e.lon??e.center?.lon??e.geometry?.[0]?.lon;if(!lat||!lon)continue;const item={id:'osm-'+e.type+'-'+e.id,name:tags.name||((kind==='pub'||kind==='bar')?'Unnamed bar/pub':'Convenience shop'),kind,lat,lon,address:[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' '),note:'Live OpenStreetMap result.'};const spec=visualSpec(item);L.marker([lat,lon],{icon:badgeIcon(item,spec),zIndexOffset:350}).bindPopup(popupHtml(item)).on('click',()=>selectPlace(item,false)).addTo(V5.livePoi)}
 document.body.classList.add('real-footprints');
}
const css=document.createElement('style');css.textContent=`body.real-footprints.zoom-street .leaflet-overlay-pane path[fill]{shape-rendering:geometricPrecision}.semantic-badge .badgeCore{outline:1px solid rgba(0,0,0,.55)}.semantic-badge.major .badgeCore{outline:2px solid #111}`;document.head.appendChild(css);
})();
