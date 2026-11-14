/* Liquid Chrome transformation: rotation drives monogram → liquid mercury → eye pyramid. Drag to orbit. */
(function(){
const $=id=>document.getElementById(id),LOGO=ILLUMINATI_MODEL.LOGO,PYR=ILLUMINATI_MODEL.PYR,P=window.ILLUMINATI.perf;
let remeasure=true;
let stopped=false,ro=null,stopStage=()=>{};
window.ILLUMINATI.pyramid={setView:n=>{remeasure=true},stop:()=>stopStage()};
const cv=$('stage');let R;
try{R=new THREE.WebGLRenderer({canvas:cv,antialias:P.aa,alpha:true})}catch(e){document.body.classList.add('no-webgl');return}
R.setPixelRatio(P.dpr);R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputEncoding=THREE.sRGBEncoding;R.setClearColor(0,0);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(28,1,8,600);
/* studio reflection map shared by logo and pyramid */
(function(){const w=2048,h=1024,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
const sky=g.createLinearGradient(0,0,0,h);[[0,'#9aa3ad'],[.42,'#2a2e34'],[.5,'#e8edf2'],[.53,'#14161a'],[1,'#050506']].forEach(s=>sky.addColorStop(s[0],s[1]));g.fillStyle=sky;g.fillRect(0,0,w,h);
const box=(x,y,bw,bh,a)=>{const gr=g.createLinearGradient(x,y,x,y+bh);gr.addColorStop(0,'rgba(255,255,255,'+a+')');gr.addColorStop(1,'rgba(235,242,255,'+a*.75+')');g.fillStyle=gr;g.fillRect(x,y,bw,bh)};
box(150,120,260,360,1);box(560,60,120,430,.95);box(930,140,380,250,1);box(1480,80,90,440,.9);box(1700,150,280,330,1);box(0,560,2048,26,.55);box(300,700,460,120,.35);box(1250,690,560,150,.3);
const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
scene.environment=new THREE.PMREMGenerator(R).fromEquirectangular(t).texture;t.dispose()})();

/* ---- logo: same extrusion, bevel and smoothing as the original monogram ---- */
const bb=LOGO.bbox,cx=(bb[0]+bb[2])/2,cy=(bb[1]+bb[3])/2,SC=10/(bb[3]-bb[1]);
const cons=LOGO.contours.filter(c=>!c.hole);
const shapes=cons.map(c=>{const s=new THREE.Shape();c.pts.forEach((p,i)=>{const x=p[0]-cx,y=-(p[1]-cy);i?s.lineTo(x,y):s.moveTo(x,y)});s.closePath();return s});
let g0=new THREE.ExtrudeGeometry(shapes,{depth:70,bevelEnabled:true,bevelThickness:16,bevelSize:5,bevelOffset:0,bevelSegments:P.geo.bevel,curveSegments:P.geo.curve,steps:1});
g0.deleteAttribute('uv');g0.deleteAttribute('normal');g0=THREE.BufferGeometryUtils.mergeVertices(g0,.01);g0.computeVertexNormals();g0.translate(0,0,-35);g0.scale(SC,SC,SC);
/* a point safely inside the solid logo = centre of the mercury blob */
const pin=(x,y,P)=>{let o=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])o=!o}return o};
let best=null,bd=1e18;
cons.forEach(c=>{for(let x=bb[0];x<=bb[2];x+=6)for(let y=bb[1];y<=bb[3];y+=6){if(pin(x,y,c.pts)&&pin(x+14,y,c.pts)&&pin(x-14,y,c.pts)&&pin(x,y+14,c.pts)&&pin(x,y-14,c.pts)){const d=(x-cx)*(x-cx)+(y-cy)*(y-cy);if(d<bd){bd=d;best=[x,y]}}}});
const C=best?new THREE.Vector3((best[0]-cx)*SC,-(best[1]-cy)*SC,0):new THREE.Vector3();
/* shared-edge subdivision so the flat caps can bend into a smooth drop (shape and shading unchanged at rest) */
function refine(g,L){let P=Array.from(g.attributes.position.array),N=Array.from(g.attributes.normal.array),I=Array.from(g.index.array);
for(let it=0;it<9;it++){const mc=new Map(),out=[];let any=false;
const d=(a,b)=>Math.hypot(P[3*a]-P[3*b],P[3*a+1]-P[3*b+1],P[3*a+2]-P[3*b+2]);
const mid=(a,b)=>{const k=a<b?a*1e7+b:b*1e7+a;let m=mc.get(k);if(m===undefined){m=P.length/3;for(let c=0;c<3;c++){P.push((P[3*a+c]+P[3*b+c])/2);N.push((N[3*a+c]+N[3*b+c])/2)}mc.set(k,m)}return m};
for(let t=0;t<I.length;t+=3){let a=I[t],b=I[t+1],c=I[t+2];const s=[d(a,b)>L,d(b,c)>L,d(c,a)>L],n=s[0]+s[1]+s[2];
if(!n){out.push(a,b,c);continue}any=true;
if(n===3){const x=mid(a,b),y=mid(b,c),z=mid(c,a);out.push(a,x,z,x,b,y,z,y,c,x,y,z);continue}
if(n===1){if(s[1]){[a,b,c]=[b,c,a]}else if(s[2]){[a,b,c]=[c,a,b]}const x=mid(a,b);out.push(a,x,c,x,b,c);continue}
if(!s[0]){[a,b,c]=[b,c,a]}else if(!s[1]){[a,b,c]=[c,a,b]}
const x=mid(a,b),y=mid(b,c);out.push(x,b,y,a,x,y,a,y,c)}
I=out;if(!any)break}
const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));r.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(N),3));r.setIndex(new THREE.BufferAttribute(new Uint32Array(I),1));return r}
const gL=refine(g0,P.geo.refine);

/* ---- pyramid: original eye-pyramid mesh, rebuilt as one baked, centred model ---- */
const f32=s=>s.slice();
const u32=s=>s.slice();
const gp=new THREE.BufferGeometry(),uv=f32(PYR.uv);for(let i=1;i<uv.length;i+=2)uv[i]=1-uv[i];
gp.setAttribute('position',new THREE.BufferAttribute(f32(PYR.pos),3));gp.setAttribute('uv',new THREE.BufferAttribute(uv,2));gp.setIndex(new THREE.BufferAttribute(u32(PYR.idx),1));gp.computeVertexNormals();
const gb=new THREE.BufferGeometry();gb.setAttribute('position',new THREE.BufferAttribute(f32(PYR.bpos),3));gb.setIndex(new THREE.BufferAttribute(u32(PYR.bidx),1));gb.computeVertexNormals();
const gf=THREE.BufferGeometryUtils.mergeBufferGeometries([0,1,2].map(k=>gp.clone().rotateZ(k*Math.PI*2/3)));
gf.rotateX(-Math.PI/2);gb.rotateX(-Math.PI/2);gf.computeBoundingBox();
const bx=gf.boundingBox,PS=8.2/(bx.max.y-bx.min.y),yc=(bx.max.y+bx.min.y)/2;
[gf,gb].forEach(x=>{x.translate(0,-yc,0);x.scale(PS,PS,PS)});

/* ---- one chrome finish for both forms ---- */
const FIN={chrome:{c:0xffffff,r:.03,e:1.5},black:{c:0x2a2c30,r:.05,e:1.9},gold:{c:0xffd27a,r:.08,e:1.5}};
const mk=()=>new THREE.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.03,envMapIntensity:1.5,side:THREE.DoubleSide});
const lmat=mk(),pmat=mk(),bmat=mk();
const TL=new THREE.TextureLoader(),mx=Math.min(8,R.capabilities.getMaxAnisotropy());
const map=TL.load(PYR.col),nm=TL.load(PYR.nrm);map.encoding=THREE.sRGBEncoding;map.anisotropy=nm.anisotropy=mx;
pmat.map=map;pmat.normalMap=nm;pmat.normalScale=new THREE.Vector2(0,0);

/* ---- mercury: every vertex slides to a shared liquid drop, with travelling surface ripples ---- */
const UT={value:0},UW={value:0},UD={value:0},ML={value:0},MP={value:1},UC={value:C},US={value:new THREE.Vector3(3.2,4,3.2)};
const GL=`uniform float uM,uT,uW;uniform vec3 uC,uS;
void lq(vec3 p,vec3 n,out vec3 op,out vec3 on){
float ph=clamp((p.y+5.)/10.,0.,1.);
float k=clamp(uM*1.6-(1.-ph)*.6,0.,1.);k=k*k*(3.-2.*k);
vec3 q=(p-uC)/uS;vec3 d=q/max(length(q),1e-4);
vec3 bp=uC+d*uS*(1.+.01*min(length(q),4.)),bn=normalize(d/uS);
vec3 a1=vec3(1.9,1.3,1.6),a2=vec3(-1.1,2.1,1.2)*1.3;
float f1=dot(bp,a1)+uT*2.6,f2=dot(bp,a2)-uT*1.9;
float A=.17*(sin(3.1416*k)*.8+k*k*uW*.5);
vec3 g=a1*cos(f1)+.5*a2*cos(f2);
op=mix(p,bp,k)+bn*A*(sin(f1)+.5*sin(f2));
op.y-=.4*sin(3.1416*k);
vec3 nn=mix(normalize(n),bn,1.-pow(1.-k,3.));nn-=A*(g-nn*dot(nn,g));on=normalize(nn);}
`;
const liq=(m,uM,det)=>{m.customProgramCacheKey=()=>det?'lqP':'lqL';m.onBeforeCompile=sh=>{
Object.assign(sh.uniforms,{uM:uM,uT:UT,uW:UW,uC:UC,uS:US});
sh.vertexShader=sh.vertexShader.replace('void main() {',GL+'void main() {').replace('#include <beginnormal_vertex>','vec3 lp,ln;lq(position,normal,lp,ln);vec3 objectNormal=ln;').replace('#include <begin_vertex>','vec3 transformed=lp;');
sh.fragmentShader=sh.fragmentShader.replace('gl_FrontFacing ? 1.0 : - 1.0','1.0').replace('float( gl_FrontFacing ) * 2.0 - 1.0','1.0');if(det){sh.uniforms.uDet=UD;sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uDet;void main() {').replace('#include <map_fragment>','vec4 tx=mapTexelToLinear(texture2D(map,vUv));diffuseColor.rgb*=mix(vec3(1.),clamp(tx.rgb*1.45,0.,1.),uDet);')}}};
liq(lmat,ML,false);liq(pmat,MP,true);liq(bmat,MP,false);

const lm=new THREE.Mesh(gL,lmat),fm=new THREE.Mesh(gf,pmat),bm=new THREE.Mesh(gb,bmat);
[lm,fm,bm].forEach(m=>m.frustumCulled=false);
const pyr=new THREE.Group();pyr.add(fm,bm);
const pivot=new THREE.Group();pivot.add(lm,pyr);const rig=new THREE.Group();rig.add(pivot);scene.add(rig);

/* ---- rotation drives the transformation: front = logo, back = pyramid ---- */
/* The model always lives in a "stage box": the part of the screen not covered by the active panel or the tab bar.
   The camera is fitted and shifted so the whole model stays inside that box (never under the UI, never clipped). */
const probe=$('safeProbe'),tabsEl=$('tabs'),viewsEl=$('views');
let W=1,H=1,box={x0:0,x1:1,t:0,b:1},boxT=null;
function resize(){W=cv.clientWidth||1;H=cv.clientHeight||1;R.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();remeasure=true}
function measure(){
 const sat=probe.offsetHeight||0,pad=14;
 let x0=0,x1=W,t=sat+pad,b=H-pad;
 const tb=tabsEl.getBoundingClientRect();if(tb.height)b=Math.min(b,tb.top-pad);
 const v=viewsEl.querySelector('.view.on'),c=v&&(v.firstElementChild);
 if(v&&c){
  const vBottom=v.offsetTop+v.clientHeight,cTop=vBottom-Math.min(c.offsetHeight,v.clientHeight);
  if(v.offsetLeft>W*.45){x1=v.offsetLeft-pad}   /* wide screens: panel sits on the right, model takes the left */
  else b=Math.min(b,cTop-pad)                   /* phones: model takes the space above the panel */
 }
 if(b-t<120)b=t+120;if(x1-x0<120)x1=x0+120;
 boxT={x0:x0,x1:x1,t:t,b:b};if(!box.init){box=Object.assign({init:1},boxT)}
}
resize();measure();
if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(cv)}else addEventListener('resize',resize);
const ez=x=>{x=Math.min(Math.max(x,0),1);return x*x*x*(x*(x*6-15)+10)};
let th=-.5,vel=1.1,drag=false,lx=0,frame=0;const SPIN=1.1;
cv.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;vel=0;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lx;lx=e.clientX;th+=dx*.011;vel=vel*.6+dx*.011*60*.4});
const up=()=>{drag=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
let last=performance.now(),SK=false;
R.setAnimationLoop(now=>{if(P.skip("stage"))return;if(document.body.dataset.view==="done"&&(SK=!SK))return;P.gov(R,now);const dt=Math.min((now-last)/1000,.05);last=now;
if(!drag){th+=vel*dt;vel+=(SPIN-vel)*Math.min(1,dt*1.6)}
const q=(((th/6.2832+.08)%7)+7)%7,u=q<.5?0:q<3.5?(q-.5)/3:q<4?1:1-(q-4)/3;
const m=ez(u*2),r=ez(u*2-1),useP=u>=.5,warm=frame<4;frame++;
ML.value=m;MP.value=1-r;UT.value=now/1000;UW.value=Math.sin(Math.PI*u);
UD.value=ez((r-.45)/.55);pmat.normalScale.setScalar(UD.value);
lm.visible=!useP;pyr.visible=useP||warm;pyr.scale.setScalar(useP?1:1e-4);
pivot.rotation.y=th;
try{if(remeasure||frame%8===0){measure();remeasure=false}}catch(_){boxT=boxT||{x0:0,x1:W,t:0,b:H}}
const k=1-Math.exp(-dt*9);['x0','x1','t','b'].forEach(n=>{box[n]+=(boxT[n]-box[n])*k});
const bob=Math.sin(now/1000*.9)*.22;rig.position.y=bob;rig.scale.setScalar(1);
const th2=Math.tan(THREE.MathUtils.degToRad(cam.fov/2)),bw=box.x1-box.x0,bh=box.b-box.t,e=ez(u);
const halfH=(5+(4.1-5)*e)*1.1+.3,halfW=1.9+(4.9-1.9)*e;   /* world half-extents incl. perspective + bob margin */
const d=Math.min(Math.max(halfH*H/(bh*th2),halfW*H/(bw*th2)),550);
cam.position.set(0,d*.02,d);cam.lookAt(0,0,0);
if(isFinite(d)&&d>0)cam.setViewOffset(W,H,W/2-(box.x0+box.x1)/2,H/2-(box.t+box.b)/2,W,H);else{cam.clearViewOffset();cam.position.set(0,0,30)}
R.render(scene,cam)});
/* The big pyramid transformation is the intro only. When the member leaves the intro screen it fades out and the whole
   WebGL context is released, so the portal (and the 3D card) never share the GPU with a second model. */
stopStage=()=>{if(stopped)return;stopped=true;
 cv.style.transition='opacity .45s ease';cv.style.opacity='0';cv.style.pointerEvents='none';
 setTimeout(()=>{R.setAnimationLoop(null);if(ro)ro.disconnect();removeEventListener('resize',resize);
  scene.traverse(o=>{if(o.geometry)o.geometry.dispose();[].concat(o.material||[]).forEach(m=>{['map','normalMap'].forEach(k=>m[k]&&m[k].dispose());m.dispose()})});
  if(scene.environment)scene.environment.dispose();
  R.dispose();try{R.forceContextLoss()}catch(_){}
  cv.style.display='none'},520)};
})();