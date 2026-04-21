/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

const AntigravityInner = ({
  count = 300,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  color = '#FF9FFC',
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = 'capsule',
  fieldStrength = 10,
  mousePos,
}) => {
  const meshRef = useRef(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const temp = [];
    const w = viewport.width || 100;
    const h = viewport.height || 100;
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100,
        speed: 0.01 + Math.random() / 200,
        mx: (Math.random() - 0.5) * w,
        my: (Math.random() - 0.5) * h,
        mz: (Math.random() - 0.5) * 20,
        cx: (Math.random() - 0.5) * w,
        cy: (Math.random() - 0.5) * h,
        cz: (Math.random() - 0.5) * 20,
        randomRadiusOffset: (Math.random() - 0.5) * 2,
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { viewport: v } = state;

    // Use external mouse position if provided
    let destX, destY;

    if (mousePos.current) {
      destX = mousePos.current.x;
      destY = mousePos.current.y;

      if (Math.abs(destX) > 0.01 || Math.abs(destY) > 0.01) {
        lastMoveTime.current = Date.now();
      }
    } else {
      destX = 0;
      destY = 0;
    }

    // Convert normalized mouse (-1 to 1) to viewport coords
    destX = (destX * v.width) / 2;
    destY = (destY * v.height) / 2;

    // Auto animate when idle
    if (autoAnimate && Date.now() - lastMoveTime.current > 3000) {
      const t = state.clock.getElapsedTime();
      destX = Math.sin(t * 0.5) * (v.width / 4);
      destY = Math.cos(t * 0.5 * 2) * (v.height / 4);
    }

    // Smooth follow
    virtualMouse.current.x += (destX - virtualMouse.current.x) * 0.08;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * 0.08;

    const tx = virtualMouse.current.x;
    const ty = virtualMouse.current.y;
    const gr = state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((p, i) => {
      p.t += p.speed / 2;
      const pf = 1 - p.cz / 50;
      const ptx = tx * pf;
      const pty = ty * pf;
      const ddx = p.mx - ptx;
      const ddy = p.my - pty;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      let targetX = p.mx;
      let targetY = p.my;
      let targetZ = p.mz * depthFactor;

      if (dist < magnetRadius) {
        const angle = Math.atan2(ddy, ddx) + gr;
        const wave = Math.sin(p.t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const dev = p.randomRadiusOffset * (5 / (fieldStrength + 0.1));
        const rr = ringRadius + wave + dev;
        targetX = ptx + rr * Math.cos(angle);
        targetY = pty + rr * Math.sin(angle);
        targetZ = p.mz * depthFactor + Math.sin(p.t) * (waveAmplitude * depthFactor);
      }

      p.cx += (targetX - p.cx) * lerpSpeed;
      p.cy += (targetY - p.cy) * lerpSpeed;
      p.cz += (targetZ - p.cz) * lerpSpeed;

      dummy.position.set(p.cx, p.cy, p.cz);
      dummy.lookAt(ptx, pty, p.cz);
      dummy.rotateX(Math.PI / 2);

      const cd = Math.sqrt(Math.pow(p.cx - ptx, 2) + Math.pow(p.cy - pty, 2));
      const dr = Math.abs(cd - ringRadius);
      let sc = Math.max(0, Math.min(1, 1 - dr / 10));
      const fs = sc * (0.8 + Math.sin(p.t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
      dummy.scale.set(fs, fs, fs);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.1, 0.4, 4, 8]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.2, 16, 16]} />}
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
};

export default function Antigravity(props) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    // Track mouse globally so it works even with pointer-events: none
    const handleMouseMove = (e) => {
      // Convert screen coordinates to normalized -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current = { x, y };
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth) * 2 - 1;
        const y = -(touch.clientY / window.innerHeight) * 2 + 1;
        mouseRef.current = { x, y };
      }
    };

    // Listen on WINDOW so mouse events are captured everywhere
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Don't block clicks on content above
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 50], fov: 35 }}
        style={{ pointerEvents: 'none' }}
      >
        <AntigravityInner {...props} mousePos={mouseRef} />
      </Canvas>
    </div>
  );
}