const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

const formatDimension = (value) => Number(value).toFixed(1);

export default function ShippingResult({ calculation, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/60 px-4 py-10 text-center text-sm text-slate-500">
        計算するとおすすめの配送方法が表示されます。
      </div>
    );
  }

  const { dimensions, recommended, options } = calculation;
  const dimensionLabel = `${formatDimension(dimensions.lengthCm)} x ${formatDimension(dimensions.widthCm)} x ${formatDimension(dimensions.heightCm)} cm`;
  const weightLabel = formatWeight(dimensions.weightG);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">荷物サマリー</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-base font-semibold text-slate-900">{dimensionLabel}</p>
            <p className="text-xs text-slate-500">{weightLabel} / {dimensions.itemCount} 点</p>
          </div>
          {recommended ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              おすすめ
            </span>
          ) : null}
        </div>
      </div>

      {options && options.length ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
          <h4 className="text-lg font-semibold text-slate-900">配送オプション</h4>
          <div className="mt-4 space-y-3">
            {options.map((option) => (
              <div
                key={`${option.id}-${option.serviceName}`}
                className={[
                  'rounded-2xl border px-4 py-3 text-sm',
                  option.recommended
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200/70 bg-slate-50/70',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {option.companyName} / {option.serviceName}
                    </p>
                    <p className="text-xs text-slate-500">{option.reason}</p>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{option.priceYen} 円</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          該当する配送方法がありません。
        </div>
      )}
    </div>
  );
}
