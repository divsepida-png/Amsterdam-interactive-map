function setWaypoint(lat,lon,name){
  const w={id:`wp-${Date.now()}`,name:name||`Waypoint ${state.waypoints.length+1}`,lat,lon,time:Date.now()};
  state.activeWaypoint=w;state.waypoints=[w,...state.waypoints.filter(x=>distance(x,w)>5)].slice(0,8);save('ams-v3-active-waypoint',w);save('ams-v3-waypoints',state.waypoints);updateWaypoint();state.map.setView([lat,lon],Math.max(state.map.getZoom(),16),{animate:false});setPanel('route')
}
function renderWaypoints(){const host=$('waypointList');host.innerHTML='';if(!state.waypoints.length){host.innerHTML='<div class="card"><small>No saved waypoints.</small></div>';return}state.waypoints.forEach(w=>{const b=document.createElement('button');b.className='result';b.innerHTML=`<strong>${esc(w.name)}</strong><small>${w.lat.toFixed(5)}, ${w.lon.toFixed(5)}</small>`;b.onclick=()=>{state.activeWaypoint=w;save('ams-v3-active-waypoint',w);updateWaypoint();state.map.setView([w.lat,w.lon],17,{animate:false})};host.appendChild(b)})}
$('dropWaypoint').onclick=e=>{state.dropWaypoint=!state.dropWaypoint;e.currentTarget.classList.toggle('active',state.dropWaypoint);els.panelHost.classList.remove('open');toast(state.dropWaypoint?'Tap the map to place a waypoint.':'Waypoint placement cancelled.')};
$('clearWaypoint').onclick=()=>{state.activeWaypoint=null;save('ams-v3-active-waypoint',null);updateWaypoint()};
$('routeWaypoint').onclick=()=>state.activeWaypoint?googleRoute(state.activeWaypoint):toast('Drop or select a waypoint first.');
$('routeBase').onclick=()=>googleRoute(state.base,'transit');

function startGps(){
  if(state.tracking){stopGps();return}
  if(!window.isSecureContext||location.protocol!=='https:'){toast('Live GPS requires the HTTPS hosted version.');return}
  if(!navigator.geolocation){toast('This browser does not support location.');return}
  state.tracking=true;els.gps.textContent='STOP GPS';els.gps.classList.add('active');setStatus('Requesting precise location…','GPS');
  state.watchId=navigator.geolocation.watchPosition(pos=>processGps({lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy,time:pos.timestamp||Date.now()}),err=>{
    state.tracking=false;els.gps.textContent='START GPS';els.gps.classList.remove('active');setStatus(err.code===1?'Location permission blocked. Allow precise location in Chrome site settings.':err.code===2?'Location unavailable. Turn on phone location and try outdoors.':'Location timed out. Try again outdoors.','GPS blocked')
  },{enableHighAccuracy:true,maximumAge:2500,timeout:18000})
}
function stopGps(){if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;state.tracking=false;els.gps.textContent='START GPS';els.gps.classList.remove('active');setStatus('GPS paused; path remains saved.','Paused')}
function processGps(raw){
  const p=state.user?{lat:state.user.lat+(raw.lat-state.user.lat)*.45,lon:state.user.lon+(raw.lon-state.user.lon)*.45,accuracy:raw.accuracy,time:raw.time}:raw;
  if(state.user&&distance(state.user,p)>400&&raw.accuracy>35)return;
  state.user=p;els.accuracy.textContent=`±${Math.round(p.accuracy)} m`;setStatus('GPS active. Distance and trail are updating.','Live');
  if(!state.userMarker)state.userMarker=L.circleMarker([p.lat,p.lon],{renderer:state.renderer,radius:7,color:'#fff',weight:2,fillColor:'#075dcc',fillOpacity:1}).addTo(state.map);else state.userMarker.setLatLng([p.lat,p.lon]);
  if(state.accuracyCircle)state.accuracyCircle.setLatLng([p.lat,p.lon]).setRadius(Math.min(p.accuracy,150));
  if(!state.trailPaused){const prev=state.trail.at(-1),moved=prev?distance(prev,p):999;const elapsed=p.time-state.lastTrailTime;if(!prev||(moved>=5&&(elapsed>=2500||moved>=10))){if(!prev||moved<350||p.accuracy<=30){state.trail.push({lat:p.lat,lon:p.lon,time:p.time});if(state.trail.length>1000)state.trail=state.trail.filter((_,i)=>i%2===0||i===state.trail.length-1);state.lastTrailTime=p.time;save('ams-v3-trail',state.trail);restoreTrail()}}}
  if(state.follow&&Date.now()-state.lastCameraTime>7000){const bounds=state.map.getBounds().pad(-.22);if(!bounds.contains([p.lat,p.lon])){state.map.panTo([p.lat,p.lon],{animate:false});state.lastCameraTime=Date.now()}}
}
els.gps.onclick=startGps;
$('centreUser').onclick=()=>state.user?state.map.setView([state.user.lat,state.user.lon],Math.max(state.map.getZoom(),16),{animate:false}):toast('Start GPS first.');
$('followButton').onclick=e=>{state.follow=!state.follow;e.currentTarget.textContent=`Follow ${state.follow?'on':'off'}`;e.currentTarget.classList.toggle('active',state.follow)};
$('pauseTrail').onclick=e=>{state.trailPaused=!state.trailPaused;e.currentTarget.textContent=state.trailPaused?'Resume trail':'Pause trail'};
$('clearTrail').onclick=()=>{state.trail=[];save('ams-v3-trail',[]);restoreTrail();toast('Travelled path and distance reset.')};
$('cityView').onclick=()=>{state.map.setView([52.3695,4.889],13,{animate:false});els.panelHost.classList.remove('open')};
$('wallenView').onclick=()=>{state.map.setView([52.3736,4.8987],17,{animate:false});els.panelHost.classList.remove('open')};

