import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

(() => {
  const hero = document.querySelector('.hero-art');
  if (!hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'cinematic-hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    canvas.remove();
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(0, 0.15, 8.8);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  scene.add(new THREE.HemisphereLight(0xfff3ed, 0x563448, 2.1));
  const key = new THREE.DirectionalLight(0xffe7d5, 3.2);
  key.position.set(4, 6, 7);
  scene.add(key);
  const rose = new THREE.PointLight(0xd98b9a, 32, 18);
  rose.position.set(-4, 1, 3);
  scene.add(rose);
  const gold = new THREE.PointLight(0xe7c18a, 24, 15);
  gold.position.set(3, -2, 2);
  scene.add(gold);

  const stage = new THREE.Group();
  scene.add(stage);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x8e4b62, metalness: 0.18, roughness: 0.16,
    transmission: 0.22, thickness: 0.7, clearcoat: 1, transparent: true, opacity: 0.94
  });
  const champagne = new THREE.MeshStandardMaterial({ color: 0xc5a16c, metalness: 0.82, roughness: 0.22 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xffeee5, roughness: 0.22, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x422536, metalness: 0.35, roughness: 0.25 });

  const bottleProfile = [
    new THREE.Vector2(0, -1.35), new THREE.Vector2(.72, -1.35),
    new THREE.Vector2(.78, -1.18), new THREE.Vector2(.72, -.12),
    new THREE.Vector2(.54, .22), new THREE.Vector2(.25, .32),
    new THREE.Vector2(.25, .72), new THREE.Vector2(0, .72)
  ];
  const bottle = new THREE.Mesh(new THREE.LatheGeometry(bottleProfile, 64), glass);
  bottle.position.set(0, .05, 0);
  bottle.castShadow = true;
  stage.add(bottle);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .18, 48), champagne);
  collar.position.set(0, .86, 0);
  stage.add(collar);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.34, .31, .48, 48), dark);
  cap.position.set(0, 1.18, 0);
  stage.add(cap);
  const capBand = new THREE.Mesh(new THREE.TorusGeometry(.325, .025, 10, 48), champagne);
  capBand.rotation.x = Math.PI / 2;
  capBand.position.y = 1.04;
  stage.add(capBand);

  const label = new THREE.Mesh(new THREE.BoxGeometry(.92, .52, .035), ivory);
  label.position.set(0, -.42, .73);
  stage.add(label);
  const labelLine = new THREE.Mesh(new THREE.BoxGeometry(.52, .025, .012), champagne);
  labelLine.position.set(0, -.42, .755);
  stage.add(labelLine);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.62, .018, 12, 120), champagne);
  halo.rotation.set(.92, .22, .15);
  halo.position.set(0, .05, -.12);
  stage.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.08, .009, 8, 120), ivory);
  halo2.rotation.set(1.12, -.42, .1);
  halo2.position.set(0, .05, -.25);
  stage.add(halo2);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.42, .22, 80), dark);
  pedestal.position.set(0, -1.55, 0);
  stage.add(pedestal);
  const pedestalTrim = new THREE.Mesh(new THREE.TorusGeometry(1.31, .025, 10, 80), champagne);
  pedestalTrim.rotation.x = Math.PI / 2;
  pedestalTrim.position.y = -1.44;
  stage.add(pedestalTrim);

  const ornaments = [];
  for (let i = 0; i < 7; i++) {
    const group = new THREE.Group();
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.075 + (i % 3) * .025, 20, 16), i % 2 ? champagne : ivory);
    group.add(bead);
    const orbit = 2.15 + (i % 3) * .22;
    const angle = i / 7 * Math.PI * 2;
    group.position.set(Math.cos(angle) * orbit, Math.sin(angle * 1.7) * 1.2, Math.sin(angle) * .7);
    stage.add(group);
    ornaments.push(group);
  }

  const progress = document.createElement('div');
  progress.className = 'cinematic-progress';
  progress.innerHTML = '<span></span>';
  document.body.append(progress);
  const progressBar = progress.firstElementChild;

  const revealTargets = document.querySelectorAll('.section, .nail-studio, .editorial, .service-grid, .footer');
  revealTargets.forEach((node) => node.classList.add('cinematic-reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealTargets.forEach((node) => observer.observe(node));
  } else {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
  }

  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let visible = true;
  const onPointer = (event) => {
    const rect = hero.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2;
  };
  hero.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const width = Math.max(hero.clientWidth, 1);
    const height = Math.max(hero.clientHeight, 1);
    camera.aspect = width / height;
    camera.position.z = width < 600 ? 10.5 : 8.8;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  resize();

  const scroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  };
  window.addEventListener('scroll', scroll, { passive: true });
  scroll();

  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  const animate = () => {
    frame = requestAnimationFrame(animate);
    if (!visible) return;
    const t = performance.now() * 0.00035;
    if (!reduceMotion) {
      stage.rotation.y += ((pointerX * .12) - stage.rotation.y) * .018;
      stage.rotation.x += ((-pointerY * .07) - stage.rotation.x) * .018;
      bottle.position.y = .05 + Math.sin(t * 2.2) * .055;
      halo.rotation.z += .0014;
      ornaments.forEach((item, i) => {
        item.position.y += Math.sin(t * 3 + i) * .0009;
        item.rotation.x += .002;
      });
    }
    renderer.render(scene, camera);
  };
  animate();

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    renderer.dispose();
  }, { once: true });
})();
