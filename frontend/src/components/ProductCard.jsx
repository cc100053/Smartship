import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { getCategoryLabel } from '../utils/labels';
import { getIconForProduct } from '../utils/productIcons';

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};


export default function ProductCard({ product, onAdd, index = 0 }) {
  const sizeLabel = `${formatDimension(product.lengthCm)} x ${formatDimension(product.widthCm)} x ${formatDimension(product.heightCm)} cm`;
  const weightLabel = formatWeight(product.weightG);
  const Icon = getIconForProduct(product);

  return (
    <motion.article
      className="group relative flex w-full items-center justify-between gap-2 sm:gap-3 rounded-xl border border-white/60 bg-white/40 p-2 sm:p-3 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md overflow-hidden"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[0.5rem] sm:text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
              {getCategoryLabel(product.category)}
            </div>
            <h3
              className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-900 leading-tight"
              title={product.nameJp || product.name}
            >
              {product.nameJp || product.name}
            </h3>
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 text-[0.56rem] sm:text-[0.625rem] text-slate-500">
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {sizeLabel}
          </span>
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {weightLabel}
          </span>
        </div>
      </div>

      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </motion.article>
  );
}


