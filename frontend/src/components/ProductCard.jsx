import { getCategoryLabel } from '../utils/labels';

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

export default function ProductCard({ product, index = 0, onAdd }) {
  const sizeLabel = `${formatDimension(product.lengthCm)} x ${formatDimension(product.widthCm)} x ${formatDimension(product.heightCm)} cm`;
  const weightLabel = formatWeight(product.weightG);

  return (
    <article
      className="group relative flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
          <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 font-semibold">
            {getCategoryLabel(product.category)}
          </span>
          <span className="font-semibold text-slate-400">商品ID {product.id}</span>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-900">
          {product.nameJp || product.name}
        </h3>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-600">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">サイズ</span>
          <span className="font-semibold text-slate-800">{sizeLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">重量</span>
          <span className="font-semibold text-slate-800">{weightLabel}</span>
        </div>
      </div>

      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 w-full rounded-full border border-slate-200/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
        >
          カートに追加
        </button>
      ) : null}
    </article>
  );
}
