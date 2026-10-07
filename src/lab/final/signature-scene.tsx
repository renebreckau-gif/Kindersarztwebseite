"use client";

// Signature Growing Mobile — real-time layer (Phase 06, approved reference).
// Procedural geometry only (no model files): one sweeping brass arc on a single
// pivot, fine threads, a cobalt glass sphere (focal element), coral and yellow
// half-discs, a pale translucent ring. Shares its geometry with the SVG poster
// so the swap is seamless. Renders on demand: no frames once springs settle.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { arcPoints, CEILING_Y, PIVOT, SAGE_STOP_Y, SROD, SVIEW, sigLayout, sigTarget, type SigPose, type V2 } from "./signature-geometry";
import { SIGNATURE } from "./signature-poster";
import type { PathId } from "../fixtures";

interface Props {
  selected: PathId | null;
  onSelect: (id: PathId) => void;
  onReady: () => void;
}

const KEYS = ["theta", "yaw", "inst", "lift"] as const;
type Key = (typeof KEYS)[number];
// Heavy, well-damped springs: a slow, weighted settle — no bounce, no dangling.
const STIFF: Record<Key, [number, number]> = {
  theta: [7, 3.1],
  yaw: [5, 2.6],
  inst: [8, 5.6],
  lift: [10, 5.2],
};

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
function placeRod(m: THREE.Object3D | null, a: V2, b: V2, radius: number) {
  if (!m) return;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.max(Math.hypot(dx, dy), 1e-4);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0);
  m.scale.set(radius, len, radius);
  m.quaternion.setFromUnitVectors(UP, tmp.set(dx / len, dy / len, 0));
}

function Camera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / SVIEW.w;
    cam.position.set(SVIEW.x + SVIEW.w / 2, SVIEW.y + SVIEW.h / 2, 10);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

/** Soft room reflections so brass and glass read as real materials. */
function Environment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}

function halfDisc(r: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-r, 0);
  shape.absarc(0, 0, r, Math.PI, Math.PI * 2, false);
  shape.lineTo(-r, 0);
  const depth = 0.05;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.018, bevelSegments: 6, curveSegments: 56 });
  g.translate(0, 0, -depth / 2);
  return g;
}

const BASE = 0.3; // element geometries are built at this size and scaled per pose

function Mobile({ selected, onSelect }: Omit<Props, "onReady">) {
  const { invalidate, gl } = useThree();
  const pose = useRef<SigPose>({ theta: 0, yaw: 0, inst: 0, lift: 0 });
  // one calm entry settle: the arc arrives slightly off balance and comes to rest
  const vel = useRef<Record<Key, number>>({ theta: 0.05, yaw: 0.08, inst: 0, lift: 0 });
  const pointerYaw = useRef(0);
  const target = useRef<SigPose>(sigTarget(selected));
  const sel = useRef<PathId | null>(selected);

  const mats = useMemo(
    () => ({
      brass: new THREE.MeshStandardMaterial({ color: SIGNATURE.brass, metalness: 0.95, roughness: 0.26, transparent: true }),
      thread: new THREE.MeshStandardMaterial({ color: SIGNATURE.brassDark, metalness: 0.6, roughness: 0.5, transparent: true }),
      rod: new THREE.MeshStandardMaterial({ color: SIGNATURE.brass, metalness: 0.95, roughness: 0.26, transparent: true, opacity: 0 }),
      coral: new THREE.MeshPhysicalMaterial({ color: SIGNATURE.coral, roughness: 0.62, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffd8c8") }),
      yellow: new THREE.MeshPhysicalMaterial({ color: SIGNATURE.yellow, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#0f1f9a",
        envMapIntensity: 0.6,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 1,
      }),
      ring: new THREE.MeshPhysicalMaterial({ color: SIGNATURE.ring, roughness: 0.16, clearcoat: 1, transparent: true, opacity: 0.8, iridescence: 0.4, iridescenceIOR: 1.3 }),
    }),
    [],
  );
  const geo = useMemo(() => {
    const local = arcPoints(0, 64).map(([x, y]) => new THREE.Vector3(x - PIVOT[0], y - PIVOT[1], 0));
    return {
      arc: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(local), 160, 0.021, 16, false),
      rod: new THREE.CylinderGeometry(1, 1, 1, 10),
      ball: new THREE.SphereGeometry(1, 20, 14),
      bearing: new THREE.TorusGeometry(0.045, 0.011, 12, 40),
      sphere: new THREE.SphereGeometry(BASE, 72, 48),
      cap: new THREE.CylinderGeometry(0.045, 0.055, 0.05, 28),
      half: halfDisc(BASE),
      clip: new THREE.BoxGeometry(0.07, 0.05, 0.1),
      ring: new THREE.TorusGeometry(BASE * 0.8, BASE * 0.15, 32, 120),
    };
  }, []);

  const arcGroup = useRef<THREE.Group>(null);
  const yawGroup = useRef<THREE.Group>(null);
  const threads = useRef<(THREE.Mesh | null)[]>([]);
  const knots = useRef<(THREE.Mesh | null)[]>([]);
  const elements = useRef<Record<string, THREE.Group | null>>({});

  useEffect(() => {
    target.current = sigTarget(selected);
    sel.current = selected;
    vel.current.yaw += 0.04;
    invalidate();
  }, [selected, invalidate]);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (fine && e.pointerType === "mouse") {
        pointerYaw.current = ((e.clientX / window.innerWidth) * 2 - 1) * 0.1;
        invalidate();
      }
    };
    const el = gl.domElement;
    let lastX: number | null = null;
    const onDown = (e: PointerEvent) => (lastX = e.clientX);
    const onDrag = (e: PointerEvent) => {
      if (lastX === null || e.pointerType === "mouse") return;
      vel.current.yaw += (e.clientX - lastX) * 0.005;
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
    const L = sigLayout(p, sel.current);
    if (arcGroup.current) arcGroup.current.rotation.z = p.theta;
    if (yawGroup.current) yawGroup.current.rotation.y = p.yaw * (1 - p.inst);

    L.elements.forEach((e, i) => {
      const top: V2 = [e.pos[0], e.shape === "halfdisc" ? e.pos[1] + 0.03 : e.pos[1] + e.size + 0.03];
      placeRod(threads.current[i], e.attach, top, 0.0035);
      knots.current[i]?.position.set(e.attach[0], e.attach[1], 0);
      const g = elements.current[e.id];
      if (!g) return;
      g.position.set(e.pos[0], e.pos[1], 0);
      g.scale.setScalar(e.size / BASE);
      // each element turns gently on its thread, opposite to the arc's yaw
      g.rotation.y = -p.yaw * 0.6 + (e.shape === "halfdisc" ? 0.35 : 0);
    });
    const struct = 1 - p.inst;
    mats.brass.opacity = struct;
    mats.brass.visible = struct > 0.01;
    mats.thread.opacity = struct;
    mats.thread.visible = struct > 0.01;
    mats.rod.opacity = p.inst;
    mats.rod.visible = p.inst > 0.01;
    if (energy > 2e-4) state.invalidate();
  });

  const L = sigLayout(pose.current, selected);
  const rodTicks = Array.from({ length: 21 }, (_, i) => SROD.y0 + 0.16 + (i * (SROD.y1 - SROD.y0 - 0.32)) / 20);
  const click = (id: PathId) => (ev: { stopPropagation: () => void }) => {
    ev.stopPropagation();
    onSelect(id);
  };
  const el = (id: PathId) => (g: THREE.Group | null) => void (elements.current[id] = g);

  return (
    <>
      <hemisphereLight args={["#fff2df", "#d9bea4", 0.6]} />
      {/* low warm sun from the arched window (upper right), matching the CSS light */}
      <directionalLight position={[5, 4, 6]} intensity={2.6} color="#ffe7c8" />
      <directionalLight position={[-5, 1, 3]} intensity={0.5} color="#dfe3ff" />

      <group ref={yawGroup} position={[PIVOT[0], 0, 0]}>
        <group position={[-PIVOT[0], 0, 0]}>
          {/* ceiling line + pivot */}
          <mesh geometry={geo.rod} material={mats.thread} position={[PIVOT[0], (CEILING_Y + PIVOT[1]) / 2, 0]} scale={[0.004, CEILING_Y - PIVOT[1], 0.004]} />
          <mesh geometry={geo.bearing} material={mats.brass} position={[PIVOT[0], PIVOT[1], 0]} />
          <group ref={arcGroup} position={[PIVOT[0], PIVOT[1], 0]}>
            <mesh geometry={geo.arc} material={mats.brass} />
            {(() => {
              const end = arcPoints(0, 1)[1];
              return <mesh geometry={geo.ball} material={mats.brass} position={[end[0] - PIVOT[0], end[1] - PIVOT[1], 0]} scale={0.04} />;
            })()}
          </group>
          {L.elements.map((e, i) => (
            <group key={e.id}>
              <mesh ref={(m) => void (threads.current[i] = m)} geometry={geo.rod} material={mats.thread} />
              <mesh ref={(m) => void (knots.current[i] = m)} geometry={geo.ball} material={mats.brass} scale={0.022} />
            </group>
          ))}

          {/* Praxis — cobalt glass sphere with a brass cap (focal element) */}
          <group ref={el("praxis")} onClick={click("praxis")}>
            <mesh geometry={geo.sphere} material={mats.glass} />
            <mesh geometry={geo.cap} material={mats.brass} position={[0, BASE + 0.012, 0]} />
          </group>
          {/* Heute — coral half-disc, soft-touch */}
          <group ref={el("heute")} onClick={click("heute")}>
            <mesh geometry={geo.half} material={mats.coral} />
            <mesh geometry={geo.clip} material={mats.brass} position={[0, 0.012, 0]} />
          </group>
          {/* Mein Kind — muted yellow half-disc */}
          <group ref={el("mein-kind")} onClick={click("mein-kind")}>
            <mesh geometry={geo.half} material={mats.yellow} />
            <mesh geometry={geo.clip} material={mats.brass} position={[0, 0.012, 0]} />
          </group>
          {/* Entdecken — pale translucent ring */}
          <group ref={el("entdecken")} onClick={click("entdecken")}>
            <mesh geometry={geo.ring} material={mats.ring} />
          </group>
        </group>
      </group>

      {/* measuring rod for Mein Kind */}
      <mesh geometry={geo.rod} material={mats.rod} position={[SROD.x, (SROD.y0 + SROD.y1) / 2, 0]} scale={[0.015, SROD.y1 - SROD.y0, 0.015]} />
      {rodTicks.map((y, i) => {
        const len = i % 5 === 0 ? 0.15 : 0.07;
        return <mesh key={i} geometry={geo.rod} material={mats.rod} position={[SROD.x - len / 2, y, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.005, len, 0.005]} />;
      })}
      {SAGE_STOP_Y.map((y) => (
        <mesh key={y} geometry={geo.ball} material={mats.rod} position={[SROD.x, y, 0]} scale={0.036} />
      ))}
    </>
  );
}

export default function SignatureScene({ onReady, ...rest }: Props) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping }}
      camera={{ position: [0, 0, 10], near: 0.1, far: 50 }}
      onCreated={() => requestAnimationFrame(onReady)}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <Camera />
      <Environment />
      <Mobile {...rest} />
    </Canvas>
  );
}
