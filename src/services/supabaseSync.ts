import { getSupabaseClient } from '../lib/supabase';
import {
  Product,
  ProductCategory,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  InventoryMovement,
  CustomerPayment,
  BusinessSettings,
  UserProfile,
} from '../types';

export interface SyncProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  details?: Record<string, number>;
}

/**
 * Upload all local in-memory/localStorage data to Supabase (Initial Migration / Push)
 */
export const uploadAllToSupabase = async (
  data: {
    settings: BusinessSettings;
    users: UserProfile[];
    categories: ProductCategory[];
    suppliers: Supplier[];
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    customerPayments: CustomerPayment[];
    purchases: Purchase[];
    expenses: Expense[];
    movements: InventoryMovement[];
  },
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured. Please set your Supabase Project URL and Anon Key in Settings.',
    };
  }

  const steps = 11;
  let currentStep = 0;

  const report = (stage: string) => {
    currentStep++;
    if (onProgress) {
      onProgress({
        stage,
        current: currentStep,
        total: steps,
        percentage: Math.round((currentStep / steps) * 100),
      });
    }
  };

  const results: Record<string, number> = {};

  try {
    // 1. Settings
    report('Synchronizing Business Settings...');
    const { error: settingsError } = await supabase.from('business_settings').upsert({
      id: 'default',
      shop_name: data.settings.shop_name,
      tagline: data.settings.tagline,
      phone: data.settings.phone,
      email: data.settings.email,
      location: data.settings.location,
      address: data.settings.address,
      receipt_footer: data.settings.receipt_footer,
      currency: data.settings.currency,
      currency_symbol: data.settings.currency_symbol,
      default_min_stock_bags: data.settings.default_min_stock_bags,
      allow_negative_stock: data.settings.allow_negative_stock,
      tax_enabled: data.settings.tax_enabled,
      tax_rate: data.settings.tax_rate,
      updated_at: new Date().toISOString(),
    });
    if (settingsError) throw new Error(`Settings sync failed: ${settingsError.message}`);
    results['settings'] = 1;

    // 2. Categories
    report('Synchronizing Feed Categories...');
    if (data.categories.length > 0) {
      const { error: catError } = await supabase.from('categories').upsert(
        data.categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || null,
          color: c.color || null,
          active: c.active,
        }))
      );
      if (catError) throw new Error(`Categories sync failed: ${catError.message}`);
      results['categories'] = data.categories.length;
    }

    // 3. Suppliers
    report('Synchronizing Feed Millers & Suppliers...');
    if (data.suppliers.length > 0) {
      const { error: suppError } = await supabase.from('suppliers').upsert(
        data.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contact_person: s.contact_person || null,
          phone: s.phone,
          email: s.email || null,
          location: s.location || null,
          notes: s.notes || null,
          active: s.active,
          total_purchases_amount: s.total_purchases_amount || 0,
        }))
      );
      if (suppError) throw new Error(`Suppliers sync failed: ${suppError.message}`);
      results['suppliers'] = data.suppliers.length;
    }

    // 4. Products & Packaging Options
    report('Synchronizing Feeds Catalog & Bag Sizes...');
    if (data.products.length > 0) {
      const productPayload = data.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category_id: p.category_id || null,
        subcategory: p.subcategory || null,
        brand: p.brand || null,
        description: p.description || null,
        base_unit: p.base_unit || 'KG',
        selling_price_per_base_unit: p.selling_price_per_base_unit || 0,
        cost_price_per_base_unit: p.cost_price_per_base_unit || 0,
        min_stock_level: p.min_stock_level || 100,
        current_stock: p.current_stock || 0,
        supplier_id: p.supplier_id || null,
        image_url: p.image_url || null,
        active: p.active,
      }));

      const { error: prodError } = await supabase.from('products').upsert(productPayload);
      if (prodError) throw new Error(`Products sync failed: ${prodError.message}`);
      results['products'] = data.products.length;

      // Product Packages (50kg bags, 20kg bags, etc.)
      const packagesPayload: any[] = [];
      data.products.forEach((p) => {
        if (p.packages && p.packages.length > 0) {
          p.packages.forEach((pkg) => {
            packagesPayload.push({
              id: pkg.id,
              product_id: p.id,
              package_name: pkg.package_name,
              size_in_base_units: pkg.size_in_base_units,
              selling_price: pkg.selling_price,
              cost_price: pkg.cost_price,
              barcode: pkg.barcode || null,
              is_default: pkg.is_default || false,
              active: pkg.active,
            });
          });
        }
      });

      if (packagesPayload.length > 0) {
        const { error: pkgError } = await supabase.from('product_packages').upsert(packagesPayload);
        if (pkgError) throw new Error(`Product packages sync failed: ${pkgError.message}`);
        results['product_packages'] = packagesPayload.length;
      }
    }

    // 5. Customers
    report('Synchronizing Farmers & Customer Accounts...');
    if (data.customers.length > 0) {
      const { error: custError } = await supabase.from('customers').upsert(
        data.customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          location: c.location || null,
          email: c.email || null,
          notes: c.notes || null,
          total_spent: c.total_spent || 0,
          total_orders: c.total_orders || 0,
          credit_balance: c.credit_balance || 0,
          last_purchase_date: c.last_purchase_date || null,
        }))
      );
      if (custError) throw new Error(`Customers sync failed: ${custError.message}`);
      results['customers'] = data.customers.length;
    }

    // 6. Sales & Sale Items
    report('Synchronizing Sales Transactions & Receipts...');
    if (data.sales.length > 0) {
      const salesPayload = data.sales.map((s) => ({
        id: s.id,
        receipt_number: s.receipt_number,
        customer_id: s.customer_id || null,
        customer_name: s.customer_name || 'Walk-in Customer',
        customer_phone: s.customer_phone || null,
        subtotal: s.subtotal || 0,
        discount: s.discount || 0,
        total: s.total || 0,
        payment_method: s.payment_method || 'CASH',
        amount_paid: s.amount_paid ?? (s.payment_method === 'ON_CREDIT' ? 0 : s.total),
        payment_status: s.payment_status || (s.payment_method === 'ON_CREDIT' ? 'UNPAID' : 'PAID'),
        notes: s.notes || null,
        status: s.status || 'COMPLETED',
        void_reason: s.void_reason || null,
        voided_at: s.voided_at || null,
        voided_by: s.voided_by || null,
        created_by: s.created_by || 'Cashier',
        created_at: s.created_at,
      }));

      const { error: salesError } = await supabase.from('sales').upsert(salesPayload);
      if (salesError) throw new Error(`Sales sync failed: ${salesError.message}`);
      results['sales'] = data.sales.length;

      // Sale Items
      const saleItemsPayload: any[] = [];
      data.sales.forEach((s) => {
        if (s.items && s.items.length > 0) {
          s.items.forEach((item) => {
            saleItemsPayload.push({
              id: item.id,
              sale_id: s.id,
              product_id: item.product_id || null,
              product_name: item.product_name,
              package_id: item.package_id || null,
              package_name: item.package_name,
              quantity: item.quantity,
              quantity_base_units: item.quantity_base_units,
              unit_price: item.unit_price,
              cost_price_per_unit: item.cost_price_per_unit || 0,
              line_total: item.line_total,
              estimated_profit: item.estimated_profit || 0,
            });
          });
        }
      });

      if (saleItemsPayload.length > 0) {
        const { error: saleItemsError } = await supabase.from('sale_items').upsert(saleItemsPayload);
        if (saleItemsError) throw new Error(`Sale items sync failed: ${saleItemsError.message}`);
        results['sale_items'] = saleItemsPayload.length;
      }
    }

    // 7. Customer Payments (Credit settlements)
    report('Synchronizing Customer Credit Payments...');
    if (data.customerPayments.length > 0) {
      const { error: payError } = await supabase.from('customer_payments').upsert(
        data.customerPayments.map((p) => ({
          id: p.id,
          payment_number: p.payment_number,
          customer_id: p.customer_id,
          customer_name: p.customer_name,
          amount: p.amount,
          payment_method: p.payment_method,
          reference: p.reference || null,
          notes: p.notes || null,
          created_by: p.created_by,
          created_at: p.created_at,
        }))
      );
      if (payError) throw new Error(`Customer payments sync failed: ${payError.message}`);
      results['customer_payments'] = data.customerPayments.length;
    }

    // 8. Purchases & Purchase Items
    report('Synchronizing Supplier Restocks & Purchases...');
    if (data.purchases.length > 0) {
      const purchasesPayload = data.purchases.map((p) => ({
        id: p.id,
        invoice_number: p.invoice_number,
        supplier_id: p.supplier_id || null,
        supplier_name: p.supplier_name,
        total_cost: p.total_cost || 0,
        purchase_date: p.purchase_date || p.created_at,
        notes: p.notes || null,
        created_by: p.created_by,
        created_at: p.created_at,
      }));

      const { error: purError } = await supabase.from('purchases').upsert(purchasesPayload);
      if (purError) throw new Error(`Purchases sync failed: ${purError.message}`);
      results['purchases'] = data.purchases.length;

      const purItemsPayload: any[] = [];
      data.purchases.forEach((p) => {
        if (p.items && p.items.length > 0) {
          p.items.forEach((item) => {
            purItemsPayload.push({
              id: item.id,
              purchase_id: p.id,
              product_id: item.product_id || null,
              product_name: item.product_name,
              package_id: item.package_id || null,
              package_name: item.package_name,
              quantity: item.quantity,
              quantity_base_units: item.quantity_base_units,
              cost_price: item.cost_price,
              line_total: item.line_total,
            });
          });
        }
      });

      if (purItemsPayload.length > 0) {
        const { error: purItemsError } = await supabase.from('purchase_items').upsert(purItemsPayload);
        if (purItemsError) throw new Error(`Purchase items sync failed: ${purItemsError.message}`);
        results['purchase_items'] = purItemsPayload.length;
      }
    }

    // 9. Operational Expenses
    report('Synchronizing Operational Expenses...');
    if (data.expenses.length > 0) {
      const { error: expError } = await supabase.from('expenses').upsert(
        data.expenses.map((e) => ({
          id: e.id,
          category: e.category,
          description: e.description,
          amount: e.amount,
          expense_date: e.expense_date,
          notes: e.notes || null,
          receipt_ref: e.receipt_ref || null,
          created_by: e.created_by,
          created_at: e.created_at,
        }))
      );
      if (expError) throw new Error(`Expenses sync failed: ${expError.message}`);
      results['expenses'] = data.expenses.length;
    }

    // 10. Inventory Movements
    report('Synchronizing Inventory Movement Audit Trail...');
    if (data.movements.length > 0) {
      const { error: movError } = await supabase.from('inventory_movements').upsert(
        data.movements.map((m) => ({
          id: m.id,
          product_id: m.product_id,
          product_name: m.product_name,
          package_id: m.package_id || null,
          package_name: m.package_name || null,
          quantity_packages: m.quantity_packages || 0,
          quantity_base_units: m.quantity_base_units,
          base_unit: m.base_unit || 'KG',
          previous_stock: m.previous_stock,
          new_stock: m.new_stock,
          movement_type: m.movement_type,
          reference_number: m.reference_number,
          notes: m.notes || null,
          created_by: m.created_by,
          created_at: m.created_at,
        }))
      );
      if (movError) throw new Error(`Movements sync failed: ${movError.message}`);
      results['inventory_movements'] = data.movements.length;
    }

    // 11. User Profiles
    report('Synchronizing User Accounts & Roles...');
    if (data.users.length > 0) {
      const { error: userError } = await supabase.from('user_profiles').upsert(
        data.users.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username || null,
          email: u.email,
          role: u.role,
          phone: u.phone || null,
          active: u.active,
          avatar_url: u.avatar_url || null,
        }))
      );
      if (userError) throw new Error(`Users sync failed: ${userError.message}`);
      results['user_profiles'] = data.users.length;
    }

    return {
      success: true,
      message: 'All local shop records successfully synced to Supabase cloud!',
      details: results,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error occurred during Supabase synchronization.',
      details: results,
    };
  }
};

/**
 * Download all records from Supabase into local format (Pull from Cloud)
 */
export const downloadAllFromSupabase = async (): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured.',
    };
  }

  try {
    const [
      { data: categories, error: catErr },
      { data: suppliers, error: suppErr },
      { data: products, error: prodErr },
      { data: productPackages, error: pkgErr },
      { data: customers, error: custErr },
      { data: sales, error: salesErr },
      { data: saleItems, error: itemsErr },
      { data: customerPayments, error: payErr },
      { data: purchases, error: purErr },
      { data: purchaseItems, error: purItemsErr },
      { data: expenses, error: expErr },
      { data: movements, error: movErr },
      { data: settings, error: settErr },
      { data: users, error: userErr },
    ] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('products').select('*'),
      supabase.from('product_packages').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('sale_items').select('*'),
      supabase.from('customer_payments').select('*'),
      supabase.from('purchases').select('*'),
      supabase.from('purchase_items').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('inventory_movements').select('*'),
      supabase.from('business_settings').select('*').limit(1),
      supabase.from('user_profiles').select('*'),
    ]);

    if (catErr) throw new Error(`Failed to fetch categories: ${catErr.message}`);
    if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);
    if (salesErr) throw new Error(`Failed to fetch sales: ${salesErr.message}`);

    // Reassemble products with their packages
    const assembledProducts = (products || []).map((p: any) => ({
      ...p,
      packages: (productPackages || []).filter((pkg: any) => pkg.product_id === p.id),
    }));

    // Reassemble sales with their items
    const assembledSales = (sales || []).map((s: any) => ({
      ...s,
      items: (saleItems || []).filter((item: any) => item.sale_id === s.id),
    }));

    // Reassemble purchases with their items
    const assembledPurchases = (purchases || []).map((p: any) => ({
      ...p,
      items: (purchaseItems || []).filter((item: any) => item.purchase_id === p.id),
    }));

    return {
      success: true,
      message: 'Cloud data pulled successfully!',
      data: {
        categories: categories || [],
        suppliers: suppliers || [],
        products: assembledProducts,
        customers: customers || [],
        sales: assembledSales,
        customerPayments: customerPayments || [],
        purchases: assembledPurchases,
        expenses: expenses || [],
        movements: movements || [],
        settings: settings && settings[0] ? settings[0] : null,
        users: users || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to download data from Supabase.',
    };
  }
};

/**
 * Background auto-sync helpers for live transactions
 */
export const syncSaleToSupabase = async (
  sale: Sale,
  items?: Sale['items'],
  movements?: InventoryMovement[],
  customer?: Customer
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const saleItems = items || sale.items || [];
    // 1. Try atomic RPC function first
    const { error: rpcError } = await supabase.rpc('record_sale_transaction', {
      p_sale: {
        id: sale.id,
        receipt_number: sale.receipt_number,
        customer_id: sale.customer_id || null,
        customer_name: sale.customer_name || 'Walk-in Customer',
        customer_phone: sale.customer_phone || null,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        payment_method: sale.payment_method,
        amount_paid: sale.amount_paid ?? (sale.payment_method === 'ON_CREDIT' ? 0 : sale.total),
        payment_status: sale.payment_status || (sale.payment_method === 'ON_CREDIT' ? 'UNPAID' : 'PAID'),
        notes: sale.notes || null,
        status: sale.status,
        created_by: sale.created_by,
        created_at: sale.created_at,
      },
      p_items: saleItems.map((item) => ({
        id: item.id,
        sale_id: sale.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        package_id: item.package_id || null,
        package_name: item.package_name,
        quantity: item.quantity,
        quantity_base_units: item.quantity_base_units,
        unit_price: item.unit_price,
        cost_price_per_unit: item.cost_price_per_unit || 0,
        line_total: item.line_total,
        estimated_profit: item.estimated_profit || 0,
      })),
      p_movements: movements || [],
      p_customer: customer ? { id: customer.id, total_spent: customer.total_spent } : null,
    });

    if (!rpcError) {
      return;
    }

    // Fallback: Direct table operations
    await supabase.from('sales').upsert({
      id: sale.id,
      receipt_number: sale.receipt_number,
      customer_id: sale.customer_id || null,
      customer_name: sale.customer_name || 'Walk-in Customer',
      customer_phone: sale.customer_phone || null,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.payment_method,
      amount_paid: sale.amount_paid ?? (sale.payment_method === 'ON_CREDIT' ? 0 : sale.total),
      payment_status: sale.payment_status || (sale.payment_method === 'ON_CREDIT' ? 'UNPAID' : 'PAID'),
      notes: sale.notes || null,
      status: sale.status,
      created_by: sale.created_by,
      created_at: sale.created_at,
    });

    if (saleItems.length > 0) {
      await supabase.from('sale_items').upsert(
        saleItems.map((item) => ({
          id: item.id,
          sale_id: sale.id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          package_id: item.package_id || null,
          package_name: item.package_name,
          quantity: item.quantity,
          quantity_base_units: item.quantity_base_units,
          unit_price: item.unit_price,
          cost_price_per_unit: item.cost_price_per_unit || 0,
          line_total: item.line_total,
          estimated_profit: item.estimated_profit || 0,
        }))
      );

      // Decrement stock for each product in items
      for (const item of saleItems) {
        if (item.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products')
              .update({
                current_stock: Number(prod.current_stock) - item.quantity_base_units,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.product_id);
          }
        }
      }
    }

    if (movements && movements.length > 0) {
      await supabase.from('inventory_movements').upsert(
        movements.map((mov) => ({
          id: mov.id,
          product_id: mov.product_id,
          product_name: mov.product_name,
          package_id: mov.package_id || null,
          package_name: mov.package_name || null,
          quantity_packages: mov.quantity_packages || 0,
          quantity_base_units: mov.quantity_base_units,
          base_unit: mov.base_unit || 'KG',
          previous_stock: mov.previous_stock,
          new_stock: mov.new_stock,
          movement_type: mov.movement_type,
          reference_number: mov.reference_number,
          notes: mov.notes || null,
          created_by: mov.created_by,
          created_at: mov.created_at,
        }))
      );
    }

    if (customer) {
      await syncCustomerToSupabase(customer);
    }
  } catch (err) {
    console.warn('Background sync for sale failed:', err);
  }
};

export const syncPurchaseTransactionToSupabase = async (
  purchase: Purchase,
  items: Purchase['items'],
  movements: InventoryMovement[],
  supplier?: Supplier
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const purchaseItems = items || purchase.items || [];
    // 1. Try atomic RPC function first
    const { error: rpcError } = await supabase.rpc('record_purchase_transaction', {
      p_purchase: {
        id: purchase.id,
        invoice_number: purchase.invoice_number,
        supplier_id: purchase.supplier_id || null,
        supplier_name: purchase.supplier_name,
        total_cost: purchase.total_cost,
        purchase_date: purchase.purchase_date,
        notes: purchase.notes || null,
        created_by: purchase.created_by,
        created_at: purchase.created_at,
      },
      p_items: purchaseItems.map((item) => ({
        id: item.id,
        purchase_id: purchase.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        package_id: item.package_id || null,
        package_name: item.package_name,
        quantity: item.quantity,
        quantity_base_units: item.quantity_base_units,
        cost_price: item.cost_price,
        line_total: item.line_total,
      })),
      p_movements: movements || [],
    });

    if (!rpcError) {
      return;
    }

    // Fallback: Direct table operations
    await supabase.from('purchases').upsert({
      id: purchase.id,
      invoice_number: purchase.invoice_number,
      supplier_id: purchase.supplier_id || null,
      supplier_name: purchase.supplier_name,
      total_cost: purchase.total_cost,
      purchase_date: purchase.purchase_date,
      notes: purchase.notes || null,
      created_by: purchase.created_by,
      created_at: purchase.created_at,
    });

    if (purchaseItems.length > 0) {
      await supabase.from('purchase_items').upsert(
        purchaseItems.map((item) => ({
          id: item.id,
          purchase_id: purchase.id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          package_id: item.package_id || null,
          package_name: item.package_name,
          quantity: item.quantity,
          quantity_base_units: item.quantity_base_units,
          cost_price: item.cost_price,
          line_total: item.line_total,
        }))
      );

      // Increment product stock
      for (const item of purchaseItems) {
        if (item.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products')
              .update({
                current_stock: Number(prod.current_stock) + item.quantity_base_units,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.product_id);
          }
        }
      }
    }

    if (movements && movements.length > 0) {
      await supabase.from('inventory_movements').upsert(
        movements.map((mov) => ({
          id: mov.id,
          product_id: mov.product_id,
          product_name: mov.product_name,
          package_id: mov.package_id || null,
          package_name: mov.package_name || null,
          quantity_packages: mov.quantity_packages || 0,
          quantity_base_units: mov.quantity_base_units,
          base_unit: mov.base_unit || 'KG',
          previous_stock: mov.previous_stock,
          new_stock: mov.new_stock,
          movement_type: mov.movement_type,
          reference_number: mov.reference_number,
          notes: mov.notes || null,
          created_by: mov.created_by,
          created_at: mov.created_at,
        }))
      );
    }

    if (supplier) {
      await syncSupplierToSupabase(supplier);
    }
  } catch (err) {
    console.warn('Background sync for purchase failed:', err);
  }
};

export const syncVoidSaleToSupabase = async (
  saleId: string,
  reason: string,
  voidedBy: string,
  voidedAt: string,
  updatedProducts: Product[],
  reversalMovements: InventoryMovement[]
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase
      .from('sales')
      .update({
        status: 'VOIDED',
        void_reason: reason,
        voided_by: voidedBy,
        voided_at: voidedAt,
      })
      .eq('id', saleId);

    // Update stock in Supabase for each affected product
    for (const prod of updatedProducts) {
      await supabase
        .from('products')
        .update({
          current_stock: prod.current_stock,
          updated_at: voidedAt,
        })
        .eq('id', prod.id);
    }

    if (reversalMovements && reversalMovements.length > 0) {
      await supabase.from('inventory_movements').upsert(
        reversalMovements.map((mov) => ({
          id: mov.id,
          product_id: mov.product_id,
          product_name: mov.product_name,
          package_id: mov.package_id || null,
          package_name: mov.package_name || null,
          quantity_packages: mov.quantity_packages || 0,
          quantity_base_units: mov.quantity_base_units,
          base_unit: mov.base_unit || 'KG',
          previous_stock: mov.previous_stock,
          new_stock: mov.new_stock,
          movement_type: mov.movement_type,
          reference_number: mov.reference_number,
          notes: mov.notes || null,
          created_by: mov.created_by,
          created_at: mov.created_at,
        }))
      );
    }
  } catch (err) {
    console.warn('Background sync for void sale failed:', err);
  }
};

export const syncStockAdjustmentToSupabase = async (
  productId: string,
  newStock: number,
  movement: InventoryMovement
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase
      .from('products')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    await supabase.from('inventory_movements').upsert({
      id: movement.id,
      product_id: movement.product_id,
      product_name: movement.product_name,
      package_id: movement.package_id || null,
      package_name: movement.package_name || null,
      quantity_packages: movement.quantity_packages || 0,
      quantity_base_units: movement.quantity_base_units,
      base_unit: movement.base_unit || 'KG',
      previous_stock: movement.previous_stock,
      new_stock: movement.new_stock,
      movement_type: movement.movement_type,
      reference_number: movement.reference_number,
      notes: movement.notes || null,
      created_by: movement.created_by,
      created_at: movement.created_at,
    });
  } catch (err) {
    console.warn('Background sync for stock adjustment failed:', err);
  }
};

export const syncSupplierToSupabase = async (supplier: Supplier): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('suppliers').upsert({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person || null,
      phone: supplier.phone,
      email: supplier.email || null,
      location: supplier.location || null,
      notes: supplier.notes || null,
      active: supplier.active,
      total_purchases_amount: supplier.total_purchases_amount || 0,
    });
  } catch (err) {
    console.warn('Background sync for supplier failed:', err);
  }
};

export const syncDeleteSupplierFromSupabase = async (supplierId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('suppliers').delete().eq('id', supplierId);
  } catch (err) {
    console.warn('Background delete for supplier failed:', err);
  }
};

export const syncExpenseToSupabase = async (expense: Expense): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('expenses').upsert({
      id: expense.id,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      notes: expense.notes || null,
      receipt_ref: expense.receipt_ref || null,
      created_by: expense.created_by,
      created_at: expense.created_at,
    });
  } catch (err) {
    console.warn('Background sync for expense failed:', err);
  }
};

export const syncCustomerPaymentToSupabase = async (payment: CustomerPayment): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('customer_payments').upsert({
      id: payment.id,
      payment_number: payment.payment_number,
      customer_id: payment.customer_id,
      customer_name: payment.customer_name,
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference: payment.reference || null,
      notes: payment.notes || null,
      created_by: payment.created_by,
      created_at: payment.created_at,
    });
  } catch (err) {
    console.warn('Background sync for customer payment failed:', err);
  }
};

export const syncCustomerToSupabase = async (customer: Customer): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      location: customer.location || null,
      email: customer.email || null,
      notes: customer.notes || null,
      total_spent: customer.total_spent || 0,
      total_orders: customer.total_orders || 0,
      credit_balance: customer.credit_balance || 0,
      last_purchase_date: customer.last_purchase_date || null,
    });
  } catch (err) {
    console.warn('Background sync for customer failed:', err);
  }
};

export const syncDeleteCustomerFromSupabase = async (customerId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('customers').delete().eq('id', customerId);
  } catch (err) {
    console.warn('Background delete for customer failed:', err);
  }
};

export const syncProductToSupabase = async (product: Product): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('products').upsert({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category_id: product.category_id || null,
      subcategory: product.subcategory || null,
      brand: product.brand || null,
      description: product.description || null,
      base_unit: product.base_unit || 'KG',
      selling_price_per_base_unit: product.selling_price_per_base_unit,
      cost_price_per_base_unit: product.cost_price_per_base_unit,
      min_stock_level: product.min_stock_level,
      current_stock: product.current_stock,
      supplier_id: product.supplier_id || null,
      image_url: product.image_url || null,
      active: product.active,
      updated_at: new Date().toISOString(),
    });

    if (product.packages && product.packages.length > 0) {
      await supabase.from('product_packages').upsert(
        product.packages.map((pkg) => ({
          id: pkg.id,
          product_id: product.id,
          package_name: pkg.package_name,
          size_in_base_units: pkg.size_in_base_units,
          selling_price: pkg.selling_price,
          cost_price: pkg.cost_price,
          barcode: pkg.barcode || null,
          is_default: pkg.is_default || false,
          active: pkg.active,
        }))
      );
    }
  } catch (err) {
    console.warn('Background sync for product failed:', err);
  }
};

export const syncDeleteProductFromSupabase = async (productId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('products').update({ active: false }).eq('id', productId);
  } catch (err) {
    console.warn('Background delete for product failed:', err);
  }
};

export const syncCategoryToSupabase = async (category: ProductCategory): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || null,
      color: category.color || null,
      active: category.active,
    });
  } catch (err) {
    console.warn('Background sync for category failed:', err);
  }
};

export const syncSettingsToSupabase = async (settings: BusinessSettings): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('business_settings').upsert({
      id: 'default',
      shop_name: settings.shop_name,
      tagline: settings.tagline,
      phone: settings.phone,
      email: settings.email,
      location: settings.location,
      address: settings.address,
      receipt_footer: settings.receipt_footer,
      currency: settings.currency,
      currency_symbol: settings.currency_symbol,
      default_min_stock_bags: settings.default_min_stock_bags,
      allow_negative_stock: settings.allow_negative_stock,
      tax_enabled: settings.tax_enabled,
      tax_rate: settings.tax_rate,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Background sync for settings failed:', err);
  }
};
