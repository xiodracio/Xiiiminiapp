try{
/* Decrypt gate + Node Synchronization. New members' codes stay encrypted until they complete one node sync; existing members can open node sync to help others. */
(function(V){
/* ---------- gate ---------- */
const tg=V.tg.app,CS=tg&&tg.CloudStorage,KD="vm_device";
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function uid(){if(V.tg.user)return String(V.tg.user.id);let d="";try{d=JSON.parse(localStorage.getItem(KD))||""}catch(e){}if(!d){d="dev-"+Math.random().toString(36).slice(2,10);try{localStorage.setItem(KD,JSON.stringify(d))}catch(e){}}return d}
const U=uid(),LK={dec:"vm_dec_"+U,pend:"vm_pend_"+U};
let dec=lsGet(LK.dec)==="1",pend=lsGet(LK.pend)==="1";
const csGet=k=>new Promise(res=>{try{if(!CS)return res(null);const t=setTimeout(()=>res(null),1500);CS.getItem(k,(e,v)=>{clearTimeout(t);res(e?null:v)})}catch(e){res(null)}});
const csSet=(k,v)=>{try{CS&&CS.setItem(k,v,()=>{})}catch(e){}};
const ready=Promise.all([csGet("vm_dec"),csGet("vm_pend")]).then(([d,p])=>{
  if(d==="1"){dec=true;lsSet(LK.dec,"1")}if(p==="1"){pend=true;lsSet(LK.pend,"1")}
  if(dec)csSet("vm_dec","1");if(pend)csSet("vm_pend","1")});
const since=Date.parse(V.config.syncFrom||"")||0,regAt=m=>Date.parse(String((m&&(m.at||m.created_at||m.createdAt))||""))||0;
/* a "new member" registered at/after syncFrom, or just registered on this device. Anyone older never has to sync. */
const isNew=m=>pend||(since>0&&regAt(m)>=since);
V.gate={ready,uid:()=>U,isNew,isDecrypted:()=>dec,locked:m=>typeof m.locked==="boolean"?m.locked:isNew(m)&&!dec,
  markPending(){pend=true;lsSet(LK.pend,"1");csSet("vm_pend","1")},
  markDecrypted(){dec=true;lsSet(LK.dec,"1");csSet("vm_dec","1")}};

/* ---------- node synchronization: the server checks every node and records the result; this page only shows it ---------- */
const $=i=>document.getElementById(i),P=V.config.supabase,PROJECT=P.url,KEY=P.anonKey,api=V.services.api;
const KINDS={decrypt:{NEED:5,ROUND:5000,CYCLE:180000},web:{NEED:100,ROUND:7000,CYCLE:600000}},CFG={NEED:5,ROUND:5000,GRACE:900,TOL:250,CYCLE:180000,PING:2500,ALIVE:7000};let R=CFG.ROUND,KIND="decrypt";
/* every sync call carries the kind: web syncs run in their own batch namespace on the server */
const call=(f,d)=>api[f](KIND==="web"?Object.assign({mode:"web"},d):d);
const mm=ms=>Math.round(ms/60000)+" minute"+(ms>=120000?"s":"");
function setKind(k){KIND=k==="web"?"web":"decrypt";Object.assign(CFG,KINDS[KIND]);R=CFG.ROUND;WAIT="Waiting for members. Synchronization starts when "+CFG.NEED+" are online.";
  $("nsRule").textContent="Your reference code is unique to you. Rebuild it before the timer ends. Synchronization only runs while "+CFG.NEED+" members are online.";
  $("nsCn").textContent="Messages live only on screen for online members and vanish every "+mm(CFG.CYCLE)+".";
  $("nsT").textContent=(R/1000).toFixed(1);$("nsRt").textContent=$("nsCt").textContent=Math.floor(CFG.CYCLE/60000)+":00"}
const H={apikey:KEY,...(KEY.startsWith("eyJ")?{Authorization:"Bearer "+KEY}:{}),"Content-Type":"application/json"};
const rest=p=>PROJECT+"/rest/v1/"+p,RANDOM=/^Random-/;
let WHO="",ME="",MODE="decrypt",BATCH="",off=0,cur=null,frags=[],slots=[],sent=false,decoded=false,online=0,timers=[],CODE="",codeEp=null,active=false,armed=false,away=null,epoch=null,CODES={},lastChat=0,busy=false,lastErr="",wonRole="",qs=0;
const now=()=>Date.now()+off;
const show=id=>["nsPick","nsGame","nsDone"].forEach(s=>$(s).hidden=s!==id);
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const clean=s=>s.replace(/[^\w \-]/g,"").replace(/\s+/g," ").trim().slice(0,24);
/* node id: the member's @username, otherwise an anonymous id. Stable per member, so extra tabs never count as extra players. */
function identify(){ME=(WHO||"N"+hash(U).slice(0,5).toUpperCase()).replace(/[^\w]/g,"").slice(0,21)||"NODE"}
/* ---------- batches (listed, created and matched by the server) ---------- */
async function search(q){
  const tk=++qs;$("nsRs").textContent="Searching\u2026";$("nsRes").textContent="";
  let r;try{r=await call("sync_search",{q})}catch(e){r=null}
  if(tk!==qs)return;
  if(!r||!r.ok){$("nsRs").textContent=(r&&r.error)||"Could not search right now.";return}
  const list=Array.isArray(r.batches)?r.batches:[];
  $("nsRs").textContent=list.length?"":"No batches found. Create one.";
  list.forEach(x=>{
    const d=document.createElement("div");d.className="nsitem";
    d.innerHTML="<div><b></b><small></small></div>";d.querySelector("b").textContent=x.batch;d.querySelector("small").textContent="by "+x.owner;
    const btn=document.createElement("button");btn.type="button";btn.className="btn";btn.textContent="Join";btn.onclick=()=>join(x.batch);d.appendChild(btn);$("nsRes").appendChild(d);
  });
}
let qt;$("nsQ").oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>search($("nsQ").value.trim()),300)};
const tabs={nsTS:"nsPS",nsTC:"nsPC",nsTJ:"nsPJ"};
Object.keys(tabs).forEach(t=>$(t).onclick=()=>{Object.keys(tabs).forEach(k=>{$(k).setAttribute("aria-pressed",String(k===t));$(tabs[k]).hidden=k!==t})});
$("nsCf2").onchange=()=>{$("nsKw").hidden=!$("nsCf2").checked};
$("nsPC").addEventListener("submit",async e=>{
  e.preventDefault();const n=clean($("nsCn").value),priv=$("nsCf2").checked,k=$("nsCk").value.trim(),err=$("nsCe");
  if(n.length<3){err.textContent="Batch name needs 3+ characters.";return}
  if(priv&&k.length<4){err.textContent="Friends key needs 4+ characters.";return}
  err.textContent="";
  if(priv){join("f-"+n+"-"+hash(n+"|"+k));return}
  let r;try{r=await call("sync_create",{batch:n})}catch(x){r=null}
  if(!r||!r.ok||!r.batch){err.textContent=(r&&r.error)||"Could not create the batch.";return}
  join(r.batch);
});
$("nsPJ").addEventListener("submit",e=>{
  e.preventDefault();const n=clean($("nsJn").value),k=$("nsJk").value.trim();
  if(!n||!k){$("nsJe").textContent="Enter the batch name and friends key.";return}
  join("f-"+n+"-"+hash(n+"|"+k));
});
/* random matchmaking: the server joins you to a Random-* batch that has members online, or opens a new one */
$("nsRnd").onclick=async()=>{
  const b=$("nsRnd"),err=$("nsRe");err.textContent="";b.disabled=true;b.textContent="Finding members\u2026";
  let r;try{r=await call("sync_random",{})}catch(e){r=null}
  b.disabled=false;b.textContent="Join random batch";
  if(!r||!r.ok||!r.batch){err.textContent=(r&&r.error)||"Could not find a batch. Try again.";return}
  join(r.batch)};
/* ---------- game ---------- */
async function syncClock(){try{const a=Date.now(),r=await fetch(rest("rpc/ems_now"),{method:"POST",headers:H,body:"{}"}),s=await r.json(),b=Date.now();if(typeof s==="number")off=s-(a+b)/2}catch(e){}}
function newPuzzle(){
  const parts=[0,1,2,3,4].map(i=>CODE.slice(i*2,i*2+2)),r=rng(parseInt(hash(U+"|"+cur),36));let o,n=0;
  do{o=parts.slice();for(let i=4;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]]}}while(o.join("")===CODE&&++n<20);
  frags=o;slots=[];sent=false;draw()}
function draw(){
  $("nsRef").textContent=CODE;$("nsSlots").innerHTML="";$("nsTiles").innerHTML="";
  for(let k=0;k<5;k++){const b=document.createElement("button");b.type="button";b.className="nsslot";b.textContent=slots[k]!==undefined?frags[slots[k]]:"";b.onclick=()=>{if(sent||slots[k]===undefined)return;slots.splice(k,1);draw()};$("nsSlots").appendChild(b)}
  frags.forEach((f,i)=>{const b=document.createElement("button");b.type="button";b.className="nstile"+(slots.includes(i)?" used":"");b.textContent=f;b.onclick=()=>{if(sent||slots.length>=5)return;slots.push(i);draw();check()};$("nsTiles").appendChild(b)})}
function setSt(t,c){$("nsSt").textContent=t;$("nsSt").className=c||""}
function waiting(t){armed=false;sent=false;slots=[];frags=[];$("nsRef").textContent="\u00b7 \u00b7 \u00b7 \u00b7 \u00b7";$("nsSlots").innerHTML="";$("nsTiles").innerHTML="";$("nsBarI").style.width="0";$("nsT").textContent="\u2013";if(t)setSt(t)}
let WAIT="Waiting for members. Synchronization starts when "+CFG.NEED+" are online.";
/* the server verifies the sequence, the round timing and that 5 members are online, then records the result */
function check(){if(sent||!armed||slots.length<5)return;const ans=slots.map(i=>frags[i]).join("");if(ans===CODE){sent=true;setSt("Sequence locked. Hold for verification.","nsok");submit(ans,cur)}}
async function submit(ans,rd){
  const b=BATCH;let x;try{x=await call("sync_done",{batch:b,round:rd,answer:ans})}catch(e){x=null}
  if(b!==BATCH||decoded)return;
  if(x&&x.ok&&x.won)return win(x);
  if(!x||!x.ok)setSt((x&&x.error)||"Could not reach the server. Try again next round.","nsbad")}
async function judge(rd){
  if(decoded||!active||!BATCH)return;
  const b=BATCH;let x;try{x=await call("sync_round",{batch:b,round:rd})}catch(e){x=null}
  if(b!==BATCH||decoded)return;
  if(x&&x.ok&&x.won)return win(x);
  const n=x&&x.ok?+x.done||0:0;
  if(active)setSt(`SYNC FAILED \u00b7 ${n}/${CFG.NEED} nodes aligned. New sequence generated.`,"nsbad")}
function win(x){
  if(decoded)return;
  decoded=true;goOffline();BATCH="";show("nsDone");
  wonRole=x&&x.role||"";const mine=wonRole?wonRole==="member":MODE==="decrypt",mer=x&&+x.merits||0;
  const W=KIND==="web";
  $("nsDn").textContent=mine?(W?"All 100 nodes aligned. Web access is now unlocked permanently.":"All nodes aligned. Your Member Identification Code is now decrypted permanently."):"All nodes aligned. Thank you for helping other members "+(W?"unlock web access.":"synchronize.")+(mer>0?" You earned "+mer+" merits.":"");
  $("nsDbtn").textContent=W?(mine?"Open web access":"Back to web access"):(mine?"View my identification code":"Back to profile");
  try{V.sync.onwin&&V.sync.onwin(mine?"decrypt":"help",x,KIND)}catch(e){}}
function tick(){
  if(decoded||!BATCH)return;
  const sn=now(),ce=Math.floor(sn/CFG.CYCLE);
  if(ce!==codeEp||(!CODE&&CODES[ce])){codeEp=ce;CODE=CODES[ce]||""}
  const left=CFG.CYCLE-(sn%CFG.CYCLE),f=Math.floor(left/60000)+":"+String(Math.floor(left/1000)%60).padStart(2,"0");
  $("nsCt").textContent=f;$("nsRt").textContent=f;chatEpoch(sn);
  if(!active||!CODE)return;
  const r=Math.floor(sn/R);
  if(cur===null){cur=r;waiting(CFG.NEED+" members online. Synchronization begins at the next reset.")}
  else if(r!==cur){const prev=cur,was=armed;cur=r;armed=true;newPuzzle();setSt("Rebuild your code and lock it in.");if(was)setTimeout(()=>judge(prev),CFG.GRACE)}
  $("nsBarI").style.width=((sn%R)/R*100)+"%";$("nsT").textContent=((R-sn%R)/1000).toFixed(1)}
/* heartbeat: tells the server this node is online, and brings back the online count, this node's codes, new chat lines and the win */
async function pulse(){
  const b=BATCH;if(!b||busy)return;busy=true;
  let r;try{r=await call("sync_ping",{batch:b,after:lastChat})}catch(e){r=null}
  busy=false;
  if(!r||b!==BATCH||decoded)return;
  if(!r.ok){if(r.error&&r.error!==lastErr){lastErr=r.error;sys(r.error)}return}
  if(r.codes)Object.assign(CODES,r.codes);
  (Array.isArray(r.chat)?r.chat:[]).forEach(m=>{if(m&&m.id>lastChat){lastChat=m.id;line(String(m.u||"?").slice(0,21),String(m.t||"").slice(0,200),m.u===ME)}});
  if(r.won)return win(r);
  online=+r.online||0;
  const was=active;active=online>=CFG.NEED;
  if(!active&&(was||cur!==null)){cur=null;waiting(WAIT)}
  $("nsOn").textContent=`nodes online: ${online}/${CFG.NEED}`+(online<CFG.NEED?" \u00b7 awaiting others":"")}
/* ---------- live chat: relayed by the server, verified members only, wiped every 3 min ---------- */
function line(u,t,me){
  const d=document.createElement("div");d.className="nsm"+(me?" me":"");
  const b=document.createElement("b");b.textContent=u;d.appendChild(b);d.appendChild(document.createTextNode(t));
  $("nsMsgs").appendChild(d);$("nsMsgs").scrollTop=1e9}
function sys(t){const d=document.createElement("div");d.className="nsm sys";d.textContent=t;$("nsMsgs").appendChild(d)}
function chatEpoch(sn){const e=Math.floor(sn/CFG.CYCLE);if(epoch!==null&&e!==epoch){$("nsMsgs").textContent="";sys("Chat reset. Previous messages are gone.")}epoch=e}
$("nsCf").addEventListener("submit",async e=>{
  e.preventDefault();const t=$("nsCi").value.trim();if(!t||!BATCH)return;$("nsCi").value="";
  let r;try{r=await call("sync_chat",{batch:BATCH,text:t})}catch(x){r=null}
  if(!r||!r.ok)sys((r&&r.error)||"Message not sent.");else pulse()});
/* ---------- lifecycle ---------- */
async function join(b){
  BATCH=b.slice(0,60);const mine=BATCH,label=b.replace(/^f-(.*)-[a-z0-9]+$/,"$1 (friends)");
  $("nsMeta").textContent="batch "+label+" \u00b7 "+ME;$("nsMsgs").textContent="";epoch=null;decoded=false;cur=null;codeEp=null;active=false;online=0;away=null;CODE="";CODES={};lastChat=0;lastErr="";busy=false;wonRole="";
  $("nsOn").textContent="nodes online: 0/"+CFG.NEED+" \u00b7 awaiting others";
  show("nsGame");waiting(WAIT);
  await syncClock();if(BATCH!==mine)return;
  tick();timers=[setInterval(tick,100),setInterval(pulse,CFG.PING),setInterval(syncClock,30000)];pulse();sys("Connected. Only verified members in this batch can see this chat.")}
function stopGame(){timers.forEach(clearInterval);timers=[];active=false;cur=null;armed=false}
/* offline: stop heartbeats, tell the server (it removes an empty random batch itself) */
function goOffline(){
  const b=BATCH;if(!b)return;
  stopGame();
  try{call("sync_leave",{batch:b})}catch(e){}}
function leaveBatch(){goOffline();BATCH="";away=null}
$("nsLeave").onclick=()=>{leaveBatch();show("nsPick");search($("nsQ").value.trim())};
$("nsBack").onclick=()=>{leaveBatch();V.sync.onexit&&V.sync.onexit(false,KIND)};
$("nsDbtn").onclick=()=>{V.sync.onexit&&V.sync.onexit(wonRole==="member"||(!wonRole&&MODE==="decrypt"),KIND)};
/* leaving the miniapp = offline. Coming back: named batches rejoin, random batches are gone. */
function leaveApp(){if(!BATCH||away!==null)return;away=BATCH;goOffline()}
function resumeApp(){
  if(away===null)return;const b=away;away=null;
  if(RANDOM.test(b)){BATCH="";show("nsPick");search("")}else join(b)}
document.addEventListener("visibilitychange",()=>document.hidden?leaveApp():resumeApp());
addEventListener("pagehide",leaveApp);
try{if(tg&&tg.onEvent){tg.onEvent("deactivated",leaveApp);tg.onEvent("activated",resumeApp)}}catch(e){}
V.sync={onwin:null,onexit:null,
  setUser(n){WHO=String(n||"").replace(/^@/,"")},
  start(mode,kind){
    leaveBatch();setKind(kind);MODE=mode==="help"?"help":"decrypt";identify();
    const W=KIND==="web";
    $("nsMode").textContent=MODE==="decrypt"?(W?"Decrypt web access":"Decrypt identification code"):"Help another member";
    $("nsWho").textContent=MODE==="decrypt"?(W?"Join a batch. When "+CFG.NEED+" members are online and sync together, web access is unlocked permanently.":"Join a batch. When "+CFG.NEED+" members are online and sync together, your Member Identification Code is decrypted permanently."):(W?"Join a batch and help other members unlock web access. Your own access is not affected. You earn 10 merits for every new member you help unlock.":"Join a batch and help other members sync. Your own code is not affected. You earn 10 merits for every new member you help decrypt.");
    decoded=false;show("nsPick");$("nsTS").click();search("")}};
})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
/* Spore: 5-player co-op outbreak. All game state is on the server (illuminati-spore); this page only draws it and sends cure attempts. */
(function(V){
const $=i=>document.getElementById(i),api=V.services.api;
const DUR=20,USERS=5,CURES=4,NODES=20,HOME=[0,4,8,12,16],CW=180000,RANDOM=/^Random-/;
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const clean=s=>s.replace(/[^\w \-]/g,'').replace(/\s+/g,' ').trim().slice(0,24);
const ADJ=Array.from({length:NODES},(_,i)=>[(i+1)%NODES,(i+NODES-1)%NODES,(i+4)%NODES]);
ADJ.forEach((a,i)=>a.forEach(j=>{if(!ADJ[j].includes(i))ADJ[j].push(i)}));
const POS=Array.from({length:NODES},(_,i)=>{const a=i/NODES*6.283;return{x:.5+.38*Math.cos(a),y:.5+.38*Math.sin(a)}});
const HL=i=>HOME.includes(i)?' (User '+(HOME.indexOf(i)+1)+' home)':'';
const cv=$('spCv'),cx=cv.getContext('2d');let W=0,H=0;
let alive=false,batch='',isRnd=false,rtries=0,timer=0,busy=false,ST=null,G=null,sel=null,seen=0,after=0,tAt=0,elAt=0,scanUntil=0,scan={},loc=[],cw=Math.floor(Date.now()/CW),sentAt=0,settled=false;
function fit(){const d=Math.min(devicePixelRatio||1,V.perf.maxDpr);W=cv.clientWidth;H=cv.clientHeight;if(!W)return;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)}
const code=$('spCode');
const DAILY=3;let lft=null;
function setLeft(n){if(typeof n!=='number')return;lft=n;const e=$('spLeft');if(e)e.textContent='Attempts left today: '+n+'/'+DAILY+(n===0?' · resets at 7 PM GMT':'');const b=$('spRnd');if(b)b.disabled=n===0;const a=$('spAgain');if(a)a.hidden=n===0}
function view(p){$('spPick').hidden=p!=='p';$('spGame').hidden=p!=='g';if(p==='g')setTimeout(fit,0);if(p==='p')search()}
function myRank(){return G?G.me:(ST&&ST.me)||0}
/* ---------- pick a batch ---------- */
async function search(){
  const q=$('spQ').value.trim().toLowerCase(),box=$('spRes');let r;try{r=await api.spore_search({q})}catch(e){r=null}
  if(!alive||batch)return;
  box.textContent='';
  if(!r||!r.ok){$('spRs').textContent=(r&&r.error)||'Spore is unavailable right now.';return}
  setLeft(r.left);
  const list=r.batches||[];$('spRs').textContent=list.length?'':'No batches found. Create one.';
  list.forEach(x=>{const d=document.createElement('div');d.className='nsitem';d.innerHTML='<div><b></b><small></small></div>';
    d.querySelector('b').textContent=x.batch;d.querySelector('small').textContent='by '+(x.o||'a member')+' · '+x.n+'/'+USERS+(x.live?' · in progress':'');
    const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Join';b.disabled=x.n>=USERS||x.live;b.onclick=()=>join(x.batch,false);d.appendChild(b);box.appendChild(d)});
}
const tabs={spTS:'spPS',spTC:'spPC',spTJ:'spPJ'};
Object.keys(tabs).forEach(k=>$(k).onclick=()=>{Object.keys(tabs).forEach(j=>{$(j).setAttribute('aria-pressed',String(j===k));$(tabs[j]).hidden=j!==k});if(k==='spTS')search()});
$('spQ').oninput=search;
$('spCf2').onchange=()=>{$('spKw').hidden=!$('spCf2').checked};
$('spPC').addEventListener('submit',async e=>{
  e.preventDefault();const n=clean($('spCn').value),priv=$('spCf2').checked,k=$('spCk').value.trim(),err=$('spCe');
  if(n.length<3){err.textContent='Batch name needs 3+ characters.';return}
  if(priv&&k.length<4){err.textContent='Friends key needs 4+ characters.';return}
  err.textContent='';
  if(priv){join('f-'+n+'-'+hash(n+'|'+k),false);return}
  let r;try{r=await api.spore_create({batch:n})}catch(x){r=null}
  if(!r||!r.ok){err.textContent=(r&&r.error)||'Could not create the batch.';return}
  join(r.batch,false)});
$('spPJ').addEventListener('submit',e=>{
  e.preventDefault();const n=clean($('spJn').value),k=$('spJk').value.trim();
  if(!n||!k){$('spJe').textContent='Enter the batch name and friends key.';return}
  $('spJe').textContent='';join('f-'+n+'-'+hash(n+'|'+k),false)});
async function random(){
  let r;try{r=await api.spore_random({})}catch(e){r=null}
  if(!r||!r.ok){$('spRe').textContent=(r&&r.error)||'Could not find a batch right now.';return}
  join(r.batch,true)}
$('spRnd').onclick=()=>{rtries=0;$('spRe').textContent='';random()};
/* ---------- lifecycle ---------- */
function reset(){clearTimeout(timer);timer=0;busy=false;ST=null;G=null;sel=null;after=0;scan={};loc=[];settled=false;$('spOver').hidden=true;$('spLog').textContent='';$('spChat').textContent=''}
function leaveLocal(msg){
  const b=batch;reset();batch='';
  if(msg!==undefined)$('spRe').textContent=msg;
  view('p');return b}
function join(name,rnd){
  reset();batch=name;isRnd=!!rnd;
  $('spMeta').textContent='batch '+name.replace(/^f-(.*)-[a-z0-9]+$/,'$1 (friends)');
  sys('Connected. Only members in this batch can see this chat.');
  view('g');ui();schedule(0)}
function schedule(ms){clearTimeout(timer);if(alive&&batch)timer=setTimeout(tick,ms)}
async function tick(){
  if(!alive||!batch)return;
  if(document.hidden||busy){schedule(1000);return}
  busy=true;const b=batch;let r;
  try{r=await api.spore_state({batch:b,seen,after})}catch(e){r=null}
  busy=false;if(!alive||b!==batch)return;
  if(r&&r.left!=null)setLeft(r.left);
  if(r&&r.gone){
    if(isRnd&&++rtries<5){leaveLocal();say('Batch full or in progress. Finding another.','warn');random();return}
    leaveLocal(r.error||'That batch is full or in progress.');return}
  if(r&&r.status==='denied'){leaveLocal(r.error||'Access denied.');return}
  if(r&&r.ok)apply(r);
  schedule(G&&!G.over?900:1500)}
function apply(r){
  if(r.left!=null)setLeft(r.left);
  ST=r;G=r.game||null;settled=true;
  if(G){elAt=G.el;tAt=performance.now()}
  if(G&&G.over){const w=G.win;$('spOres').textContent=w?'Network survived!':'Network lost.';$('spOres').className=w?'sp-ok':'sp-bad';
    $('spOt').textContent=String(G.why||'');$('spOm').textContent=(w?'Each of the 5 users earned +5 merits.':'Each of the 5 users lost 2 merits.')+(lft!=null?' Attempts left today: '+lft+'/'+DAILY+'.':'');$('spOver').hidden=false}
  else $('spOver').hidden=true;
  (r.chat||[]).forEach(m=>{after=Math.max(after,m.id);line(m.u?'User '+m.u:'?',m.t,m.u&&m.u===myRank())});
  renderLog();ui()}
$('spLeave').onclick=async()=>{const b=batch;leaveLocal('');if(b)try{api.spore_leave({batch:b})}catch(e){}};
$('spAgain').onclick=()=>{if(G)seen=G.id;G=null;sel=null;$('spOver').hidden=true;$('spLog').textContent='';loc=[];ui();schedule(0)};
/* ---------- log + chat ---------- */
function say(m,c){loc.unshift([m,c||'']);loc=loc.slice(0,4);renderLog()}
function renderLog(){const box=$('spLog');box.textContent='';
  const rows=loc.concat(G&&G.ev?G.ev.slice().reverse():[]).slice(0,8);
  rows.forEach(e=>{const d=document.createElement('div');d.className=e[1]==='ok'?'sp-ok':e[1]==='bad'?'sp-bad':e[1]==='warn'?'sp-warn':'';d.textContent=String(e[0]).slice(0,120);box.appendChild(d)})}
function line(u,x,me){const d=document.createElement('div');d.className='nsm'+(me?' me':'');const b=document.createElement('b');b.textContent=u;d.append(b,document.createTextNode(x));$('spChat').appendChild(d);$('spChat').scrollTop=1e9}
function sys(x){const d=document.createElement('div');d.className='nsm sys';d.textContent=x;$('spChat').appendChild(d);$('spChat').scrollTop=1e9}
$('spCf').addEventListener('submit',async e=>{e.preventDefault();const x=$('spCi').value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,140);
  if(!x||!batch||Date.now()-sentAt<1000)return;sentAt=Date.now();$('spCi').value='';
  let r;try{r=await api.spore_chat({batch,text:x})}catch(e){r=null}
  if(!r||!r.ok)sys((r&&r.error)||'Could not send.');else schedule(0)});
setInterval(()=>{const n=Date.now(),w=Math.floor(n/CW);if(w!==cw){cw=w;$('spChat').textContent='';sys('Chat reset. Previous messages are gone.')}const s=Math.ceil(((cw+1)*CW-n)/1000);$('spCc').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},1000);
setInterval(()=>{if(alive&&!batch&&!document.hidden&&!$('spPS').hidden&&!$('spPick').hidden)search()},5000);
/* ---------- game UI ---------- */
function leftMs(){return G&&!G.over?Math.max(0,DUR*1000-(elAt+performance.now()-tAt)):G&&G.over?0:DUR*1000}
function shown(i){const n=G&&G.nodes[i]?G.nodes[i]:null,s=scan[i];if(s&&s.u>Date.now())return s.inf?'inf':'ok';return n&&n.i?'inf':'ok'}
function ui(){
  const me=myRank(),play=!!G&&!G.over,roster=(ST&&ST.roster)||[],ready=!G&&me&&roster[me-1]&&roster[me-1].r;
  $('spL').textContent=G?'Home nodes safe: '+HOME.filter(h=>shown(h)==='ok').length+'/5':'Accepted: '+roster.filter(p=>p.r).length+'/5';
  $('spOn').textContent='nodes online: '+(G?USERS:roster.length)+'/'+USERS+(me?' · you are User '+me:'')+(!G&&roster.length<USERS?' · awaiting others':'')+(settled?'':' · joining…');
  $('spPlayers').innerHTML=[0,1,2,3,4].map(i=>{const p=roster[i],c=G?G.cures[i]:CURES,mine=i===me-1;
    return '<div class="sp-pl'+(mine?' me':'')+'"><b>'+(G||p?(mine?'You':'User '+(i+1)):'Empty')+'</b>'+(G?'<span class="sp-pips">'+'●'.repeat(c)+'<span class="sp-dim">'+'○'.repeat(CURES-c)+'</span></span>':'<span class="'+(p&&p.r?'sp-ok':'sp-dim')+'">'+(p?(p.r?'Ready':'Waiting'):'-')+'</span>')+'</div>'}).join('');
  $('spGo').hidden=!!G;$('spGo').disabled=!settled||!me||!!ready;$('spGo').textContent=ready?'Accepted. Waiting for the others...':'Start';
  ['spCode','spCure','spScan'].forEach(i=>$(i).hidden=!play);
  $('spCure').disabled=!play||sel===null||!me||G.cures[me-1]===0;const sc=Date.now()<scanUntil;$('spScan').disabled=!play||sel===null||sc;$('spScan').textContent=sc?'Scanning...':'Scan';
  const sh=sel===null?null:shown(sel),nd=sel!==null&&G?G.nodes[sel]:null;
  $('spInfo').textContent=sel===null?(play?'You are User '+me+'. Tap a node.':'Tap a node.'):'Node '+(sel+1)+HL(sel)+': '+(sh==='inf'?'infected.'+(play&&nd&&nd.c?' Cure code: '+nd.c:''):'looks healthy.');
}
$('spGo').onclick=async()=>{if(!batch)return;$('spGo').disabled=true;let r;try{r=await api.spore_ready({batch})}catch(e){r=null}
  if(r&&!r.ok)say(r.error||'Could not start.','bad');schedule(0)};
async function cure(){if(!batch||!G||G.over||sel===null)return;const n=sel,c=code.value;code.value='';$('spCure').disabled=true;
  let r;try{r=await api.spore_cure({game:G.id,node:n,code:c})}catch(e){r=null}
  if(!r||!r.ok)say((r&&r.error)||'Could not send the cure.','bad');schedule(0);ui()}
$('spCure').onclick=cure;code.onkeydown=e=>{if(e.key==='Enter')cure()};
$('spScan').onclick=()=>{if(!G||G.over||sel===null||Date.now()<scanUntil)return;const i=sel,gid=G.id;scanUntil=Date.now()+3000;say('Scanning Node '+(i+1)+'...');ui();
  setTimeout(async()=>{let r;try{r=await api.spore_scan({game:gid,node:i})}catch(e){r=null}
    if(r&&r.ok){scan[i]={u:Date.now()+10000,inf:!!r.inf};say('Scan: Node '+(i+1)+' is '+(r.inf?'infected.':'clean.'),'ok')}else say((r&&r.error)||'Scan failed.','bad');
    scanUntil=0;ui();setTimeout(ui,10100)},3000);setTimeout(ui,3050)};
cv.onclick=e=>{const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let b=null,bd=30;POS.forEach((n,i)=>{const d=Math.hypot(n.x*W-mx,n.y*H-my);if(d<bd){bd=d;b=i}});sel=b;ui()};
function draw(){
  if(!alive)return;
  if(document.hidden||$('spGame').hidden||V.perf.skip("spore")){requestAnimationFrame(draw);return}
  if(!W||W!==cv.clientWidth)fit();
  const me=myRank(),l=Math.ceil(leftMs()/1000);
  if($('spT').textContent!==String(l))$('spT').textContent=l;
  $('spBar').style.width=(leftMs()/(DUR*1000)*100)+'%';
  cx.clearRect(0,0,W,H);cx.strokeStyle='rgba(255,255,255,.14)';cx.lineWidth=1;
  ADJ.forEach((a,i)=>a.forEach(j=>{if(j<i)return;cx.beginPath();cx.moveTo(POS[i].x*W,POS[i].y*H);cx.lineTo(POS[j].x*W,POS[j].y*H);cx.stroke()}));
  POS.forEach((n,i)=>{
    const inf=shown(i)==='inf',x=n.x*W,y=n.y*H,hu=HOME.indexOf(i);
    cx.save();if(inf){cx.shadowColor='#ff6b73';cx.shadowBlur=16}
    cx.fillStyle=inf?'#ff6b73':'#dfe3ea';cx.beginPath();cx.arc(x,y,11,0,7);cx.fill();cx.restore();
    if(sel===i){cx.strokeStyle='#fff';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,21,0,7);cx.stroke();cx.lineWidth=1}
    if(hu>=0){cx.strokeStyle='#8fe3a8';cx.lineWidth=hu===me-1?3:2;cx.beginPath();cx.arc(x,y,15,0,7);cx.stroke();cx.lineWidth=1}
    cx.fillStyle=hu>=0?'#f0f1f4':'#7d8088';cx.font='10px ui-monospace,monospace';cx.textAlign='center';cx.fillText(hu>=0?(hu===me-1?'YOU':'U'+(hu+1)):i+1,x,y+28);
  });
  requestAnimationFrame(draw)}
addEventListener('resize',fit);
V.spore={
  enter(){if(alive)return;alive=true;draw();if(batch){const b=batch;batch='';join(b,isRnd)}else view('p')},
  stop(){alive=false;clearTimeout(timer);timer=0;busy=false}
};
})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
(function(V){
const $=(s,r)=>(r||document).querySelector(s),api=V.services.api,esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>"&#"+c.charCodeAt(0)+";");
let cur="intro",back="done",entered=false,M=[],BI=[],nb=0,LB={remove:"Delete",ban:"Ban",unban:"Unban"};
/* Portal lock (member side): the server decides and enforces it on every request; this page only shows the notice and freezes the screen */
let PL=null,plBusy=false;
const leftTxt=ms=>{let s=Math.max(0,Math.ceil(ms/1000));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;const p=n=>String(n).padStart(2,"0");return(d?d+"d ":"")+p(h)+":"+p(m)+":"+p(s)};
function plTick(){if(!PL)return;const c=$("#plc");if(!PL.until){c.textContent="The founder will reopen the portal.";return}
 const rem=Date.parse(PL.until)-(Date.now()+PL.off);if(rem<=0){c.textContent="Reopening\u2026";plCheck();return}c.textContent="Reopens in "+leftTxt(rem)}
function showLock(r){if(!r)return;const first=!PL;PL={until:r.until||null,off:(+r.now||Date.now())-Date.now()};$("#plm").textContent=String(r.message||"");plTick();if(!first)return;
 document.body.classList.add("plocked");["main","#tabs","#cats","#fbtn","#lbtn"].forEach(q=>document.querySelectorAll(q).forEach(e=>{e.inert=true}));
 try{glStop()}catch(e){}setInterval(plTick,1000)}
async function plCheck(){if(plBusy||document.body.classList.contains("owner"))return;plBusy=true;let r;try{r=await api.lock_status()}catch(e){r=null}plBusy=false;
 if(!r||!r.ok)return;if(r.locked)showLock(r);else if(PL)location.reload()}
V.onlock=showLock;
setInterval(()=>{if(!document.hidden&&(PL||entered))plCheck()},10000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&(PL||entered))plCheck()});

const meP=api.me().catch(()=>({status:"none"}));
function go(n){if(n===cur)return;const nx=$('.view[data-view="'+n+'"]'),pv=$('.view[data-view="'+cur+'"]');
 pv.classList.add("out");pv.classList.remove("on");setTimeout(()=>pv.classList.remove("out"),520);
 nx.classList.add("on");nx.scrollTop=0;cur=n;document.body.dataset.view=n;if(n!=="intro"&&V.pyramid&&V.pyramid.stop)V.pyramid.stop();V.tg.haptic("light");V.card&&(V.card.view(n==="done"),(n==="letter"||n==="form")&&V.card.warm());
 document.querySelectorAll("#cats button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.go===n)));document.body.classList.remove("menu-open");if(n==="merits")loadMerits();if(n==="web")webLoad();if(n==="genesis")glStart();else glStop();if(V.spore){if(n==="spore")V.spore.enter();else V.spore.stop()}try{const bb=V.tg.app&&V.tg.app.BackButton;if(bb)n==="founders"||n==="lock"?bb.show():bb.hide()}catch(e){}}
let MEM=null,justDec=false;
const MASK="VC-\u2022\u2022Q\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022";
/* new members see the code only after one node sync; everyone else sees it right away */
function paintCode(){const m=MEM;if(!m)return;const lk=V.gate.locked(m);
 V.card&&V.card.set(m.name,lk?"":m.code,lk);
 $("#dcode").textContent=lk?MASK:m.code;$("#dcode").dataset.lk=lk?"1":"";$(".codebox").classList.toggle("lk",lk);
 $("#cdec").style.display=lk?"":"none";$("#clockn").style.display=lk?"":"none";
 $("#ccopy").style.display=lk?"none":"";$("#chelp").style.display=lk?"none":""}
function scramble(){const el=$("#dcode"),t=MEM.code,A="0123456789ABCDEFGHJKMNPQRSTVWXYZ";let n=0;const iv=setInterval(()=>{n++;const k=Math.floor(t.length*n/24);el.textContent=n>=24?t:t.split("").map((c,i)=>i<k||c==="-"?c:A[Math.floor(Math.random()*A.length)]).join("");if(n>=24)clearInterval(iv)},45)}
function startSync(mode,kind){V.sync.start(mode,kind);go("sync")}
function show(m){MEM=m;if(typeof m.locked!=="boolean"&&V.gate.isNew(m)&&!V.gate.isDecrypted())V.gate.markPending();V.sync.setUser(m.username||"");if(typeof m.web==="boolean")paintWeb(m.web);paintCode();$("#dn").textContent=m.name;$("#dc").textContent=m.country;$("#du").textContent=m.username?"@"+m.username:"Not set";$("#uclaim").style.display=m.username?"none":"block"}
async function enter(){if(entered)return;entered=true;const r=await meP;await V.gate.ready;if(r.status==="locked"){showLock(r);return}if(r.status==="error"){if(r.error)$("#dmsg").textContent=r.error;go("denied");return}if(r.status==="denied"||!r.status){document.body.classList.add("locked");if(r.error)$("#dmsg").textContent=r.error;go("denied");return}document.body.classList.add("ready");
 if(V.services.isOwner(r))document.body.classList.add("owner");
 if(r.status==="banned")go("banned");else if(r.status==="member"&&r.member){show(r.member);go("done")}else go("letter")}
setTimeout(enter,4800);
addEventListener("click",()=>{if(cur==="intro"&&performance.now()>1800)enter()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)});

try{const dn=new Intl.DisplayNames(["en"],{type:"region",fallback:"none"}),skip="EU UN EZ QO ZZ XA XB AC CP DG EA IC TA".split(" "),L=[];
 for(let a=65;a<91;a++)for(let b=65;b<91;b++){const c=String.fromCharCode(a,b),n=skip.includes(c)?null:dn.of(c);if(n)L.push(n)}
 L.sort((x,y)=>x.localeCompare(y));$("#ct").insertAdjacentHTML("beforeend",L.map(n=>'<option>'+n+'</option>').join(""))}catch(e){}
$("#dob").max=new Date().toISOString().slice(0,10);

$("#sub").addEventListener("click",async()=>{
 const err=$("#err"),g=$('input[name="g"]:checked'),p={name:$("#fn").value.trim().replace(/\s+/g," "),dob:$("#dob").value,country:$("#ct").value,gender:g?g.value:"",username:$("#un").value.trim().replace(/^@/,"").toLowerCase()};
 const bad=!/\p{L}.*\p{L}/u.test(p.name)?"Enter your full name.":!p.dob||p.dob>$("#dob").max||p.dob<"1900-01-01"?"Enter a valid date of birth.":!p.country?"Select your country of residence.":!p.gender?"Select your gender.":!p.username?"Choose a username.":!/^[a-z][a-z0-9_]{2,19}$/.test(p.username)?"Username must be 3-20 characters: letters, numbers, underscore, starting with a letter.":$("#un").dataset.ok==="0"?"That username is already taken.":"";
 err.textContent=bad;if(bad)return;
 const btn=$("#sub");btn.disabled=true;V.tg.haptic("medium");
 let r;try{r=await api.register(p)}catch(e){r={ok:false}}
 if(r&&r.status==="denied"){document.body.classList.add("locked");go("denied");return}if(!r||!r.ok||!r.member){err.textContent=(r&&r.error)||"Submission failed. Check your connection and try again.";btn.disabled=false;return}
 V.gate.markPending();show(r.member);go("done")});

/* Username: live availability check (the server still enforces uniqueness at save time) */
function watch(inp,hint){let t=0;inp.addEventListener("input",()=>{const k=++t;inp.value=inp.value.toLowerCase().replace(/[^a-z0-9_@]/g,"").replace(/^@/,"");const v=inp.value;inp.dataset.ok="";hint.className="note un";
  if(!v){hint.textContent="";return}
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(v)){hint.textContent="3-20 characters: letters, numbers, underscore. Start with a letter.";return}
  hint.textContent="Checking availability...";
  setTimeout(async()=>{if(k!==t)return;let r;try{r=await api.check_username(v)}catch(e){r=null}if(k!==t)return;
   if(!r||!r.ok){hint.textContent=(r&&r.error)||"Could not check right now.";return}
   if(r.available){inp.dataset.ok="1";hint.className="note un ok";hint.textContent="@"+v+" is available"}else{inp.dataset.ok="0";hint.className="note un no";hint.textContent=r.error||"@"+v+" is already taken"}},450)})}
watch($("#un"),$("#unh"));watch($("#uc"),$("#uch"));
$("#ucb").addEventListener("click",async()=>{const v=$("#uc").value.trim(),h=$("#uch");if(!/^[a-z][a-z0-9_]{2,19}$/.test(v)||$("#uc").dataset.ok==="0"){h.className="note un no";h.textContent=$("#uc").dataset.ok==="0"?"That username is already taken.":"Enter a valid username first.";return}
 const b=$("#ucb");b.disabled=true;let r;try{r=await api.set_username(v)}catch(e){r=null}b.disabled=false;
 if(r&&r.ok){$("#du").textContent="@"+r.username;if(MEM)MEM.username=r.username;V.sync.setUser(r.username);$("#uclaim").style.display="none"}else{h.className="note un no";h.textContent=(r&&r.error)||"Could not save. Try again."}});

/* Copy member code */
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}
 try{const a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;left:0;opacity:0";document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);const ok=document.execCommand("copy");a.remove();return ok}catch(e){return false}}
$("#ccopy").addEventListener("click",async()=>{const b=$("#ccopy"),l=b.querySelector("span"),t=$("#dcode").textContent.trim();if(!t||$("#dcode").dataset.lk)return;const ok=await copyText(t);V.tg.haptic(ok?"medium":"light");l.textContent=ok?"Copied":"Copy failed";b.classList.toggle("ok",ok);clearTimeout(b._t);b._t=setTimeout(()=>{l.textContent="Copy code";b.classList.remove("ok")},1800)});
$("#dcode").addEventListener("click",()=>{if(!$("#dcode").dataset.lk)$("#ccopy").click()});
$("#cdec").addEventListener("click",()=>startSync("decrypt"));
$("#chelp").addEventListener("click",()=>startSync("help"));
V.sync.onwin=async(mode,x,kind)=>{if(kind==="web"){if(mode==="decrypt")paintWeb(true);return}if(!MEM||!V.gate.locked(MEM))return;
 if(typeof MEM.locked==="boolean"){let r;try{r=await api.me()}catch(e){r=null}if(r&&r.member&&r.member.locked===false){justDec=true;show(r.member)}}
 else{V.gate.markDecrypted();justDec=true;paintCode()}};
V.sync.onexit=(reveal,kind)=>{if(kind==="web"){go("web");return}go("done");if(reveal&&justDec&&MEM){justDec=false;setTimeout(scramble,450)}};

/* Merits + Hall of Merit (the server decides what each row shows; member codes are never listed) */
const fmt=n=>(+n||0).toLocaleString("en-US");
async function loadMerits(){const hl=$("#hall");hl.innerHTML='<p class="note">Loading\u2026</p>';let r;try{r=await api.merits()}catch(e){r=null}
 const ok=!!(r&&r.ok),me=ok&&r.me?r.me:null,rows=ok&&Array.isArray(r.members)?r.members:[];
 $("#mv").textContent=fmt(me&&me.merits);$("#mr").textContent=me&&me.rank?"#"+me.rank:"\u2014";$("#ms").textContent=me&&me.status?me.status:"Active";
 $("#hc").textContent=rows.length?rows.length+(rows.length===1?" member":" members"):"";
 if(ok&&typeof r.wallet==="boolean")paintWallet(r.wallet);hl.innerHTML=rows.length?rows.map(m=>'<div class="hr'+(m.you?' me':'')+'"><span class="hk'+(m.rank<=3?' top':'')+'">'+String(m.rank).padStart(2,"0")+'</span><span class="hn"><b>'+esc(m.label||"Anonymous member")+(m.you?'<em>You</em>':'')+'</b><span class="st '+(String(m.status||"Active").toLowerCase()==="active"?"ok":"no")+'">'+esc(m.status||"Active")+'</span></span><span class="hm">'+fmt(m.merits)+'</span></div>').join(""):'<p class="note">No standings yet.</p>'}

/* Genesis Lock: live metrics from the backend (progress = members/150,000, accuracy = merits/1,000,000) */
let glT=0,glBusy=false;
const pct=v=>{v=+v||0;return v>0&&v<0.01?"<0.01%":v>=100?"100%":v.toFixed(2)+"%"};
function paintWallet(un){document.querySelectorAll(".wallet:not(.web)").forEach(w=>{w.classList.toggle("open",!!un);w.setAttribute("aria-label","BTC Wallet, "+(un?"unlocked":"locked"));const t=w.querySelector(".wt span"),p=w.querySelector(".wp");if(t)t.textContent=un?"Unlocked. Genesis Lock fully synchronized.":(w.id==="glw"?"Unlocks at full synchronization.":"Locked. Not accessible.");if(p)p.textContent=un?"Open":"Locked"})}
async function glLoad(){if(glBusy)return;glBusy=true;let r;try{r=await api.genesis()}catch(e){r=null}glBusy=false;
 if(!r||!r.ok)return;const p=Math.max(0,Math.min(100,+r.progress||0)),un=!!r.unlocked;
 $("#glp").textContent=pct(p);$("#glb").style.width=p+"%";$("#glb").parentNode.setAttribute("aria-valuenow",p.toFixed(2));
 $("#glo").textContent=fmt(r.online);$("#gls").textContent=(+r.stability||0).toFixed(1)+"%";$("#gla").textContent=pct(r.accuracy);
 const st=$("#glst");st.classList.toggle("ok",un);st.textContent=un?"Status: Fully Synchronized":"Status: Awaiting Full Synchronization";paintWallet(un)}
function glStart(){glStop();glLoad();glT=setInterval(()=>{if(!document.hidden)glLoad()},8000)}
function glStop(){clearInterval(glT);glT=0}

/* Access Web: locked until a 100-node synchronization is decrypted (the server decides, this only shows it) */
let webBusy=false;
function paintWeb(un){un=!!un;const w=$("#webw");w.classList.toggle("open",un);w.setAttribute("aria-label","Web access, "+(un?"unlocked":"locked"));
 w.querySelector(".wt span").textContent=un?"Unlocked. Your node synchronization is decrypted.":"Locked. Decrypt a 100-node synchronization to unlock.";$("#webp").textContent=un?"Open":"Locked";
 $("#webdec").style.display=un?"none":"";$("#webgo").style.display=un?"":"none";$("#webhelp").style.display=un?"":"none";
 $("#webn").textContent=un?"Web access is unlocked permanently. You can still join a batch to help other members reach 100 nodes. You earn 10 merits for every new member you help unlock.":"The decryption runs once. Join a batch with other members, rebuild your reference code before the 7 second timer ends, and when 100 nodes align together web access opens permanently."}
async function webLoad(){if(webBusy)return;webBusy=true;let r;try{r=await api.web_status()}catch(e){r=null}webBusy=false;if(r&&r.ok)paintWeb(r.web)}
$("#webdec").addEventListener("click",()=>startSync("decrypt","web"));
$("#webgo").addEventListener("click",()=>{const u="https://vssociety.site";try{const t=V.tg.app;if(t&&t.openLink){t.openLink(u);return}}catch(e){}window.open(u,"_blank","noopener")});
$("#webhelp").addEventListener("click",()=>startSync("help","web"));

/* Founders (owner only; the backend enforces this too) */
async function load(){const r=await api.list();if(!r||!r.ok){$("#fl").innerHTML="<p>"+esc((r&&r.error)||"Could not load members.")+"</p>";return}M=r.members||[];BI=Array.isArray(r.banned_ids)?r.banned_ids:[];nb=Array.isArray(r.banned_ids)?BI.length:(r.banned||0);draw()}
const PN={};const paintMerit=id=>{const m=M.find(x=>x.uid===id);if(!m)return;document.querySelectorAll("#fl .mv").forEach(el=>{if(el.dataset.uid!==id)return;el.textContent=+m.merits||0;el.classList.remove("pop");void el.offsetWidth;el.classList.add("pop")})};
const MB=id=>[-5,-1,1,5].map(n=>'<button data-merit="'+n+'" data-id="'+esc(id)+'">'+(n<0?"\u2212":"+")+Math.abs(n)+'</button>').join("");
function draw(){const q=$("#fq").value.trim().toLowerCase(),BS=new Set(BI.concat(M.filter(m=>m.banned).map(m=>m.uid))),
 rows=M.filter(m=>[m.code,m.legacy_code,m.username,m.name,m.country,m.uid,m.tg||m.tg_username].join(" ").toLowerCase().includes(q)),
 orph=[...BS].filter(id=>!M.some(m=>m.uid===id)&&String(id).toLowerCase().includes(q));
 $("#fc").textContent=M.length+" members, "+BS.size+" banned";
 const bt=(a,id,banned)=>'<button class="'+(a==="remove"?"del":a)+'" data-act="'+a+'" data-id="'+esc(id)+'">'+LB[a]+'</button>';
 $("#fl").innerHTML=rows.map(m=>{const bn=BS.has(m.uid);return '<div class="mem"><div class="mh"><b>'+esc(m.code)+(bn?'<span class="tag">Banned</span>':'')+'</b><div class="ma">'+bt("remove",m.uid)+(bn?bt("unban",m.uid):bt("ban",m.uid))+'</div></div><dl><dt>Name</dt><dd>'+esc(m.name)+'</dd><dt>User</dt><dd>'+(m.username?'@'+esc(m.username):'-')+'</dd><dt>Old code</dt><dd>'+esc(m.legacy_code||'-')+'</dd><dt>Merits</dt><dd><b class="mv" data-uid="'+esc(m.uid)+'">'+(+m.merits||0)+'</b><span class="mc">'+MB(m.uid)+'</span></dd><dt>Born</dt><dd>'+esc(m.dob)+'</dd><dt>Country</dt><dd>'+esc(m.country)+'</dd><dt>Gender</dt><dd>'+esc(m.gender)+'</dd><dt>Account</dt><dd>'+esc(m.uid)+((m.tg||m.tg_username)?" @"+esc(m.tg||m.tg_username):"")+'</dd><dt>Joined</dt><dd>'+esc(String(m.at||m.created_at||"").slice(0,10))+'</dd></dl></div>'}).join("")||"<p>No members found.</p>";
 if(orph.length)$("#fl").insertAdjacentHTML("beforeend",'<div class="bh">Banned, no longer a member</div>'+orph.map(id=>'<div class="mem"><div class="mh"><b>'+esc(id)+'<span class="tag">Banned</span></b><div class="ma">'+bt("unban",id)+'</div></div></div>').join(""))}
$("#fbtn").onclick=async()=>{back=cur;go("founders");await load()};
$("#fback").onclick=()=>go(back);
try{V.tg.app&&V.tg.app.BackButton&&V.tg.app.BackButton.onClick(()=>{if(cur==="founders"||cur==="lock")go(back)})}catch(e){}
$("#fq").oninput=draw;
$("#fl").onclick=async e=>{const mb=e.target.closest("[data-merit]");if(mb){const id=mb.dataset.id,d=+mb.dataset.merit,m=M.find(x=>x.uid===id);if(!m)return;
  const prev=+m.merits||0,gain=Math.max(0,prev+d)-prev;if(!gain)return;
  m.merits=prev+gain;paintMerit(id);V.tg.haptic("light");PN[id]=(PN[id]||0)+1;
  let r;try{r=await api.award_merit({id,delta:gain})}catch(x){r=null}
  PN[id]--;
  if(r&&r.ok){if(!PN[id]&&typeof r.merits==="number"){m.merits=r.merits;paintMerit(id)}}
  else{m.merits=Math.max(0,(+m.merits||0)-gain);paintMerit(id);mb.textContent="Failed";setTimeout(()=>{mb.textContent=(d<0?"\u2212":"+")+Math.abs(d)},1200)}
  return}
 const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
 if(a!=="unban"&&!b.dataset.arm){b.dataset.arm=1;b.textContent="Tap again to confirm";setTimeout(()=>{b.dataset.arm="";b.textContent=LB[a]},4000);return}
 b.disabled=true;let r;try{r=await api[a](b.dataset.id)}catch(x){r=null}if(r&&r.ok)await load();else{b.disabled=false;b.textContent="Failed. Try again"}};

/* Portal lock: founder controls. The backend enforces the lock, the exceptions and the expiry; the founder is never locked out. */
let LK=null,LM=[],EXS=new Set(),lkLast=0,lkBusy=false;
const lkNote=(t,bad)=>{const n=$("#lnote");n.textContent=t||"";n.style.color=bad?"#ff9a9a":""};
const lkName=id=>{const m=LM.find(x=>x.uid===id);return m?(m.username?"@"+m.username:(m.name||id)):id};
const lkCnt=()=>{$("#lcnt").textContent=$("#lmsg").value.length+"/500"};
function lkDraw(){const q=$("#lq").value.trim().toLowerCase();
 $("#lex").innerHTML=EXS.size?[...EXS].map(id=>'<button type="button" class="lchip" data-lx="'+esc(id)+'" aria-label="Remove exception">'+esc(lkName(id))+' \u00d7</button>').join(""):'<p class="note" style="margin:0">No exceptions yet. Only you can enter while the portal is locked.</p>';
 const rows=LM.filter(m=>!q||[m.username,m.name,m.code,m.uid,m.tg_username,m.tg].join(" ").toLowerCase().includes(q)).slice(0,40);
 $("#llist").innerHTML=rows.map(m=>{const on=EXS.has(m.uid);return '<div class="lrow"><div class="lwho"><b>'+esc(m.username?"@"+m.username:(m.name||"Member"))+'</b><small>'+esc(m.name||"")+' \u00b7 '+esc(m.uid)+'</small></div><button type="button" class="lbt'+(on?" on":"")+'" data-la="'+esc(m.uid)+'">'+(on?"Allowed":"Allow")+'</button></div>'}).join("")||'<p class="note">No members found.</p>'}
function lkPaint(){if(!LK)return;const s=$("#lkst"),rem=LK.locked&&LK.until?Date.parse(LK.until)-(Date.now()+LK.off):null;
 if(rem!==null&&rem<=0&&Date.now()-lkLast>4000){lkLoad();return}
 s.className="lkst"+(LK.locked?" on":"");
 s.textContent=LK.locked?(rem!==null?"Portal locked. Reopens automatically in "+leftTxt(rem):"Portal locked until you unlock it."):"Portal open. Members have full access.";
 const g=$("#lgo");if(!g.dataset.arm)g.textContent=LK.locked?"Unlock portal":"Lock portal";
 $("#lrs").style.display=LK.locked?"":"none";$("#lst").textContent=LK.locked?"Locked":"Open"}
function lkApply(r,fill){LK={locked:!!r.locked,until:r.until||null,off:(+r.now||Date.now())-Date.now()};lkLast=Date.now();
 if(fill){$("#lmsg").value=r.message||"";lkCnt();EXS=new Set(Array.isArray(r.exceptions)?r.exceptions:[])}lkPaint();lkDraw()}
async function lkLoad(fill){if(lkBusy)return;lkBusy=true;lkLast=Date.now();let r;try{r=await api.lock_get()}catch(e){r=null}lkBusy=false;
 if(!r||!r.ok){lkNote((r&&r.error)||"Could not load the lock settings.",1);return}lkApply(r,fill)}
async function lkOpen(){lkNote("");$("#lq").value="";LK=null;$("#lkst").className="lkst";$("#lkst").textContent="Loading\u2026";
 const l=api.list().catch(()=>null);await lkLoad(true);const r=await l;
 if(r&&r.ok&&Array.isArray(r.members)){LM=r.members;lkDraw()}else if(!LM.length)lkNote("Could not load the member list.",1)}
function lkDraft(){const msg=$("#lmsg").value.trim();if(!msg){lkNote("Write the warning members will see.",1);return null}if(msg.length>500){lkNote("The warning is limited to 500 characters.",1);return null}return{message:msg,exceptions:[...EXS]}}
function lkMinutes(){const u=+$("#lunit").value;if(!u)return{ok:true,m:null};const n=Number($("#lnum").value),m=n*u;
 if(!Number.isInteger(n)||n<1||!Number.isInteger(m)||m>525600){lkNote("Enter a whole number, from 1 minute up to 365 days.",1);return{ok:false}}return{ok:true,m}}
async function lkSend(act,payload,btn){lkNote("");btn.disabled=true;let r;try{r=await api[act](payload)}catch(e){r=null}btn.disabled=false;
 if(r&&r.ok){lkApply(r,true);V.tg.haptic("medium");return true}lkNote((r&&r.error)||"Failed. Try again.",1);return false}
$("#lbtn").onclick=async()=>{back=cur;go("lock");await lkOpen()};
$("#lback").onclick=()=>go(back);
$("#lmsg").oninput=lkCnt;$("#lq").oninput=lkDraw;
$("#lunit").onchange=()=>{$("#lnum").disabled=!+$("#lunit").value};
$("#lex").onclick=e=>{const b=e.target.closest("[data-lx]");if(!b)return;EXS.delete(b.dataset.lx);lkDraw()};
$("#llist").onclick=e=>{const b=e.target.closest("[data-la]");if(!b)return;const id=b.dataset.la;
 if(EXS.has(id))EXS.delete(id);else{if(EXS.size>=100){lkNote("Up to 100 exceptions.",1);return}EXS.add(id)}lkNote("");lkDraw()};
$("#lsave").onclick=async()=>{const d=lkDraft();if(!d)return;if(await lkSend("lock_save",d,$("#lsave")))lkNote("Saved.")};
$("#lrs").onclick=async()=>{const d=lkDraft(),t=lkMinutes();if(!d||!t.ok)return;if(await lkSend("lock_set",Object.assign({locked:true,minutes:t.m},d),$("#lrs")))lkNote("Timer restarted.")};
$("#lgo").onclick=async()=>{const b=$("#lgo");if(!LK)return;
 if(!b.dataset.arm){b.dataset.arm="1";b.textContent=LK.locked?"Tap again to unlock":"Tap again to lock everyone out";clearTimeout(b._t);b._t=setTimeout(()=>{b.dataset.arm="";lkPaint()},4000);return}
 clearTimeout(b._t);b.dataset.arm="";
 if(LK.locked){if(await lkSend("lock_set",{locked:false},b))lkNote("Portal unlocked.");lkPaint();return}
 const d=lkDraft(),t=lkMinutes();if(!d||!t.ok){lkPaint();return}
 if(await lkSend("lock_set",Object.assign({locked:true,minutes:t.m},d),b))lkNote("Portal locked.");lkPaint()};
setInterval(()=>{if(cur==="lock"&&LK&&!document.hidden)lkPaint()},1000);
})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
/* Sidebar menu */
(function(){const b=document.body,mb=document.getElementById("menubtn"),sc=document.getElementById("menuscrim"),ct=document.getElementById("cats");
const set=o=>{b.classList.toggle("menu-open",o);mb.setAttribute("aria-expanded",String(o));mb.setAttribute("aria-label",o?"Close menu":"Open menu")};
mb.onclick=()=>set(!b.classList.contains("menu-open"));sc.onclick=()=>set(false);
document.addEventListener("keydown",e=>{if(e.key==="Escape")set(false)});
ct.addEventListener("click",e=>{if(e.target.closest("button"))set(false)});
const via=id=>()=>{set(false);const t=document.getElementById(id);if(t)t.click()};
document.getElementById("mfound").onclick=via("fbtn");document.getElementById("mlock").onclick=via("lbtn");
new MutationObserver(()=>{if(!b.classList.contains("menu-open"))mb.setAttribute("aria-expanded","false")}).observe(b,{attributes:true,attributeFilter:["class"]});
})();
}catch(e){console.error(e)}
try{
/* measure the countdown bar so sections always stop just above it */
(function(){const t=document.getElementById("tabs");if(!t)return;
const f=()=>{const h=Math.ceil(t.offsetHeight);if(h>0)document.documentElement.style.setProperty("--dock-h",h+"px")};
f();if(window.ResizeObserver)new ResizeObserver(f).observe(t);addEventListener("resize",f);})();
}catch(e){console.error(e)}
try{
/* keep the focused field in view when the on-screen keyboard opens */
(function(){let t=0;
document.addEventListener("focusin",e=>{const el=e.target;if(!el||!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.type==="checkbox"||el.type==="radio")return;
 clearTimeout(t);t=setTimeout(()=>{try{if(document.activeElement===el)el.scrollIntoView({block:"center",behavior:"smooth"})}catch(_){}},320)});
})();
}catch(e){console.error(e)}
