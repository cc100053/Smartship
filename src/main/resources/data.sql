-- ==========================================
-- SmartShip Seed Data (Real-world Mercari/Yahoo Auction Data)
-- ==========================================

-- 1. Product References (Hot Selling Items on Mercari)
-- Sizes are estimated "packed" sizes
DELETE FROM product_reference;

INSERT INTO product_reference (category, name, name_jp, length_cm, width_cm, height_cm, weight_g, image_icon) VALUES
-- Books / Media
('Books', 'Manga (Jump Comic)', '少年コミック (1冊)', 17.6, 11.3, 1.5, 180, 'book'),
('Books', 'Manga Set (6 Books)', 'コミックセット (6冊)', 17.6, 11.3, 9.0, 1100, 'book'),
('Books', 'Magazine (Fashion)', 'ファッション雑誌', 29.7, 23.2, 1.0, 650, 'newspaper'),
('Books', 'Novel (Bunko)', '文庫本', 14.8, 10.5, 1.5, 150, 'book'),

-- Games
('Games', 'Nintendo Switch Game', 'Switchソフト (ケース付)', 17.0, 10.5, 1.1, 70, 'gamepad'),
('Games', 'PS4/PS5 Game', 'PS4/PS5ソフト (ケース付)', 17.0, 13.5, 1.5, 110, 'gamepad'),
('Games', 'Nintendo Switch Console', 'Switch本体 (箱入)', 35.0, 20.0, 9.5, 1500, 'gamepad'),

-- Fashion (Folded & Packed)
('Fashion', 'T-Shirt (Folded)', 'Tシャツ (畳んだ状態)', 25.0, 20.0, 2.0, 200, 'shirt'),
('Fashion', 'Hoodie / Sweatshirt', 'パーカー/スウェット', 35.0, 28.0, 8.0, 600, 'shirt'),
('Fashion', 'Jeans / Denim', 'ジーンズ/デニム', 28.0, 22.0, 4.0, 600, 'shirt'),
('Fashion', 'Sneakers (In Box)', 'スニーカー (箱入)', 33.0, 21.0, 12.0, 1000, 'shirt'),
('Fashion', 'Coat / Jacket', 'コート/ジャケット', 50.0, 40.0, 12.0, 1200, 'shirt'),

-- Electronics
('Electronics', 'Smartphone (In Box)', 'スマートフォン (箱入)', 16.0, 9.0, 5.0, 400, 'phone'),
('Electronics', 'Tablet (iPad)', 'タブレット (本体のみ)', 25.0, 18.0, 1.0, 500, 'tablet'),
('Electronics', 'Laptop (13 inch)', 'ノートPC (13インチ)', 32.0, 23.0, 2.0, 1300, 'tablet'),
('Electronics', 'Wireless Earbuds', 'ワイヤレスイヤホン', 10.0, 10.0, 4.0, 150, 'phone'),

-- Others
('Other', 'Trading Card (Single)', 'トレカ (1枚・硬質ケース)', 11.0, 8.0, 0.5, 20, 'cards'),
('Other', 'Trading Card Box', 'トレカBOX (シュリンク付)', 14.0, 14.0, 4.0, 300, 'cards'),
('Other', 'Cosmetics (Lipstick)', '口紅/リップ', 10.0, 3.0, 3.0, 40, 'gift'),
('Other', 'Cosmetics (Compact)', 'ファンデーション', 12.0, 8.0, 2.0, 80, 'gift'),
('Other', 'K-POP Acrylic Stand', 'アクリルスタンド', 15.0, 10.0, 1.0, 50, 'gift'),
('Other', 'Key Holder/Strap', 'キーホルダー/ストラップ', 10.0, 6.0, 1.0, 30, 'gift');


-- 2. Shipping Carriers (Mercari & Yahoo Auction Standards 2024/2025)
-- Reference: https://pj.mercari.com/mercari-spot/mercari_school_list.pdf
DELETE FROM shipping_carrier;

INSERT INTO shipping_carrier (company_name, service_name, max_length, max_width, max_height, max_weight_g, size_sum_limit, price_yen, has_tracking, send_location, notes) VALUES
-- Yamato Transport (Rakuraku Mercari Bin) - All have tracking
('ヤマト運輸', 'ネコポス', 31.2, 22.8, 3.0, 1000, NULL, 210, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', 'A4サイズ・厚さ3cm以内・1kg以内'),
('ヤマト運輸', '宅急便コンパクト (専用BOX)', 25.0, 20.0, 5.0, 50000, NULL, 450, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '専用BOX代70円別途・厚さ5cm'),
('ヤマト運輸', '宅急便コンパクト (薄型BOX)', 24.8, 34.0, 0.8, 50000, NULL, 450, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '専用薄型BOX代70円別途・厚さ8mm'),
('ヤマト運輸', '宅急便 60サイズ', 60.0, 60.0, 60.0, 2000, 60, 750, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計60cm以内・2kg以内'),
('ヤマト運輸', '宅急便 80サイズ', 80.0, 80.0, 80.0, 5000, 80, 850, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計80cm以内・5kg以内'),
('ヤマト運輸', '宅急便 100サイズ', 100.0, 100.0, 100.0, 10000, 100, 1050, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計100cm以内・10kg以内'),
('ヤマト運輸', '宅急便 120サイズ', 120.0, 120.0, 120.0, 15000, 120, 1200, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計120cm以内・15kg以内'),
('ヤマト運輸', '宅急便 140サイズ', 140.0, 140.0, 140.0, 20000, 140, 1450, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計140cm以内・20kg以内'),
('ヤマト運輸', '宅急便 160サイズ', 160.0, 160.0, 160.0, 25000, 160, 1700, TRUE, 'セブンイレブン, FamilyMart, PUDO, ヤマト営業所', '3辺合計160cm以内・25kg以内'),
('ヤマト運輸', '宅急便 180サイズ', 180.0, 180.0, 180.0, 30000, 180, 2100, TRUE, 'ヤマト営業所のみ', '3辺合計180cm以内・30kg以内・集荷不可'),
('ヤマト運輸', '宅急便 200サイズ', 200.0, 200.0, 200.0, 30000, 200, 2500, TRUE, 'ヤマト営業所のみ', '3辺合計200cm以内・30kg以内・集荷不可'),

-- Japan Post (Yuuyuu Mercari Bin) - All have tracking
('日本郵便', 'ゆうパケットポストmini', 21.0, 17.0, 3.0, 2000, NULL, 160, TRUE, '郵便ポスト', '専用封筒代20円別途・厚さ3cm・2kg以内'),
('日本郵便', 'ゆうパケット', 34.0, 23.0, 3.0, 1000, 60, 230, TRUE, '郵便局, ローソン', '長辺34cm・厚さ3cm以内・1kg以内'),
('日本郵便', 'ゆうパケットポスト', 34.0, 23.0, 4.0, 2000, 60, 215, TRUE, '郵便ポスト', 'シール代5円別途・厚さ4cm・2kg以内'),
('日本郵便', 'ゆうパケットプラス', 24.0, 17.0, 7.0, 2000, NULL, 455, TRUE, '郵便局, ローソン', '専用BOX代65円別途・厚さ7cm・2kg以内'),
('日本郵便', 'ゆうパック 60サイズ', 60.0, 60.0, 60.0, 25000, 60, 770, TRUE, '郵便局, ローソン', '3辺合計60cm以内・25kg以内'),
('日本郵便', 'ゆうパック 80サイズ', 80.0, 80.0, 80.0, 25000, 80, 870, TRUE, '郵便局, ローソン', '3辺合計80cm以内・25kg以内'),
('日本郵便', 'ゆうパック 100サイズ', 100.0, 100.0, 100.0, 25000, 100, 1070, TRUE, '郵便局, ローソン', '3辺合計100cm以内・25kg以内'),
('日本郵便', 'ゆうパック 120サイズ', 120.0, 120.0, 120.0, 25000, 120, 1200, TRUE, '郵便局, ローソン', '3辺合計120cm以内・25kg以内'),
('日本郵便', 'ゆうパック 140サイズ', 140.0, 140.0, 140.0, 25000, 140, 1450, TRUE, '郵便局, ローソン', '3辺合計140cm以内・25kg以内'),
('日本郵便', 'ゆうパック 160サイズ', 160.0, 160.0, 160.0, 25000, 160, 1700, TRUE, '郵便局, ローソン', '3辺合計160cm以内・25kg以内'),
('日本郵便', 'ゆうパック 170サイズ', 170.0, 170.0, 170.0, 25000, 170, 1900, TRUE, '郵便局, ローソン', '3辺合計170cm以内・25kg以内'),

-- Non-Mercari Bin Options (Standard Mail / Letter Pack)
('日本郵便 (その他)', 'レターパックライト', 34.0, 24.8, 3.0, 4000, NULL, 430, TRUE, '郵便ポスト, 郵便局', 'A4サイズ・厚さ3cm以内・4kg以内'),
('日本郵便 (その他)', 'レターパックプラス', 34.0, 24.8, 10.0, 4000, NULL, 600, TRUE, '郵便ポスト, 郵便局', 'A4サイズ・対面受取・4kg以内'),
('日本郵便 (その他)', 'スマートレター', 25.0, 17.0, 2.0, 1000, NULL, 210, FALSE, '郵便ポスト, 郵便局', 'A5サイズ・厚さ2cm以内・1kg以内'),
('日本郵便 (その他)', '定形郵便 (50g以内)', 23.5, 12.0, 1.0, 50, NULL, 110, FALSE, '郵便ポスト, 郵便局', '長形3号封筒・厚さ1cm以内・50g以内'),
('日本郵便 (その他)', '定形外郵便 (規格内 50g)', 34.0, 25.0, 3.0, 50, NULL, 140, FALSE, '郵便ポスト, 郵便局', '厚さ3cm以内・50g以内'),
('日本郵便 (その他)', '定形外郵便 (規格内 100g)', 34.0, 25.0, 3.0, 100, NULL, 180, FALSE, '郵便ポスト, 郵便局', '厚さ3cm以内・100g以内'),
('日本郵便 (その他)', '定形外郵便 (規格内 150g)', 34.0, 25.0, 3.0, 150, NULL, 270, FALSE, '郵便ポスト, 郵便局', '厚さ3cm以内・150g以内'),
('日本郵便 (その他)', 'クリックポスト', 34.0, 25.0, 3.0, 1000, NULL, 185, TRUE, '郵便ポスト', '厚さ3cm以内・1kg以内・ネット決済');
