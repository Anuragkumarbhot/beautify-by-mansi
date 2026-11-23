"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ProductCategory } from "@/features/catalogue/products";
import styles from "./virtual-store.module.css";

type Nail3DViewerProps = {
  productId: string;
  productName: string;
  category: ProductCategory;
  image: string;
};

type Palette = {
  base: string;
  accent: string;
  metalness: number;
  roughness: number;
};

const palettes: Record<string, Palette> = {
  "rose-french": { base: "#e8aeb5", accent: "#fff0e9", metalness: 0.08, roughness: 0.2 },
  "velvet-wine": { base: "#641c37", accent: "#d9a0ad", metalness: 0.16, roughness: 0.18 },
  "pearl-glaze": { base: "#e9dcd0", accent: "#fffaf2", metalness: 0.28, roughness: 0.14 },
  "bridal-glow": { base: "#d9a7a0", accent: "#f5d8bb", metalness: 0.32, roughness: 0.16 },
  "cherry-chrome": { base: "#a51f43", accent: "#f1a7b4", metalness: 0.62, roughness: 0.16 },
  "soft-nude": { base: "#c99d8d", accent: "#f2d9cb", metalness: 0.05, roughness: 0.24 },
  "golden-hour": { base: "#c49a55", accent: "#f7e3a9", metalness: 0.68, roughness: 0.18 },
  "midnight-gloss": { base: "#30223f", accent: "#a78ab9", metalness: 0.2, roughness: 0.16 },
};

function createNailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, -0.53);
  shape.quadraticCurveTo(-0.25, -0.58, -0.25, -0.42);
  shape.lineTo(-0.27, 0.3);
  shape.quadraticCurveTo(-0.27, 0.62, 0, 0.69);
  shape.quadraticCurveTo(0.27, 0.62, 0.27, 0.3);
  shape.lineTo(0.25, -0.42);
  shape.quadraticCurveTo(0.25, -0.58, 0.2, -0.53);
  shape.quadraticCurveTo(0, -0.61, -0.2, -0.53);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 12,
  });
}

function addFineLine(
  parent: THREE.Group,
  points: THREE.Vector3[],
  material: THREE.Material,
  radius = 0.008
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 18, radius, 6, false);
  parent.add(new THREE.Mesh(geometry, material));
}

function addFrenchTip(parent: THREE.Group, material: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.245, 0.39);
  shape.quadraticCurveTo(0, 0.34, 0.245, 0.39);
  shape.lineTo(0.235, 0.52);
  shape.quadraticCurveTo(0, 0.67, -0.235, 0.52);
  shape.closePath();
  const tip = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), material);
  tip.position.z = 0.094;
  parent.add(tip);
}

export function Nail3DViewer({
  productId,
  productName,
  category,
  image,
}: Nail3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      canvas.dataset.webgl = "unavailable";
      canvas.style.display = "none";
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.05, 4.35);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight(0xfff4ed, 0x795b62, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf2c6c7, 1.7);
    fillLight.position.set(4, 1, 3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffe4c8, 24, 12);
    rimLight.position.set(0, 2.2, -1.5);
    scene.add(rimLight);

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const palette = palettes[productId] ?? {
      base: category === "bridal" ? "#d6a98e" : category === "glam" ? "#79364e" : "#d9b4aa",
      accent: "#f8e4d8",
      metalness: 0.18,
      roughness: 0.2,
    };

    const nailGeometry = createNailGeometry();
    const nailMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.base,
      metalness: palette.metalness,
      roughness: palette.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
    });
    const accentMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.accent,
      metalness: 0.24,
      roughness: 0.18,
      clearcoat: 1,
    });
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: "#d6ad72",
      metalness: 0.82,
      roughness: 0.2,
    });
    const silverMaterial = new THREE.MeshStandardMaterial({
      color: "#e9e4e7",
      metalness: 0.9,
      roughness: 0.16,
    });
    const pearlMaterial = new THREE.MeshPhysicalMaterial({
      color: "#fff4e8",
      metalness: 0.18,
      roughness: 0.1,
      clearcoat: 1,
    });

    const offsets = [-0.92, -0.49, 0, 0.49, 0.92];
    const rotations = [-0.34, -0.17, 0, 0.17, 0.34];

    offsets.forEach((offset, index) => {
      const nailGroup = new THREE.Group();
      nailGroup.position.set(offset, Math.abs(offset) * -0.16, index === 2 ? 0.12 : 0);
      nailGroup.rotation.z = rotations[index];
      const scale = index === 0 || index === 4 ? 0.78 : index === 1 || index === 3 ? 0.91 : 1;
      nailGroup.scale.set(scale, index === 0 || index === 4 ? 0.88 : 1, 1);
      group.add(nailGroup);

      const nail = new THREE.Mesh(nailGeometry, nailMaterial);
      nail.castShadow = true;
      nail.receiveShadow = true;
      nailGroup.add(nail);

      if (productId === "rose-french" || productId === "bridal-glow") {
        addFrenchTip(nailGroup, accentMaterial);
        if (productId === "bridal-glow") {
          addFineLine(nailGroup, [
            new THREE.Vector3(-0.18, 0.28, 0.11),
            new THREE.Vector3(0, 0.24, 0.115),
            new THREE.Vector3(0.18, 0.28, 0.11),
          ], goldMaterial, 0.006);
        }
      }

      if (productId === "velvet-wine") {
        addFineLine(nailGroup, [
          new THREE.Vector3(0, -0.32, 0.105),
          new THREE.Vector3(0.015, 0.02, 0.105),
          new THREE.Vector3(0, 0.34, 0.105),
        ], goldMaterial, 0.009);
        if (index % 2 === 0) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), goldMaterial);
          dot.position.set(0.09, 0.12, 0.12);
          nailGroup.add(dot);
        }
      }

      if (productId === "pearl-glaze") {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), pearlMaterial);
        pearl.position.set(0, 0.1, 0.13);
        pearl.scale.set(1, 0.85, 0.48);
        nailGroup.add(pearl);
      }

      if (productId === "cherry-chrome") {
        [-0.12, 0.02, 0.16].forEach((y) => {
          addFineLine(nailGroup, [
            new THREE.Vector3(-0.19, y - 0.06, 0.11),
            new THREE.Vector3(0, y, 0.115),
            new THREE.Vector3(0.19, y + 0.06, 0.11),
          ], silverMaterial, 0.012);
        });
      }

      if (productId === "soft-nude") {
        addFineLine(nailGroup, [
          new THREE.Vector3(-0.17, -0.22, 0.11),
          new THREE.Vector3(-0.12, 0.08, 0.11),
          new THREE.Vector3(-0.04, 0.32, 0.11),
        ], goldMaterial, 0.006);
      }

      if (productId === "golden-hour") {
        [-0.13, 0.02, 0.14].forEach((x, fleckIndex) => {
          const fleck = new THREE.Mesh(
            new THREE.SphereGeometry(fleckIndex === 1 ? 0.035 : 0.022, 10, 8),
            goldMaterial
          );
          fleck.position.set(x, fleckIndex === 1 ? 0.18 : -0.04 + fleckIndex * 0.16, 0.12);
          fleck.scale.set(1.1, 0.65, 0.35);
          nailGroup.add(fleck);
        });
      }

      if (productId === "midnight-gloss") {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), silverMaterial);
        star.position.set(index % 2 === 0 ? -0.08 : 0.09, 0.16, 0.13);
        nailGroup.add(star);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), pearlMaterial);
        dot.position.set(0.1, -0.12, 0.12);
        nailGroup.add(dot);
      }

      if (productId === "bridal-glow" && index === 2) {
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.105, 0),
          new THREE.MeshPhysicalMaterial({
            color: "#fff0e0",
            metalness: 0.35,
            roughness: 0.08,
            transmission: 0.12,
            clearcoat: 1,
          })
        );
        gem.position.set(0, 0.08, 0.19);
        gem.rotation.y = Math.PI / 4;
        nailGroup.add(gem);
      }
    });

    if (productId === "pearl-glaze") {
      const centerPearl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), pearlMaterial);
      centerPearl.position.set(0, 0.02, 0.31);
      centerPearl.scale.set(1, 1, 0.55);
      group.add(centerPearl);
    }

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let dragging = false;
    let previousX = 0;
    let previousY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      group.rotation.y += (event.clientX - previousX) * 0.009;
      group.rotation.x = THREE.MathUtils.clamp(
        group.rotation.x + (event.clientY - previousY) * 0.006,
        -0.45,
        0.45
      );
      previousX = event.clientX;
      previousY = event.clientY;
      render();
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + event.deltaY * 0.003,
        3.2,
        5.8
      );
      render();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      groupRef.current = null;
      cameraRef.current = null;
    };
  }, [productId, category]);

  function zoomBy(amount: number) {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + amount, 3.2, 5.8);
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (context) {
        // The render loop is event-driven; dispatching a resize keeps the canvas in sync.
        window.dispatchEvent(new Event("resize"));
      }
    }
  }

  function resetView() {
    groupRef.current?.rotation.set(0, 0, 0);
    if (cameraRef.current) cameraRef.current.position.set(0, 0.05, 4.35);
    window.dispatchEvent(new Event("resize"));
  }

  return (
    <div className={styles.nailViewer}>
      <Image
        src={image}
        alt={productName + " product reference"}
        fill
        sizes="(max-width: 760px) 100vw, 340px"
        className={styles.viewerFallback}
      />
      <canvas
        ref={canvasRef}
        className={styles.nailCanvas}
        aria-label={"Interactive illustrative 3D model of " + productName + " press-on nails. Drag to rotate and use zoom controls."}
      />
      <div className={styles.viewerTopline}>
        <span>3D DESIGN PREVIEW</span>
        <div className={styles.viewerControls}>
          <button type="button" onClick={() => zoomBy(-0.35)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(0.35)} aria-label="Zoom out">−</button>
          <button type="button" onClick={resetView}>Reset</button>
        </div>
      </div>
      <p className={styles.viewerHint}>Drag to rotate · Use + / − to zoom</p>
      <span className={styles.viewerDisclaimer}>Illustrative 3D sample · Actual nail art may vary</span>
    </div>
  );
}
