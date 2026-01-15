import { motion } from 'framer-motion';
import { Box, Scale, Layers } from 'lucide-react';
import { cn } from '../utils/cn';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

export default function ParcelVisualizer3D({ dimensions, mode }) {
  const hasDimensions =
    dimensions &&
    dimensions.lengthCm > 0 &&
    dimensions.widthCm > 0 &&
    dimensions.heightCm > 0;

  const lengthCm = hasDimensions ? dimensions.lengthCm : 0;
  const widthCm = hasDimensions ? dimensions.widthCm : 0;
  const heightCm = hasDimensions ? dimensions.heightCm : 0;

  const maxCm = hasDimensions ? Math.max(lengthCm, widthCm, heightCm) : 1;
  const scale = clamp(180 / maxCm, 0.8, 4);

  const boxWidth = clamp(lengthCm * scale, 70, 240);
  const boxDepth = clamp(widthCm * scale, 70, 220);
  const boxHeight = clamp(heightCm * scale, 50, 200);

  const dimensionLabel = hasDimensions
    ? `${formatDimension(lengthCm)} x ${formatDimension(widthCm)} x ${formatDimension(heightCm)} cm`
    : '-';
  const weightLabel =
    dimensions && Number.isFinite(dimensions.weightG) && dimensions.weightG > 0
      ? formatWeight(dimensions.weightG)
      : '-';
  const countLabel =
    dimensions && Number.isFinite(dimensions.itemCount) && dimensions.itemCount > 0
      ? `${dimensions.itemCount} 点`
      : '-';

  const emptyMessage =
    mode === 'manual'
      ? 'サイズを入力して3D表示を確認。'
      : '商品をカートに追加して確認。';

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
        <div
          className="relative flex h-36 sm:h-48 items-center justify-center rounded-xl sm:rounded-2xl border border-white/50 bg-gradient-to-br from-slate-50/50 to-slate-100/50 shadow-inner"
          style={{ perspective: '800px' }}
        >
          {hasDimensions ? (
            <motion.div
              className="relative"
              initial={{ rotateX: -20, rotateY: 30 }}
              animate={{
                rotateX: -20,
                rotateY: [30, 390] // Full rotation
              }}
              transition={{
                rotateY: {
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
              style={{
                width: boxWidth,
                height: boxHeight,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-lg border border-amber-500/20 bg-amber-100/90"
                style={{
                  width: boxWidth,
                  height: boxHeight,
                  transform: `translateZ(${boxDepth / 2}px)`,
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <Box className="h-8 w-8 text-amber-500/40" />
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-lg border border-amber-500/20 bg-amber-100/90"
                style={{
                  width: boxWidth,
                  height: boxHeight,
                  transform: `rotateY(180deg) translateZ(${boxDepth / 2}px)`,
                }}
              />

              {/* Right */}
              <div
                className="absolute top-0 left-0 rounded-lg border border-amber-600/20 bg-amber-200/90"
                style={{
                  width: boxDepth,
                  height: boxHeight,
                  transform: `rotateY(90deg) translateZ(${boxWidth / 2}px)`,
                  left: (boxWidth - boxDepth) / 2
                }}
              />

              {/* Left */}
              <div
                className="absolute top-0 left-0 rounded-lg border border-amber-600/20 bg-amber-200/90"
                style={{
                  width: boxDepth,
                  height: boxHeight,
                  transform: `rotateY(-90deg) translateZ(${boxWidth / 2}px)`,
                  left: (boxWidth - boxDepth) / 2
                }}
              />

              {/* Top */}
              <div
                className="absolute top-0 left-0 rounded-lg border border-amber-200/30 bg-amber-50/90"
                style={{
                  width: boxWidth,
                  height: boxDepth,
                  transform: `rotateX(90deg) translateZ(${boxHeight / 2}px)`,
                  top: (boxHeight - boxDepth) / 2
                }}
              />

              {/* Bottom */}
              <div
                className="absolute top-0 left-0 rounded-lg border border-amber-600/30 bg-amber-300/90"
                style={{
                  width: boxWidth,
                  height: boxDepth,
                  transform: `rotateX(-90deg) translateZ(${boxHeight / 2}px)`,
                  top: (boxHeight - boxDepth) / 2
                }}
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
                <Box className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {emptyMessage}
              </p>
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
            value={weightLabel}
            icon={<Box className="h-4 w-4 text-emerald-500" />}
          />
          <InfoCard
            label="点数"
            value={countLabel}
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
