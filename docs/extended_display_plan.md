# 📺 展覽延伸螢幕 — 3D 裝箱專用畫面 實施計劃

## 概要

在展覽演示時，連接第二螢幕（外接顯示器/投影機），全屏顯示 3D 裝箱動畫。
主螢幕完全不受影響，可以正常操作。

### 技術方案

使用 **BroadcastChannel API** 在同一瀏覽器的不同視窗間同步數據。

```
┌─────────────────────┐    BroadcastChannel     ┌─────────────────────────┐
│   主螢幕（筆記本）    │ ──────────────────────▶ │  延伸螢幕（外接/投影）    │
│                     │   { dimensions,         │                         │
│  正常操作 SmartShip   │     placements,         │  全屏 3D 裝箱動畫        │
│  (/）               │     mode }              │  (/#/viewer)            │
└─────────────────────┘                         └─────────────────────────┘
```

### 使用方式

1. 開啟主頁面 `http://localhost:5173` → 正常操作
2. 新開瀏覽器視窗 → 導航到 `http://localhost:5173/#/viewer`
3. 將新視窗拖到延伸螢幕 → 按 **F11** 全屏
4. 主螢幕操作，延伸螢幕即時顯示 3D 裝箱動畫

---

## 影響範圍

### 新增文件

| 文件 | 用途 |
|:---|:---|
| `frontend/src/hooks/useViewerBroadcast.js` | BroadcastChannel 收發 hook |
| `frontend/src/pages/PackingViewer.jsx` | 全屏 3D Viewer 頁面 |

### 修改文件

| 文件 | 改動內容 |
|:---|:---|
| `frontend/src/main.jsx` | 加入 hash routing |
| `frontend/src/hooks/useCart.js` | 廣播 cart 數據 |
| `frontend/src/components/ParcelVisualizer3D.jsx` | Export `Scene` 組件 |

### 不修改

- `App.jsx` — 完全不變
- `ShippingCalculator.jsx` — 完全不變
- 無新增 npm 依賴

---

## 詳細改動

### Step 1: 新建 `useViewerBroadcast.js`

**文件**: `frontend/src/hooks/useViewerBroadcast.js`

此 hook 封裝 BroadcastChannel 的收發邏輯，提供兩個功能：

#### `useBroadcastSender()`

- 在 `useCart` 中使用
- 返回一個 `broadcast(data)` 函數
- 調用時透過 `BroadcastChannel('smartship-viewer')` 發送 JSON 數據
- 組件卸載時自動關閉 channel

```jsx
// 使用方式（在 useCart 中）
const broadcast = useBroadcastSender();

// 每次 packedDimensions 更新時
useEffect(() => {
  broadcast({
    type: 'CART_UPDATE',
    dimensions: packedDimensions?.dimensions || null,
    placements: packedDimensions?.placements || [],
    mode: 'cart',
  });
}, [packedDimensions, broadcast]);
```

#### `useBroadcastReceiver()`

- 在 `PackingViewer` 中使用
- 返回 `{ dimensions, placements, mode, connected }`
- 監聽 `BroadcastChannel('smartship-viewer')` 的 `message` 事件
- 收到消息時更新 state
- `connected` 表示是否已收到至少一次數據

```jsx
// 使用方式（在 PackingViewer 中）
const { dimensions, placements, mode, connected } = useBroadcastReceiver();
```

#### 完整實現

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';

const CHANNEL_NAME = 'smartship-viewer';

/**
 * Sender：在主頁面的 useCart 中使用
 * 每次 cart 數據變化時調用 broadcast() 發送最新狀態
 */
export function useBroadcastSender() {
  const channelRef = useRef(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  return useCallback((data) => {
    channelRef.current?.postMessage(data);
  }, []);
}

/**
 * Receiver：在 PackingViewer 頁面中使用
 * 持續監聽 channel 並返回最新的 3D 數據
 */
export function useBroadcastReceiver() {
  const [state, setState] = useState({
    dimensions: null,
    placements: [],
    mode: 'cart',
    connected: false,
  });

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'CART_UPDATE') {
        setState({
          dimensions: data.dimensions || null,
          placements: data.placements || [],
          mode: data.mode || 'cart',
          connected: true,
        });
      }
    };

    return () => channel.close();
  }, []);

  return state;
}
```

---

### Step 2: 修改 `useCart.js` — 加入廣播

**文件**: `frontend/src/hooks/useCart.js`

改動內容：
1. Import `useBroadcastSender`
2. 在 hook 內調用 `useBroadcastSender()` 取得 `broadcast` 函數
3. 新增 `useEffect`：當 `packedDimensions` 或 `cartItems` 變化時廣播

```diff
 import { useState, useEffect, useCallback, useRef } from 'react';
 import { calculateDimensions } from '../api/shippingApi';
+import { useBroadcastSender } from './useViewerBroadcast';

 export function useCart() {
     const [cartItems, setCartItems] = useState([]);
     const [packedDimensions, setPackedDimensions] = useState(null);
     // ... 其他 state ...
+    const broadcast = useBroadcastSender();

     // ... 現有邏輯不變 ...

+    // 廣播 cart 數據到延伸螢幕
+    useEffect(() => {
+        broadcast({
+            type: 'CART_UPDATE',
+            dimensions: packedDimensions?.dimensions || null,
+            placements: packedDimensions?.placements || [],
+            mode: 'cart',
+        });
+    }, [packedDimensions, broadcast]);
+
+    // 購物車清空時也要廣播
+    const clearCart = () => {
+        // ... 現有清空邏輯 ...
+        broadcast({
+            type: 'CART_UPDATE',
+            dimensions: null,
+            placements: [],
+            mode: 'cart',
+        });
+    };

     return { /* ... 不變 ... */ };
 }
```

> **注意**：`clearCart` 需要手動廣播，因為 `setPackedDimensions(null)` 觸發的 `useEffect` 可能競爭。
> 雙重廣播是安全的（Viewer 收到 null dimensions 就顯示等待畫面）。

---

### Step 3: Export `Scene` 組件

**文件**: `frontend/src/components/ParcelVisualizer3D.jsx`

目前 `Scene` 是 internal function，需要 export 讓 `PackingViewer` 可以 import。

```diff
-// ── Scene ─────────────────────────────────────────────────────────
-function Scene({ placements, maxDim, dimensions }) {
+// ── Scene ─────────────────────────────────────────────────────────
+export function Scene({ placements, maxDim, dimensions }) {
```

同時 export 相關的輔助組件（`Scene` 依賴它們，它們都在同文件內所以不需要額外 export）：
- `MotionPlacedBox`、`ShippingBox`、`ReferenceObject`、`BoxEdges` 等 — 由 `Scene` 內部引用，不需要 export

也 export `CanvasErrorBoundary`：

```diff
-class CanvasErrorBoundary extends Component {
+export class CanvasErrorBoundary extends Component {
```

---

### Step 4: 新建 `PackingViewer.jsx`

**文件**: `frontend/src/pages/PackingViewer.jsx`

全屏 3D Viewer 頁面，專為延伸螢幕設計。

設計要求：
- 全屏黑底（`100vw × 100vh`）
- 只有 3D Canvas，沒有任何 UI chrome
- 等待數據時顯示簡潔的連線等待畫面
- 使用 `useBroadcastReceiver()` 接收主頁面的數據

```jsx
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene, CanvasErrorBoundary } from '../components/ParcelVisualizer3D';
import { useBroadcastReceiver } from '../hooks/useViewerBroadcast';

export default function PackingViewer() {
  const { dimensions, placements, connected } = useBroadcastReceiver();

  const hasDimensions = dimensions &&
    dimensions.lengthCm > 0 &&
    dimensions.widthCm > 0 &&
    dimensions.heightCm > 0;
  const hasPlacements = placements && placements.length > 0;

  const displayPlacements = useMemo(() => {
    if (hasPlacements) return placements;
    if (!hasDimensions) return [];
    return [{
      x: 0, y: 0, z: 0,
      width: Math.max(1, Math.round(dimensions.lengthCm * 10)),
      depth: Math.max(1, Math.round(dimensions.widthCm * 10)),
      height: Math.max(1, Math.round(dimensions.heightCm * 10)),
      color: '#38bdf8',
      name: 'Package',
    }];
  }, [dimensions, hasDimensions, hasPlacements, placements]);

  const maxDim = hasDimensions
    ? Math.max(dimensions.lengthCm, dimensions.widthCm, dimensions.heightCm) * 10
    : 100;

  // 等待連線
  if (!connected || displayPlacements.length === 0) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          {connected ? 'アイテムを追加してください...' : 'メイン画面に接続中...'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <CanvasErrorBoundary>
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
          <Scene
            placements={displayPlacements}
            maxDim={maxDim}
            dimensions={dimensions}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
```

---

### Step 5: 修改 `main.jsx` — Hash Routing

**文件**: `frontend/src/main.jsx`

加入最簡的 hash-based routing，避免引入 React Router。

```jsx
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import PackingViewer from './pages/PackingViewer.jsx';

function Root() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === '#/viewer') {
    return <PackingViewer />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
```

> **重點**：只有 `#/viewer` 才會顯示 Viewer，其他所有情況都顯示原本的 `App`。
> 主頁面的行為完全不受影響。

---

## 執行步驟清單

| # | 步驟 | 文件 | 預期耗時 |
|:--|:---|:---|:---|
| 1 | 新建 `useViewerBroadcast.js` | `hooks/useViewerBroadcast.js` | 5 min |
| 2 | 修改 `useCart.js` 加入廣播 | `hooks/useCart.js` | 5 min |
| 3 | Export `Scene` + `CanvasErrorBoundary` | `components/ParcelVisualizer3D.jsx` | 2 min |
| 4 | 新建 `PackingViewer.jsx` | `pages/PackingViewer.jsx` | 10 min |
| 5 | 修改 `main.jsx` hash routing | `main.jsx` | 3 min |
| 6 | 手動測試 + 調整 | — | 15 min |
| **合計** | | | **~40 min** |

---

## 驗證計劃

### 瀏覽器測試（手動）

**環境準備**：
```bash
# Terminal 1: Backend
cd /Users/fatboy/smartship && ./run-backend.sh

# Terminal 2: Frontend
cd /Users/fatboy/smartship/frontend && npm run dev
```

**測試用例**：

1. **主螢幕不受影響**
   - 開 `http://localhost:5173` → 正常加入商品
   - ✅ 所有功能完全正常
   - ✅ 3D 動畫正常運作

2. **延伸螢幕連線**
   - 新開 tab → `http://localhost:5173/#/viewer`
   - ✅ 顯示「メイン画面に接続中...」等待畫面
   - 回到主頁加入一件商品
   - ✅ Viewer 即時顯示 3D 裝箱動畫

3. **即時同步**
   - 主頁增加商品 → ✅ Viewer 動畫更新
   - 主頁減少商品 → ✅ Viewer 動畫更新
   - 主頁清空購物車 → ✅ Viewer 回到等待畫面

4. **全屏顯示**
   - Viewer 頁面按 F11 → ✅ 全屏黑底 + 3D
   - 旋轉/縮放 3D → ✅ OrbitControls 正常運作

5. **Build 驗證**
   ```bash
   cd /Users/fatboy/smartship/frontend && npm run build
   ```
   - ✅ Build 成功無 error

---

## 邊際情況

| 情境 | 處理方式 |
|:---|:---|
| Viewer 先開、主頁後開 | 連線等待畫面，收到第一條消息後即時渲染 |
| 主頁刷新 | Viewer 保持最後收到的數據（不會清空） |
| 多個 Viewer 視窗 | 全部都會收到同一份數據，各自渲染 |
| 瀏覽器不支持 BroadcastChannel | 現代 Chrome/Firefox/Edge 全部支持；Safari 14.1+ 支持 |
| 關閉主頁 | Viewer 停在最後數據（可考慮加 heartbeat，但展覽場景非必要） |
