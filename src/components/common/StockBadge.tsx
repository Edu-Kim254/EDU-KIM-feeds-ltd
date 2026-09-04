import React from 'react';
import { Product } from '../../types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StockBadgeProps {
  product: Product;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  product,
  showIcon = true,
  size = 'sm',
}) => {
  const stock = product.current_stock || 0;
  const minStock = product.min_stock_level || 100;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= minStock;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm font-medium';

  if (isOut) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium bg-rose-100 text-rose-800 border border-rose-200 ${sizeClasses}`}
      >
        {showIcon && <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
        Out of Stock
      </span>
    );
  }

  if (isLow) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200 ${sizeClasses}`}
      >
        {showIcon && <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
        Low Stock ({stock} {product.base_unit})
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 ${sizeClasses}`}
    >
      {showIcon && <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      In Stock
    </span>
  );
};
