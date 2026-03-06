const API_BASE = import.meta.env.VITE_API_URL || '';
let accessToken = null;
let refreshPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableStatus = (status) => [408, 425, 429, 500, 502, 503, 504].includes(status);

const isTimeoutError = (error) => error?.name === 'TimeoutError';

const isAbortError = (error) =>
  error?.name === 'AbortError' || isTimeoutError(error);

const createAbortError = () => {
  const error = new Error('Request aborted');
  error.name = 'AbortError';
  return error;
};

const createTimeoutError = () => {
  const error = new Error('Request timed out');
  error.name = 'TimeoutError';
  return error;
};

const extractErrorMessage = (text, status) => {
  if (!text) return `リクエストに失敗しました (${status})`;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Keep raw text fallback when response is not JSON.
  }

  return text;
};

const withTimeoutSignal = (externalSignal, timeoutMs) => {
  const controller = new AbortController();

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason || createAbortError());
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timerId = timeoutMs > 0
    ? window.setTimeout(() => {
      controller.abort(createTimeoutError());
    }, timeoutMs)
    : null;

  const cleanup = () => {
    if (timerId != null) {
      window.clearTimeout(timerId);
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
  };
};

const requestJson = async (path, options = {}) => {
  const {
    retry = 0,
    retryDelayMs = 350,
    timeoutMs = 10000,
    signal: externalSignal,
    authRequired = false,
    skipAuthRefresh = false,
    skipAuthHeader = false,
    ...fetchOptions
  } = options;

  let attempt = 0;
  let attemptedAuthRefresh = false;
  while (true) {
    const { signal, cleanup } = withTimeoutSignal(externalSignal, timeoutMs);
    try {
      const headers = { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) };
      if (!skipAuthHeader && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`${API_BASE}${path}`, {
        headers,
        credentials: 'include',
        ...fetchOptions,
        signal,
      });

      if (!res.ok) {
        if (res.status === 401 && authRequired && !skipAuthRefresh && !attemptedAuthRefresh) {
          attemptedAuthRefresh = true;
          const refreshed = await refreshAuthSession({ signal: externalSignal });
          if (refreshed?.authenticated && accessToken) {
            continue;
          }
        }

        const text = await res.text();
        const error = new Error(extractErrorMessage(text, res.status));
        error.status = res.status;

        const canRetry = attempt < retry && isRetriableStatus(res.status);
        if (canRetry) {
          attempt += 1;
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw error;
      }

      if (res.status === 204) {
        return null;
      }

      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (typeof parsed?.accessToken === 'string' && parsed.accessToken) {
        accessToken = parsed.accessToken;
      }
      return parsed;
    } catch (error) {
      const callerAborted = externalSignal?.aborted;
      const isNetworkError = error instanceof TypeError;
      const canRetry = attempt < retry && (isNetworkError || isRetriableStatus(error?.status) || isTimeoutError(error));

      if (callerAborted || (isAbortError(error) && !isTimeoutError(error)) || !canRetry) {
        throw error;
      }

      attempt += 1;
      await sleep(retryDelayMs * attempt);
    } finally {
      cleanup();
    }
  }
};

export const clearAccessToken = () => {
  accessToken = null;
};

const runRefreshRequest = (options = {}) =>
  requestJson('/api/auth/refresh', {
    method: 'POST',
    retry: 0,
    timeoutMs: 8000,
    skipAuthRefresh: true,
    skipAuthHeader: true,
    ...options,
  });

export const refreshAuthSession = async (options = {}) => {
  if (!refreshPromise) {
    refreshPromise = runRefreshRequest(options)
      .then((session) => {
        if (!session?.authenticated) {
          clearAccessToken();
        }
        return session;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const fetchProducts = (category, options = {}) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/products${query}`, { retry: 3, timeoutMs: 10000, ...options });
};

export const fetchCategories = (options = {}) =>
  requestJson('/api/products/categories', { retry: 3, timeoutMs: 10000, ...options });

export const fetchStatsSummary = (options = {}) =>
  requestJson('/api/stats/summary', { retry: 1, timeoutMs: 8000, ...options });

export const resetStatsData = (options = {}) =>
  requestJson('/api/stats/reset', {
    method: 'POST',
    retry: 0,
    timeoutMs: 10000,
    ...options,
  });

export const fetchAuthSession = (options = {}) =>
  requestJson('/api/auth/session', { retry: 1, timeoutMs: 8000, authRequired: true, ...options });

export const loginOrRegister = (payload, options = {}) =>
  requestJson('/api/auth/login-or-register', {
    method: 'POST',
    body: JSON.stringify(payload),
    retry: 0,
    timeoutMs: 10000,
    skipAuthRefresh: true,
    skipAuthHeader: true,
    ...options,
  });

export const logout = (options = {}) =>
  requestJson('/api/auth/logout', {
    method: 'POST',
    retry: 0,
    timeoutMs: 8000,
    skipAuthRefresh: true,
    skipAuthHeader: true,
    ...options,
  });

export const fetchPersonalizedProducts = (options = {}) =>
  requestJson('/api/me/products', { retry: 1, timeoutMs: 10000, authRequired: true, ...options });

export const createSavedProduct = (payload, options = {}) =>
  requestJson('/api/me/saved-products', {
    method: 'POST',
    body: JSON.stringify(payload),
    retry: 0,
    timeoutMs: 10000,
    authRequired: true,
    ...options,
  });

export const deleteSavedProduct = (savedProductId, options = {}) =>
  requestJson(`/api/me/saved-products/${savedProductId}`, {
    method: 'DELETE',
    retry: 0,
    timeoutMs: 8000,
    authRequired: true,
    ...options,
  });

export const likeProduct = (productId, options = {}) =>
  requestJson(`/api/me/liked-products/${productId}`, {
    method: 'POST',
    retry: 0,
    timeoutMs: 8000,
    authRequired: true,
    ...options,
  });

export const unlikeProduct = (productId, options = {}) =>
  requestJson(`/api/me/liked-products/${productId}`, {
    method: 'DELETE',
    retry: 0,
    timeoutMs: 8000,
    authRequired: true,
    ...options,
  });

export const calculateFromCart = (items, options = {}) =>
  requestJson('/api/shipping/calculate/cart', {
    method: 'POST',
    body: JSON.stringify({ items }),
    retry: 1,
    timeoutMs: 12000,
    authRequired: true,
    ...options,
  });

export const calculateFromManual = (payload, options = {}) =>
  requestJson('/api/shipping/calculate/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
    retry: 1,
    timeoutMs: 12000,
    ...options,
  });

export const calculateDimensions = (items, options = {}) =>
  requestJson('/api/shipping/calculate/dimensions', {
    method: 'POST',
    body: JSON.stringify({ items }),
    retry: 2,
    timeoutMs: 12000,
    authRequired: true,
    ...options,
  });
