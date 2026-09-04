import { Product, BaseUnit } from '../types';

/**
 * Format currency as Kenya Shillings (KES / KSh)
 */
export function formatCurrency(amount: number, symbol: string = 'KSh'): string {
  if (isNaN(amount)) return `${symbol} 0`;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}

/**
 * Format numbers with comma separation
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format date in Kenya / East Africa Time (EAT) format: DD/MM/YYYY
 */
export function formatDate(dateString: string | Date): string {
  try {
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Africa/Nairobi',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

/**
 * Format date and time in Kenya / East Africa Time: DD/MM/YYYY HH:mm
 */
export function formatDateTime(dateString: string | Date): string {
  try {
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Nairobi',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

/**
 * Convert base-unit stock into human-friendly package representation
 * Example: 375 KG with 50KG bags -> "7 × 50 KG bags + 25 KG loose"
 * Example: 350 KG with 50KG bags -> "7 × 50 KG bags"
 * Example: 25 KG with 50KG bags -> "25 KG loose"
 */
export function formatStockDisplay(product: Product): {
  primary: string;
  subtext: string;
  totalBase: string;
} {
  const stock = product.current_stock || 0;
  const unit = product.base_unit || 'KG';

  if (unit !== 'KG') {
    return {
      primary: `${formatNumber(stock, 1)} ${unit}`,
      subtext: `${formatNumber(stock, 1)} ${unit} in stock`,
      totalBase: `${formatNumber(stock, 1)} ${unit}`,
    };
  }

  // Find the primary packaging (prefer largest standard bag e.g. 50kg or 70kg)
  const packages = (product.packages || [])
    .filter((p) => p.active && p.size_in_base_units > 1)
    .sort((a, b) => b.size_in_base_units - a.size_in_base_units);

  const primaryPackage = packages[0];

  if (!primaryPackage || primaryPackage.size_in_base_units <= 1) {
    return {
      primary: `${formatNumber(stock, 1)} KG`,
      subtext: 'Loose feed',
      totalBase: `${formatNumber(stock, 1)} KG`,
    };
  }

  const bagSize = primaryPackage.size_in_base_units;
  const bagName = primaryPackage.package_name || `${bagSize} KG`;
  const fullBags = Math.floor(stock / bagSize);
  const looseKg = stock % bagSize;

  let primary = '';
  if (fullBags > 0 && looseKg > 0) {
    primary = `${fullBags} × ${bagName} + ${formatNumber(looseKg, 1)} KG loose`;
  } else if (fullBags > 0 && looseKg === 0) {
    primary = `${fullBags} × ${bagName}`;
  } else if (fullBags === 0 && looseKg > 0) {
    primary = `${formatNumber(looseKg, 1)} KG loose`;
  } else {
    primary = `0 × ${bagName} (Out of Stock)`;
  }

  return {
    primary,
    subtext: `Total: ${formatNumber(stock, 1)} KG`,
    totalBase: `${formatNumber(stock, 1)} KG`,
  };
}
