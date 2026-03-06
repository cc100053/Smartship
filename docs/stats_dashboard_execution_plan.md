# SmartShip 統計儀表板執行計劃

## 目標

新增一個獨立的統計畫面，用於展示 SmartShip 在正式使用中的累積成效。當使用者按下「計算運費」並成功取得結果時，系統就把這次計算記錄為一筆正式統計事件，並在統計頁面上以輪詢方式更新總數。

本次規劃鎖定 MVP 範圍，不引入 WebSocket / SSE，也不追求學術級精準減碳模型，而是優先做出穩定、易理解、可現場展示的數據頁。

---

## 已確認的產品定義

### 正式統計觸發條件

- 只有使用者按下「計算運費」且 `/api/shipping/calculate/cart` 成功回傳時，才記為一筆正式統計。
- 只有使用者按下「計算運費」且正式計算 API 成功回傳時，才記為一筆正式統計。
- `cart` 與 `manual` 兩種正式計算都計入統計。
- `3D preview` 使用的 `/api/shipping/calculate/dimensions` 不計入正式統計。

### 統計頁 MVP 顯示四個數字

- `Total Calculations`
- `Estimated Yen Saved`
- `Estimated CO2e Saved`
- `Items Packed`

### 慳錢定義

每次正式計算的節省金額定義為：

```text
savingYen = secondBestFittingOption.priceYen - recommendedOption.priceYen
```

規則：

- 只比較 `canFit = true` 的方案。
- `recommendedOption` 即目前回傳結果中的推薦方案。
- `secondBestFittingOption` 指第二個可行方案。
- 若找不到第二個可行方案，則本次 `savingYen = 0`。
- 若價差為負數，最終以 `0` 處理，避免統計出現負節省。

### 減碳定義

本次不顯示 `Volume Reduced`，直接以簡化 proxy 估算 `Estimated CO2e Saved`。

每次正式計算的減碳值定義為：

```text
currentMaxCm = max(recommendedOption.maxLength, recommendedOption.maxWidth, recommendedOption.maxHeight)
nextMaxCm = max(secondBestFittingOption.maxLength, secondBestFittingOption.maxWidth, secondBestFittingOption.maxHeight)

sizeGapCm = max(0, nextMaxCm - currentMaxCm)
weightKg = packedWeightG / 1000.0
weightFactor = clamp(weightKg, 0.8, 2.0)

estimatedCo2eSavedG = round(sizeGapCm * 12 * weightFactor)
```

補充規則：

- 只比較 `canFit = true` 的方案。
- 若沒有第二個可行方案，則 `estimatedCo2eSavedG = 0`。
- 若尺寸差為 `0` 或負數，則結果為 `0`。
- 前端顯示時使用 `kg CO2e`，資料庫內建議用 `g` 儲存，避免精度問題。
- 若後續發現數字過大，可再加上單次 cap，例如 `500g CO2e`。

這條公式不是物流業標準排放因子模型，但很適合展示用途，因為它：

- 直接反映 SmartShip 幫使用者找到更小尺寸寄送方案的價值。
- 容易向現場觀眾說明。
- 不需要額外維護運輸距離、車型、路線、倉儲等高成本資料。

---

## 使用者體驗設計

### 新頁面形式

新增一個獨立 route：

```text
#/stats
```

用途：

- 可像 `#/viewer` 一樣開在第二個螢幕。
- 可作為展覽 / Demo 專用統計展示頁。
- 主頁面維持原本計算流程，不強制改動操作方式。

### 更新節奏

MVP 使用輪詢：

- 預設每 `2` 秒向 backend 讀取 aggregate stats。
- 頁面載入時立即抓一次。
- 頁面離開時停止輪詢。

這樣可以做到：

- 實作簡單。
- 不增加持久連線複雜度。
- 對現場展示已經足夠即時。

### 建議畫面資訊

上半部：

- 大標題，例如 `SmartShip Impact`
- 副標，例如 `每次正式運費計算都會即時累積到以下數據`

中間四格指標卡：

- `Total Calculations`
- `Estimated Yen Saved`
- `Estimated CO2e Saved`
- `Items Packed`

下方小字說明：

- `Estimated CO2e Saved` 為展示用估算值。
- 只統計正式成功的「計算運費」事件。

若想加強現場感，可在下方再加：

- `Last Updated`
- `Today / All Time` 切換

但這些屬於 V2，可不放進第一版。

---

## 技術架構

### 寫入時機

在 backend 的正式計算流程中寫入事件：

- 入口：`/api/shipping/calculate/cart`
- 入口：`/api/shipping/calculate/cart` 與 `/api/shipping/calculate/manual`
- 位置：完成推薦方案與候選方案計算後、成功回傳前

建議流程：

1. 驗證 cart / manual payload
2. 計算 packed dimensions
3. 產生推薦方案與所有 options
4. 根據 options 算出 `savingYen`
5. 根據推薦方案與第二可行方案算出 `estimatedCo2eSavedG`
6. 將事件寫入資料庫
7. 回傳原本 calculation response

這樣的好處是：

- 統計只記錄成功事件
- 不會把 preview 或中途失敗請求算進去
- 公式所需資料都已在這個時點可得

### 讀取時機

統計頁透過新 API 讀 aggregate：

```text
GET /api/stats/summary
```

MVP 回傳單一 summary object 即可，不需要先做複雜報表系統。

---

## 資料庫設計

### 新增資料表

建議新增一張事件表：

```sql
calculation_events
```

建議欄位：

| 欄位 | 型別 | 用途 |
|:---|:---|:---|
| `id` | `BIGSERIAL PRIMARY KEY` | 事件 ID |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 建立時間 |
| `calculation_mode` | `VARCHAR(20) NOT NULL` | `cart` / `manual` |
| `item_count` | `INTEGER NOT NULL` | 本次包裹件數 |
| `packed_weight_g` | `INTEGER NOT NULL` | 打包後總重量 |
| `recommended_option_id` | `INTEGER NULL` | 推薦方案 carrier ID |
| `recommended_price_yen` | `INTEGER NOT NULL` | 推薦方案價格 |
| `second_option_id` | `INTEGER NULL` | 第二可行方案 carrier ID |
| `second_option_price_yen` | `INTEGER NULL` | 第二可行方案價格 |
| `saving_yen` | `INTEGER NOT NULL` | 本次節省金額 |
| `recommended_max_dimension_cm` | `DOUBLE PRECISION NOT NULL` | 推薦方案最大尺寸 |
| `second_max_dimension_cm` | `DOUBLE PRECISION NULL` | 第二方案最大尺寸 |
| `size_gap_cm` | `DOUBLE PRECISION NOT NULL` | 最大尺寸差 |
| `estimated_co2e_saved_g` | `INTEGER NOT NULL` | 本次估算減碳值 |
| `session_id` | `VARCHAR(128) NULL` | 若要之後排查重複提交，可保留 session 標記 |

### 索引

建議先加：

- `INDEX idx_calculation_events_created_at ON calculation_events(created_at)`

若之後要做今日 / 本週統計，再沿用 `created_at` 範圍查詢即可。

### 為什麼先用事件表，而不是只存 aggregate

事件表比直接累加總表更穩：

- 可以回溯
- 可以重算公式
- 之後易擴充今日 / 展期 / 使用模式分組
- 出現口徑變更時可做 data migration 或離線重算

---

## Backend 實作計劃

### 1. 建立 migration

新增 migration 建立 `calculation_events`。

內容包括：

- table schema
- `created_at` index

### 2. 新增 entity / repository

新增：

- `CalculationEvent` entity
- `CalculationEventRepository`

Repository MVP 所需方法：

- `save(...)`
- aggregate summary query

### 3. 新增 stats service

新增：

- `StatsService`

職責：

- 從 calculation response / options 中抽出推薦方案與第二可行方案
- 計算：
  - `savingYen`
  - `recommendedMaxDimensionCm`
  - `secondMaxDimensionCm`
  - `sizeGapCm`
  - `estimatedCo2eSavedG`
- 寫入 `calculation_events`
- 聚合 summary 回傳給 controller

建議封裝方法：

- `recordCalculationEvent(...)`
- `getSummary()`
- `findSecondBestFittingOption(...)`
- `calculateEstimatedCo2eSavedG(...)`

### 4. 在 shipping flow 掛入統計寫入

修改：

- `backend/src/main/java/com/smartship/controller/ShippingController.java`

做法：

- 在 `calculateCart(...)` 中拿到 `CalculationResponse` 後呼叫 `StatsService.recordCalculationEvent(...)`
- 若寫統計失敗，建議先只記 log，不要讓主計算 API 失敗

MVP 建議策略：

- `計算運費` 結果優先於統計寫入
- 統計屬於展示資料，不應拖垮主功能

### 5. 新增 stats controller

新增 API：

```text
GET /api/stats/summary
```

回傳格式建議：

```json
{
  "totalCalculations": 1234,
  "estimatedYenSaved": 45678,
  "estimatedCo2eSavedG": 9123,
  "itemsPacked": 2789,
  "updatedAt": "2026-03-06T12:34:56Z"
}
```

前端收到後：

- `estimatedYenSaved` 顯示成 `¥45,678`
- `estimatedCo2eSavedG` 轉成 `9.12 kg CO2e`

---

## Frontend 實作計劃

### 1. 新增 API client

修改：

- `frontend/src/api/shippingApi.js`

新增：

- `fetchStatsSummary()`

### 2. 新增 stats page

新增：

- `frontend/src/pages/StatsDashboard.jsx`

頁面職責：

- 初次載入抓取 summary
- 每 `3` 秒輪詢一次
- 錯誤時顯示簡單 fallback
- 將四個數字做清楚的大字展示

### 3. 更新 route

修改：

- `frontend/src/main.jsx`

新增 hash route：

- `#/stats`

規則：

- `#/viewer` 顯示 viewer
- `#/stats` 顯示 stats dashboard
- 其他 route 顯示原本 `App`

### 4. 顯示格式

建議 formatter：

- `Total Calculations`: 千分位
- `Estimated Yen Saved`: `¥` + 千分位
- `Estimated CO2e Saved`: `g` 轉 `kg`，保留 `2` 位小數
- `Items Packed`: 千分位

---

## API / 資料流摘要

```text
User clicks 「計算運費」
  -> frontend calls POST /api/shipping/calculate/cart
  -> backend computes packed result + shipping options
  -> backend computes savingYen + estimatedCo2eSavedG
  -> backend inserts calculation_events row
  -> backend returns normal calculation response

Stats page open (#/stats)
  -> frontend calls GET /api/stats/summary
  -> backend aggregates calculation_events
  -> frontend renders four KPI cards
  -> poll every 3 seconds
```

---

## 邊界情況與處理規則

### 沒有第二個可行方案

- `savingYen = 0`
- `estimatedCo2eSavedG = 0`

### 第二方案價格不高於推薦方案

- `savingYen = 0`

### 第二方案最大尺寸不大於推薦方案

- `sizeGapCm = 0`
- `estimatedCo2eSavedG = 0`

### 統計寫入失敗

- 主計算仍然成功回傳
- backend log warning / error
- 不阻塞主功能

### 空資料庫

`GET /api/stats/summary` 應回傳全 `0`，不要回 `null`

---

## 驗證計劃

### Backend 驗證

- 新增 service test：
  - 有兩個以上可行方案時，正確算出 `savingYen`
  - 沒有第二可行方案時，回傳 `0`
  - `estimatedCo2eSavedG` 依 size gap 與 weight factor 正確計算
- 新增 controller / integration test：
  - `POST /api/shipping/calculate/cart` 成功時寫入事件
  - `GET /api/stats/summary` 回傳正確 aggregate

### Frontend 驗證

- `#/stats` 可以正常 render
- 輪詢會更新數字
- API failure 時不會 crash

### 手動驗證

建議驗證流程：

1. 開主頁面
2. 開 `#/stats`
3. 連續做幾次正式「計算運費」
4. 確認：
   - `Total Calculations` 遞增
   - `Estimated Yen Saved` 遞增
   - `Estimated CO2e Saved` 遞增
   - `Items Packed` 遞增

---

## 分階段落地建議

### Phase 1

- migration
- backend event write
- backend summary API
- frontend `#/stats` 頁面
- 輪詢更新

### Phase 2

- `Today / All Time` 切換
- 展期專用 reset / campaign scope
- 顯示最近一筆計算
- 加入小型動畫數字翻牌

### Phase 3

- 若需要更即時，再把輪詢升級為 SSE / WebSocket
- 若需要更可信的減碳口徑，再改為 carrier / distance based model

---

## 建議文件與程式修改清單

### 新增

- `docs/stats_dashboard_execution_plan.md`
- backend migration for `calculation_events`
- backend entity / repository / service / controller DTOs
- `frontend/src/pages/StatsDashboard.jsx`

### 修改

- `backend/src/main/java/com/smartship/controller/ShippingController.java`
- `frontend/src/api/shippingApi.js`
- `frontend/src/main.jsx`

---

## 實作上的關鍵取捨

- 統計只在正式計算成功時寫入，避免 preview 灌水。
- 統計寫入失敗不應影響主功能。
- 減碳先做展示型 proxy，不假裝是嚴謹排放模型。
- 事件表優先於純 aggregate table，為後續口徑調整留空間。

這樣的 MVP 已經可以很穩定地支撐展示場景，而且未來要升級成更完整的 impact dashboard 也不需要推倒重來。
