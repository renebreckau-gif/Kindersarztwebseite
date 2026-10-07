"use client";

// Real-time Growing Mobile (React Three Fiber). Loaded lazily, only on capable
// devices, after the utility content has rendered. Renders on demand: once the
// spring system has settled no frames are drawn until the next interaction.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { layout, targetPose, VIEW, ROD, AGE_STOP_Y, type Pose, type V2 } from "./mobile-geometry";
import { ELEMENT_COLORS, HIGHLIGHT, STRUCTURE, type Palette } from "./mobile-poster";
import type { PathId } from "./fixtures";

interface Props {
  selected: PathId | null;
  highlight: PathId | null;
  palette: Palette;
  onSelect: (id: PathId) => void;
  onReady: () => void;
}

const KEYS = ["t1", "t2", "t3", "yaw", "inst"] as const;
type Key = (typeof KEYS)[number];
const STIFF: Record<Key, [number, number]> = {
  t1: [11, 1.9],
  t2: [13, 2.1],
  t3: [15, 2.3],
  yaw: [6, 1.6],
  inst: [9, 6],
};

function Camera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / VIEW.w;
    cam.position.set(VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h / 2, 10);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

const UP = new THREE.Vector3(0, 1, 0);
function placeRod(m: THREE.Mesh | null, a: V2, b: V2) {
  if (!m) return;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.max(Math.hypot(dx, dy), 1e-4);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, 0));
}

function Mobile({ selected, highlight, palette, onSelect }: Omit<Props, "onReady">) {
  const { invalidate, gl } = useThree();
  const pose = useRef<Pose>({ t1: 0, t2: 0, t3: 0, yaw: 0, inst: 0 });
  const vel = useRef<Record<Key, number>>({ t1: 0.07, t2: -0.09, t3: 0.11, yaw: 0.16, inst: 0 }); // one calm entry sway
  const pointerYaw = useRef(0);
  const target = useRef<Pose>(targetPose(selected));

  const yawGroup = useRef<THREE.Group>(null);
  const lines = useRef<(THREE.Mesh | null)[]>([]);
  const elements = useRef<Record<string, THREE.Mesh | null>>({});
  const beamTicks = useRef<(THREE.Mesh | null)[]>([]);
  const pivots = useRef<(THREE.Mesh | null)[]>([]);
  // Anodized structure: dark, satin, slightly metallic (docs/design/3d-language.md)
  const structureMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: STRUCTURE[palette], roughness: palette === "material" ? 0.42 : 0.35, metalness: palette === "material" ? 0.7 : 0.55, transparent: true }),
    [palette],
  );
  const rodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: STRUCTURE[palette], roughness: 0.35, metalness: 0.55, transparent: true, opacity: 0 }),
    [palette],
  );
  const lineGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 10), []);
  const L0 = layout(pose.current);
  const lineCount = L0.wires.length + L0.beams.length;

  const geos = useMemo(
    () => ({
      disc: new THREE.CylinderGeometry(0.4, 0.4, 0.07, 64).rotateX(Math.PI / 2),
      sphere: new THREE.SphereGeometry(0.33, 48, 32),
      capsule: new THREE.CapsuleGeometry(0.165, 0.33, 10, 32),
      ring: new THREE.TorusGeometry(0.234, 0.066, 24, 72),
    }),
    [],
  );
  const BASE = { disc: 0.4, sphere: 0.33, capsule: 0.3, ring: 0.3 };

  const mats = useMemo(() => {
    const m: Record<string, THREE.MeshStandardMaterial> = {};
    // Material direction: coral soft-touch polymer, yellow satin, cobalt enamel (clearcoat), warm ceramic.
    const MATERIAL: Record<string, Partial<THREE.MeshPhysicalMaterialParameters>> = {
      heute: { roughness: 0.78, metalness: 0, sheen: 0.4, sheenRoughness: 0.8 },
      "mein-kind": { roughness: 0.5, metalness: 0 },
      praxis: { roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 },
      entdecken: { roughness: 0.38, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 },
    };
    for (const [id, c] of Object.entries(ELEMENT_COLORS[palette])) {
      m[id] =
        palette === "material"
          ? new THREE.MeshPhysicalMaterial({ color: c, ...MATERIAL[id] })
          : new THREE.MeshStandardMaterial({ color: c, roughness: palette === "ink" ? 0.4 : 0.62, metalness: palette === "ink" ? 0.35 : 0.04 });
    }
    return m;
  }, [palette]);

  // Retarget + small kick when the selection changes.
  useEffect(() => {
    target.current = targetPose(selected);
    vel.current.yaw += 0.12;
    invalidate();
  }, [selected, invalidate]);

  useEffect(() => {
    for (const [id, m] of Object.entries(mats)) {
      m.color.set(palette === "ink" && highlight === id ? HIGHLIGHT : ELEMENT_COLORS[palette][id as PathId]);
    }
    invalidate();
  }, [highlight, mats, palette, invalidate]);

  // Pointer: fine pointers sway the object slightly; touch drags add yaw.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (fine && e.pointerType === "mouse") {
        pointerYaw.current = ((e.clientX / window.innerWidth) * 2 - 1) * 0.22;
        invalidate();
      }
    };
    const el = gl.domElement;
    let lastX: number | null = null;
    const onDown = (e: PointerEvent) => (lastX = e.clientX);
    const onDrag = (e: PointerEvent) => {
      if (lastX === null || e.pointerType === "mouse") return;
      vel.current.yaw += (e.clientX - lastX) * 0.01;
      lastX = e.clientX;
      invalidate();
    };
    const onUp = () => (lastX = null);
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    let energy = 0;
    const tgt = { ...target.current, yaw: target.current.yaw + pointerYaw.current };
    for (const k of KEYS) {
      const [kS, c] = STIFF[k];
      const x = pose.current[k];
      const v = vel.current[k] + (kS * (tgt[k] - x) - c * vel.current[k]) * dt;
      vel.current[k] = v;
      pose.current[k] = x + v * dt;
      energy += Math.abs(v) + Math.abs(tgt[k] - x);
    }

    const p = pose.current;
    const L = layout(p);
    if (yawGroup.current) yawGroup.current.rotation.y = p.yaw * (1 - p.inst);

    const segs = [...L.wires, ...L.beams];
    segs.forEach(([a, b], i) => {
      const m = lines.current[i];
      placeRod(m, a, b);
      if (m) m.scale.x = m.scale.z = i < L.wires.length ? 0.008 : 0.016;
    });
    // graduation on the main beam: the mobile is also a scale
    const [a0, b0] = L.beams[0];
    beamTicks.current.forEach((m, i) => {
      if (!m) return;
      const t = 0.08 + i * 0.084;
      const x = a0[0] + (b0[0] - a0[0]) * t;
      const y = a0[1] + (b0[1] - a0[1]) * t;
      const len = i % 5 === 0 ? 0.11 : 0.06;
      placeRod(m, [x, y], [x, y - len]);
      m.scale.x = m.scale.z = 0.006;
    });
    L.pivots.forEach((pv, i) => pivots.current[i]?.position.set(pv[0], pv[1], 0));
    structureMat.opacity = 1 - p.inst;
    structureMat.visible = p.inst < 0.99;
    rodMat.opacity = p.inst;
    rodMat.visible = p.inst > 0.01;

    for (const e of L.elements) {
      const m = elements.current[e.id];
      if (!m) continue;
      m.position.set(e.pos[0], e.pos[1], 0);
      const s = e.size / BASE[e.shape];
      m.scale.setScalar(s);
      // elements keep facing the viewer slightly less than the structure turns
      m.rotation.y = -p.yaw * 0.35;
    }

    if (energy > 2e-4) state.invalidate();
  });

  const L = layout(pose.current);
  const ticks = Array.from({ length: 18 }, (_, i) => ROD.y0 + 0.2 + (i * (ROD.y1 - ROD.y0 - 0.4)) / 17);

  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 5, 6]} intensity={2.2} />
      <directionalLight position={[4, -2, 3]} intensity={0.6} />
      <group ref={yawGroup} position={[L.hook[0], 0, 0]}>
        <group position={[-L.hook[0], 0, 0]}>
          {Array.from({ length: lineCount }, (_, i) => (
            <mesh key={i} ref={(m) => void (lines.current[i] = m)} geometry={lineGeo} material={structureMat} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <mesh key={`t${i}`} ref={(m) => void (beamTicks.current[i] = m)} geometry={lineGeo} material={structureMat} />
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={`p${i}`} ref={(m) => void (pivots.current[i] = m)} material={structureMat}>
              <sphereGeometry args={[0.04, 16, 12]} />
            </mesh>
          ))}
          <mesh position={[L.hook[0], L.hook[1], 0]} material={structureMat}>
            <torusGeometry args={[0.06, 0.012, 8, 32]} />
          </mesh>
          {L.elements.map((e) => (
            <mesh
              key={e.id}
              ref={(m) => void (elements.current[e.id] = m)}
              geometry={geos[e.shape]}
              material={mats[e.id]}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(e.id);
              }}
            />
          ))}
        </group>
      </group>
      {/* measuring rod for the instrument mode */}
      <mesh geometry={lineGeo} material={rodMat} position={[ROD.x, (ROD.y0 + ROD.y1) / 2, 0]} scale={[0.018, ROD.y1 - ROD.y0, 0.018]} />
      {ticks.map((y, i) => {
        const major = [0, 3, 7, 13].includes(i);
        const len = major ? 0.16 : 0.08;
        return (
          <mesh key={i} geometry={lineGeo} material={rodMat} position={[ROD.x - len / 2, y, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.006, len, 0.006]} />
        );
      })}
      {AGE_STOP_Y.map((y) => (
        <mesh key={y} material={rodMat} position={[ROD.x, y, 0]}>
          <sphereGeometry args={[0.035, 16, 12]} />
        </mesh>
      ))}
    </>
  );
}

export default function MobileScene({ onReady, ...rest }: Props) {
  return (
    <Canvas
      orthographic
      flat
      frameloop="demand"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 10], near: 0.1, far: 50 }}
      onCreated={() => requestAnimationFrame(onReady)}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <Camera />
      <Mobile {...rest} />
    </Canvas>
  );
}
