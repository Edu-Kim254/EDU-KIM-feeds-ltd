import React from 'react';
import { Product } from '../../types';
import { formatStockDisplay } from '../../utils/formatters';
import { Package } from 'lucide-react';

interface PackageDisplayProps {
  product: Product;
  compact?: boolean;
}

export const PackageDisplay: React.FC<PackageDisplayProps> = ({ product, compact = false }) => {
  const { primary, subtext } = formatStockDisplay(product);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
        <Package className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{primary}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
        <Package className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{primary}</span>
      </div>
      <span className="text-xs text-slate-500 font-mono mt-0.5">{subtext}</span>
    </div>
  );
};
