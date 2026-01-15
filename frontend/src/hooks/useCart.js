import { useState, useMemo } from 'react';

const SOFT_ITEM_COMPRESSION = 0.8;

export function useCart() {
    const [cartItems, setCartItems] = useState([]);

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
    };

    return {
        cartItems,
        cartDimensions,
        addToCart,
        incrementItem,
        decrementItem,
        removeItem,
        clearCart,
    };
}
