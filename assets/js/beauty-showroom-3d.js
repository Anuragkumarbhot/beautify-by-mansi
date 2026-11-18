import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

(() => {
  const host = document.getElementById('beautyShowroom3d');
  if (!host) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'showroom-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D beauty showroom with nail polish, compact and lipstick displays');
  host.prepend(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  } catch (e) {
    host.classList.add('showroom-fallback');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeadbd6, 10, 23);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  camera.position.set(0, 3.1, 11.8);
  camera.lookAt(0, 1.1, 0);
  scene.add(new THREE.HemisphereLight(0xfff2e9,0x563448,2.2));
  const key = new THREE.DirectionalLight(0xffe8d4,3.4); key.position.set(-4,8,6); scene.add(key);
  const rim = new THREE.PointLight(0xd78c9b,42,20); rim.position.set(5,3,3); scene.add(rim);
  const goldLight = new THREE.PointLight(0xe3c28e,28,15); goldLight.position.set(-5,2,-3); scene.add(goldLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xeadbd6,roughness:.72}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-.12; scene.add(floor);
  const goldMat = new THREE.MeshStandardMaterial({color:0xc5a16c,metalness:.8,roughness:.22});
  const plumMat = new THREE.MeshPhysicalMaterial({color:0x552b43,metalness:.22,roughness:.2,clearcoat:1});
  const blushMat = new THREE.MeshPhysicalMaterial({color:0xe7bfc0,roughness:.2,clearcoat:1});
  const ivoryMat = new THREE.MeshPhysicalMaterial({color:0xffeee3,roughness:.25,clearcoat:1});
  const darkMat = new THREE.MeshStandardMaterial({color:0x241b25,metalness:.3,roughness:.24});
  const displays=[];
  const makePedestal=(x,mat)=>{
    const g=new THREE.Group(); g.position.x=x;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.22,.28,64),mat);base.position.y=.08;g.add(base);
    const rimMesh=new THREE.Mesh(new THREE.TorusGeometry(1.13,.025,10,64),goldMat);rimMesh.rotation.x=Math.PI/2;rimMesh.position.y=.22;g.add(rimMesh);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.98,1.02,.08,64),ivoryMat);top.position.y=.25;g.add(top);
    scene.add(g); return g;
  };
  const nail=makePedestal(-3.2,plumMat);
  const polish=new THREE.Group();
  const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.38,.43,1.18,48),blushMat);bottle.position.y=1.05;polish.add(bottle);
  const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.28,.38,.22,48),blushMat);shoulder.position.y=1.72;polish.add(shoulder);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.62,48),darkMat);cap.position.y=2.13;polish.add(cap);
  const capRing=new THREE.Mesh(new THREE.TorusGeometry(.25,.022,10,48),goldMat);capRing.rotation.x=Math.PI/2;capRing.position.y=1.88;polish.add(capRing);
  nail.add(polish); polish.position.y=.28;

  const makeup=makePedestal(0,blushMat);
  const compact=new THREE.Group();
  const compactBase=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.18,64),goldMat);compactBase.position.y=.65;compact.add(compactBase);
  const powder=new THREE.Mesh(new THREE.CylinderGeometry(.61,.61,.06,64),new THREE.MeshStandardMaterial({color:0xc78e86,roughness:.42}));powder.position.y=.77;compact.add(powder);
  const mirror=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.09,64),darkMat);mirror.position.y=.88;compact.add(mirror);
  const mirrorTop=new THREE.Mesh(new THREE.CircleGeometry(.61,64),new THREE.MeshStandardMaterial({color:0x9e7884,metalness:.75,roughness:.14}));mirrorTop.rotation.x=-Math.PI/2;mirrorTop.position.y=.935;compact.add(mirrorTop);
  makeup.add(compact);compact.position.y=.28;

  const lips=makePedestal(3.2,plumMat);
  const lipstick=new THREE.Group();
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.25,.28,.95,48),goldMat);tube.position.y=.78;lipstick.add(tube);
  const bullet=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,.48,40),new THREE.MeshStandardMaterial({color:0x9a2948,roughness:.22,clearcoat:1}));bullet.position.y=1.48;lipstick.add(bullet);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.24,40),new THREE.MeshStandardMaterial({color:0x9a2948,roughness:.22}));tip.position.set(0,1.82,0);lipstick.add(tip);
  const baseCap=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.5,48),darkMat);baseCap.position.y=.05;lipstick.add(baseCap);
  lips.add(lipstick);lipstick.position.y=.28;

  const halo=new THREE.Mesh(new THREE.TorusGeometry(4.6,.012,8,160),goldMat);halo.rotation.x=Math.PI/2;halo.position.y=3.7;scene.add(halo);
  const group=[nail,makeup,lips];
  const labels=['Press-on nails','Makeup artistry','Occasion glam'];
  const targets=[document.getElementById('showroomNails'),document.getElementById('showroomMakeup'),document.getElementById('showroomGlam')];
  targets.forEach((btn,i)=>btn?.addEventListener('click',()=>{group.forEach((g,j)=>g.userData.active=j===i);targets.forEach((b,j)=>b?.setAttribute('aria-pressed',String(j===i)));}));
  group.forEach((g,i)=>{g.userData.active=i===0;});
  let px=0,py=0,visible=true,raf=0;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;},{passive:true});
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.position.z=w<620?14:11.8;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  document.addEventListener('visibilitychange',()=>visible=!document.hidden);
  const animate=()=>{
    raf=requestAnimationFrame(animate);if(!visible)return;
    const t=performance.now()*.00045;
    if(!reduced){
      group.forEach((g,i)=>{g.rotation.y+=((px*.18+(i-1)*.025)-g.rotation.y)*.018;g.position.y=Math.sin(t*2+i)*.045;});
      polish.rotation.y+=.003;compact.rotation.y-=.002;lipstick.rotation.y+=.0025;
      camera.position.x+=(px*.55-camera.position.x)*.012;
      camera.position.y+=(3.1-py*.35-camera.position.y)*.012;
      camera.lookAt(0,1.1,0);
    }
    renderer.render(scene,camera);
  }; animate();
  addEventListener('pagehide',()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.dispose();},{once:true});
})();
