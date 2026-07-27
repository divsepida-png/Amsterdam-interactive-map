'use strict';
// Amsterdam Semantic Buildings V4 patch. Loaded after app modules 1–4 and before init.
(function applySemanticV4(){
  const style=document.createElement('style');
  style.id='semantic-v4-style';
  style.textContent="/* V4 semantic map hierarchy: readable category beacons at every permitted zoom,\n   abstract coloured building plots at street scale, and dominant major landmarks. */\n.leaflet-tile-pane{filter:saturate(.52) contrast(1.06) brightness(1.08)}\n#mapKey{position:absolute;z-index:790;top:8px;left:52px;right:8px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px;pointer-events:auto}\n#mapKey::-webkit-scrollbar{display:none}\n.mapKeyChip{flex:0 0 auto;border:2px solid #fff;background:var(--chip);color:#fff;border-radius:999px;padding:4px 7px;font-size:8.5px;font-weight:950;letter-spacing:.02em;box-shadow:0 2px 7px rgba(0,0,0,.32)}\n.semantic-badge{background:transparent!important;border:0!important;overflow:visible!important}\n.semantic-badge .badgeWrap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;white-space:nowrap;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}\n.semantic-badge .badgeCore{display:grid;place-items:center;min-width:23px;height:23px;padding:0 4px;border-radius:7px;background:var(--poi);color:var(--poiText,#fff);border:2px solid #fff;font-size:8.5px;line-height:1;font-weight:1000;box-shadow:0 0 0 1px rgba(0,0,0,.38)}\n.semantic-badge.major .badgeCore{min-width:34px;height:34px;border-width:3px;border-radius:10px;font-size:11px;box-shadow:0 0 0 2px rgba(255,212,0,.85),0 4px 12px rgba(0,0,0,.42)}\n.semantic-badge .badgeName{display:none;max-width:150px;overflow:hidden;text-overflow:ellipsis;background:rgba(7,23,39,.94);color:#fff;border:1px solid rgba(255,255,255,.8);border-radius:6px;padding:3px 5px;font-size:8.5px;font-weight:900;line-height:1.15}\n.semantic-badge.major .badgeName{display:block;max-width:125px}\nbody.zoom-street .semantic-badge .badgeName{display:block}\nbody.zoom-street .semantic-badge.major .badgeName{max-width:170px;font-size:9.5px}\nbody.zoom-close .semantic-badge .badgeCore{transform:scale(.9)}\nbody.zoom-city .semantic-badge:not(.major) .badgeCore{min-width:20px;height:20px;font-size:7.5px;border-radius:6px}\nbody.zoom-city .semantic-badge.major .badgeName{max-width:95px;font-size:7.5px}\n.frontage-badge .badgeCore{border-radius:4px;min-width:24px;height:20px}\n.leaflet-marker-icon.semantic-badge{pointer-events:auto}\n@media(max-width:420px){#mapKey{left:48px}.mapKeyChip{font-size:7.5px;padding:3px 6px}.semantic-badge.major .badgeName{max-width:90px}}\n@media(min-width:700px){#mapKey{right:calc(var(--dock-w) + 8px)}}";
  document.head.appendChild(style);
  const wrap=document.getElementById('mapWrap');
  if(wrap&&!document.getElementById('mapKey'))wrap.insertAdjacentHTML('beforeend',"<div id=\"mapKey\" aria-label=\"Map category key\">\n  <span class=\"mapKeyChip\" style=\"--chip:#00a8cc\">M Museum</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#ff7a00\">A Activity</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#ffd400;color:#111\">£ Value food</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#00a65a\">C Coffeeshop</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#ef3aa8\">T Smartshop</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#7b4ee8\">18 Adult</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#e21c32\">R Windows</span>\n  <span class=\"mapKeyChip\" style=\"--chip:#087df0\">B Windows</span>\n</div>");
  const layers=document.getElementById('panel-layers');
  if(layers)layers.innerHTML="<h2>Semantic building layers</h2>\n<div class=\"card\"><strong>Two-scale display</strong><small>Every place has an always-visible colour badge. At street zoom, the mapped position resolves into a coloured abstract building plot. Major places remain larger than minor places.</small></div>\n<button class=\"toggle on\" data-layer=\"red\"><span>Red-light windows — red R</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"blue\"><span>Blue-light windows — blue B</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"coffee\"><span>Cannabis coffeeshops — green C</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"smart\"><span>Smartshops — pink T</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"food\"><span>Best-value cuisine — yellow cuisine code</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"adult\"><span>Adult museums, shops and shows</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"museums\"><span>Normal museums and galleries — cyan M</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"activities\"><span>Activities, parks and markets</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"landmarks\"><span>Historic, major and minor landmarks</span><b>✓</b></button>\n<button class=\"toggle on\" data-layer=\"transit\"><span>Hotel transport routes</span><b>✓</b></button>\n<button class=\"toggle\" data-layer=\"accuracy\"><span>GPS accuracy circle</span><b>×</b></button>\n<h3>Colour and symbol key</h3>\n<div class=\"legend\">\n  <i style=\"background:#0b55d9\"></i><span>Major landmark — enlarged, white ★/code</span>\n  <i style=\"background:#66798a\"></i><span>Minor landmark / public area — smaller L</span>\n  <i style=\"background:#00a8cc\"></i><span>Normal museum or gallery — M</span>\n  <i style=\"background:#ff7a00\"></i><span>Visitor activity / attraction — A</span>\n  <i style=\"background:#61b832\"></i><span>Park, garden or zoo — P</span>\n  <i style=\"background:#e5a900\"></i><span>Market / shopping activity — MK</span>\n  <i style=\"background:#8b5a2b\"></i><span>Historic or religious place — H</span>\n  <i style=\"background:#e21c32\"></i><span>Red-light frontage — R</span>\n  <i style=\"background:#087df0\"></i><span>Blue-light reference frontage — B</span>\n  <i style=\"background:#00a65a\"></i><span>Licensed cannabis coffeeshop — C</span>\n  <i style=\"background:#ef3aa8\"></i><span>Smartshop / truffle retailer — T</span>\n  <i style=\"background:#ffd400\"></i><span>Strong-value food — cuisine code</span>\n  <i style=\"background:#7b4ee8\"></i><span>Adult museum — 18M</span>\n  <i style=\"background:#d62583\"></i><span>Adult / fetish shop — 18S</span>\n  <i style=\"background:#ff5e1a\"></i><span>Adult show / attraction — 18A</span>\n</div>\n<div class=\"card\"><strong>Map accuracy</strong><small>Coloured plots are deliberately abstract and centred on the mapped address or frontage. They improve navigation readability but are not cadastral building surveys or a live record of occupied windows.</small></div>\n<div class=\"card\"><strong>Respect and legality</strong><small>Adult and regulated venues are 18+. Carry ID, follow Dutch law and staff guidance, and never photograph sex workers or their windows.</small></div>";
  const smooth=document.querySelector('#panel-locate .card');
  if(smooth)smooth.innerHTML='<strong>Semantic Android mode</strong><small>Every category remains visible through fixed-size colour badges; street zoom reveals abstract address-centred building plots. Zoom animations and tile fades remain disabled.</small>';
  Object.assign(state.visible,{museums:true,activities:true});
  state.semanticPlots=[];state.semanticBadges=[];state.frontageLines=[];
})();

const V4_MUSEUM_IDS=new Set(['rijksmuseum','van-gogh','stedelijk','nemo','maritime','eye','hart','moco','jewish-museum']);
const V4_ACTIVITY_IDS=new Set(['heineken','adam','foodhallen','dungeon','body-worlds','ripleys']);
const V4_PARK_IDS=new Set(['artis','hortus','vondelpark']);
const V4_MARKET_IDS=new Set(['bloemenmarkt','waterlooplein','albert-cuyp','nine-streets']);
const V4_HISTORIC_IDS=new Set(['royal-palace','anne-frank','oude-kerk','westerkerk','begijnhof','synagogue','nieuwmarkt','national-monument','magere-brug']);
function landmarkType(item){
  if(V4_MUSEUM_IDS.has(item.id))return 'museum';
  if(V4_ACTIVITY_IDS.has(item.id))return 'activity';
  if(V4_PARK_IDS.has(item.id))return 'park';
  if(V4_MARKET_IDS.has(item.id))return 'market';
  if(V4_HISTORIC_IDS.has(item.id))return 'historic';
  return 'landmark';
}
function categoryV4(item){
  if(item.kind==='coffeeshop')return 'Licensed cannabis coffeeshop · 18+';
  if(item.kind==='smartshop')return 'Smartshop / legal truffle retailer · 18+';
  if(item.kind==='value-food')return `Strong-value cuisine · ${item.cuisine||''}`;
  if(item.kind==='adult-museum')return 'Sex / erotic museum · 18+';
  if(item.kind==='adult-shop')return 'Adult / fetish shop · 18+';
  if(item.kind==='adult-show')return 'Adult show / attraction · 18+';
  if(item.kind==='red-light')return 'Approximate red-light window frontage';
  if(item.kind==='blue-light')return 'Approximate blue-light reference frontage';
  if(item.importance){const t=landmarkType(item);const names={museum:'Museum / gallery',activity:'Visitor activity / attraction',park:'Park, garden or zoo',market:'Market / shopping activity',historic:'Historic / religious place',landmark:item.importance==='major'?'Major landmark':'Minor landmark / public area'};return `${names[t]}${item.importance==='major'?' · major':''}`}
  if(item.kind==='transport-stop')return 'Hotel transport stop';
  return item.kind||'Place';
}
function visualSpec(item){
  if(item.kind==='coffeeshop')return {colour:'#00a65a',text:'#fff',code:'C',group:'coffee',w:20,h:14};
  if(item.kind==='smartshop')return {colour:'#ef3aa8',text:'#fff',code:'T',group:'smart',w:20,h:14};
  if(item.kind==='value-food')return {colour:'#ffd400',text:'#111',code:item.symbol||'£',group:'food',w:22,h:15};
  if(item.kind==='adult-museum')return {colour:'#7b4ee8',text:'#fff',code:'18M',group:'adult',w:20,h:14};
  if(item.kind==='adult-shop')return {colour:'#d62583',text:'#fff',code:'18S',group:'adult',w:20,h:14};
  if(item.kind==='adult-show')return {colour:'#ff5e1a',text:'#fff',code:'18A',group:'adult',w:22,h:15};
  if(item.kind==='transport-stop')return {colour:'#17bcd0',text:'#052433',code:'T',group:'transit',w:14,h:10};
  const type=landmarkType(item),major=item.importance==='major';
  const styles={
    museum:{colour:'#00a8cc',text:'#001b24',code:item.symbol||'M',group:'museums'},
    activity:{colour:'#ff7a00',text:'#fff',code:item.symbol||'A',group:'activities'},
    park:{colour:'#61b832',text:'#102200',code:item.symbol||'P',group:'activities'},
    market:{colour:'#e5a900',text:'#171000',code:item.symbol||'MK',group:'activities'},
    historic:{colour:'#8b5a2b',text:'#fff',code:item.symbol||'H',group:'landmarks'},
    landmark:{colour:major?'#0b55d9':'#66798a',text:'#fff',code:major?(item.symbol||'★'):(item.symbol||'L'),group:'landmarks'}
  };
  const s=styles[type];return {...s,major,w:item.w||(major?58:20),h:item.h||(major?36:14)}
}
function badgeIcon(item,spec,extraClass=''){
  const major=spec.major?' major':'';
  const html=`<span class="badgeWrap"><span class="badgeCore" style="--poi:${spec.colour};--poiText:${spec.text}">${esc(spec.code)}</span><span class="badgeName">${esc(item.name)}</span></span>`;
  return L.divIcon({className:`semantic-badge${major} ${extraClass}`.trim(),html,iconSize:[1,1],iconAnchor:[0,0]})
}
function bindSemantic(layer,item){layer.bindPopup(popupHtml(item));layer.on('click',()=>selectPlace(item,false));return layer}
function addSemanticPlace(group,item,spec=visualSpec(item)){
  const plot=bindSemantic(L.rectangle(rectangleBounds(item,spec.w,spec.h),{renderer:state.renderer,pane:'overlayPane',color:'#fff',weight:spec.major?2.6:1.4,fillColor:spec.colour,fillOpacity:.82,interactive:true,bubblingMouseEvents:false}),item);
  const halo=bindSemantic(L.circleMarker([item.lat,item.lon],{renderer:state.renderer,pane:'overlayPane',radius:spec.major?13:8,color:spec.colour,weight:5,opacity:.25,fillColor:spec.colour,fillOpacity:.16,interactive:true,bubblingMouseEvents:false}),item);
  const badge=bindSemantic(L.marker([item.lat,item.lon],{icon:badgeIcon(item,spec),keyboard:false,riseOnHover:true,zIndexOffset:spec.major?700:400}),item);
  group.addLayer(plot);group.addLayer(halo);group.addLayer(badge);
  state.semanticPlots.push({plot,halo,spec});state.semanticBadges.push({badge,item,spec});return {plot,halo,badge}
}
function addFrontages(group,frontages,colour,kind,code){
  let n=0;
  for(const f of frontages){
    const a={lat:f.points[0][0],lon:f.points[0][1]},b={lat:f.points[1][0],lon:f.points[1][1]};
    const lineItem={id:`${kind}-line-${n}`,name:f.name,kind,lat:(a.lat+b.lat)/2,lon:(a.lon+b.lon)/2,note:'Approximate public frontage reference; active individual windows can change.'};
    const line=bindSemantic(L.polyline(f.points,{renderer:state.renderer,color:'#fff',weight:9,opacity:.96,interactive:true,bubblingMouseEvents:false}),lineItem);
    const inner=bindSemantic(L.polyline(f.points,{renderer:state.renderer,color:colour,weight:6,opacity:.98,interactive:true,bubblingMouseEvents:false}),lineItem);
    group.addLayer(line);group.addLayer(inner);state.frontageLines.push({outer:line,inner});
    const count=Math.max(1,Math.ceil(distance(a,b)/16));
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;const item={id:`${kind}-${n}-${i}`,name:f.name,kind,lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t,note:lineItem.note};
      const plot=bindSemantic(L.rectangle(rectangleBounds(item,12,8),{renderer:state.renderer,color:'#fff',weight:1.1,fillColor:colour,fillOpacity:.9,interactive:true,bubblingMouseEvents:false}),item);group.addLayer(plot);state.semanticPlots.push({plot,halo:null,spec:{major:false}})
    }
    const spec={colour,text:'#fff',code,group:kind==='red-light'?'red':'blue',major:false,w:12,h:8};
    const badge=bindSemantic(L.marker([lineItem.lat,lineItem.lon],{icon:badgeIcon(lineItem,spec,'frontage-badge'),keyboard:false,riseOnHover:true,zIndexOffset:500}),lineItem);group.addLayer(badge);state.semanticBadges.push({badge,item:lineItem,spec});n++
  }
}
function updateSemanticZoom(){
  if(!state.map)return;const z=state.map.getZoom();document.body.classList.toggle('zoom-city',z<=12);document.body.classList.toggle('zoom-street',z>=15);document.body.classList.toggle('zoom-close',z>=18);
  for(const x of state.semanticPlots){if(x.plot?.setStyle)x.plot.setStyle({fillOpacity:z>=15?.9:.68,weight:x.spec?.major?(z>=15?3:2):(z>=15?1.6:.8)});if(x.halo?.setRadius)x.halo.setRadius(x.spec?.major?(z<=12?15:12):(z<=12?8:6))}
  for(const x of state.frontageLines){x.outer.setStyle({weight:z>=16?7:10});x.inner.setStyle({weight:z>=16?4:6})}
}
function buildLayersV4(){
  addFrontages(makeGroup('red'),DATA.redFrontages,'#e21c32','red-light','R');
  addFrontages(makeGroup('blue'),DATA.blueFrontages,'#087df0','blue-light','B');
  const coffee=makeGroup('coffee');DATA.coffeeshops.forEach(x=>addSemanticPlace(coffee,x));
  const smart=makeGroup('smart');DATA.smartshops.forEach(x=>addSemanticPlace(smart,x));
  const food=makeGroup('food');DATA.valueFood.forEach(x=>addSemanticPlace(food,x));
  const adult=makeGroup('adult');DATA.adultPlaces.forEach(x=>addSemanticPlace(adult,x));
  const museums=makeGroup('museums'),activities=makeGroup('activities'),landmarks=makeGroup('landmarks');
  DATA.landmarks.forEach(x=>{const spec=visualSpec(x);addSemanticPlace(spec.group==='museums'?museums:spec.group==='activities'?activities:landmarks,x,spec)});
  const transit=makeGroup('transit');
  DATA.transit.routes.forEach(r=>transit.addLayer(L.polyline(r.points,{renderer:state.renderer,color:'#fff',weight:7,opacity:.9,interactive:true}).bindPopup(`<strong>${esc(r.name)}</strong>`)).addLayer(L.polyline(r.points,{renderer:state.renderer,color:r.colour,weight:r.kind==='night'?3:4,opacity:.96,dashArray:r.kind==='night'?'7 7':null,interactive:true}).bindPopup(`<strong>${esc(r.name)}</strong>`)));
  DATA.transit.stops.forEach(x=>addSemanticPlace(transit,x));
  state.map.setMinZoom?.(11);state.map.setMaxZoom?.(20);state.map.on('zoomend',updateSemanticZoom);
  updateBase();updateWaypoint();restoreTrail();updateSemanticZoom()
}

category=categoryV4;
buildLayers=buildLayersV4;
