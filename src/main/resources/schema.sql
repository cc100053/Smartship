-- SmartShip Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS shipping_carrier CASCADE;
DROP TABLE IF EXISTS product_reference CASCADE;
DROP INDEX IF EXISTS idx_product_category;
DROP INDEX IF EXISTS idx_carrier_price;

-- Table 1: product_reference (常見物品預設數據)
-- Used for "Quick Add" feature - users can select common items without measuring
CREATE TABLE product_reference (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,      -- e.g., 'Books', 'Fashion', 'Game'
    name VARCHAR(100) NOT NULL,         -- e.g., 'Manga (Standard)', 'Switch Game'
    name_jp VARCHAR(100) NOT NULL,      -- Japanese name for UI
    length_cm DOUBLE PRECISION NOT NULL, -- 長さ (length)
    width_cm DOUBLE PRECISION NOT NULL,  -- 幅 (width)
    height_cm DOUBLE PRECISION NOT NULL, -- 高さ/厚さ (height/thickness)
    weight_g INTEGER NOT NULL,           -- 重量 (grams)
    image_icon VARCHAR(50) DEFAULT 'box' -- icon name for frontend
);

-- Table 2: shipping_carrier (配送業者の規則)
-- Stores different carriers and their box size limits with prices
CREATE TABLE shipping_carrier (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(50) NOT NULL,   -- e.g., 'Yamato', 'Japan Post'
    service_name VARCHAR(50) NOT NULL,   -- e.g., 'Nekopos', 'Compact Box'
    max_length DOUBLE PRECISION NOT NULL,
    max_width DOUBLE PRECISION NOT NULL,
    max_height DOUBLE PRECISION NOT NULL,
    max_weight_g INT, -- max weight in grams
    size_sum_limit INT, -- max sum of length+width+height in cm
    price_yen INT NOT NULL,          -- 運費 (shipping cost)
    has_tracking BOOLEAN DEFAULT TRUE, -- 追跡あり/なし
    send_location VARCHAR(255), -- Where to send from (e.g. Post Office, Lawson, etc.)
    notes VARCHAR(255)      -- Additional info (constraints like 厚さ3cm以内)
);

-- Create indexes for better query performance
CREATE INDEX idx_product_category ON product_reference(category);
CREATE INDEX idx_carrier_price ON shipping_carrier(price_yen);
