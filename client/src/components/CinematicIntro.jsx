/* eslint-disable react/no-unknown-property */
import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Html, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// TIMELINE — 114 seconds (~1 minute 54 seconds)
// ═══════════════════════════════════════════════════════════════

const T = {
  // Scene 1: Title (0-8s)
  TITLE_IN:       0.5,
  TOPIC_IN:       2.5,
  TITLE_OUT:      6,

  // Scene 2: Human entry (8-24s)
  H_ENTER:        8,
  H_WALK_END:     24,

  // Scene 3: Human close-up (24-30s)
  H_IDLE:         24,
  H_IDLE_END:     30,

  // Scene 4: Robot entry (30-46s)
  R_ENTER:        30,
  R_WALK_END:     46,

  // Scene 5: Robot close-up (46-52s)
  R_IDLE:         46,
  R_IDLE_END:     52,

  // Scene 6: ARGUE — 5 rounds (52-82s) = 30 seconds
  BOTH:           52,
  ROUND_1_H:      52,
  ROUND_1_R:      58,
  ROUND_2_H:      64,
  ROUND_2_R:      70,
  ROUND_3_H:      76,

  // Scene 7: CLASH — attack + defend (82-93s) = 11 seconds
  CHARGE_START:   82,
  CHARGE_END:     86,
  FACE_OFF:       86,
  ATTACK_START:   88,
  ATTACK_END:     91,
  REACT:          91,
  STEP_APART:     92,

  // Scene 8: Turn around + walk away (93-100s)
  TURN_START:     93,
  TURN_END:       95,
  WALK_AWAY:      95,
  AT_POSITION:    100,

  // Scene 9: Taunt + dialogue (100-106s)
  ROBOT_TAUNT:    100,
  HUMAN_CONF:     103,

  // Scene 10: Title card + fade (106-114s)
  TITLE_CARD:     106,
  FADE:           110,
  END:            114,
};

const DURATION = T.END;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function lerp(a, b, t) {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function prog(start, end, t) {
  return Math.min(Math.max((t - start) / (end - start), 0), 1);
}

function smoothstep(a, b, t) {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
}

function easeOut(p) { return 1 - Math.pow(1 - p, 2); }
function easeIn(p)  { return p * p * p; }

// ═══════════════════════════════════════════════════════════════
// STRIP ROOT MOTION
// ═══════════════════════════════════════════════════════════════

function stripRootMotion(animations) {
  if (!animations || animations.length === 0) return animations;
  return animations.map((clip) => {
    const tracks = clip.tracks.filter((track) => {
      if (track.name.includes(".position")) return false;
      return true;
    });
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  });
}

// ═══════════════════════════════════════════════════════════════
// DEEP CLONE
// ═══════════════════════════════════════════════════════════════

function deepClone(src) {
  const clone = src.clone(true);
  const sb = [], cb = [];
  src.traverse((n)   => { if (n.isBone) sb.push(n); });
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
        node.visible       = true;
        node.frustumCulled = false;
        if (node.isMesh || node.isSkinnedMesh) {
          node.castShadow    = true;
          node.receiveShadow = true;
          if (node.material) {
            const ms = Array.isArray(node.material) ? node.material : [node.material];
            ms.forEach((m) => {
              m.side        = THREE.DoubleSide;
              m.transparent = false;
              m.opacity     = 1;
              m.needsUpdate = true;
            });
          }
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const sz  = new THREE.Vector3();
      box.getSize(sz);
      const sc = 2 / (sz.y || 1);
      model.scale.setScalar(sc);

      model.updateWorldMatrix(true, true);
      const box2 = new THREE.Box3().setFromObject(model);
      const ctr  = new THREE.Vector3();
      box2.getCenter(ctr);
      model.position.y = -box2.min.y;
      model.position.x = -ctr.x;
      model.position.z = -ctr.z;

      model.rotation.y = faceRight ? Math.PI / 2 : -Math.PI / 2;

      modelRef.current = model;
      groupRef.current.add(model);

      if (gltf.animations?.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(model);
        const clean  = stripRootMotion(gltf.animations);
        const action = mixerRef.current.clipAction(clean[0]);
        action.play();
      }
    } catch (e) {
      console.error("Build error:", path, e);
    }

    return () => mixerRef.current?.stopAllAction();
  }, [gltf]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.visible = visible;

    if (modelRef.current && flipFace !== undefined) {
      if (faceRight) {
        const target = flipFace ? -Math.PI / 2 : Math.PI / 2;
        modelRef.current.rotation.y = lerp(modelRef.current.rotation.y, target, 0.08);
      } else {
        const target = flipFace ? Math.PI / 2 : -Math.PI / 2;
        modelRef.current.rotation.y = lerp(modelRef.current.rotation.y, target, 0.08);
      }
    }

    mixerRef.current?.update(delta);
  });

  return <group ref={groupRef} />;
}

// ═══════════════════════════════════════════════════════════════
// HUMAN STATE
// ═══════════════════════════════════════════════════════════════

function getHumanState(t) {
  if (t < T.H_ENTER)    return { model: "none", posX: -20, flip: false };

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

  // CLASH — walk closer
  if (t < T.CHARGE_END) {
    const p = prog(T.CHARGE_START, T.CHARGE_END, t);
    return { model: "walk", posX: lerp(-2.5, -0.45, p), flip: false };
  }

  // Face off
  if (t < T.ATTACK_START) return { model: "idle", posX: -0.45, flip: false };

  // BLOCK defense
  if (t < T.ATTACK_END) return { model: "block", posX: -0.45, flip: false };

  // React
  if (t < T.STEP_APART) return { model: "flinch", posX: -0.45, flip: false };

  // Step apart
  if (t < T.TURN_START) {
    const p = prog(T.STEP_APART, T.TURN_START, t);
    return { model: "idle", posX: lerp(-0.45, -1.5, p), flip: false };
  }

  // Turn around
  if (t < T.TURN_END) return { model: "idle", posX: -1.5, flip: true };

  // Walk away
  if (t < T.AT_POSITION) {
    const p = prog(T.WALK_AWAY, T.AT_POSITION, t);
    return { model: "walk", posX: lerp(-1.5, -3.5, p), flip: true };
  }

  // Turn back
  if (t < T.ROBOT_TAUNT) return { model: "idle",      posX: -3.5, flip: false };
  if (t < T.TITLE_CARD)  return { model: "confident", posX: -3.5, flip: false };

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

  // CLASH — walk closer
  if (t < T.CHARGE_END) {
    const p = prog(T.CHARGE_START, T.CHARGE_END, t);
    return { model: "walk", posX: lerp(2.5, 0.45, p), flip: false };
  }

  // Face off
  if (t < T.ATTACK_START) return { model: "intimidate", posX: 0.45, flip: false };

  // ATTACK — robot punches
  if (t < T.ATTACK_END) return { model: "attack", posX: 0.45, flip: false };

  // React
  if (t < T.STEP_APART) return { model: "intimidate", posX: 0.45, flip: false };

  // Step apart
  if (t < T.TURN_START) {
    const p = prog(T.STEP_APART, T.TURN_START, t);
    return { model: "idle", posX: lerp(0.45, 1.5, p), flip: false };
  }

  // Turn around
  if (t < T.TURN_END) return { model: "idle", posX: 1.5, flip: true };

  // Walk away
  if (t < T.AT_POSITION) {
    const p = prog(T.WALK_AWAY, T.AT_POSITION, t);
    return { model: "walk", posX: lerp(1.5, 3.5, p), flip: true };
  }

  // Turn back
  if (t < T.ROBOT_TAUNT) return { model: "idle",     posX: 3.5, flip: false };
  if (t < T.HUMAN_CONF)  return { model: "taunt",    posX: 3.5, flip: false };
  if (t < T.TITLE_CARD)  return { model: "pointing", posX: 3.5, flip: false };

  return { model: "idle", posX: 3.5, flip: false };
}

// ═══════════════════════════════════════════════════════════════
// CHARACTERS
// ═══════════════════════════════════════════════════════════════

function HumanCharacter({ elapsed }) {
  const outerRef = useRef();
  const state    = getHumanState(elapsed);

  useFrame(() => {
    if (outerRef.current) outerRef.current.position.x = state.posX;
  });

  return (
    <group ref={outerRef}>
      <ModelInstance path="/models/cinematic/human_walk.glb"      faceRight={true} visible={state.model === "walk"}      flipFace={state.flip && state.model === "walk"} />
      <ModelInstance path="/models/cinematic/human_idle.glb"      faceRight={true} visible={state.model === "idle"}      flipFace={state.flip && state.model === "idle"} />
      <ModelInstance path="/models/cinematic/human_arguing.glb"   faceRight={true} visible={state.model === "arguing"}   flipFace={false} />
      <ModelInstance path="/models/cinematic/human_confident.glb" faceRight={true} visible={state.model === "confident"} flipFace={false} />
      <ModelInstance path="/models/cinematic/human_flinch.glb"    faceRight={true} visible={state.model === "flinch"}    flipFace={false} />
      <ModelInstance path="/models/cinematic/human_defend.glb"    faceRight={true} visible={state.model === "block"}     flipFace={false} />
    </group>
  );
}

function RobotCharacter({ elapsed }) {
  const outerRef = useRef();
  const state    = getRobotState(elapsed);

  useFrame(() => {
    if (outerRef.current) outerRef.current.position.x = state.posX;
  });

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

    // Scene 1: Title — atmospheric slow dolly
    if (t < T.H_ENTER) {
      const p = prog(0, T.H_ENTER, t);
      px = 0; py = 0.4 + p * 0.8; pz = 20 - p * 5;
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 2a: Human walk — ground level tilt up
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
    // Scene 3: Human close-up zoom
    else if (t < T.H_IDLE_END) {
      const p = prog(T.H_IDLE, T.H_IDLE_END, t);
      px = -1.8; py = 1.65; pz = lerp(4.5, 2.5, p);
      lx = -2.5; ly = 1.65; lz = 0;
    }
    // Cut to wide before robot
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
    // Scene 4b: Robot arriving — pull to wide
    else if (t < T.R_WALK_END) {
      const p = prog(T.R_WALK_END - 4, T.R_WALK_END, t);
      px = lerp(-0.8, 0, p);
      py = 1.5;
      pz = lerp(3.5, 10, p);
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 5: Robot close-up
    else if (t < T.R_IDLE_END) {
      const p = prog(T.R_IDLE, T.R_IDLE_END, t);
      px = 1.8; py = 1.7; pz = lerp(5, 2.8, p);
      lx = 2.5; ly = 1.65; lz = 0;
    }
    // Scene 6: Argue — camera zooms into whoever argues (6s rounds)
    else if (t < T.CHARGE_START) {
      const phase   = t - T.BOTH;
      const roundT  = 6;
      const round   = Math.floor(phase / roundT);
      const isHuman = round % 2 === 0;
      const inRound = (phase % roundT) / roundT;

      if (isHuman) {
        px = lerp(0, -1.5, inRound);
        py = lerp(1.6, 1.65, inRound);
        pz = lerp(8, 3, inRound);
        lx = -2.5; ly = 1.6; lz = 0;
      } else {
        px = lerp(0, 1.5, inRound);
        py = lerp(1.6, 1.7, inRound);
        pz = lerp(8, 3, inRound);
        lx = 2.5; ly = 1.6; lz = 0;
      }
    }
    // Scene 7a: Both walk closer — medium side tracking
    else if (t < T.CHARGE_END) {
      const p = prog(T.CHARGE_START, T.CHARGE_END, t);
      px = lerp(4, 2, p);
      py = lerp(1.2, 1.0, p);
      pz = lerp(5, 3, p);
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 7b: Face off — dramatic low angle between them
    else if (t < T.ATTACK_START) {
      const p = prog(T.FACE_OFF, T.ATTACK_START, t);
      px = lerp(2, 0, p);
      py = lerp(1.0, 0.4, p);
      pz = lerp(3, 2.5, p);
      lx = 0; ly = 1.5; lz = 0;
    }
    // Scene 7c: ATTACK — side angle to see punch + block
    else if (t < T.ATTACK_END) {
      const p = prog(T.ATTACK_START, T.ATTACK_END, t);
      // Camera slides from center to human side to see the block
      px = lerp(0, -1, p);
      py = lerp(0.4, 1.3, p);
      pz = lerp(2.5, 2, p);
      lx = 0; ly = 1.2; lz = 0;

      // Camera shake at moment of impact (middle of animation)
      if (p > 0.4 && p < 0.8) {
        px += (Math.random() - 0.5) * 0.2;
        py += (Math.random() - 0.5) * 0.15;
        pz += (Math.random() - 0.5) * 0.1;
      }
    }
    // Scene 7d: React — pull back showing aftermath
    else if (t < T.STEP_APART) {
      px = 0; py = 1.5; pz = 4;
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 7e: Step apart — wide shot
    else if (t < T.TURN_START) {
      const p = prog(T.STEP_APART, T.TURN_START, t);
      px = 0;
      py = lerp(1.5, 2, p);
      pz = lerp(4, 8, p);
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 8a: Turn around — overhead wide
    else if (t < T.TURN_END) {
      px = 0; py = 3; pz = 10;
      lx = 0; ly = 0.8; lz = 0;
    }
    // Scene 8b: Walk away — crane up slowly
    else if (t < T.AT_POSITION) {
      const p = prog(T.WALK_AWAY, T.AT_POSITION, t);
      px = 0;
      py = lerp(3, 3.5, p);
      pz = lerp(10, 14, p);
      lx = 0; ly = 1; lz = 0;
    }
    // Scene 9a: Robot taunt — close up
    else if (t < T.HUMAN_CONF) {
      px = 2; py = 1.7; pz = 3.5;
      lx = 3.5; ly = 1.6; lz = 0;
    }
    // Scene 9b: Human confident — close up
    else if (t < T.TITLE_CARD) {
      px = -2; py = 1.65; pz = 3.5;
      lx = -3.5; ly = 1.6; lz = 0;
    }
    // Scene 10a: Title card — slow orbit
    else if (t < T.FADE) {
      const p = prog(T.TITLE_CARD, T.FADE, t);
      const ang = p * Math.PI * 0.6;
      px = Math.sin(ang) * 14;
      py = 3;
      pz = Math.cos(ang) * 14;
      lx = 0; ly = 1.2; lz = 0;
    }
    // Scene 10b: Fade out
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

    // Attack flash — pulse during robot punch
    if (cRef.current) {
      if (t >= T.ATTACK_START && t < T.ATTACK_END) {
        const p = prog(T.ATTACK_START, T.ATTACK_END, t);
        if (p > 0.4 && p < 0.8) {
          // Bright flash at moment of contact
          cRef.current.intensity = 15 + Math.random() * 20;
        } else {
          cRef.current.intensity = 3;
        }
      } else if (t >= T.ATTACK_END && t < T.STEP_APART) {
        // Lingering glow after hit
        const fade = 1 - prog(T.ATTACK_END, T.STEP_APART, t);
        cRef.current.intensity = fade * 8;
      } else {
        cRef.current.intensity = 0;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} color="#100818" />
      <directionalLight
        position={[0, 20, 5]}
        intensity={0.5}
        color="#aabbff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
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
    // Sparks during attack impact
    const active = elapsed >= T.ATTACK_START + 1 && elapsed < T.STEP_APART;
    ref.current.visible = active;

    if (active && !init.current) {
      for (let i = 0; i < 600; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.03 + Math.random() * 0.25;
        vel.current[i*3]   = Math.cos(ang) * spd;
        vel.current[i*3+1] = 0.08 + Math.random() * 0.3;
        vel.current[i*3+2] = Math.sin(ang) * spd * 0.8;
        // Sparks originate between the two characters (x=0)
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

      {/* Blue glow under human */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[-2.5, 0.004, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color="#1122ff" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Red glow under robot */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[2.5, 0.004, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Impact zone ring */}
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

  // Argue round labels
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

  // Attack impact text
  if (t >= T.ATTACK_START + 1 && t < T.ATTACK_END) {
    return <div className="cin-overlay"><div className="cin-impact"><h1>💥</h1></div></div>;
  }

  // After attack
  if (t >= T.REACT && t < T.STEP_APART)
    return <div className="cin-overlay"><div className="cin-micro-text">Both stand their ground...</div></div>;

  // Turn + walk text
  if (t >= T.TURN_START && t < T.AT_POSITION)
    return <div className="cin-overlay"><div className="cin-micro-text">Taking battle positions...</div></div>;

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
// CINEMATIC AUDIO — procedural Web Audio API sound design
// ═══════════════════════════════════════════════════════════════

function CinematicAudio({ elapsed }) {
  const ctxRef = useRef(null);
  const nRef = useRef(null);
  const impactFired = useRef(false);

  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();

      const master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);

      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 55;
      const droneG = ctx.createGain();
      droneG.gain.value = 0;
      drone.connect(droneG);
      droneG.connect(master);

      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = 32;
      const subG = ctx.createGain();
      subG.gain.value = 0;
      sub.connect(subG);
      subG.connect(master);

      const tens = ctx.createOscillator();
      tens.type = "sawtooth";
      tens.frequency.value = 80;
      const tensF = ctx.createBiquadFilter();
      tensF.type = "lowpass";
      tensF.frequency.value = 150;
      tensF.Q.value = 4;
      const tensG = ctx.createGain();
      tensG.gain.value = 0;
      tens.connect(tensF);
      tensF.connect(tensG);
      tensG.connect(master);

      const heart = ctx.createOscillator();
      heart.type = "sine";
      heart.frequency.value = 40;
      const heartG = ctx.createGain();
      heartG.gain.value = 0;
      heart.connect(heartG);
      heartG.connect(master);

      const whist = ctx.createOscillator();
      whist.type = "sine";
      whist.frequency.value = 800;
      const whistG = ctx.createGain();
      whistG.gain.value = 0;
      whist.connect(whistG);
      whistG.connect(master);

      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;

      drone.start(); sub.start(); tens.start(); heart.start(); whist.start();

      ctxRef.current = ctx;
      nRef.current = { master, drone, droneG, sub, subG, tens, tensF, tensG, heart, heartG, whist, whistG, noiseBuf };
    } catch (e) {
      console.warn("CinematicAudio: init failed", e);
    }
    return () => { try { ctxRef.current?.close(); } catch (_) { /* */ } };
  }, []);

  const n = nRef.current;
  const t = elapsed;
  if (n) {
    // DRONE
    if (t < T.H_ENTER) n.droneG.gain.value = lerp(0, 0.06, prog(0, T.H_ENTER, t));
    else if (t < T.BOTH) n.droneG.gain.value = lerp(0.06, 0.14, prog(T.H_ENTER, T.BOTH, t));
    else if (t < T.CHARGE_START) n.droneG.gain.value = lerp(0.14, 0.22, prog(T.BOTH, T.CHARGE_START, t));
    else if (t < T.ATTACK_END) n.droneG.gain.value = 0.3;
    else if (t < T.END) n.droneG.gain.value = lerp(0.3, 0, prog(T.ATTACK_END, T.END, t));
    else n.droneG.gain.value = 0;

    // SUB BASS
    if (t >= T.CHARGE_START && t < T.ATTACK_END) n.subG.gain.value = 0.25;
    else if (t >= T.ATTACK_END && t < T.STEP_APART) n.subG.gain.value = lerp(0.25, 0, prog(T.ATTACK_END, T.STEP_APART, t));
    else n.subG.gain.value = 0;

    // TENSION SAW
    if (t >= T.BOTH && t < T.CHARGE_START) {
      const p = prog(T.BOTH, T.CHARGE_START, t);
      n.tensG.gain.value = lerp(0, 0.1, p);
      n.tens.frequency.value = lerp(80, 200, p);
      n.tensF.frequency.value = lerp(150, 600, p);
    } else if (t >= T.CHARGE_START && t < T.ATTACK_START) {
      const p = prog(T.CHARGE_START, T.ATTACK_START, t);
      n.tensG.gain.value = lerp(0.1, 0.18, p);
      n.tens.frequency.value = lerp(200, 400, p);
      n.tensF.frequency.value = lerp(600, 2000, p);
    } else if (t >= T.ATTACK_START && t < T.ATTACK_END) {
      n.tensG.gain.value = lerp(0.18, 0, prog(T.ATTACK_START, T.ATTACK_END, t));
    } else n.tensG.gain.value = 0;

    // HEARTBEAT
    if (t >= T.CHARGE_START && t < T.ATTACK_START) {
      const p = prog(T.CHARGE_START, T.ATTACK_START, t);
      const rate = lerp(1.0, 2.8, p);
      const beat = Math.pow(Math.max(0, Math.sin(t * rate * Math.PI * 2)), 10);
      n.heartG.gain.value = beat * lerp(0.12, 0.3, p);
    } else n.heartG.gain.value = 0;

    // WHISTLE
    if (t >= T.FACE_OFF && t < T.ATTACK_START) {
      const p = prog(T.FACE_OFF, T.ATTACK_START, t);
      n.whistG.gain.value = lerp(0, 0.04, p);
      n.whist.frequency.value = lerp(800, 2200, p * p);
    } else n.whistG.gain.value = 0;

    // IMPACT BOOM
    if (t >= T.ATTACK_START + 1 && !impactFired.current && ctxRef.current) {
      impactFired.current = true;
      try {
        const ctx = ctxRef.current;
        const src = ctx.createBufferSource();
        src.buffer = n.noiseBuf;
        const ig = ctx.createGain();
        ig.gain.setValueAtTime(0.45, ctx.currentTime);
        ig.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        const ff = ctx.createBiquadFilter();
        ff.type = "lowpass"; ff.frequency.value = 250;
        src.connect(ff); ff.connect(ig); ig.connect(n.master);
        src.start(); src.stop(ctx.currentTime + 0.6);
      } catch (_) { /* */ }
    }

    // MASTER FADE
    if (t >= T.FADE) n.master.gain.value = lerp(0.25, 0, prog(T.FADE, T.END, t));
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

      if (secs >= T.END) { onComplete(); return; }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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

      {/* Audio */}
      <CinematicAudio elapsed={elapsed} />

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