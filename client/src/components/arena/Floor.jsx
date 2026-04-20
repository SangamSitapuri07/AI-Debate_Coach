import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Floor() {
  const glowRef  = useRef();
  const leftRef  = useRef();
  const rightRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (glowRef.current) {
      glowRef.current.material.opacity =
        0.1 + Math.sin(t * 0.5) * 0.04;
    }
    if (leftRef.current) {
      leftRef.current.material.opacity =
        0.15 + Math.sin(t * 1.2) * 0.05;
    }
    if (rightRef.current) {
      rightRef.current.material.opacity =
        0.15 + Math.sin(t * 1.2 + 1) * 0.05;
    }
  });

  return (
    <group>
      {/* Dark reflective floor surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#060610"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[30, 60, "#0f2040", "#0a1428"]}
        position={[0, 0.002, 0]}
      />

      {/* Center stage glow */}
      <mesh
        ref={glowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
      >
        <circleGeometry args={[5, 64]} />
        <meshBasicMaterial
          color="#1e3a8a"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Human podium glow — left x=-2.5 */}
      <mesh
        ref={leftRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-2.5, 0.004, 0]}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Robot podium glow — right x=+2.5 */}
      <mesh
        ref={rightRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.5, 0.004, 0]}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#ec4899"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center dividing line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
      >
        <planeGeometry args={[0.02, 5]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
        />
      </mesh>
    </group>
  );
}