/**
 * Types and interfaces for Animal Feeds Shop Management System
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  avatar_url?: string;
}

export type BaseUnit = 'KG' | 'LITRE' | 'PIECE' | 'BOTTLE' | 'CUSTOM';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  active: boolean;
  item_count?: number;
}

export interface ProductPackage {
  id: string;
  product_id: string;
  package_name: string; // e.g. "70 KG Bag", "50 KG Bag", "20 KG Bag", "10 KG Bag", "1 KG Loose"
  size_in_base_units: number; // e.g. 70, 50, 20, 10, 1
  selling_price: number; // e.g. 2940 for 70KG
  cost_price: number; // e.g. 2500 for 70KG
  barcode?: string;
  is_default?: boolean;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  base_unit: BaseUnit;
  selling_price_per_base_unit: number; // e.g. 45 per KG
  cost_price_per_base_unit: number; // e.g. 38 per KG
  min_stock_level: number; // in base units (e.g. 250 KG = 5 bags of 50KG)
  current_stock: number; // strictly tracked in base units (KG)
  supplier_id?: string;
  image_url?: string;
  packages: ProductPackage[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  package_id?: string;
  package_name?: string;
  old_selling_price: number;
  new_selling_price: number;
  old_cost_price?: number;
  new_cost_price?: number;
  changed_by: string;
  reason: string;
  created_at: string;
}

export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'DAMAGE'
  | 'LOSS'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'OPENING_STOCK';

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  package_id?: string;
  package_name?: string;
  quantity_packages: number;
  quantity_base_units: number; // positive for additions, negative for deductions
  base_unit: BaseUnit;
  previous_stock: number;
  new_stock: number;
  movement_type: MovementType;
  reference_number: string; // e.g. "INV-000124", "PO-00042", "ADJ-20260904"
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location?: string;
  email?: string;
  notes?: string;
  total_spent: number;
  total_orders: number;
  credit_balance?: number;
  last_purchase_date?: string;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  payment_number: string; // e.g. "PAY-000101"
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT';
  reference?: string;
  notes?: string;
  applied_sales?: Array<{
    sale_id: string;
    receipt_number: string;
    amount_applied: number;
  }>;
  created_by: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  location?: string;
  notes?: string;
  active: boolean;
  total_purchases_amount: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  package_id: string;
  package_name: string;
  quantity: number; // number of packages / loose kg
  quantity_base_units: number; // total base units deducted (e.g. 2 bags x 50kg = 100kg)
  unit_price: number; // price per package or per kg
  cost_price_per_unit: number; // recorded for historical profit calculation
  line_total: number;
  estimated_profit: number;
}

export type SaleStatus = 'COMPLETED' | 'VOIDED';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface Sale {
  id: string;
  receipt_number: string; // e.g. "INV-000124"
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'ON_CREDIT' | 'OTHER_DIRECT';
  amount_paid?: number; // amount paid towards this sale
  payment_status?: PaymentStatus;
  notes?: string;
  status: SaleStatus;
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;
  created_by: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  package_id?: string;
  package_name: string;
  quantity: number;
  quantity_base_units: number;
  cost_price: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseItem[];
  total_cost: number;
  purchase_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'Transport'
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Salaries'
  | 'Repairs'
  | 'Packaging'
  | 'Miscellaneous'
  | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  notes?: string;
  receipt_ref?: string;
  created_by: string;
  created_at: string;
}

export interface StockCountItem {
  product_id: string;
  product_name: string;
  base_unit: BaseUnit;
  system_stock: number;
  physical_stock: number;
  difference: number;
  notes?: string;
  adjusted: boolean;
}

export interface StockCountSession {
  id: string;
  count_date: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  conducted_by: string;
  items: StockCountItem[];
  created_at: string;
  completed_at?: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
  previous_state?: string;
  new_state?: string;
  created_at: string;
}

export interface BusinessSettings {
  shop_name: string;
  tagline: string;
  phone: string;
  email: string;
  location: string;
  address: string;
  receipt_footer: string;
  currency: string;
  currency_symbol: string;
  default_min_stock_bags: number;
  allow_negative_stock: boolean;
  tax_enabled: boolean;
  tax_rate: number;
}
