import { motion } from 'framer-motion';
import { Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

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
      <div className="space-y-4 rounded-3xl border border-white/60 bg-white/40 p-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
          <p className="font-medium text-slate-500">最適な配送方法を計算中...</p>
        </div>
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-white/50" />
          <div className="h-16 animate-pulse rounded-2xl bg-white/30" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-rose-200 bg-rose-50/90 p-6 text-sm text-rose-700 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!calculation) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/30 p-8 text-center"
      >
        <div className="mb-4 rounded-full bg-white/50 p-4 font-display text-2xl shadow-sm text-slate-300">
          ¥
        </div>
        <p className="text-sm font-medium text-slate-500">
          計算を実行して最適な配送方法を確認。
        </p>
      </motion.div>
    );
  }

  const { dimensions, recommended, options } = calculation;
  const dimensionLabel = `${formatDimension(dimensions.lengthCm)} x ${formatDimension(dimensions.widthCm)} x ${formatDimension(dimensions.heightCm)} cm`;
  const weightLabel = formatWeight(dimensions.weightG);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">発送内容</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{dimensionLabel}</p>
            <p className="text-sm text-slate-500 font-medium">{weightLabel} • {dimensions.itemCount} 点</p>
          </div>
          <div className="rounded-full bg-slate-100 p-3 text-slate-400">
            <Truck className="h-6 w-6" />
          </div>
        </div>
      </motion.div>

      {/* Options */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          <span className="h-px flex-1 bg-slate-200"></span>
          おすすめの配送方法
          <span className="h-px flex-1 bg-slate-200"></span>
        </h4>

        {options && options.length ? (
          <div className="space-y-4">
            {options.map((option, index) => {
              const isRecommended = option.recommended;
              return (
                <motion.div
                  key={`${option.id}-${option.serviceName}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative overflow-hidden rounded-3xl border p-6 transition-all duration-300",
                    isRecommended
                      ? "border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-500/10"
                      : "border-slate-200/60 bg-white/60 hover:border-slate-300 hover:bg-white"
                  )}
                >
                  {isRecommended && (
                    <div className="absolute top-0 right-0 rounded-bl-2xl bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      最安・最適
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                        isRecommended ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {isRecommended ? <CheckCircle2 className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-slate-900">
                          {option.serviceName}
                        </h5>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {option.companyName}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-sm">
                          {option.reason}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold tracking-tight text-slate-900">
                        ¥{option.priceYen.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            利用可能な配送方法が見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
