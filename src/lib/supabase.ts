import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'pasture_feeds_supabase_url';
const STORAGE_KEY_KEY = 'pasture_feeds_supabase_anon_key';

// Project credentials: dynamically read from environment variables or saved app configuration
export const DEFAULT_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://pfdsavlbcjfulsfvhsfu.supabase.co');
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Gszx2zpyTh1mNFC5DogMcg_ptDvXBBn'
);

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'localStorage' | 'default';
  isConfigured: boolean;
}

/**
 * Normalizes Supabase Project URL to ensure no trailing slashes or /rest/v1 suffixes.
 * Often users copy the "REST API URL" (https://.../rest/v1) which causes PGRST125 404 errors.
 */
export const sanitizeSupabaseUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest/v1/
  url = url.replace(/\/rest\/v1\/?$/i, '');
  // Strip /auth/v1 or /auth/v1/
  url = url.replace(/\/auth\/v1\/?$/i, '');
  // Strip any remaining trailing slash
  url = url.replace(/\/+$/, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = sanitizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (envUrl.startsWith('https://') && envKey.length > 15) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
      isConfigured: true,
    };
  }

  try {
    const rawLocalUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
    const localUrl = sanitizeSupabaseUrl(rawLocalUrl);
    const localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

    if (localUrl.startsWith('https://') && localKey.length > 15) {
      return {
        url: localUrl,
        anonKey: localKey,
        source: 'localStorage',
        isConfigured: true,
      };
    }
  } catch (e) {
    // localStorage may not be accessible in rare contexts
  }

  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_PUBLISHABLE_KEY) {
    return {
      url: sanitizeSupabaseUrl(DEFAULT_SUPABASE_URL),
      anonKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
      source: 'default',
      isConfigured: true,
    };
  }

  return {
    url: '',
    anonKey: '',
    source: 'default',
    isConfigured: false,
  };
};

let cachedClient: SupabaseClient | null = null;
let lastConfigUrl = '';
let lastConfigKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    cachedClient = null;
    lastConfigUrl = '';
    lastConfigKey = '';
    return null;
  }

  if (cachedClient && lastConfigUrl === config.url && lastConfigKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastConfigUrl = config.url;
    lastConfigKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();

  localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(STORAGE_KEY_KEY, cleanKey);

  // Invalidate cached client to recreate on next call
  cachedClient = null;
  lastConfigUrl = '';
  lastConfigKey = '';
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  cachedClient = null;
  lastConfigUrl = '';
  lastConfigKey = '';
};

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  tablesFound?: boolean;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured or are invalid.',
    };
  }

  try {
    // Try to query the business_settings table
    const { data, error } = await client
      .from('business_settings')
      .select('id, shop_name')
      .limit(1);

    if (error) {
      // Check if the error is that the relation does not exist or invalid path (schema not yet created)
      if (
        error.code === '42P01' ||
        error.code === 'PGRST125' ||
        error.message.includes('relation') ||
        error.message.includes('does not exist') ||
        error.message.includes('Invalid path')
      ) {
        return {
          success: true,
          tablesFound: false,
          message: 'Connected to Supabase project! The database tables are not detected or schema cache is refreshing. Please execute the SQL schema in Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Connection error: ${error.message} (Code: ${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Successfully connected to Supabase Cloud! Database tables are verified and ready for live synchronization.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network or configuration error: ${err.message || String(err)}`,
    };
  }
};

// Export active singleton for convenience
export const supabase = getSupabaseClient();

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- PASTURE FEEDS AGROVET POS & INVENTORY MANAGEMENT SYSTEM
-- Complete Supabase PostgreSQL Schema with RLS & Foreign Keys
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS public.business_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  shop_name TEXT NOT NULL DEFAULT 'Pasture Feeds Agrovet',
  tagline TEXT DEFAULT 'Quality Animal Feeds & Veterinary Care',
  phone TEXT NOT NULL DEFAULT '+254 722 000 000',
  email TEXT DEFAULT 'info@pasturefeeds.co.ke',
  location TEXT DEFAULT 'Nairobi, Kenya',
  address TEXT DEFAULT 'Nakuru-Nairobi Highway, Thika Branch',
  receipt_footer TEXT DEFAULT 'Thank you for choosing Pasture Feeds. Goods once sold cannot be returned.',
  currency TEXT DEFAULT 'KES',
  currency_symbol TEXT DEFAULT 'KSh',
  default_min_stock_bags NUMERIC DEFAULT 5,
  allow_negative_stock BOOLEAN DEFAULT FALSE,
  tax_enabled BOOLEAN DEFAULT FALSE,
  tax_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  total_purchases_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory TEXT,
  brand TEXT,
  description TEXT,
  base_unit TEXT NOT NULL DEFAULT 'KG',
  selling_price_per_base_unit NUMERIC NOT NULL DEFAULT 0,
  cost_price_per_base_unit NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC NOT NULL DEFAULT 100,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT PACKAGES
CREATE TABLE IF NOT EXISTS public.product_packages (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  size_in_base_units NUMERIC NOT NULL DEFAULT 1,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  barcode TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT,
  email TEXT,
  notes TEXT,
  total_spent NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  credit_balance NUMERIC DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'PAID',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SALE ITEMS
CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  package_id TEXT,
  package_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  quantity_base_units NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price_per_unit NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  estimated_profit NUMERIC NOT NULL DEFAULT 0
);

-- 10. CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  reference TEXT,
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PURCHASES
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  package_id TEXT,
  package_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  quantity_base_units NUMERIC NOT NULL DEFAULT 1,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0
);

-- 13. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  receipt_ref TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. INVENTORY MOVEMENTS AUDIT
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  package_id TEXT,
  package_name TEXT,
  quantity_packages NUMERIC DEFAULT 0,
  quantity_base_units NUMERIC NOT NULL DEFAULT 0,
  base_unit TEXT NOT NULL DEFAULT 'KG',
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  movement_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SYSTEM AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- CREATE PERMISSIVE POLICIES FOR POS OPERATION
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'business_settings', 'user_profiles', 'categories', 'suppliers',
    'products', 'product_packages', 'customers', 'sales', 'sale_items',
    'customer_payments', 'purchases', 'purchase_items', 'expenses',
    'inventory_movements', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access for %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Public access for %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Enable Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_payments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Database Functions for Atomic Stock Transactions
CREATE OR REPLACE FUNCTION public.record_sale_transaction(
  p_sale JSONB,
  p_items JSONB,
  p_movements JSONB DEFAULT '[]'::JSONB,
  p_customer JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_mov RECORD;
BEGIN
  INSERT INTO public.sales (
    id, receipt_number, customer_id, customer_name, customer_phone,
    subtotal, discount, total, payment_method, amount_paid,
    payment_status, notes, status, created_by, created_at
  ) VALUES (
    p_sale->>'id', p_sale->>'receipt_number', p_sale->>'customer_id',
    COALESCE(p_sale->>'customer_name', 'Walk-in Customer'), p_sale->>'customer_phone',
    COALESCE((p_sale->>'subtotal')::NUMERIC, 0), COALESCE((p_sale->>'discount')::NUMERIC, 0),
    COALESCE((p_sale->>'total')::NUMERIC, 0), COALESCE(p_sale->>'payment_method', 'CASH'),
    COALESCE((p_sale->>'amount_paid')::NUMERIC, 0), COALESCE(p_sale->>'payment_status', 'PAID'),
    p_sale->>'notes', COALESCE(p_sale->>'status', 'COMPLETED'),
    COALESCE(p_sale->>'created_by', 'Staff'), COALESCE((p_sale->>'created_at')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    amount_paid = EXCLUDED.amount_paid,
    payment_status = EXCLUDED.payment_status;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id TEXT, sale_id TEXT, product_id TEXT, product_name TEXT, package_id TEXT,
    package_name TEXT, quantity NUMERIC, quantity_base_units NUMERIC,
    unit_price NUMERIC, cost_price_per_unit NUMERIC, line_total NUMERIC, estimated_profit NUMERIC
  ) LOOP
    INSERT INTO public.sale_items (
      id, sale_id, product_id, product_name, package_id, package_name,
      quantity, quantity_base_units, unit_price, cost_price_per_unit,
      line_total, estimated_profit
    ) VALUES (
      v_item.id, v_item.sale_id, v_item.product_id, v_item.product_name,
      v_item.package_id, v_item.package_name, v_item.quantity,
      v_item.quantity_base_units, v_item.unit_price, v_item.cost_price_per_unit,
      v_item.line_total, v_item.estimated_profit
    ) ON CONFLICT (id) DO NOTHING;

    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET current_stock = current_stock - v_item.quantity_base_units,
          updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  IF p_movements IS NOT NULL AND jsonb_array_length(p_movements) > 0 THEN
    FOR v_mov IN SELECT * FROM jsonb_to_recordset(p_movements) AS m(
      id TEXT, product_id TEXT, product_name TEXT, package_id TEXT, package_name TEXT,
      quantity_packages NUMERIC, quantity_base_units NUMERIC, base_unit TEXT,
      previous_stock NUMERIC, new_stock NUMERIC, movement_type TEXT, reference_number TEXT,
      notes TEXT, created_by TEXT, created_at TIMESTAMPTZ
    ) LOOP
      INSERT INTO public.inventory_movements (
        id, product_id, product_name, package_id, package_name,
        quantity_packages, quantity_base_units, base_unit,
        previous_stock, new_stock, movement_type, reference_number,
        notes, created_by, created_at
      ) VALUES (
        v_mov.id, v_mov.product_id, v_mov.product_name, v_mov.package_id, v_mov.package_name,
        v_mov.quantity_packages, v_mov.quantity_base_units, v_mov.base_unit,
        v_mov.previous_stock, v_mov.new_stock, v_mov.movement_type, v_mov.reference_number,
        v_mov.notes, v_mov.created_by, COALESCE(v_mov.created_at, NOW())
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  IF p_customer IS NOT NULL AND p_customer->>'id' IS NOT NULL THEN
    UPDATE public.customers
    SET total_spent = total_spent + COALESCE((p_sale->>'total')::NUMERIC, 0),
        total_orders = total_orders + 1,
        credit_balance = credit_balance + (
          CASE WHEN p_sale->>'payment_method' = 'ON_CREDIT'
               THEN COALESCE((p_sale->>'total')::NUMERIC, 0) - COALESCE((p_sale->>'amount_paid')::NUMERIC, 0)
               ELSE 0 END
        ),
        last_purchase_date = NOW()
    WHERE id = p_customer->>'id';
  END IF;

  RETURN jsonb_build_object('success', true, 'sale_id', p_sale->>'id');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_purchase_transaction(
  p_purchase JSONB,
  p_items JSONB,
  p_movements JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_mov RECORD;
BEGIN
  INSERT INTO public.purchases (
    id, invoice_number, supplier_id, supplier_name, total_cost,
    purchase_date, notes, created_by, created_at
  ) VALUES (
    p_purchase->>'id', p_purchase->>'invoice_number', p_purchase->>'supplier_id',
    p_purchase->>'supplier_name', COALESCE((p_purchase->>'total_cost')::NUMERIC, 0),
    COALESCE((p_purchase->>'purchase_date')::TIMESTAMPTZ, NOW()), p_purchase->>'notes',
    COALESCE(p_purchase->>'created_by', 'Staff'), COALESCE((p_purchase->>'created_at')::TIMESTAMPTZ, NOW())
  ) ON CONFLICT (id) DO NOTHING;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id TEXT, purchase_id TEXT, product_id TEXT, product_name TEXT, package_id TEXT,
    package_name TEXT, quantity NUMERIC, quantity_base_units NUMERIC,
    cost_price NUMERIC, line_total NUMERIC
  ) LOOP
    INSERT INTO public.purchase_items (
      id, purchase_id, product_id, product_name, package_id, package_name,
      quantity, quantity_base_units, cost_price, line_total
    ) VALUES (
      v_item.id, v_item.purchase_id, v_item.product_id, v_item.product_name,
      v_item.package_id, v_item.package_name, v_item.quantity,
      v_item.quantity_base_units, v_item.cost_price, v_item.line_total
    ) ON CONFLICT (id) DO NOTHING;

    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET current_stock = current_stock + v_item.quantity_base_units,
          updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  IF p_movements IS NOT NULL AND jsonb_array_length(p_movements) > 0 THEN
    FOR v_mov IN SELECT * FROM jsonb_to_recordset(p_movements) AS m(
      id TEXT, product_id TEXT, product_name TEXT, package_id TEXT, package_name TEXT,
      quantity_packages NUMERIC, quantity_base_units NUMERIC, base_unit TEXT,
      previous_stock NUMERIC, new_stock NUMERIC, movement_type TEXT, reference_number TEXT,
      notes TEXT, created_by TEXT, created_at TIMESTAMPTZ
    ) LOOP
      INSERT INTO public.inventory_movements (
        id, product_id, product_name, package_id, package_name,
        quantity_packages, quantity_base_units, base_unit,
        previous_stock, new_stock, movement_type, reference_number,
        notes, created_by, created_at
      ) VALUES (
        v_mov.id, v_mov.product_id, v_mov.product_name, v_mov.package_id, v_mov.package_name,
        v_mov.quantity_packages, v_mov.quantity_base_units, v_mov.base_unit,
        v_mov.previous_stock, v_mov.new_stock, v_mov.movement_type, v_mov.reference_number,
        v_mov.notes, v_mov.created_by, COALESCE(v_mov.created_at, NOW())
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  IF p_purchase->>'supplier_id' IS NOT NULL THEN
    UPDATE public.suppliers
    SET total_purchases_amount = total_purchases_amount + COALESCE((p_purchase->>'total_cost')::NUMERIC, 0)
    WHERE id = p_purchase->>'supplier_id';
  END IF;

  RETURN jsonb_build_object('success', true, 'purchase_id', p_purchase->>'id');
END;
$$;
`;
