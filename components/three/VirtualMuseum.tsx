"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLanguage } from "@/lib/i18n";

export type Artwork = {
  id: string;
  title: string;
  artist: string;
  description: string;
  image: string;
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  zone: 1 | 2 | 3 | 4;
  year?: string;
  medium?: string;
  dimensions?: string;
  /** Artwork slug, for enquiries. */
  slug?: string;
  /** Public artist route key (/artists/[slug]). */
  artistSlug?: string;
};

// Room physical dimensions (in meters)
const ROOM = { w: 20, h: 5.6, d: 24 };

// Viewpoint positions and target focus points for each zone so the camera directly faces that zone's artworks
export const ZONE_VIEWPOINTS: Record<
  number,
  { pos: [number, number, number]; lookAt: [number, number, number] }
> = {
  1: { pos: [0, 1.65, 8.2], lookAt: [0, 1.65, 12] },       // Zone 01: South Wall (Ancestral Roots)
  2: { pos: [-6.2, 1.65, 0], lookAt: [-10, 1.65, 0] },     // Zone 02: West Wall (Urban Rhythm)
  3: { pos: [6.2, 1.65, 0], lookAt: [10, 1.65, 0] },       // Zone 03: East Wall (Woven Threads)
  4: { pos: [0, 1.65, -8.2], lookAt: [0, 1.65, -12] },     // Zone 04: North Wall (Digital Horizons)
};

// Exported for backwards compatibility
export const ZONE_POSITIONS: Record<number, [number, number, number]> = {
  1: ZONE_VIEWPOINTS[1].pos,
  2: ZONE_VIEWPOINTS[2].pos,
  3: ZONE_VIEWPOINTS[3].pos,
  4: ZONE_VIEWPOINTS[4].pos,
};

type TexStatus = "loading" | "ready" | "error";
type TexEntry = { status: TexStatus; texture?: THREE.Texture };

type Palette = {
  wall: string;
  wallPlaster: string;
  floor: string;
  ceiling: string;
  skylightEmissive: string;
  bg: string;
  ambientIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  spotColor: string;
  spotIntensity: number;
  frameColor: string;
  matteColor: string;
  plaqueBg: string;
  labelPrimary: string;
  labelSecondary: string;
  accent: string;
  baseboard: string;
  trackColor: string;
};

const MUSEUM_PALETTE: Palette = {
  // White-cube gallery: light walls, dark floor, neutral white light. No
  // beige or warm tints anywhere (brand palette: white, charcoal, red).
  wall: "#F5F5F3",
  wallPlaster: "#F5F5F3",
  floor: "#161616",
  ceiling: "#161616",
  skylightEmissive: "#FFFFFF",
  bg: "#161616",
  ambientIntensity: 0.45,
  hemiSky: "#FFFFFF",
  hemiGround: "#5C5C5C",
  hemiIntensity: 0.65,
  directionalColor: "#FFFFFF",
  directionalIntensity: 0.65,
  spotColor: "#FFFFFF",
  spotIntensity: 2.6,
  frameColor: "#1F1F1F",
  // Viewing panels behind each artwork stay white.
  matteColor: "#FFFFFF",
  plaqueBg: "#1F1F1F",
  labelPrimary: "#FFFFFF",
  labelSecondary: "#B8B8B8",
  accent: "#D7141E",
  baseboard: "#262626",
  trackColor: "#1F1F1F",
};

// Module-level cached placeholder textures (NUA-ARTE red brush motif on ivory)
// Keyed by the drawn label, so each language gets its own placeholder texture.
const _placeholders = new Map<string, THREE.CanvasTexture>();
let _plasterTex: THREE.CanvasTexture | null = null;
let _plasterColorTex: THREE.CanvasTexture | null = null;
let _floorTex: THREE.CanvasTexture | null = null;

function makePlaceholder(label: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#F5F5F3";
  ctx.fillRect(0, 0, 512, 512);

  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "rgba(255, 255, 255, 0)");
  g.addColorStop(1, "rgba(31, 31, 31, 0.06)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "#D7141E";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(96, 180);
  ctx.bezierCurveTo(200, 120, 320, 260, 420, 200);
  ctx.stroke();

  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(110, 320);
  ctx.bezierCurveTo(220, 380, 340, 260, 410, 340);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#1F1F1F";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 460);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function getPlaceholder(label: string): THREE.CanvasTexture {
  let tex = _placeholders.get(label);
  if (!tex) {
    tex = makePlaceholder(label);
    _placeholders.set(label, tex);
  }
  return tex;
}

// Subtle natural plaster grain for museum walls. This is used as a bump and
// roughness map, keeping the gallery wall matte while giving grazing light
// something real to catch instead of reading as a perfectly flat white plane.
function getPlasterTexture(): THREE.CanvasTexture {
  if (_plasterTex) return _plasterTex;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8C8C8C";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 44;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
  }
  ctx.putImageData(img, 0, 0);

  // Large, very low-contrast trowel passes avoid a tiled digital-noise look.
  for (let i = 0; i < 90; i++) {
    const tone = Math.random() > 0.5 ? 150 : 102;
    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, 0.06)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      18 + Math.random() * 75,
      3 + Math.random() * 14,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 4);
  tex.anisotropy = 4;
  _plasterTex = tex;
  return tex;
}

function getPlasterColorTexture(): THREE.CanvasTexture {
  if (_plasterColorTex) return _plasterColorTex;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);
  ctx.filter = "blur(18px)";
  for (let i = 0; i < 48; i++) {
    const tone = Math.random() > 0.5 ? 255 : 225;
    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, 0.24)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      30 + Math.random() * 110,
      20 + Math.random() * 70,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.filter = "none";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.anisotropy = 4;
  _plasterColorTex = texture;
  return texture;
}

// Polished charcoal concrete with extremely fine aggregate. Large-format joints
// are modelled separately below, so they remain crisp beneath reflections.
function getFloorTexture(): THREE.CanvasTexture {
  if (_floorTex) return _floorTex;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8C8C8C";
  ctx.fillRect(0, 0, size, size);

  // Fine aggregate gives the slab its close-up concrete character.
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.2 + 0.3;
    const tone = Math.random() > 0.5 ? 115 : 140;
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polished concrete has broad burnishing and trowel marks as well as fine
  // grain. These soft, large-scale tonal shifts stop the floor reading as a
  // flat grey or black plane when viewed from across the gallery.
  ctx.filter = "blur(22px)";
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = 55 + Math.random() * 145;
    const ry = 14 + Math.random() * 52;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(160, 160, 160, 0.12)" : "rgba(95, 95, 95, 0.12)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.anisotropy = 8;
  _floorTex = tex;
  return tex;
}

// Crisp, high-resolution museum plaque rendered on a native 3D WebGL mesh.
// Standard depth testing guarantees the plaque is flush against the wall and
// cannot bleed or show through the other side of walls.
function createPlaqueTexture(title: string, subtitle: string, accentColor: string): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Smooth dark museum plaque background
  ctx.fillStyle = "#1F1F1F";
  ctx.fillRect(0, 0, width, height);

  // Subtle border bevel
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Brand accent bar on left edge
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 24, height);

  // Artwork Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 44px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title.toUpperCase(), 56, 88, width - 80);

  // Artist & details subtitle
  ctx.fillStyle = "#B8B8B8";
  ctx.font = "500 28px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(subtitle, 56, 168, width - 80);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createPlantLeafGeometry(length: number, width: number): THREE.BufferGeometry {
  const lengthSegments = 20;
  const widthSegments = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const halfWidth = Math.sin(Math.PI * t) * width * (1 - t * 0.22);
    for (let j = 0; j <= widthSegments; j++) {
      const across = j / widthSegments * 2 - 1;
      const cup = Math.sin(Math.PI * t) * (across * across * 0.045 - 0.025);
      positions.push(across * halfWidth, t * length, cup);
    }
  }

  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * (widthSegments + 1) + j;
      const b = a + widthSegments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PottedPlant({ position }: { position: [number, number, number] }) {
  const leafGeometry = useMemo(() => createPlantLeafGeometry(0.82, 0.2), []);
  const potProfile = useMemo(
    () => [
      new THREE.Vector2(0.23, 0),
      new THREE.Vector2(0.27, 0.04),
      new THREE.Vector2(0.35, 0.12),
      new THREE.Vector2(0.42, 0.48),
      new THREE.Vector2(0.39, 0.52),
      new THREE.Vector2(0.35, 0.46),
      new THREE.Vector2(0.29, 0.14),
      new THREE.Vector2(0.23, 0.11),
    ],
    [],
  );
  const potMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#262626", roughness: 0.82 }),
    [],
  );
  const foliageMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#42613B", roughness: 0.76, side: THREE.DoubleSide }),
    [],
  );
  const stemMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4D5934", roughness: 0.85 }),
    [],
  );

  useEffect(() => () => leafGeometry.dispose(), [leafGeometry]);

  const leaves = Array.from({ length: 12 }, (_, index) => {
    const upper = index >= 8;
    const ringIndex = upper ? index - 8 : index;
    const count = upper ? 4 : 8;
    const yaw = ringIndex / count * Math.PI * 2 + (upper ? 0.35 : 0);
    const tilt = upper ? 0.72 : 1.12;

    return (
      <mesh
        key={`plant-leaf-${index}`}
        geometry={leafGeometry}
        position={[0, upper ? 0.88 : 0.58, 0]}
        rotation={[0, yaw, tilt]}
        material={foliageMaterial}
        castShadow
      />
    );
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <latheGeometry args={[potProfile, 32]} />
        <primitive object={potMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.445, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.025, 32]} />
        <meshStandardMaterial color="#1F1F1F" roughness={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.405, 0.028, 8, 32]} />
        <meshStandardMaterial color="#333333" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.024, 0.9, 8]} />
        <primitive object={stemMaterial} attach="material" />
      </mesh>
      {leaves}
    </group>
  );
}

// Architectural museum gallery pavilion
function GalleryArchitecture({ p }: { p: Palette }) {
  const plasterTexture = useMemo(() => getPlasterTexture(), []);
  const plasterColorTexture = useMemo(() => getPlasterColorTexture(), []);
  const floorTexture = useMemo(() => getFloorTexture(), []);
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.wall,
        map: plasterColorTexture,
        roughness: 0.86,
        roughnessMap: plasterTexture,
        metalness: 0,
        bumpMap: plasterTexture,
        bumpScale: 0.04,
      }),
    [p.wall, plasterTexture, plasterColorTexture],
  );

  const ceilMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.ceiling,
        roughness: 0.95,
      }),
    [p.ceiling],
  );

  const baseboardMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.baseboard,
        roughness: 0.55,
        metalness: 0.25,
      }),
    [p.baseboard],
  );

  const trackMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.trackColor,
        roughness: 0.45,
        metalness: 0.6,
      }),
    [p.trackColor],
  );
  const W = ROOM.w;
  const H = ROOM.h;
  const D = ROOM.d;
  const wallThick = 0.4;

  return (
    <group>
      {/* Blurred mirror-polished gallery floor — reflects lights and art without becoming a sharp mirror. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <MeshReflectorMaterial
          // Visibly charcoal concrete base tone with smooth gallery reflections.
          // Dielectric metalness (0.12) preserves the rendered base tone while
          // reflecting warm artworks and lighting like the gallery reference.
          color={p.floor}
          bumpMap={floorTexture}
          bumpScale={0.018}
          resolution={1024}
          blur={[160, 50]}
          mixBlur={0.7}
          mixStrength={1.1}
          mirror={0.65}
          roughness={0.22}
          metalness={0.12}
          mixContrast={1.2}
          depthScale={0.45}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.4}
        />
      </mesh>

      {/* Fine expansion joints: a gallery-grade polished concrete floor reads
          in large slabs, not as one endless featureless dark plane. */}
      <group position={[0, 0.006, 0]}>
        {[-7.5, -5, -2.5, 0, 2.5, 5, 7.5].map((x) => (
          <mesh key={`floor-joint-x-${x}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.018, 0.006, D]} />
            <meshStandardMaterial color="#262626" roughness={0.32} metalness={0.15} />
          </mesh>
        ))}
        {[-9, -6, -3, 0, 3, 6, 9].map((z) => (
          <mesh key={`floor-joint-z-${z}`} position={[0, 0, z]}>
            <boxGeometry args={[W, 0.006, 0.018]} />
            <meshStandardMaterial color="#262626" roughness={0.32} metalness={0.15} />
          </mesh>
        ))}
      </group>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} material={ceilMat}>
        <planeGeometry args={[W, D]} />
      </mesh>

      {/* Recessed skylight bays and coves create the soft falloff that makes a
          physical gallery feel deep, even before the individual art spots hit. */}
      <group position={[0, H - 0.035, 0]}>
        {[-6, 0, 6].map((x) => (
          <group key={`skylight-${x}`} position={[x, 0, -2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[4.1, 7.2]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive={p.skylightEmissive}
                emissiveIntensity={0.75}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, 0.015, -3.65]} material={trackMat}>
              <boxGeometry args={[4.25, 0.08, 0.08]} />
            </mesh>
            <mesh position={[0, 0.015, 3.65]} material={trackMat}>
              <boxGeometry args={[4.25, 0.08, 0.08]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Exposed black ceiling grid, matching a working contemporary gallery. */}
      <group position={[0, H - 0.05, 0]}>
        {Array.from({ length: 21 }, (_, i) => (
          <mesh key={`ceiling-x-${i}`} position={[-W / 2 + i, 0, 0]} material={trackMat}>
            <boxGeometry args={[0.035, 0.07, D]} />
          </mesh>
        ))}
        {Array.from({ length: 25 }, (_, i) => (
          <mesh key={`ceiling-z-${i}`} position={[0, 0, -D / 2 + i]} material={trackMat}>
            <boxGeometry args={[W, 0.07, 0.035]} />
          </mesh>
        ))}
      </group>

      {/* Minimalist suspended black lighting tracks parallel to all 4 walls (2.2m from wall) */}
      <group position={[0, H - 0.12, 0]}>
        {/* North track */}
        <mesh position={[0, 0, -D / 2 + 2.2]}>
          <boxGeometry args={[W - 4.4, 0.05, 0.05]} />
          <primitive object={trackMat} attach="material" />
        </mesh>
        {/* South track */}
        <mesh position={[0, 0, D / 2 - 2.2]}>
          <boxGeometry args={[W - 4.4, 0.05, 0.05]} />
          <primitive object={trackMat} attach="material" />
        </mesh>
        {/* West track */}
        <mesh position={[-W / 2 + 2.2, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, D - 4.4]} />
          <primitive object={trackMat} attach="material" />
        </mesh>
        {/* East track */}
        <mesh position={[W / 2 - 2.2, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, D - 4.4]} />
          <primitive object={trackMat} attach="material" />
        </mesh>
        {/* Mid wall east track (suspends spotlights for east-facing mid wall paintings) */}
        <mesh position={[-1.25, 0, 3.4]}>
          <boxGeometry args={[0.05, 0.05, 7.6]} />
          <primitive object={trackMat} attach="material" />
        </mesh>
      </group>

      {/* SOLID ARCHITECTURAL WALLS */}
      {/* North Feature Wall (Back, z = -12) */}
      <mesh position={[0, H / 2, -D / 2 - wallThick / 2]} receiveShadow material={wallMat}>
        <boxGeometry args={[W, H, wallThick]} />
      </mesh>
      {/* Entrance wall: split into two wings so visitors visibly enter the gallery. */}
      <mesh position={[-6.6, H / 2, D / 2 + wallThick / 2]} receiveShadow material={wallMat}>
        <boxGeometry args={[6.8, H, wallThick]} />
      </mesh>
      <mesh position={[6.6, H / 2, D / 2 + wallThick / 2]} receiveShadow material={wallMat}>
        <boxGeometry args={[6.8, H, wallThick]} />
      </mesh>
      {/* West Wall (Left, x = -10) */}
      <mesh position={[-W / 2 - wallThick / 2, H / 2, 0]} receiveShadow material={wallMat}>
        <boxGeometry args={[wallThick, H, D]} />
      </mesh>
      {/* East Wall (Right, x = 10) */}
      <mesh position={[W / 2 + wallThick / 2, H / 2, 0]} receiveShadow material={wallMat}>
        <boxGeometry args={[wallThick, H, D]} />
      </mesh>

      {/* Freestanding mid partition wall creates the second room beyond the entrance. */}
      <mesh position={[-3.7, H / 2, 3.4]} castShadow receiveShadow material={wallMat}>
        <boxGeometry args={[wallThick, H, 9.2]} />
      </mesh>

      {/* Hairline shadow reveals break up the large planes like real drywall
          joints, without competing with the artwork. */}
      <group>
        {[-5, 5].map((x) => (
          <mesh key={`north-reveal-${x}`} position={[x, H / 2, -D / 2 + 0.012]} material={baseboardMat}>
            <boxGeometry args={[0.018, H - 0.24, 0.012]} />
          </mesh>
        ))}
        {[-6, 0, 6].map((z) => (
          <mesh key={`west-reveal-${z}`} position={[-W / 2 + 0.012, H / 2, z]} rotation={[0, Math.PI / 2, 0]} material={baseboardMat}>
            <boxGeometry args={[0.018, H - 0.24, 0.012]} />
          </mesh>
        ))}
        {[-6, 0, 6].map((z) => (
          <mesh key={`east-reveal-${z}`} position={[W / 2 - 0.012, H / 2, z]} rotation={[0, Math.PI / 2, 0]} material={baseboardMat}>
            <boxGeometry args={[0.018, H - 0.24, 0.012]} />
          </mesh>
        ))}
      </group>

      {/* Continuous Architectural Baseboards */}
      {/* North baseboard */}
      <mesh position={[0, 0.06, -D / 2 + 0.02]} material={baseboardMat}>
        <boxGeometry args={[W, 0.12, 0.04]} />
      </mesh>
      {/* South baseboard */}
      <mesh position={[0, 0.06, D / 2 - 0.02]} material={baseboardMat}>
        <boxGeometry args={[W, 0.12, 0.04]} />
      </mesh>
      {/* West baseboard */}
      <mesh position={[-W / 2 + 0.02, 0.06, 0]} material={baseboardMat}>
        <boxGeometry args={[0.04, 0.12, D]} />
      </mesh>
      {/* East baseboard */}
      <mesh position={[W / 2 - 0.02, 0.06, 0]} material={baseboardMat}>
        <boxGeometry args={[0.04, 0.12, D]} />
      </mesh>
      {/* Mid wall baseboards */}
      <mesh position={[-3.7 + wallThick / 2 + 0.012, 0.06, 3.4]} material={baseboardMat}>
        <boxGeometry args={[0.024, 0.12, 9.2]} />
      </mesh>
      <mesh position={[-3.7 - wallThick / 2 - 0.012, 0.06, 3.4]} material={baseboardMat}>
        <boxGeometry args={[0.024, 0.12, 9.2]} />
      </mesh>
      <mesh position={[-3.7, 0.06, 3.4 - 9.2 / 2 - 0.012]} material={baseboardMat}>
        <boxGeometry args={[wallThick + 0.048, 0.12, 0.024]} />
      </mesh>
      <mesh position={[-3.7, 0.06, 3.4 + 9.2 / 2 + 0.012]} material={baseboardMat}>
        <boxGeometry args={[wallThick + 0.048, 0.12, 0.024]} />
      </mesh>
      <PottedPlant position={[-2.85, 0, 7.05]} />
      <PottedPlant position={[-2.85, 0, -0.45]} />
    </group>
  );
}

// Ceiling Track Spotlight Can Fixture
function TrackLightFixture({
  trackPos,
  targetPos,
  color,
}: {
  trackPos: [number, number, number];
  targetPos: [number, number, number];
  color: string;
}) {
  const headRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (headRef.current) {
      headRef.current.lookAt(new THREE.Vector3(...targetPos));
    }
  }, [targetPos]);

  return (
    <group position={trackPos}>
      {/* Track mounting clip */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#161616" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Swivel head */}
      <group ref={headRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 0.16, 16]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.35} metalness={0.65} />
        </mesh>
        {/* Warm LED lens glow */}
        <mesh position={[0, 0, 0.082]}>
          <circleGeometry args={[0.038, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// Artwork Frame with Museum Plaque and Dedicated Spotlight
function ArtworkFrame({
  art,
  entry,
  palette,
  onSelect,
}: {
  art: Artwork;
  entry: TexEntry;
  palette: Palette;
  onSelect: (a: Artwork) => void;
}) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const targetRef = useRef<THREE.Object3D>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const errorLabel = t("IMAGE UNAVAILABLE");
  const loadingLabel = t("LOADING ARTWORK…");

  // Artwork canvas material: lighting-independent, high-res SRGB, no z-fighting
  const mat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: false,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: true,
    });
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -1;
    return m;
  }, []);

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useEffect(() => {
    let tex: THREE.Texture;
    if (entry.status === "ready" && entry.texture) tex = entry.texture;
    else if (entry.status === "error") tex = getPlaceholder(errorLabel);
    else tex = getPlaceholder(loadingLabel);
    mat.map = tex;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
  }, [mat, entry.status, entry.texture, errorLabel, loadingLabel]);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
      targetRef.current.updateMatrixWorld();
    }
  }, []);

  const label = [art.artist, art.year, art.medium && t(art.medium)].filter(Boolean).join(" · ");
  const plaqueW = Math.max(1.4, Math.min(art.width * 0.85, 2.0));
  const plaqueTexture = useMemo(
    () => createPlaqueTexture(art.title, label, palette.accent),
    [art.title, label, palette.accent],
  );

  useEffect(() => () => plaqueTexture.dispose(), [plaqueTexture]);

  // Ceiling track position relative to this artwork
  const ceilingY = ROOM.h - 0.15 - art.position[1];

  return (
    <group
      position={[
        art.position[0] - Math.sin(art.rotationY) * 0.05,
        art.position[1],
        art.position[2] - Math.cos(art.rotationY) * 0.05,
      ]}
      rotation={[0, art.rotationY, 0]}
    >
      {/* Ceiling Track Spotlight Can */}
      <TrackLightFixture
        trackPos={[0, ceilingY, 2.2]}
        targetPos={[0, 0, 0]}
        color={palette.spotColor}
      />

      {/* Target object for the spotlight */}
      <object3D ref={targetRef} position={[0, 0, 0.04]} />

      {/* Dedicated spotlight from the ceiling track (direct illumination without consuming WebGL texture units for shadow maps) */}
      <spotLight
        ref={spotRef}
        position={[0, ceilingY, 2.2]}
        angle={0.38}
        penumbra={0.7}
        intensity={hovered ? palette.spotIntensity * 1.3 : palette.spotIntensity}
        distance={9.5}
        decay={1.3}
        color={palette.spotColor}
      />

      {/* Outer Museum Frame Box */}
      <mesh position={[0, 0, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[art.width + 0.16, art.height + 0.16, 0.04]} />
        <meshStandardMaterial
          color={palette.frameColor}
          roughness={0.45}
          metalness={0.12}
        />
      </mesh>

      {/* Archival Matte Board */}
      <mesh position={[0, 0, 0.041]} receiveShadow>
        <planeGeometry args={[art.width + 0.04, art.height + 0.04]} />
        <meshStandardMaterial
          color={palette.matteColor}
          roughness={0.75}
          emissive={hovered ? "#FFFFFF" : "#000000"}
          emissiveIntensity={hovered ? 0.08 : 0}
        />
      </mesh>

      {/* Artwork Canvas Plane */}
      <mesh
        position={[0, 0, 0.043]}
        material={mat}
        castShadow={false}
        receiveShadow={false}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(art);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[art.width, art.height]} />
      </mesh>

      {/* Refined Museum Label Plaque Beneath Frame */}
      <group position={[0, -art.height / 2 - 0.21, 0.018]}>
        {/* Plaque backplate */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[plaqueW, 0.24, 0.035]} />
          <meshStandardMaterial
            color={palette.plaqueBg}
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, 0, 0.019]}>
          <planeGeometry args={[plaqueW, 0.24]} />
          <meshBasicMaterial
            map={plaqueTexture}
            toneMapped={false}
            side={THREE.FrontSide}
            depthTest
            depthWrite
          />
        </mesh>
      </group>
    </group>
  );
}

const WALL_GRAZE_LIGHTS: Array<{
  position: [number, number, number];
  target: [number, number, number];
}> = [
  { position: [-7.8, 4.9, -3], target: [-9.95, 1.9, -3] },
  { position: [-7.8, 4.9, 3], target: [-9.95, 1.9, 3] },
  { position: [7.8, 4.9, -3], target: [9.95, 1.9, -3] },
  { position: [7.8, 4.9, 3], target: [9.95, 1.9, 3] },
  { position: [-3, 4.9, -9.8], target: [-3, 1.9, -11.95] },
  { position: [3, 4.9, -9.8], target: [3, 1.9, -11.95] },
  { position: [-3, 4.9, 9.8], target: [-3, 1.9, 11.95] },
  { position: [3, 4.9, 9.8], target: [3, 1.9, 11.95] },
];

function WallGrazeLight({
  position,
  target,
}: {
  position: [number, number, number];
  target: [number, number, number];
}) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
      targetRef.current.updateMatrixWorld();
    }
  }, []);

  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        angle={0.82}
        penumbra={0.92}
        intensity={12}
        distance={10}
        decay={1.5}
        color="#FFFFFF"
      />
      <object3D ref={targetRef} position={target} />
    </>
  );
}

function PerimeterWallWash() {
  return (
    <>
      {WALL_GRAZE_LIGHTS.map((light, index) => (
        <WallGrazeLight key={index} {...light} />
      ))}
    </>
  );
}

type MoveKeys = Record<string, boolean>;

/** Where the camera stands to look at one artwork: in front of it, at eye
 * height, shifted sideways by `offset` metres so the painting sits clear of
 * the viewing panel on the right. */
function viewpointFor(art: Artwork, offset: number) {
  const normal = new THREE.Vector3(Math.sin(art.rotationY), 0, Math.cos(art.rotationY));
  const right = new THREE.Vector3().crossVectors(normal.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
  const distance = Math.max(2.8, Math.max(art.width, art.height) * 1.55);
  const target = new THREE.Vector3(...art.position).addScaledVector(right, offset);
  const pos = new THREE.Vector3(...art.position).addScaledVector(normal, distance).addScaledVector(right, offset);
  pos.y = 1.65;
  pos.x = THREE.MathUtils.clamp(pos.x, -ROOM.w / 2 + 1.2, ROOM.w / 2 - 1.2);
  pos.z = THREE.MathUtils.clamp(pos.z, -ROOM.d / 2 + 1.4, ROOM.d / 2 - 1.4);
  // Camera convention (looks down -z), unlike Object3D.lookAt on a plain object.
  const look = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(target.x, art.position[1] - 0.15, target.z), new THREE.Vector3(0, 1, 0));
  return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(look) };
}

// Camera controller. "tour": glides smoothly to the focused artwork and ignores
// the keyboard (arrow keys move between artworks instead). "free": first-person
// walking with W/A/S/D or arrow keys, plus drag-to-look and on-screen arrows on
// touch screens.
function Player({
  mode,
  focus,
  focusOffset,
  touchKeys,
  setKeysActive,
}: {
  mode: "tour" | "free";
  focus: Artwork | null;
  focusOffset: number;
  touchKeys: React.MutableRefObject<MoveKeys>;
  setKeysActive: (k: MoveKeys) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<MoveKeys>({});
  const velocity = useRef(new THREE.Vector3());
  const goal = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion } | null>(null);

  // Initial view: a diagonal sightline across the near wall, long white side
  // wall, and charcoal floor.
  useEffect(() => {
    camera.position.set(-5.8, 1.65, 7.5);
    camera.lookAt(3.2, 1.7, -3.8);
  }, [camera]);

  useEffect(() => {
    goal.current = mode === "tour" && focus ? viewpointFor(focus, focusOffset) : null;
  }, [mode, focus, focusOffset]);

  useEffect(() => {
    if (mode !== "free") {
      keys.current = {};
      return;
    }
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      setKeysActive({ ...keys.current });
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
      setKeysActive({ ...keys.current });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [mode, setKeysActive]);

  // Drag to look around on touch screens (pointer lock does not exist there).
  useEffect(() => {
    if (mode !== "free") return;
    const el = gl.domElement;
    let last: { x: number; y: number } | null = null;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!last || e.pointerType !== "touch") return;
      euler.setFromQuaternion(camera.quaternion);
      euler.y += (e.clientX - last.x) * 0.005;
      euler.x = THREE.MathUtils.clamp(euler.x + (e.clientY - last.y) * 0.003, -0.6, 0.6);
      camera.quaternion.setFromEuler(euler);
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      last = null;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [mode, gl, camera]);

  useFrame((_, delta) => {
    if (mode === "tour") {
      if (goal.current) {
        const k = 1 - Math.exp(-delta * 2.6);
        camera.position.lerp(goal.current.pos, k);
        camera.quaternion.slerp(goal.current.quat, k);
      }
      return;
    }

    const speed = 4.2;
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const pressed = (k: string) => keys.current[k] || touchKeys.current[k];

    if (pressed("w") || pressed("arrowup")) dir.add(fwd);
    if (pressed("s") || pressed("arrowdown")) dir.sub(fwd);
    if (pressed("d") || pressed("arrowright")) dir.add(right);
    if (pressed("a") || pressed("arrowleft")) dir.sub(right);

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed * delta);
      velocity.current.copy(dir);
    } else {
      velocity.current.multiplyScalar(0.82);
    }
    const previousPosition = camera.position.clone();
    camera.position.add(velocity.current);

    // Keep camera safely inside gallery walls
    const mx = 1.2;
    const mz = 1.4;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM.w / 2 + mx, ROOM.w / 2 - mx);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM.d / 2 + mz, ROOM.d / 2 - mz);

    // The freestanding return wall is a real barrier, not only decoration.
    // Keep a small visitor radius so the camera cannot clip through it or see
    // DOM plaque labels on its far side while walking.
    const visitorRadius = 0.45;
    const returnWall = {
      minX: -3.7 - 0.2 - visitorRadius,
      maxX: -3.7 + 0.2 + visitorRadius,
      minZ: 3.4 - 9.2 / 2 - visitorRadius,
      maxZ: 3.4 + 9.2 / 2 + visitorRadius,
    };
    const insideReturnWall =
      camera.position.x >= returnWall.minX &&
      camera.position.x <= returnWall.maxX &&
      camera.position.z >= returnWall.minZ &&
      camera.position.z <= returnWall.maxZ;

    if (insideReturnWall) {
      // Resolve against the face that the visitor approached, allowing them
      // to walk around either end but never pass through the wall itself.
      if (previousPosition.x >= returnWall.maxX) camera.position.x = returnWall.maxX;
      else if (previousPosition.x <= returnWall.minX) camera.position.x = returnWall.minX;
      else if (previousPosition.z <= returnWall.minZ) camera.position.z = returnWall.minZ;
      else camera.position.z = returnWall.maxZ;
      velocity.current.set(0, 0, 0);
    }
    camera.position.y = 1.65;
  });

  return null;
}

function SceneRig() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);
  return null;
}

export default function VirtualMuseum({
  artworks,
  mode = "free",
  focus = null,
  focusOffset = 0,
  onSelectArtwork,
  onKeysChange,
  onLoadProgress,
}: {
  artworks: Artwork[];
  mode?: "tour" | "free";
  /** Artwork the camera glides to in tour mode. */
  focus?: Artwork | null;
  /** Sideways shift (metres) so the focused painting clears an overlay panel. */
  focusOffset?: number;
  onSelectArtwork: (a: Artwork) => void;
  onKeysChange?: (keys: Record<string, boolean>) => void;
  onLoadProgress?: (loaded: number, total: number, errors: number) => void;
}) {
  const { t } = useLanguage();
  const palette = MUSEUM_PALETTE;
  const touchKeys = useRef<MoveKeys>({});
  const [tipOpen, setTipOpen] = useState(true);
  // Only ever rendered in the browser (lazy-loaded after a tap), so reading
  // matchMedia during the first render is safe.
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [entries, setEntries] = useState<Record<string, TexEntry>>(() =>
    Object.fromEntries(artworks.map((a) => [a.id, { status: "loading" as TexStatus }])),
  );


  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let cancelled = false;
    let loaded = 0;
    let errors = 0;
    const total = artworks.length;
    onLoadProgress?.(0, total, 0);

    artworks.forEach((a) => {
      loader.load(
        a.image,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.anisotropy = 8;
          tex.needsUpdate = true;
          loaded += 1;
          setEntries((prev) => ({ ...prev, [a.id]: { status: "ready", texture: tex } }));
          onLoadProgress?.(loaded, total, errors);
        },
        undefined,
        () => {
          if (cancelled) return;
          errors += 1;
          loaded += 1;
          setEntries((prev) => ({ ...prev, [a.id]: { status: "error" } }));
          onLoadProgress?.(loaded, total, errors);
        },
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworks]);

  return (
    <div id="virtual-museum-viewport" className="absolute inset-0 h-full w-full">
      <Canvas
        shadows
        camera={{ fov: 58, near: 0.1, far: 100, position: [-5.8, 1.65, 7.5] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <SceneRig />
        <color attach="background" args={[palette.bg]} />
        <ambientLight intensity={palette.ambientIntensity} />
        <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />

        {/* Diffuse Natural Skylight */}
        <directionalLight
          position={[0, 10, 0]}
          intensity={palette.directionalIntensity}
          color={palette.directionalColor}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        <PerimeterWallWash />
        <GalleryArchitecture p={palette} />

        {artworks.map((a) => (
          <ArtworkFrame
            key={a.id}
            art={a}
            entry={entries[a.id] ?? { status: "loading" }}
            palette={palette}
            onSelect={onSelectArtwork}
          />
        ))}

        <Player
          mode={mode}
          focus={focus}
          focusOffset={focusOffset}
          touchKeys={touchKeys}
          setKeysActive={(k) => onKeysChange?.(k)}
        />

        {mode === "free" && !coarse && <PointerLockControls selector="#virtual-museum-viewport" />}
      </Canvas>

      {/* Free exploration only: a small, dismissible tip instead of a
          W/A/S/D panel on entry (change brief, section 4). */}
      {mode === "free" && tipOpen && (
        <div className={`absolute ${coarse ? "top-20" : "bottom-20"} left-1/2 z-10 flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 border border-[var(--nua-line-dark)] bg-[var(--nua-charcoal-deep)]/90 px-4 py-3 text-sm text-[var(--nua-white)] shadow-lg backdrop-blur-md`}>
          <p className="flex-1 leading-snug">
            {coarse
              ? t("Drag to look around. Use the arrows to walk.")
              : t("Click the room to look around with the mouse. Walk with W A S D or the arrow keys; Esc releases the mouse.")}
          </p>
          <button
            type="button"
            onClick={() => setTipOpen(false)}
            aria-label={t("Dismiss tip")}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--nua-grey-light)] hover:text-[var(--nua-white)]"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      )}

      {/* Touch screens: visible walking buttons, at least 44 × 44 px. */}
      {mode === "free" && coarse && (
        <div className="absolute bottom-4 left-4 z-10 grid grid-cols-3 gap-1">
          {(
            [
              ["", ""],
              ["w", "arrow_upward"],
              ["", ""],
              ["a", "arrow_back"],
              ["s", "arrow_downward"],
              ["d", "arrow_forward"],
            ] as const
          ).map(([key, icon], i) =>
            key ? (
              <button
                key={key}
                type="button"
                aria-label={t({ w: "Walk forward", s: "Walk back", a: "Step left", d: "Step right" }[key])}
                onPointerDown={() => (touchKeys.current[key] = true)}
                onPointerUp={() => (touchKeys.current[key] = false)}
                onPointerLeave={() => (touchKeys.current[key] = false)}
                onPointerCancel={() => (touchKeys.current[key] = false)}
                className="flex h-12 w-12 select-none items-center justify-center border border-[var(--nua-line-dark)] bg-[var(--nua-charcoal-deep)]/80 text-[var(--nua-white)] active:bg-[var(--nua-charcoal)]"
                style={{ touchAction: "none" }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {icon}
                </span>
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
