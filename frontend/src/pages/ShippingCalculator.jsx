import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import {
  createSavedProduct,
  deleteSavedProduct,
  fetchCategories,
  fetchPersonalizedProducts,
  fetchProducts,
  likeProduct,
  unlikeProduct,
} from '../api/shippingApi';
import CartPanel from '../components/CartPanel';
import CategoryTabs from '../components/CategoryTabs';
import FlyToCartOverlay from '../components/FlyToCartOverlay';
import ManualInputForm from '../components/ManualInputForm';
import MobileCartDrawer from '../components/MobileCartDrawer';
import ParcelVisualizer3D from '../components/ParcelVisualizer3D';
import PersonalizedProductsSection from '../components/PersonalizedProductsSection';
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
const MotionDiv = motion.div;
const toClientRectSnapshot = (rect) => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

export default function ShippingCalculator({ onDrawerToggle, authSession, onOpenLogin }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [products, setProducts] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);
  const [likedProducts, setLikedProducts] = useState([]);
  const [likedProductIds, setLikedProductIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personalizedLoading, setPersonalizedLoading] = useState(false);
  const [error, setError] = useState('');
  const [personalizedError, setPersonalizedError] = useState('');
  const [mode, setMode] = useState('cart');
  const [cartExpanded, setCartExpanded] = useState(false);
  const [cartFlights, setCartFlights] = useState([]);
  const [cartBounceToken, setCartBounceToken] = useState(0);
  const [pendingFlight, setPendingFlight] = useState(null);

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
  const desktopCartTargetRef = useRef(null);
  const mobileCartTargetRef = useRef(null);
  const resultRef = useRef(null);
  const flightIdRef = useRef(0);
  const desktopCartControls = useAnimationControls();

  // Custom Hooks
  const {
    cartItems,
    packedDimensions,
    dimensionsError,
    addToCart,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    retryPackedDimensions,
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

  const likedProductIdSet = useMemo(
    () => new Set(likedProductIds.map((id) => Number(id))),
    [likedProductIds],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await fetchCategories({ signal: controller.signal, timeoutMs: 10000 });
        if (cancelled) return;
        setCategories(data);
      } catch {
        if (controller.signal.aborted) return;
        setError('カテゴリの取得に失敗しました。');
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const categoryParam = activeCategory === ALL_CATEGORY ? undefined : activeCategory;
        const data = await fetchProducts(categoryParam, { signal: controller.signal, timeoutMs: 10000 });
        if (cancelled) return;
        setProducts(data);
      } catch {
        if (controller.signal.aborted) return;
        setError('商品の取得に失敗しました。');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeCategory]);

  useEffect(() => {
    if (!authSession?.authenticated) {
      setSavedProducts([]);
      setLikedProducts([]);
      setLikedProductIds([]);
      setPersonalizedError('');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadPersonalizedProducts = async () => {
      setPersonalizedLoading(true);
      setPersonalizedError('');

      try {
        const data = await fetchPersonalizedProducts({ signal: controller.signal, timeoutMs: 10000 });
        if (cancelled) return;
        setSavedProducts(data?.savedProducts || []);
        setLikedProducts(data?.likedProducts || []);
        setLikedProductIds(data?.likedProductIds || []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('[ShippingCalculator] Failed to load personalized products:', loadError);
        setPersonalizedError('マイ商品データの取得に失敗しました。');
      } finally {
        if (!cancelled) {
          setPersonalizedLoading(false);
        }
      }
    };

    loadPersonalizedProducts();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authSession?.authenticated, authSession?.accountId]);

  const triggerCartBounce = useCallback(() => {
    setCartBounceToken((prev) => prev + 1);
  }, []);

  const prefersReducedMotion = useCallback(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ), []);

  const getActiveCartTargetRect = useCallback(() => {
    const refs = [mobileCartTargetRef.current, desktopCartTargetRef.current];

    for (const element of refs) {
      const rect = element?.getBoundingClientRect?.();
      if (!rect) continue;
      if (rect.width <= 0 || rect.height <= 0) continue;
      return toClientRectSnapshot(rect);
    }

    return null;
  }, []);

  const startCartFlight = useCallback((product, sourceRect) => {
    const targetRect = getActiveCartTargetRect();
    if (!targetRect) {
      return false;
    }

    const nextId = `cart-flight-${flightIdRef.current++}`;
    setCartFlights((prev) => [...prev, {
      id: nextId,
      product,
      sourceRect,
      targetRect,
    }]);
    return true;
  }, [getActiveCartTargetRect]);

  const handleFlightComplete = useCallback((flightId) => {
    setCartFlights((prev) => prev.filter((flight) => flight.id !== flightId));
    triggerCartBounce();
  }, [triggerCartBounce]);

  const handleAddToCart = (product, sourceElement) => {
    resetCalculation();
    addToCart(product);
    const sourceRect = sourceElement?.getBoundingClientRect
      ? toClientRectSnapshot(sourceElement.getBoundingClientRect())
      : null;
    const shouldReduceMotion = prefersReducedMotion();

    if (mode === 'manual') {
      setMode('cart');
    }

    if (shouldReduceMotion || !sourceRect) {
      triggerCartBounce();
      return;
    }

    if (!startCartFlight(product, sourceRect)) {
      setPendingFlight({
        product,
        sourceRect,
        attempts: 0,
      });
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

  const handleCreateSavedProduct = async (payload) => {
    const created = await createSavedProduct(payload);
    setSavedProducts((prev) => [created, ...prev]);
    return created;
  };

  const handleDeleteSavedProduct = async (savedProductId) => {
    await deleteSavedProduct(savedProductId);
    setSavedProducts((prev) => prev.filter((product) => Number(product.id) !== Number(savedProductId)));
  };

  const handleToggleLike = async (product) => {
    if (!authSession?.authenticated) {
      onOpenLogin?.();
      return;
    }

    const productId = Number(product.id);
    const isLiked = likedProductIdSet.has(productId);

    if (isLiked) {
      await unlikeProduct(productId);
      setLikedProductIds((prev) => prev.filter((id) => Number(id) !== productId));
      setLikedProducts((prev) => prev.filter((item) => Number(item.id) !== productId));
      return;
    }

    await likeProduct(productId);
    setLikedProductIds((prev) => [productId, ...prev.filter((id) => Number(id) !== productId)]);
    setLikedProducts((prev) => [product, ...prev.filter((item) => Number(item.id) !== productId)]);
  };

  const handleClear = () => {
    resetCalculation();
    clearCart();
  };

  const handleManualChange = (next) => {
    resetCalculation();
    setManualInput(next);
  };

  const scrollResultIntoView = () => {
    if (typeof window === 'undefined') return;

    const target = resultRef.current;
    if (!target) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior, block: 'start' });
    });
  };

  // Wrapped handlers to support scrolling to result
  const handleCartCalculate = async () => {
    await calculateCart(cartItems);
    scrollResultIntoView();
  };

  const handleManualCalculate = async (payload) => {
    await calculateManual(payload);
    scrollResultIntoView();
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

  useEffect(() => {
    if (!cartBounceToken) return;
    desktopCartControls.start({
      y: [0, -4, 0],
      transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
    });
  }, [cartBounceToken, desktopCartControls]);

  useEffect(() => {
    if (!pendingFlight) return undefined;

    const timeoutId = window.setTimeout(() => {
      if (startCartFlight(pendingFlight.product, pendingFlight.sourceRect)) {
        setPendingFlight(null);
        return;
      }

      if (pendingFlight.attempts >= 5) {
        setPendingFlight(null);
        triggerCartBounce();
        return;
      }

      setPendingFlight((prev) => (
        prev
          ? { ...prev, attempts: prev.attempts + 1 }
          : prev
      ));
    }, 70);

    return () => window.clearTimeout(timeoutId);
  }, [pendingFlight, startCartFlight, triggerCartBounce]);

  return (
    <section id="shipping-calculator" className="flex flex-col gap-4 overflow-x-hidden">
      <div>
        <PersonalizedProductsSection
          authenticated={Boolean(authSession?.authenticated)}
          categories={tabItems}
          savedProducts={savedProducts}
          likedProducts={likedProducts}
          likedProductIds={likedProductIdSet}
          onAddProduct={handleAddToCart}
          onToggleLike={handleToggleLike}
          onCreateSavedProduct={handleCreateSavedProduct}
          onDeleteSavedProduct={handleDeleteSavedProduct}
          onOpenLogin={onOpenLogin}
          loading={personalizedLoading}
        />
        {personalizedError ? (
          <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {personalizedError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">

        {/* --- Product Library Section (Left Column on Desktop, First on Mobile) --- */}
        <MotionDiv
          className="order-1 lg:col-span-5 flex flex-col gap-4 min-w-0"
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

          <div className="relative min-w-0 flex flex-col">
            <div
              className="rounded-2xl pb-2 lg:max-h-[calc(100svh-13.5rem)] lg:overflow-y-auto custom-scrollbar"
            >
              <AnimatePresence mode="wait">
                <MotionDiv
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
                        onAdd={(sourceElement) => handleAddToCart(product, sourceElement)}
                        onToggleLike={() => handleToggleLike(product)}
                        liked={likedProductIdSet.has(Number(product.id))}
                      />
                    ))
                  )}
                </MotionDiv>
              </AnimatePresence>
            </div>
          </div>
        </MotionDiv>

        <MotionDiv
          className="order-2 lg:col-span-7 flex flex-col gap-4 min-w-0"
          initial={{ opacity: 0, y: 20 }}
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
                    <MotionDiv
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
                  <MotionDiv
                    key="cart"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      ref={desktopCartTargetRef}
                      animate={desktopCartControls}
                      initial={false}
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
                  </MotionDiv>
                ) : (
                  <MotionDiv
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
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 min-[1350px]:grid-cols-2 items-start">
            {mode === 'cart' && dimensionsError && (
              <div className="sm:col-span-2 lg:col-span-1 min-[1350px]:col-span-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 flex items-center justify-between gap-3">
                <span>
                  {dimensionsError}
                </span>
                <button
                  type="button"
                  onClick={retryPackedDimensions}
                  className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  再試行
                </button>
              </div>
            )}
            <ParcelVisualizer3D
              dimensions={visualDimensions}
              mode={mode}
              placements={mode === 'manual' ? manualPlacements : (packedDimensions?.placements || [])}
            />
            <div ref={resultRef}>
              <ShippingResult calculation={calculation} loading={calcLoading} error={calcError} />
            </div>
          </div>
        </MotionDiv>

      </div>

      {/* Spacer to prevent the fixed mobile cart pill from covering content/footer */}
      <div
        className="lg:hidden shrink-0"
        style={{ height: 'calc(7.5rem + env(safe-area-inset-bottom, 0px))' }}
      />

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
            targetRef={mobileCartTargetRef}
            bounceToken={cartBounceToken}
          />
        )}
      </AnimatePresence>

      <FlyToCartOverlay
        flights={cartFlights}
        onFlightComplete={handleFlightComplete}
      />
    </section>
  );
}
