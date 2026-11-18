import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

(() => {
  const host = document.getElementById('makeupStudio3d');
  if (!host) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'makeup-studio-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D makeup vanity with illuminated mirror, makeup products and studio chair');
  host.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    host.classList.add('makeup-studio-fallback');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeadbd7, 12, 28);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 4.1, 13.8);

  scene.add(new THREE.HemisphereLight(0xfff1e9, 0x553347, 2.1));
  const key = new THREE.DirectionalLight(0xffe8d8, 3.1);
  key.position.set(-5, 8, 7);
  scene.add(key);
  const fill = new THREE.PointLight(0xe8a9ad, 38, 18);
  fill.position.set(5, 4, 3);
  scene.add(fill);
  const warm = new THREE.PointLight(0xf2d5a8, 26, 16);
  warm.position.set(-4, 3, 2);
  scene.add(warm);

  const mat = (color, metalness=0, roughness=.35) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const plum = mat(0x542d45, .25, .24);
  const dark = mat(0x281d29, .3, .25);
  const gold = mat(0xc5a16c, .82, .2);
  const ivory = mat(0xffeee4, .05, .28);
  const blush = new THREE.MeshPhysicalMaterial({ color:0xe5b8b7, roughness:.22, clearcoat:1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34,34), mat(0xeadbd7,0,.82));
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -.08;
  scene.add(floor);

  const vanity = new THREE.Group();
  scene.add(vanity);

  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(7.1,.22,1.65), ivory);
  tabletop.position.set(0,2.45,0);
  vanity.add(tabletop);
  const front = new THREE.Mesh(new THREE.BoxGeometry(6.65,.62,.12), plum);
  front.position.set(0,2.02,.68);
  vanity.add(front);
  for (const x of [-2.85,2.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.16,2.05,.16), gold);
    leg.position.set(x,1.25,0);
    vanity.add(leg);
  }
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.5,.38,.58), dark);
  drawer.position.set(0,2.02,.24);
  vanity.add(drawer);
  const drawerPull = new THREE.Mesh(new THREE.BoxGeometry(.42,.045,.07), gold);
  drawerPull.position.set(0,2.02,.56);
  vanity.add(drawerPull);

  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(0,4.42,-.28);
  vanity.add(mirrorGroup);
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.55,3.35,.2), gold);
  mirrorGroup.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(3.28,3.08,.08), new THREE.MeshPhysicalMaterial({ color:0x9d7e8d, metalness:.72, roughness:.13, clearcoat:1 }));
  mirrorGlass.position.z=.13;
  mirrorGroup.add(mirrorGlass);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(3.05,2.86,.035), new THREE.MeshBasicMaterial({ color:0xcbb6bc }));
  inner.position.z=.19;
  mirrorGroup.add(inner);
  const bulbMat = new THREE.MeshBasicMaterial({ color:0xffe6b4 });
  for (let i=0;i<5;i++) for (const side of [-1,1]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.105,16,12), bulbMat);
    bulb.position.set(side*1.72, -1.28+i*.64, .19);
    mirrorGroup.add(bulb);
  }
  for (let i=0;i<3;i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.105,16,12), bulbMat);
    bulb.position.set(-1.04+i*1.04,1.62,.19);
    mirrorGroup.add(bulb);
  }

  const products = new THREE.Group();
  products.position.set(-2.25,2.58,.05);
  vanity.add(products);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.68,32), blush);
  bottle.position.set(0,.36,0);
  products.add(bottle);
  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.24,24), gold);
  bottleCap.position.set(0,.82,0);
  products.add(bottleCap);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.3,32), ivory);
  jar.position.set(.75,.16,.12);
  products.add(jar);
  const jarLid = new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.08,32), gold);
  jarLid.position.set(.75,.35,.12);
  products.add(jarLid);
  const brush = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.82,16), gold);
  brush.add(handle);
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(.09,.28,20), mat(0x5a3546));
  bristles.position.y=.52;
  brush.add(bristles);
  brush.position.set(1.45,.55,.12);
  brush.rotation.z=-.16;
  products.add(brush);

  const palette = new THREE.Group();
  palette.position.set(2.05,2.62,.1);
  vanity.add(palette);
  const caseBase = new THREE.Mesh(new THREE.BoxGeometry(1.12,.16,.72), plum);
  palette.add(caseBase);
  const caseTop = new THREE.Mesh(new THREE.BoxGeometry(1.12,.09,.72), gold);
  caseTop.position.y=.15;
  palette.add(caseTop);
  for(let i=0;i<4;i++){
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.035,20), mat([0x8e4e60,0xc68a82,0xd9b88d,0x65445b][i]));
    pan.position.set(-.36+(i%2)*.24,.225,-.16+Math.floor(i/2)*.3);
    palette.add(pan);
  }

  const stool = new THREE.Group();
  stool.position.set(0,0,2.55);
  scene.add(stool);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.82,.88,.25,48), plum);
  seat.position.y=1.12;
  stool.add(seat);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,.14,48), blush);
  cushion.position.y=1.3;
  stool.add(cushion);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.88,24), gold);
  stem.position.y=.62;
  stool.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.58,.66,.12,32), dark);
  foot.position.y=.15;
  stool.add(foot);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(5.2,.012,8,140), gold);
  halo.rotation.x=Math.PI/2;
  halo.position.y=5.7;
  scene.add(halo);

  const looks = {
    bridal: { label:'Bridal glow', color:0xe6b6a8, light:0xffe1bd, message:'I would like to enquire about bridal makeup.' },
    party: { label:'Party glam', color:0x9b5369, light:0xf2c2c0, message:'I would like to enquire about party and occasion makeup.' },
    soft: { label:'Soft glam', color:0xc98e91, light:0xffe8d6, message:'I would like to enquire about a soft glam makeup look.' }
  };
  let active='bridal';
  const lookButtons=[...document.querySelectorAll('[data-makeup-look]')];
  const status=document.getElementById('makeupLookStatus');
  const enquiry=document.getElementById('makeupEnquiryLink');
  const applyLook=(key)=>{
    if(!looks[key]) return;
    active=key;
    const look=looks[key];
    blush.color.setHex(look.color);
    fill.color.setHex(look.light);
    lookButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.makeupLook===key)));
    if(status) status.textContent=look.label+' selected';
    if(enquiry) enquiry.href='https://wa.me/919877339755?text='+encodeURIComponent('Hello Beautify by Mansi, '+look.message+' Please share availability, pricing and details.');
  };
  lookButtons.forEach(button=>button.addEventListener('click',()=>applyLook(button.dataset.makeupLook)));
  applyLook(active);

  let pointerX=0,pointerY=0,visible=true,raf=0;
  host.addEventListener('pointermove',event=>{
    const rect=host.getBoundingClientRect();
    pointerX=(event.clientX-rect.left)/rect.width-.5;
    pointerY=(event.clientY-rect.top)/rect.height-.5;
  },{passive:true});

  const resize=()=>{
    const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);
    camera.aspect=width/height;
    camera.position.z=width<620?17.5:13.8;
    camera.position.y=width<620?4.5:4.1;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  };
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
  const animate=()=>{
    raf=requestAnimationFrame(animate);
    if(!visible) return;
    if(!reduced){
      vanity.rotation.y+=(pointerX*.11-vanity.rotation.y)*.018;
      vanity.rotation.x+=(-pointerY*.035-vanity.rotation.x)*.018;
      products.rotation.y+=.0015;
      stool.rotation.y+=.0007;
    }
    renderer.render(scene,camera);
  };
  animate();
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();},{once:true});
})();
