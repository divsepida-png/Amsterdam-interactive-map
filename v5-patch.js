/* V5 compatibility: bars, pubs and budget shops only.
   The former OSM whole-building polygon renderer was removed because it produced
   stale block artifacts beneath the V6 dot and facade display. */
(function(){
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
DATA.bars=[...(DATA.bars||[]),...PUBS];
DATA.shops=[...(DATA.shops||[]),...SHOPS];
const oldAllPlaces=allPlaces;
allPlaces=()=>[...oldAllPlaces(),...DATA.bars,...DATA.shops];
const oldVisualSpec=visualSpec;
visualSpec=function(item){
 if(item.kind==='pub'||item.kind==='bar')return {colour:'#b83b2f',text:'#fff',code:item.kind==='pub'?'PUB':'BAR',group:'bars',w:20,h:14};
 if(item.kind==='supermarket'||item.kind==='convenience')return {colour:'#1b8fda',text:'#fff',code:item.symbol||'SHOP',group:'shops',w:20,h:14};
 return oldVisualSpec(item);
};
const oldCategory=category;
category=function(item){
 if(item.kind==='pub'||item.kind==='bar')return 'Bar / pub';
 if(item.kind==='supermarket'||item.kind==='convenience')return 'Low-cost grocery / convenience shop';
 return oldCategory(item);
};
const layerPanel=document.getElementById('panel-layers');
if(layerPanel){
 const anchor=layerPanel.querySelector('[data-layer="transit"]');
 const bars=document.createElement('button');bars.className='toggle on';bars.dataset.layer='bars';bars.innerHTML='<span>Bars and pubs — brick red PUB/BAR</span><b>✓</b>';
 const shops=document.createElement('button');shops.className='toggle on';shops.dataset.layer='shops';shops.innerHTML='<span>Budget supermarkets and convenience shops — blue SHOP</span><b>✓</b>';
 anchor?.before(bars,shops);
 const legend=layerPanel.querySelector('.legend');
 if(legend)legend.insertAdjacentHTML('beforeend','<i style="background:#b83b2f"></i><span>Bar / pub — PUB or BAR</span><i style="background:#1b8fda"></i><span>Budget supermarket / convenience shop</span>');
}
Object.assign(state.visible,{bars:true,shops:true});
const oldBuild=buildLayers;
buildLayers=function(){
 oldBuild();
 const bars=makeGroup('bars');DATA.bars.forEach(item=>addSemanticPlace(bars,item));
 const shops=makeGroup('shops');DATA.shops.forEach(item=>addSemanticPlace(shops,item));
 bindNewToggles();
};
function bindNewToggles(){
 document.querySelectorAll('.toggle').forEach(button=>{
  if(button.dataset.v5Bound)return;
  button.dataset.v5Bound='1';
  button.onclick=()=>{
   const key=button.dataset.layer;
   state.visible[key]=!state.visible[key];
   button.classList.toggle('on',state.visible[key]);
   button.querySelector('b').textContent=state.visible[key]?'✓':'×';
   const group=state.groups[key];
   if(group)state.visible[key]?group.addTo(state.map):state.map.removeLayer(group);
  };
 });
}
})();