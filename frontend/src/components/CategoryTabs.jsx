import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { CATEGORY_COLORS } from '../utils/colors';
import { CATEGORY_ICONS } from '../utils/productIcons';

export default function CategoryTabs({ categories, value, onChange }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -150 : 150;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Left button */}
      <button
        type="button"
        onClick={() => scroll('left')}
        className={cn(
          "shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-opacity",
          showLeft ? "opacity-100" : "opacity-30 pointer-events-none"
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Tabs container */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide"
      >
        {categories.map((category) => {
          const item =
            typeof category === 'string' ? { value: category, label: category } : category;
          const isActive = item.value === value;
          const categoryColor = CATEGORY_COLORS[item.value] || CATEGORY_COLORS.Other;
          const Icon = CATEGORY_ICONS[item.value] || CATEGORY_ICONS.Other;

          const categoryBg = categoryColor.bg.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-900';
          const categoryText = categoryColor.bg.split(' ').find(c => c.startsWith('text-')) || 'text-white';

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              aria-pressed={isActive}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-2",
                isActive ? categoryText : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={cn("absolute inset-0 z-0 rounded-full shadow-sm", categoryBg)}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right button */}
      <button
        type="button"
        onClick={() => scroll('right')}
        className={cn(
          "shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-opacity",
          showRight ? "opacity-100" : "opacity-30 pointer-events-none"
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
