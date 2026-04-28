/* eslint-disable react/no-unknown-property */
import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Html, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// TIMELINE — 112 seconds
// ═══════════════════════════════════════════════════════════════

const T = {
  TITLE_IN: 0.5, TOPIC_IN: 2.5, TITLE_OUT: 6,
  H_ENTER: 8, H_WALK_END: 24,
  H_IDLE: 24, H_IDLE_END: 30,
  R_ENTER: 30, R_WALK_END: 46,
  R_IDLE: 46, R_IDLE_END: 52,
  BOTH: 52,
  ROUND_1_H: 52, ROUND_1_R: 58,
  ROUND_2_H: 64, ROUND_2_R: 70,
  ROUND_3_H: 76,
  CHARGE_START: 82, CHARGE_END: 86,
  FACE_OFF: 86, ATTACK_START: 88, ATTACK_END: 91,
  TURN_AWAY: 91, TURN_DONE: 92,
  WALK_BACK: 92, WALK_BACK_END: 97,
  TURN_FACE: 97, TURN_FACE_DONE: 98,
  ROBOT_TAUNT: 98, HUMAN_CONF: 101,
  TITLE_CARD: 104, FADE: 108, END: 112,
};

const DURATION = T.END;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function lerp(a, b, t) { return a + (b - a) * Math.min(Math.max(t, 0), 1); }
function prog(s, e, t)  { return Math.min(Math.max((t - s) / (e - s), 0), 1); }
function smoothstep(a, b, t) {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
}
function easeOut(p) { return 1 - Math.pow(1 - p, 2); }

function stripRootMotion(anims) {
  if (!anims?.length) return anims;
  return anims.map((clip) => {
    const tracks = clip.tracks.filter((t) => !t.name.includes(".position"));
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  });
}

function deepClone(src) {
  const clone = src.clone(true);
  const sb = [], cb = [];
  src.traverse((n) => { if (n.isBone) sb.push(n); });
  clone.traverse((n) => { if (n.isBone) cb.push(n); });
  clone.traverse((node) => {
    if (node.isSkinnedMesh && node.skeleton) {
      const nb = node.skeleton.bones.map((b) => {
        const i = sb.indexOf(b);
        return i >= 0 ? cb[i] : b;
      });
      node.skeleton = new THREE.Skeleton(nb, node.skeleton.boneInverses);
      node.bind(node.skeleton, node.bindMatrix);
    }
  });
  return clone;
}


// ═══════════════════════════════════════════════════════════════
// MODEL INSTANCE
// ═══════════════════════════════════════════════════════════════

function ModelInstance({ path, faceRight, visible, flipFace }) {
  const gltf     = useGLTF(path);
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const builtRef = useRef(false);

  useEffect(() => {
    if (builtRef.current || !gltf?.scene || !groupRef.current) return;
    builtRef.current = true;

    try {
      const model = deepClone(gltf.scene);
      model.updateWorldMatrix(true, true);

      model.traverse((node) => {
        node.visible = true;
        node.frustumCulled = false;
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            const ms = Array.isArray(node.material) ? node.material : [node.material];
            ms.forEach((m) => {
              m.side = THREE.DoubleSide;
              m.transparent = false;
              m.opacity = 1;
              m.needsUpdate = true;
            });
          }
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const sz = new THREE.Vector3();
      box.getSize(sz);
      model.scale.setScalar(2 / (sz.y || 1));

      model.updateWorldMatrix(true, true);
      const box2 = new THREE.Box3().setFromObject(model);
      const ctr = new THREE.Vector3();
      box2.getCenter(ctr);
      model.position.y = -box2.min.y;
      model.position.x = -ctr.x;
      model.position.z = -ctr.z;

      model.rotation.y = faceRight ? Math.PI / 2 : -Math.PI / 2;

      modelRef.current = model;
      groupRef.current.add(model);

      if (gltf.animations?.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(model);
        const clean = stripRootMotion(gltf.animations);
        mixerRef.current.clipAction(clean[0]).play();
      }
    } catch (e) {
      console.error("Build:", path, e);
    }
    return () => mixerRef.current?.stopAllAction();
  }, [gltf]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.visible = visible;
    if (modelRef.current && flipFace !== undefined) {
      const target = faceRight
        ? (flipFace ? -Math.PI / 2 : Math.PI / 2)
        : (flipFace ? Math.PI / 2 : -Math.PI / 2);
      modelRef.current.rotation.y = lerp(modelRef.current.rotation.y, target, 0.08);
    }
    mixerRef.current?.update(delta);
  });

  return <group ref={groupRef} />;
}
// ═══════════════════════════════════════════════════════════════
// HUMAN STATE
// ═══════════════════════════════════════════════════════════════

function getHumanState(t) {
  if (t < T.H_ENTER) return { model: "none", posX: -20, flip: false };

  if (t < T.H_WALK_END) {
    const p = easeOut(prog(T.H_ENTER, T.H_WALK_END, t));
    return { model: "walk", posX: lerp(-18, -2.5, p), flip: false };
  }

  if (t < T.H_IDLE_END) return { model: "idle", posX: -2.5, flip: false };
  if (t < T.BOTH)       return { model: "idle", posX: -2.5, flip: false };

  // ARGUE
  if (t < T.ROUND_1_R)    return { model: "arguing",   posX: -2.5, flip: false };
  if (t < T.ROUND_2_H)    return { model: "idle",      posX: -2.5, flip: false };
  if (t < T.ROUND_2_R)    return { model: "arguing",   posX: -2.5, flip: false };
  if (t < T.ROUND_3_H)    return { model: "flinch",    posX: -2.5, flip: false };
  if (t < T.CHARGE_START) return { model: "arguing",   posX: -2.5, flip: false };

  // Walk closer
  if (t < T.CHARGE_END) {
    const p = prog(T.CHARGE_START, T.CHARGE_END, t);
    return { model: "walk", posX: lerp(-2.5, -0.4, p), flip: false };
  }

  // Face off
  if (t < T.ATTACK_START) return { model: "idle", posX: -0.4, flip: false };

  // BLOCK
  if (t < T.ATTACK_END) return { model: "block", posX: -0.4, flip: false };

  // Turn away immediately
  if (t < T.TURN_DONE) return { model: "idle", posX: -0.4, flip: true };

  // Walk away facing away
  if (t < T.WALK_BACK_END) {
    const p = prog(T.WALK_BACK, T.WALK_BACK_END, t);
    return { model: "walk", posX: lerp(-0.4, -3.5, p), flip: true };
  }

  // Turn back to face robot
  if (t < T.TURN_FACE_DONE) return { model: "idle", posX: -3.5, flip: false };

  // Confident during dialogue
  if (t < T.TITLE_CARD) return { model: "confident", posX: -3.5, flip: false };

  return { model: "idle", posX: -3.5, flip: false };
}

// ═══════════════════════════════════════════════════════════════
// ROBOT STATE
// ═══════════════════════════════════════════════════════════════

function getRobotState(t) {
  if (t < T.R_ENTER) return { model: "none", posX: 20, flip: false };

  if (t < T.R_WALK_END) {
    const p = easeOut(prog(T.R_ENTER, T.R_WALK_END, t));
    return { model: "walk", posX: lerp(20, 2.5, p), flip: false };
  }

  if (t < T.R_IDLE_END) return { model: "intimidate", posX: 2.5, flip: false };
  if (t < T.BOTH)       return { model: "idle",       posX: 2.5, flip: false };

  // ARGUE
  if (t < T.ROUND_1_R)    return { model: "idle",       posX: 2.5, flip: false };
  if (t < T.ROUND_2_H)    return { model: "arguing",    posX: 2.5, flip: false };
  if (t < T.ROUND_2_R)    return { model: "intimidate", posX: 2.5, flip: false };
  if (t < T.ROUND_3_H)    return { model: "arguing",    posX: 2.5, flip: false };
  if (t < T.CHARGE_START) return { model: "pointing",   posX: 2.5, flip: false };

  // Walk closer
  if (t < T.CHARGE_END) {
    const p = prog(T.CHARGE_START, T.CHARGE_END, t);
    return { model: "walk", posX: lerp(2.5, 0.4, p), flip: false };
  }

  // Face off
  if (t < T.ATTACK_START) return { model: "intimidate", posX: 0.4, flip: false };

  // ATTACK
  if (t < T.ATTACK_END) return { model: "attack", posX: 0.4, flip: false };

  // Turn away immediately
  if (t < T.TURN_DONE) return { model: "idle", posX: 0.4, flip: true };

  // Walk away facing away
  if (t < T.WALK_BACK_END) {
    const p = prog(T.WALK_BACK, T.WALK_BACK_END, t);
    return { model: "walk", posX: lerp(0.4, 3.5, p), flip: true };
  }

  // Turn back to face human
  if (t < T.TURN_FACE_DONE) return { model: "idle", posX: 3.5, flip: false };

  // Taunt
  if (t < T.HUMAN_CONF) return { model: "taunt", posX: 3.5, flip: false };

  // Pointing
  if (t < T.TITLE_CARD) return { model: "pointing", posX: 3.5, flip: false };

  return { model: "idle", posX: 3.5, flip: false };
}

// ═══════════════════════════════════════════════════════════════
// CHARACTERS
// ═══════════════════════════════════════════════════════════════

function HumanCharacter({ elapsed }) {
  const outerRef = useRef();
  const state    = getHumanState(elapsed);
  useFrame(() => { if (outerRef.current) outerRef.current.position.x = state.posX; });

  return (
    <group ref={outerRef}>
      <ModelInstance path="/models/cinematic/human_walk.glb"      faceRight={true} visible={state.model === "walk"}      flipFace={state.flip && state.model === "walk"} />
      <ModelInstance path="/models/cinematic/human_idle.glb"      faceRight={true} visible={state.model === "idle"}      flipFace={state.flip && state.model === "idle"} />
      <ModelInstance path="/models/cinematic/human_arguing.glb"   faceRight={true} visible={state.model === "arguing"}   flipFace={false} />
      <ModelInstance path="/models/cinematic/human_confident.glb" faceRight={true} visible={state.model === "confident"} flipFace={false} />
      <ModelInstance path="/models/cinematic/human_flinch.glb"    faceRight={true} visible={state.model === "flinch"}    flipFace={false} />
      <ModelInstance path="/models/cinematic/human_defend.glb"     faceRight={true} visible={state.model === "block"}     flipFace={false} />
    </group>
  );
}

function RobotCharacter({ elapsed }) {
  const outerRef = useRef();
  const state    = getRobotState(elapsed);
  useFrame(() => { if (outerRef.current) outerRef.current.position.x = state.posX; });

  return (
    <group ref={outerRef}>
      <ModelInstance path="/models/cinematic/robot_walk.glb"       faceRight={false} visible={state.model === "walk"}       flipFace={state.flip && state.model === "walk"} />
      <ModelInstance path="/models/cinematic/robot_idle.glb"       faceRight={false} visible={state.model === "idle"}       flipFace={state.flip && state.model === "idle"} />
      <ModelInstance path="/models/cinematic/robot_arguing.glb"    faceRight={false} visible={state.model === "arguing"}    flipFace={false} />
      <ModelInstance path="/models/cinematic/robot_intimidate.glb" faceRight={false} visible={state.model === "intimidate"} flipFace={false} />
      <ModelInstance path="/models/cinematic/robot_pointing.glb"   faceRight={false} visible={state.model === "pointing"}   flipFace={false} />
      <ModelInstance path="/models/cinematic/robot_taunt.glb"      faceRight={false} visible={state.model === "taunt"}      flipFace={false} />
      <ModelInstance path="/models/cinematic/robot_attack.glb"     faceRight={false} visible={state.model === "attack"}     flipFace={false} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════

function Camera({ elapsed }) {
  const { camera } = useThree();

  useFrame(() => {
    const t = elapsed;
    let px, py, pz, lx, ly, lz;

    // Scene 1: Title
    if (t < T.H_ENTER) {
      const p = prog(0, T.H_ENTER, t);
      px = 0; py = 0.4 + p * 0.8; pz = 20 - p * 5;
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 2a: Human walk — ground tilt up
    else if (t < T.H_WALK_END - 4) {
      const p = prog(T.H_ENTER, T.H_WALK_END - 4, t);
      px = lerp(-8, -3, p);
      py = lerp(0.2, 1.0, p);
      pz = lerp(5.5, 5, p);
      lx = lerp(-15, -4, p);
      ly = lerp(0.3, 1.2, p);
      lz = 0;
    }
    // Scene 2b: Human arriving
    else if (t < T.H_WALK_END) {
      const p = prog(T.H_WALK_END - 4, T.H_WALK_END, t);
      px = lerp(-3, -1.5, p);
      py = lerp(1.0, 1.5, p);
      pz = lerp(5, 4.5, p);
      lx = -2.5; ly = 1.3; lz = 0;
    }
    // Scene 3: Human close-up
    else if (t < T.H_IDLE_END) {
      const p = prog(T.H_IDLE, T.H_IDLE_END, t);
      px = -1.8; py = 1.65; pz = lerp(4.5, 2.5, p);
      lx = -2.5; ly = 1.65; lz = 0;
    }
    // Wide before robot
    else if (t < T.R_ENTER) {
      px = 0; py = 1.5; pz = 14;
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 4a: Robot walk — over shoulder
    else if (t < T.R_WALK_END - 4) {
      const p = prog(T.R_ENTER, T.R_WALK_END - 4, t);
      px = -0.8; py = 1.5; pz = 3.5;
      lx = lerp(18, 4, p); ly = 1.3; lz = 0;
    }
    // Scene 4b: Robot arriving
    else if (t < T.R_WALK_END) {
      const p = prog(T.R_WALK_END - 4, T.R_WALK_END, t);
      px = lerp(-0.8, 0, p); py = 1.5; pz = lerp(3.5, 10, p);
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 5: Robot close-up
    else if (t < T.R_IDLE_END) {
      const p = prog(T.R_IDLE, T.R_IDLE_END, t);
      px = 1.8; py = 1.7; pz = lerp(5, 2.8, p);
      lx = 2.5; ly = 1.65; lz = 0;
    }
    // Scene 6: Argue — alternate close-ups (6s per round)
    else if (t < T.CHARGE_START) {
      const phase = t - T.BOTH;
      const round = Math.floor(phase / 6);
      const isH   = round % 2 === 0;
      const inR   = (phase % 6) / 6;

      if (isH) {
        px = lerp(0, -1.5, inR); py = lerp(1.6, 1.65, inR); pz = lerp(8, 3, inR);
        lx = -2.5; ly = 1.6; lz = 0;
      } else {
        px = lerp(0, 1.5, inR); py = lerp(1.6, 1.7, inR); pz = lerp(8, 3, inR);
        lx = 2.5; ly = 1.6; lz = 0;
      }
    }
    // Scene 7a: Walk closer — side tracking
    else if (t < T.CHARGE_END) {
      const p = prog(T.CHARGE_START, T.CHARGE_END, t);
      px = lerp(4, 2, p); py = lerp(1.2, 1.0, p); pz = lerp(5, 3, p);
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 7b: Face off — dramatic low between them
    else if (t < T.ATTACK_START) {
      const p = prog(T.FACE_OFF, T.ATTACK_START, t);
      px = lerp(2, 0, p); py = lerp(1.0, 0.4, p); pz = lerp(3, 2.5, p);
      lx = 0; ly = 1.5; lz = 0;
    }
    // Scene 7c: ATTACK — side view for punch + block
    else if (t < T.ATTACK_END) {
      const p = prog(T.ATTACK_START, T.ATTACK_END, t);
      px = lerp(0, -1, p); py = lerp(0.4, 1.3, p); pz = lerp(2.5, 2, p);
      lx = 0; ly = 1.2; lz = 0;
      // Shake at impact moment
      if (p > 0.4 && p < 0.8) {
        px += (Math.random() - 0.5) * 0.25;
        py += (Math.random() - 0.5) * 0.15;
      }
    }
    // Scene 8a: Turn away — quick pull back
    else if (t < T.TURN_DONE) {
      const p = prog(T.TURN_AWAY, T.TURN_DONE, t);
      px = 0; py = lerp(1.3, 2.5, p); pz = lerp(2, 8, p);
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 8b: Walk away — overhead crane
    else if (t < T.WALK_BACK_END) {
      const p = prog(T.WALK_BACK, T.WALK_BACK_END, t);
      px = 0; py = lerp(2.5, 3.5, p); pz = lerp(8, 14, p);
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 8c: Turn back
    else if (t < T.TURN_FACE_DONE) {
      px = 0; py = 3; pz = 12;
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 9a: Robot taunt close-up
    else if (t < T.HUMAN_CONF) {
      px = 2; py = 1.7; pz = 3.5;
      lx = 3.5; ly = 1.6; lz = 0;
    }
    // Scene 9b: Human confident close-up
    else if (t < T.TITLE_CARD) {
      px = -2; py = 1.65; pz = 3.5;
      lx = -3.5; ly = 1.6; lz = 0;
    }
    // Scene 10a: Orbit
    else if (t < T.FADE) {
      const p = prog(T.TITLE_CARD, T.FADE, t);
      const ang = p * Math.PI * 0.6;
      px = Math.sin(ang) * 14; py = 3; pz = Math.cos(ang) * 14;
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 10b: Fade
    else {
      const p = prog(T.FADE, T.END, t);
      px = 0; py = 3 + p * 6; pz = 14 + p * 10;
      lx = 0; ly = 1; lz = 0;
    }

    camera.position.set(px, py, pz);
    camera.lookAt(lx, ly, lz);
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════
// LIGHTS
// ═══════════════════════════════════════════════════════════════

function Lights({ elapsed }) {
  const hRef = useRef();
  const rRef = useRef();
  const cRef = useRef();

  useFrame(() => {
    const t = elapsed;
    if (hRef.current)
      hRef.current.intensity = t >= T.H_ENTER
        ? lerp(0, 7, smoothstep(T.H_ENTER, T.H_ENTER + 3, t)) : 0;
    if (rRef.current)
      rRef.current.intensity = t >= T.R_ENTER
        ? lerp(0, 7, smoothstep(T.R_ENTER, T.R_ENTER + 3, t)) : 0;

    if (cRef.current) {
      if (t >= T.ATTACK_START && t < T.ATTACK_END) {
        const p = prog(T.ATTACK_START, T.ATTACK_END, t);
        cRef.current.intensity = p > 0.4 && p < 0.8
          ? 15 + Math.random() * 20 : 3;
      } else if (t >= T.ATTACK_END && t < T.TURN_DONE) {
        const fade = 1 - prog(T.ATTACK_END, T.TURN_DONE, t);
        cRef.current.intensity = fade * 8;
      } else {
        cRef.current.intensity = 0;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} color="#100818" />
      <directionalLight position={[0, 20, 5]} intensity={0.5} color="#aabbff" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-15} shadow-camera-right={15}
        shadow-camera-top={10} shadow-camera-bottom={-10} />
      <spotLight ref={hRef} position={[-3, 14, 4]} angle={0.28} penumbra={0.7} intensity={0} color="#2244ff" />
      <spotLight ref={rRef} position={[3, 14, 4]} angle={0.28} penumbra={0.7} intensity={0} color="#ff4400" />
      <pointLight ref={cRef} position={[0, 2, 0]} intensity={0} color="#ffffff" distance={30} />
      <pointLight position={[-3, 2.2, 3]} intensity={0.6} color="#4466ff" distance={6} />
      <pointLight position={[3, 2.2, 3]} intensity={0.6} color="#ff5511" distance={6} />
      <pointLight position={[-6, 0.1, 0]} intensity={0.4} color="#0022ff" distance={10} />
      <pointLight position={[6, 0.1, 0]} intensity={0.4} color="#ff2200" distance={10} />
      <pointLight position={[0, 0.5, -4]} intensity={0.2} color="#220033" distance={12} />
    </>
  );
}
// ═══════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════

function Dust() {
  const ref = useRef();
  const pos = useRef((() => {
    const a = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      a[i*3]   = (Math.random()-0.5) * 40;
      a[i*3+1] = Math.random() * 7;
      a[i*3+2] = (Math.random()-0.5) * 20;
    }
    return a;
  })());

  useFrame(() => {
    if (!ref.current) return;
    for (let i = 0; i < 150; i++) {
      pos.current[i*3+1] += 0.002;
      if (pos.current[i*3+1] > 7) pos.current[i*3+1] = 0;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={150} array={pos.current} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#7744aa" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function Sparks({ elapsed }) {
  const ref  = useRef();
  const pos  = useRef(new Float32Array(600 * 3));
  const vel  = useRef(new Float32Array(600 * 3));
  const init = useRef(false);

  useFrame(() => {
    if (!ref.current) return;
    const active = elapsed >= T.ATTACK_START + 1 && elapsed < T.TURN_DONE;
    ref.current.visible = active;

    if (active && !init.current) {
      for (let i = 0; i < 600; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.03 + Math.random() * 0.25;
        vel.current[i*3]   = Math.cos(ang) * spd;
        vel.current[i*3+1] = 0.08 + Math.random() * 0.3;
        vel.current[i*3+2] = Math.sin(ang) * spd * 0.8;
        pos.current[i*3]   = (Math.random()-0.5) * 0.3;
        pos.current[i*3+1] = 0.8 + Math.random() * 0.8;
        pos.current[i*3+2] = (Math.random()-0.5) * 0.3;
      }
      init.current = true;
    }

    if (active) {
      for (let i = 0; i < 600; i++) {
        pos.current[i*3]   += vel.current[i*3];
        pos.current[i*3+1] += vel.current[i*3+1] - 0.006;
        pos.current[i*3+2] += vel.current[i*3+2];
        vel.current[i*3]   *= 0.97;
        vel.current[i*3+2] *= 0.97;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    } else {
      init.current = false;
    }
  });

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={600} array={pos.current} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#FFD700" transparent opacity={0.95} sizeAttenuation />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLOOR
// ═══════════════════════════════════════════════════════════════

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#020105" metalness={0.98} roughness={0.02} envMapIntensity={0.5} />
      </mesh>
      <gridHelper args={[80, 100, "#0a0008", "#050004"]} position={[0, 0.002, 0]} />

      {/* Ground fog layers */}
      {[0, 0.05, 0.1, 0.15, 0.2, 0.3].map((y, i) => (
        <mesh key={i} rotation={[-Math.PI/2, 0, 0]} position={[0, y, 0]}>
          <planeGeometry args={[60, 30]} />
          <meshBasicMaterial color="#1a0020" transparent opacity={0.025 - i * 0.003} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Human glow */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[-2.5, 0.004, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color="#1122ff" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Robot glow */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[2.5, 0.004, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Impact ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.8, 1.3, 32]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>

      <ContactShadows position={[0, 0.01, 0]} opacity={0.9} scale={40} blur={4} far={8} color="#000" />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEXT OVERLAY
// ═══════════════════════════════════════════════════════════════

function Overlay({ elapsed, topic }) {
  const t = elapsed;

  // Title
  if (t >= T.TITLE_IN && t < T.TITLE_OUT + 2) {
    const fi = smoothstep(T.TITLE_IN, T.TITLE_IN + 1.5, t);
    const fo = 1 - smoothstep(T.TITLE_OUT, T.TITLE_OUT + 2, t);
    return (
      <div className="cin-overlay" style={{ opacity: Math.min(fi, fo) }}>
        <div className="cin-title-screen">
          <div className="cin-vs-badge">⚔️</div>
          <h1 className="cin-main-title">DEBATE BATTLE</h1>
          <div className="cin-divider" />
          {t >= T.TOPIC_IN && <p className="cin-topic-text">"{topic}"</p>}
        </div>
      </div>
    );
  }

  // Human label
  if (t >= T.H_ENTER + 3 && t < T.H_WALK_END - 2)
    return <div className="cin-overlay"><div className="cin-subtitle cin-subtitle--bottom-left">THE CHALLENGER</div></div>;

  // Robot label
  if (t >= T.R_ENTER + 3 && t < T.R_WALK_END - 2)
    return <div className="cin-overlay"><div className="cin-subtitle cin-subtitle--bottom-right">THE OPPONENT</div></div>;

  // Argue rounds
  if (t >= T.ROUND_1_H && t < T.ROUND_1_R)
    return <div className="cin-overlay"><div className="cin-micro-text">Round 1 — Human argues</div></div>;
  if (t >= T.ROUND_1_R && t < T.ROUND_2_H)
    return <div className="cin-overlay"><div className="cin-micro-text">Round 1 — AI responds</div></div>;
  if (t >= T.ROUND_2_H && t < T.ROUND_2_R)
    return <div className="cin-overlay"><div className="cin-micro-text">Round 2 — Tension rises</div></div>;
  if (t >= T.ROUND_2_R && t < T.ROUND_3_H)
    return <div className="cin-overlay"><div className="cin-micro-text">Round 2 — AI strikes back</div></div>;
  if (t >= T.ROUND_3_H && t < T.CHARGE_START)
    return <div className="cin-overlay"><div className="cin-micro-text">Final round — The breaking point</div></div>;

  // Face off tension
  if (t >= T.FACE_OFF && t < T.ATTACK_START) {
    const p = prog(T.FACE_OFF, T.ATTACK_START, t);
    return (
      <div className="cin-overlay" style={{ opacity: p }}>
        <div className="cin-micro-text" style={{ color: "rgba(255,77,0,0.6)" }}>
          The tension is unbearable...
        </div>
      </div>
    );
  }

  // Attack impact
  if (t >= T.ATTACK_START + 1 && t < T.ATTACK_END)
    return <div className="cin-overlay"><div className="cin-impact"><h1>💥</h1></div></div>;

  // Turn away
  if (t >= T.TURN_AWAY && t < T.WALK_BACK)
    return <div className="cin-overlay"><div className="cin-micro-text">No more words...</div></div>;

  // Walking back
  if (t >= T.WALK_BACK && t < T.WALK_BACK_END)
    return <div className="cin-overlay"><div className="cin-micro-text">Taking battle positions...</div></div>;

  // Turn to face
  if (t >= T.TURN_FACE && t < T.TURN_FACE_DONE)
    return <div className="cin-overlay"><div className="cin-micro-text">One last look...</div></div>;

  // Robot taunt
  if (t >= T.ROBOT_TAUNT && t < T.HUMAN_CONF) {
    return (
      <div className="cin-overlay" style={{ opacity: smoothstep(T.ROBOT_TAUNT, T.ROBOT_TAUNT + 0.6, t) }}>
        <div className="cin-dialogue cin-dialogue--robot">
          <div className="cin-dialogue-name">AI OPPONENT</div>
          <p>"Your logic crumbles under pressure."</p>
        </div>
      </div>
    );
  }

  // Human confident
  if (t >= T.HUMAN_CONF && t < T.TITLE_CARD) {
    return (
      <div className="cin-overlay" style={{ opacity: smoothstep(T.HUMAN_CONF, T.HUMAN_CONF + 0.6, t) }}>
        <div className="cin-dialogue cin-dialogue--human">
          <div className="cin-dialogue-name">CHALLENGER</div>
          <p>"This ends on the battlefield."</p>
        </div>
      </div>
    );
  }

  // Title cards
  if (t >= T.TITLE_CARD && t < T.FADE) {
    const fo = 1 - smoothstep(T.FADE - 1.5, T.FADE, t);
    const p1 = smoothstep(T.TITLE_CARD,       T.TITLE_CARD + 0.5, t);
    const p2 = smoothstep(T.TITLE_CARD + 0.8,  T.TITLE_CARD + 1.3, t);
    const p3 = smoothstep(T.TITLE_CARD + 1.6,  T.TITLE_CARD + 2.1, t);
    return (
      <div className="cin-overlay" style={{ opacity: fo }}>
        <div className="cin-title-card">
          <p className="cin-word-1" style={{ opacity: p1 }}>ENOUGH TALK...</p>
          {p2 > 0 && <p className="cin-word-2" style={{ opacity: p2 }}>MEET ME ON THE</p>}
          {p3 > 0 && <p className="cin-word-3" style={{ opacity: p3 }}>BATTLEFIELD! ⚔️</p>}
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// PRELOAD ALL 13 FILES
// ═══════════════════════════════════════════════════════════════

[
  "/models/cinematic/human_walk.glb",
  "/models/cinematic/human_idle.glb",
  "/models/cinematic/human_arguing.glb",
  "/models/cinematic/human_confident.glb",
  "/models/cinematic/human_flinch.glb",
  "/models/cinematic/human_defend.glb",
  "/models/cinematic/robot_walk.glb",
  "/models/cinematic/robot_idle.glb",
  "/models/cinematic/robot_arguing.glb",
  "/models/cinematic/robot_intimidate.glb",
  "/models/cinematic/robot_pointing.glb",
  "/models/cinematic/robot_taunt.glb",
  "/models/cinematic/robot_attack.glb",
].forEach((p) => useGLTF.preload(p));

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { console.error("Cinematic:", e); this.props.onError?.(); }
  render() { return this.state.err ? null : this.props.children; }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export default function CinematicIntro({ topic, onComplete }) {
  const [elapsed, setElapsed]     = useState(0);
  const [flash, setFlash]         = useState(0);
  const [showSkip, setShowSkip]   = useState(false);
  const rafRef                    = useRef(null);
  const startRef                  = useRef(null);


  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    startRef.current = performance.now();

    const update = () => {
      const secs = (performance.now() - startRef.current) / 1000;
      setElapsed(secs);

      // Flash at attack impact
      if (secs >= T.ATTACK_START + 1 && secs < T.ATTACK_START + 1.5) {
        setFlash(1 - prog(T.ATTACK_START + 1, T.ATTACK_START + 1.5, secs));
      }
      // Fade to black at end
      else if (secs >= T.FADE) {
        setFlash(smoothstep(T.FADE, T.END, secs));
      }
      else {
        setFlash(0);
      }

      if (secs >= T.END) {
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  return (
    <div className="cinematic-container">
      <ErrorBoundary onError={onComplete}>
        <Canvas
          shadows
          camera={{ position: [0, 1.5, 18], fov: 42 }}
          gl={{
            antialias:           true,
            toneMapping:         THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.9,
            powerPreference:     "high-performance",
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <fog attach="fog" args={["#050310", 10, 50]} />

          <Camera elapsed={elapsed} />
          <Lights elapsed={elapsed} />
          <Floor />
          <Dust />
          <Sparks elapsed={elapsed} />

          <Suspense
            fallback={
              <Html center>
                <div style={{
                  color: "white",
                  background: "rgba(0,0,0,0.92)",
                  padding: "32px 52px",
                  borderRadius: "14px",
                  textAlign: "center",
                  border: "1px solid rgba(255,77,0,0.3)",
                }}>
                  <div style={{ fontSize: "44px", marginBottom: "14px" }}>⚔️</div>
                  <div style={{ fontSize: "14px", color: "#888", letterSpacing: "2px" }}>
                    LOADING BATTLE...
                  </div>
                </div>
              </Html>
            }
          >
            <HumanCharacter elapsed={elapsed} />
            <RobotCharacter elapsed={elapsed} />
          </Suspense>

          <Environment preset="night" />
        </Canvas>
      </ErrorBoundary>

      {/* Letterbox */}
      <div className="cinematic-letterbox-top" />
      <div className="cinematic-letterbox-bottom" />

      {/* Flash */}
      {flash > 0 && (
        <div className="cinematic-flash" style={{
          opacity: flash,
          background: elapsed >= T.FADE ? "#000" : "#fff",
        }} />
      )}

      {/* Vignette */}
      <div className="cinematic-vignette" />

      {/* Text */}
      <Overlay elapsed={elapsed} topic={topic} />

      {/* Skip */}
      {showSkip && (
        <button className="cinematic-skip" onClick={() => onComplete()}>
          SKIP ▶▶
        </button>
      )}

      {/* Progress */}
      <div className="cinematic-progress">
        <div className="cinematic-progress-fill" style={{ width: `${(elapsed / DURATION) * 100}%` }} />
      </div>
    </div>
  );
}