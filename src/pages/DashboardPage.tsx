import React, { useState, useMemo } from 'react';
import {
  Product,
  Sale,
  Purchase,
  Expense,
  Customer,
  Supplier,
  BusinessSettings,
  InventoryMovement,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Truck,
  Plus,
  Sliders,
  DollarSign,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface DashboardPageProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  categories?: any[];
  customers?: Customer[];
  suppliers?: Supplier[];
  movements?: InventoryMovement[];
  settings: BusinessSettings;
  currentUser?: any;
  onNavigateToTab?: (tab: string) => void;
  onQuickRestock?: (productId: string) => void;
  onNavigate?: (tab: string, extra?: any) => void;
  onOpenNewSale?: () => void;
  onOpenAddProduct?: () => void;
  onOpenAddPurchase?: () => void;
  onOpenAddExpense?: () => void;
  onOpenStockAdjustment?: () => void;
  onOpenAddCustomer?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  sales,
  purchases,
  expenses,
  customers = [],
  suppliers = [],
  movements = [],
  settings,
  currentUser,
  onNavigateToTab,
  onQuickRestock,
  onNavigate,
  onOpenNewSale,
  onOpenAddProduct,
  onOpenAddPurchase,
  onOpenAddExpense,
  onOpenStockAdjustment,
  onOpenAddCustomer,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year'>('today');

  const navigate = (tab: string, extra?: any) => {
    if (onNavigate) onNavigate(tab, extra);
    else if (onNavigateToTab) onNavigateToTab(tab);
  };
  const handleOpenNewSale = () => {
    if (onOpenNewSale) onOpenNewSale();
    else if (onNavigateToTab) onNavigateToTab('pos');
  };
  const handleOpenAddProduct = () => {
    if (onOpenAddProduct) onOpenAddProduct();
    else if (onNavigateToTab) onNavigateToTab('products');
  };
  const handleOpenAddPurchase = () => {
    if (onOpenAddPurchase) onOpenAddPurchase();
    else if (onNavigateToTab) onNavigateToTab('purchases');
  };
  const handleOpenAddExpense = () => {
    if (onOpenAddExpense) onOpenAddExpense();
    else if (onNavigateToTab) onNavigateToTab('expenses');
  };
  const handleOpenStockAdjustment = () => {
    if (onOpenStockAdjustment) onOpenStockAdjustment();
    else if (onNavigateToTab) onNavigateToTab('inventory');
  };
  const handleOpenAddCustomer = () => {
    if (onOpenAddCustomer) onOpenAddCustomer();
    else if (onNavigateToTab) onNavigateToTab('customers');
  };

  // Filter sales and expenses by selected date range
  const { filteredSales, filteredExpenses, filteredPurchases } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const isInRange = (dateStr: string) => {
      const d = new Date(dateStr);
      if (dateFilter === 'today') return d >= todayStart;
      if (dateFilter === 'yesterday') return d >= yesterdayStart && d < todayStart;
      if (dateFilter === 'week') return d >= weekStart;
      if (dateFilter === 'month') return d >= monthStart;
      if (dateFilter === 'year') return d >= yearStart;
      return true;
    };

    return {
      filteredSales: sales.filter((s) => s.status === 'COMPLETED' && isInRange(s.created_at)),
      filteredExpenses: expenses.filter((e) => isInRange(e.expense_date)),
      filteredPurchases: purchases.filter((p) => isInRange(p.purchase_date)),
    };
  }, [sales, expenses, purchases, dateFilter]);

  // Financial aggregates
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalSalesCount = filteredSales.length;

  let totalItemsSold = 0;
  let estimatedGrossProfit = 0;

  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      totalItemsSold += item.quantity;
      estimatedGrossProfit += item.estimated_profit || (item.line_total - (item.quantity * item.cost_price_per_unit));
    });
  });

  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedNetProfit = estimatedGrossProfit - totalExpensesAmount;

  // Inventory stats
  const activeProducts = products.filter((p) => p.active);
  const totalStockBaseUnits = activeProducts.reduce((sum, p) => sum + p.current_stock, 0);
  const totalStockCostValue = activeProducts.reduce(
    (sum, p) => sum + p.current_stock * p.cost_price_per_base_unit,
    0
  );
  const totalStockRetailValue = activeProducts.reduce(
    (sum, p) => sum + p.current_stock * p.selling_price_per_base_unit,
    0
  );

  const lowStockProducts = activeProducts.filter(
    (p) => p.current_stock > 0 && p.current_stock <= p.min_stock_level
  );
  const outOfStockProducts = activeProducts.filter((p) => p.current_stock <= 0);

  // 7-day sales graph data
  const last7DaysData = useMemo(() => {
    const days: Array<{ label: string; date: string; total: number; count: number }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const daySales = sales.filter((s) => {
        if (s.status !== 'COMPLETED') return false;
        const time = new Date(s.created_at).getTime();
        return time >= dayStart && time < dayEnd;
      });

      const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
      days.push({
        label: d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' }),
        date: d.toISOString(),
        total: dayTotal,
        count: daySales.length,
      });
    }
    return days;
  }, [sales]);

  const max7DayTotal = Math.max(...last7DaysData.map((d) => d.total), 1);

  // Top selling products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales
      .filter((s) => s.status === 'COMPLETED')
      .forEach((s) => {
        s.items.forEach((item) => {
          const existing = map.get(item.product_id) || {
            name: item.product_name,
            quantity: 0,
            revenue: 0,
          };
          map.set(item.product_id, {
            name: item.product_name,
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.line_total,
          });
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header with title, subtitle, and primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Project Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back! Here is your store's live financial and inventory summary.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('reports')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm text-slate-700 transition-colors"
          >
            Share Report
          </button>
          <button
            onClick={handleOpenNewSale}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ New Sale</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Actions Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Quick Actions
          </div>
          {/* Date Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateFilter === filter.id
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={handleOpenNewSale}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-blue-100 shrink-0" />
            <span>+ New Sale</span>
          </button>

          <button
            onClick={handleOpenAddPurchase}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <Truck className="w-4 h-4 text-slate-300 shrink-0" />
            <span>+ Add Purchase</span>
          </button>

          <button
            onClick={handleOpenAddProduct}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-blue-600 shrink-0" />
            <span>+ Add Product</span>
          </button>

          <button
            onClick={handleOpenStockAdjustment}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all active:scale-95"
          >
            <Sliders className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Stock Adjust</span>
          </button>

          <button
            onClick={handleOpenAddExpense}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4 text-rose-600 shrink-0" />
            <span>+ Add Expense</span>
          </button>

          <button
            onClick={handleOpenAddCustomer}
            className="flex items-center justify-center gap-2 p-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all active:scale-95"
          >
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* 3. Primary KPI Metric Cards (Sleek Interface 3-4 column style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
              {totalSalesCount} sales
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {formatCurrency(totalSalesRevenue, settings.currency_symbol)}
            </p>
            <div className="text-xs text-slate-400 mt-1">
              {totalItemsSold} units sold in period
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Estimated
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {formatCurrency(estimatedGrossProfit, settings.currency_symbol)}
            </p>
            <div className="text-xs text-slate-400 mt-1">
              Sales minus historical cost
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              {filteredExpenses.length} entries
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Operating Expenses</p>
            <p className="text-2xl font-bold text-rose-600 font-mono mt-0.5">
              {formatCurrency(totalExpensesAmount, settings.currency_symbol)}
            </p>
            <div className="text-xs text-slate-400 mt-1">
              Shop running & overhead costs
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`p-2.5 rounded-lg ${
                estimatedNetProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {estimatedNetProfit >= 0 ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                estimatedNetProfit >= 0
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-rose-600 bg-rose-50'
              }`}
            >
              Net Margin
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Net Profit</p>
            <p
              className={`text-2xl font-bold font-mono mt-0.5 ${
                estimatedNetProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatCurrency(estimatedNetProfit, settings.currency_symbol)}
            </p>
            <div className="text-xs text-slate-400 mt-1">
              Gross profit minus expenses
            </div>
          </div>
        </div>
      </div>

      {/* 4. Inventory Valuation & Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Stock Value - Sleek Dark Card */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Inventory Valuation</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">
              {formatCurrency(totalStockCostValue, settings.currency_symbol)}
            </p>
            <div className="text-xs text-slate-400 mt-2 flex justify-between">
              <span>Retail: {formatCurrency(totalStockRetailValue, settings.currency_symbol)}</span>
              <span className="text-blue-400 font-semibold">
                +{formatCurrency(totalStockRetailValue - totalStockCostValue, settings.currency_symbol)}
              </span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Total Inventory Base Units */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Physical Stock
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-slate-500 text-sm">Active Feed Stock</p>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {formatNumber(totalStockBaseUnits, 0)} KG
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Across {activeProducts.length} active feed products
            </p>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => navigate('inventory')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 cursor-pointer hover:border-amber-300 transition-colors flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-600 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-slate-500 text-sm">Requires Re-order</p>
            <p className="text-2xl font-bold text-amber-700 font-mono mt-0.5">
              {lowStockProducts.length} Product{lowStockProducts.length === 1 ? '' : 's'}
            </p>
            <div className="text-xs text-amber-600 mt-2 font-medium flex items-center justify-between">
              <span>View low-stock items</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Out of Stock Warning */}
        <div
          onClick={() => navigate('inventory')}
          className={`p-6 rounded-2xl shadow-sm border cursor-pointer transition-colors flex flex-col justify-between ${
            outOfStockProducts.length > 0
              ? 'bg-white border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
            <Package className={`w-4 h-4 ${outOfStockProducts.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-slate-500 text-sm">Critical Shortage</p>
            <p
              className={`text-2xl font-bold font-mono mt-0.5 ${
                outOfStockProducts.length > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {outOfStockProducts.length} Product{outOfStockProducts.length === 1 ? '' : 's'}
            </p>
            <div className="text-xs text-slate-400 mt-2">
              {outOfStockProducts.length > 0
                ? 'Restock immediately'
                : 'All catalog feeds in stock'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. 7-Day Chart & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Bar Graph */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  7-Day Sales Performance
                </h3>
                <p className="text-xs text-slate-500">Daily gross sales revenue ({settings.currency_symbol})</p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Peak: {formatCurrency(max7DayTotal, settings.currency_symbol)}
              </span>
            </div>

            {/* Custom Bar Visualizer */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2">
              {last7DaysData.map((d, index) => {
                const heightPercent = Math.max(8, Math.round((d.total / max7DayTotal) * 100));
                const isToday = index === last7DaysData.length - 1;

                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                      {d.total > 0 ? formatNumber(d.total / 1000, 1) + 'k' : '-'}
                    </div>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isToday
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-slate-100 hover:bg-blue-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${d.label}: ${formatCurrency(d.total, settings.currency_symbol)} (${d.count} sales)`}
                    ></div>
                    <span
                      className={`text-[11px] tracking-tight ${
                        isToday ? 'font-bold text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Aggregated from verified receipt records</span>
            <button
              onClick={() => navigate('reports')}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Full Analytics Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base tracking-tight">Top-Selling Feeds</h3>
              <span className="text-xs text-slate-400 font-mono">By Revenue</span>
            </div>

            {topProducts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No completed sales recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold font-mono flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                    </div>
                    <div className="text-right shrink-0 font-mono font-bold text-slate-900">
                      {formatCurrency(p.revenue, settings.currency_symbol)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('products')}
            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
          >
            Manage Product Catalog
          </button>
        </div>
      </div>

      {/* 6. Recent Activity Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              Recent Transactions & Movements
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest sales processed at checkout</p>
          </div>
          <button
            onClick={() => navigate('sales')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            View All Sales
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {sales.slice(0, 5).map((sale) => (
            <div
              key={sale.id}
              className="p-4 sm:px-6 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    sale.status === 'COMPLETED'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-rose-50 text-rose-600 line-through'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{sale.receipt_number}</span>
                    <span className="text-slate-400 font-normal">• {sale.customer_name}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {formatDate(sale.created_at)} • {sale.items.length} items • Cashier: {sale.created_by}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`font-mono font-bold text-sm ${
                    sale.status === 'COMPLETED' ? 'text-slate-900' : 'text-slate-400 line-through'
                  }`}
                >
                  {formatCurrency(sale.total, settings.currency_symbol)}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    sale.status === 'COMPLETED'
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-rose-700 bg-rose-50'
                  }`}
                >
                  {sale.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
