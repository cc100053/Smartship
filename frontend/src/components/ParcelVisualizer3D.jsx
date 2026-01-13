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
      : '重量を入力すると表示されます。';
  const countLabel =
    dimensions && Number.isFinite(dimensions.itemCount) && dimensions.itemCount > 0
      ? `${dimensions.itemCount} 点`
      : '-';

  const emptyMessage =
    mode === 'manual'
      ? 'サイズを入力すると3D表示が更新されます。'
      : 'カートに商品を追加すると3D表示が更新されます。';

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">3D ビュー</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">荷物サイズの可視化</h3>
        </div>
        <span className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {mode === 'manual' ? '手動' : 'カート'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
        <div
          className="relative flex h-60 items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50 via-white to-sky-50"
          style={{ perspective: '800px' }}
        >
          {hasDimensions ? (
            <div
              className="relative"
              style={{
                width: `${boxWidth}px`,
                height: `${boxHeight}px`,
                transformStyle: 'preserve-3d',
                transform: 'rotateX(-18deg) rotateY(32deg)',
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-amber-50 to-white/90 shadow-lg"
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                  transform: `translate(-50%, -50%) translateZ(${boxDepth / 2}px)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-200 via-amber-100 to-white/90"
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                  transform: `translate(-50%, -50%) rotateY(180deg) translateZ(${boxDepth / 2}px)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-200 via-amber-100 to-white/80"
                style={{
                  width: `${boxDepth}px`,
                  height: `${boxHeight}px`,
                  transform: `translate(-50%, -50%) rotateY(90deg) translateZ(${boxWidth / 2}px)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-amber-50 to-white/90"
                style={{
                  width: `${boxDepth}px`,
                  height: `${boxHeight}px`,
                  transform: `translate(-50%, -50%) rotateY(-90deg) translateZ(${boxWidth / 2}px)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50 to-amber-100"
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxDepth}px`,
                  transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${boxHeight / 2}px)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-200 via-amber-100 to-white/90"
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxDepth}px`,
                  transform: `translate(-50%, -50%) rotateX(-90deg) translateZ(${boxHeight / 2}px)`,
                }}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
              {emptyMessage}
            </p>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">サイズ</p>
            <p className="mt-1 font-semibold text-slate-800">{dimensionLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">重量</p>
            <p className="mt-1 font-semibold text-slate-800">{weightLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">点数</p>
            <p className="mt-1 font-semibold text-slate-800">{countLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
