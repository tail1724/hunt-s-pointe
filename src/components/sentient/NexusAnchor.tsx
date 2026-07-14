import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BiomorphicNucleus } from "./BiomorphicNucleus";

type NexusMode = "presence";
type NexusState = "idle" | "listening" | "processing" | "conflict";

type VisualStyle = "tesseract" | "biomorphic";

interface NexusAnchorProps {
  mode?: NexusMode;
  state: NexusState;
  audioLevel?: number;
  size?: number;
  visualStyle?: VisualStyle;
}

// ── Tesseract geometry (legacy) ──
function createTesseractGeometry() {
  const inner = 0.4;
  const outer = 0.8;
  const vertices: number[] = [];
  const cubeVerts = (s: number) => {
    const v: [number, number, number][] = [];
    for (let x = -1; x <= 1; x += 2)
      for (let y = -1; y <= 1; y += 2)
        for (let z = -1; z <= 1; z += 2)
          v.push([x * s, y * s, z * s]);
    return v;
  };
  const cubeEdges = (verts: [number, number, number][]) => {
    const edges: [number, number][] = [];
    for (let i = 0; i < verts.length; i++)
      for (let j = i + 1; j < verts.length; j++) {
        let diff = 0;
        for (let k = 0; k < 3; k++) if (verts[i][k] !== verts[j][k]) diff++;
        if (diff === 1) edges.push([i, j]);
      }
    return edges;
  };
  const innerVerts = cubeVerts(inner);
  const outerVerts = cubeVerts(outer);
  for (const [a, b] of cubeEdges(innerVerts)) vertices.push(...innerVerts[a], ...innerVerts[b]);
  for (const [a, b] of cubeEdges(outerVerts)) vertices.push(...outerVerts[a], ...outerVerts[b]);
  for (let i = 0; i < 8; i++) vertices.push(...innerVerts[i], ...outerVerts[i]);
  return new Float32Array(vertices);
}

const MODE_COLORS = {
  presence: { idle: new THREE.Color("hsl(210, 80%, 60%)"), active: new THREE.Color("hsl(40, 100%, 60%)") },
};

function TesseractMesh({ state, audioLevel = 0 }: Omit<NexusAnchorProps, "size" | "visualStyle" | "mode">) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const targetColor = useRef(new THREE.Color());
  const currentColor = useRef(new THREE.Color());
  const positions = useMemo(() => createTesseractGeometry(), []);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((_, delta) => {
    if (!lineRef.current || !materialRef.current) return;
    const mesh = lineRef.current;
    const mat = materialRef.current;
    const colors = MODE_COLORS.presence;
    targetColor.current.copy(state === "idle" ? colors.idle : colors.active);
    currentColor.current.lerp(targetColor.current, delta * 3);
    mat.color.copy(currentColor.current);
    const targetScale = state === "listening" ? 1 + audioLevel * 0.4 : 1;
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    if (state === "processing") { mesh.rotation.x += delta * 1.5; mesh.rotation.y += delta * 1.2; mesh.rotation.z += delta * 0.8; }
    else { mesh.rotation.x += delta * 0.15; mesh.rotation.y += delta * 0.1; }
    mat.opacity = 0.7 + Math.sin(Date.now() * 0.002) * 0.3;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial ref={materialRef} transparent opacity={0.7} linewidth={1} />
    </lineSegments>
  );
}

function FallbackPulse() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-8 h-8 rounded-full bg-primary/30" />
    </div>
  );
}

export function NexusAnchor({ state, audioLevel = 0, size = 120, visualStyle = "biomorphic" }: NexusAnchorProps) {
  if (visualStyle === "biomorphic") {
    return <BiomorphicNucleus state={state} audioLevel={audioLevel} size={size} />;
  }

  return (
    <div style={{ width: size, height: size }} className="relative">
      <Suspense fallback={<FallbackPulse />}>
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
          <ambientLight intensity={0.5} />
          <TesseractMesh state={state} audioLevel={audioLevel} />
        </Canvas>
      </Suspense>
    </div>
  );
}

export type { NexusMode, NexusState, VisualStyle };
