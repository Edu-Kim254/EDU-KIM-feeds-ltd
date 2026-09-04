import {
  Product,
  ProductCategory,
  ProductPackage,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  InventoryMovement,
  ProductPriceHistory,
  AuditLog,
  StockCountSession,
  BusinessSettings,
  UserProfile,
  UserRole,
  CustomerPayment,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_MOVEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMER_PAYMENTS,
} from '../lib/initialData';
import {
  syncSaleToSupabase,
  syncVoidSaleToSupabase,
  syncPurchaseTransactionToSupabase,
  syncStockAdjustmentToSupabase,
  syncProductToSupabase,
  syncDeleteProductFromSupabase,
  syncCustomerToSupabase,
  syncCustomerPaymentToSupabase,
  syncSupplierToSupabase,
  syncExpenseToSupabase,
  syncCategoryToSupabase,
  syncSettingsToSupabase,
} from './supabaseSync';

const STORAGE_KEY_PREFIX = 'pasture_feeds_app_v2_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage, using defaults`, e);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

type Listener = () => void;

class AppStore {
  private listeners: Set<Listener> = new Set();

  public settings: BusinessSettings;
  public users: UserProfile[];
  public currentUser: UserProfile;
  public categories: ProductCategory[];
  public products: Product[];
  public suppliers: Supplier[];
  public customers: Customer[];
  public sales: Sale[];
  public purchases: Purchase[];
  public expenses: Expense[];
  public movements: InventoryMovement[];
  public priceHistories: ProductPriceHistory[];
  public auditLogs: AuditLog[];
  public stockCounts: StockCountSession[];
  public customerPayments: CustomerPayment[];

  constructor() {
    this.settings = loadFromStorage('settings', INITIAL_SETTINGS);
    this.users = loadFromStorage('users', INITIAL_USERS);
    this.currentUser = loadFromStorage('current_user', this.users[0]);
    this.categories = loadFromStorage('categories', INITIAL_CATEGORIES);
    this.products = loadFromStorage('products', INITIAL_PRODUCTS);
    this.suppliers = loadFromStorage('suppliers', INITIAL_SUPPLIERS);
    this.customers = loadFromStorage('customers', INITIAL_CUSTOMERS);
    this.sales = loadFromStorage('sales', INITIAL_SALES);
    this.purchases = loadFromStorage('purchases', INITIAL_PURCHASES);
    this.expenses = loadFromStorage('expenses', INITIAL_EXPENSES);
    this.movements = loadFromStorage('movements', INITIAL_MOVEMENTS);
    this.priceHistories = loadFromStorage('price_histories', []);
    this.auditLogs = loadFromStorage('audit_logs', INITIAL_AUDIT_LOGS);
    this.stockCounts = loadFromStorage('stock_counts', []);
    this.customerPayments = loadFromStorage('customer_payments', INITIAL_CUSTOMER_PAYMENTS);

    // Ensure owner is Edward Kimani
    let usersUpdated = false;
    this.users = this.users.map((u) => {
      if (u.id === 'u-admin-1' || u.role === 'ADMIN' || u.name.includes('Amos')) {
        usersUpdated = true;
        return {
          ...u,
          name: 'Edward Kimani (Owner)',
          email: 'edward@feeds.co.ke',
        };
      }
      return u;
    });

    if (
      this.currentUser.id === 'u-admin-1' ||
      this.currentUser.role === 'ADMIN' ||
      this.currentUser.name.includes('Amos')
    ) {
      const adminUser = this.users.find((u) => u.role === 'ADMIN') || this.users[0];
      this.currentUser = {
        ...adminUser,
        name: 'Edward Kimani (Owner)',
        email: 'edward@feeds.co.ke',
      };
      usersUpdated = true;
    }

    if (usersUpdated) {
      saveToStorage('users', this.users);
      saveToStorage('current_user', this.currentUser);
    }

    // Ensure on-credit sales exist for demonstration if cached sales had none
    const hasCreditSale = this.sales.some((s) => s.payment_method === 'ON_CREDIT');
    if (!hasCreditSale) {
      const creditSales = INITIAL_SALES.filter((s) => s.payment_method === 'ON_CREDIT');
      if (creditSales.length > 0) {
        this.sales = [...this.sales, ...creditSales];
        saveToStorage('sales', this.sales);
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Listener notification error:', e);
      }
    });
  }

  private persist(): void {
    saveToStorage('settings', this.settings);
    saveToStorage('users', this.users);
    saveToStorage('current_user', this.currentUser);
    saveToStorage('categories', this.categories);
    saveToStorage('products', this.products);
    saveToStorage('suppliers', this.suppliers);
    saveToStorage('customers', this.customers);
    saveToStorage('sales', this.sales);
    saveToStorage('purchases', this.purchases);
    saveToStorage('expenses', this.expenses);
    saveToStorage('movements', this.movements);
    saveToStorage('price_histories', this.priceHistories);
    saveToStorage('audit_logs', this.auditLogs);
    saveToStorage('stock_counts', this.stockCounts);
    saveToStorage('customer_payments', this.customerPayments);
    this.notify();
  }

  public resetToSampleData(): void {
    this.settings = { ...INITIAL_SETTINGS };
    this.users = [...INITIAL_USERS];
    this.currentUser = { ...INITIAL_USERS[0] };
    this.categories = [...INITIAL_CATEGORIES];
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.suppliers = [...INITIAL_SUPPLIERS];
    this.customers = [...INITIAL_CUSTOMERS];
    this.sales = JSON.parse(JSON.stringify(INITIAL_SALES));
    this.purchases = JSON.parse(JSON.stringify(INITIAL_PURCHASES));
    this.expenses = [...INITIAL_EXPENSES];
    this.movements = [...INITIAL_MOVEMENTS];
    this.priceHistories = [];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.stockCounts = [];
    this.customerPayments = [...INITIAL_CUSTOMER_PAYMENTS];
    this.logAudit('RESET_DATABASE', 'System', undefined, 'Database reset to Pasture Feeds sample catalog');
    this.persist();
  }

  public setCurrentUser(user: UserProfile): void {
    this.currentUser = user;
    this.logAudit('USER_SWITCH', 'User', user.id, `Active session switched to ${user.name} (${user.role})`);
    this.persist();
  }

  public logAudit(
    action: string,
    entity: string,
    entity_id?: string,
    details: string = '',
    previous_state?: string,
    new_state?: string
  ): void {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      user_name: this.currentUser.name,
      user_role: this.currentUser.role,
      action,
      entity,
      entity_id,
      details,
      previous_state,
      new_state,
      created_at: new Date().toISOString(),
    };
    this.auditLogs = [log, ...this.auditLogs];
    saveToStorage('audit_logs', this.auditLogs);
  }

  // ==================== SALE PROCESSING ====================

  public createSale(params: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: Array<{
      productId: string;
      packageId: string;
      quantity: number; // packages or loose units
      unitPrice: number;
    }>;
    discount?: number;
    paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'ON_CREDIT' | 'OTHER_DIRECT';
    notes?: string;
  }): Sale {
    if (!params.items || params.items.length === 0) {
      throw new Error('Cannot complete sale: Cart is empty.');
    }

    // Step 1: Pre-validation of stock availability
    const deductions: Array<{
      product: Product;
      packageItem: ProductPackage;
      quantity: number;
      baseUnitsDeducted: number;
      unitPrice: number;
      costPrice: number;
      lineTotal: number;
      estimatedProfit: number;
    }> = [];

    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity (${item.quantity}). Quantity must be greater than zero.`);
      }

      const product = this.products.find((p) => p.id === item.productId && p.active);
      if (!product) {
        throw new Error('Product not found or inactive.');
      }

      const pkg = product.packages.find((p) => p.id === item.packageId && p.active);
      if (!pkg) {
        throw new Error(`Package size not found for product "${product.name}".`);
      }

      const baseUnitsDeducted = item.quantity * pkg.size_in_base_units;

      if (!this.settings.allow_negative_stock && product.current_stock < baseUnitsDeducted) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.current_stock} ${product.base_unit}, Required: ${baseUnitsDeducted} ${product.base_unit}.`
        );
      }

      const lineTotal = item.quantity * item.unitPrice;
      const costPrice = pkg.cost_price || (product.cost_price_per_base_unit * pkg.size_in_base_units);
      const estimatedProfit = lineTotal - (item.quantity * costPrice);

      deductions.push({
        product,
        packageItem: pkg,
        quantity: item.quantity,
        baseUnitsDeducted,
        unitPrice: item.unitPrice,
        costPrice,
        lineTotal,
        estimatedProfit,
      });
    }

    // Step 2: Generate unique receipt number
    const receiptNumber = 'INV-' + String(this.sales.length + 125).padStart(6, '0');
    const now = new Date().toISOString();

    // Step 3: Atomic stock deduction and movement creation
    const movementsToAdd: InventoryMovement[] = [];
    const updatedProducts = [...this.products];

    for (const d of deductions) {
      const pIndex = updatedProducts.findIndex((p) => p.id === d.product.id);
      const prevStock = updatedProducts[pIndex].current_stock;
      const newStock = prevStock - d.baseUnitsDeducted;

      updatedProducts[pIndex] = {
        ...updatedProducts[pIndex],
        current_stock: newStock,
        updated_at: now,
      };

      movementsToAdd.push({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        product_id: d.product.id,
        product_name: d.product.name,
        package_id: d.packageItem.id,
        package_name: d.packageItem.package_name,
        quantity_packages: d.quantity,
        quantity_base_units: -d.baseUnitsDeducted,
        base_unit: d.product.base_unit,
        previous_stock: prevStock,
        new_stock: newStock,
        movement_type: 'SALE',
        reference_number: receiptNumber,
        notes: `Sale to ${params.customerName || 'Walk-in'}`,
        created_by: this.currentUser.name,
        created_at: now,
      });
    }

    // Step 4: Build sale record
    const subtotal = deductions.reduce((sum, d) => sum + d.lineTotal, 0);
    const discount = Math.max(0, params.discount || 0);
    const total = Math.max(0, subtotal - discount);

    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      receipt_number: receiptNumber,
      customer_id: params.customerId,
      customer_name: params.customerName || 'Walk-in Customer',
      customer_phone: params.customerPhone,
      items: deductions.map((d, index) => ({
        id: `si-${Date.now()}-${index}`,
        product_id: d.product.id,
        product_name: d.product.name,
        package_id: d.packageItem.id,
        package_name: d.packageItem.package_name,
        quantity: d.quantity,
        quantity_base_units: d.baseUnitsDeducted,
        unit_price: d.unitPrice,
        cost_price_per_unit: d.costPrice,
        line_total: d.lineTotal,
        estimated_profit: d.estimatedProfit,
      })),
      subtotal,
      discount,
      total,
      payment_method: params.paymentMethod || 'CASH',
      amount_paid: params.paymentMethod === 'ON_CREDIT' ? 0 : total,
      payment_status: params.paymentMethod === 'ON_CREDIT' ? 'UNPAID' : 'PAID',
      notes: params.notes,
      status: 'COMPLETED',
      created_by: this.currentUser.name,
      created_at: now,
    };

    // Step 5: Update customer record if provided
    if (params.customerId) {
      const cIndex = this.customers.findIndex((c) => c.id === params.customerId);
      if (cIndex !== -1) {
        const cust = this.customers[cIndex];
        this.customers[cIndex] = {
          ...cust,
          total_spent: cust.total_spent + total,
          total_orders: cust.total_orders + 1,
          last_purchase_date: now,
        };
      }
    }

    // Commit all changes
    this.products = updatedProducts;
    this.movements = [...movementsToAdd, ...this.movements];
    this.sales = [newSale, ...this.sales];
    this.logAudit(
      'SALE_COMPLETED',
      'Sale',
      receiptNumber,
      `Sale ${receiptNumber} completed: ${deductions.length} items, Total: KSh ${total.toLocaleString()}`
    );

    this.persist();

    // Real-time synchronization to Supabase Cloud
    const customerObj = params.customerId ? this.customers.find((c) => c.id === params.customerId) : undefined;
    syncSaleToSupabase(newSale, newSale.items, movementsToAdd, customerObj);

    return newSale;
  }

  public voidSale(saleId: string, reason: string): Sale {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Cashiers cannot void completed sales. Contact an Administrator or Manager.');
    }

    const saleIndex = this.sales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      throw new Error('Sale not found.');
    }

    const sale = this.sales[saleIndex];
    if (sale.status === 'VOIDED') {
      throw new Error('This sale has already been cancelled.');
    }

    if (!reason || reason.trim().length < 4) {
      throw new Error('A detailed reason is required to cancel a completed sale.');
    }

    const now = new Date().toISOString();
    const updatedProducts = [...this.products];
    const movementsToAdd: InventoryMovement[] = [];

    // Reverse inventory deduction for each item exactly once
    for (const item of sale.items) {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.product_id);
      if (pIndex !== -1) {
        const prevStock = updatedProducts[pIndex].current_stock;
        const newStock = prevStock + item.quantity_base_units;

        updatedProducts[pIndex] = {
          ...updatedProducts[pIndex],
          current_stock: newStock,
          updated_at: now,
        };

        movementsToAdd.push({
          id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          product_id: item.product_id,
          product_name: item.product_name,
          package_id: item.package_id,
          package_name: item.package_name,
          quantity_packages: item.quantity,
          quantity_base_units: item.quantity_base_units,
          base_unit: updatedProducts[pIndex].base_unit,
          previous_stock: prevStock,
          new_stock: newStock,
          movement_type: 'CUSTOMER_RETURN',
          reference_number: sale.receipt_number,
          notes: `Restored from Voided Sale ${sale.receipt_number}. Reason: ${reason}`,
          created_by: this.currentUser.name,
          created_at: now,
        });
      }
    }

    // Reverse customer stats if associated
    if (sale.customer_id) {
      const cIndex = this.customers.findIndex((c) => c.id === sale.customer_id);
      if (cIndex !== -1) {
        const cust = this.customers[cIndex];
        this.customers[cIndex] = {
          ...cust,
          total_spent: Math.max(0, cust.total_spent - sale.total),
          total_orders: Math.max(0, cust.total_orders - 1),
        };
      }
    }

    const voidedSale: Sale = {
      ...sale,
      status: 'VOIDED',
      void_reason: reason,
      voided_at: now,
      voided_by: this.currentUser.name,
    };

    this.sales[saleIndex] = voidedSale;
    this.products = updatedProducts;
    this.movements = [...movementsToAdd, ...this.movements];

    this.logAudit(
      'SALE_VOIDED',
      'Sale',
      sale.receipt_number,
      `Sale ${sale.receipt_number} voided by ${this.currentUser.name}. Reason: ${reason}`
    );

    this.persist();

    // Real-time synchronization to Supabase Cloud
    syncVoidSaleToSupabase(
      sale.id,
      reason,
      this.currentUser.name,
      now,
      updatedProducts,
      movementsToAdd
    );

    return voidedSale;
  }

  // ==================== PURCHASES ====================

  public createPurchase(params: {
    supplierId: string;
    invoiceNumber: string;
    purchaseDate?: string;
    notes?: string;
    items: Array<{
      productId: string;
      packageId?: string;
      packageName: string;
      quantity: number;
      quantityBaseUnits: number;
      costPrice: number;
    }>;
  }): Purchase {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot record supplier purchases.');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Purchase must contain at least one item.');
    }

    const supplier = this.suppliers.find((s) => s.id === params.supplierId);
    if (!supplier) {
      throw new Error('Selected supplier not found.');
    }

    const now = new Date().toISOString();
    const purchaseDate = params.purchaseDate || now;
    const updatedProducts = [...this.products];
    const movementsToAdd: InventoryMovement[] = [];
    const purchaseItems = [];
    let totalCost = 0;

    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new Error('Purchase quantities must be greater than zero.');
      }
      if (item.costPrice < 0) {
        throw new Error('Cost price cannot be negative.');
      }

      const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIndex === -1) {
        throw new Error('Product not found.');
      }

      const lineTotal = item.quantity * item.costPrice;
      totalCost += lineTotal;

      const prevStock = updatedProducts[pIndex].current_stock;
      const newStock = prevStock + item.quantityBaseUnits;

      // Update product current stock
      updatedProducts[pIndex] = {
        ...updatedProducts[pIndex],
        current_stock: newStock,
        updated_at: now,
      };

      purchaseItems.push({
        id: 'pi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        product_id: item.productId,
        product_name: updatedProducts[pIndex].name,
        package_id: item.packageId,
        package_name: item.packageName,
        quantity: item.quantity,
        quantity_base_units: item.quantityBaseUnits,
        cost_price: item.costPrice,
        line_total: lineTotal,
      });

      movementsToAdd.push({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        product_id: item.productId,
        product_name: updatedProducts[pIndex].name,
        package_id: item.packageId,
        package_name: item.packageName,
        quantity_packages: item.quantity,
        quantity_base_units: item.quantityBaseUnits,
        base_unit: updatedProducts[pIndex].base_unit,
        previous_stock: prevStock,
        new_stock: newStock,
        movement_type: 'PURCHASE',
        reference_number: params.invoiceNumber,
        notes: `Purchase from ${supplier.name}`,
        created_by: this.currentUser.name,
        created_at: now,
      });
    }

    const newPurchase: Purchase = {
      id: 'po-' + Date.now(),
      invoice_number: params.invoiceNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: purchaseItems,
      total_cost: totalCost,
      purchase_date: purchaseDate,
      notes: params.notes,
      created_by: this.currentUser.name,
      created_at: now,
    };

    // Update supplier purchases sum
    const sIndex = this.suppliers.findIndex((s) => s.id === supplier.id);
    if (sIndex !== -1) {
      this.suppliers[sIndex] = {
        ...this.suppliers[sIndex],
        total_purchases_amount: this.suppliers[sIndex].total_purchases_amount + totalCost,
      };
    }

    this.products = updatedProducts;
    this.movements = [...movementsToAdd, ...this.movements];
    this.purchases = [newPurchase, ...this.purchases];

    this.logAudit(
      'PURCHASE_CREATED',
      'Purchase',
      params.invoiceNumber,
      `Received purchase ${params.invoiceNumber} from ${supplier.name} for KSh ${totalCost.toLocaleString()}`
    );

    this.persist();

    // Real-time synchronization to Supabase Cloud
    syncPurchaseTransactionToSupabase(
      newPurchase,
      newPurchase.items,
      movementsToAdd,
      this.suppliers[sIndex] || supplier
    );

    return newPurchase;
  }

  // ==================== INVENTORY & STOCK ADJUSTMENTS ====================

  public adjustStock(params: {
    productId: string;
    newPhysicalStockBaseUnits: number;
    movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS';
    reason: string;
    notes?: string;
  }): void {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot adjust stock.');
    }

    if (params.newPhysicalStockBaseUnits < 0 && !this.settings.allow_negative_stock) {
      throw new Error('Stock cannot be set to a negative value.');
    }

    if (!params.reason || params.reason.trim().length < 3) {
      throw new Error('A reason is strictly required for any stock adjustment.');
    }

    const pIndex = this.products.findIndex((p) => p.id === params.productId);
    if (pIndex === -1) {
      throw new Error('Product not found.');
    }

    const product = this.products[pIndex];
    const prevStock = product.current_stock;
    const newStock = params.newPhysicalStockBaseUnits;
    const diff = newStock - prevStock;

    if (diff === 0) {
      throw new Error('New physical stock matches system stock. No adjustment necessary.');
    }

    const now = new Date().toISOString();
    const ref = 'ADJ-' + Date.now().toString().slice(-6);

    this.products[pIndex] = {
      ...product,
      current_stock: newStock,
      updated_at: now,
    };

    const movement: InventoryMovement = {
      id: 'mov-' + Date.now(),
      product_id: product.id,
      product_name: product.name,
      quantity_packages: 1,
      quantity_base_units: diff,
      base_unit: product.base_unit,
      previous_stock: prevStock,
      new_stock: newStock,
      movement_type: params.movementType || (diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'),
      reference_number: ref,
      notes: `${params.reason}. ${params.notes || ''}`.trim(),
      created_by: this.currentUser.name,
      created_at: now,
    };

    this.movements = [movement, ...this.movements];

    this.logAudit(
      'STOCK_ADJUSTED',
      'Inventory',
      product.id,
      `Adjusted ${product.name} from ${prevStock} to ${newStock} ${product.base_unit} (Diff: ${diff > 0 ? '+' : ''}${diff}). Reason: ${params.reason}`,
      `${prevStock} ${product.base_unit}`,
      `${newStock} ${product.base_unit}`
    );

    this.persist();

    // Real-time synchronization to Supabase Cloud
    syncStockAdjustmentToSupabase(product.id, newStock, movement);
  }

  // ==================== PRODUCT PRICING ====================

  public updateProductPrice(params: {
    productId: string;
    packageId?: string;
    newSellingPrice: number;
    newCostPrice?: number;
    reason: string;
  }): void {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot change product prices.');
    }

    if (params.newSellingPrice <= 0) {
      throw new Error('Selling price must be greater than zero.');
    }

    const pIndex = this.products.findIndex((p) => p.id === params.productId);
    if (pIndex === -1) {
      throw new Error('Product not found.');
    }

    const product = this.products[pIndex];
    const now = new Date().toISOString();

    if (params.packageId) {
      const pkgIndex = product.packages.findIndex((pkg) => pkg.id === params.packageId);
      if (pkgIndex === -1) {
        throw new Error('Package size not found.');
      }
      const pkg = product.packages[pkgIndex];
      const oldSelling = pkg.selling_price;
      const oldCost = pkg.cost_price;

      const updatedPackages = [...product.packages];
      updatedPackages[pkgIndex] = {
        ...pkg,
        selling_price: params.newSellingPrice,
        cost_price: params.newCostPrice !== undefined ? params.newCostPrice : pkg.cost_price,
      };

      this.products[pIndex] = {
        ...product,
        packages: updatedPackages,
        updated_at: now,
      };

      const historyEntry: ProductPriceHistory = {
        id: 'ph-' + Date.now(),
        product_id: product.id,
        package_id: pkg.id,
        package_name: pkg.package_name,
        old_selling_price: oldSelling,
        new_selling_price: params.newSellingPrice,
        old_cost_price: oldCost,
        new_cost_price: params.newCostPrice,
        changed_by: this.currentUser.name,
        reason: params.reason || 'General price update',
        created_at: now,
      };

      this.priceHistories = [historyEntry, ...this.priceHistories];

      this.logAudit(
        'PRICE_CHANGED',
        'ProductPackage',
        pkg.id,
        `Updated ${product.name} (${pkg.package_name}) price from KSh ${oldSelling} to KSh ${params.newSellingPrice}. Reason: ${params.reason}`
      );
      this.persist();
      syncProductToSupabase(this.products[pIndex]);
    } else {
      // Update base unit price
      const oldSelling = product.selling_price_per_base_unit;
      const oldCost = product.cost_price_per_base_unit;

      this.products[pIndex] = {
        ...product,
        selling_price_per_base_unit: params.newSellingPrice,
        cost_price_per_base_unit: params.newCostPrice !== undefined ? params.newCostPrice : oldCost,
        updated_at: now,
      };

      const historyEntry: ProductPriceHistory = {
        id: 'ph-' + Date.now(),
        product_id: product.id,
        package_name: `1 ${product.base_unit} Base Price`,
        old_selling_price: oldSelling,
        new_selling_price: params.newSellingPrice,
        old_cost_price: oldCost,
        new_cost_price: params.newCostPrice,
        changed_by: this.currentUser.name,
        reason: params.reason || 'Base unit price adjustment',
        created_at: now,
      };

      this.priceHistories = [historyEntry, ...this.priceHistories];

      this.logAudit(
        'PRICE_CHANGED',
        'Product',
        product.id,
        `Updated ${product.name} base price from KSh ${oldSelling}/${product.base_unit} to KSh ${params.newSellingPrice}/${product.base_unit}`
      );
    }

    this.persist();
    syncProductToSupabase(this.products[pIndex]);
  }

  // ==================== PRODUCT CRUD ====================

  public saveProduct(productData: Partial<Product>): Product {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot create or modify products.');
    }

    if (!productData.name || productData.name.trim() === '') {
      throw new Error('Product name is required.');
    }

    if (!productData.sku || productData.sku.trim() === '') {
      throw new Error('Product SKU is required.');
    }

    const skuUpper = productData.sku.trim().toUpperCase();
    const existingWithSku = this.products.find(
      (p) => p.sku.toUpperCase() === skuUpper && p.id !== productData.id
    );
    if (existingWithSku) {
      throw new Error(`The SKU "${skuUpper}" is already in use by another product.`);
    }

    const now = new Date().toISOString();

    if (productData.id) {
      const pIndex = this.products.findIndex((p) => p.id === productData.id);
      if (pIndex === -1) {
        throw new Error('Product not found.');
      }
      const existing = this.products[pIndex];
      const updated: Product = {
        ...existing,
        ...productData,
        sku: skuUpper,
        updated_at: now,
      } as Product;

      this.products[pIndex] = updated;
      this.logAudit('PRODUCT_EDITED', 'Product', updated.id, `Product "${updated.name}" details updated.`);
      this.persist();
      syncProductToSupabase(updated);
      return updated;
    } else {
      const newProduct: Product = {
        id: 'prod-' + Date.now(),
        sku: skuUpper,
        name: productData.name.trim(),
        category_id: productData.category_id || 'cat-raw-materials',
        subcategory: productData.subcategory || '',
        brand: productData.brand || 'Pasture Feeds',
        description: productData.description || '',
        base_unit: productData.base_unit || 'KG',
        selling_price_per_base_unit: productData.selling_price_per_base_unit || 50,
        cost_price_per_base_unit: productData.cost_price_per_base_unit || 40,
        min_stock_level: productData.min_stock_level || 250,
        current_stock: productData.current_stock || 0,
        supplier_id: productData.supplier_id,
        image_url: productData.image_url,
        packages: productData.packages || [
          {
            id: 'pkg-' + Date.now() + '-1',
            product_id: 'prod-' + Date.now(),
            package_name: '1 KG Loose',
            size_in_base_units: 1,
            selling_price: productData.selling_price_per_base_unit || 50,
            cost_price: productData.cost_price_per_base_unit || 40,
            is_default: true,
            active: true,
          },
        ],
        active: true,
        created_at: now,
        updated_at: now,
      };

      if (newProduct.current_stock > 0) {
        // Record opening stock movement
        const mov: InventoryMovement = {
          id: 'mov-' + Date.now(),
          product_id: newProduct.id,
          product_name: newProduct.name,
          quantity_packages: 1,
          quantity_base_units: newProduct.current_stock,
          base_unit: newProduct.base_unit,
          previous_stock: 0,
          new_stock: newProduct.current_stock,
          movement_type: 'OPENING_STOCK',
          reference_number: 'INIT-' + newProduct.sku,
          notes: 'Initial opening stock',
          created_by: this.currentUser.name,
          created_at: now,
        };
        this.movements = [mov, ...this.movements];
      }

      this.products = [newProduct, ...this.products];
      this.logAudit('PRODUCT_CREATED', 'Product', newProduct.id, `Created product "${newProduct.name}" (SKU: ${newProduct.sku})`);
      this.persist();
      syncProductToSupabase(newProduct);
      return newProduct;
    }
  }

  public archiveProduct(productId: string): void {
    if (this.currentUser.role !== 'ADMIN') {
      throw new Error('Only administrators can archive products.');
    }
    const pIndex = this.products.findIndex((p) => p.id === productId);
    if (pIndex !== -1) {
      const prod = this.products[pIndex];
      this.products[pIndex] = { ...prod, active: false, updated_at: new Date().toISOString() };
      this.logAudit('PRODUCT_ARCHIVED', 'Product', productId, `Archived product "${prod.name}"`);
      this.persist();
      syncDeleteProductFromSupabase(productId);
    }
  }

  // ==================== CUSTOMERS & SUPPLIERS & EXPENSES ====================

  public saveCustomer(customer: Partial<Customer>): Customer {
    if (!customer.name || customer.name.trim() === '') {
      throw new Error('Customer name is required.');
    }
    const now = new Date().toISOString();
    if (customer.id) {
      const index = this.customers.findIndex((c) => c.id === customer.id);
      if (index !== -1) {
        this.customers[index] = { ...this.customers[index], ...customer };
        this.logAudit('CUSTOMER_UPDATED', 'Customer', customer.id, `Updated customer "${customer.name}"`);
        this.persist();
        syncCustomerToSupabase(this.customers[index]);
        return this.customers[index];
      }
    }

    const newCustomer: Customer = {
      id: 'cust-' + Date.now(),
      name: customer.name.trim(),
      phone: customer.phone || '',
      location: customer.location || '',
      email: customer.email || '',
      notes: customer.notes || '',
      total_spent: 0,
      total_orders: 0,
      created_at: now,
    };
    this.customers = [newCustomer, ...this.customers];
    this.logAudit('CUSTOMER_CREATED', 'Customer', newCustomer.id, `Created customer "${newCustomer.name}"`);
    this.persist();
    syncCustomerToSupabase(newCustomer);
    return newCustomer;
  }

  // ==================== CUSTOMER CREDIT & PAYMENTS ====================

  public getCustomerCreditBalance(customerId: string): number {
    return this.sales
      .filter((s) => s.status !== 'VOIDED' && s.customer_id === customerId)
      .reduce((sum, s) => {
        if (s.payment_method === 'ON_CREDIT') {
          const paid = s.amount_paid ?? 0;
          return sum + Math.max(0, s.total - paid);
        }
        if (s.amount_paid !== undefined && s.amount_paid < s.total) {
          return sum + Math.max(0, s.total - s.amount_paid);
        }
        return sum;
      }, 0);
  }

  public getCustomerUnpaidSales(
    customerId: string
  ): Array<{ sale: Sale; paid: number; remainingDue: number }> {
    return this.sales
      .filter((s) => s.status !== 'VOIDED' && s.customer_id === customerId)
      .map((s) => {
        const paid = s.amount_paid ?? (s.payment_method === 'ON_CREDIT' ? 0 : s.total);
        const remainingDue = Math.max(0, s.total - paid);
        return { sale: s, paid, remainingDue };
      })
      .filter((item) => item.remainingDue > 0.001)
      .sort((a, b) => new Date(a.sale.created_at).getTime() - new Date(b.sale.created_at).getTime());
  }

  public recordCustomerPayment(params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT';
    reference?: string;
    notes?: string;
    specificSaleId?: string;
  }): { payment: CustomerPayment; remainingBalance: number } {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const customer = this.customers.find((c) => c.id === params.customerId);
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const now = new Date().toISOString();
    let remainingPaymentToApply = params.amount;
    const appliedSales: Array<{
      sale_id: string;
      receipt_number: string;
      amount_applied: number;
    }> = [];

    const updatedSales = [...this.sales];

    // If specificSaleId provided, apply there first
    if (params.specificSaleId) {
      const sIndex = updatedSales.findIndex(
        (s) => s.id === params.specificSaleId && s.customer_id === params.customerId && s.status !== 'VOIDED'
      );
      if (sIndex !== -1) {
        const sale = updatedSales[sIndex];
        const currentPaid = sale.amount_paid ?? (sale.payment_method === 'ON_CREDIT' ? 0 : sale.total);
        const due = Math.max(0, sale.total - currentPaid);
        const toApply = Math.min(remainingPaymentToApply, due);

        if (toApply > 0) {
          const newPaid = currentPaid + toApply;
          updatedSales[sIndex] = {
            ...sale,
            amount_paid: newPaid,
            payment_status: newPaid >= sale.total ? 'PAID' : 'PARTIAL',
          };
          remainingPaymentToApply -= toApply;
          appliedSales.push({
            sale_id: sale.id,
            receipt_number: sale.receipt_number,
            amount_applied: toApply,
          });
        }
      }
    }

    // Apply any remaining payment to unpaid sales in FIFO order
    if (remainingPaymentToApply > 0) {
      for (let i = 0; i < updatedSales.length; i++) {
        if (remainingPaymentToApply <= 0) break;

        const sale = updatedSales[i];
        if (sale.status === 'VOIDED' || sale.customer_id !== params.customerId) continue;

        const currentPaid = sale.amount_paid ?? (sale.payment_method === 'ON_CREDIT' ? 0 : sale.total);
        const due = Math.max(0, sale.total - currentPaid);
        if (due <= 0.001) continue;

        const toApply = Math.min(remainingPaymentToApply, due);
        const newPaid = currentPaid + toApply;

        updatedSales[i] = {
          ...sale,
          amount_paid: newPaid,
          payment_status: newPaid >= sale.total ? 'PAID' : 'PARTIAL',
        };

        remainingPaymentToApply -= toApply;

        const existingApplied = appliedSales.find((a) => a.sale_id === sale.id);
        if (existingApplied) {
          existingApplied.amount_applied += toApply;
        } else {
          appliedSales.push({
            sale_id: sale.id,
            receipt_number: sale.receipt_number,
            amount_applied: toApply,
          });
        }
      }
    }

    this.sales = updatedSales;

    // Create payment voucher/receipt
    const paymentNumber = 'PAY-' + String(this.customerPayments.length + 101).padStart(6, '0');
    const payment: CustomerPayment = {
      id: 'pay-' + Date.now(),
      payment_number: paymentNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      amount: params.amount,
      payment_method: params.paymentMethod,
      reference: params.reference?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      applied_sales: appliedSales,
      created_by: this.currentUser.name,
      created_at: now,
    };

    this.customerPayments = [payment, ...this.customerPayments];

    this.logAudit(
      'CUSTOMER_PAYMENT',
      'Customer',
      customer.id,
      `Recorded credit payment of KSh ${params.amount.toLocaleString()} from "${customer.name}" via ${
        params.paymentMethod
      }. ${appliedSales.length > 0 ? `Applied to: ${appliedSales.map((a) => a.receipt_number).join(', ')}` : ''}`
    );

    this.persist();

    const remainingBalance = this.getCustomerCreditBalance(customer.id);

    // Real-time synchronization to Supabase Cloud
    syncCustomerPaymentToSupabase(payment);
    const updatedCust = this.customers.find((c) => c.id === customer.id);
    if (updatedCust) {
      syncCustomerToSupabase({
        ...updatedCust,
        credit_balance: remainingBalance,
      });
    }

    return { payment, remainingBalance };
  }

  public saveSupplier(supplier: Partial<Supplier>): Supplier {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot manage suppliers.');
    }
    if (!supplier.name || supplier.name.trim() === '') {
      throw new Error('Supplier name is required.');
    }
    const now = new Date().toISOString();
    if (supplier.id) {
      const index = this.suppliers.findIndex((s) => s.id === supplier.id);
      if (index !== -1) {
        this.suppliers[index] = { ...this.suppliers[index], ...supplier };
        this.logAudit('SUPPLIER_UPDATED', 'Supplier', supplier.id, `Updated supplier "${supplier.name}"`);
        this.persist();
        syncSupplierToSupabase(this.suppliers[index]);
        return this.suppliers[index];
      }
    }

    const newSupplier: Supplier = {
      id: 'sup-' + Date.now(),
      name: supplier.name.trim(),
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      location: supplier.location || '',
      notes: supplier.notes || '',
      active: true,
      total_purchases_amount: 0,
      created_at: now,
    };
    this.suppliers = [newSupplier, ...this.suppliers];
    this.logAudit('SUPPLIER_CREATED', 'Supplier', newSupplier.id, `Created supplier "${newSupplier.name}"`);
    this.persist();
    syncSupplierToSupabase(newSupplier);
    return newSupplier;
  }

  public createExpense(expense: {
    category: Expense['category'];
    description: string;
    amount: number;
    expenseDate?: string;
    notes?: string;
    receiptRef?: string;
  }): Expense {
    if (expense.amount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    if (!expense.description || expense.description.trim() === '') {
      throw new Error('Expense description is required.');
    }

    const now = new Date().toISOString();
    const newExpense: Expense = {
      id: 'exp-' + Date.now(),
      category: expense.category,
      description: expense.description.trim(),
      amount: expense.amount,
      expense_date: expense.expenseDate || now,
      notes: expense.notes,
      receipt_ref: expense.receiptRef,
      created_by: this.currentUser.name,
      created_at: now,
    };

    this.expenses = [newExpense, ...this.expenses];
    this.logAudit(
      'EXPENSE_CREATED',
      'Expense',
      newExpense.id,
      `Added expense: ${newExpense.category} - KSh ${newExpense.amount.toLocaleString()} ("${newExpense.description}")`
    );
    this.persist();
    syncExpenseToSupabase(newExpense);
    return newExpense;
  }

  // ==================== CATEGORIES & SETTINGS ====================

  public saveCategory(category: Partial<ProductCategory>): ProductCategory {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff members cannot manage categories.');
    }
    if (!category.name) throw new Error('Category name is required.');

    if (category.id) {
      const idx = this.categories.findIndex((c) => c.id === category.id);
      if (idx !== -1) {
        this.categories[idx] = { ...this.categories[idx], ...category };
        this.persist();
        return this.categories[idx];
      }
    }

    const newCat: ProductCategory = {
      id: 'cat-' + Date.now(),
      name: category.name.trim(),
      slug: category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: category.description || '',
      color: category.color || '#16a34a',
      active: true,
    };
    this.categories = [...this.categories, newCat];
    this.persist();
    syncCategoryToSupabase(newCat);
    return newCat;
  }

  public updateSettings(newSettings: Partial<BusinessSettings>): void {
    if (this.currentUser.role !== 'ADMIN') {
      throw new Error('Permission denied. Only administrators can alter business settings.');
    }
    this.settings = { ...this.settings, ...newSettings };
    this.logAudit('SETTINGS_UPDATED', 'Settings', undefined, 'Business and system settings modified.');
    this.persist();
    syncSettingsToSupabase(this.settings);
  }

  // ==================== STOCK COUNT SESSION ====================

  public commitStockCount(params: {
    notes?: string;
    items: Array<{
      productId: string;
      physicalStock: number;
      notes?: string;
    }>;
  }): StockCountSession {
    if (this.currentUser.role === 'STAFF') {
      throw new Error('Permission denied. Staff cannot perform stock reconciliation.');
    }

    const now = new Date().toISOString();
    const sessionId = 'sc-' + Date.now();
    const updatedProducts = [...this.products];
    const movementsToAdd: InventoryMovement[] = [];
    const countItems = [];

    for (const item of params.items) {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIndex === -1) continue;

      const product = updatedProducts[pIndex];
      const sysStock = product.current_stock;
      const physStock = item.physicalStock;
      const diff = physStock - sysStock;

      countItems.push({
        product_id: product.id,
        product_name: product.name,
        base_unit: product.base_unit,
        system_stock: sysStock,
        physical_stock: physStock,
        difference: diff,
        notes: item.notes,
        adjusted: diff !== 0,
      });

      if (diff !== 0) {
        updatedProducts[pIndex] = {
          ...product,
          current_stock: physStock,
          updated_at: now,
        };

        movementsToAdd.push({
          id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          product_id: product.id,
          product_name: product.name,
          quantity_packages: 1,
          quantity_base_units: diff,
          base_unit: product.base_unit,
          previous_stock: sysStock,
          new_stock: physStock,
          movement_type: diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          reference_number: sessionId,
          notes: `Stock count audit reconciliation. ${item.notes || ''}`.trim(),
          created_by: this.currentUser.name,
          created_at: now,
        });
      }
    }

    const session: StockCountSession = {
      id: sessionId,
      count_date: now,
      status: 'COMPLETED',
      notes: params.notes,
      conducted_by: this.currentUser.name,
      items: countItems,
      created_at: now,
      completed_at: now,
    };

    this.products = updatedProducts;
    this.movements = [...movementsToAdd, ...this.movements];
    this.stockCounts = [session, ...this.stockCounts];

    this.logAudit(
      'STOCK_COUNT_COMPLETED',
      'StockCount',
      sessionId,
      `Completed physical stock count session with ${countItems.filter((i) => i.difference !== 0).length} adjusted products.`
    );

    this.persist();
    return session;
  }

  // ==================== USERS & DATABASE BACKUP ====================

  public saveUser(user: Partial<UserProfile>): UserProfile {
    if (this.currentUser.role !== 'ADMIN') {
      throw new Error('Permission denied. Only administrators can manage staff accounts.');
    }
    if (!user.name || user.name.trim() === '') {
      throw new Error('User name is required.');
    }

    if (user.id) {
      const idx = this.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...user };
        this.logAudit('USER_UPDATED', 'User', user.id, `Updated staff profile for ${user.name}`);
        this.persist();
        return this.users[idx];
      }
    }

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      name: user.name.trim(),
      email: user.email || `${user.username || 'user'}@pasturefeeds.co.ke`,
      role: user.role || 'STAFF',
      active: user.active !== undefined ? user.active : true,
      phone: user.phone,
    };

    this.users = [...this.users, newUser];
    this.logAudit('USER_CREATED', 'User', newUser.id, `Created staff account for ${newUser.name} (${newUser.role})`);
    this.persist();
    return newUser;
  }

  public exportDatabaseJSON(): string {
    const backup = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      settings: this.settings,
      users: this.users,
      categories: this.categories,
      products: this.products,
      suppliers: this.suppliers,
      customers: this.customers,
      sales: this.sales,
      purchases: this.purchases,
      expenses: this.expenses,
      movements: this.movements,
      priceHistories: this.priceHistories,
      auditLogs: this.auditLogs,
      stockCounts: this.stockCounts,
    };
    return JSON.stringify(backup, null, 2);
  }

  public importDatabaseJSON(jsonStr: string): void {
    const data = JSON.parse(jsonStr);
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid backup file format: Missing products array.');
    }
    if (data.settings) this.settings = data.settings;
    if (data.users) this.users = data.users;
    if (data.categories) this.categories = data.categories;
    if (data.products) this.products = data.products;
    if (data.suppliers) this.suppliers = data.suppliers;
    if (data.customers) this.customers = data.customers;
    if (data.sales) this.sales = data.sales;
    if (data.purchases) this.purchases = data.purchases;
    if (data.expenses) this.expenses = data.expenses;
    if (data.movements) this.movements = data.movements;
    if (data.priceHistories) this.priceHistories = data.priceHistories;
    if (data.auditLogs) this.auditLogs = data.auditLogs;
    if (data.stockCounts) this.stockCounts = data.stockCounts;

    this.logAudit('DATABASE_IMPORTED', 'System', undefined, 'Full database restored from JSON backup.');
    this.persist();
  }

  public importFromSupabase(cloudData: any): void {
    if (!cloudData) return;
    if (cloudData.settings) {
      this.settings = { ...this.settings, ...cloudData.settings };
    }
    if (cloudData.categories && Array.isArray(cloudData.categories) && cloudData.categories.length > 0) {
      this.categories = cloudData.categories;
    }
    if (cloudData.products && Array.isArray(cloudData.products) && cloudData.products.length > 0) {
      this.products = cloudData.products;
    }
    if (cloudData.suppliers && Array.isArray(cloudData.suppliers) && cloudData.suppliers.length > 0) {
      this.suppliers = cloudData.suppliers;
    }
    if (cloudData.customers && Array.isArray(cloudData.customers) && cloudData.customers.length > 0) {
      this.customers = cloudData.customers;
    }
    if (cloudData.sales && Array.isArray(cloudData.sales) && cloudData.sales.length > 0) {
      this.sales = cloudData.sales;
    }
    if (cloudData.customerPayments && Array.isArray(cloudData.customerPayments) && cloudData.customerPayments.length > 0) {
      this.customerPayments = cloudData.customerPayments;
    }
    if (cloudData.purchases && Array.isArray(cloudData.purchases) && cloudData.purchases.length > 0) {
      this.purchases = cloudData.purchases;
    }
    if (cloudData.expenses && Array.isArray(cloudData.expenses) && cloudData.expenses.length > 0) {
      this.expenses = cloudData.expenses;
    }
    if (cloudData.movements && Array.isArray(cloudData.movements) && cloudData.movements.length > 0) {
      this.movements = cloudData.movements;
    }
    if (cloudData.users && Array.isArray(cloudData.users) && cloudData.users.length > 0) {
      this.users = cloudData.users;
    }

    this.logAudit('CLOUD_SYNC', 'System', undefined, 'Synchronized latest shop data from Supabase Cloud');
    this.persist();
  }
}

export const appStore = new AppStore();
