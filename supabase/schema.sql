-- ==============================================================================
-- PASTURE FEEDS AGROVET POS & INVENTORY MANAGEMENT SYSTEM
-- Complete Supabase PostgreSQL Schema with RLS & Foreign Keys
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BUSINESS SETTINGS TABLE
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

-- 3. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF', -- 'ADMIN', 'MANAGER', 'STAFF'
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE
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

-- 6. PRODUCTS TABLE
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

-- 7. PRODUCT PACKAGES TABLE (50kg, 20kg, 10kg, loose kg)
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

-- 8. CUSTOMERS TABLE
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

-- 9. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH', -- 'CASH', 'BANK_TRANSFER', 'ON_CREDIT', 'OTHER_DIRECT'
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'UNPAID'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'VOIDED'
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALE ITEMS TABLE
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

-- 11. CUSTOMER PAYMENTS TABLE (Credit Settlements)
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

-- 12. CUSTOMER PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.customer_payment_allocations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_id TEXT NOT NULL REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  amount_applied NUMERIC NOT NULL DEFAULT 0
);

-- 13. PURCHASES TABLE (Restocking & Supplier Invoices)
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

-- 14. PURCHASE ITEMS TABLE
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

-- 15. EXPENSES TABLE
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

-- 16. INVENTORY MOVEMENTS AUDIT TABLE
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

-- 17. PRODUCT PRICE HISTORIES TABLE
CREATE TABLE IF NOT EXISTS public.price_histories (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  package_id TEXT,
  package_name TEXT,
  old_selling_price NUMERIC NOT NULL,
  new_selling_price NUMERIC NOT NULL,
  old_cost_price NUMERIC,
  new_cost_price NUMERIC,
  changed_by TEXT NOT NULL DEFAULT 'System',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. SYSTEM AUDIT LOGS TABLE
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

-- ==============================================================================
-- INDEXES FOR FAST QUERYING & REAL-TIME REPLICATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies allowing client POS application read/write access
-- ==============================================================================
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
ALTER TABLE public.customer_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access with anon / authenticated keys
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'business_settings', 'user_profiles', 'categories', 'suppliers',
    'products', 'product_packages', 'customers', 'sales', 'sale_items',
    'customer_payments', 'customer_payment_allocations', 'purchases',
    'purchase_items', 'expenses', 'inventory_movements', 'price_histories',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access for %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Public access for %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Enable Realtime for critical transactional tables
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
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ==============================================================================
-- DATABASE TRANSACTION FUNCTIONS (REQUIREMENT 13: DATA INTEGRITY)
-- Atomic sale & purchase transactions ensuring stock is never changed incorrectly
-- ==============================================================================

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
  -- 1. Insert or update sale
  INSERT INTO public.sales (
    id, receipt_number, customer_id, customer_name, customer_phone,
    subtotal, discount, total, payment_method, amount_paid,
    payment_status, notes, status, created_by, created_at
  ) VALUES (
    p_sale->>'id',
    p_sale->>'receipt_number',
    p_sale->>'customer_id',
    COALESCE(p_sale->>'customer_name', 'Walk-in Customer'),
    p_sale->>'customer_phone',
    COALESCE((p_sale->>'subtotal')::NUMERIC, 0),
    COALESCE((p_sale->>'discount')::NUMERIC, 0),
    COALESCE((p_sale->>'total')::NUMERIC, 0),
    COALESCE(p_sale->>'payment_method', 'CASH'),
    COALESCE((p_sale->>'amount_paid')::NUMERIC, 0),
    COALESCE(p_sale->>'payment_status', 'PAID'),
    p_sale->>'notes',
    COALESCE(p_sale->>'status', 'COMPLETED'),
    COALESCE(p_sale->>'created_by', 'Staff'),
    COALESCE((p_sale->>'created_at')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    amount_paid = EXCLUDED.amount_paid,
    payment_status = EXCLUDED.payment_status;

  -- 2. Insert items and decrement stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id TEXT,
    sale_id TEXT,
    product_id TEXT,
    product_name TEXT,
    package_id TEXT,
    package_name TEXT,
    quantity NUMERIC,
    quantity_base_units NUMERIC,
    unit_price NUMERIC,
    cost_price_per_unit NUMERIC,
    line_total NUMERIC,
    estimated_profit NUMERIC
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
    )
    ON CONFLICT (id) DO NOTHING;

    -- Decrement stock in products
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET current_stock = current_stock - v_item.quantity_base_units,
          updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- 3. Insert audit movements
  IF p_movements IS NOT NULL AND jsonb_array_length(p_movements) > 0 THEN
    FOR v_mov IN SELECT * FROM jsonb_to_recordset(p_movements) AS m(
      id TEXT,
      product_id TEXT,
      product_name TEXT,
      package_id TEXT,
      package_name TEXT,
      quantity_packages NUMERIC,
      quantity_base_units NUMERIC,
      base_unit TEXT,
      previous_stock NUMERIC,
      new_stock NUMERIC,
      movement_type TEXT,
      reference_number TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ
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
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Update customer stats
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
  -- 1. Insert Purchase
  INSERT INTO public.purchases (
    id, invoice_number, supplier_id, supplier_name, total_cost,
    purchase_date, notes, created_by, created_at
  ) VALUES (
    p_purchase->>'id',
    p_purchase->>'invoice_number',
    p_purchase->>'supplier_id',
    p_purchase->>'supplier_name',
    COALESCE((p_purchase->>'total_cost')::NUMERIC, 0),
    COALESCE((p_purchase->>'purchase_date')::TIMESTAMPTZ, NOW()),
    p_purchase->>'notes',
    COALESCE(p_purchase->>'created_by', 'Staff'),
    COALESCE((p_purchase->>'created_at')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert Items and increment stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id TEXT,
    purchase_id TEXT,
    product_id TEXT,
    product_name TEXT,
    package_id TEXT,
    package_name TEXT,
    quantity NUMERIC,
    quantity_base_units NUMERIC,
    cost_price NUMERIC,
    line_total NUMERIC
  ) LOOP
    INSERT INTO public.purchase_items (
      id, purchase_id, product_id, product_name, package_id, package_name,
      quantity, quantity_base_units, cost_price, line_total
    ) VALUES (
      v_item.id, v_item.purchase_id, v_item.product_id, v_item.product_name,
      v_item.package_id, v_item.package_name, v_item.quantity,
      v_item.quantity_base_units, v_item.cost_price, v_item.line_total
    )
    ON CONFLICT (id) DO NOTHING;

    -- Increment stock
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET current_stock = current_stock + v_item.quantity_base_units,
          updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- 3. Insert Movements
  IF p_movements IS NOT NULL AND jsonb_array_length(p_movements) > 0 THEN
    FOR v_mov IN SELECT * FROM jsonb_to_recordset(p_movements) AS m(
      id TEXT,
      product_id TEXT,
      product_name TEXT,
      package_id TEXT,
      package_name TEXT,
      quantity_packages NUMERIC,
      quantity_base_units NUMERIC,
      base_unit TEXT,
      previous_stock NUMERIC,
      new_stock NUMERIC,
      movement_type TEXT,
      reference_number TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ
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
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Update supplier total purchases
  IF p_purchase->>'supplier_id' IS NOT NULL THEN
    UPDATE public.suppliers
    SET total_purchases_amount = total_purchases_amount + COALESCE((p_purchase->>'total_cost')::NUMERIC, 0)
    WHERE id = p_purchase->>'supplier_id';
  END IF;

  RETURN jsonb_build_object('success', true, 'purchase_id', p_purchase->>'id');
END;
$$;

