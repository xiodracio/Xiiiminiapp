try{
window.ILLUMINATI={config:{
 countdown:{start:[2026,10,1,0,0,0],end:[2027,0,1,0,0,0]},
 syncFrom:"2026-11-10T00:00:00Z",   /* members who registered at/after this moment must complete one node sync to decrypt their code. Older members never have to. */
 demoMode:false,        /* true = this device acts as owner (testing). Set false in production */
 supabase:{url:"https://agzhxwditnlzdcuqjjfz.supabase.co",anonKey:"sb_publishable_-B_v-SqjFjh_Q8R29CksBQ_nO4KgmYy",fn:"illuminati-portal"}  /* fill url + anonKey to switch from local storage to Supabase */
}};
/* Backend seam: the UI only calls V.services.api.{me,register,list,remove,ban,unban}. Local storage below; Supabase Edge Function when configured. */
(function(V){
const C=V.config,S=C.supabase,KM="vm_members",KB="vm_banned",KD="vm_device";
const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const uid=()=>{if(V.tg.user)return String(V.tg.user.id);let d=ls.get(KD,"");if(!d){d="dev-"+Math.random().toString(36).slice(2,10);ls.set(KD,d)}return d};
const AL="0123456789ABCDEFGHJKMNPQRSTVWXYZ",UNRE=/^[a-z][a-z0-9_]{2,19}$/;
/* Code format: VC-<YY>Q<q>-<batch>-<member no>-<integrity>. Local/test mode only; the real codes are issued by the server. */
const mkCode=L=>{const d=new Date(),q=String(d.getUTCFullYear()).slice(2)+"Q"+(Math.floor(d.getUTCMonth()/3)+1);let b=ls.get("vm_batch","");if(!b){b=[...crypto.getRandomValues(new Uint8Array(2))].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();ls.set("vm_batch",b)}
 let c;do{const n=String(1+crypto.getRandomValues(new Uint32Array(1))[0]%9999).padStart(4,"0"),i=[...crypto.getRandomValues(new Uint8Array(4))].map(x=>AL[x&31]).join("");c="VC-"+q+"-"+b+"-"+n+"-"+i}while(L.some(m=>m.code===c||String(m.code).slice(-4)===c.slice(-4)||String(m.code).slice(0,-5)===c.slice(0,-5)));return c};
const local={
 me:async()=>{const id=uid();if(ls.get(KB,[]).includes(id))return{status:"banned"};const m=ls.get(KM,[]).find(x=>x.uid===id);return m?{status:"member",member:m}:{status:"none"}},
 register:async p=>{const id=uid(),L=ls.get(KM,[]);if(ls.get(KB,[]).includes(id))return{ok:false,error:"Access revoked."};
  if(L.some(x=>x.uid===id))return{ok:false,error:"This account has already registered."};
  const un=String(p.username||"").toLowerCase();if(!un)return{ok:false,error:"Choose a username.",field:"username"};if(un&&(!UNRE.test(un)||L.some(x=>x.username===un)))return{ok:false,error:un&&UNRE.test(un)?"That username is already taken.":"Invalid username.",field:"username"};
  const m=Object.assign({uid:id,code:mkCode(L),at:new Date().toISOString(),tg:V.tg.user&&V.tg.user.username||""},p);L.push(m);ls.set(KM,L);return{ok:true,member:m}},
 list:async()=>{const B=ls.get(KB,[]);return{ok:true,members:ls.get(KM,[]).map(m=>Object.assign({},m,{banned:B.includes(m.uid)})),banned:B.length,banned_ids:B}},
 check_username:async n=>{const u=String(n||"").toLowerCase();if(!UNRE.test(u))return{ok:true,available:false,error:"Invalid username."};const id=uid();return{ok:true,available:!ls.get(KM,[]).some(x=>x.username===u&&x.uid!==id),username:u}},
 set_username:async n=>{const id=uid(),u=String(n||"").toLowerCase(),L=ls.get(KM,[]),m=L.find(x=>x.uid===id);if(!m)return{ok:false,error:"Complete your member profile first."};if(m.username)return{ok:false,error:"Your username is already set and cannot be changed."};if(!UNRE.test(u))return{ok:false,error:"Invalid username."};if(L.some(x=>x.username===u))return{ok:false,error:"That username is already taken."};m.username=u;ls.set(KM,L);return{ok:true,username:u}},
 merits:async()=>{const id=uid(),B=ls.get(KB,[]),rows=ls.get(KM,[]).map(m=>({u:m.uid,label:m.username?"@"+m.username:"Anonymous member",merits:+m.merits||0,status:B.includes(m.uid)?"Revoked":"Active",t:m.at||""})).sort((a,b)=>b.merits-a.merits||String(a.t).localeCompare(String(b.t)));
  rows.forEach((r,i)=>{r.rank=i+1;r.you=r.u===id;delete r.u;delete r.t});
  const me=rows.find(r=>r.you);return{ok:true,me:me?{merits:me.merits,rank:me.rank,status:me.status}:null,members:rows}},
 award_merit:async d=>{const L=ls.get(KM,[]),m=L.find(x=>x.uid===(d&&d.id));if(!m)return{ok:false,error:"Member not found."};m.merits=Math.max(0,(+m.merits||0)+(+d.delta||0));ls.set(KM,L);return{ok:true,merits:m.merits}},
 genesis:async()=>{const B=ls.get(KB,[]),L=ls.get(KM,[]).filter(m=>!B.includes(m.uid)),mer=L.reduce((a,m)=>a+(+m.merits||0),0),pr=Math.min(100,L.length*100/150000),ac=Math.min(100,mer*100/1e6);return{ok:true,progress:pr,accuracy:ac,stability:100,online:1,unlocked:pr>=100&&ac>=100}},
 remove:async id=>{ls.set(KM,ls.get(KM,[]).filter(x=>x.uid!==id));return{ok:true}},
 ban:async id=>{const B=ls.get(KB,[]);if(!B.includes(id)){B.push(id);ls.set(KB,B)}return{ok:true}},
 unban:async id=>{ls.set(KB,ls.get(KB,[]).filter(x=>x!==id));return{ok:true}}
};
const nosync=async()=>({ok:false,error:"Node sync needs the live backend."}),nolock=async()=>({ok:false,error:"Portal lock needs the live backend."});
const call=(a,ka,fn)=>async d=>{try{const r=await fetch(S.url+"/functions/v1/"+(fn||S.fn),{method:"POST",...(ka?{keepalive:true}:{}),headers:{"Content-Type":"application/json",apikey:S.anonKey,...(S.anonKey.startsWith("eyJ")?{Authorization:"Bearer "+S.anonKey}:{})},body:JSON.stringify({action:a,initData:V.tg.initData,data:d})});const j=await r.json();try{if(j&&j.status==="locked"&&V.onlock)V.onlock(j)}catch(e){}return j}catch(e){return{ok:false,error:"Network error. Try again."}}};
V.services={api:S.url?{me:call("me"),register:call("register"),list:call("list"),remove:call("remove"),ban:call("ban"),unban:call("unban"),check_username:call("check_username"),set_username:call("set_username"),merits:call("merits"),genesis:call("genesis"),award_merit:call("award_merit"),sync_search:call("sync_search"),sync_create:call("sync_create"),sync_random:call("sync_random"),sync_ping:call("sync_ping"),sync_done:call("sync_done"),sync_round:call("sync_round"),sync_leave:call("sync_leave",true),sync_chat:call("sync_chat"),web_status:call("web_status"),lock_status:call("lock_status"),lock_get:call("lock_get"),lock_set:call("lock_set"),lock_save:call("lock_save"),spore_search:call("spore_search",0,"illuminati-spore"),spore_create:call("spore_create",0,"illuminati-spore"),spore_random:call("spore_random",0,"illuminati-spore"),spore_state:call("spore_state",0,"illuminati-spore"),spore_ready:call("spore_ready",0,"illuminati-spore"),spore_cure:call("spore_cure",0,"illuminati-spore"),spore_scan:call("spore_scan",0,"illuminati-spore"),spore_leave:call("spore_leave",1,"illuminati-spore"),spore_chat:call("spore_chat",0,"illuminati-spore")}:Object.assign({},local,{spore_search:async()=>({ok:false,error:"Spore needs the live backend."}),spore_create:async()=>({ok:false,error:"Spore needs the live backend."}),spore_random:async()=>({ok:false,error:"Spore needs the live backend."}),spore_state:async()=>({ok:false,error:"Spore needs the live backend."}),spore_ready:async()=>({ok:false,error:"Spore needs the live backend."}),spore_cure:async()=>({ok:false,error:"Spore needs the live backend."}),spore_scan:async()=>({ok:false,error:"Spore needs the live backend."}),spore_leave:async()=>({ok:false,error:"Spore needs the live backend."}),spore_chat:async()=>({ok:false,error:"Spore needs the live backend."}),lock_status:async()=>({ok:true,locked:false}),lock_get:nolock,lock_set:nolock,lock_save:nolock,sync_search:nosync,sync_create:nosync,sync_random:nosync,sync_ping:nosync,sync_done:nosync,sync_round:nosync,sync_leave:nosync,sync_chat:nosync,web_status:async()=>({ok:true,web:false})}),
 isOwner:r=>S.url?!!(r&&r.owner):!!C.demoMode};
})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
(function (V) {
  const tg = window.Telegram && Telegram.WebApp;
  V.tg = {
    app: tg || null,
    user: tg && tg.initDataUnsafe ? tg.initDataUnsafe.user || null : null,
    initData: tg ? tg.initData : "",
    haptic(kind) { try { tg && tg.HapticFeedback.impactOccurred(kind || "light"); } catch (e) {} },
    open(url) { tg && tg.openLink ? tg.openLink(url) : window.open(url, "_blank", "noopener"); }
  };
  if (!tg) return;
  try {
    tg.ready(); tg.expand();
    tg.setHeaderColor("#000000"); tg.setBackgroundColor("#000000"); tg.setBottomBarColor && tg.setBottomBarColor("#000000");
    tg.disableVerticalSwipes && tg.disableVerticalSwipes();
    const root = document.documentElement.style;
    const sync = () => {
      root.setProperty("--tg-h", (tg.viewportStableHeight || innerHeight) + "px");
      const a = tg.safeAreaInset || {}, b = tg.contentSafeAreaInset || {};
      root.setProperty("--tg-sat", ((a.top || 0) + (b.top || 0)) + "px");
      root.setProperty("--tg-sab", ((a.bottom || 0) + (b.bottom || 0)) + "px");
      root.setProperty("--tg-sal", ((a.left || 0) + (b.left || 0)) + "px");
      root.setProperty("--tg-sar", ((a.right || 0) + (b.right || 0)) + "px");
    };
    ["viewportChanged", "safeAreaChanged", "contentSafeAreaChanged", "fullscreenChanged"].forEach(ev => tg.onEvent(ev, sync)); sync(); addEventListener("resize", sync);
  } catch (e) {}
})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
(function(V){const c=V.config.countdown,mk=a=>new Date(a[0],a[1],a[2],a[3],a[4],a[5]),s0=mk(c.start),s1=mk(c.end),$=i=>document.getElementById(i),pd=n=>String(n).padStart(2,"0");
function tick(){const n=new Date();let t,l;
if(n<s0){t=s0;l="The countdown begins 1 November"}else if(n<s1){t=s1;l="Operation: New Order commences in"}else{t=null;l="Operation: New Order has begun"}
$("cdTitle").textContent=l;const s=Math.floor((t?Math.max(0,t-n):0)/1000);
$("d").textContent=pd(Math.floor(s/86400));$("h").textContent=pd(Math.floor(s%86400/3600));$("m").textContent=pd(Math.floor(s%3600/60));$("s").textContent=pd(s%60)}
tick();setInterval(tick,1000)})(window.ILLUMINATI);
}catch(e){console.error(e)}
try{
/* Device profile + adaptive quality. Reads the device once, tags <html data-perf>, and gives the 3D scenes and the Spore canvas one shared pixel-ratio cap, frame cap and live resolution governor. No network, no backend wiring. */
(function(V){
const n=navigator,cn=n.connection||n.mozConnection||n.webkitConnection||{},ua=n.userAgent||"",
mem=+n.deviceMemory||0,cores=+n.hardwareConcurrency||0,
tg=V.tg&&V.tg.app,plat=String(tg&&tg.platform||"").toLowerCase(),
ios=/iP(hone|ad|od)/.test(ua)||(/Macintosh/.test(ua)&&n.maxTouchPoints>1)||plat==="ios",
mq=q=>{try{return matchMedia(q).matches}catch(e){return false}},
save=!!cn.saveData||/(^|-)2g$/.test(cn.effectiveType||"");
const KEY="vm_perf",st={get(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},set(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}};
let tier;
if(save)tier="low";
else if(ios)tier=cores>=6?"high":"mid";                       /* iOS hides memory; its GPUs are strong */
else if((mem&&mem<=2)||(cores&&cores<=2))tier="low";
else if((mem&&mem<=4)||(cores&&cores<=4))tier="mid";
else tier="high";
const old=st.get();if(old&&old.t==="low"&&Date.now()-old.at<2592e5)tier="low";   /* a device that struggled recently starts light for 3 days */
const T={
 low:{dpr:1.25,fps:30,aa:false,geo:{bevel:3,curve:2,refine:.42}},
 mid:{dpr:1.75,fps:0,aa:true,geo:{bevel:5,curve:3,refine:.28}},
 high:{dpr:2,fps:0,aa:true,geo:{bevel:8,curve:4,refine:.22}}};
const c=T[tier],P=V.perf={tier,maxDpr:c.dpr,dpr:Math.min(devicePixelRatio||1,c.dpr),fps:c.fps,aa:c.aa,geo:c.geo,ios,platform:plat,save,reduce:mq("(prefers-reduced-motion: reduce)")};
const de=document.documentElement;de.setAttribute("data-perf",tier);de.setAttribute("data-input",mq("(hover:hover) and (pointer:fine)")?"mouse":"touch");if(plat)de.setAttribute("data-platform",plat);
/* frame cap: true = skip this frame */
const lt={};P.skip=(k,f)=>{f=f||P.fps;if(!f)return false;const t=performance.now();if(t-(lt[k]||0)<1000/f-4)return true;lt[k]=t;return false};
/* live resolution governor: steps the render scale down when frames run long, back up when there is headroom; if even the lowest scale struggles it drops the whole UI to the light style */
const G=new WeakMap();
P.gov=(R,now)=>{let s=G.get(R);if(!s){const m=R.getPixelRatio();s={max:m,min:Math.min(m,.75),cur:m,prev:0,acc:0,cnt:0,warm:0,good:0,bad:0};G.set(R,s)}
 const p=s.prev;s.prev=now;if(!p)return;const d=now-p;if(d>250||d<=0)return;     /* tab was hidden or paused */
 if(s.warm<90){s.warm++;return}                                                 /* ignore shader compile and first-frame cost */
 s.acc+=d;if(++s.cnt<45)return;const avg=s.acc/s.cnt;s.acc=s.cnt=0;
 if(avg>36){s.good=0;if(s.cur>s.min){s.cur=Math.max(s.min,+(s.cur-.25).toFixed(2));R.setPixelRatio(s.cur);s.bad=0}else if(++s.bad>=3)P.demote()}
 else{s.bad=0;if(avg<18){if(++s.good>=4&&s.cur<s.max){s.cur=Math.min(s.max,+(s.cur+.25).toFixed(2));R.setPixelRatio(s.cur);s.good=0}}else s.good=0}};
P.demote=()=>{if(P.tier==="low")return;P.tier="low";P.fps=T.low.fps;de.setAttribute("data-perf","low");st.set({t:"low",at:Date.now()})};
})(window.ILLUMINATI);
}catch(e){console.error(e)}
