import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCategories, fetchProducts } from '../api/shippingApi';
import CartPanel from '../components/CartPanel';
import CategoryTabs from '../components/CategoryTabs';
import ManualInputForm from '../components/ManualInputForm';
import MobileCartDrawer from '../components/MobileCartDrawer';
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

export default function ShippingCalculator({ onDrawerToggle }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('cart');
  const [cartExpanded, setCartExpanded] = useState(false);

  // Notify parent when drawer opens/closes (to hide scroll-to-top button)
  useEffect(() => {
    onDrawerToggle?.(cartExpanded);
  }, [cartExpanded, onDrawerToggle]);
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
    packedDimensions,
    dimensionsLoading,
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

  // Use packedDimensions from backend for cart mode (real-time 3D packing)
  const visualDimensions = useMemo(() => {
    if (mode === 'manual') {
      return calculation?.dimensions || manualDimensions;
    }
    // For cart mode: prefer packedDimensions (from API), fall back to calculation.dimensions
    if (packedDimensions?.dimensions) {
      return packedDimensions.dimensions;
    }
    return packedDimensions || calculation?.dimensions || null;
  }, [calculation, mode, manualDimensions, packedDimensions]);

  // Generate placements for manual mode 3D visualization
  const manualPlacements = useMemo(() => {
    if (mode !== 'manual' || !manualDimensions) return [];
    // Convert cm to mm for placement visualization
    return [{
      x: 0,
      y: 0,
      z: 0,
      width: manualDimensions.lengthCm * 10,  // mm
      depth: manualDimensions.widthCm * 10,   // mm
      height: manualDimensions.heightCm * 10, // mm
      color: '#6366F1', // Indigo color for manual input
      name: '手動入力',
    }];
  }, [mode, manualDimensions]);

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

  const handleAddToCart = (product) => {
    resetCalculation();
    addToCart(product);
    if (mode === 'manual') {
      setMode('cart');
    }
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

  // On mobile, force cart mode since mode switcher is hidden
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && mode !== 'cart') {
        setMode('cart');
      }
    };

    // Check initially
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode]);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetCalculation();
  };

  return (
    <section id="shipping-calculator" className="flex flex-col gap-4 lg:h-full overflow-x-hidden">
      <div className="grid gap-6 lg:grid-cols-12 lg:h-full lg:overflow-hidden">

        {/* --- Product Library Section (Left Column on Desktop, First on Mobile) --- */}
        <motion.div
          className="order-1 lg:col-span-5 flex flex-col gap-4 lg:h-full lg:overflow-hidden min-w-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex-none rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              商品を選択
            </h2>
            <div className="mt-4">
              <CategoryTabs categories={tabItems} value={activeCategory} onChange={setActiveCategory} />
            </div>
            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-100">
                {error}
              </div>
            )}
          </div>

          <div className="relative flex-1 overflow-hidden min-w-0 flex flex-col">
            <div
              className="flex-1 overflow-y-auto rounded-2xl pb-2 custom-scrollbar lg:max-h-none"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={loading ? 'loading' : activeCategory}
                  className="grid grid-cols-2 gap-3 lg:grid-cols-1 min-[1350px]:grid-cols-2 content-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={`skeleton-${i}`}
                        className="h-40 rounded-2xl bg-slate-200/50 animate-pulse"
                      />
                    ))
                  ) : (
                    products.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        onAdd={() => handleAddToCart(product)}
                      />
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        < motion.div
          className="order-2 lg:col-span-7 flex flex-col gap-4 lg:h-full lg:overflow-y-auto custom-scrollbar min-w-0"
          initial={{ opacity: 0, y: 20 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Mode Switcher & Inputs (Desktop Only) */}
          <div className="hidden lg:block rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md">
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

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 min-[1350px]:grid-cols-2 items-start">
            <ParcelVisualizer3D
              dimensions={visualDimensions}
              mode={mode}
              placements={mode === 'manual' ? manualPlacements : (packedDimensions?.placements || [])}
            />
            <div ref={resultRef}>
              <ShippingResult calculation={calculation} loading={calcLoading} error={calcError} />
            </div>
          </div>
        </motion.div>

      </div>

      {/* Spacer to prevent fixed pill from covering content on mobile */}
      <div className="min-[1170px]:hidden h-24 shrink-0" />

      <AnimatePresence>
        {mode === 'cart' && (
          <MobileCartDrawer
            isExpanded={cartExpanded}
            onToggle={setCartExpanded}
            items={cartItems}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onClear={handleClear}
            onCalculate={handleCartCalculate}
            loading={calcLoading}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
