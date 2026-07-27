'use strict';
const DATA = window.AMS_ANDROID_DATA;
const $ = id => document.getElementById(id);
const state = {
  map:null, renderer:null, tileLayer:null, groups:{}, visible:{red:true,blue:true,coffee:true,smart:true,food:true,adult:true,landmarks:true,transit:true,accuracy:false},
  base:load('ams-v3-base',DATA.hotel), activeWaypoint:load('ams-v3-active-waypoint',null), waypoints:load('ams-v3-waypoints',[]),
  trail:load('ams-v3-trail',[]), user:null, userMarker:null, accuracyCircle:null, trailLine:null,
  tracking:false, watchId:null, follow:true, trailPaused:false, dropWaypoint:false, lastTrailTime:0, lastCameraTime:0, distance:0,
  selected:null, tileCount:0, engine:'none'
};
const els = {status:$('status'),distance:$('distanceValue'),accuracy:$('accuracyValue'),mode:$('modeValue'),gps:$('gpsButton'),panelHost:$('panelHost'),toast:$('toast')};

function load(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function rad(v){return v*Math.PI/180}
function distance(a,b){const R=6371000,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
function formatDistance(m){return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(m<10000?2:1)} km`}
function setViewportHeight(){const h=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(h)}px`)}
setViewportHeight();window.addEventListener('resize',setViewportHeight,{passive:true});window.visualViewport?.addEventListener('resize',setViewportHeight,{passive:true});

function toast(message,ms=3000){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),ms)}
function setStatus(message,mode){els.status.textContent=message;if(mode)els.mode.textContent=mode}
function googleRoute(dest,travelmode='walking'){const origin=state.user||state.base;const u=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.lat+','+origin.lon)}&destination=${encodeURIComponent(dest.lat+','+dest.lon)}&travelmode=${travelmode}`;window.open(u,'_blank','noopener')}
function hotelGoogleUrl(){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(state.base.lat+','+state.base.lon)}`}
$('fallbackHotel').href=hotelGoogleUrl();

function loadScript(url,timeout=9000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error('Timed out loading '+url)),timeout);function finish(error){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve()}s.src=url;s.async=true;s.crossOrigin='anonymous';s.onload=()=>finish();s.onerror=()=>finish(new Error('Failed loading '+url));document.head.appendChild(s)})}
async function ensureLeaflet(){
  if(window.L)return true;
  const urls=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'];
  for(const url of urls){try{setStatus('Loading mobile map engine…','Loading');await loadScript(url);if(window.L)return true}catch(error){console.warn(error)}}
  return false;
}

function showFallback(reason){
  $('fallbackText').textContent=reason+' Use the direct Google Maps and OpenStreetMap links below.';
  $('fallback').classList.add('show');setStatus('Map engine unavailable','Fallback');
}

function makeGroup(name){const g=L.featureGroup();state.groups[name]=g;g.addTo(state.map);return g}
function rectangleBounds(item,w=18,h=12){const dy=(h/2)/110540,dx=(w/2)/(111320*Math.cos(rad(item.lat)));return [[item.lat-dy,item.lon-dx],[item.lat+dy,item.lon+dx]]}
function popupHtml(item){
  const cat=category(item);
  return `<strong>${esc(item.name)}</strong><small style="display:block;color:#5b6c78;margin-top:3px">${esc(cat)}</small><small style="display:block;color:#5b6c78">${esc(item.address||'')}</small><div style="margin-top:6px">${esc(item.note||'')}</div><button data-route="${esc(item.id)}" style="margin-top:7px;border:0;border-radius:7px;padding:7px 9px;background:#087df0;color:white;font-weight:800">Google route</button>`;
}
function category(item){
  if(item.kind==='coffeeshop')return 'Licensed cannabis coffeeshop · 18+';
  if(item.kind==='smartshop')return 'Smartshop / legal truffle retailer · 18+';
  if(item.kind==='value-food')return `Value cuisine · ${item.cuisine||''}`;
  if(item.kind==='adult-museum')return 'Sex / erotic museum · 18+';
  if(item.kind==='adult-shop')return 'Adult / fetish shop · 18+';
  if(item.kind==='adult-show')return 'Adult show / attraction · 18+';
  if(item.importance)return item.importance==='major'?'Major landmark building':'Landmark / monument';
  if(item.kind==='transport-stop')return 'Hotel transport stop';
  return item.kind||'Place';
}
function addRect(group,item,colour,w=18,h=12){
  const layer=L.rectangle(rectangleBounds(item,w,h),{renderer:state.renderer,color:'#fff',weight:1,fillColor:colour,fillOpacity:.93,interactive:true,bubblingMouseEvents:false});
  layer.bindPopup(popupHtml(item));layer.on('click',()=>selectPlace(item,false));group.addLayer(layer);return layer
}
function addCircle(group,item,colour,r=7){
  const layer=L.circleMarker([item.lat,item.lon],{renderer:state.renderer,radius:r,color:'#fff',weight:1.4,fillColor:colour,fillOpacity:.96,interactive:true,bubblingMouseEvents:false});
  layer.bindPopup(popupHtml(item));layer.on('click',()=>selectPlace(item,false));group.addLayer(layer);return layer
}
function addFrontages(group,frontages,colour,kind){
  let n=0;for(const f of frontages){const a={lat:f.points[0][0],lon:f.points[0][1]},b={lat:f.points[1][0],lon:f.points[1][1]};const count=Math.max(1,Math.ceil(distance(a,b)/18));for(let i=0;i<count;i++){const t=(i+.5)/count;const item={id:`${kind}-${n++}`,name:f.name,kind,lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t,note:'Approximate public frontage reference; active individual windows can change.'};addRect(group,item,colour,12,8)}}
}
