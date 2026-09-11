const KEY='streetboss-save-v1';
const defaults={cash:1000,businesses:0,day:1,energy:100,rep:0,inventory:0,level:1,missions:0};
let state=load();
const $=id=>document.getElementById(id);
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function money(n){return `KSh ${Math.floor(n).toLocaleString()}`}
function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}
function action(type){
 if(type==='business'){if(state.cash<500){toast('You need KSh 500 to start a business.');return}state.cash-=500;state.businesses++;state.rep+=10;toast('Business started! +10 reputation')}
 if(type==='work'){if(state.energy<20){toast('Rest first — your energy is low.');return}state.cash+=250;state.energy-=20;state.rep+=2;toast('Shift complete! +KSh 250')}
 if(type==='mission'){if(state.energy<15){toast('Not enough energy.');return}state.cash+=400;state.energy-=15;state.rep+=8;state.missions++;toast('Mission complete! +KSh 400')}
 if(type==='shop'){if(state.cash<150){toast('Not enough cash.');return}state.cash-=150;state.inventory++;toast('New item added to inventory')}
 if(type==='rest'){state.energy=Math.min(100,state.energy+40);state.day++;toast('New day. Energy restored.')}
 save()
}
function render(){
 $('cash').textContent=money(state.cash);$('businesses').textContent=state.businesses;$('rep').textContent=state.rep;$('day').textContent=state.day;$('energy').textContent=state.energy+'%';$('level').textContent=state.level;
 $('energybar').style.width=state.energy+'%';$('missionCount').textContent=state.missions;
 $('businessStatus').textContent=state.businesses?`${state.businesses} active business${state.businesses>1?'es':''}`:'No business yet';
}
window.action=action;window.resetGame=()=>{if(confirm('Reset your STREET BOSS progress?')){localStorage.removeItem(KEY);state=load();render();toast('Game reset')}};render();
