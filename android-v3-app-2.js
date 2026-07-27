function buildLayers(){
  const c={red:'#e21c32',blue:'#087df0',coffee:'#00a65a',smart:'#ef3aa8',food:'#ffd400',museum:'#7546aa',shop:'#be267f',show:'#ff7a1a',major:'#293f53',minor:'#5b6d7e',transit:'#17bcd0'};
  addFrontages(makeGroup('red'),DATA.redFrontages,c.red,'red-light');
  addFrontages(makeGroup('blue'),DATA.blueFrontages,c.blue,'blue-light');
  const coffee=makeGroup('coffee');DATA.coffeeshops.forEach(x=>addRect(coffee,x,c.coffee,18,12));
  const smart=makeGroup('smart');DATA.smartshops.forEach(x=>addRect(smart,x,c.smart,18,12));
  const food=makeGroup('food');DATA.valueFood.forEach(x=>addRect(food,x,c.food,20,14));
  const adult=makeGroup('adult');DATA.adultPlaces.forEach(x=>addRect(adult,x,x.kind==='adult-museum'?c.museum:x.kind==='adult-shop'?c.shop:c.show,18,12));
  const lm=makeGroup('landmarks');DATA.landmarks.forEach(x=>x.importance==='major'?addRect(lm,x,c.major,x.w||65,x.h||42):addCircle(lm,x,c.minor,5));
  const transit=makeGroup('transit');
  DATA.transit.routes.forEach(r=>transit.addLayer(L.polyline(r.points,{renderer:state.renderer,color:r.colour,weight:r.kind==='night'?3:4,opacity:.9,dashArray:r.kind==='night'?'7 7':null,interactive:true}).bindPopup(`<strong>${esc(r.name)}</strong>`)));
  DATA.transit.stops.forEach(x=>addCircle(transit,x,c.transit,5));
  updateBase();
  updateWaypoint();
  restoreTrail();
}
function updateBase(){
  if(state.baseLayer)state.map.removeLayer(state.baseLayer);
  state.baseLayer=L.circleMarker([state.base.lat,state.base.lon],{renderer:state.renderer,radius:9,color:'#fff',weight:2,fillColor:'#008f4d',fillOpacity:1}).bindPopup(`<strong>${esc(state.base.name||'Base')}</strong><small style="display:block">${esc(state.base.address||'')}</small>`).addTo(state.map);
  $('baseName').textContent=state.base.name||'Custom base';$('baseAddress').textContent=state.base.address||`${state.base.lat.toFixed(6)}, ${state.base.lon.toFixed(6)}`;$('fallbackHotel').href=hotelGoogleUrl()
}
function updateWaypoint(){
  if(state.waypointLayer)state.map.removeLayer(state.waypointLayer);
  if(state.activeWaypoint)state.waypointLayer=L.circleMarker([state.activeWaypoint.lat,state.activeWaypoint.lon],{renderer:state.renderer,radius:9,color:'#fff',weight:2,fillColor:'#ff8b00',fillOpacity:1}).bindPopup(`<strong>${esc(state.activeWaypoint.name)}</strong>`).addTo(state.map);
  $('waypointTitle').textContent=state.activeWaypoint?state.activeWaypoint.name:'No active waypoint';
  $('waypointText').textContent=state.activeWaypoint?`${state.activeWaypoint.lat.toFixed(6)}, ${state.activeWaypoint.lon.toFixed(6)}`:'Press Drop waypoint, close the menu, then tap the map.';
  renderWaypoints()
}
function restoreTrail(){
  if(state.trailLine)state.map.removeLayer(state.trailLine);
  state.trailLine=L.polyline(state.trail.map(p=>[p.lat,p.lon]),{renderer:state.renderer,color:'#087df0',weight:4,opacity:.9}).addTo(state.map);
  let total=0;for(let i=1;i<state.trail.length;i++)total+=distance(state.trail[i-1],state.trail[i]);state.distance=total;els.distance.textContent=formatDistance(total)
}

function setPanel(name){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
  if(innerWidth<800)els.panelHost.classList.add('open')
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{const same=b.classList.contains('active')&&els.panelHost.classList.contains('open');if(same&&innerWidth<800){els.panelHost.classList.remove('open');return}setPanel(b.dataset.panel)}));
document.addEventListener('click',e=>{const button=e.target.closest('[data-route]');if(button){const item=allPlaces().find(x=>x.id===button.dataset.route);if(item)googleRoute(item)}});

function allPlaces(){return [...DATA.adultPlaces,...DATA.coffeeshops,...DATA.smartshops,...DATA.valueFood,...DATA.landmarks,...DATA.transit.stops]}
function selectPlace(item,move=true){
  state.selected=item;setPanel('explore');
  $('selectedPlace').innerHTML=`<div class="card"><strong>${esc(item.name)}</strong><small>${esc(category(item))}</small><small>${esc(item.address||'')}</small><small>${esc(item.note||'')}</small><div class="grid2" style="margin-top:7px"><button class="btn primary" id="showSelected">Show on map</button><button class="btn success" id="routeSelected">Google route</button><button class="btn" id="waypointSelected">Set waypoint</button></div></div>`;
  $('showSelected').onclick=()=>{state.map.setView([item.lat,item.lon],17,{animate:false});els.panelHost.classList.remove('open')};
  $('routeSelected').onclick=()=>googleRoute(item);
  $('waypointSelected').onclick=()=>setWaypoint(item.lat,item.lon,item.name);
  if(move)state.map.setView([item.lat,item.lon],17,{animate:false})
}
$('searchInput').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();const host=$('searchResults');host.innerHTML='';if(!q)return;
  const matches=allPlaces().filter(x=>`${x.name} ${x.address||''} ${category(x)} ${x.cuisine||''}`.toLowerCase().includes(q)).slice(0,18);
  if(!matches.length){host.innerHTML='<div class="card"><small>No mapped match.</small></div>';return}
  matches.forEach(item=>{const b=document.createElement('button');b.className='result';b.innerHTML=`<strong>${item.kind==='value-food'?`<span class="badge">${esc(item.symbol)}</span>`:''}${esc(item.name)}</strong><small>${esc(category(item))}${item.address?' · '+esc(item.address):''}</small>`;b.onclick=()=>selectPlace(item);host.appendChild(b)})
});

