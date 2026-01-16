import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateDimensions } from '../api/shippingApi';

export function useCart() {
    const [cartItems, setCartItems] = useState([]);
    const [packedDimensions, setPackedDimensions] = useState(null);
    const [dimensionsLoading, setDimensionsLoading] = useState(false);
    const debounceRef = useRef(null);

    // Fetch packed dimensions from backend when cart changes
    const fetchPackedDimensions = useCallback(async (items) => {
        if (!items.length) {
            setPackedDimensions(null);
            return;
        }

        const payload = items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
        }));

        setDimensionsLoading(true);
        try {
            const result = await calculateDimensions(payload);
            setPackedDimensions(result); // result contains { dimensions, placements }
        } catch (err) {
            console.error('[useCart] Failed to fetch packed dimensions:', err);
            // Keep previous dimensions on error
        } finally {
            setDimensionsLoading(false);
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

    const addToCart = (product) => {
        setCartItems((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const incrementItem = (id) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.product.id === id ? { ...item, quantity: item.quantity + 1 } : item
            )
        );
    };

    const decrementItem = (id) => {
        setCartItems((prev) =>
            prev
                .map((item) =>
                    item.product.id === id
                        ? { ...item, quantity: Math.max(0, item.quantity - 1) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (id) => {
        setCartItems((prev) => prev.filter((item) => item.product.id !== id));
    };

    const clearCart = () => {
        setCartItems([]);
        setPackedDimensions(null);
    };

    return {
        cartItems,
        packedDimensions,
        dimensionsLoading,
        addToCart,
        incrementItem,
        decrementItem,
        removeItem,
        clearCart,
    };
}
