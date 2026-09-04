import React, { useState, useMemo } from 'react';
import {
  Product,
  ProductCategory,
  InventoryMovement,
  BusinessSettings,
  UserProfile,
} from '../types';
import { formatCurrency, formatStockDisplay, formatNumber, formatDateTime } from '../utils/formatters';
import { StockBadge } from '../components/common/StockBadge';
import { downloadCSV } from '../utils/exportImport';
import {
  Package,
  Search,
  AlertTriangle,
  Sliders,
  History,
  Download,
  Plus,
  Minus,
  CheckCircle2,
  X,
  FileCheck2,
  Layers,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface InventoryPageProps {
  products: Product[];
  categories: ProductCategory[];
  movements: InventoryMovement[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  onAdjustStock: (params: {
    productId: string;
    newPhysicalStockBaseUnits: number;
    movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS';
    reason: string;
    notes?: string;
  }) => void;
  onNavigateToStockCount: () => void;
  onQuickRestock: (productId: string) => void;
  preselectedAdjustProductId?: string;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  products,
  categories,
  movements,
  settings,
  currentUser,
  onAdjustStock,
  onNavigateToStockCount,
  onQuickRestock,
  preselectedAdjustProductId,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(!!preselectedAdjustProductId);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(() => {
    if (preselectedAdjustProductId) {
      return products.find((p) => p.id === preselectedAdjustProductId) || null;
    }
    return null;
  });
  const [newStockInput, setNewStockInput] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS'>('ADJUSTMENT_IN');
  const [adjustReason, setAdjustReason] = useState('Physical stock reconciliation');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Active products
  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  // Filtered inventory list
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return activeProducts.filter((p) => {
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      if (stockFilter === 'low' && (p.current_stock <= 0 || p.current_stock > p.min_stock_level)) return false;
      if (stockFilter === 'out' && p.current_stock > 0) return false;

      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term)
      );
    });
  }, [activeProducts, categoryFilter, stockFilter, searchTerm]);

  // Inventory Totals
  const totalBaseUnits = activeProducts.reduce((sum, p) => sum + p.current_stock, 0);
  const totalCostValuation = activeProducts.reduce(
    (sum, p) => sum + p.current_stock * p.cost_price_per_base_unit,
    0
  );
  const totalRetailValuation = activeProducts.reduce(
    (sum, p) => sum + p.current_stock * p.selling_price_per_base_unit,
    0
  );

  const lowStockList = activeProducts.filter(
    (p) => p.current_stock > 0 && p.current_stock <= p.min_stock_level
  );
  const outOfStockList = activeProducts.filter((p) => p.current_stock <= 0);

  // Open adjust modal
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setNewStockInput(String(product.current_stock));
    setAdjustType('ADJUSTMENT_IN');
    setAdjustReason('Physical stock audit adjustment');
    setAdjustNotes('');
    setAdjustModalOpen(true);
  };

  // Submit adjustment
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;

    const newStock = parseFloat(newStockInput);
    if (isNaN(newStock) || newStock < 0) {
      alert('Please enter a valid non-negative physical stock quantity.');
      return;
    }

    try {
      onAdjustStock({
        productId: selectedProductForAdjust.id,
        newPhysicalStockBaseUnits: newStock,
        movementType: adjustType,
        reason: adjustReason,
        notes: adjustNotes || undefined,
      });
      setAdjustModalOpen(false);
      setSelectedProductForAdjust(null);
    } catch (err: any) {
      alert(err?.message || 'Error adjusting stock.');
    }
  };

  // Export inventory CSV
  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Feed Product',
      'Category',
      'Stock (Base Units)',
      'Human Packaging Format',
      'Min Stock Level',
      'Cost Valuation (KSh)',
      'Retail Valuation (KSh)',
      'Status',
    ];

    const rows = activeProducts.map((p) => {
      const formatted = formatStockDisplay(p);
      const cat = categories.find((c) => c.id === p.category_id)?.name || 'General';
      const isOut = p.current_stock <= 0;
      const isLow = !isOut && p.current_stock <= p.min_stock_level;

      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat}"`,
        p.current_stock,
        `"${formatted.primary}"`,
        p.min_stock_level,
        p.current_stock * p.cost_price_per_base_unit,
        p.current_stock * p.selling_price_per_base_unit,
        isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK',
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`pasture_feeds_inventory_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const isStaff = currentUser.role === 'STAFF';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Stock Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time tracking of bulk bags, loose kilograms, adjustments, and re-order thresholds
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Inventory</span>
          </button>

          {!isStaff && (
            <button
              onClick={onNavigateToStockCount}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <FileCheck2 className="w-4 h-4 text-blue-100" />
              <span>Physical Stock Count</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtabs: Current Inventory vs Movement History */}
      <div className="flex items-center gap-2 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock Balances</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-mono font-normal">
            {activeProducts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement History (Audit Trail)</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-mono font-normal">
            {movements.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CURRENT INVENTORY BALANCES */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Valuation Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Physical Stock
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {formatNumber(totalBaseUnits, 0)} KG
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Across {activeProducts.length} active feeds</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cost Valuation
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency(totalCostValuation, settings.currency_symbol)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">At wholesale cost purchase price</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Retail Potential
              </span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {formatCurrency(totalRetailValuation, settings.currency_symbol)}
              </div>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                +{formatCurrency(totalRetailValuation - totalCostValuation, settings.currency_symbol)} margin
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Re-order Alerts
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono mt-1">
                {lowStockList.length + outOfStockList.length} Items
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                {lowStockList.length} low stock • {outOfStockList.length} out of stock
              </p>
            </div>
          </div>

          {/* Low Stock Warning Banner if any */}
          {(lowStockList.length > 0 || outOfStockList.length > 0) && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Feeds Requiring Restocking Alert</span>
                </div>
                <span className="text-xs text-amber-700 font-medium">
                  {lowStockList.length + outOfStockList.length} product(s) below safety threshold
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[...outOfStockList, ...lowStockList].slice(0, 6).map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-xs shadow-xs"
                  >
                    <span className="font-semibold text-slate-900">{prod.name}</span>
                    <span className="font-mono font-bold text-amber-700">
                      ({prod.current_stock} {prod.base_unit})
                    </span>
                    {!isStaff && (
                      <button
                        onClick={() => onQuickRestock(prod.id)}
                        className="text-blue-600 font-semibold hover:underline ml-1"
                      >
                        + Restock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory by feed name, SKU..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full md:w-40 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 outline-none"
            >
              <option value="all">All Stock Status</option>
              <option value="low">Low Stock ({lowStockList.length})</option>
              <option value="out">Out of Stock ({outOfStockList.length})</option>
            </select>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Feed Product & SKU</th>
                    <th className="py-3 px-4">Physical Stock Breakdown</th>
                    <th className="py-3 px-4">Min Stock (Re-order)</th>
                    <th className="py-3 px-4">Valuation (Cost / Retail)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const formatted = formatStockDisplay(product);
                    const costVal = product.current_stock * product.cost_price_per_base_unit;
                    const retailVal = product.current_stock * product.selling_price_per_base_unit;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                            {product.sku}
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                          <div className="text-[11px] text-slate-500">{product.brand || 'Pasture Feeds'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{formatted.primary}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatted.subtext}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {product.min_stock_level} {product.base_unit}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-900">
                            {formatCurrency(costVal, settings.currency_symbol)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Retail: {formatCurrency(retailVal, settings.currency_symbol)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <StockBadge product={product} />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isStaff && (
                              <button
                                onClick={() => handleOpenAdjustModal(product)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Perform quick stock adjustment"
                              >
                                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                                <span>Adjust</span>
                              </button>
                            )}

                            {!isStaff && (
                              <button
                                onClick={() => onQuickRestock(product.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                + Restock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No feeds matching this inventory filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MOVEMENT AUDIT TRAIL */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Stock Movements Log</h3>
              <p className="text-xs text-slate-500">Every bag sold, restocked, or adjusted</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity (Base Units)</th>
                  <th className="py-3 px-4">Prev → New Stock</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {movements.map((mov) => {
                  const isPositive = mov.quantity_base_units > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {mov.product_name}
                        {mov.package_name && (
                          <span className="text-[11px] text-slate-400 block font-normal">
                            {mov.package_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            mov.movement_type === 'SALE'
                              ? 'bg-blue-50 text-blue-700'
                              : mov.movement_type === 'PURCHASE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : mov.movement_type === 'CUSTOMER_RETURN'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {mov.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                          {isPositive ? '+' : ''}
                          {mov.quantity_base_units} {mov.base_unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {mov.previous_stock} → {mov.new_stock} {mov.base_unit}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">
                        {mov.reference_number || '-'}
                        {mov.notes && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-xs font-sans">
                            {mov.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">{mov.created_by}</td>
                    </tr>
                  );
                })}

                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Adjust Physical Stock</h3>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedProductForAdjust.name}
                </div>
                <div className="text-slate-500 mt-1 flex justify-between font-mono">
                  <span>Current System Stock:</span>
                  <span className="font-bold text-slate-800">
                    {selectedProductForAdjust.current_stock} {selectedProductForAdjust.base_unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="ADJUSTMENT_IN">Stock In (Found / Physical Count Surplus)</option>
                  <option value="ADJUSTMENT_OUT">Stock Out (Discrepancy / Recount Deficit)</option>
                  <option value="DAMAGE">Damaged / Torn Bag / Spoiled</option>
                  <option value="LOSS">Shrinkage / Theft / Expired</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  New Physical Stock ({selectedProductForAdjust.base_unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0"
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-base focus:border-emerald-600 outline-none"
                />
                {newStockInput !== '' && (
                  <div className="mt-1 text-[11px] font-mono text-slate-500">
                    Difference:{' '}
                    <span
                      className={
                        parseFloat(newStockInput) - selectedProductForAdjust.current_stock > 0
                          ? 'text-emerald-700 font-bold'
                          : 'text-rose-600 font-bold'
                      }
                    >
                      {parseFloat(newStockInput) - selectedProductForAdjust.current_stock > 0 ? '+' : ''}
                      {parseFloat(newStockInput) - selectedProductForAdjust.current_stock}{' '}
                      {selectedProductForAdjust.base_unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical stock count check"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
