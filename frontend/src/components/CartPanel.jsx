import { getCategoryLabel } from '../utils/labels';
import { getIconForProduct } from '../utils/productIcons';

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

export default function CartPanel({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCalculate,
  loading,
  containerRef,
}) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = items.reduce(
    (sum, item) => sum + item.quantity * item.product.weightG,
    0,
  );

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">カート</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">選択中の商品</h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!items.length}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-600 disabled:opacity-40"
        >
          クリア
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/70 px-4 py-5 text-center text-sm text-slate-500">
          商品をカートに追加してください。
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  {(() => {
                    const Icon = getIconForProduct(item.product);
                    return <Icon className="h-5 w-5" />;
                  })()}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{item.product.nameJp || item.product.name}</p>
                  <p className="text-xs text-slate-500">{getCategoryLabel(item.product.category)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDecrement(item.product.id)}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300"
                >
                  -
                </button>
                <span className="w-6 text-center font-semibold text-slate-800">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onIncrement(item.product.id)}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.product.id)}
                  className="ml-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">合計</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {totalItems} 点 / {formatWeight(totalWeight)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCalculate}
          disabled={!items.length || loading}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-40"
        >
          {loading ? '計算中...' : '送料を計算'}
        </button>
      </div>
    </div>
  );
}
