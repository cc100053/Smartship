const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const requestJson = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `リクエストに失敗しました (${res.status})`);
  }

  return res.json();
};

export const fetchProducts = (category) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/products${query}`);
};

export const fetchCategories = () => requestJson('/api/products/categories');

export const calculateFromCart = (items) =>
  requestJson('/api/shipping/calculate/cart', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });

export const calculateFromManual = (payload) =>
  requestJson('/api/shipping/calculate/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// New: Get packed dimensions only (for real-time preview)
export const calculateDimensions = (items) =>
  requestJson('/api/shipping/calculate/dimensions', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
