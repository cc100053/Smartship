import { useState } from 'react';
import { calculateFromCart as apiCalculateFromCart, calculateFromManual as apiCalculateFromManual } from '../api/shippingApi';
import { getProductSource } from '../utils/products';

export function useShippingCalculator() {
    const [calculation, setCalculation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const resetCalculation = () => {
        setCalculation(null);
        setError('');
    };

    const calculateCart = async (items) => {
        const itemsPayload = items.map((item) => ({
            productId: getProductSource(item.product) === 'reference' ? Number(item.product.id) : null,
            savedProductId: getProductSource(item.product) === 'saved' ? Number(item.product.id) : null,
            quantity: item.quantity,
        }));

        if (!itemsPayload.length) {
            setError('送料を計算するには商品を1点以上追加してください。');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const result = await apiCalculateFromCart(itemsPayload);
            setCalculation(result);
        } catch (err) {
            setError('送料計算に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    const calculateManual = async (payload) => {
        setLoading(true);
        setError('');
        try {
            const result = await apiCalculateFromManual(payload);
            setCalculation(result);
        } catch (err) {
            setError('送料計算に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return {
        calculation,
        loading,
        error,
        calculateCart,
        calculateManual,
        resetCalculation,
    };
}
