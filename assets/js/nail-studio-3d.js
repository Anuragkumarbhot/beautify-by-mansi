import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/controls/OrbitControls.js';

const host=document.getElementById('nail3dView');
if(host){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#ead9d5');
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,6.5,11.8);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.target.set(0,.1,0);controls.minDistance=8;controls.maxDistance=17;controls.maxPolarAngle=Math.PI*.78;
 scene.add(new THREE.HemisphereLight(0xfff5ef,0x79535b,2.0));
 const key=new THREE.DirectionalLight(0xfff1e6,3.5);key.position.set(4,8,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
 const fill=new THREE.DirectionalLight(0xffc9d1,1.5);fill.position.set(-6,4,-4);scene.add(fill);
 const rim=new THREE.PointLight(0xffffff,35,18);rim.position.set(0,5,-5);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(7,80),new THREE.MeshStandardMaterial({color:'#e8d5d0',roughness:.86}));floor.rotation.x=-Math.PI/2;floor.position.y=-.58;floor.receiveShadow=true;scene.add(floor);
 const rig=new THREE.Group();scene.add(rig);let settings={shape:'almond',color:'#6d1835',finish:'Glossy',art:'Minimal'};const fingerNames=['Little','Ring','Middle','Index','Thumb'];let selectedFinger=null;let perNail=Array.from({length:10},()=>({...settings}));let fingerGroups=[];let selectionRing=null;
 const skin=new THREE.MeshStandardMaterial({color:'#d8a58f',roughness:.48});
 const skinLight=new THREE.MeshStandardMaterial({color:'#e4b6a2',roughness:.42});
 const pearlMat=new THREE.MeshPhysicalMaterial({color:'#fff6ec',metalness:.12,roughness:.1,clearcoat:1,clearcoatRoughness:.04});
 const goldMat=new THREE.MeshStandardMaterial({color:'#c49362',metalness:.82,roughness:.2});
 function widthAt(shape,t){if(shape==='coffin')return .38*(1-.16*t);if(shape==='square')return .37;if(shape==='oval')return .37*Math.pow(Math.max(.02,Math.sin(Math.PI*(.06+.88*t))),.27);if(shape==='stiletto')return .38*(1-.91*t);return .38*Math.pow(Math.max(.02,1-t*t),.53)}
 function makePlate(shape,color,finish,art){
  const rows=42,cols=24,verts=[],uv=[],indices=[];
  for(let r=0;r<=rows;r++){const t=r/rows,w=widthAt(shape,t);for(let c=0;c<=cols;c++){const u=c/cols*2-1,x=u*w,z=(t-.5)*1.92;const crown=.105*(1-u*u)+.018*Math.sin(t*Math.PI);verts.push(x,z,crown);uv.push(c/cols,t);if(r<rows&&c<cols){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1)}}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mat=new THREE.MeshPhysicalMaterial({color,roughness:finish==='Matte'?.9:finish==='Chrome'?.16:finish==='Glitter'?.3:.2,metalness:finish==='Chrome'?.72:0,clearcoat:finish==='Matte'?0:1,clearcoatRoughness:.1,side:THREE.DoubleSide});
  const plate=new THREE.Mesh(geo,mat);plate.rotation.x=-Math.PI/2;plate.castShadow=true;
  const detail=new THREE.Group();detail.add(plate);
  if(art==='French tips'){const tipGeo=new THREE.SphereGeometry(1,24,12);const tip=new THREE.Mesh(tipGeo,new THREE.MeshPhysicalMaterial({color:'#fff5e9',roughness:.2,clearcoat:1}));tip.scale.set(.32,.035,.12);tip.position.set(0,.115,-.86);detail.add(tip)}
  if(art==='Rose-gold accents'){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.025,.018,1.35),goldMat);stripe.position.set(.105,.12,0);detail.add(stripe);const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,16,12),goldMat);dot.position.set(-.12,.13,-.45);detail.add(dot)}
  if(art==='Pearl accents'){const pearl=new THREE.Mesh(new THREE.SphereGeometry(.095,24,16),pearlMat);pearl.position.set(0,.17,-.2);detail.add(pearl);const tiny=new THREE.Mesh(new THREE.SphereGeometry(.045,16,12),pearlMat);tiny.position.set(.13,.15,-.39);detail.add(tiny)}
  if(finish==='Glitter'){for(let i=0;i<28;i++){const t=.12+((i*37)%73)/100,u=(((i*19)%91)/45.5)-1;const dot=new THREE.Mesh(new THREE.SphereGeometry(.012+(i%3)*.004,8,6),new THREE.MeshStandardMaterial({color:i%3?'#f7dfb6':'#fff5e6',metalness:.8,roughness:.22}));dot.position.set(u*widthAt(shape,t),.115+.08*(1-u*u),(t-.5)*1.92);detail.add(dot)}}
  return detail;
 }
 function makeFinger(config,index,row){
  const finger=new THREE.Group();const len=[1.5,1.72,1.82,1.68,1.42][index];const radius=[.255,.29,.31,.29,.245][index];
  const pad=new THREE.Mesh(new THREE.CapsuleGeometry(radius,len,8,18),row===0?skin:skinLight);pad.rotation.x=Math.PI/2;pad.position.set(0,-.19,.02);pad.castShadow=true;pad.receiveShadow=true;finger.add(pad);
  const nail=makePlate(config.shape,config.color,config.finish,config.art);nail.position.y=.115;finger.add(nail);
  const cuticle=new THREE.Mesh(new THREE.TorusGeometry(radius*.48,.018,8,32,Math.PI),new THREE.MeshStandardMaterial({color:'#bd8978',roughness:.55}));cuticle.rotation.z=Math.PI;cuticle.position.set(0,.12,.82);finger.add(cuticle);
  return finger;
 }
 function rebuild(){
  rig.clear();fingerGroups=[];selectionRing=null;
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){
   const idx=row*5+i;const f=makeFinger(perNail[idx],i,row);const x=(i-2)*.94;const z=row===0?-.95:1.35;
   f.position.set(x,0,z);f.rotation.y=(i-2)*-.045;f.rotation.z=(i-2)*-.035;f.userData.nailIndex=idx;rig.add(f);fingerGroups.push(f);
   if(selectedFinger===idx){const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.025,8,48),new THREE.MeshBasicMaterial({color:'#b58b50'}));ring.rotation.x=Math.PI/2;ring.position.set(0,-.48,0);f.add(ring);selectionRing=ring;}
  }
  updateSelectionLabel();
 }
 function updateSelectionLabel(){const el=document.getElementById('nailSelectedLabel');if(el)el.textContent=selectedFinger===null?'Editing all 10 nails':fingerNames[selectedFinger%5]+' · '+(selectedFinger<5?'Left hand':'Right hand')+' selected';}
 function applySetting(key,value){settings[key]=value;if(selectedFinger===null)perNail=perNail.map(n=>({...n,[key]:value}));else perNail[selectedFinger]={...perNail[selectedFinger],[key]:value};rebuild();}
 document.getElementById('nailEditAll')?.addEventListener('click',()=>{selectedFinger=null;rebuild()});
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(fingerGroups,true)[0];if(hit){let obj=hit.object;while(obj&&obj.userData.nailIndex===undefined)obj=obj.parent;if(obj){selectedFinger=obj.userData.nailIndex;rebuild();}}});
 function resize(){const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();rebuild();
 function pressed(selector,value){document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shape===value||b.dataset.color===value)))}
 document.querySelectorAll('[data-shape]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applySetting('shape',b.dataset.shape)}));
 document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applySetting('color',b.dataset.color)}));
 document.getElementById('nailFinish')?.addEventListener('change',e=>applySetting('finish',e.target.value));
 document.getElementById('nailArt')?.addEventListener('change',e=>applySetting('art',e.target.value));
 document.getElementById('addCustomNails')?.addEventListener('click',()=>{const size=document.getElementById('nailCustomSize')?.value||'';const colorName=document.querySelector('[data-color="'+settings.color+'"]')?.title||settings.color;window.addCustomNailToCart?.({...settings,colorName,size})});
 const animate=()=>{requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
}
