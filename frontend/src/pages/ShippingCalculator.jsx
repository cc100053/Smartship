import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCategories, fetchProducts } from '../api/shippingApi';
import CartPanel from '../components/CartPanel';
import CategoryTabs from '../components/CategoryTabs';
import ManualInputForm from '../components/ManualInputForm';
import ParcelVisualizer3D from '../components/ParcelVisualizer3D';
import ProductCard from '../components/ProductCard';
import ShippingResult from '../components/ShippingResult';
import { getCategoryLabel } from '../utils/labels';
import { cn } from '../utils/cn';
import { useCart } from '../hooks/useCart';
import { useShippingCalculator } from '../hooks/useShippingCalculator';

const ALL_CATEGORY = 'ALL';

const parsePositiveNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

export default function ShippingCalculator() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('cart');
  const [manualInput, setManualInput] = useState({
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightG: '',
  });

  const cartRef = useRef(null);
  const resultRef = useRef(null);

  // Custom Hooks
  const {
    cartItems,
    cartDimensions,
    addToCart,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();

  const {
    calculation,
    loading: calcLoading,
    error: calcError,
    calculateCart,
    calculateManual,
    resetCalculation,
  } = useShippingCalculator();

  const manualDimensions = useMemo(() => {
    const lengthCm = parsePositiveNumber(manualInput.lengthCm);
    const widthCm = parsePositiveNumber(manualInput.widthCm);
    const heightCm = parsePositiveNumber(manualInput.heightCm);
    if (!lengthCm || !widthCm || !heightCm) return null;

    const weightValue = parsePositiveNumber(manualInput.weightG);

    return {
      lengthCm,
      widthCm,
      heightCm,
      weightG: weightValue ? Math.round(weightValue) : null,
      itemCount: 1,
    };
  }, [manualInput]);

  const visualDimensions = mode === 'manual' ? manualDimensions : cartDimensions;

  const tabItems = useMemo(() => {
    const unique = new Set(categories.filter(Boolean));
    return [
      { value: ALL_CATEGORY, label: 'すべて' },
      ...Array.from(unique).map((category) => ({
        value: category,
        label: getCategoryLabel(category),
      })),
    ];
  }, [categories]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        setError('カテゴリの取得に失敗しました。');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const categoryParam = activeCategory === ALL_CATEGORY ? undefined : activeCategory;
        const data = await fetchProducts(categoryParam);
        setProducts(data);
      } catch (err) {
        setError('商品の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [activeCategory]);

  const animateAddToCart = (sourceEl) => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const targetEl = cartRef.current;
    if (!sourceEl || !targetEl) return;

    // Find the icon inside the card (the package icon span)
    const iconEl = sourceEl.querySelector('span.rounded-lg');
    if (!iconEl) return;

    const sourceRect = iconEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height) return;

    const clone = iconEl.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.margin = '0';
    clone.style.top = `${sourceRect.top}px`;
    clone.style.left = `${sourceRect.left}px`;
    clone.style.width = `${sourceRect.width}px`;
    clone.style.height = `${sourceRect.height}px`;
    clone.style.transformOrigin = 'center';
    clone.style.zIndex = '50';
    clone.style.borderRadius = '0.5rem';

    document.body.appendChild(clone);

    const endX = targetRect.left + targetRect.width * 0.5 - sourceRect.left - sourceRect.width / 2;
    const endY = targetRect.top + targetRect.height * 0.5 - sourceRect.top - sourceRect.height / 2;

    const flyAnimation = clone.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${endX}px, ${endY}px) scale(0.8)`, opacity: 0.4 },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    );

    flyAnimation.onfinish = () => clone.remove();
    window.setTimeout(() => clone.remove(), 1000);

    if (typeof targetEl.animate === 'function') {
      targetEl.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 18px 45px -40px rgba(15,23,42,0.7)' },
          { transform: 'scale(1.02)', boxShadow: '0 22px 50px -38px rgba(15,23,42,0.45)' },
          { transform: 'scale(1)', boxShadow: '0 18px 45px -40px rgba(15,23,42,0.7)' },
        ],
        {
          duration: 260,
          easing: 'ease-out',
        },
      );
    }
  };

  const handleAddToCart = (product, event) => {
    const sourceEl = event?.currentTarget?.closest('article');
    animateAddToCart(sourceEl);

    resetCalculation();
    addToCart(product);
  };

  const handleIncrement = (id) => {
    resetCalculation();
    incrementItem(id);
  };

  const handleDecrement = (id) => {
    resetCalculation();
    decrementItem(id);
  };

  const handleRemove = (id) => {
    resetCalculation();
    removeItem(id);
  };

  const handleClear = () => {
    resetCalculation();
    clearCart();
  };

  const handleManualChange = (next) => {
    resetCalculation();
    setManualInput(next);
  };

  // Wrapped handlers to support scrolling to result
  const handleCartCalculate = async () => {
    await calculateCart(cartItems);
    // Scroll to result on mobile
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleManualCalculate = async (payload) => {
    await calculateManual(payload);
    // Scroll to result on mobile
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetCalculation();
  };

  return (
    <section id="shipping-calculator" className="flex flex-col gap-4 lg:h-full overflow-x-hidden">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 lg:h-full lg:overflow-hidden">

        {/* --- Product Library Section (Left Column on Desktop, First on Mobile) --- */}
        <motion.div
          className="order-1 lg:col-span-5 flex flex-col gap-3 sm:gap-4 lg:h-full lg:overflow-hidden min-w-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex-none rounded-2xl border border-white/60 bg-white/40 p-3 sm:p-4 shadow-sm backdrop-blur-md">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              商品を選択
            </h2>
            <div className="mt-3 sm:mt-4">
              <CategoryTabs categories={tabItems} value={activeCategory} onChange={setActiveCategory} />
            </div>
            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-100">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl pb-2 custom-scrollbar max-h-[50vh] lg:max-h-none min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={loading ? 'loading' : activeCategory}
                className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1 xl:grid-cols-2 content-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="h-24 sm:h-40 rounded-2xl bg-slate-200/50 animate-pulse"
                    />
                  ))
                ) : (
                  products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={index}
                      onAdd={(event) => handleAddToCart(product, event)}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* --- Calculator & Visualizer Section (Right Column on Desktop, Second on Mobile) --- */}
        <motion.div
          className="order-2 lg:col-span-7 flex flex-col gap-3 sm:gap-4 lg:h-full lg:overflow-y-auto custom-scrollbar min-w-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Mode Switcher & Inputs */}
          <div className="rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
            <div className="mb-4 flex gap-2">
              {[
                { value: 'cart', label: 'カート' },
                { value: 'manual', label: '手動入力' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleModeChange(option.value)}
                  className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all duration-300",
                    mode === option.value
                      ? "text-white shadow-md shadow-slate-900/10"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  )}
                >
                  {mode === option.value && (
                    <motion.div
                      layoutId="mode-highlight"
                      className="absolute inset-0 rounded-xl bg-slate-900"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {mode === 'cart' ? (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CartPanel
                      items={cartItems}
                      onIncrement={handleIncrement}
                      onDecrement={handleDecrement}
                      onRemove={handleRemove}
                      onClear={handleClear}
                      onCalculate={handleCartCalculate}
                      loading={calcLoading}
                      containerRef={cartRef}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ManualInputForm
                      value={manualInput}
                      onChange={handleManualChange}
                      onCalculate={handleManualCalculate}
                      loading={calcLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 items-start">
            <ParcelVisualizer3D dimensions={visualDimensions} mode={mode} />
            <div ref={resultRef}>
              <ShippingResult calculation={calculation} loading={calcLoading} error={calcError} />
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
