import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export default function CategoryTabs({ categories, value, onChange }) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
      {categories.map((category) => {
        const item =
          typeof category === 'string' ? { value: category, label: category } : category;
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={isActive}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-2",
              isActive ? "text-white" : "text-slate-600 hover:text-slate-900"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 z-0 rounded-full bg-slate-900 shadow-md shadow-slate-900/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
