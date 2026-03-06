import { createElement, useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { getCategoryLabel } from '../utils/labels';
import { getIconForProduct } from '../utils/productIcons';
import { CATEGORY_COLORS } from '../utils/colors';

const formatDimension = (value) => Number(value).toFixed(1);

const formatWeight = (weightG) => {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(1)} kg`;
  }
  return `${weightG} g`;
};

const MotionArticle = motion.article;

export default function ProductCard({
  product,
  onAdd,
  onToggleLike,
  liked = false,
  onDelete,
  deleteLabel = '削除',
  index = 0,
}) {
  const sizeLabel = `${formatDimension(product.lengthCm)} x ${formatDimension(product.widthCm)} x ${formatDimension(product.heightCm)} cm`;
  const weightLabel = formatWeight(product.weightG);
  const categoryColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.Other;

  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setSupportsHover(media.matches);
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!supportsHover) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateY: (x - 0.5) * 16,
      rotateX: (0.5 - y) * 16,
    });
    setGlowPos({ x: x * 100, y: y * 100 });
  }, [supportsHover]);

  const handleMouseEnter = useCallback(() => {
    if (!supportsHover) return;
    setIsHovering(true);
  }, [supportsHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  const sourceLabel = product.source === 'saved' ? 'マイ商品' : null;

  return (
    <MotionArticle
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: supportsHover ? tilt.rotateX : 0,
        rotateY: supportsHover ? tilt.rotateY : 0,
        scale: supportsHover && isHovering ? 1.04 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.01 }}
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
      className="group relative flex w-full items-start justify-between gap-2 rounded-xl border border-white/60 bg-white/40 p-1.5 pr-2 sm:gap-3 sm:p-3 sm:pr-3 shadow-sm backdrop-blur-md overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${categoryColor.glow} 0%, transparent 60%)`,
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`flex h-5 w-5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg ${categoryColor.bg}`}>
            {createElement(getIconForProduct(product), { className: 'h-2.5 w-2.5 sm:h-4 sm:w-4' })}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[0.5rem] sm:text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                {getCategoryLabel(product.category)}
              </div>
              {sourceLabel ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {sourceLabel}
                </span>
              ) : null}
            </div>
            <h3
              className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-900 leading-tight"
              title={product.nameJp || product.name}
            >
              {product.nameJp || product.name}
            </h3>
          </div>
        </div>
        <div className="hidden sm:flex mt-2 flex-wrap gap-2 text-[0.625rem] text-slate-500">
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {sizeLabel}
          </span>
          <span className="truncate rounded-md bg-white/50 px-1 sm:px-1.5 py-0.5">
            {weightLabel}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-full shrink-0 flex-col items-end justify-between gap-2 self-stretch">
        {onToggleLike ? (
          <button
            type="button"
            onClick={onToggleLike}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition sm:h-8 sm:w-8 ${
              liked
                ? 'border-rose-200 bg-rose-50 text-rose-500'
                : 'border-slate-200 bg-white/95 text-slate-500 hover:border-rose-200 hover:text-rose-500'
            }`}
            aria-label={liked ? 'お気に入りを解除' : 'お気に入りに追加'}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          </button>
        ) : (
          <div className="h-0" />
        )}

        <div className="flex items-center gap-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
              aria-label={deleteLabel}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}

          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
              aria-label="カートに追加"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </MotionArticle>
  );
}
