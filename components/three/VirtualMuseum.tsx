"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "@/lib/theme";
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
  // Smooth, pale mineral paint — closer to a finished contemporary gallery
  // wall than raw grey plaster.
  wall: "#F0F0EE",
  wallPlaster: "#E9E8E4",
  // Warm charcoal concrete with enough lift to read distinctly from black.
  floor: "#706D67",
  // Black ceiling preserved
  ceiling: "#090A0B",
  skylightEmissive: "#FFFDF9",
  bg: "#161514",
  ambientIntensity: 0.45,
  hemiSky: "#FFFDF8",
  hemiGround: "#5C564E",
  hemiIntensity: 0.65,
  directionalColor: "#FFF8ED",
  directionalIntensity: 0.65,
  spotColor: "#FFF6E8",
  spotIntensity: 2.6,
  frameColor: "#181615",
  matteColor: "#FAF8F5",
  plaqueBg: "#171514",
  labelPrimary: "#F5F3EF",
  labelSecondary: "#B8B5AF",
  accent: "#9F0D12",
  baseboard: "#242220",
  trackColor: "#1C1A18",
};

// Module-level cached placeholder textures (NUA-ARTE red brush motif on ivory)
let _phLoading: THREE.CanvasTexture | null = null;
let _phError: THREE.CanvasTexture | null = null;
let _plasterTex: THREE.CanvasTexture | null = null;
let _plasterColorTex: THREE.CanvasTexture | null = null;
let _floorTex: THREE.CanvasTexture | null = null;

function makePlaceholder(kind: "loading" | "error"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#F5F2ED";
  ctx.fillRect(0, 0, 512, 512);

  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "rgba(212, 175, 120, 0.15)");
  g.addColorStop(1, "rgba(159, 13, 18, 0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "#9F0D12";
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
  ctx.fillStyle = "#1A1715";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(kind === "error" ? "IMAGE UNAVAILABLE" : "LOADING ARTWORK…", 256, 460);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function getPlaceholder(kind: "loading" | "error"): THREE.CanvasTexture {
  if (kind === "loading") return (_phLoading ??= makePlaceholder("loading"));
  return (_phError ??= makePlaceholder("error"));
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
  ctx.fillStyle = "#808080";
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
    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone - 1}, 0.24)`;
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
  ctx.fillStyle = "#808080";
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
  ctx.fillStyle = "#161514";
  ctx.fillRect(0, 0, width, height);

  // Subtle border bevel
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Brand accent bar on left edge
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 24, height);

  // Artwork Title
  ctx.fillStyle = "#F5F3EF";
  ctx.font = "bold 44px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title.toUpperCase(), 56, 88, width - 80);

  // Artist & details subtitle
  ctx.fillStyle = "#B8B5AF";
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
    () => new THREE.MeshStandardMaterial({ color: "#985136", roughness: 0.82 }),
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
        <meshStandardMaterial color="#302820" roughness={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.405, 0.028, 8, 32]} />
        <meshStandardMaterial color="#B16B49" roughness={0.7} />
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
            <meshStandardMaterial color="#292724" roughness={0.32} metalness={0.15} />
          </mesh>
        ))}
        {[-9, -6, -3, 0, 3, 6, 9].map((z) => (
          <mesh key={`floor-joint-z-${z}`} position={[0, 0, z]}>
            <boxGeometry args={[W, 0.006, 0.018]} />
            <meshStandardMaterial color="#292724" roughness={0.32} metalness={0.15} />
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
                color="#FFF9EF"
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
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Swivel head */}
      <group ref={headRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 0.16, 16]} />
          <meshStandardMaterial color="#181818" roughness={0.35} metalness={0.65} />
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
  const [hovered, setHovered] = useState(false);
  const targetRef = useRef<THREE.Object3D>(null);
  const spotRef = useRef<THREE.SpotLight>(null);

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
    else if (entry.status === "error") tex = getPlaceholder("error");
    else tex = getPlaceholder("loading");
    mat.map = tex;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
  }, [mat, entry.status, entry.texture]);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
      targetRef.current.updateMatrixWorld();
    }
  }, []);

  const label = [art.artist, art.year, art.medium].filter(Boolean).join(" · ");
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
          color={hovered ? "#C96D6D" : palette.matteColor}
          roughness={0.75}
          emissive={hovered ? "#9F0D12" : "#000000"}
          emissiveIntensity={hovered ? 0.25 : 0}
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
        color="#FFF4E5"
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

// First-Person Player Controller
function Player({
  zoneTarget,
  onZoneReached,
  setKeysActive,
}: {
  zoneTarget: number | null;
  onZoneReached: () => void;
  setKeysActive: (k: Record<string, boolean>) => void;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());

  // Initial view mirrors the reference: a diagonal sightline across the near wall,
  // long white side wall, and charcoal floor.
  useEffect(() => {
    camera.position.set(-5.8, 1.65, 7.5);
    camera.lookAt(3.2, 1.7, -3.8);
  }, [camera]);

  useEffect(() => {
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
  }, [setKeysActive]);

  // When a zone is chosen, smoothly place the camera directly facing that zone's artworks
  useEffect(() => {
    if (zoneTarget == null) return;
    const vp = ZONE_VIEWPOINTS[zoneTarget];
    if (vp) {
      camera.position.set(...vp.pos);
      camera.lookAt(...vp.lookAt);
    }
    onZoneReached();
  }, [zoneTarget, camera, onZoneReached]);

  useFrame((_, delta) => {
    const speed = 4.2;
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.current["w"] || keys.current["arrowup"]) dir.add(fwd);
    if (keys.current["s"] || keys.current["arrowdown"]) dir.sub(fwd);
    if (keys.current["d"] || keys.current["arrowright"]) dir.add(right);
    if (keys.current["a"] || keys.current["arrowleft"]) dir.sub(right);

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
  zoneTarget,
  onZoneReached,
  onSelectArtwork,
  onKeysChange,
  onLoadProgress,
}: {
  artworks: Artwork[];
  zoneTarget: number | null;
  onZoneReached: () => void;
  onSelectArtwork: (a: Artwork) => void;
  onKeysChange?: (keys: Record<string, boolean>) => void;
  onLoadProgress?: (loaded: number, total: number, errors: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const palette = MUSEUM_PALETTE;
  const isDark = theme === "dark";
  const [locked, setLocked] = useState(false);
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
          zoneTarget={zoneTarget}
          onZoneReached={onZoneReached}
          setKeysActive={(k) => onKeysChange?.(k)}
        />

        <PointerLockControls
          selector="#virtual-museum-viewport"
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>

      {!locked && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(circle at center, rgba(7,10,13,0.3), rgba(7,10,13,0.65))"
              : "radial-gradient(circle at center, rgba(245,242,238,0.2), rgba(245,242,238,0.5))",
          }}
        >
          <div
            className="px-6 py-5 text-center w-[min(360px,88%)] backdrop-blur-md shadow-2xl"
            style={{
              background: isDark ? "rgba(7,10,13,0.8)" : "rgba(245,242,238,0.88)",
              border: isDark
                ? "1px solid rgba(245,242,238,0.14)"
                : "1px solid rgba(17,17,17,0.12)",
              borderLeft: "2px solid #9F0D12",
            }}
          >
            <p
              className="font-label-caps text-[10px] tracking-[0.35em] mb-2"
              style={{ color: "#9F0D12" }}
            >
              {t("IMMERSIVE MODE")}
            </p>
            <p
              className="font-headline-sm text-base md:text-lg uppercase tracking-wider mb-3"
              style={{ color: isDark ? "#F5F2EE" : "#111111" }}
            >
              {t("Click to enter the museum")}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-label-caps tracking-wider">
              {["WASD · MOVE", "MOUSE · LOOK", "ESC · EXIT"].map((ctrl) => (
                <span
                  key={ctrl}
                  className="px-2 py-1 border"
                  style={{
                    color: isDark ? "#D9D2CC" : "#4B5560",
                    borderColor: isDark ? "rgba(245,242,238,0.15)" : "rgba(17,17,17,0.15)",
                    background: isDark ? "rgba(245,242,238,0.04)" : "rgba(17,17,17,0.03)",
                  }}
                >
                  {t(ctrl)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
