import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function RobotModel({ animation = "idle", side }) {
  const groupRef = useRef();
  const glowRef = useRef();
  const mixerRef = useRef(null);
  const [modelError, setModelError] = useState(false);

  // Load the model
  let gltf = null;
  try {
    gltf = useGLTF("/models/robot.glb");
  } catch (e) {
    console.error("Failed to load robot model:", e);
  }

  // Setup
  useEffect(() => {
    if (!gltf) {
      setModelError(true);
      return;
    }

    if (gltf.animations && gltf.animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(gltf.scene);
      const action = mixerRef.current.clipAction(gltf.animations[0]);
      action.play();
    }

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return () => {
      if (mixerRef.current) mixerRef.current.stopAllAction();
    };
  }, [gltf]);

  // Animation loop
  useFrame((state, delta) => {
  if (!groupRef.current) return;
  mixerRef.current?.update(delta);

  const t = state.clock.getElapsedTime();

  // Try Math.PI (faces opposite default direction)
  const BASE =  Math.PI / 2;

  switch (animation) {
    case "speaking":
      groupRef.current.rotation.y = BASE + 0.2 + Math.sin(t * 1.5) * 0.07;
      groupRef.current.position.y = 0.04 + Math.sin(t * 2.8) * 0.025;
      break;
    case "listening":
      groupRef.current.rotation.y = BASE + 0.15;
      groupRef.current.position.y = Math.sin(t * 0.9) * 0.01;
      break;
    default:
      groupRef.current.rotation.y = BASE + 0.1;
      groupRef.current.position.y = Math.sin(t * 1.4) * 0.015;
      break;
  }
});

  // Fallback robot
  if (modelError || !gltf) {
    return (
      <group ref={groupRef} position={[2.5, 0, 0]}>
        {/* Body */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.6, 0.9, 0.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.45, 0.35, 0.35]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.1, 1.95, 0.18]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0.1, 1.95, 0.18]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        {/* Core glow */}
        <mesh ref={glowRef} position={[0, 1.2, 0.21]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.45, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.5, 8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.45, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.5, 8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    );
  }
  if (gltf && gltf.scene) {
    console.log("=== ROBOT BONES (Standalone) ===");
    gltf.scene.traverse((node) => {
      if (node.isBone) {
        console.log("Bone:", node.name);
      }
    });
  }

  return (
    <group ref={groupRef} position={[2.5, 0, 0]}>
      <primitive
        object={gltf.scene.clone()}
        scale={1.5}
        position={[0, 0, 0]}
      />
      {/* Glow effect behind robot */}
      <mesh ref={glowRef} position={[0, 1.2, -0.3]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/robot.glb");