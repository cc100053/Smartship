# 📦 3D Packing Animation — 詳細執行計劃

## 概要

在 3D Viewer 裡實現物品入箱動畫，讓觀看者能直觀地看到每件商品如何被放入箱中。

### 確定設計方案

| 項目 | 決定 |
|:---|:---|
| 動畫路徑 | **B — 直飛 3D**（商品直接從畫面頂部飛入 3D 場景） |
| 已有物品處理 | **Y — Smooth Transition**（舊物品 smooth 滑移到新位置） |
| 新物品起點 | 畫面頂部飛入 |
| 箱蓋 | 無蓋（保持透明箱） |
| 音效 | 無 |
| 動畫速度 | 慢速播放（展覽演示用） |

---

## 影響範圍

### 需要修改的文件

#### [MODIFY] [ParcelVisualizer3D.jsx](file:///Users/fatboy/smartship/frontend/src/components/ParcelVisualizer3D.jsx)
**核心改動文件** — 3D 場景組件

改動内容：
1. **`PlacedBox` → `AnimatedPlacedBox`**
   - 使用 `@react-spring/three` 的 `useSpring` + `animated.group` 替換靜態 `<group position={...}>`
   - 新物品：從場景頂部（Y 軸高處）spring 動畫落入目標位置
   - 已有物品：從舊位置 smooth transition 到新位置
   - 配置慢速 spring：`mass: 2, tension: 120, friction: 14`（新品 bounce）、`mass: 1, tension: 170, friction: 26`（舊品滑移）

2. **`Scene` 組件增加 placement diffing 邏輯**
   - 維護 `prevPlacementsRef = useRef([])` 儲存上一幀 placements
   - 通過 `name` 字段（產品名稱）匹配新舊 placements
   - 輸出每個 placement 的 `isNew` 標誌
   - 每次 placements 更新後刷新 ref

3. **`ShippingBox`（透明箱）smooth resize**
   - 箱子尺寸變更時也使用 spring 動畫過渡

具體改動：

```jsx
// ── 新增 import ──
import { useSpring, animated, config } from '@react-spring/three';

// ── AnimatedPlacedBox（替代 PlacedBox）──
function AnimatedPlacedBox({ info, scale, isNew, dropHeight }) {
  const targetX = info.x * scale + (info.width * scale) / 2;
  const targetZ = info.y * scale + (info.depth * scale) / 2;
  const targetY = info.z * scale + (info.height * scale) / 2;

  const width  = info.width  * scale;
  const depth  = info.depth  * scale;
  const height = info.height * scale;

  // 慢速 spring 配置
  const springConfig = isNew
    ? { mass: 2, tension: 120, friction: 14 }   // bouncy drop
    : { mass: 1, tension: 170, friction: 26 };   // smooth glide

  const { position, opacity } = useSpring({
    position: [targetX, targetY, targetZ],
    opacity: 0.7,
    from: isNew
      ? { position: [targetX, dropHeight, targetZ], opacity: 0 }
      : undefined,
    config: springConfig,
  });

  return (
    <animated.group position={position}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <animated.meshStandardMaterial
          color={info.color}
          transparent
          opacity={opacity}
          roughness={0.1}
        />
      </mesh>
      <BoxEdges width={width} height={height} depth={depth} />
    </animated.group>
  );
}

// ── Scene 內 placement diff 邏輯 ──
function Scene({ placements, maxDim, dimensions }) {
  const prevPlacementsRef = useRef([]);

  // Diff: 識別新物品 vs 已有物品
  const annotatedPlacements = useMemo(() => {
    const prev = prevPlacementsRef.current;

    // 建立 name→count map（處理同名物品）
    const prevNameCounts = {};
    prev.forEach(p => {
      prevNameCounts[p.name] = (prevNameCounts[p.name] || 0) + 1;
    });

    const usedCounts = {};
    return placements.map(p => {
      const prevCount = prevNameCounts[p.name] || 0;
      const usedCount = usedCounts[p.name] || 0;

      const isNew = usedCount >= prevCount;
      usedCounts[p.name] = usedCount + 1;

      return { ...p, isNew };
    });
  }, [placements]);

  // 更新 ref（動畫開始後）
  useEffect(() => {
    prevPlacementsRef.current = placements;
  }, [placements]);

  // ... 其餘 Scene 邏輯不變 ...

  // dropHeight 計算：場景頂部 + 額外高度
  const boxMaxHeight = dimensions?.heightCm
    ? dimensions.heightCm * 10 * scale
    : 3;
  const dropHeight = boxMaxHeight + 4; // 比箱頂高 4 個 scene units

  return (
    <>
      {/* ... lights, grid, etc. ... */}
      <group position={[-centerX, 0, -centerZ]}>
        {hasDims && <AnimatedShippingBox dimensions={dimensions} scale={scale} />}

        {annotatedPlacements.map((p, i) => (
          <AnimatedPlacedBox
            key={`${p.name}-${i}`}
            info={p}
            scale={scale}
            isNew={p.isNew}
            dropHeight={dropHeight}
          />
        ))}

        {/* Reference object ... */}
      </group>
    </>
  );
}
```

4. **`AnimatedShippingBox`（替代 `ShippingBox`）**

```jsx
function AnimatedShippingBox({ dimensions, scale }) {
  const width  = dimensions.lengthCm * 10 * scale;
  const depth  = dimensions.widthCm  * 10 * scale;
  const height = dimensions.heightCm * 10 * scale;

  const { size, pos } = useSpring({
    size: [width, height, depth],
    pos: [width / 2, height / 2, depth / 2],
    config: { mass: 1, tension: 170, friction: 26 },
  });

  return (
    <animated.group position={pos}>
      <animated.mesh>
        {/* boxGeometry 不支持 animated args，需用 scale workaround */}
        <boxGeometry args={[1, 1, 1]} />
        <animated.meshStandardMaterial
          color="#94a3b8"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </animated.mesh>
      {/* 邊線同樣需要 animated */}
    </animated.group>
  );
}
```

> **注意**：`boxGeometry args` 不能直接 animate（需要重建 geometry）。
> 替代方案：用 `scale` + 固定 `args={[1,1,1]}` 的 boxGeometry，通過 animated scale 控制大小。

---

#### [MODIFY] [ShippingCalculator.jsx](file:///Users/fatboy/smartship/frontend/src/pages/ShippingCalculator.jsx)
**改動內容**：移除現有的「飛入購物車」DOM 動畫

1. **刪除 `animateAddToCart` 函數**（第 154-215 行）
2. **`handleAddToCart` 中移除 `animateAddToCart(sourceEl)` 調用**（第 219 行）
   - 商品加入 cart 後，3D Viewer 會自動顯示入箱動畫（因為 `placements` 更新觸發 `AnimatedPlacedBox`）

修改前：
```jsx
const handleAddToCart = (product, event) => {
  const sourceEl = event?.currentTarget?.closest('article');
  animateAddToCart(sourceEl);  // ← 刪除
  resetCalculation();
  addToCart(product);
  // ...
};
```

修改後：
```jsx
const handleAddToCart = (product, event) => {
  resetCalculation();
  addToCart(product);
  if (mode === 'manual') {
    setMode('cart');
  }
};
```

---

#### [NEW] (npm dependency)
**新增依賴**：`@react-spring/three`

```bash
cd frontend && npm install @react-spring/three
```

`@react-spring/three` 是 react-spring 的 Three.js binding，專門配合 `@react-three/fiber` 使用。
它提供 `animated.group`、`animated.mesh` 等 Three.js 專用的 animated 元件。

---

## 動畫時序設計

```
t=0ms      Cart state 更新（addToCart）
t=300ms    useCart debounce 完成 → API request 發出
t=400-700ms  API response 返回新 placements
t=700ms    Scene 開始動畫：
           ├── 已有物品：smooth 滑移到新位 (~800ms, ease-out)
           └── 新物品：從頂部 spring 落入 (~1200ms, bouncy)
t=1900ms   全部動畫完成
```

### Spring 參數（慢速版）

| 類型 | mass | tension | friction | 效果 |
|:---|:---|:---|:---|:---|
| 新物品落入 | 2 | 120 | 14 | 慢速、有 bounce |
| 舊物品滑移 | 1 | 170 | 26 | 平穩滑移 |
| 箱子 resize | 1 | 170 | 26 | 跟舊物品同步 |

---

## 邊際情況處理

| 情境 | 處理方式 |
|:---|:---|
| 購物車清空 | 所有物品 fade out（opacity → 0），箱子 shrink 到 0 |
| 數量 +1（同商品） | 新增的同名物品為 `isNew=true`，其餘 `isNew=false` |
| 數量 -1（減少） | 被移除的物品消失，剩餘物品 smooth transition 到新位 |
| 模式切換 cart→manual | 清空動畫，manual 物品直接出現（無 drop 動畫） |
| API 超時 | 保持舊 placements 不變，不觸發動畫 |
| 空 cart 加第一件 | 箱子從 0 expand + 物品從頂部落入 |

---

## 關鍵技術決策

### 1. 為何選 `@react-spring/three` 而非 `framer-motion`？
- `framer-motion` 的 3D 支持有限，不提供 Three.js binding
- `@react-spring/three` 原生支持 `animated.group`、`animated.mesh`
- 與現有 `@react-three/fiber` 完美整合
- Spring physics 動畫比 tween 更自然

### 2. Placement Diff 策略
- 使用 `name` 字段做 matching key（Backend `PlacementInfo.name()` = 產品名稱）
- 同名物品用 count-based matching（第 N 個 "少年コミック" 匹配舊的第 N 個）
- 無法匹配的 = 新物品（`isNew = true`）

### 3. boxGeometry args 不可動態更新
- Three.js `boxGeometry` 的 `args` 一旦設定無法 animate
- 解決方案：使用 `args={[1,1,1]}` + `animated.mesh scale={[w, h, d]}`

---

## 驗證計劃

### 瀏覽器手動測試

由於本項目無前端測試框架，驗證以手動 + 視覺確認為主。

**環境準備**：
```bash
# Terminal 1: Backend
cd /Users/fatboy/smartship && ./run-backend.sh

# Terminal 2: Frontend
cd /Users/fatboy/smartship/frontend && npm install && npm run dev
```

**測試用例**：

1. **新物品落入動畫**
   - 開啟 http://localhost:3000
   - 點擊任一商品的 "+" 按鈕
   - ✅ 3D viewer 中商品應該從畫面頂部 spring 動畫落入箱中
   - ✅ 落入過程應有 bounce 效果
   - ✅ 動畫持續約 1-1.5 秒

2. **已有物品 smooth transition**
   - 先加一件「少年コミック」
   - 再加一件「スマートフォン」
   - ✅ 第 1 件物品應 smooth 滑移到新位置（不是瞬移）
   - ✅ 第 2 件物品從頂部落入

3. **同商品數量增加**
   - 加一件「少年コミック」
   - 在 cart 中點 "+" 增加數量至 2
   - ✅ 原有的「少年コミック」smooth 移動
   - ✅ 新的一件從頂部落入

4. **物品移除**
   - Cart 中有 2-3 件商品
   - 移除其中一件
   - ✅ 剩餘物品 smooth 滑移到新位置

5. **清空購物車**
   - Cart 中有商品
   - 點「全削除」
   - ✅ 所有物品消失，箱子消失

6. **箱子 resize**
   - 逐步加入多件商品（令箱子從小變大）
   - ✅ 箱子尺寸應 smooth 過渡，不是瞬切

7. **手動模式不受影響**
   - 切換到手動模式
   - 輸入尺寸
   - ✅ 手動模式物品正常顯示，無入箱動畫

8. **舊功能無影響**
   - 點擊「送料計算」按鈕
   - ✅ 配送結果正常顯示
   - ✅ 3D viewer 正常旋轉（OrbitControls）
   - ✅ 參照物正常顯示

---

## 執行步驟

- [ ] Step 1：安裝 `@react-spring/three` 依賴
- [ ] Step 2：在 `ParcelVisualizer3D.jsx` 實現 `AnimatedPlacedBox`
- [ ] Step 3：在 `Scene` 加入 placement diff 邏輯
- [ ] Step 4：實現 `AnimatedShippingBox`（箱子 smooth resize）
- [ ] Step 5：移除 `ShippingCalculator.jsx` 的 `animateAddToCart`
- [ ] Step 6：瀏覽器測試 + 調整 spring 參數
- [ ] Step 7：邊際情況測試
