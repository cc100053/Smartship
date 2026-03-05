import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Box } from 'lucide-react';
import { Scene, CanvasErrorBoundary } from '../components/ParcelVisualizer3D';
import { useBroadcastReceiver } from '../hooks/useViewerBroadcast';
import { getReferenceModel } from '../utils/referenceObjectUtils';

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
  const referenceModel = hasDimensions ? getReferenceModel(dimensions) : null;

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
        <Box style={{ width: 32, height: 32, opacity: 0.5, color: '#ffffff' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          {connected ? 'アイテムを追加してください...' : 'メイン画面に接続中...'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative' }}>
      <CanvasErrorBoundary>
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
          <Scene
            placements={displayPlacements}
            maxDim={maxDim}
            dimensions={dimensions}
          />
        </Canvas>
      </CanvasErrorBoundary>
      {referenceModel && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(2, 6, 23, 0.82)',
          color: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(148, 163, 184, 0.5)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}>
          参照物: {referenceModel.name}
        </div>
      )}
    </div>
  );
}
