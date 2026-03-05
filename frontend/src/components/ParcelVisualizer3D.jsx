import { useEffect, useRef, useMemo, useState, useCallback, Component } from 'react';
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

const DROP_MS = 380;
const SETTLE_MS = 140;
const MOVE_MS = 320;

function getPlacementMetrics(info, scale) {
  const width = info.width * scale;
  const depth = info.depth * scale;
  const height = info.height * scale;

  const x = info.x * scale + width / 2;
  const z = info.y * scale + depth / 2;
  const y = info.z * scale + height / 2;

  return { width, depth, height, x, y, z };
}

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

const getPlacementMatchKey = (placement) => [
  placement.name || '',
  placement.color || '',
  ...[placement.width, placement.depth, placement.height].sort((a, b) => a - b),
].join('|');

const distanceSq = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

function reconcileTrackedPlacements(previous, nextPlacements, tracker) {
  const buckets = new Map();

  previous.forEach((item) => {
    const key = getPlacementMatchKey(item.info);
    const list = buckets.get(key) || [];
    list.push(item);
    buckets.set(key, list);
  });

  const next = [];
  const newIds = [];

  nextPlacements.forEach((placement) => {
    const key = getPlacementMatchKey(placement);
    const candidates = buckets.get(key) || [];

    let match = null;
    if (candidates.length > 0) {
      let bestIndex = 0;
      let bestDistance = Infinity;

      candidates.forEach((candidate, index) => {
        const d = distanceSq(candidate.info, placement);
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = index;
        }
      });

      match = candidates.splice(bestIndex, 1)[0];
    }

    if (match) {
      next.push({ id: match.id, info: placement });
      return;
    }

    const id = `placement-${tracker.nextId++}`;
    next.push({ id, info: placement });
    newIds.push(id);
  });

  return { next, newIds };
}

function MotionPlacedBox({ id, info, scale, isEntering, reduceMotion, onEntryDone }) {
  const groupRef = useRef();
  const materialRef = useRef();
  const metrics = useMemo(() => getPlacementMetrics(info, scale), [info, scale]);

  const basePositionRef = useRef(new THREE.Vector3(metrics.x, metrics.y, metrics.z));
  const moveFromRef = useRef(new THREE.Vector3(metrics.x, metrics.y, metrics.z));
  const moveToRef = useRef(new THREE.Vector3(metrics.x, metrics.y, metrics.z));
  const moveStartedAtRef = useRef(0);

  const entryPhaseRef = useRef(isEntering && !reduceMotion ? 'drop' : 'idle');
  const entryStartedAtRef = useRef(0);
  const entryNotifiedRef = useRef(!isEntering || reduceMotion);

  useEffect(() => {
    const now = performance.now();
    moveFromRef.current.copy(basePositionRef.current);
    moveToRef.current.set(metrics.x, metrics.y, metrics.z);
    moveStartedAtRef.current = now;
  }, [metrics.x, metrics.y, metrics.z]);

  useEffect(() => {
    if (reduceMotion) {
      entryPhaseRef.current = 'idle';
      entryNotifiedRef.current = true;
      return;
    }

    if (isEntering && entryPhaseRef.current === 'idle') {
      entryPhaseRef.current = 'drop';
      entryStartedAtRef.current = performance.now();
      entryNotifiedRef.current = false;
    }
  }, [isEntering, reduceMotion]);

  useFrame(() => {
    if (!groupRef.current) return;

    const now = performance.now();
    const moveProgress = Math.min(1, (now - moveStartedAtRef.current) / MOVE_MS);
    const easedMove = 1 - (1 - moveProgress) ** 3;
    basePositionRef.current.lerpVectors(moveFromRef.current, moveToRef.current, easedMove);

    const dropOffset = Math.max(metrics.height * 0.72, 0.35);
    let entryYOffset = 0;
    let zRotation = 0;
    let opacity = 0.72;

    if (!reduceMotion && entryPhaseRef.current === 'drop') {
      const t = Math.min(1, (now - entryStartedAtRef.current) / DROP_MS);
      const easedDrop = 1 - (1 - t) ** 3;
      entryYOffset = (1 - easedDrop) * dropOffset;
      zRotation = (1 - easedDrop) * 0.1;
      opacity = 0.74;

      if (t >= 1) {
        entryPhaseRef.current = 'settle';
        entryStartedAtRef.current = now;
      }
    } else if (!reduceMotion && entryPhaseRef.current === 'settle') {
      const t = Math.min(1, (now - entryStartedAtRef.current) / SETTLE_MS);
      const damp = Math.exp(-5 * t);
      const bounce = Math.sin(t * Math.PI * 2.2) * damp;
      entryYOffset = bounce * Math.max(metrics.height * 0.07, 0.025);
      zRotation = bounce * 0.04;
      opacity = 0.74;

      if (t >= 1) {
        entryPhaseRef.current = 'idle';
        if (!entryNotifiedRef.current) {
          entryNotifiedRef.current = true;
          onEntryDone(id);
        }
      }
    }

    groupRef.current.position.set(
      basePositionRef.current.x,
      basePositionRef.current.y + entryYOffset,
      basePositionRef.current.z,
    );
    groupRef.current.rotation.set(0, 0, zRotation);

    if (materialRef.current) {
      materialRef.current.opacity = opacity;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[metrics.width, metrics.height, metrics.depth]} />
        <meshStandardMaterial
          ref={materialRef}
          color={info.color}
          transparent
          opacity={0.72}
          roughness={0.1}
        />
      </mesh>
      <BoxEdges width={metrics.width} height={metrics.height} depth={metrics.depth} opacity={0.66} />
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
  const controlsRef = useRef();
  const nextIdRef = useRef(0);
  const [placementState, setPlacementState] = useState({
    tracked: [],
    enteringIds: [],
  });

  const reduceMotion = useMemo(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ), []);

  const placementSignature = useMemo(
    () => placements
      .map((p) => `${p.x}:${p.y}:${p.z}:${p.width}:${p.depth}:${p.height}`)
      .join('|'),
    [placements],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlacementState((previous) => {
        const tracker = { nextId: nextIdRef.current };
        const { next, newIds } = reconcileTrackedPlacements(previous.tracked, placements, tracker);
        nextIdRef.current = tracker.nextId;

        const nextIdSet = new Set(next.map((item) => item.id));
        const persistedEntering = previous.enteringIds.filter((id) => nextIdSet.has(id));
        const mergedEntering = reduceMotion ? [] : [...persistedEntering];

        if (!reduceMotion) {
          newIds.forEach((id) => {
            if (!mergedEntering.includes(id)) {
              mergedEntering.push(id);
            }
          });
        }

        return {
          tracked: next,
          enteringIds: mergedEntering,
        };
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [placementSignature, placements, reduceMotion]);

  const trackedPlacements = placementState.tracked;
  const enteringIds = placementState.enteringIds;
  const enteringIdSet = useMemo(() => new Set(enteringIds), [enteringIds]);
  const hasActiveEntryAnimation = !reduceMotion && enteringIds.length > 0;

  const placementInfos = useMemo(
    () => trackedPlacements.map((item) => item.info),
    [trackedPlacements],
  );
  const aabb = useMemo(() => calculateAABB(placementInfos), [placementInfos]);

  const hasDims = dimensions &&
    dimensions.lengthCm > 0 &&
    dimensions.widthCm > 0 &&
    dimensions.heightCm > 0;

  const referenceModel = useMemo(() => {
    if (!hasDims) return null;
    return getReferenceModel(dimensions);
  }, [hasDims, dimensions]);

  const referencePosition = useMemo(() => {
    if (!referenceModel || !hasDims) return null;
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
  }, [aabb, dimensions, hasDims, referenceModel, scale]);

  const centerX = ((hasDims && dimensions.lengthCm ? dimensions.lengthCm * 10 : aabb.max.x) * scale) / 2;
  const centerZ = ((hasDims && dimensions.widthCm ? dimensions.widthCm * 10 : aabb.max.y) * scale) / 2;

  const handleEntryDone = useCallback((id) => {
    setPlacementState((previous) => {
      if (!previous.enteringIds.includes(id)) return previous;
      return {
        ...previous,
        enteringIds: previous.enteringIds.filter((value) => value !== id),
      };
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 20, 10]} intensity={1.5} />

      <group position={[-centerX, 0, -centerZ]}>
        {/* Glass shipping box */}
        {hasDims && <ShippingBox dimensions={dimensions} scale={scale} />}

        {/* Packed items */}
        {trackedPlacements.map((item) => (
          <MotionPlacedBox
            key={item.id}
            id={item.id}
            info={item.info}
            scale={scale}
            isEntering={enteringIdSet.has(item.id)}
            reduceMotion={reduceMotion}
            onEntryDone={handleEntryDone}
          />
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
      <OrbitControls
        ref={controlsRef}
        autoRotate={!hasActiveEntryAnimation}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 1.75}
      />
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
export default function ParcelVisualizer3D({ dimensions, mode, placements = [], loading = false }) {
  const hasDimensions = dimensions &&
    dimensions.lengthCm > 0 &&
    dimensions.widthCm > 0 &&
    dimensions.heightCm > 0;
  const hasPlacements = placements && placements.length > 0;

  const displayPlacements = useMemo(() => {
    if (hasPlacements) {
      return placements;
    }
    if (!hasDimensions) {
      return [];
    }

    // Fallback preview when backend returns dimensions without per-item placements.
    return [{
      x: 0,
      y: 0,
      z: 0,
      width: Math.max(1, Math.round(dimensions.lengthCm * 10)),
      depth: Math.max(1, Math.round(dimensions.widthCm * 10)),
      height: Math.max(1, Math.round(dimensions.heightCm * 10)),
      color: '#38bdf8',
      name: 'Package',
    }];
  }, [dimensions, hasDimensions, hasPlacements, placements]);


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
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-white/60">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white mb-2" />
              <p className="text-xs">3Dプレビューを更新中...</p>
            </div>
          ) : displayPlacements.length > 0 ? (
            <CanvasErrorBoundary>
              <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
                <Scene
                  placements={displayPlacements}
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
          {displayPlacements.length > 0 && hasDimensions && (
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
