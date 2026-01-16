import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Box, Layers, Scale } from 'lucide-react';

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

function PlacedItem({ info, scale }) {
  // Convert mm position to Three.js units (centered)
  // Placement coordinates are from bottom-left corner
  const width = info.width * scale;
  const height = info.height * scale;
  const depth = info.depth * scale;

  const x = (info.x * scale) + (width / 2);
  const z = (info.z * scale) + (depth / 2); // Z is depth in packing lib
  const y = (info.y * scale) + (height / 2); // Y is height in packing lib (check this)

  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={info.color}
        transparent
        opacity={0.8}
        roughness={0.2}
        metalness={0.1}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="white" opacity={0.5} transparent />
      </lineSegments>
    </mesh>
  );
}

// Coordinate system adjustment:
// Packing lib: X=width, Y=depth, Z=height usually
// Three.js: X=width, Y=height, Z=depth
function PlacedBox({ info, scale }) {
  // Conversions based on verified PackingService mapping:
  // Lib X -> Three X
  // Lib Y -> Three Z (Depth)
  // Lib Z -> Three Y (Height)

  const width = info.width * scale;
  const depth = info.depth * scale;
  const height = info.height * scale;

  const x = info.x * scale + width / 2;
  const z = info.y * scale + depth / 2;
  const y = info.z * scale + height / 2;

  return (
    <group position={[x, y, z]}>
      {/* Main Box */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={info.color}
          transparent
          opacity={0.7}
          roughness={0.1}
        />
      </mesh>

      {/* Edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="white" opacity={0.6} transparent />
      </lineSegments>
    </group>
  );
}

function Scene({ placements, maxDim }) {
  // Calculate center of the packed items to center the camera view
  const scale = 4 / Math.max(maxDim, 100); // Scale down to fit in view (approx 4 units for more padding)

  // Calculate center offset
  let bounds = { maxX: 0, maxY: 0, maxZ: 0 };
  if (placements && placements.length > 0) {
    placements.forEach(p => {
      bounds.maxX = Math.max(bounds.maxX, p.x + p.width);
      bounds.maxY = Math.max(bounds.maxY, p.y + p.depth);
      bounds.maxZ = Math.max(bounds.maxZ, p.z + p.height);
    });
  }

  const centerX = (bounds.maxX * scale) / 2;
  const centerZ = (bounds.maxY * scale) / 2; // Y in lib -> Z in Three

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 20, 10]} intensity={1} />

      <group position={[-centerX, 0, -centerZ]}>
        {placements && placements.map((p, i) => (
          <PlacedBox key={i} info={p} scale={scale} />
        ))}
      </group>

      <Grid infiniteGrid fadeDistance={40} fadeStrength={5} />
      <OrbitControls autoRotate autoRotateSpeed={0.7} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      <Environment preset="city" />
    </>
  );
}

import * as THREE from 'three';

export default function ParcelVisualizer3D({ dimensions, mode, placements = [] }) {
  const hasDimensions = dimensions && dimensions.lengthCm > 0;

  // Convert cm to mm for internal consistency if needed, but placements are in mm
  const maxDim = hasDimensions ? Math.max(dimensions.lengthCm, dimensions.widthCm, dimensions.heightCm) * 10 : 100;

  const dimensionLabel = hasDimensions
    ? `${formatDimension(dimensions.lengthCm)} x ${formatDimension(dimensions.widthCm)} x ${formatDimension(dimensions.heightCm)} cm`
    : '-';

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/60 bg-white/40 p-3 sm:p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
        <div>
          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold">3D ビュー</p>
          <h3 className="text-base sm:text-xl font-bold text-slate-900">荷物イメージ</h3>
        </div>
        <span className="rounded-full border border-slate-200/50 bg-white/50 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
          {mode === 'manual' ? '手動' : 'カート'}
        </span>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-[1.2fr_1fr] sm:grid-cols-[1.5fr_1fr]">
        <div className="relative h-48 sm:h-64 rounded-xl sm:rounded-2xl border border-white/50 bg-slate-900/90 shadow-inner overflow-hidden">
          {placements && placements.length > 0 ? (
            <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
              <Scene placements={placements} maxDim={maxDim} />
            </Canvas>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <Box className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">アイテムを追加してください</p>
            </div>
          )}

          {/* Wireframe box hint */}
          {hasDimensions && (
            <div className="absolute bottom-2 left-2 text-[10px] text-white/70 font-mono bg-black/40 px-2 py-1 rounded">
              {/* Debug info if needed */}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <InfoCard
            label="サイズ"
            value={dimensionLabel}
            icon={<Scale className="h-4 w-4 text-indigo-500" />}
          />
          <InfoCard
            label="重量"
            value={dimensions?.weightG ? formatWeight(dimensions.weightG) : '-'}
            icon={<Box className="h-4 w-4 text-emerald-500" />}
          />
          <InfoCard
            label="点数"
            value={dimensions?.itemCount ? `${dimensions.itemCount} 点` : '-'}
            icon={<Layers className="h-4 w-4 text-rose-500" />}
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="group rounded-xl sm:rounded-2xl border border-white/60 bg-white/40 p-2 sm:p-3 transition-colors hover:bg-white/60">
      <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs uppercase tracking-wider text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-0.5 sm:mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
