'use strict';
/* V10 clean renderer.
   All red-light and blue-light frontage data and rendering are intentionally absent.
   No rectangles, strips, bricks, façade ticks, building polygons or frontage markers are created. */
(function applyCleanV10(){
  const BARS=[
    {id:'cafe-hoppe',name:'Café Hoppe',kind:'pub',symbol:'PUB',address:'Spui 18-20',lat:52.36868,lon:4.88945,note:'Historic brown café.'},
    {id:'cafe-de-dokter',name:'Café de Dokter',kind:'pub',symbol:'PUB',address:'Rozenboomsteeg 4',lat:52.37054,lon:4.88991,note:'Tiny historic Amsterdam bar.'},
    {id:'proeflokaal-arendsnest',name:'Proeflokaal Arendsnest',kind:'pub',symbol:'PUB',address:'Herengracht 90',lat:52.37661,lon:4.88691,note:'Dutch beer bar.'},
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

  DATA.bars=BARS;
  DATA.shops=SHOPS;
  DATA.redFrontages=[];
  DATA.blueFrontages=[];
  Object.assign(state.visible,{museums:true,activities:true,bars:true,shops:true});
  delete state.visible.red;
  delete state.visible.blue;

  const MUSEUM_IDS=new Set(['rijksmuseum','van-gogh','stedelijk','nemo','maritime','eye','hart','moco','jewish-museum']);
  const ACTIVITY_IDS=new Set(['heineken','adam','foodhallen','dungeon','body-worlds','ripleys']);
  const PARK_IDS=new Set(['artis','hortus','vondelpark']);
  const MARKET_IDS=new Set(['bloemenmarkt','waterlooplein','albert-cuyp','nine-streets']);
  const HISTORIC_IDS=new Set(['royal-palace','anne-frank','oude-kerk','westerkerk','begijnhof','synagogue','nieuwmarkt','national-monument','magere-brug']);

  function landmarkType(item){
    if(MUSEUM_IDS.has(item.id))return 'museum';
    if(ACTIVITY_IDS.has(item.id))return 'activity';
    if(PARK_IDS.has(item.id))return 'park';
    if(MARKET_IDS.has(item.id))return 'market';
    if(HISTORIC_IDS.has(item.id))return 'historic';
    return 'landmark';
  }

  function visualSpec(item){
    if(item.kind==='coffeeshop')return {colour:'#00a65a',text:'#fff',code:'C',group:'coffee'};
    if(item.kind==='smartshop')return {colour:'#ef3aa8',text:'#fff',code:'T',group:'smart'};
    if(item.kind==='value-food')return {colour:'#ffd400',text:'#111',code:item.symbol||'£',group:'food'};
    if(item.kind==='adult-museum')return {colour:'#7b4ee8',text:'#fff',code:'18M',group:'adult'};
    if(item.kind==='adult-shop')return {colour:'#d62583',text:'#fff',code:'18S',group:'adult'};
    if(item.kind==='adult-show')return {colour:'#ff5e1a',text:'#fff',code:'18A',group:'adult'};
    if(item.kind==='pub'||item.kind==='bar')return {colour:'#b83b2f',text:'#fff',code:item.kind==='pub'?'PUB':'BAR',group:'bars'};
    if(item.kind==='supermarket'||item.kind==='convenience')return {colour:'#1b8fda',text:'#fff',code:item.symbol||'SHOP',group:'shops'};
    if(item.kind==='transport-stop')return {colour:'#17bcd0',text:'#052433',code:'T',group:'transit'};
    const type=landmarkType(item),major=item.importance==='major';
    const table={
      museum:{colour:'#00a8cc',text:'#001b24',code:item.symbol||'M',group:'museums'},
      activity:{colour:'#ff7a00',text:'#fff',code:item.symbol||'A',group:'activities'},
      park:{colour:'#61b832',text:'#102200',code:item.symbol||'P',group:'activities'},
      market:{colour:'#e5a900',text:'#171000',code:item.symbol||'MK',group:'activities'},
      historic:{colour:'#8b5a2b',text:'#fff',code:item.symbol||'H',group:'landmarks'},
      landmark:{colour:major?'#0b55d9':'#66798a',text:'#fff',code:major?(item.symbol||'★'):(item.symbol||'L'),group:'landmarks'}
    };
    return {...table[type],major};
  }

  function badgeIcon(item,spec){
    const classes=['v10-dot',spec.major?'major':''].filter(Boolean).join(' ');
    return L.divIcon({
      className:classes,
      html:`<span class="v10-core" style="--poi:${spec.colour};--poi-text:${spec.text}">${esc(spec.code)}</span>`,
      iconSize:[1,1],iconAnchor:[0,0]
    });
  }

  function bindPlace(layer,item){
    layer.bindPopup(popupHtml(item));
    layer.on('click',()=>selectPlace(item,false));
    return layer;
  }

  function addSemanticPlace(group,item,spec=visualSpec(item)){
    const marker=bindPlace(L.marker([item.lat,item.lon],{
      icon:badgeIcon(item,spec),keyboard:false,riseOnHover:true,zIndexOffset:spec.major?700:400
    }),item);
    group.addLayer(marker);
    return marker;
  }

  const previousCategory=category;
  category=function(item){
    if(item.kind==='pub'||item.kind==='bar')return 'Bar / pub';
    if(item.kind==='supermarket'||item.kind==='convenience')return 'Low-cost grocery / convenience shop';
    if(item.importance){
      const type=landmarkType(item);
      const names={museum:'Museum / gallery',activity:'Visitor activity / attraction',park:'Park, garden or zoo',market:'Market / shopping activity',historic:'Historic / religious place',landmark:item.importance==='major'?'Major landmark':'Minor landmark / public area'};
      return names[type];
    }
    return previousCategory(item);
  };

  allPlaces=()=>[
    ...DATA.adultPlaces,...DATA.coffeeshops,...DATA.smartshops,...DATA.valueFood,
    ...DATA.landmarks,...DATA.transit.stops,...DATA.bars,...DATA.shops
  ];

  buildLayers=function(){
    const coffee=makeGroup('coffee');DATA.coffeeshops.forEach(item=>addSemanticPlace(coffee,item));
    const smart=makeGroup('smart');DATA.smartshops.forEach(item=>addSemanticPlace(smart,item));
    const food=makeGroup('food');DATA.valueFood.forEach(item=>addSemanticPlace(food,item));
    const adult=makeGroup('adult');DATA.adultPlaces.forEach(item=>addSemanticPlace(adult,item));
    const bars=makeGroup('bars');DATA.bars.forEach(item=>addSemanticPlace(bars,item));
    const shops=makeGroup('shops');DATA.shops.forEach(item=>addSemanticPlace(shops,item));

    const museums=makeGroup('museums'),activities=makeGroup('activities'),landmarks=makeGroup('landmarks');
    DATA.landmarks.forEach(item=>{
      const spec=visualSpec(item);
      addSemanticPlace(spec.group==='museums'?museums:spec.group==='activities'?activities:landmarks,item,spec);
    });

    const transit=makeGroup('transit');
    DATA.transit.routes.forEach(route=>{
      const outer=L.polyline(route.points,{renderer:state.renderer,color:'#fff',weight:7,opacity:.88,interactive:false});
      const inner=L.polyline(route.points,{renderer:state.renderer,color:route.colour,weight:route.kind==='night'?3:4,opacity:.96,dashArray:route.kind==='night'?'7 7':null,interactive:true}).bindPopup(`<strong>${esc(route.name)}</strong>`);
      transit.addLayer(outer);transit.addLayer(inner);
    });
    DATA.transit.stops.forEach(item=>addSemanticPlace(transit,item));

    updateBase();updateWaypoint();restoreTrail();
  };

  const style=document.createElement('style');
  style.id='v10-clean-renderer-style';
  style.textContent=`
  .v10-dot{background:transparent!important;border:0!important;overflow:visible!important}
  .v10-dot .v10-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:18px;min-width:18px;height:18px;padding:0 2px;border-radius:50%;background:var(--poi);color:var(--poi-text);border:2px solid #fff;font-size:6.8px;line-height:1;font-weight:1000;box-shadow:0 0 0 1px rgba(0,0,0,.55),0 2px 5px rgba(0,0,0,.35)}
  .v10-dot.major .v10-core{width:28px;min-width:28px;height:28px;font-size:8px;border-width:3px;box-shadow:0 0 0 2px rgba(255,212,0,.85),0 3px 8px rgba(0,0,0,.42)}
  #mapKey{position:absolute;z-index:790;top:8px;left:52px;right:8px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px;pointer-events:auto}
  #mapKey::-webkit-scrollbar{display:none}
  .mapKeyChip{flex:0 0 auto;border:2px solid #fff;background:var(--chip);color:#fff;border-radius:999px;padding:4px 7px;font-size:8.5px;font-weight:950;box-shadow:0 2px 7px rgba(0,0,0,.32)}
  @media(max-width:420px){#mapKey{left:48px}.mapKeyChip{font-size:7.5px;padding:3px 6px}}
  @media(min-width:700px){#mapKey{right:calc(var(--dock-w) + 8px)}}`;
  document.head.appendChild(style);

  const wrap=document.getElementById('mapWrap');
  if(wrap&&!document.getElementById('mapKey'))wrap.insertAdjacentHTML('beforeend',`<div id="mapKey" aria-label="Map category key">
    <span class="mapKeyChip" style="--chip:#00a8cc">M Museum</span>
    <span class="mapKeyChip" style="--chip:#ff7a00">A Activity</span>
    <span class="mapKeyChip" style="--chip:#ffd400;color:#111">£ Value food</span>
    <span class="mapKeyChip" style="--chip:#00a65a">C Coffeeshop</span>
    <span class="mapKeyChip" style="--chip:#ef3aa8">T Smartshop</span>
    <span class="mapKeyChip" style="--chip:#7b4ee8">18 Adult</span>
  </div>`);

  const layers=document.getElementById('panel-layers');
  if(layers)layers.innerHTML=`<h2>Map layers</h2>
    <div class="card"><strong>Frontage layers removed</strong><small>All red-light and blue-light map geometry has been stripped from this build. No bricks, strips, dots, lines or area markers are rendered for those datasets.</small></div>
    <button class="toggle on" data-layer="coffee"><span>Cannabis coffeeshops</span><b>✓</b></button>
    <button class="toggle on" data-layer="smart"><span>Smartshops</span><b>✓</b></button>
    <button class="toggle on" data-layer="food"><span>Best-value food</span><b>✓</b></button>
    <button class="toggle on" data-layer="adult"><span>Adult museums, shops and shows</span><b>✓</b></button>
    <button class="toggle on" data-layer="museums"><span>Museums and galleries</span><b>✓</b></button>
    <button class="toggle on" data-layer="activities"><span>Activities, parks and markets</span><b>✓</b></button>
    <button class="toggle on" data-layer="landmarks"><span>Landmarks and historic places</span><b>✓</b></button>
    <button class="toggle on" data-layer="bars"><span>Bars and pubs</span><b>✓</b></button>
    <button class="toggle on" data-layer="shops"><span>Budget supermarkets and convenience shops</span><b>✓</b></button>
    <button class="toggle on" data-layer="transit"><span>Hotel transport routes</span><b>✓</b></button>
    <button class="toggle" data-layer="accuracy"><span>GPS accuracy circle</span><b>×</b></button>`;

  const locateCard=document.querySelector('#panel-locate .card');
  if(locateCard)locateCard.innerHTML='<strong>Clean map reset</strong><small>The red-light and blue-light frontage layers are completely disabled in this build. All remaining locations use compact circular markers.</small>';
})();
