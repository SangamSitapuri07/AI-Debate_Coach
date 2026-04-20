import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function HumanModel({ animation = "idle", side }) {
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const [modelError, setModelError] = useState(false);

  // Load the model
  let gltf = null;
  try {
    gltf = useGLTF("/models/human.glb");
  } catch (e) {
    console.error("Failed to load human model:", e);
  }

  // Setup animations if model has them
  useEffect(() => {
    if (!gltf) {
      setModelError(true);
      return;
    }

    // Setup animation mixer if model has animations
    if (gltf.animations && gltf.animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(gltf.scene);
      const action = mixerRef.current.clipAction(gltf.animations[0]);
      action.play();
    }

    // Setup materials
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [gltf]);

  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const t = state.clock.getElapsedTime();

    // Custom animations based on state
    switch (animation) {
      case "speaking":
        // Lean forward slightly and gentle sway
        groupRef.current.rotation.x = Math.sin(t * 2) * 0.03;
        groupRef.current.rotation.y = side === "left" ? 0.2 + Math.sin(t * 1.5) * 0.05 : -0.2 + Math.sin(t * 1.5) * 0.05;
        groupRef.current.position.y = Math.sin(t * 3) * 0.02;
        break;

      case "listening":
        // Subtle head nod effect
        groupRef.current.rotation.x = Math.sin(t * 0.8) * 0.02;
        groupRef.current.rotation.y = side === "left" ? 0.15 : -0.15;
        groupRef.current.position.y = 0;
        break;

      default: // idle
        // Gentle breathing
        groupRef.current.position.y = Math.sin(t * 1.2) * 0.015;
        groupRef.current.rotation.y = side === "left" ? 0.15 : -0.15;
        groupRef.current.rotation.x = 0;
        break;
    }
  });
// Add after clone is created — inside HumanModel useEffect
console.log("=== HUMAN BONES ===");
clone.traverse((node) => {
  if (node.isBone) {
    console.log("Bone:", node.name);
  }
});

console.log("=== HUMAN MESHES ===");
clone.traverse((node) => {
  if (node.isMesh) {
    console.log("Mesh:", node.name);
  }
});
  // Fallback if model fails to load
  if (modelError || !gltf) {
    return (
      <group ref={groupRef} position={[-2.5, 0, 0]}>
        {/* Fallback: Simple human shape */}
        {/* Body */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
          <meshStandardMaterial color="#2563eb" metalness={0.3} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 2, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.1} roughness={0.8} />
        </mesh>
        {/* Left arm */}
        <mesh position={[-0.45, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.6, 8, 8]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.45, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.6, 8, 8]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[-2.5, 0, 0]}>
      <primitive
        object={gltf.scene.clone()}
        scale={1.5}
        position={[0, 0, 0]}
      />
    </group>
  );
}

// Preload the model
useGLTF.preload("/models/human.glb");