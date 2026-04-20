import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useProgress,
  Html,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import Floor from "./Floor";

// ═══════════════════════════════════════════════════════════════
// NATURAL STANDING POSE — confirmed Index [2]
// ═══════════════════════════════════════════════════════════════

const STAND = {
  Hips:          { x: -0.3229, y: 0.0480,  z: 0.0667  },
  Spine02:       { x: 0.3553,  y: -0.0621, z: -0.0521 },
  Spine01:       { x: 0.0,     y: 0.0,     z: 0.0     },
  Spine:         { x: -0.0855, y: 0.0239,  z: -0.0232 },

  RightShoulder: { x: 0.0,  y: 0.5,  z: 3.14  },
  LeftShoulder:  { x: 0.0,  y: -0.5, z: -3.14 },

  RightArm:      { x: 0.0, y: 0.0, z: -0.5 },
  LeftArm:       { x: 0.0, y: 0.0, z: 0.5  },

  RightForeArm:  { x: 0.0, y: 0.0, z: 0.0 },
  RightHand:     { x: 0.0, y: 0.0, z: 0.0 },
  LeftForeArm:   { x: 0.0, y: 0.0, z: 0.0 },
  LeftHand:      { x: 0.0, y: 0.0, z: 0.0 },

  neck:          { x: 0.0832, y: -0.0148, z: 0.0178 },
  Head:          { x: 0.3715, y: 0.0009,  z: 0.0050 },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function lerp(a, b, t) { return a + (b - a) * t; }

function deepCloneGLTF(sourceScene) {
  const clone       = sourceScene.clone(true);
  const sourceBones = [];
  const cloneBones  = [];

  sourceScene.traverse((n) => { if (n.isBone) sourceBones.push(n); });
  clone.traverse((n)       => { if (n.isBone) cloneBones.push(n); });

  clone.traverse((node) => {
    if (node.isSkinnedMesh && node.skeleton) {
      const newBones = node.skeleton.bones.map((b) => {
        const idx = sourceBones.indexOf(b);
        return idx >= 0 ? cloneBones[idx] : b;
      });
      node.skeleton = new THREE.Skeleton(
        newBones,
        node.skeleton.boneInverses
      );
      node.bind(node.skeleton, node.bindMatrix);
    }
  });

  return clone;
}

function allBoneNames() {
  return Object.keys(STAND);
}

function SP(name, axis) {
  return STAND[name]?.[axis] ?? 0;
}

// ═══════════════════════════════════════════════════════════════
// LOADER
// ═══════════════════════════════════════════════════════════════

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        color: "white",
        background: "rgba(5,5,20,0.97)",
        padding: "36px 52px",
        borderRadius: "20px",
        textAlign: "center",
        minWidth: "240px",
        border: "1px solid rgba(0,245,255,0.3)",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ fontSize: "44px", marginBottom: "18px" }}>⚔️</div>
        <div style={{
          fontSize: "14px",
          marginBottom: "14px",
          color: "#94a3b8",
        }}>
          Loading Battle Arena
        </div>
        <div style={{
          width: "100%", height: "6px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "3px", overflow: "hidden", marginBottom: "10px",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: "linear-gradient(90deg,#00f5ff,#b400ff,#ff00e5)",
            borderRadius: "3px", transition: "width 0.3s ease",
          }} />
        </div>
        <div style={{
          color: "#00f5ff", fontWeight: "700", fontSize: "20px",
          textShadow: "0 0 12px rgba(0,245,255,0.6)",
        }}>
          {Math.round(progress)}%
        </div>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════════════════════
// HUMAN MODEL — no bones, subtle breathing
// ═══════════════════════════════════════════════════════════════

function HumanModel({ animation }) {
  const { scene } = useGLTF("/models/human.glb");
  const ref       = useRef();
  const posY      = useRef(0);
  const [obj, setObj] = useState(null);

  useEffect(() => {
    if (!scene) return;
    const clone = scene.clone(true);
    clone.position.set(0, 1, 0);
    clone.rotation.y = Math.PI / 2;
    clone.traverse((c) => {
      if (c.isMesh) {
        c.castShadow    = true;
        c.receiveShadow = true;
        c.frustumCulled = false;
        if (c.material) {
          const ms = Array.isArray(c.material) ? c.material : [c.material];
          ms.forEach((m) => {
            m.side        = THREE.DoubleSide;
            m.transparent = false;
            m.opacity     = 1;
            m.needsUpdate = true;
          });
        }
      }
    });
    setObj(clone);
  }, [scene]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const target = animation === "speaking"  ? Math.sin(t * 2.8) * 0.015
                 : animation === "listening" ? Math.sin(t * 0.8) * 0.005
                 :                             Math.sin(t * 1.2) * 0.008;
    posY.current = lerp(posY.current, target, 0.06);
    ref.current.position.y = posY.current;
  });

  if (!obj) return null;
  return (
    <group ref={ref} position={[-2.5, 0, 0]}>
      <primitive object={obj} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROBOT MODEL — with both-hand gestures
//
// IDLE:      natural standing (Index [2] confirmed)
// SPEAKING:  both hands wave like explaining
// LISTENING: head tilts to side
// ═══════════════════════════════════════════════════════════════

function RobotModel({ animation }) {
  const { scene } = useGLTF("/models/robot.glb");
  const groupRef  = useRef();
  const bonesRef  = useRef({});
  const readyRef  = useRef(false);
  const [visible, setVisible] = useState(false);

  // Init lerp state from standing pose
  const stateRef = useRef(null);
  if (!stateRef.current) {
    const s = { posY: 0 };
    allBoneNames().forEach((name) => {
      s[`${name}_x`] = SP(name, "x");
      s[`${name}_y`] = SP(name, "y");
      s[`${name}_z`] = SP(name, "z");
    });
    stateRef.current = s;
  }

  useEffect(() => {
    if (!scene || !groupRef.current) return;

    console.log("🤖 Loading robot...");

    const clone = deepCloneGLTF(scene);

    // Fix all materials
    clone.traverse((node) => {
      node.visible       = true;
      node.frustumCulled = false;

      if (node.isMesh || node.isSkinnedMesh) {
        node.castShadow    = true;
        node.receiveShadow = true;

        if (node.material) {
          const mats = Array.isArray(node.material)
            ? node.material
            : [node.material];
          mats.forEach((m) => {
            m.side        = THREE.DoubleSide;
            m.transparent = false;
            m.opacity     = 1.0;
            m.depthWrite  = true;
            m.depthTest   = true;
            m.visible     = true;
            m.needsUpdate = true;
          });
        }
      }
    });

    // Collect bones
    const boneMap = {};
    clone.traverse((n) => {
      if (n.isBone) boneMap[n.name] = n;
    });
    bonesRef.current = boneMap;

    // Apply standing pose immediately
    allBoneNames().forEach((name) => {
      const bone = boneMap[name];
      if (bone) {
        bone.rotation.x = SP(name, "x");
        bone.rotation.y = SP(name, "y");
        bone.rotation.z = SP(name, "z");
      }
    });

    // Scale and position
    const sc = 2.0 / 1.85;
    clone.scale.setScalar(sc);
    clone.position.set(0, 0, 0);
    clone.rotation.y = -Math.PI / 2; // face left toward human

    // Add to group
    groupRef.current.add(clone);
    readyRef.current = true;
    setVisible(true);
    console.log("🤖 Robot ready!");
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current || !readyRef.current) return;

    const t     = state.clock.getElapsedTime();
    const bones = bonesRef.current;
    const s     = stateRef.current;
    const spd   = 0.05; // smooth lerp speed

    // ── Build target pose ──

    let T = {};

    switch (animation) {

      // ──────────────────────────────────────────────
      case "speaking": {
  /*
   * REALISTIC HUMAN EXPLAINING GESTURE
   *
   * Phase system — one hand at a time:
   *
   * 0.0s - 2.0s: Right hand comes forward, gestures
   * 2.0s - 2.5s: Right hand returns, Left starts
   * 2.5s - 4.5s: Left hand comes forward, gestures
   * 4.5s - 5.0s: Left returns, Right starts
   * 5.0s:        Cycle repeats
   *
   * The "resting" hand stays slightly raised (ready position)
   * not completely at side — like a real person
   *
   * Elbow bends naturally as hand gestures
   * Small wrist rotations for realism
   */

  // 5 second cycle
  const cycle    = t % 5.0;
  const nod      = Math.sin(t * 1.8);

  // ── Calculate how much each arm is "active" (0 to 1) ──
  // rightActive:
  //   0.0 - 0.3s: ramp up (0 → 1)
  //   0.3 - 1.8s: fully active (1)
  //   1.8 - 2.3s: ramp down (1 → 0)
  //   2.3 - 5.0s: resting (0)
  let rightActive = 0;
  if (cycle < 0.3) {
    rightActive = cycle / 0.3;                    // ramp up
  } else if (cycle < 1.8) {
    rightActive = 1.0;                            // full gesture
  } else if (cycle < 2.3) {
    rightActive = 1.0 - (cycle - 1.8) / 0.5;     // ramp down
  } else {
    rightActive = 0;                              // resting
  }

  // leftActive:
  //   0.0 - 2.3s: resting (0)
  //   2.3 - 2.6s: ramp up (0 → 1)
  //   2.6 - 4.3s: fully active (1)
  //   4.3 - 4.8s: ramp down (1 → 0)
  //   4.8 - 5.0s: resting (0)
  let leftActive = 0;
  if (cycle < 2.3) {
    leftActive = 0;                               // resting
  } else if (cycle < 2.6) {
    leftActive = (cycle - 2.3) / 0.3;             // ramp up
  } else if (cycle < 4.3) {
    leftActive = 1.0;                             // full gesture
  } else if (cycle < 4.8) {
    leftActive = 1.0 - (cycle - 4.3) / 0.5;      // ramp down
  } else {
    leftActive = 0;                               // resting
  }

  // Small wave when hand is active
  const gestureWave = Math.sin(t * 3.5);   // faster small wave during gesture
  const wristWave   = Math.sin(t * 4.0);   // wrist micro-movement

  // Start all at standing pose
  allBoneNames().forEach((name) => {
    T[`${name}_x`] = SP(name, "x");
    T[`${name}_y`] = SP(name, "y");
    T[`${name}_z`] = SP(name, "z");
  });

  // ══════════════════════════════════════════════════
  // RIGHT ARM
  // ══════════════════════════════════════════════════

  // Shoulder opens based on activity
  T.RightShoulder_z = SP("RightShoulder", "z") - 0.12 * rightActive;

  // Upper arm — moves toward human when active
  T.RightArm_y = SP("RightArm", "y") - 0.55 * rightActive;
  T.RightArm_z = SP("RightArm", "z") - 0.2 * rightActive;
  T.RightArm_x = SP("RightArm", "x") - 0.12 * rightActive;

  // Forearm — elbow bends when active + small wave
  const rElbow = 0.5 * rightActive + gestureWave * 0.15 * rightActive;
  T.RightForeArm_x = SP("RightForeArm", "x") + rElbow;
  T.RightForeArm_y = SP("RightForeArm", "y") + gestureWave * 0.2 * rightActive;
  T.RightForeArm_z = SP("RightForeArm", "z") + gestureWave * 0.08 * rightActive;

  // Hand — small wrist rotation when active
  T.RightHand_x = SP("RightHand", "x") + wristWave * 0.08 * rightActive;
  T.RightHand_y = SP("RightHand", "y") + wristWave * 0.06 * rightActive;
  T.RightHand_z = SP("RightHand", "z") + gestureWave * 0.04 * rightActive;

  // ══════════════════════════════════════════════════
  // LEFT ARM
  // ══════════════════════════════════════════════════

  // Shoulder opens based on activity
  T.LeftShoulder_z = SP("LeftShoulder", "z") + 0.12 * leftActive;

  // Upper arm — moves toward human when active
  T.LeftArm_y = SP("LeftArm", "y") + 0.55 * leftActive;
  T.LeftArm_z = SP("LeftArm", "z") + 0.2 * leftActive;
  T.LeftArm_x = SP("LeftArm", "x") - 0.12 * leftActive;

  // Forearm — elbow bends when active + small wave
  const lElbow = 0.5 * leftActive + gestureWave * 0.15 * leftActive;
  T.LeftForeArm_x = SP("LeftForeArm", "x") + lElbow;
  T.LeftForeArm_y = SP("LeftForeArm", "y") + gestureWave * 0.2 * leftActive;
  T.LeftForeArm_z = SP("LeftForeArm", "z") + gestureWave * 0.08 * leftActive;

  // Hand — small wrist rotation when active
  T.LeftHand_x = SP("LeftHand", "x") + wristWave * 0.08 * leftActive;
  T.LeftHand_y = SP("LeftHand", "y") + wristWave * 0.06 * leftActive;
  T.LeftHand_z = SP("LeftHand", "z") + gestureWave * 0.04 * leftActive;

  // ══════════════════════════════════════════════════
  // HEAD — nods, slightly looks toward active hand
  // ══════════════════════════════════════════════════

  // Head turns slightly toward whichever hand is active
  const headTurn = (rightActive - leftActive) * 0.06;

  T.Head_x = SP("Head", "x") - 0.05 + nod * 0.04;
  T.Head_y = SP("Head", "y") + nod * 0.03 + headTurn;
  T.Head_z = SP("Head", "z") + headTurn * 0.3;
  T.neck_x = SP("neck", "x") + nod * 0.02;
  T.neck_y = SP("neck", "y") + headTurn * 0.5;

  T.posY = Math.sin(t * 1.5) * 0.008;
  break;
}
      // ──────────────────────────────────────────────
      case "listening": {
        /*
         * LISTENING — standing pose + head tilt
         * Arms stay at sides, head tilts = "I'm paying attention"
         */
        allBoneNames().forEach((name) => {
          T[`${name}_x`] = SP(name, "x");
          T[`${name}_y`] = SP(name, "y");
          T[`${name}_z`] = SP(name, "z");
        });

        // Head tilts to side — attentive look
        T.Head_x = SP("Head", "x") + 0.04;
        T.Head_y = SP("Head", "y") + 0.12 + Math.sin(t * 0.5) * 0.02;
        T.neck_y = SP("neck", "y") + 0.06;

        T.posY = Math.sin(t * 0.8) * 0.005;
        break;
      }

      // ──────────────────────────────────────────────
      default: { // idle
        /*
         * IDLE — exact standing pose
         * Only head moves very slowly = alive feeling
         * Arms and body completely still
         */
        allBoneNames().forEach((name) => {
          T[`${name}_x`] = SP(name, "x");
          T[`${name}_y`] = SP(name, "y");
          T[`${name}_z`] = SP(name, "z");
        });

        // Very slow head look-around
        T.Head_y = SP("Head", "y") + Math.sin(t * 0.35) * 0.05;
        T.neck_y = SP("neck", "y") + Math.sin(t * 0.35) * 0.02;

        T.posY = Math.sin(t * 1.0) * 0.007;
        break;
      }
    }

    // ── Smooth lerp all values toward targets ──
    Object.keys(T).forEach((key) => {
      if (key === "posY") return;
      s[key] = lerp(s[key] ?? T[key], T[key], spd);
    });
    s.posY = lerp(s.posY ?? 0, T.posY ?? 0, spd);

    // ── Apply to group ──
    groupRef.current.position.y = s.posY;
    groupRef.current.rotation.set(0, 0, 0);

    // ── Apply to all bones ──
    allBoneNames().forEach((name) => {
      const bone = bones[name];
      if (!bone) return;
      bone.rotation.x = s[`${name}_x`] ?? SP(name, "x");
      bone.rotation.y = s[`${name}_y`] ?? SP(name, "y");
      bone.rotation.z = s[`${name}_z`] ?? SP(name, "z");
    });
  });

  return (
    <group ref={groupRef} position={[2.5, 0, 0]}>
      {/* Placeholder while loading */}
      {!visible && (
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.4]} />
          <meshBasicMaterial color="#ff00e5" wireframe />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRELOAD
// ═══════════════════════════════════════════════════════════════

useGLTF.preload("/models/human.glb");
useGLTF.preload("/models/robot.glb");

// ═══════════════════════════════════════════════════════════════
// MAIN SCENE
// ═══════════════════════════════════════════════════════════════

export default function Scene3D({ humanAnimation, robotAnimation }) {
  return (
    <Canvas
      shadows
      camera={{
        position: [0, 2.2, 8],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        toneMappingExposure: 1.3,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* ── Ambient ── */}
      <ambientLight intensity={0.8} color="#ffffff" />

      {/* ── Main overhead ── */}
      <directionalLight
        position={[0, 10, 5]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.001}
        color="#ffffff"
      />

      {/* ── Front fill ── */}
      <directionalLight
        position={[0, 3, 12]}
        intensity={1.5}
        color="#ffffff"
      />

      {/* ── Blue on human ── */}
      <spotLight
        position={[-5, 7, 5]}
        angle={0.5}
        penumbra={0.8}
        intensity={5}
        color="#3b82f6"
      />

      {/* ── Pink on robot ── */}
      <spotLight
        position={[5, 7, 5]}
        angle={0.5}
        penumbra={0.8}
        intensity={5}
        color="#ec4899"
      />

      {/* ── Character fills ── */}
      <pointLight position={[2.5, 1, 3]}  intensity={2} color="#ffffff" />
      <pointLight position={[-2.5, 1, 3]} intensity={2} color="#ffffff" />
      <pointLight position={[0, 2.5, 6]}  intensity={1} color="#ffffff" />

      {/* ── Speaking glow ── */}
      {humanAnimation === "speaking" && (
        <pointLight
          position={[-2.5, 1.5, 1.5]}
          intensity={3}
          color="#00f5ff"
          distance={4}
        />
      )}
      {robotAnimation === "speaking" && (
        <pointLight
          position={[2.5, 1.5, 1.5]}
          intensity={3}
          color="#ff00e5"
          distance={4}
        />
      )}

      {/* ── Floor ── */}
      <Floor />

      {/* ── Shadows ── */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.5}
        scale={16}
        blur={3}
        far={5}
        color="#000018"
      />

      {/* ── Characters ── */}
      <Suspense fallback={<Loader />}>
        <HumanModel animation={humanAnimation} />
        <RobotModel animation={robotAnimation} />
      </Suspense>

      {/* ── Camera ── */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 7}
        maxAzimuthAngle={Math.PI / 7}
        dampingFactor={0.06}
        enableDamping
        target={[0, 1.0, 0]}
      />

      {/* ── Reflections ── */}
      <Environment preset="studio" />
    </Canvas>
  );
}