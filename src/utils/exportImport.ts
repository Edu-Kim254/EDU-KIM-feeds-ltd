import { Product, Sale, Purchase, Customer, Supplier, Expense } from '../types';

/**
 * Utility to download CSV files in browser
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV field
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export Products to CSV
 */
export function exportProductsCSV(products: Product[]): void {
  const headers = [
    'SKU',
    'Product Name',
    'Category ID',
    'Subcategory',
    'Brand',
    'Base Unit',
    'Current Stock',
    'Min Stock Level',
    'Selling Price Per Base Unit (KSh)',
    'Cost Price Per Base Unit (KSh)',
    'Package Options',
    'Status',
  ];

  const rows = products.map((p) => [
    escapeCsv(p.sku),
    escapeCsv(p.name),
    escapeCsv(p.category_id),
    escapeCsv(p.subcategory || ''),
    escapeCsv(p.brand || ''),
    escapeCsv(p.base_unit),
    p.current_stock,
    p.min_stock_level,
    p.selling_price_per_base_unit,
    p.cost_price_per_base_unit,
    escapeCsv(
      (p.packages || [])
        .map((pkg) => `${pkg.package_name}: KSh ${pkg.selling_price}`)
        .join('; ')
    ),
    p.active ? 'Active' : 'Archived',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(`pasture_feeds_products_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

/**
 * Export Sales History to CSV
 */
export function exportSalesCSV(sales: Sale[]): void {
  const headers = [
    'Receipt Number',
    'Date/Time',
    'Customer Name',
    'Customer Phone',
    'Payment Method',
    'Subtotal (KSh)',
    'Discount (KSh)',
    'Total (KSh)',
    'Status',
    'Staff / Cashier',
    'Items Details',
  ];

  const rows = sales.map((s) => [
    escapeCsv(s.receipt_number),
    escapeCsv(new Date(s.created_at).toLocaleString('en-KE')),
    escapeCsv(s.customer_name),
    escapeCsv(s.customer_phone || ''),
    escapeCsv(s.payment_method),
    s.subtotal,
    s.discount,
    s.total,
    escapeCsv(s.status),
    escapeCsv(s.created_by),
    escapeCsv(
      s.items
        .map((i) => `${i.quantity} × ${i.product_name} (${i.package_name}) @ ${i.unit_price}`)
        .join('; ')
    ),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(`pasture_feeds_sales_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

/**
 * Export Purchases to CSV
 */
export function exportPurchasesCSV(purchases: Purchase[]): void {
  const headers = [
    'Invoice / Ref Number',
    'Date',
    'Supplier Name',
    'Total Cost (KSh)',
    'Recorded By',
    'Items Details',
    'Notes',
  ];

  const rows = purchases.map((p) => [
    escapeCsv(p.invoice_number),
    escapeCsv(new Date(p.purchase_date).toLocaleDateString('en-KE')),
    escapeCsv(p.supplier_name),
    p.total_cost,
    escapeCsv(p.created_by),
    escapeCsv(
      p.items
        .map((i) => `${i.quantity} × ${i.product_name} (${i.package_name}) @ ${i.cost_price}`)
        .join('; ')
    ),
    escapeCsv(p.notes || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(`pasture_feeds_purchases_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

/**
 * Export Expenses to CSV
 */
export function exportExpensesCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Category', 'Description', 'Amount (KSh)', 'Receipt Ref', 'Added By', 'Notes'];

  const rows = expenses.map((e) => [
    escapeCsv(new Date(e.expense_date).toLocaleDateString('en-KE')),
    escapeCsv(e.category),
    escapeCsv(e.description),
    e.amount,
    escapeCsv(e.receipt_ref || ''),
    escapeCsv(e.created_by),
    escapeCsv(e.notes || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(`pasture_feeds_expenses_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

/**
 * Export Customers to CSV
 */
export function exportCustomersCSV(
  customers: Customer[],
  getCreditBalance?: (customerId: string) => number
): void {
  const headers = [
    'Customer Name',
    'Phone',
    'Location',
    'Credit Balance (KSh)',
    'Total Spent (KSh)',
    'Total Orders',
    'Last Purchase Date',
    'Notes',
  ];

  const rows = customers.map((c) => [
    escapeCsv(c.name),
    escapeCsv(c.phone),
    escapeCsv(c.location || ''),
    getCreditBalance ? getCreditBalance(c.id) : (c.credit_balance || 0),
    c.total_spent,
    c.total_orders,
    escapeCsv(c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString('en-KE') : 'None'),
    escapeCsv(c.notes || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(`pasture_feeds_customers_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export interface CSVImportResult {
  importedCount: number;
  failedCount: number;
  errors: string[];
  parsedProducts: Partial<Product>[];
}

/**
 * Parses and validates CSV spreadsheet for product importing
 */
export function parseProductCSV(csvText: string): CSVImportResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      importedCount: 0,
      failedCount: 0,
      errors: ['The CSV file is empty or does not have data rows.'],
      parsedProducts: [],
    };
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const skuIdx = header.findIndex((h) => h.includes('sku'));
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const categoryIdx = header.findIndex((h) => h.includes('cat'));
  const priceIdx = header.findIndex((h) => h.includes('sell') || h.includes('price'));
  const costIdx = header.findIndex((h) => h.includes('cost'));
  const stockIdx = header.findIndex((h) => h.includes('stock'));

  if (nameIdx === -1) {
    return {
      importedCount: 0,
      failedCount: lines.length - 1,
      errors: ['Missing required column: "Product Name". Please include a header with "Product Name".'],
      parsedProducts: [],
    };
  }

  const parsedProducts: Partial<Product>[] = [];
  const errors: string[] = [];
  let importedCount = 0;
  let failedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Basic CSV split respecting quotes
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim().replace(/^"|"$/g, ''));

    const name = cols[nameIdx];
    if (!name || name.trim() === '') {
      failedCount++;
      errors.push(`Row ${i + 1}: Missing Product Name.`);
      continue;
    }

    const sku = (skuIdx !== -1 && cols[skuIdx]) ? cols[skuIdx].toUpperCase().trim() : `IMP-${Date.now().toString().slice(-4)}-${i}`;
    const sellingPrice = priceIdx !== -1 ? parseFloat(cols[priceIdx]) || 50 : 50;
    const costPrice = costIdx !== -1 ? parseFloat(cols[costIdx]) || 40 : 40;
    const stock = stockIdx !== -1 ? parseFloat(cols[stockIdx]) || 0 : 0;
    const category = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx] : 'cat-raw-materials';

    if (sellingPrice < 0 || costPrice < 0) {
      failedCount++;
      errors.push(`Row ${i + 1} (${name}): Prices cannot be negative.`);
      continue;
    }

    parsedProducts.push({
      name,
      sku,
      category_id: category,
      selling_price_per_base_unit: sellingPrice,
      cost_price_per_base_unit: costPrice,
      current_stock: stock,
      base_unit: 'KG',
      min_stock_level: 100,
      active: true,
      packages: [
        {
          id: 'pkg-imp-' + Date.now() + '-' + i,
          product_id: '',
          package_name: '50 KG Bag',
          size_in_base_units: 50,
          selling_price: sellingPrice * 50,
          cost_price: costPrice * 50,
          is_default: true,
          active: true,
        },
        {
          id: 'pkg-imp-loose-' + Date.now() + '-' + i,
          product_id: '',
          package_name: '1 KG Loose',
          size_in_base_units: 1,
          selling_price: sellingPrice,
          cost_price: costPrice,
          is_default: false,
          active: true,
        },
      ],
    });

    importedCount++;
  }

  return {
    importedCount,
    failedCount,
    errors,
    parsedProducts,
  };
}
