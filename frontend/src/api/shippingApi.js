const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableStatus = (status) => [408, 425, 429, 500, 502, 503, 504].includes(status);

const requestJson = async (path, options = {}) => {
  const {
    retry = 0,
    retryDelayMs = 350,
    ...fetchOptions
  } = options;

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) },
        ...fetchOptions,
      });

      if (!res.ok) {
        const text = await res.text();
        const error = new Error(text || `リクエストに失敗しました (${res.status})`);
        error.status = res.status;

        const canRetry = attempt < retry && isRetriableStatus(res.status);
        if (canRetry) {
          attempt += 1;
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw error;
      }

      return res.json();
    } catch (error) {
      const isNetworkError = error instanceof TypeError;
      const canRetry = attempt < retry && (isNetworkError || isRetriableStatus(error?.status));
      if (!canRetry) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

export const fetchProducts = (category) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/products${query}`, { retry: 3 });
};

export const fetchCategories = () => requestJson('/api/products/categories', { retry: 3 });

export const calculateFromCart = (items) =>
  requestJson('/api/shipping/calculate/cart', {
    method: 'POST',
    body: JSON.stringify({ items }),
    retry: 1,
  });

export const calculateFromManual = (payload) =>
  requestJson('/api/shipping/calculate/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
    retry: 1,
  });

// New: Get packed dimensions only (for real-time preview)
export const calculateDimensions = (items) =>
  requestJson('/api/shipping/calculate/dimensions', {
    method: 'POST',
    body: JSON.stringify({ items }),
    retry: 2,
  });
