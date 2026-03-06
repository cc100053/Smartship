import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateDimensions } from '../api/shippingApi';
import { useBroadcastSender } from './useViewerBroadcast';
import { getProductKey, getProductSource } from '../utils/products';

export function useCart() {
    const [cartItems, setCartItems] = useState([]);
    const [packedDimensions, setPackedDimensions] = useState(null);
    const [dimensionsLoading, setDimensionsLoading] = useState(false);
    const [dimensionsError, setDimensionsError] = useState('');
    const debounceRef = useRef(null);
    const requestVersionRef = useRef(0);
    const inFlightControllerRef = useRef(null);
    const broadcast = useBroadcastSender();

    // Fetch packed dimensions from backend when cart changes
    const fetchPackedDimensions = useCallback(async (items) => {
        if (inFlightControllerRef.current) {
            inFlightControllerRef.current.abort();
            inFlightControllerRef.current = null;
        }

        if (!items.length) {
            setPackedDimensions(null);
            setDimensionsLoading(false);
            setDimensionsError('');
            return;
        }

        const payload = items.map((item) => ({
            productId: getProductSource(item.product) === 'reference' ? Number(item.product.id) : null,
            savedProductId: getProductSource(item.product) === 'saved' ? Number(item.product.id) : null,
            quantity: item.quantity,
        }));

        const controller = new AbortController();
        inFlightControllerRef.current = controller;
        const requestVersion = ++requestVersionRef.current;

        setDimensionsLoading(true);
        setDimensionsError('');

        try {
            const result = await calculateDimensions(payload, {
                signal: controller.signal,
                timeoutMs: 10000,
            });
            if (requestVersion !== requestVersionRef.current) {
                return;
            }
            setPackedDimensions(result); // result contains { dimensions, placements }
        } catch (err) {
            if (controller.signal.aborted) {
                return;
            }
            if (requestVersion !== requestVersionRef.current) {
                return;
            }
            console.error('[useCart] Failed to fetch packed dimensions:', err);
            setDimensionsError('3Dプレビューの更新に失敗しました。再試行してください。');
        } finally {
            if (requestVersion === requestVersionRef.current) {
                setDimensionsLoading(false);
            }
            if (inFlightControllerRef.current === controller) {
                inFlightControllerRef.current = null;
            }
        }
    }, []);

    // Debounced effect to fetch dimensions when cart changes
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchPackedDimensions(cartItems);
        }, 300); // 300ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [cartItems, fetchPackedDimensions]);

    useEffect(() => () => {
        if (inFlightControllerRef.current) {
            inFlightControllerRef.current.abort();
            inFlightControllerRef.current = null;
        }
    }, []);

    // Broadcast cart data to extended display
    useEffect(() => {
        broadcast({
            type: 'CART_UPDATE',
            dimensions: packedDimensions?.dimensions || null,
            placements: packedDimensions?.placements || [],
            mode: 'cart',
        });
    }, [packedDimensions, broadcast]);

    const addToCart = (product) => {
        const productKey = getProductKey(product);
        setCartItems((prev) => {
            const existing = prev.find((item) => item.productKey === productKey);
            if (existing) {
                return prev.map((item) =>
                    item.productKey === productKey
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, productKey, quantity: 1 }];
        });
    };

    const incrementItem = (productKey) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.productKey === productKey ? { ...item, quantity: item.quantity + 1 } : item
            )
        );
    };

    const decrementItem = (productKey) => {
        setCartItems((prev) =>
            prev
                .map((item) =>
                    item.productKey === productKey
                        ? { ...item, quantity: Math.max(0, item.quantity - 1) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (productKey) => {
        setCartItems((prev) => prev.filter((item) => item.productKey !== productKey));
    };

    const clearCart = () => {
        if (inFlightControllerRef.current) {
            inFlightControllerRef.current.abort();
            inFlightControllerRef.current = null;
        }
        setCartItems([]);
        setPackedDimensions(null);
        setDimensionsError('');
        setDimensionsLoading(false);

        broadcast({
            type: 'CART_UPDATE',
            dimensions: null,
            placements: [],
            mode: 'cart',
        });
    };

    const retryPackedDimensions = useCallback(() => {
        fetchPackedDimensions(cartItems);
    }, [cartItems, fetchPackedDimensions]);

    return {
        cartItems,
        packedDimensions,
        dimensionsLoading,
        dimensionsError,
        addToCart,
        incrementItem,
        decrementItem,
        removeItem,
        clearCart,
        retryPackedDimensions,
    };
}
