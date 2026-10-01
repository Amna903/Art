"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, MeshReflectorMaterial, PointerLockControls } from "@react-three/drei";
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
  wall: "#F4F3F0",
  wallPlaster: "#E9E8E4",
  floor: "#171819",
  ceiling: "#090A0B",
  skylightEmissive: "#FFFDF9",
  bg: "#161514",
  ambientIntensity: 0.65,
  hemiSky: "#FFFDF8",
  hemiGround: "#5C564E",
  hemiIntensity: 0.75,
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
    const n = 128 + (Math.random() - 0.5) * 20;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
  }
  ctx.putImageData(img, 0, 0);

  // Large, very low-contrast trowel passes avoid a tiled digital-noise look.
  for (let i = 0; i < 90; i++) {
    const tone = Math.random() > 0.5 ? 145 : 108;
    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, 0.035)`;
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

// Low-sheen charcoal concrete — the polished dark floor from the reference gallery.
function getFloorTexture(): THREE.CanvasTexture {
  if (_floorTex) return _floorTex;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1A1B1C";
  ctx.fillRect(0, 0, size, size);

  // Fine concrete variation, kept intentionally subtle so it reflects the artwork light.
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.2 + 0.3;
    const tone = Math.random() > 0.5 ? 28 : 38;
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone + 1})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 12);
  tex.anisotropy = 8;
  _floorTex = tex;
  return tex;
}

// Architectural museum gallery pavilion
function GalleryArchitecture({ p }: { p: Palette }) {
  const plasterTexture = useMemo(() => getPlasterTexture(), []);
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.wall,
        roughness: 0.9,
        metalness: 0,
        bumpMap: plasterTexture,
        bumpScale: 0.045,
        roughnessMap: plasterTexture,
      }),
    [p.wall, plasterTexture],
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
          color={p.floor}
          resolution={512}
          blur={[350, 110]}
          mixBlur={1}
          mixStrength={1.45}
          mirror={0.48}
          roughness={0.28}
          metalness={0.7}
          depthScale={0.35}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.4}
        />
      </mesh>

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

      {/* Freestanding return wall creates the second room beyond the entrance. */}
      <mesh position={[-3.7, H / 2, 3.4]} receiveShadow material={wallMat}>
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

      {/* Deep indigo drapery marks the passage into the next gallery wing. */}
      <group position={[-2.7, H / 2, -D / 2 + 0.03]}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={`curtain-fold-${i}`} position={[-0.72 + i * 0.13, 0, 0.012]}>
            <boxGeometry args={[0.1, H - 1.0, 0.06]} />
            <meshStandardMaterial color={i % 2 ? "#10264D" : "#071A3B"} roughness={0.82} />
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

  // Ceiling track position relative to this artwork
  const ceilingY = ROOM.h - 0.15 - art.position[1];

  return (
    <group position={art.position} rotation={[0, art.rotationY, 0]}>
      {/* Ceiling Track Spotlight Can */}
      <TrackLightFixture
        trackPos={[0, ceilingY, 2.2]}
        targetPos={[0, 0, 0]}
        color={palette.spotColor}
      />

      {/* Target object for the spotlight */}
      <object3D ref={targetRef} position={[0, 0, 0.04]} />

      {/* Dedicated spotlight from the ceiling track */}
      <spotLight
        ref={spotRef}
        position={[0, ceilingY, 2.2]}
        angle={0.38}
        penumbra={0.7}
        intensity={hovered ? palette.spotIntensity * 1.3 : palette.spotIntensity}
        distance={9.5}
        decay={1.3}
        color={palette.spotColor}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0004}
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
        {/* Brand accent red bar */}
        <mesh position={[-plaqueW / 2 + 0.015, 0, 0.019]}>
          <boxGeometry args={[0.025, 0.24, 0.004]} />
          <meshBasicMaterial color={palette.accent} toneMapped={false} />
        </mesh>
        {/* DOM labels avoid a remote font fetch that could suspend the WebGL scene. */}
        <Html position={[0, 0, 0.022]} transform distanceFactor={7} style={{ pointerEvents: "none" }}>
          <div
            style={{ width: `${Math.max(112, plaqueW * 118)}px`, transform: "translate(-50%, -50%)", fontFamily: "system-ui, sans-serif" }}
          >
            <p style={{ color: palette.labelPrimary, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {art.title.toUpperCase()}
            </p>
            <p style={{ color: palette.labelSecondary, fontSize: "7px", letterSpacing: "0.04em", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {label}
            </p>
          </div>
        </Html>
      </group>
    </group>
  );
}

// Ambient Perimeter Wall Washes
function PerimeterWallWash({ palette }: { palette: Palette }) {
  const c = palette.hemiSky;
  const intensity = 0.45;
  const y = ROOM.h - 0.6;
  return (
    <>
      <pointLight position={[-ROOM.w / 2 + 2, y, -6]} intensity={intensity} distance={14} color={c} decay={2} />
      <pointLight position={[-ROOM.w / 2 + 2, y, 6]} intensity={intensity} distance={14} color={c} decay={2} />
      <pointLight position={[ROOM.w / 2 - 2, y, -6]} intensity={intensity} distance={14} color={c} decay={2} />
      <pointLight position={[ROOM.w / 2 - 2, y, 6]} intensity={intensity} distance={14} color={c} decay={2} />
      <pointLight position={[0, y, -ROOM.d / 2 + 2]} intensity={intensity * 0.9} distance={14} color={c} decay={2} />
      <pointLight position={[0, y, ROOM.d / 2 - 2]} intensity={intensity * 0.9} distance={14} color={c} decay={2} />
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
  // long white side wall, dark floor, and curtain beyond.
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
    camera.position.add(velocity.current);

    // Keep camera safely inside gallery walls
    const mx = 1.2;
    const mz = 1.4;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM.w / 2 + mx, ROOM.w / 2 - mx);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM.d / 2 + mz, ROOM.d / 2 - mz);
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

        <PerimeterWallWash palette={palette} />
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

        <Html position={[0, 4.2, -ROOM.d / 2 + 0.04]} transform sprite distanceFactor={10} style={{ pointerEvents: "none" }}>
          <p
            style={{ color: "#3A3632", fontFamily: "system-ui, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", margin: 0, transform: "translate(-50%, -50%)", whiteSpace: "nowrap" }}
          >
            NUA-ARTE VIRTUAL MUSEUM
          </p>
        </Html>

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
