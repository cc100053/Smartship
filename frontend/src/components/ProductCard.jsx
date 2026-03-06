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
  const topAction = onToggleLike
    ? {
      onClick: onToggleLike,
      label: liked ? 'お気に入り解除' : 'お気に入り',
      icon: Heart,
      className: liked
        ? 'border-rose-200 bg-rose-50/95 text-rose-600 shadow-[0_10px_24px_-18px_rgba(244,63,94,0.95)]'
        : 'border-slate-200 bg-white/92 text-slate-500 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50/70',
      iconClassName: liked ? 'fill-current' : '',
      ariaLabel: liked ? 'お気に入りを解除' : 'お気に入りに追加',
    }
    : onDelete
      ? {
        onClick: onDelete,
        label: deleteLabel,
        icon: Trash2,
        className: 'border-amber-200 bg-amber-50/95 text-amber-700 hover:border-amber-300 hover:text-amber-800',
        iconClassName: '',
        ariaLabel: deleteLabel,
      }
      : null;
  const TopActionIcon = topAction?.icon ?? null;

  return (
    <MotionArticle
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: supportsHover ? tilt.rotateX : 0,
        rotateY: supportsHover ? tilt.rotateY : 0,
        scale: supportsHover && isHovering ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.01 }}
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
      className="group relative flex min-h-[8.75rem] w-full flex-col overflow-hidden rounded-xl border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-md sm:min-h-[9.5rem] sm:p-3"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${categoryColor.glow} 0%, transparent 60%)`,
        }}
      />

      {topAction ? (
        <button
          type="button"
          onClick={topAction.onClick}
          className={`absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border transition sm:h-10 sm:w-10 ${topAction.className}`}
          aria-label={topAction.ariaLabel}
        >
          {TopActionIcon ? <TopActionIcon className={`h-4 w-4 ${topAction.iconClassName}`} /> : null}
        </button>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col justify-between pr-14 py-0.5 sm:pr-16">
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
        <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6rem] text-slate-500 sm:gap-2 sm:text-[0.625rem]">
          <span className="truncate rounded-md bg-white/50 px-1 py-0.5 sm:px-1.5">
            {sizeLabel}
          </span>
          <span className="truncate rounded-md bg-white/50 px-1 py-0.5 sm:px-1.5">
            {weightLabel}
          </span>
        </div>
      </div>

      {onAdd ? (
        <div className="relative z-10 mt-3 -mx-2 -mb-2 sm:-mx-3 sm:-mb-3">
          <button
            type="button"
            onClick={(event) => onAdd(event.currentTarget)}
            className="flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-b-xl border-t border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(231,240,255,0.72)_45%,rgba(229,231,255,0.82)_100%)] px-3 py-2 text-center text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_-12px_24px_-22px_rgba(99,102,241,0.28)] backdrop-blur-xl transition-all duration-200 ease-out hover:border-fuchsia-200/80 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,232,255,0.88)_38%,rgba(224,236,255,0.94)_100%)] hover:text-slate-950 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_-16px_28px_-18px_rgba(217,70,239,0.38),0_0_0_1px_rgba(244,114,182,0.18)] active:scale-[0.99] active:bg-[linear-gradient(135deg,rgba(241,245,255,0.96)_0%,rgba(232,240,255,0.9)_100%)] active:shadow-[inset_0_2px_10px_rgba(99,102,241,0.12),0_-6px_16px_-16px_rgba(79,70,229,0.26)]"
            aria-label="カートに追加"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/65 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="text-[0.82rem] font-semibold tracking-[0.04em]">
              追加
            </span>
          </button>
        </div>
      ) : null}
    </MotionArticle>
  );
}
