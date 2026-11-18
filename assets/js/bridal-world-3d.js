import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

(() => {
  const host=document.getElementById('bridalWorld3d');
  if(!host)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas=document.createElement('canvas');
  canvas.className='bridal-world-canvas';
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Interactive 3D bridal stage with ornate arch, floral accents, jewellery and a couture-inspired dress display');
  host.prepend(canvas);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}
  catch(error){host.classList.add('bridal-world-fallback');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;

  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0x2a1828,14,30);
  const camera=new THREE.PerspectiveCamera(34,1,.1,70);
  camera.position.set(0,4.2,15.8);
  const hemi=new THREE.HemisphereLight(0xffe9e2,0x301a31,1.8);scene.add(hemi);
  const key=new THREE.SpotLight(0xffe4c7,95,28,Math.PI/5,.55,1.2);key.position.set(-5,10,8);key.target.position.set(0,2,0);scene.add(key,key.target);
  const roseLight=new THREE.PointLight(0xd9829a,48,18);roseLight.position.set(5,4,2);scene.add(roseLight);
  const goldLight=new THREE.PointLight(0xf0c98c,42,18);goldLight.position.set(-5,3,-3);scene.add(goldLight);
  const material=(color,metalness=0,roughness=.35)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const gold=material(0xcaa66f,.86,.2);
  const dark=material(0x291b2b,.25,.3);
  const floorMat=material(0x3b2638,.18,.4);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(12,96),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.12;scene.add(floor);

  const stage=new THREE.Group();scene.add(stage);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(3.9,4.2,.32,96),material(0x6a3d52,.35,.25));plinth.position.y=.08;stage.add(plinth);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.8,.035,12,120),gold);ring.rotation.x=Math.PI/2;ring.position.y=.25;stage.add(ring);
  const arch=new THREE.Group();arch.position.set(0,0,-1.15);stage.add(arch);
  const archCurve=new THREE.Mesh(new THREE.TorusGeometry(3.1,.095,16,100,Math.PI),gold);archCurve.position.y=3.45;arch.add(archCurve);
  for(const x of [-3.1,3.1]){
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,3.48,24),gold);pillar.position.set(x,1.72,0);arch.add(pillar);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,.22,32),material(0x80566a,.5,.28));base.position.set(x,.15,0);arch.add(base);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.18,20,16),gold);cap.position.set(x,3.5,0);arch.add(cap);
  }
  const innerHalo=new THREE.Mesh(new THREE.TorusGeometry(2.45,.018,8,100),material(0xe5c69b,.7,.3));innerHalo.position.set(0,3.1,-.92);arch.add(innerHalo);

  const gown=new THREE.Group();gown.position.set(0,0,.15);stage.add(gown);
  const bodice=new THREE.Mesh(new THREE.SphereGeometry(.72,48,32),new THREE.MeshPhysicalMaterial({color:0xf2e5d6,roughness:.25,metalness:.08,clearcoat:.8}));bodice.scale.set(.7,1.25,.42);bodice.position.set(0,2.75,0);gown.add(bodice);
  const skirt=new THREE.Mesh(new THREE.ConeGeometry(1.85,3.25,64,1,true),new THREE.MeshPhysicalMaterial({color:0xf2e5d6,roughness:.34,side:THREE.DoubleSide,metalness:.05,clearcoat:.5}));skirt.position.y=1.15;skirt.scale.z=.72;gown.add(skirt);
  const waist=new THREE.Mesh(new THREE.TorusGeometry(.48,.055,12,48),gold);waist.position.set(0,2.25,.02);gown.add(waist);
  const neckline=new THREE.Mesh(new THREE.TorusGeometry(.39,.035,12,48,Math.PI),gold);neckline.position.set(0,3.42,0);gown.add(neckline);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.42,24),material(0xb98778,.05,.4));neck.position.y=3.83;gown.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.43,32,24),material(0xb98778,.02,.4));head.scale.set(.82,1.12,.78);head.position.y=4.35;gown.add(head);
  const bun=new THREE.Mesh(new THREE.SphereGeometry(.35,24,20),dark);bun.position.set(0,4.66,-.16);gown.add(bun);

  const jewellery=new THREE.Group();gown.add(jewellery);
  const necklace=new THREE.Mesh(new THREE.TorusGeometry(.32,.028,10,48,Math.PI),gold);necklace.rotation.z=Math.PI;necklace.position.set(0,3.45,.22);jewellery.add(necklace);
  for(const x of [-.52,.52]){
    const earring=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),gold);earring.position.set(x,4.05,.18);jewellery.add(earring);
  }
  const petals=new THREE.Group();stage.add(petals);
  const petalMat=new THREE.MeshStandardMaterial({color:0xd99ba5,roughness:.5,side:THREE.DoubleSide});
  for(let i=0;i<34;i++){
    const p=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),petalMat);
    p.scale.set(1,.38,.18);
    const angle=i*2.399;
    const radius=2.4+(i%7)*.22;
    p.position.set(Math.cos(angle)*radius,.5+(i%9)*.48,Math.sin(angle)*radius*.38);
    p.userData={baseY:p.position.y,phase:i*.7};
    petals.add(p);
  }
  const sideFlowers=new THREE.Group();stage.add(sideFlowers);
  for(const side of [-1,1])for(let i=0;i<8;i++){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.8,8),material(0x62724d));stem.position.set(side*(3.2+i*.045),.7+i*.3,-.45+i*.08);stem.rotation.z=side*.32;sideFlowers.add(stem);
    const bloom=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),material(i%2?0xe6c6bd:0xc78d9b));bloom.position.set(side*(3.2+i*.045),1.15+i*.3,-.45+i*.08);sideFlowers.add(bloom);
  }

  const looks={
    classic:{name:'Classic ivory',dress:0xf2e5d6,metal:0xcaa66f,light:0xffe4c7,desc:'Timeless ivory couture with champagne-gold details',message:'I would like to enquire about a classic bridal makeup look.'},
    rose:{name:'Rose gold',dress:0xe8c0b6,metal:0xd4a17d,light:0xf4c3c2,desc:'Soft rose tones with luminous warm metallic accents',message:'I would like to enquire about a rose-gold bridal makeup look.'},
    royal:{name:'Royal wine',dress:0x6e304b,metal:0xd1ae78,light:0xd98ba0,desc:'Deep wine couture with regal gold accents',message:'I would like to enquire about a royal wine bridal makeup look.'}
  };
  const buttons=[...document.querySelectorAll('[data-bridal-look]')];
  const status=document.getElementById('bridalLookStatus');
  const description=document.getElementById('bridalLookDescription');
  const booking=document.getElementById('bridalBookingLink');
  function chooseLook(id){
    const look=looks[id];if(!look)return;
    skirt.material.color.setHex(look.dress);bodice.material.color.setHex(look.dress);
    gold.color.setHex(look.metal);roseLight.color.setHex(look.light);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bridalLook===id)));
    if(status)status.textContent=look.name+' selected';
    if(description)description.textContent=look.desc;
    if(booking)booking.href='https://wa.me/919877339755?text='+encodeURIComponent('Hello Beautify by Mansi. '+look.message+' Please share availability, packages and appointment details.');
  }
  buttons.forEach(b=>b.addEventListener('click',()=>chooseLook(b.dataset.bridalLook)));
  chooseLook('classic');

  let px=0,py=0,visible=!document.hidden,raf=0;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;},{passive:true});
  let dragging=false,lastX=0;
  host.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;host.setPointerCapture?.(e.pointerId);});
  host.addEventListener('pointerup',()=>dragging=false);
  host.addEventListener('pointercancel',()=>dragging=false);
  host.addEventListener('pointermove',e=>{if(dragging&&!reduced){stage.rotation.y+=(e.clientX-lastX)*.003;lastX=e.clientX;}});
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.position.z=w<620?18:15.8;camera.position.y=w<620?4.6:4.2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  const intersection='IntersectionObserver'in window?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true&&!document.hidden;},{rootMargin:'100px'}):null;
  intersection?.observe(host);
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden&&(!intersection||host.getBoundingClientRect().bottom>0&&host.getBoundingClientRect().top<innerHeight+100);});
  function animate(){
    raf=requestAnimationFrame(animate);if(!visible)return;
    if(!reduced){if(!dragging)stage.rotation.y+=(px*.22-stage.rotation.y)*.012;stage.rotation.x+=(-py*.045-stage.rotation.x)*.012;petals.children.forEach(p=>{p.position.y=p.userData.baseY+Math.sin(performance.now()*.0006+p.userData.phase)*.12;});gown.rotation.y=Math.sin(performance.now()*.00035)*.025;}
    renderer.render(scene,camera);
  }
  animate();
  addEventListener('pagehide',()=>{cancelAnimationFrame(raf);resizeObserver.disconnect();intersection?.disconnect();renderer.dispose();},{once:true});
})();
