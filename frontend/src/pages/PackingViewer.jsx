import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene, CanvasErrorBoundary } from '../components/ParcelVisualizer3D';
import { useBroadcastReceiver } from '../hooks/useViewerBroadcast';

export default function PackingViewer() {
  const { dimensions, placements, connected } = useBroadcastReceiver();

  const hasDimensions = dimensions &&
    dimensions.lengthCm > 0 &&
    dimensions.widthCm > 0 &&
    dimensions.heightCm > 0;
  const hasPlacements = placements && placements.length > 0;

  const displayPlacements = useMemo(() => {
    if (hasPlacements) return placements;
    if (!hasDimensions) return [];

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

  if (!connected || displayPlacements.length === 0) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          {connected ? 'アイテムを追加してください...' : 'メイン画面に接続中...'}
        </p>
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <CanvasErrorBoundary>
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
          <Scene
            placements={displayPlacements}
            maxDim={maxDim}
            dimensions={dimensions}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
