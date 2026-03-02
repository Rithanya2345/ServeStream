-- =============================================================================
-- CENTRALIZED IVR-ENABLED RATION DISTRIBUTION MANAGEMENT SYSTEM
-- Database Schema for Tamil Nadu, India
-- PostgreSQL 15+ / Supabase Compatible
-- =============================================================================
-- Design Principles:
--   • UUID primary keys for distributed safety
--   • Geographic hierarchy: districts → taluks → ration_shops
--   • One active token per ration card (partial unique index)
--   • IVR phone number uniquely maps to a ration shop
--   • Immutable audit log for every state-changing action
--   • ENUMs for controlled vocabularies
--   • Auto-updated timestamps via trigger
-- =============================================================================

-- ─────────────────────────────────────────────
-- 0A. CLEANUP (safe to re-run)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS vw_current_month_stock CASCADE;
DROP VIEW IF EXISTS vw_today_active_tokens CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ivr_call_logs CASCADE;
DROP TABLE IF EXISTS token_items CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS shop_stock CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS ration_cards CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;
DROP TABLE IF EXISTS ration_shops CASCADE;
DROP TABLE IF EXISTS taluks CASCADE;
DROP TABLE IF EXISTS districts CASCADE;

DROP TYPE IF EXISTS card_type CASCADE;
DROP TYPE IF EXISTS token_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS ivr_action CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_token_number(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_next_queue_number(UUID, DATE) CASCADE;

-- ─────────────────────────────────────────────
-- 0B. EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid() fallback

-- ─────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────

-- Ration card categories as per Tamil Nadu PDS
CREATE TYPE card_type AS ENUM (
  'AAY',        -- Antyodaya Anna Yojana (poorest of poor)
  'PHH',        -- Priority Household
  'NPHH',       -- Non-Priority Household
  'AY'          -- Annapurna Yojana
);

-- Lifecycle of a booking token
CREATE TYPE token_status AS ENUM (
  'booked',     -- Token created via IVR or admin
  'confirmed',  -- Shop operator confirmed for collection
  'collected',  -- Beneficiary collected ration
  'cancelled',  -- Cancelled by beneficiary or system
  'expired'     -- Auto-expired (not collected in time)
);

-- System user roles for RBAC
CREATE TYPE user_role AS ENUM (
  'super_admin',    -- State-level administrator
  'district_admin', -- District-level administrator
  'shop_operator',  -- Ration shop staff
  'auditor'         -- Read-only audit access
);

-- IVR call action types
CREATE TYPE ivr_action AS ENUM (
  'book_token',         -- Beneficiary booked a token
  'check_status',       -- Beneficiary checked token status
  'check_stock',        -- Beneficiary checked stock availability
  'cancel_token',       -- Beneficiary cancelled a token
  'invalid_card',       -- Card number not found / not linked to shop
  'duplicate_booking',  -- Already has an active token
  'call_dropped',       -- Call ended before completing action
  'language_selected'   -- Language preference recorded
);

-- ─────────────────────────────────────────────
-- 2. UTILITY: auto-update updated_at column
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 3. DISTRICTS
-- ─────────────────────────────────────────────
-- Top-level geographic unit. Tamil Nadu has 38 districts.
CREATE TABLE districts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  name_ta     VARCHAR(100),           -- Tamil name
  code        VARCHAR(10)  NOT NULL UNIQUE,  -- e.g. 'CHN' for Chennai
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_districts_updated_at
  BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 4. TALUKS (Sub-districts)
-- ─────────────────────────────────────────────
CREATE TABLE taluks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id UUID         NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  name        VARCHAR(100) NOT NULL,
  name_ta     VARCHAR(100),
  code        VARCHAR(10)  NOT NULL UNIQUE,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_taluks_district ON taluks(district_id);

CREATE TRIGGER trg_taluks_updated_at
  BEFORE UPDATE ON taluks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 5. RATION SHOPS (Fair Price Shops)
-- ─────────────────────────────────────────────
-- Each shop has a unique IVR phone number that beneficiaries call.
CREATE TABLE ration_shops (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taluk_id         UUID          NOT NULL REFERENCES taluks(id) ON DELETE RESTRICT,
  shop_code        VARCHAR(20)   NOT NULL UNIQUE,       -- Official shop number
  name             VARCHAR(150)  NOT NULL,
  name_ta          VARCHAR(150),
  address          TEXT,
  pincode          VARCHAR(6),
  latitude         DECIMAL(10, 7),
  longitude        DECIMAL(10, 7),
  ivr_phone_number VARCHAR(15)   NOT NULL UNIQUE,       -- Unique IVR line for this shop
  operator_name    VARCHAR(100),                         -- Primary operator name
  operator_phone   VARCHAR(15),                          -- Operator's personal phone
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  operating_hours  VARCHAR(50)   DEFAULT '09:00-17:00',  -- Display in IVR
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ration_shops_taluk     ON ration_shops(taluk_id);
CREATE INDEX idx_ration_shops_ivr_phone ON ration_shops(ivr_phone_number);
CREATE INDEX idx_ration_shops_code      ON ration_shops(shop_code);

CREATE TRIGGER trg_ration_shops_updated_at
  BEFORE UPDATE ON ration_shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 6. RATION CARDS (Beneficiary Cards)
-- ─────────────────────────────────────────────
-- Each card is linked to exactly one ration shop.
-- The card_number is what the beneficiary enters via DTMF on the IVR.
CREATE TABLE ration_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID          NOT NULL REFERENCES ration_shops(id) ON DELETE RESTRICT,
  card_number     VARCHAR(20)   NOT NULL UNIQUE,  -- Entered via IVR keypad
  card_type       card_type     NOT NULL DEFAULT 'PHH',
  head_of_family  VARCHAR(100)  NOT NULL,
  head_of_family_ta VARCHAR(100),
  mobile_number   VARCHAR(15),                     -- Optional; for SMS alerts
  address         TEXT,
  total_members   INTEGER       NOT NULL DEFAULT 1 CHECK (total_members >= 1),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ration_cards_shop        ON ration_cards(shop_id);
CREATE INDEX idx_ration_cards_card_number ON ration_cards(card_number);
CREATE INDEX idx_ration_cards_card_type   ON ration_cards(card_type);

CREATE TRIGGER trg_ration_cards_updated_at
  BEFORE UPDATE ON ration_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 7. FAMILY MEMBERS
-- ─────────────────────────────────────────────
-- Members listed under each ration card.
CREATE TABLE family_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ration_card_id  UUID         NOT NULL REFERENCES ration_cards(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_ta         VARCHAR(100),
  age             INTEGER      CHECK (age >= 0 AND age <= 150),
  gender          VARCHAR(10)  CHECK (gender IN ('male', 'female', 'other')),
  relationship    VARCHAR(50),              -- e.g. 'self', 'spouse', 'son', 'daughter'
  aadhaar_last4   VARCHAR(4),               -- Last 4 digits for verification
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_family_members_card ON family_members(ration_card_id);

CREATE TRIGGER trg_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 8. COMMODITIES (Master Catalog)
-- ─────────────────────────────────────────────
-- Central list of ration items distributed through PDS.
CREATE TABLE commodities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  name_ta     VARCHAR(100),
  unit        VARCHAR(20)  NOT NULL DEFAULT 'kg',  -- kg, litres, packets
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_commodities_updated_at
  BEFORE UPDATE ON commodities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 9. SHOP STOCK (Inventory per Shop per Month)
-- ─────────────────────────────────────────────
-- Tracks monthly allocation and remaining stock for each commodity at each shop.
CREATE TABLE shop_stock (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID          NOT NULL REFERENCES ration_shops(id) ON DELETE CASCADE,
  commodity_id    UUID          NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
  month           INTEGER       NOT NULL CHECK (month >= 1 AND month <= 12),
  year            INTEGER       NOT NULL CHECK (year >= 2020),
  allocated_qty   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (allocated_qty >= 0),
  distributed_qty DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (distributed_qty >= 0),
  remaining_qty   DECIMAL(10,2) GENERATED ALWAYS AS (allocated_qty - distributed_qty) STORED,
  last_updated_by UUID,                  -- References users(id); set by app
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One stock entry per shop/commodity/month/year
  CONSTRAINT uq_shop_stock_period UNIQUE (shop_id, commodity_id, month, year),
  -- Cannot distribute more than allocated
  CONSTRAINT chk_distributed_lte_allocated CHECK (distributed_qty <= allocated_qty)
);

CREATE INDEX idx_shop_stock_shop      ON shop_stock(shop_id);
CREATE INDEX idx_shop_stock_commodity ON shop_stock(commodity_id);
CREATE INDEX idx_shop_stock_period    ON shop_stock(year, month);

CREATE TRIGGER trg_shop_stock_updated_at
  BEFORE UPDATE ON shop_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 10. TOKENS (Booking Tokens)
-- ─────────────────────────────────────────────
-- Central table for ration booking. Queue numbers are per-shop per-day.
-- The partial unique index below enforces: one active token per ration card.
CREATE TABLE tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ration_card_id  UUID          NOT NULL REFERENCES ration_cards(id) ON DELETE RESTRICT,
  shop_id         UUID          NOT NULL REFERENCES ration_shops(id) ON DELETE RESTRICT,
  token_number    VARCHAR(50)   NOT NULL,          -- Human-readable, e.g. 'TKN-20260216-003'
  queue_number    INTEGER       NOT NULL,           -- Sequential per shop per day
  booking_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  collection_date DATE,                             -- Scheduled pickup date (can be same day)
  status          token_status  NOT NULL DEFAULT 'booked',
  booked_via      VARCHAR(20)   NOT NULL DEFAULT 'ivr'
                                CHECK (booked_via IN ('ivr', 'admin', 'mobile', 'walk_in', 'chatbot')),
  collected_at    TIMESTAMPTZ,                      -- When ration was actually collected
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ★ CRITICAL: Only one active (booked or confirmed) token per ration card
CREATE UNIQUE INDEX idx_one_active_token_per_card
  ON tokens (ration_card_id)
  WHERE status IN ('booked', 'confirmed');

CREATE INDEX idx_tokens_shop          ON tokens(shop_id);
CREATE INDEX idx_tokens_card          ON tokens(ration_card_id);
CREATE INDEX idx_tokens_booking_date  ON tokens(booking_date);
CREATE INDEX idx_tokens_status        ON tokens(status);
CREATE INDEX idx_tokens_number        ON tokens(token_number);

CREATE TRIGGER trg_tokens_updated_at
  BEFORE UPDATE ON tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 11. TOKEN ITEMS (Line Items per Token)
-- ─────────────────────────────────────────────
-- Each token can include multiple commodities with entitled quantities.
CREATE TABLE token_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        UUID          NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  commodity_id    UUID          NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
  entitled_qty    DECIMAL(10,2) NOT NULL CHECK (entitled_qty > 0),
  distributed_qty DECIMAL(10,2) DEFAULT 0 CHECK (distributed_qty >= 0),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One line per commodity per token
  CONSTRAINT uq_token_commodity UNIQUE (token_id, commodity_id)
);

CREATE INDEX idx_token_items_token     ON token_items(token_id);
CREATE INDEX idx_token_items_commodity ON token_items(commodity_id);

CREATE TRIGGER trg_token_items_updated_at
  BEFORE UPDATE ON token_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 12. USERS (System Users — RBAC)
-- ─────────────────────────────────────────────
-- Admins, shop operators, auditors. Passwords hashed at the app layer (bcrypt).
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  full_name_ta    VARCHAR(100),
  phone           VARCHAR(15),
  role            user_role    NOT NULL DEFAULT 'shop_operator',
  shop_id         UUID         REFERENCES ration_shops(id) ON DELETE SET NULL,  -- NULL for super_admin / auditor
  district_id     UUID         REFERENCES districts(id) ON DELETE SET NULL,     -- For district_admin
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_shop     ON users(shop_id);
CREATE INDEX idx_users_district ON users(district_id);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 13. IVR CALL LOGS
-- ─────────────────────────────────────────────
-- Records every IVR interaction for transparency and audit.
CREATE TABLE ivr_call_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID          NOT NULL REFERENCES ration_shops(id) ON DELETE RESTRICT,
  ration_card_id  UUID          REFERENCES ration_cards(id) ON DELETE SET NULL,  -- NULL if card not identified
  caller_number   VARCHAR(15),             -- Caller's phone number (CLI)
  ivr_phone       VARCHAR(15)  NOT NULL,   -- IVR line called (matches shop)
  action          ivr_action   NOT NULL,
  dtmf_input      VARCHAR(50),             -- Raw DTMF key presses
  token_id        UUID         REFERENCES tokens(id) ON DELETE SET NULL,
  response_text   TEXT,                     -- TTS response played to caller
  call_duration   INTEGER      DEFAULT 0,  -- Duration in seconds
  call_sid        VARCHAR(100),            -- Telephony provider's call ID
  is_successful   BOOLEAN      NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- No updated_at: call logs are immutable
);

CREATE INDEX idx_ivr_logs_shop      ON ivr_call_logs(shop_id);
CREATE INDEX idx_ivr_logs_card      ON ivr_call_logs(ration_card_id);
CREATE INDEX idx_ivr_logs_action    ON ivr_call_logs(action);
CREATE INDEX idx_ivr_logs_date      ON ivr_call_logs(created_at);
CREATE INDEX idx_ivr_logs_call_sid  ON ivr_call_logs(call_sid);

-- ─────────────────────────────────────────────
-- 14. AUDIT LOGS (Immutable Change Trail)
-- ─────────────────────────────────────────────
-- Every state-changing operation is logged here.
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          REFERENCES users(id) ON DELETE SET NULL,  -- NULL for IVR-initiated
  action          VARCHAR(100)  NOT NULL,       -- e.g. 'token.booked', 'stock.updated'
  entity_type     VARCHAR(50)   NOT NULL,       -- Table name, e.g. 'tokens'
  entity_id       UUID          NOT NULL,       -- PK of the affected row
  old_values      JSONB,                        -- Previous state (NULL for inserts)
  new_values      JSONB,                        -- New state
  ip_address      VARCHAR(45),                  -- Requester IP
  user_agent      TEXT,                         -- Browser / IVR identifier
  metadata        JSONB,                        -- Extra context (e.g. IVR call SID)
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- No updated_at: audit logs are immutable
);

CREATE INDEX idx_audit_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user        ON audit_logs(user_id);
CREATE INDEX idx_audit_action      ON audit_logs(action);
CREATE INDEX idx_audit_created     ON audit_logs(created_at);

-- ─────────────────────────────────────────────
-- 15. HELPER FUNCTION: Generate Token Number
-- ─────────────────────────────────────────────
-- Generates human-readable token numbers like TKN-20260216-003
CREATE OR REPLACE FUNCTION generate_token_number(p_shop_id UUID, p_date DATE)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_shop_code VARCHAR(20);
BEGIN
  SELECT shop_code INTO v_shop_code FROM ration_shops WHERE id = p_shop_id;

  SELECT COUNT(*) + 1 INTO v_count
  FROM tokens
  WHERE shop_id = p_shop_id AND booking_date = p_date;

  RETURN 'TKN-' || v_shop_code || '-' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 16. HELPER FUNCTION: Get Next Queue Number
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_next_queue_number(p_shop_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_max
  FROM tokens
  WHERE shop_id = p_shop_id AND booking_date = p_date;

  RETURN v_max;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 17. SEED DATA: Standard Commodities
-- ─────────────────────────────────────────────
INSERT INTO commodities (name, name_ta, unit, description) VALUES
  ('Rice',            'அரிசி',       'kg',      'White rice distributed under PDS'),
  ('Wheat',           'கோதுமை',     'kg',      'Whole wheat grain'),
  ('Sugar',           'சர்க்கரை',    'kg',      'White sugar'),
  ('Kerosene',        'மண்ணெண்ணெய்', 'litres',  'Kerosene for cooking fuel'),
  ('Toor Dal',        'துவரம் பருப்பு', 'kg',    'Split pigeon peas'),
  ('Urad Dal',        'உளுந்து',     'kg',      'Split black gram'),
  ('Palm Oil',        'பனை எண்ணெய்', 'litres',  'Edible palm oil'),
  ('Fortified Atta',  'ஆட்டா',       'kg',      'Fortified wheat flour')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- 18. SEED DATA: Sample District & Taluk
-- ─────────────────────────────────────────────
INSERT INTO districts (name, name_ta, code) VALUES
  ('Chennai',     'சென்னை',     'CHN'),
  ('Coimbatore',  'கோயம்புத்தூர்', 'CBE'),
  ('Madurai',     'மதுரை',       'MDU'),
  ('Tiruchirappalli', 'திருச்சிராப்பள்ளி', 'TRY'),
  ('Salem',       'சேலம்',       'SLM')
ON CONFLICT (code) DO NOTHING;

-- Sample taluks for Chennai
INSERT INTO taluks (district_id, name, name_ta, code)
SELECT d.id, t.name, t.name_ta, t.code
FROM districts d
CROSS JOIN (VALUES
  ('Egmore-Nungambakkam', 'எழும்பூர்-நுங்கம்பாக்கம்', 'CHN-EGM'),
  ('Mylapore-Triplicane',  'மயிலாப்பூர்-திருவல்லிக்கேணி', 'CHN-MYL'),
  ('Tondiarpet',           'தொண்டியார்பேட்டை',           'CHN-TND')
) AS t(name, name_ta, code)
WHERE d.code = 'CHN'
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────
-- 19. VIEWS: Useful Reporting Views
-- ─────────────────────────────────────────────

-- Active token summary per shop for today
CREATE OR REPLACE VIEW vw_today_active_tokens AS
SELECT
  rs.shop_code,
  rs.name AS shop_name,
  COUNT(t.id) AS active_tokens,
  MAX(t.queue_number) AS last_queue_number
FROM ration_shops rs
LEFT JOIN tokens t
  ON t.shop_id = rs.id
  AND t.booking_date = CURRENT_DATE
  AND t.status IN ('booked', 'confirmed')
GROUP BY rs.id, rs.shop_code, rs.name;

-- Current month stock overview per shop
CREATE OR REPLACE VIEW vw_current_month_stock AS
SELECT
  rs.shop_code,
  rs.name AS shop_name,
  c.name AS commodity,
  ss.allocated_qty,
  ss.distributed_qty,
  ss.remaining_qty,
  ss.year,
  ss.month
FROM shop_stock ss
JOIN ration_shops rs ON rs.id = ss.shop_id
JOIN commodities c ON c.id = ss.commodity_id
WHERE ss.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND ss.month = EXTRACT(MONTH FROM CURRENT_DATE);

-- ─────────────────────────────────────────────
-- SCHEMA COMPLETE
-- ─────────────────────────────────────────────
