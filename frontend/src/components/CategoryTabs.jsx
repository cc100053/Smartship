export default function CategoryTabs({ categories, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
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
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              'border border-slate-200/70 shadow-sm',
              isActive
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                : 'bg-white/80 text-slate-700 hover:bg-white',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
