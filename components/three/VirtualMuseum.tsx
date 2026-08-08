"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "@/lib/theme";

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

export const ZONE_POSITIONS: Record<number, [number, number, number]> = {
  1: [0, 1.65, 8],
  2: [-6, 1.65, 0],
  3: [6, 1.65, 0],
  4: [0, 1.65, -8],
};

const ROOM = { w: 20, h: 6, d: 24 };

type TexStatus = "loading" | "ready" | "error";
type TexEntry = { status: TexStatus; texture?: THREE.Texture };

type Palette = {
  wall: string;
  wallAccent: string;
  wallShadow: string;
  floor: string;
  ceiling: string;
  bg: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  hemi: number;
  hemiSky: string;
  hemiGround: string;
  directional: number;
  directionalColor: string;
  spot: number;
  wallWash: number;
  exposure: number;
  frame: string;
  matte: string;
  plaque: string;
  plaqueOpacity: number;
  labelPrimary: string;
  labelSecondary: string;
  accent: string;
  titleColor: string;
  skylight: string;
  baseboard: string;
  trim: string;
};

const LIGHT_PALETTE: Palette = {
  wall: "#EDE7DD",
  wallAccent: "#E2D9CB",
  wallShadow: "#8A7E6E",
  floor: "#3B322A",
  ceiling: "#1E1A16",
  bg: "#1A1613",
  fogNear: 18,
  fogFar: 55,
  ambient: 0.28,
  hemi: 0.35,
  hemiSky: "#FFF3DD",
  hemiGround: "#2A231C",
  directional: 0.35,
  directionalColor: "#FFE9C4",
  spot: 3.4,
  wallWash: 0.6,
  exposure: 1.05,
  frame: "#0A0806",
  matte: "#F5F0E6",
  plaque: "#0F0C09",
  plaqueOpacity: 0.85,
  labelPrimary: "#F5F0E6",
  labelSecondary: "#B8AC98",
  accent: "#9F0D12",
  titleColor: "#E6D2B5",
  skylight: "#FFEAC2",
  baseboard: "#0F0C09",
  trim: "#1A1613",
};


// Module-level cached placeholder textures (NU-ART red brush motif on ivory)
let _phLoading: THREE.CanvasTexture | null = null;
let _phError: THREE.CanvasTexture | null = null;
let _plasterTex: THREE.CanvasTexture | null = null;

function makePlaceholder(kind: "loading" | "error"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ede5db";
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "rgba(155,140,120,0.10)");
  g.addColorStop(1, "rgba(200,190,175,0.05)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#9F0D12";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(96, 180);
  ctx.bezierCurveTo(200, 120, 320, 260, 420, 200);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(110, 320);
  ctx.bezierCurveTo(220, 380, 340, 260, 410, 340);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#1a1613";
  ctx.font = "600 22px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(kind === "error" ? "IMAGE UNAVAILABLE" : "LOADING…", 256, 476);
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

// Subtle plaster noise texture (grayscale, tiles)
function getPlasterTexture(): THREE.CanvasTexture {
  if (_plasterTex) return _plasterTex;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 24;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.anisotropy = 4;
  _plasterTex = tex;
  return tex;
}

function Walls({ p }: { p: Palette }) {
  const plaster = useMemo(() => getPlasterTexture(), []);
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.wall,
        roughness: 0.96,
        metalness: 0,
        roughnessMap: plaster,
      }),
    [p.wall, plaster],
  );
  const wallAccentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.wallAccent, roughness: 0.95 }),
    [p.wallAccent],
  );
  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.floor, roughness: 0.82, metalness: 0.08 }),
    [p.floor],
  );
  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.ceiling, roughness: 1 }),
    [p.ceiling],
  );
  const baseboardMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.baseboard, roughness: 0.7 }),
    [p.baseboard],
  );
  const trimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.trim, roughness: 0.7 }),
    [p.trim],
  );
  const seamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: p.wallShadow, toneMapped: false, transparent: true, opacity: 0.55 }),
    [p.wallShadow],
  );

  const W = ROOM.w;
  const H = ROOM.h;
  const D = ROOM.d;

  // Wall factory with panels + baseboard + top trim
  const Wall = ({
    position,
    rotation,
    length,
    accent = false,
  }: {
    position: [number, number, number];
    rotation: [number, number, number];
    length: number;
    accent?: boolean;
  }) => {
    const mat = accent ? wallAccentMat : wallMat;
    // seam positions (every ~length/3)
    const seams = [-length / 6, length / 6];
    return (
      <group position={position} rotation={rotation}>
        <mesh material={mat} receiveShadow>
          <planeGeometry args={[length, H]} />
        </mesh>
        {/* baseboard */}
        <mesh position={[0, -H / 2 + 0.09, 0.02]} material={baseboardMat}>
          <boxGeometry args={[length, 0.18, 0.04]} />
        </mesh>
        {/* top trim */}
        <mesh position={[0, H / 2 - 0.06, 0.015]} material={trimMat}>
          <boxGeometry args={[length, 0.06, 0.03]} />
        </mesh>
        {/* vertical seams */}
        {seams.map((x, i) => (
          <mesh key={i} position={[x, 0, 0.011]} material={seamMat}>
            <planeGeometry args={[0.012, H - 0.3]} />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group>
      {/* Polished floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Soft reflective sheen strip down the center of the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[W * 0.55, D]} />
        <meshBasicMaterial color={p.skylight} transparent opacity={0.045} toneMapped={false} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} material={ceilMat}>
        <planeGeometry args={[W, D]} />
      </mesh>

      {/* Ceiling track rails (two long rails along the room) */}
      {[-W / 2 + 3.5, W / 2 - 3.5].map((x) => (
        <mesh key={`rail-${x}`} position={[x, H - 0.08, 0]}>
          <boxGeometry args={[0.06, 0.06, D - 1]} />
          <meshStandardMaterial color="#0A0806" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Center ceiling beam */}
      <mesh position={[0, H - 0.06, 0]}>
        <boxGeometry args={[0.12, 0.12, D - 1]} />
        <meshStandardMaterial color="#0A0806" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Back wall — hero feature wall */}
      <Wall position={[0, H / 2, -D / 2]} rotation={[0, 0, 0]} length={W} />
      {/* Front wall */}
      <Wall position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} length={W} />
      {/* Left wall (accent) */}
      <Wall position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} length={D} accent />
      {/* Right wall (accent) */}
      <Wall position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} length={D} accent />

      {/* Central bench (museum viewing bench, not a plinth) */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.08, 0.55]} />
        <meshStandardMaterial color="#1A1613" roughness={0.4} metalness={0.15} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={`leg-${x}`} position={[x, 0.09, 0]} castShadow>
          <boxGeometry args={[0.06, 0.18, 0.5]} />
          <meshStandardMaterial color="#0A0806" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Visible ceiling-mounted spot can (visual prop only; light is emitted by ArtworkFrame's spotLight)
function CeilingCan({
  position,
  aim,
  color,
}: {
  position: [number, number, number];
  aim: [number, number, number];
  color: string;
}) {
  const canRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (canRef.current) canRef.current.lookAt(new THREE.Vector3(...aim));
  }, [aim]);
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.18, 8]} />
        <meshStandardMaterial color="#0A0806" roughness={0.5} metalness={0.6} />
      </mesh>
      <group ref={canRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.085, 0.2, 16]} />
          <meshStandardMaterial color="#050608" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <circleGeometry args={[0.05, 20]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}




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

  // Artwork image material: lighting-independent, stable, no shadow interaction,
  // polygonOffset pulls it toward camera to eliminate z-fighting with backing plane.
  const mat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: false,
      opacity: 1,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: true,
    });
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
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

  const label = `${art.artist}${art.year ? ` · ${art.year}` : ""}${art.medium ? ` · ${art.medium}` : ""}`;
  const plaqueW = Math.max(1.6, art.width * 0.9);

  // Depth layering (local +Z = into the room, away from the wall):
  //   wall surface        : z = 0
  //   outer frame box     : z ∈ [0.00, 0.05]  (depth 0.05, centered at 0.025)
  //   inner matte plane   : z = 0.055
  //   artwork image plane : z = 0.085  (+ polygonOffset)
  //   plaque group        : z = 0.06
  const ceilingLocalY = ROOM.h - 0.2 - art.position[1];
  return (
    <group position={art.position} rotation={[0, art.rotationY, 0]}>
      {/* Ceiling-mounted spot fixture (visual) above the artwork */}
      <CeilingCan
        position={[0, ceilingLocalY, 1.4]}
        aim={[0, 0, 0.1]}
        color={palette.skylight}
      />

      {/* Outer frame */}
      <mesh position={[0, 0, 0.025]} castShadow receiveShadow>
        <boxGeometry args={[art.width + 0.22, art.height + 0.22, 0.05]} />
        <meshStandardMaterial color={palette.frame} roughness={0.55} metalness={0.1} />
      </mesh>
      {/* Inner matte (backing) — sits clearly in front of the frame face */}
      <mesh position={[0, 0, 0.055]} receiveShadow>
        <planeGeometry args={[art.width + 0.06, art.height + 0.06]} />
        <meshStandardMaterial
          color={hovered ? "#C96D6D" : palette.matte}
          roughness={0.65}
          emissive={hovered ? "#9F0D12" : "#000000"}
          emissiveIntensity={hovered ? 0.2 : 0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {/* Artwork image plane — clearly in front, no shadows, no lighting dependence */}
      <mesh
        position={[0, 0, 0.085]}
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

      {/* Label plaque — separated below the frame, forward of the wall */}
      <group position={[0, -art.height / 2 - 0.36, 0.06]}>
        <mesh>
          <planeGeometry args={[plaqueW, 0.38]} />
          <meshBasicMaterial color={palette.plaque} transparent opacity={palette.plaqueOpacity} toneMapped={false} />
        </mesh>
        <mesh position={[-plaqueW / 2 + 0.02, 0, 0.005]}>
          <planeGeometry args={[0.03, 0.38]} />
          <meshBasicMaterial color={palette.accent} toneMapped={false} />
        </mesh>
        <Text
          position={[-plaqueW / 2 + 0.1, 0.08, 0.008]}
          fontSize={0.1}
          color={palette.labelPrimary}
          anchorX="left"
          anchorY="middle"
          maxWidth={plaqueW - 0.15}
        >
          {art.title.toUpperCase()}
        </Text>
        <Text
          position={[-plaqueW / 2 + 0.1, -0.08, 0.008]}
          fontSize={0.058}
          color={palette.labelSecondary}
          anchorX="left"
          anchorY="middle"
          maxWidth={plaqueW - 0.15}
        >
          {label}
        </Text>
      </group>

      <object3D ref={targetRef} position={[0, 0, 0.085]} />
      {/* Focused warm LED spot from the ceiling track toward the artwork */}
      <spotLight
        ref={spotRef}
        position={[0, ROOM.h - 0.2 - art.position[1], 1.4]}
        angle={0.32}
        penumbra={0.9}
        intensity={hovered ? palette.spot * 1.35 : palette.spot}
        distance={9}
        decay={1.25}
        color={palette.skylight}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0005}
      />
      {/* Subtle volumetric-feel light cone */}
      <mesh
        position={[0, (ROOM.h - 0.2 - art.position[1]) / 2, 0.8]}
        rotation={[0, 0, 0]}
      >
        <coneGeometry args={[0.9, ROOM.h - 0.2 - art.position[1], 24, 1, true]} />
        <meshBasicMaterial
          color={palette.skylight}
          transparent
          opacity={hovered ? 0.08 : 0.045}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Warm wall-glow halo behind the frame */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[art.width * 2.4, art.height * 2.2]} />
        <meshBasicMaterial
          color={palette.skylight}
          transparent
          opacity={hovered ? 0.13 : 0.08}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

    </group>
  );
}

function WallWash({ palette }: { palette: Palette }) {
  // Soft wall washes on the two long side walls to sculpt depth
  const c = palette.hemiSky;
  const i = palette.wallWash;
  return (
    <>
      <pointLight position={[-ROOM.w / 2 + 1, ROOM.h - 0.6, -6]} intensity={i} distance={12} color={c} decay={2} />
      <pointLight position={[-ROOM.w / 2 + 1, ROOM.h - 0.6, 6]} intensity={i} distance={12} color={c} decay={2} />
      <pointLight position={[ROOM.w / 2 - 1, ROOM.h - 0.6, -6]} intensity={i} distance={12} color={c} decay={2} />
      <pointLight position={[ROOM.w / 2 - 1, ROOM.h - 0.6, 6]} intensity={i} distance={12} color={c} decay={2} />
      <pointLight position={[0, ROOM.h - 0.6, -ROOM.d / 2 + 1]} intensity={i * 0.9} distance={12} color={c} decay={2} />
      <pointLight position={[0, ROOM.h - 0.6, ROOM.d / 2 - 1]} intensity={i * 0.9} distance={12} color={c} decay={2} />
    </>
  );
}

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

  useEffect(() => {
    camera.position.set(0, 1.65, 10);
    camera.lookAt(0, 1.65, 0);
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

  useEffect(() => {
    if (zoneTarget == null) return;
    const [x, y, z] = ZONE_POSITIONS[zoneTarget];
    camera.position.set(x, y, z);
    camera.lookAt(0, 1.65, 0);
    onZoneReached();
  }, [zoneTarget, camera, onZoneReached]);

  useFrame((_, delta) => {
    const speed = 4;
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
      velocity.current.multiplyScalar(0.8);
    }
    camera.position.add(velocity.current);
    const m = 0.6;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM.w / 2 + m, ROOM.w / 2 - m);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM.d / 2 + m, ROOM.d / 2 - m);
    camera.position.y = 1.65;
  });

  return null;
}

function SceneRig({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl, exposure]);
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
  // The 3D gallery keeps a single, always-well-lit look regardless of the
  // site's light/dark toggle — switching the site to dark mode shouldn't
  // plunge the museum interior into near-black walls/lighting.
  const palette = LIGHT_PALETTE;
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
        camera={{ fov: 70, near: 0.1, far: 100, position: [0, 1.65, 10] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >

        <SceneRig exposure={palette.exposure} />
        <color attach="background" args={[palette.bg]} />
        <fog attach="fog" args={[palette.bg, palette.fogNear, palette.fogFar]} />
        <ambientLight intensity={palette.ambient} />
        <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemi]} />
        <directionalLight
          position={[4, 12, 6]}
          intensity={palette.directional}
          color={palette.directionalColor}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
        <WallWash palette={palette} />
        <Walls p={palette} />
        {artworks.map((a) => (
          <ArtworkFrame
            key={a.id}
            art={a}
            entry={entries[a.id] ?? { status: "loading" }}
            palette={palette}
            onSelect={onSelectArtwork}
          />
        ))}
        <Text
          position={[0, 3.2, -ROOM.d / 2 + 0.05]}
          fontSize={0.3}
          color={palette.titleColor}
          anchorX="center"
          letterSpacing={0.1}
        >
          THE VIRTUAL MUSEUM
        </Text>
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
              ? "radial-gradient(circle at center, rgba(7,10,13,0.25), rgba(7,10,13,0.6))"
              : "radial-gradient(circle at center, rgba(245,242,238,0.15), rgba(245,242,238,0.45))",
          }}
        >
          <div
            className="px-6 py-5 text-center w-[min(360px,88%)] backdrop-blur-md shadow-2xl"
            style={{
              background: isDark ? "rgba(7,10,13,0.76)" : "rgba(245,242,238,0.86)",
              border: isDark
                ? "1px solid rgba(245,242,238,0.12)"
                : "1px solid rgba(17,17,17,0.12)",
              borderLeft: "2px solid #9F0D12",
            }}
          >
            <p
              className="font-label-caps text-[10px] tracking-[0.35em] mb-2"
              style={{ color: "#9F0D12" }}
            >
              IMMERSIVE MODE
            </p>
            <p
              className="font-headline-sm text-base md:text-lg uppercase tracking-wider mb-3"
              style={{ color: isDark ? "#F5F2EE" : "#111111" }}
            >
              Click to enter the museum
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-label-caps tracking-wider">
              {["WASD · MOVE", "MOUSE · LOOK", "ESC · EXIT"].map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 border"
                  style={{
                    color: isDark ? "#D9D2CC" : "#4B5560",
                    borderColor: isDark ? "rgba(245,242,238,0.15)" : "rgba(17,17,17,0.15)",
                    background: isDark ? "rgba(245,242,238,0.04)" : "rgba(17,17,17,0.03)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
