-- SmartShip Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS shipping_carrier CASCADE;
DROP TABLE IF EXISTS product_reference CASCADE;
DROP TABLE IF EXISTS calculation_events CASCADE;
DROP TABLE IF EXISTS account_refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_liked_products CASCADE;
DROP TABLE IF EXISTS user_saved_products CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP INDEX IF EXISTS idx_calculation_events_created_at;
DROP INDEX IF EXISTS idx_product_category;
DROP INDEX IF EXISTS idx_carrier_price;
DROP INDEX IF EXISTS idx_accounts_normalized_login_id;
DROP INDEX IF EXISTS idx_account_refresh_tokens_account_id;
DROP INDEX IF EXISTS idx_account_refresh_tokens_token_id;
DROP INDEX IF EXISTS idx_user_saved_products_account_id;
DROP INDEX IF EXISTS idx_user_liked_products_account_id;

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

-- Table 3: accounts (simple ID/password auth)
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    login_id VARCHAR(120) NOT NULL,
    normalized_login_id VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: user_saved_products (user-created reusable products)
CREATE TABLE account_refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_id VARCHAR(120) NOT NULL UNIQUE,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Table 5: user_saved_products (user-created reusable products)
CREATE TABLE user_saved_products (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    name VARCHAR(120) NOT NULL,
    length_cm DOUBLE PRECISION NOT NULL,
    width_cm DOUBLE PRECISION NOT NULL,
    height_cm DOUBLE PRECISION NOT NULL,
    weight_g INTEGER NOT NULL,
    image_icon VARCHAR(50) NOT NULL DEFAULT 'box',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 6: user_liked_products (existing library products liked by user)
CREATE TABLE user_liked_products (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    product_reference_id INTEGER NOT NULL REFERENCES product_reference(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_liked_products_account_product UNIQUE (account_id, product_reference_id)
);

-- Table 7: calculation_events (official stats events for successful calculations)
CREATE TABLE calculation_events (
    id BIGSERIAL PRIMARY KEY,
    calculation_mode VARCHAR(20) NOT NULL,
    item_count INTEGER NOT NULL,
    packed_weight_g INTEGER NOT NULL,
    recommended_option_id INTEGER,
    recommended_price_yen INTEGER NOT NULL,
    second_option_id INTEGER,
    second_option_price_yen INTEGER,
    saving_yen INTEGER NOT NULL,
    recommended_max_dimension_cm DOUBLE PRECISION NOT NULL,
    recommended_volume_cm3 DOUBLE PRECISION NOT NULL,
    second_max_dimension_cm DOUBLE PRECISION,
    second_option_volume_cm3 DOUBLE PRECISION,
    size_gap_cm DOUBLE PRECISION NOT NULL,
    volume_saved_cm3 DOUBLE PRECISION NOT NULL,
    estimated_co2e_saved_g INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_calculation_events_created_at ON calculation_events(created_at);
CREATE INDEX idx_product_category ON product_reference(category);
CREATE INDEX idx_carrier_price ON shipping_carrier(price_yen);
CREATE INDEX idx_accounts_normalized_login_id ON accounts(normalized_login_id);
CREATE INDEX idx_account_refresh_tokens_account_id ON account_refresh_tokens(account_id);
CREATE INDEX idx_account_refresh_tokens_token_id ON account_refresh_tokens(token_id);
CREATE INDEX idx_user_saved_products_account_id ON user_saved_products(account_id);
CREATE INDEX idx_user_liked_products_account_id ON user_liked_products(account_id);
