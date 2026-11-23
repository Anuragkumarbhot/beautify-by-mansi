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

    const offsets = [-0.92, -0.49, 0, 0.49, 0.92];
    const rotations = [-0.34, -0.17, 0, 0.17, 0.34];
    offsets.forEach((offset, index) => {
      const nail = new THREE.Mesh(nailGeometry, nailMaterial);
      nail.position.set(offset, Math.abs(offset) * -0.16, index === 2 ? 0.12 : 0);
      nail.rotation.z = rotations[index];
      nail.scale.set(index === 0 || index === 4 ? 0.78 : index === 1 || index === 3 ? 0.91 : 1, index === 0 || index === 4 ? 0.88 : 1, 1);
      nail.castShadow = true;
      nail.receiveShadow = true;
      group.add(nail);

      if (productId === "rose-french" || productId === "bridal-glow" || productId === "pearl-glaze") {
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 12, 8),
          accentMaterial
        );
        tip.position.set(offset, Math.abs(offset) * -0.16 + 0.48, 0.13);
        tip.scale.set(1.2, 0.55, 0.3);
        group.add(tip);
      }
    });

    if (category === "bridal" || productId === "pearl-glaze") {
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
      gem.position.set(0, 0.12, 0.22);
      gem.rotation.y = Math.PI / 4;
      group.add(gem);
    }

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let dragging = false;
    let previousX = 0;
    let previousY = 0;

    const onPointerDown = (event: PointerEvent) => {
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
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let frame = 0;
    const render = () => {
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      nailGeometry.dispose();
      nailMaterial.dispose();
      accentMaterial.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry !== nailGeometry) {
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

  function resetView() {
    groupRef.current?.rotation.set(0, 0, 0);
    if (cameraRef.current) cameraRef.current.position.set(0, 0.05, 4.35);
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
        aria-label={"Interactive illustrative 3D model of " + productName + " press-on nails. Drag to rotate and scroll to zoom."}
      />
      <div className={styles.viewerTopline}>
        <span>3D DESIGN PREVIEW</span>
        <button type="button" onClick={resetView}>Reset view</button>
      </div>
      <p className={styles.viewerHint}>Drag to rotate · Scroll to zoom</p>
      <span className={styles.viewerDisclaimer}>Illustrative 3D sample · Actual nail art may vary</span>
    </div>
  );
}
