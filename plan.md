SmartShip: Intelligent Logistics Assistant (Project Plan)
1. Project Overview (項目簡介)
App Name: SmartShip (智能物流助手)
Goal: 將傳統的「運費計算機」升級為「物流決策系統」，協助 Mercari/Yahoo Auction 賣家尋找最便宜、最合適的寄送方式。
Core Value: 解決用戶「懶得測量尺寸」及「不知道選哪個箱子」的痛點。
Target User: Japan C2C 平台賣家 (個人用戶, Mercari, yahoo auction)。
Lanuage: Japanese

2. Technical Architecture (技術架構)
這部分用於展示系統設計能力 (System Design)
Backend: Java (建議使用 Spring Boot framework)
Database: MySQL (存儲物品數據、運費表、用戶歷史)
Frontend: HTML5, CSS (Bootstrap), Thymeleaf (Java Template Engine)
Design Pattern: MVC (Model-View-Controller)
3. Database Schema Design (資料庫設計)
這是項目的核心基礎，取代 Hardcode。
Table 1: product_reference (常見物品預設數據)
用於 "Object Reference" 功能，讓用戶免測量直接選擇。
CREATE TABLE product_reference (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category VARCHAR(50),       -- e.g., 'Books', 'Fashion', 'Game'
    name VARCHAR(100),          -- e.g., 'Manga (Standard)', 'Switch Game'
    length_cm DOUBLE,           -- 長
    width_cm DOUBLE,            -- 闊
    height_cm DOUBLE,           -- 高 (厚度)
    weight_g INT,               -- 重量 (克)
    image_icon VARCHAR(50)      -- 前端 icon class (e.g., 'fa-book')
);

-- Seed Data (預設數據)
INSERT INTO product_reference (category, name, length_cm, width_cm, height_cm, weight_g) VALUES 
('Books', 'Manga (Jump Comics)', 17.5, 11.5, 1.5, 150),
('Books', 'Novel (Bunko)', 15.0, 10.5, 1.5, 150),
('Fashion', 'T-Shirt (Folded)', 25.0, 20.0, 1.5, 200),
('Fashion', 'Hoodie (Folded)', 25.0, 20.0, 5.0, 500),
('Game', 'Switch Game Case', 17.0, 10.5, 1.2, 60),
('Other', 'Sneakers (Boxed)', 33.0, 23.0, 12.0, 1000);


Table 2: shipping_carrier (快遞公司規則)
存儲不同公司、不同箱子的限制與價錢。
CREATE TABLE shipping_carrier (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(50),   -- e.g., 'Yamato', 'Japan Post'
    service_name VARCHAR(50),   -- e.g., 'Nekopos', 'Compact Box', 'Size 60'
    max_length DOUBLE,
    max_width DOUBLE,
    max_height DOUBLE,
    max_weight_g INT,
    price_yen INT               -- 運費
);

-- Seed Data (規則)
INSERT INTO shipping_carrier (company_name, service_name, max_length, max_width, max_height, price_yen) VALUES
('Yamato', 'Nekopos', 31.2, 22.8, 3.0, 210),
('Yamato', 'Compact Box', 25.0, 20.0, 5.0, 450),
('Yamato', 'Size 60', 60.0, 60.0, 60.0, 750), -- 這裡長闊高是 Sum Limit，需要特殊 Logic 處理
('Japan Post', 'Yu-Packet', 34.0, 25.0, 3.0, 230);


4. Core Logic & Algorithms (核心演算法)
這是項目拿高分的關鍵點。
Logic Flow 1: 物品體積估算 (Aggregation)
當用戶選擇多件物品時 (例如：2 本漫畫 + 1 隻 Game)：
// Pseudo-code
public Dimensions calculateTotalDimensions(List<Item> items) {
    // 策略：假設用戶會將物品「平鋪」以減少厚度 (Smart Stacking)
    // 1. Sort items by Area (Length * Width)
    // 2. 嘗試將小物品放入大物品的平面空間 (Bin Packing 簡化版)
    // 3. 如果放不下，則增加高度 (Stacking)
    
    // 簡易版實現 (MVP)：
    // 總重量 = Sum(weights)
    // 總體積 = Sum(volumes)
    // 估算長闊 = Max(Length), Max(Width)
    // 估算厚度 = Sum(Height) * CompressionFactor (例如衣服可以壓縮 0.8)
    
    return estimatedDimensions; 
}


Logic Flow 2: 最佳運送方式匹配 (Best Fit)
將估算出的尺寸與 shipping_carrier 表進行比對。
Filter (過濾): 排除裝不下的服務 (e.g., 厚度 5cm 的 Hoodie 不能用 Nekopos)。
Sort (排序): 將剩下的可行方案按 price_yen 由低至高排列。
Recommendation (推薦): 標記最便宜 (Best Value) 和最快 (Fastest) 的選項。
5. UI/UX Workflow (前端流程)
Screen 1: Dashboard / Input
Section A: "Quick Add" (Object Reference)
顯示 Card Grid：[漫畫圖示] [衣服圖示] [遊戲圖示]
用戶點擊圖示 -> 下方購物車清單 Quantity + 1
Section B: "Manual Input" (Fallback)
保留傳統輸入框 (L/W/H)，給特殊物品使用。Also shows the extimate L/W/H total sum with the user selected.
Action Button: "Calculate Best Shipping"
Screen 2: Result Page (Comparison)
Header: 顯示輸入的物品摘要 (e.g., "3 Items, Approx. 800g")
Recommendation Card (最推薦):
顯示：🏆 Yamato Compact Box
價錢：¥450
原因："Nekopos 裝不下 (厚度超 3cm)，Compact Box 是最便宜選擇" (這句解釋很重要，顯示智能性)
Other Options List:
Japan Post Yu-Pack: ¥770
Yamato Size 60: ¥750
Action: [Print Label / Generate PDF] (Mockup function)
6. Implementation Roadmap (開發進度表)
Phase
Task
Key Tech
Week 1
Database & Model

1. Setup MySQL.

2. Create Product & Carrier tables.

3. Java Entity classes setup.
MySQL, JDBC/JPA
Week 2
Core Logic (Backend)

1. Implement Calculation Service.

2. Write logic to compare User Item vs Carrier Box.

3. Unit Test the logic.
Java, JUnit
Week 3
Frontend & Integration

1. Build UI with Thymeleaf/Bootstrap.

2. Connect UI to Backend Controller.

3. Add "Mock PDF" button.
HTML/CSS, Thymeleaf

7. Bonus Features (加分題 - 行有餘力再做)
PDF Report: 使用 iText 庫生成模擬運單 PDF。
Chart Visualization: 在 Admin Panel 顯示 "Most Popular Items" (統計哪種物品最多人寄)。
Google Maps API: 輸入 Zip Code 計算距離，精準計算 Size 60 以上的運費 (因距離而異)。
