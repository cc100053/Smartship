import { useRef, useMemo, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Box, Layers, Scale } from 'lucide-react';
import {
  getReferenceModel,
  calculateAABB,
  calculateReferencePosition,
  GHOST_MATERIAL
} from '../utils/referenceObjectUtils';
import * as THREE from 'three';

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

// ── Edges helper (memoized to avoid GPU leak) ─────────────────────
function BoxEdges({ width, height, depth, color = 'white', opacity = 0.6 }) {
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    return edges;
  }, [width, height, depth]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} opacity={opacity} transparent />
    </lineSegments>
  );
}

// ── PlacedBox — same structure as the original working code ───────
function PlacedBox({ info, scale }) {
  const width = info.width * scale;
  const depth = info.depth * scale;
  const height = info.height * scale;

  const x = info.x * scale + width / 2;
  const z = info.y * scale + depth / 2;
  const y = info.z * scale + height / 2;

  return (
    <group position={[x, y, z]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={info.color}
          transparent
          opacity={0.7}
          roughness={0.1}
        />
      </mesh>
      <BoxEdges width={width} height={height} depth={depth} />
    </group>
  );
}

// ── Transparent shipping box (glass outline) ──────────────────────
function ShippingBox({ dimensions, scale }) {
  if (!dimensions || !dimensions.lengthCm) return null;

  const width = dimensions.lengthCm * 10 * scale;
  const depth = dimensions.widthCm * 10 * scale;
  const height = dimensions.heightCm * 10 * scale;

  return (
    <group position={[width / 2, height / 2, depth / 2]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          roughness={0.1}
          metalness={0.0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <BoxEdges width={width} height={height} depth={depth} color="#ffffff" opacity={0.35} />
    </group>
  );
}

// ── Reference Object (hologram ghost) ─────────────────────────────
function ReferenceObject({ position, size, scale }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.material.opacity =
        Math.sin(clock.getElapsedTime() * 2) * 0.05 + 0.2;
    }
  });

  const width = size.width * 10 * scale;
  const height = size.height * 10 * scale;
  const depth = size.depth * 10 * scale;

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={GHOST_MATERIAL.color}
          metalness={GHOST_MATERIAL.metalness}
          roughness={GHOST_MATERIAL.roughness}
          opacity={GHOST_MATERIAL.opacity}
          transparent={GHOST_MATERIAL.transparent}
          depthWrite={GHOST_MATERIAL.depthWrite}
          emissive={GHOST_MATERIAL.emissive}
          emissiveIntensity={GHOST_MATERIAL.emissiveIntensity}
        />
      </mesh>
      <BoxEdges width={width} height={height} depth={depth} color="#88CCFF" />
      <mesh position={[0, -height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width * 0.3, width * 0.35, 32]} />
        <meshBasicMaterial color="#88CCFF" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ── Scene ─────────────────────────────────────────────────────────
function Scene({ placements, maxDim, dimensions }) {
  const scale = 3 / Math.max(maxDim, 100);
  const aabb = useMemo(() => calculateAABB(placements), [placements]);
  const hasDims = dimensions && dimensions.lengthCm > 0;

  const referenceModel = useMemo(() => {
    if (!hasDims) return null;
    return getReferenceModel(dimensions);
  }, [hasDims, dimensions]);

  const referencePosition = useMemo(() => {
    if (!referenceModel || !placements || placements.length === 0 || !hasDims) return null;
    const maxX = dimensions.lengthCm ? dimensions.lengthCm * 10 : aabb.max.x;
    const maxY = dimensions.widthCm ? dimensions.widthCm * 10 : aabb.max.y;
    const maxZ = dimensions.heightCm ? dimensions.heightCm * 10 : aabb.max.z;
    const boxAABB = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
      center: { x: maxX / 2, y: maxY / 2, z: maxZ / 2 },
      size: { x: maxX, y: maxY, z: maxZ },
    };
    return calculateReferencePosition(boxAABB, referenceModel.realWorldSize, scale, 5);
  }, [aabb, dimensions, hasDims, referenceModel, scale, placements]);

  const centerX = ((hasDims && dimensions.lengthCm ? dimensions.lengthCm * 10 : aabb.max.x) * scale) / 2;
  const centerZ = ((hasDims && dimensions.widthCm ? dimensions.widthCm * 10 : aabb.max.y) * scale) / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 20, 10]} intensity={1.5} />

      <group position={[-centerX, 0, -centerZ]}>
        {/* Glass shipping box */}
        {hasDims && <ShippingBox dimensions={dimensions} scale={scale} />}

        {/* Packed items */}
        {placements && placements.map((p, i) => (
          <PlacedBox key={i} info={p} scale={scale} />
        ))}

        {/* Reference object */}
        {referenceModel && referencePosition && (
          <ReferenceObject
            position={referencePosition}
            size={referenceModel.realWorldSize}
            scale={scale}
          />
        )}
      </group>

      <Grid infiniteGrid fadeDistance={40} fadeStrength={5} />
      <OrbitControls autoRotate autoRotateSpeed={0.7} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      <Environment preset="city" />
    </>
  );
}

// ── Error Boundary ────────────────────────────────────────────────
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('3D Viewer error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white/50">
          <Box className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-xs">3D表示でエラーが発生しました</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-sky-400 hover:text-sky-300 underline"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main Component ────────────────────────────────────────────────
export default function ParcelVisualizer3D({ dimensions, mode, placements = [] }) {
  const hasDimensions = dimensions && dimensions.lengthCm > 0;


  const maxDim = hasDimensions
    ? Math.max(dimensions.lengthCm, dimensions.widthCm, dimensions.heightCm) * 10
    : 100;

  const dimensionLabel = hasDimensions ? (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0 text-left leading-tight">
      <span className="text-[10px] text-slate-400 font-sans self-center">長さ</span>
      <span>{formatDimension(dimensions.lengthCm)} cm</span>
      <span className="text-[10px] text-slate-400 font-sans self-center">幅</span>
      <span>{formatDimension(dimensions.widthCm)} cm</span>
      <span className="text-[10px] text-slate-400 font-sans self-center">高さ</span>
      <span>{formatDimension(dimensions.heightCm)} cm</span>
    </div>
  ) : (
    '-'
  );

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/60 bg-white/40 p-3 sm:p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
        <div>
          <p className="text-[0.5rem] sm:text-[0.625rem] uppercase tracking-wider text-slate-500 font-bold">3D ビュー</p>
          <h3 className="text-base sm:text-xl font-bold text-slate-900">荷物イメージ</h3>
        </div>
        <span className="rounded-full border border-slate-200/50 bg-white/50 px-2 sm:px-3 py-0.5 sm:py-1 text-[0.56rem] sm:text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
          {mode === 'manual' ? '手動' : 'カート'}
        </span>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-[1.5fr_1fr]">
        <div className="relative h-64 sm:h-80 min-h-[16rem] rounded-xl sm:rounded-2xl border border-white/50 bg-slate-900/90 shadow-inner overflow-hidden group">
          {placements && placements.length > 0 ? (
            <CanvasErrorBoundary>
              <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
                <Scene
                  placements={placements}
                  maxDim={maxDim}
                  dimensions={dimensions}
                />
              </Canvas>

            </CanvasErrorBoundary>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <Box className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">アイテムを追加してください</p>
            </div>
          )}

          {/* Reference object legend */}
          {placements && placements.length > 0 && hasDimensions && (
            <div className="absolute bottom-2 left-2 text-[0.625rem] text-white/80 font-medium bg-black/50 px-2 py-1 rounded flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-sky-300/70 animate-pulse"></span>
              <span>参照物: {getReferenceModel(dimensions).name}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <InfoCard
            label="サイズ"
            value={dimensionLabel}
            icon={<Box className="h-4 w-4 text-indigo-500" />}
          />
          <InfoCard
            label="重量"
            value={dimensions?.weightG ? formatWeight(dimensions.weightG) : '-'}
            icon={<Scale className="h-4 w-4 text-emerald-500" />}
          />
          <InfoCard
            label="点数"
            value={dimensions?.itemCount ? `${dimensions.itemCount} 点` : '-'}
            icon={<Layers className="h-4 w-4 text-rose-500" />}
          />
        </div>
      </div>

      <div className="mt-2 text-left">
        <a
          href="https://pj.mercari.com/mercari-spot/mercari_school_list.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.625rem] text-slate-400 hover:text-slate-600 transition-colors leading-3 block"
        >
          参考: https://pj.mercari.com/mercari-spot/mercari_school_list.pdf
        </a>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="group rounded-xl sm:rounded-2xl border border-white/60 bg-white/40 p-2 sm:p-3 transition-colors hover:bg-white/60">
      <div className="flex items-center gap-1.5 sm:gap-2 text-[0.56rem] sm:text-xs uppercase tracking-wider text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 sm:mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}
