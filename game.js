const KEY='streetboss-save-v2';
const defaults={cash:1000,businesses:[],day:1,energy:100,rep:0,inventory:0,level:1,missions:0,streak:0,location:'CBD'};
let state=load();
const $=id=>document.getElementById(id);
const businessTypes=[
 {name:'M-Pesa Booth',icon:'📱',cost:500,income:90,rep:4},
 {name:'Food Kiosk',icon:'🍛',cost:750,income:130,rep:6},
 {name:'Boda Stage',icon:'🏍️',cost:1000,income:180,rep:8},
 {name:'Mini Shop',icon:'🛒',cost:1500,income:260,rep:12}
];
const locations=[['CBD','🏙️'],['Eastlands','🏘️'],['Westlands','🌆'],['Kibera','🏠'],['Industrial Area','🏭'],['Mombasa Road','🛣️']];
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function money(n){return `KSh ${Math.floor(n).toLocaleString()}`}
function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),1800)}
function gainRep(n){const before=state.level;state.rep+=n;let level=1;let threshold=25;while(state.rep>=threshold){level++;threshold+=35}state.level=level;if(state.level>before)toast(`LEVEL UP! You reached level ${state.level} 🔥`)}
function action(type,arg){
 if(type==='business'){openBusiness();return}
 if(type==='work'){if(state.energy<20)return toast('Rest first — your energy is low.');state.cash+=250;state.energy-=20;gainRep(2);state.streak++;toast('Shift complete! +KSh 250');save();return}
 if(type==='mission'){openMission();return}
 if(type==='shop'){if(state.cash<150)return toast('Not enough cash.');state.cash-=150;state.inventory++;toast('Gear upgraded! Inventory +1');save();return}
 if(type==='rest'){let income=0;state.businesses.forEach(b=>income+=b.income);state.cash+=income;state.energy=100;state.day++;state.streak=0;toast(income?`New day! Businesses earned ${money(income)}`:'New day. Energy restored.');save();return}
 if(type==='travel'){if(state.energy<5)return toast('Not enough energy to travel. Rest first.');state.location=arg;state.energy-=5;toast(`You moved to ${arg}`);save();return}
 if(type==='buyBusiness'){const b=businessTypes[arg];if(state.cash<b.cost)return toast(`You need ${money(b.cost)}.`);state.cash-=b.cost;state.businesses.push({...b,id:Date.now()});gainRep(b.rep);toast(`${b.name} opened! +${money(b.income)}/day`);save();return}
 if(type==='risk'){const outcomes=[{cash:600,rep:10,msg:'Big win! +KSh 600'},{cash:150,rep:4,msg:'Small win! +KSh 150'},{cash:-100,rep:2,msg:'You lost KSh 100, but learned the streets.'}];const o=outcomes[Math.floor(Math.random()*outcomes.length)];state.cash=Math.max(0,state.cash+o.cash);gainRep(o.rep);state.energy=Math.max(0,state.energy-15);state.missions++;toast(o.msg);closePanel();save();return}
 if(type==='safe'){if(state.energy<10)return toast('Not enough energy.');state.cash+=250;state.energy-=10;gainRep(4);state.missions++;toast('Safe mission complete! +KSh 250');closePanel();save();return}
}
function openPanel(title,body){$('panelTitle').textContent=title;$('panelBody').innerHTML=body;$('panel').classList.add('show')}
function closePanel(){$('panel').classList.remove('show')}
function openBusiness(){const cards=businessTypes.map((b,i)=>`<div class="choice"><div class="choice-icon">${b.icon}</div><div><strong>${b.name}</strong><small>Cost ${money(b.cost)} • ${money(b.income)}/day</small></div><button onclick="action('buyBusiness',${i})">Open</button></div>`).join('');openPanel('Start a business',`<p class="panel-note">Choose a hustle. Businesses pay you automatically whenever you start a new day.</p>${cards}<div class="owned">You own <b>${state.businesses.length}</b> business${state.businesses.length===1?'':'es'}.</div>`)}
function openMission(){openPanel('Street mission',`<p class="panel-note">Choose your approach. Risk can pay more, but the streets are unpredictable.</p><div class="choice"><div class="choice-icon">🛡️</div><div><strong>Safe delivery</strong><small>Low risk • +KSh 250 • +4 REP</small></div><button onclick="action('safe')">Take</button></div><div class="choice"><div class="choice-icon">🔥</div><div><strong>High-stakes deal</strong><small>Risky • up to +KSh 600 • +10 REP</small></div><button onclick="action('risk')">Risk it</button></div>`)}
function render(){
 $('cash').textContent=money(state.cash);$('businesses').textContent=state.businesses.length;$('rep').textContent=state.rep;$('day').textContent=state.day;$('energy').textContent=state.energy+'%';$('levelTop').textContent=state.level;$('levelEmpire').textContent=state.level;$('energybar').style.width=state.energy+'%';$('missionCount').textContent=state.missions;$('location').textContent=state.location;
 const next=25+(state.level-1)*35;const prev=state.level===1?0:25+(state.level-2)*35;const pct=Math.min(100,Math.max(0,((state.rep-prev)/(next-prev))*100));$('xpbar').style.width=pct+'%';$('xpText').textContent=`${state.rep-prev}/${next-prev} REP to next level`;
 $('businessStatus').textContent=state.businesses.length?state.businesses.map(b=>b.name).join(' • '):'No business yet';
 $('netIncome').textContent=money(state.businesses.reduce((s,b)=>s+b.income,0));
 $('city').innerHTML=locations.map(([name,icon])=>`<button class="city ${name===state.location?'selected':''}" onclick="action('travel','${name}')"><span>${icon}</span><b>${name}</b></button>`).join('');
}
window.action=action;window.closePanel=closePanel;window.resetGame=()=>{if(confirm('Reset your STREET BOSS progress?')){localStorage.removeItem(KEY);state={...defaults};save();toast('Game reset')}};render();
