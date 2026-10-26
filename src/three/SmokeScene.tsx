"use client";

// Phase 0 smoke test: proves three.js + R3F + drei render under this Next.js /
// React version on the demo machine. Replaced by the real Viewport in Phase 1.
import { CameraControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export default function SmokeScene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      gl={{ powerPreference: "high-performance", antialias: true }}
      camera={{ fov: 38, near: 1, far: 1500, position: [120, 90, 160] }}
    >
      <color attach="background" args={["#0d1725"]} />
      <hemisphereLight args={["#dfe8f2", "#2a3542", 1.2]} />
      <directionalLight position={[-60, 100, 90]} intensity={2} />
      {/* Tower and podium massing at prototype scale (metres) */}
      <mesh position={[9, 29 + 62, -6]}>
        <boxGeometry args={[44, 124, 28]} />
        <meshStandardMaterial color="#e3e5d9" roughness={0.6} />
      </mesh>
      <mesh position={[0, 13, 0]}>
        <boxGeometry args={[85, 26, 49]} />
        <meshStandardMaterial color="#9e3d29" roughness={0.75} />
      </mesh>
      <mesh position={[0, -1.7, -1]}>
        <boxGeometry args={[220, 2.7, 150]} />
        <meshStandardMaterial color="#919c96" roughness={0.9} />
      </mesh>
      <CameraControls makeDefault minDistance={70} maxDistance={560} />
    </Canvas>
  );
}
