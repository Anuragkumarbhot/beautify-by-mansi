# 3D product model assets

Place approved product-specific GLB files in this directory using the catalogue product ID as the filename:

- `rose-french.glb`
- `velvet-wine.glb`
- `pearl-glaze.glb`
- `bridal-glow.glb`
- `cherry-chrome.glb`
- `soft-nude.glb`
- `golden-hour.glb`
- `midnight-gloss.glb`

## Asset requirements

- Export as binary glTF 2.0 (`.glb`); use glTF 2.0 `.gltf` only when external resources are hosted alongside it.
- Model one press-on nail set or a clearly arranged five-nail display, centered around its origin.
- Apply transforms and use meters (or a consistent scale); the viewer normalizes the largest dimension on load.
- Keep polygon count and texture sizes suitable for mobile. Prefer optimized meshes, compressed textures where supported, and embedded textures in GLB.
- Use PBR materials. Avoid external scripts, HTML, or executable content.
- Only use product photography, scans, and artwork that Beautify by Mansi owns or is licensed to use.

## Connecting a model

Set the matching product's optional `model3d` property in `src/features/catalogue/products.ts` to its public path, for example:

```ts
model3d: "/models/rose-french.glb",
```

The virtual-store viewer loads that model with Three.js GLTFLoader. If the URL is unset or the model cannot load, the existing illustrative procedural preview remains visible.

## Accuracy

Do not enable a model for a product until it has been checked against the actual sellable design. A generic or placeholder model must not be represented as an exact product replica.
