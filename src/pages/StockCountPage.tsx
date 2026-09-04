import React, { useState } from 'react';
import { Product, StockCountSession, BusinessSettings, UserProfile } from '../types';
import { formatStockDisplay, formatDateTime } from '../utils/formatters';
import { FileCheck2, ArrowLeft, CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface StockCountPageProps {
  products: Product[];
  stockCountHistory: StockCountSession[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  onCommitCount: (params: {
    notes?: string;
    items: Array<{
      productId: string;
      physicalStock: number;
      notes?: string;
    }>;
  }) => void;
  onBack: () => void;
}

export const StockCountPage: React.FC<StockCountPageProps> = ({
  products,
  stockCountHistory,
  settings,
  currentUser,
  onCommitCount,
  onBack,
}) => {
  const activeProducts = products.filter((p) => p.active);

  // Map of physical counts entered by user (productId -> count)
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    activeProducts.forEach((p) => {
      initial[p.id] = p.current_stock; // default to system stock for convenience
    });
    return initial;
  });

  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute discrepancies
  const itemsWithDiff = activeProducts.map((p) => {
    const physical = counts[p.id] !== undefined ? counts[p.id] : p.current_stock;
    const diff = physical - p.current_stock;
    return {
      product: p,
      physical,
      system: p.current_stock,
      diff,
    };
  });

  const changedItemsCount = itemsWithDiff.filter((i) => i.diff !== 0).length;

  const handleUpdateCount = (productId: string, val: string) => {
    const parsed = parseFloat(val);
    setCounts((prev) => ({
      ...prev,
      [productId]: isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  };

  const handleCommit = () => {
    if (currentUser.role === 'STAFF') {
      alert('Only Store Managers or Admins can finalize physical stock counts.');
      return;
    }

    if (
      changedItemsCount > 0 &&
      !confirm(
        `You are about to reconcile ${changedItemsCount} product(s) with physical discrepancies. Proceed?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToCommit = activeProducts.map((p) => ({
        productId: p.id,
        physicalStock: counts[p.id] !== undefined ? counts[p.id] : p.current_stock,
      }));

      onCommitCount({
        notes: sessionNotes || undefined,
        items: itemsToCommit,
      });

      alert('Stock reconciliation completed successfully!');
      onBack();
    } catch (err: any) {
      alert(err?.message || 'Failed to reconcile stock session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {changedItemsCount} item{changedItemsCount === 1 ? '' : 's'} with difference
          </span>
          <button
            disabled={isSubmitting}
            onClick={handleCommit}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Commit Reconciliation</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Physical Stock Count Session
            </h1>
            <p className="text-xs text-slate-500">
              Perform end-of-week or month-end stocktake. Enter verified physical bags/loose stock in the store.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Session Notes / Reason (Optional)
          </label>
          <input
            type="text"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="e.g. Month-end Saturday physical stock audit"
            className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Stock Count Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Feed Product</th>
                <th className="py-3 px-4">System Stock</th>
                <th className="py-3 px-4">Packaging Breakdown</th>
                <th className="py-3 px-4 w-48">Actual Physical Count (KG)</th>
                <th className="py-3 px-4 text-right">Discrepancy (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsWithDiff.map(({ product, physical, system, diff }) => {
                const formatted = formatStockDisplay(product);
                const hasDiff = diff !== 0;

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      hasDiff ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                        {product.sku}
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {system} {product.base_unit}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-medium text-slate-800">{formatted.primary}</span>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={physical}
                        onChange={(e) => handleUpdateCount(product.id, e.target.value)}
                        className={`w-36 p-2 rounded-lg font-mono font-bold text-sm border focus:ring-2 focus:ring-blue-500 outline-none ${
                          hasDiff
                            ? 'border-amber-400 bg-amber-50 text-amber-950'
                            : 'border-slate-200 bg-white text-slate-900'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {diff === 0 ? (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                        </span>
                      ) : diff > 0 ? (
                        <span className="text-blue-700">
                          +{diff} {product.base_unit} (Surplus)
                        </span>
                      ) : (
                        <span className="text-rose-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {diff} {product.base_unit} (Deficit)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
