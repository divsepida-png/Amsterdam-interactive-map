document.querySelectorAll('.toggle').forEach(b=>b.onclick=()=>{
  const k=b.dataset.layer;state.visible[k]=!state.visible[k];b.classList.toggle('on',state.visible[k]);b.querySelector('b').textContent=state.visible[k]?'✓':'×';
  if(k==='accuracy'){if(state.visible.accuracy){if(!state.accuracyCircle)state.accuracyCircle=L.circle(state.user?[state.user.lat,state.user.lon]:[state.base.lat,state.base.lon],{renderer:state.renderer,radius:state.user?.accuracy||30,color:'#087df0',weight:1,fillColor:'#087df0',fillOpacity:.08}).addTo(state.map)}else if(state.accuracyCircle){state.map.removeLayer(state.accuracyCircle);state.accuracyCircle=null}return}
  const g=state.groups[k];if(!g)return;state.visible[k]?g.addTo(state.map):state.map.removeLayer(g)
});

async function findBase(){
  const q=$('baseSearch').value.trim();if(q.length<3){toast('Enter at least three characters.');return}
  $('baseResults').innerHTML='<div class="card"><small>Searching address…</small></div>';
  try{const res=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q+', Amsterdam')}&limit=6&lang=en&lat=52.37&lon=4.89`);if(!res.ok)throw new Error('HTTP '+res.status);const obj=await res.json();const results=(obj.features||[]).map(f=>{const [lon,lat]=f.geometry.coordinates,p=f.properties||{};return{id:`base-${lat}-${lon}`,name:p.name||p.street||q,address:[p.housenumber,p.street,p.postcode,p.city].filter(Boolean).join(' '),lat,lon}}).filter(x=>x.lat>52.2&&x.lat<52.5&&x.lon>4.6&&x.lon<5.2);renderBaseResults(results)}catch(error){$('baseResults').innerHTML='<div class="card"><small>Address search unavailable. Use coordinates below.</small></div>'}
}
function renderBaseResults(results){const h=$('baseResults');h.innerHTML='';if(!results.length){h.innerHTML='<div class="card"><small>No Amsterdam match found.</small></div>';return}results.forEach(x=>{const b=document.createElement('button');b.className='result';b.innerHTML=`<strong>${esc(x.name)}</strong><small>${esc(x.address||'Amsterdam')}</small>`;b.onclick=()=>setBase(x);h.appendChild(b)})}
function setBase(x){state.base={...x};save('ams-v3-base',state.base);updateBase();state.map.setView([x.lat,x.lon],16,{animate:false});$('baseResults').innerHTML='';toast('Base moved. Route buttons now use this location.')}
function parseCoords(v){const a=v.match(/[-+]?\d{1,3}(?:[.,]\d+)?/g);if(!a||a.length<2)return null;let x=Number(a[0].replace(',','.')),y=Number(a[1].replace(',','.'));if(Math.abs(x)<20&&Math.abs(y)>40)[x,y]=[y,x];return x>=52.2&&x<=52.5&&y>=4.6&&y<=5.2?{lat:x,lon:y}:null}
$('findBase').onclick=findBase;$('baseSearch').onkeydown=e=>{if(e.key==='Enter')findBase()};
$('setCoords').onclick=()=>{const p=parseCoords($('baseCoords').value);p?setBase({id:'custom-'+Date.now(),name:'Custom coordinate base',address:`${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`,...p}):toast('Use coordinates like 52.357545, 4.844081.')};
$('resetBase').onclick=()=>setBase(DATA.hotel);

