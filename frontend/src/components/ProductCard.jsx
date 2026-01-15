import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { getCategoryLabel } from '../utils/labels';

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

  return (
    <motion.article
      whileHover={{ y: -2 }}
      className="group relative flex w-full items-center justify-between gap-2 sm:gap-3 rounded-xl border border-white/60 bg-white/40 p-2 sm:p-3 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md overflow-hidden"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <PackageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {getCategoryLabel(product.category)}
            </div>
            <h3 className="truncate text-xs sm:text-sm font-bold text-slate-900">
              {product.nameJp || product.name}
            </h3>
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 text-[9px] sm:text-[10px] text-slate-500">
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {sizeLabel}
          </span>
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {weightLabel}
          </span>
        </div>
      </div>

      {onAdd ? (
        <motion.button
          type="button"
          onClick={onAdd}
          whileTap={{ scale: 0.95 }}
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      ) : null}
    </motion.article>
  );
}

function PackageIcon(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 9.4 7.5 4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
