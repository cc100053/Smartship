import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Heart, LogIn, PackagePlus, Star, Trash2 } from 'lucide-react';
import ProductCard from './ProductCard';
import { getCategoryLabel } from '../utils/labels';

const INITIAL_FORM = {
  name: '',
  category: 'Other',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightG: '',
};

const MotionDiv = motion.div;
const SHELF_GRID_CLASSNAME = 'grid grid-cols-1 gap-3 sm:grid-cols-2 max-h-[22rem] overflow-y-auto pr-1 custom-scrollbar';

const toPositiveNumber = (value) => {
  if (value === '') return NaN;
  return Number(value);
};

export default function PersonalizedProductsSection({
  authenticated,
  categories,
  savedProducts,
  likedProducts,
  likedProductIds,
  onAddProduct,
  onToggleLike,
  onCreateSavedProduct,
  onDeleteSavedProduct,
  onOpenLogin,
  loading,
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');

  const availableCategories = useMemo(() => {
    const normalized = categories
      .filter((item) => item?.value && item.value !== 'ALL')
      .map((item) => item.value);

    return Array.from(new Set([...normalized, 'Other']));
  }, [categories]);

  const totalItems = savedProducts.length + likedProducts.length;
  const totalSaved = savedProducts.length;
  const totalLiked = likedProducts.length;
  const summaryText = authenticated
    ? `マイ商品 ${totalSaved} 件・お気に入り ${totalLiked} 件`
    : 'ログインすると、よく使う商品とお気に入り商品をここにまとめられます。';

  const handleChange = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      category: form.category,
      lengthCm: toPositiveNumber(form.lengthCm),
      widthCm: toPositiveNumber(form.widthCm),
      heightCm: toPositiveNumber(form.heightCm),
      weightG: Math.round(toPositiveNumber(form.weightG)),
    };

    if (!payload.name) {
      setError('商品名を入力してください。');
      return;
    }

    if (
      [payload.lengthCm, payload.widthCm, payload.heightCm, payload.weightG].some(
        (value) => Number.isNaN(value) || value <= 0,
      )
    ) {
      setError('サイズと重量は正の数で入力してください。');
      return;
    }

    try {
      await onCreateSavedProduct(payload);
      setForm(INITIAL_FORM);
      setError('');
      setExpanded(true);
    } catch (createError) {
      setError(createError?.message || '商品の保存に失敗しました。');
    }
  };

  return (
    <section className="relative mb-4 overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(244,247,251,0.78)_100%)] px-4 py-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(90deg,rgba(99,102,241,0.08),rgba(56,189,248,0.08),rgba(251,191,36,0.06))]" />
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="relative flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">マイセクション</p>
            <span className="rounded-full border border-white/80 bg-white/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-slate-600 shadow-sm">
              QUICK SHELF
            </span>
            <span className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.85)]">
              {totalItems}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {authenticated ? (
              <>
                <span className="rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  マイ商品 {totalSaved}
                </span>
                <span className="rounded-full border border-rose-200/80 bg-rose-50/90 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  お気に入り {totalLiked}
                </span>
              </>
            ) : (
              <span className="rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                ログインで有効化
              </span>
            )}
          </div>
          <p className="mt-2 truncate text-sm font-medium text-slate-700">
            {summaryText}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/72 shadow-sm">
          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {!authenticated ? (
              <div className="mt-4 rounded-[1.5rem] border border-white/80 bg-white/78 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">ログインするとこのセクションが使えます</p>
                    <p className="mt-1 text-sm text-slate-500">
                      よく発送する商品を保存したり、既存商品をお気に入りに追加して上部にまとめたりできます。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(15,23,42,0.85)]"
                  >
                    <LogIn className="h-4 w-4" />
                    ログインする
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="mt-4 rounded-[1.5rem] border border-white/80 bg-white/82 p-4 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.55)]"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <PackagePlus className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">よく使う商品を追加</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="block xl:col-span-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">商品名</span>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        placeholder="例: トレカセット"
                        className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">カテゴリ</span>
                      <select
                        value={form.category}
                        onChange={(event) => handleChange('category', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      >
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>{getCategoryLabel(category)}</option>
                        ))}
                      </select>
                    </label>

                    {[
                      ['lengthCm', '長さ (cm)'],
                      ['widthCm', '幅 (cm)'],
                      ['heightCm', '高さ (cm)'],
                      ['weightG', '重量 (g)'],
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</span>
                        <input
                          type="number"
                          min="0"
                          step={key === 'weightG' ? '1' : '0.1'}
                          value={form[key]}
                          onChange={(event) => handleChange(key, event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                      </label>
                    ))}
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#312e81_55%,#1d4ed8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(49,46,129,0.85)] transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      マイ商品に保存
                    </button>
                  </div>
                </form>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-white/80 bg-white/70 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                          <Star className="h-4 w-4" />
                        </div>
                        マイ商品
                      </div>
                      <span className="rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {totalSaved} 件
                      </span>
                    </div>
                    {savedProducts.length ? (
                      <div className={SHELF_GRID_CLASSNAME}>
                        {savedProducts.map((product, index) => (
                          <ProductCard
                            key={`saved:${product.id}`}
                            product={product}
                            index={index}
                            onAdd={() => onAddProduct(product)}
                            onDelete={() => onDeleteSavedProduct(product.id)}
                            deleteLabel="マイ商品を削除"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-4 text-sm text-slate-500">
                        まだ保存したマイ商品はありません。
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.4rem] border border-white/80 bg-white/70 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                          <Heart className="h-4 w-4" />
                        </div>
                        お気に入りに追加した既存商品
                      </div>
                      <span className="rounded-full border border-rose-200/80 bg-rose-50/90 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        {totalLiked} 件
                      </span>
                    </div>
                    {likedProducts.length ? (
                      <div className={SHELF_GRID_CLASSNAME}>
                        {likedProducts.map((product, index) => (
                          <ProductCard
                            key={`liked:${product.id}`}
                            product={product}
                            index={index}
                            onAdd={() => onAddProduct(product)}
                            onToggleLike={() => onToggleLike(product)}
                            liked={likedProductIds.has(Number(product.id))}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-4 text-sm text-slate-500">
                        まだお気に入りに追加した商品はありません。
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
