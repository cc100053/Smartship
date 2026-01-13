import { useEffect, useMemo, useState } from 'react';
import {
  calculateFromCart,
  calculateFromManual,
  fetchCategories,
  fetchProducts,
} from '../api/shippingApi';
import CartPanel from '../components/CartPanel';
import CategoryTabs from '../components/CategoryTabs';
import ManualInputForm from '../components/ManualInputForm';
import ParcelVisualizer3D from '../components/ParcelVisualizer3D';
import ProductCard from '../components/ProductCard';
import ShippingResult from '../components/ShippingResult';
import { getCategoryLabel } from '../utils/labels';

const ALL_CATEGORY = 'ALL';
const SOFT_ITEM_COMPRESSION = 0.8;

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
  const [cartItems, setCartItems] = useState([]);
  const [mode, setMode] = useState('cart');
  const [manualInput, setManualInput] = useState({
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightG: '',
  });
  const [calculation, setCalculation] = useState(null);
  const [calcError, setCalcError] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);

  const cartDimensions = useMemo(() => {
    if (!cartItems.length) return null;

    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;
    let totalWeight = 0;
    let totalItems = 0;

    cartItems.forEach(({ product, quantity }) => {
      if (!product || quantity <= 0) return;

      maxLength = Math.max(maxLength, product.lengthCm);
      maxWidth = Math.max(maxWidth, product.widthCm);

      let itemHeight = product.heightCm * quantity;
      if (product.category === 'Fashion') {
        itemHeight *= SOFT_ITEM_COMPRESSION;
      }

      totalHeight += itemHeight;
      totalWeight += product.weightG * quantity;
      totalItems += quantity;
    });

    if (!totalItems) return null;

    return {
      lengthCm: maxLength,
      widthCm: maxWidth,
      heightCm: totalHeight,
      weightG: totalWeight,
      itemCount: totalItems,
    };
  }, [cartItems]);

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

  const handleAddToCart = (product) => {
    setCalculation(null);
    setCalcError('');
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleIncrement = (id) => {
    setCalculation(null);
    setCalcError('');
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const handleDecrement = (id) => {
    setCalculation(null);
    setCalcError('');
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.product.id === id
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemove = (id) => {
    setCalculation(null);
    setCalcError('');
    setCartItems((prev) => prev.filter((item) => item.product.id !== id));
  };

  const handleClear = () => {
    setCalculation(null);
    setCalcError('');
    setCartItems([]);
  };

  const handleManualChange = (next) => {
    setCalculation(null);
    setCalcError('');
    setManualInput(next);
  };

  const runCalculation = async (modeValue, payload) => {
    setCalcLoading(true);
    setCalcError('');
    try {
      const result =
        modeValue === 'cart'
          ? await calculateFromCart(payload)
          : await calculateFromManual(payload);
      setCalculation(result);
    } catch (err) {
      setCalcError('送料計算に失敗しました。');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCartCalculate = () => {
    const itemsPayload = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    if (!itemsPayload.length) {
      setCalcError('送料を計算するには商品を1点以上追加してください。');
      return;
    }
    runCalculation('cart', itemsPayload);
  };

  const handleManualCalculate = (payload) => {
    runCalculation('manual', payload);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setCalculation(null);
    setCalcError('');
  };

  return (
    <section id="catalog" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">商品ライブラリ</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">商品を選択</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            定番商品のサイズデータを一覧で確認できます。カテゴリで絞り込んで
            カートに追加してください。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-900">{products.length}</span> 件読み込み
        </div>
      </div>

      <CategoryTabs categories={tabItems} value={activeCategory} onChange={setActiveCategory} />

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
        注意: 表示される送料は目安です。実際の料金は実測サイズやサービス条件で変動します。
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-60 animate-pulse rounded-2xl border border-slate-200/70 bg-white/60"
              />
            ))
          : products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onAdd={() => handleAddToCart(product)}
              />
            ))}
      </div>

      <section id="quote" className="mt-14 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">見積り</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">送料を見積もる</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              カートの内容、または手動入力から配送方法を提案します。
            </p>
          </div>
          <div className="rounded-full border border-slate-200/70 bg-white/80 p-1 text-sm">
            {[
              { value: 'cart', label: 'カート' },
              { value: 'manual', label: '手動' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleModeChange(option.value)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold capitalize transition',
                  mode === option.value
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'text-slate-500 hover:text-slate-800',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {mode === 'cart' ? (
              <CartPanel
                items={cartItems}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onRemove={handleRemove}
                onClear={handleClear}
                onCalculate={handleCartCalculate}
                loading={calcLoading}
              />
            ) : (
              <ManualInputForm
                value={manualInput}
                onChange={handleManualChange}
                onCalculate={handleManualCalculate}
                loading={calcLoading}
              />
            )}
          </div>

          <div className="space-y-6">
            <ParcelVisualizer3D dimensions={visualDimensions} mode={mode} />
            <ShippingResult calculation={calculation} loading={calcLoading} error={calcError} />
          </div>
        </div>
      </section>
    </section>
  );
}
