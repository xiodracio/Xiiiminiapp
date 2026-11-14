/* Digital Membership Card: 3D card on the Profile received screen. Reuses the pyramid data loaded above; built lazily when the screen opens. */
(function(V){
const PYR=window.ILLUMINATI_MODEL.PYR;
const IMG={f:"assets/card-front.9cc29972.png",b:"assets/card-back.e8cff1dd.png"};
const $=id=>document.getElementById(id);
let NAME="",CODE="",LOCK=false,inited=false,active=false,tok=0,R=null,draw=()=>{},loop=null;
function init(){
inited=true;
const cv=$('cardGl');
try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){R=null;$('cfb').style.display='flex';cv.style.display='none';return false}
const LOW=(navigator.deviceMemory&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)||V.perf.tier==="low";
R.setPixelRatio(LOW?1.25:V.perf.dpr);R.outputEncoding=THREE.sRGBEncoding;R.setClearColor(0,0);
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false});cv.addEventListener('webglcontextrestored',()=>location.reload());
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.1,50);
(function(){const w=2048,h=1024,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
const sky=g.createLinearGradient(0,0,0,h);[[0,'#9aa3ad'],[.42,'#2a2e34'],[.5,'#e8edf2'],[.53,'#14161a'],[1,'#050506']].forEach(s=>sky.addColorStop(s[0],s[1]));g.fillStyle=sky;g.fillRect(0,0,w,h);
const box=(x,y,bw,bh,a)=>{const gr=g.createLinearGradient(x,y,x,y+bh);gr.addColorStop(0,'rgba(255,255,255,'+a+')');gr.addColorStop(1,'rgba(235,242,255,'+a*.75+')');g.fillStyle=gr;g.fillRect(x,y,bw,bh)};
box(150,120,260,360,1);box(560,60,120,430,.95);box(930,140,380,250,1);box(1480,80,90,440,.9);box(1700,150,280,330,1);box(0,560,2048,26,.55);box(300,700,460,120,.35);box(1250,690,560,150,.3);
const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
scene.environment=new THREE.PMREMGenerator(R).fromEquirectangular(t).texture;t.dispose()})();
const W=3.2,H=2,D=.03,RAD=85/1920*W;
function rr(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
const body=new THREE.Mesh(new THREE.ExtrudeGeometry(rr(W-.012,H-.012,RAD),{depth:D,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:3,curveSegments:16}),
new THREE.MeshStandardMaterial({color:0xb9bec6,metalness:1,roughness:.28,envMapIntensity:1.3}));
body.position.z=-D/2;
const CW=1600,CH=1000,K=CW/1920;
function cvs(){const c=document.createElement('canvas');c.width=CW;c.height=CH;return c}
const cF=cvs(),cB=cvs(),gF=cF.getContext('2d'),gB=cB.getContext('2d');
const mx=Math.min(8,R.capabilities.getMaxAnisotropy());
function face(c){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=mx;
const m=new THREE.MeshPhysicalMaterial({color:0x101114,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.95,map:t,metalness:.2,roughness:.32,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.55,transparent:true,alphaTest:.02});
const p=new THREE.Mesh(new THREE.PlaneGeometry(W,H),m);p.userData.t=t;return p}
const front=face(cF),back=face(cB);
front.position.z=D/2+.0045;back.position.z=-D/2-.0045;back.rotation.y=Math.PI;
const card=new THREE.Group();card.add(body,front,back);scene.add(card);
const PYR_FACE=-Math.PI/6;const FRONT_Z=D/2+.0045;
let lent=null,pyr=null,S2=null,cam2=null,RT=null;
try{
/* lenticular print: the eye-pyramid is rendered off-screen and printed flat on the card face; tilting the card changes the angle it is seen from */
const f32=q=>q.slice();
const u32=q=>q.slice();
const gp=new THREE.BufferGeometry(),puv=f32(PYR.uv);for(let i=1;i<puv.length;i+=2)puv[i]=1-puv[i];
gp.setAttribute('position',new THREE.BufferAttribute(f32(PYR.pos),3));gp.setAttribute('uv',new THREE.BufferAttribute(puv,2));gp.setIndex(new THREE.BufferAttribute(u32(PYR.idx),1));gp.computeVertexNormals();gp.computeBoundingBox();
const gb=new THREE.BufferGeometry();gb.setAttribute('position',new THREE.BufferAttribute(f32(PYR.bpos),3));gb.setIndex(new THREE.BufferAttribute(u32(PYR.bidx),1));gb.computeVertexNormals();
const PH=gp.boundingBox.max.z-gp.boundingBox.min.z;
const VIEW=1.5;
const PSC=.88/PH;
function chrome(detail){const m=new THREE.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.03,envMapIntensity:1.5,side:THREE.DoubleSide});
 if(detail)m.color.setRGB(1.45,1.45,1.45);return m}
const pmat=chrome(true),bmat=chrome(false);
const TL=new THREE.TextureLoader();
const pmap=TL.load(PYR.col),pnrm=TL.load(PYR.nrm);pmap.encoding=THREE.sRGBEncoding;pmap.anisotropy=pnrm.anisotropy=mx;
pmat.map=pmap;pmat.normalMap=pnrm;pmat.normalScale=new THREE.Vector2(1,1);
pyr=new THREE.Group();const pf=new THREE.Group();
[0,1,2].forEach(k=>{const m=new THREE.Mesh(gp,pmat);m.rotation.z=k*Math.PI*2/3;m.frustumCulled=false;pf.add(m)});
const pbase=new THREE.Mesh(gb,bmat);pbase.frustumCulled=false;pf.add(pbase);
pf.rotation.x=-Math.PI/2;pf.position.y=-PH/2*PSC;pf.scale.setScalar(PSC);
pyr.add(pf);pyr.rotation.y=PYR_FACE;pyr.position.y=.06;
S2=new THREE.Scene();S2.environment=scene.environment;S2.add(pyr);
const fov2=14,d2=(VIEW/2)/Math.tan(THREE.MathUtils.degToRad(fov2/2));
cam2=new THREE.PerspectiveCamera(fov2,1,.1,50);cam2.position.set(0,0,d2);
const RN=LOW?640:768;
RT=(R.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget)?new THREE.WebGLMultisampleRenderTarget(RN,RN,{format:THREE.RGBAFormat}):new THREE.WebGLRenderTarget(RN,RN,{format:THREE.RGBAFormat});
RT.texture.encoding=THREE.sRGBEncoding;RT.texture.generateMipmaps=false;RT.texture.minFilter=THREE.LinearFilter;
const CUT=-.40,YC=(500-402)/1000*H,V0=(CUT-(YC-VIEW/2))/VIEW,HC=VIEW*(1-V0);
const lg=new THREE.PlaneGeometry(VIEW,HC);{const uv=lg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,V0+(1-V0)*uv.getY(i))}
lent=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({map:RT.texture,transparent:true,premultipliedAlpha:true,depthWrite:false,toneMapped:false}));
lent.position.set(0,CUT+HC/2,FRONT_Z+.0008);lent.renderOrder=3;
card.add(lent);
}catch(err){lent=null;console.error(err)}
const key=new THREE.DirectionalLight(0xffffff,.9);key.position.set(2,3,4);scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff,.25));
function resize(){const aw=cv.parentNode.clientWidth;if(!aw)return;const tg=window.Telegram&&Telegram.WebApp,avail=(tg&&tg.viewportStableHeight)||innerHeight;
const w=Math.round(Math.max(160,Math.min(aw,avail*.34*1.4))),h=Math.round(w/1.4);cv.style.width=w+'px';cv.style.height=h+'px';R.setSize(w,h,false);cam.aspect=w/h;const t=Math.tan(THREE.MathUtils.degToRad(cam.fov/2));
cam.position.set(0,0,Math.max(H*1.7/(2*t),W*1.22/(2*t*cam.aspect)));cam.updateProjectionMatrix()}
resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(cv.parentNode);addEventListener('resize',resize);addEventListener('orientationchange',resize);try{Telegram.WebApp.onEvent('viewportChanged',resize)}catch(_){}
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
let yaw=-.5,pitch=0,vy=0,drag=false,lx=0,ly=0,rel=0,side=0,px=0,py=0,tgt=0;
const bf=$('cbf'),bb=$('cbb');
function setSide(s){side=s;bf.setAttribute('aria-pressed',s===0);bb.setAttribute('aria-pressed',s===1)}
function snap(s){const k=Math.round((yaw-s*Math.PI)/(2*Math.PI));tgt=s*Math.PI+k*2*Math.PI;rel=performance.now()-5000;drag=false;vy=0}
bf.onclick=()=>{setSide(0);snap(0)};
bb.onclick=()=>{setSide(1);snap(1)};
cv.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;vy=0;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;if(!drag)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw+=dx*.009;pitch=Math.max(-.6,Math.min(.6,pitch+dy*.006));vy=dx*.009*60*.5});
const up=()=>{if(!drag)return;drag=false;rel=performance.now();setSide(Math.cos(yaw+vy*.25)>=0?0:1)};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('dblclick',()=>{setSide(side?0:1);snap(side)});
let last=performance.now();
loop=function(now){if(V.perf.skip("card"))return;V.perf.gov(R,now);const dt=Math.min((now-last)/1000,.05);last=now;const t=now/1000;
if(!drag){
 yaw+=vy*dt;vy*=Math.pow(.04,dt);
 if(now-rel>900){const k=Math.round((yaw-side*Math.PI)/(2*Math.PI));const home=side*Math.PI+k*2*Math.PI;
  const sway=still?0:Math.sin(t*.6)*.16;
  yaw+=((home+sway)-yaw)*Math.min(1,dt*(performance.now()-rel>4000?2.2:1.5));
  pitch+=((still?0:Math.sin(t*.45)*.05)-pitch)*Math.min(1,dt*2)}}
card.rotation.y=yaw;card.rotation.x=pitch;card.position.y=still?0:Math.sin(t*.9)*.035;
if(lent){const k=Math.round((yaw-side*Math.PI)/(2*Math.PI)),dev=yaw-(side*Math.PI+k*2*Math.PI);
 card.updateMatrixWorld(true);
 const facing=new THREE.Vector3(0,0,1).transformDirection(card.matrixWorld).dot(cam.position.clone().sub(card.position))>0;
 lent.visible=facing;
 if(facing){pyr.rotation.y=PYR_FACE-dev*1.6;pyr.rotation.x=-pitch*.3;
  R.setRenderTarget(RT);R.render(S2,cam2);R.setRenderTarget(null)}}
key.position.set(2+px*6,3-py*4,4);
R.render(scene,cam)};
/* name and code are drawn onto the card faces */
const SERIF='"Times New Roman","Liberation Serif",Georgia,serif';
function text(g,str,cx,base,size,sp,top,bot,maxW){str=String(str||'');if(!str)return;
 let fs=size*K,s2=sp*K;g.font='400 '+fs+'px '+SERIF;
 const w=()=>{let t=0;for(const ch of str)t+=g.measureText(ch).width+s2;return t-s2};
 let tw=w();if(tw>maxW*K){const r=maxW*K/tw;fs*=r;s2*=r;g.font='400 '+fs+'px '+SERIF;tw=w()}
 const gr=g.createLinearGradient(0,base*K-size*.7*K,0,base*K);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.textBaseline='alphabetic';
 let x=cx*K-tw/2;for(const ch of str){g.fillText(ch,x,base*K);x+=g.measureText(ch).width+s2}}
const iF=new Image(),iB=new Image();let ready=0;
draw=function(){if(ready<2)return;
 gF.clearRect(0,0,CW,CH);gF.drawImage(iF,0,0,CW,CH);
 text(gF,NAME,960,935,62,16,'#f4f6f9','#a3a9b2',1300);
 gB.clearRect(0,0,CW,CH);gB.drawImage(iB,0,0,CW,CH);
 text(gB,LOCK?'VC-\u2022\u2022Q\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022':CODE,962,974,94,28,'#f4f6f9',LOCK?'#6d7077':'#9ea4ad',1500);
 text(gB,'ILLUMINATI',960,1127,30,24,'#7c7f86','#62656b',900);
 front.userData.t.needsUpdate=true;back.userData.t.needsUpdate=true};
iF.onload=iB.onload=()=>{ready++;draw();if(ready===2){try{loop(performance.now())}catch(_){}}};iF.src=IMG.f;iB.src=IMG.b;
return true}
V.card={
 warm(){if(inited)return;const f=()=>{if(!inited)init()};window.requestIdleCallback?requestIdleCallback(f,{timeout:2500}):setTimeout(f,900)},
 set(n,c,lk){NAME=String(n||"").toUpperCase().slice(0,40);LOCK=!!lk;CODE=lk?"":String(c||"").toUpperCase();draw()},
 view(on){const k=++tok;
  if(on)setTimeout(()=>{if(k!==tok)return;if(!inited&&!init())return;if(!R)return;active=true;R.setAnimationLoop(loop);draw()},300);
  else setTimeout(()=>{if(k!==tok||!R)return;active=false;R.setAnimationLoop(null)},650)}
};
})(window.ILLUMINATI);