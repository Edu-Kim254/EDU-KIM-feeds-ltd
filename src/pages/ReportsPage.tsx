import React, { useState, useMemo } from 'react';
import {
  Sale,
  Purchase,
  Expense,
  Product,
  ProductCategory,
  BusinessSettings,
} from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { downloadCSV } from '../utils/exportImport';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  PieChart,
} from 'lucide-react';

interface ReportsPageProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  categories: ProductCategory[];
  settings: BusinessSettings;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  sales,
  purchases,
  expenses,
  products,
  categories,
  settings,
}) => {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');

  // Filter sales, purchases, expenses by date range
  const now = new Date();
  const filterByDate = (dateStr: string) => {
    if (dateRange === 'all') return true;
    const itemDate = new Date(dateStr);
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
    if (dateRange === 'today') return diffDays <= 1;
    if (dateRange === '7days') return diffDays <= 7;
    if (dateRange === '30days') return diffDays <= 30;
    return true;
  };

  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETED' && filterByDate(s.created_at)),
    [sales, dateRange]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => filterByDate(e.expense_date)),
    [expenses, dateRange]
  );

  // Financial Calculations
  const grossRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);

  // Compute Cost of Goods Sold (COGS) for sales
  const cogs = useMemo(() => {
    let totalCost = 0;
    completedSales.forEach((s) => {
      s.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        const costPerKg = prod?.cost_price_per_base_unit || 40;
        totalCost += item.quantity_base_units * costPerKg;
      });
    });
    return totalCost;
  }, [completedSales, products]);

  const grossProfit = grossRevenue - cogs;
  const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalOperatingExpenses;
  const profitMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // Product sales aggregation
  const productPerformance = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        categoryName: string;
        totalKg: number;
        revenue: number;
        count: number;
      }
    > = {};

    completedSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.product_id]) {
          const prod = products.find((p) => p.id === item.product_id);
          const cat = categories.find((c) => c.id === prod?.category_id);
          map[item.product_id] = {
            name: item.product_name,
            categoryName: cat?.name || 'Feed',
            totalKg: 0,
            revenue: 0,
            count: 0,
          };
        }
        map[item.product_id].totalKg += item.quantity_base_units;
        map[item.product_id].revenue += item.line_total;
        map[item.product_id].count += item.quantity;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [completedSales, products, categories]);

  // Category sales aggregation
  const categoryPerformance = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; kg: number }> = {};
    productPerformance.forEach((p) => {
      if (!map[p.categoryName]) {
        map[p.categoryName] = { name: p.categoryName, revenue: 0, kg: 0 };
      }
      map[p.categoryName].revenue += p.revenue;
      map[p.categoryName].kg += p.totalKg;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [productPerformance]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      CASH: 0,
      BANK_TRANSFER: 0,
      ON_CREDIT: 0,
      OTHER_DIRECT: 0,
    };
    completedSales.forEach((s) => {
      map[s.payment_method] = (map[s.payment_method] || 0) + s.total;
    });
    return map;
  }, [completedSales]);

  // Export Financial Summary CSV
  const handleExportFinancialReport = () => {
    const rows = [
      ['PASTURE FEEDS SHOP - FINANCIAL PERFORMANCE REPORT'],
      [`Period: ${dateRange.toUpperCase()}`],
      [`Generated at: ${new Date().toLocaleString()}`],
      [''],
      ['FINANCIAL SUMMARY', 'AMOUNT (KSh)'],
      ['Gross Sales Revenue', grossRevenue],
      ['Cost of Goods Sold (COGS)', cogs],
      ['Gross Operating Profit', grossProfit],
      ['Total Operating Expenses', totalOperatingExpenses],
      ['Net Shop Profit', netProfit],
      ['Net Profit Margin (%)', profitMarginPercent.toFixed(2) + '%'],
      [''],
      ['TOP PRODUCTS PERFORMANCE'],
      ['Product Name', 'Category', 'Total Volume Sold (KG)', 'Gross Revenue (KSh)'],
      ...productPerformance.map((p) => [`"${p.name}"`, `"${p.categoryName}"`, p.totalKg, p.revenue]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    downloadCSV(`pasture_feeds_financial_report_${dateRange}.csv`, csvContent);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial & Sales Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Profit & Loss, Cost of Goods, Feed turnover, and category margin analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            {(['today', '7days', '30days', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRange === range
                    ? 'bg-white text-blue-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'today'
                  ? 'Today'
                  : range === '7days'
                  ? '7 Days'
                  : range === '30days'
                  ? '30 Days'
                  : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportFinancialReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* P&L Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            1. Gross Revenue
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(grossRevenue, settings.currency_symbol)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{completedSales.length} sales receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            2. Cost of Goods (COGS)
          </span>
          <div className="text-2xl font-black text-slate-700 font-mono mt-1">
            {formatCurrency(cogs, settings.currency_symbol)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Wholesale feed stock cost</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            3. Gross Profit
          </span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">
            {formatCurrency(grossProfit, settings.currency_symbol)}
          </div>
          <p className="text-xs text-blue-600 font-semibold mt-0.5">Revenue - COGS</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            4. Operating Expenses
          </span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(totalOperatingExpenses, settings.currency_symbol)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Rent, labour, transport</p>
        </div>

        <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-sm border border-blue-700">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
            5. Net Shop Profit
          </span>
          <div className="text-2xl font-black font-mono mt-1">
            {formatCurrency(netProfit, settings.currency_symbol)}
          </div>
          <p className="text-xs text-blue-100 mt-0.5 font-medium">
            {profitMarginPercent.toFixed(1)}% net margin
          </p>
        </div>
      </div>

      {/* Two Column Section: Category performance & Payment channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Feed Category Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400">By sales volume</span>
          </div>

          <div className="mt-4 space-y-3">
            {categoryPerformance.map((cat, idx) => {
              const pct = grossRevenue > 0 ? (cat.revenue / grossRevenue) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat.name}</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(cat.revenue, settings.currency_symbol)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Total Volume: {formatNumber(cat.kg, 0)} KG sold
                  </div>
                </div>
              );
            })}

            {categoryPerformance.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No category transactions in this period.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Payment Channel Split</h3>
            </div>
            <span className="text-xs text-slate-400">Total KSh</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Cash at Counter</span>
              <div className="font-mono font-bold text-lg text-slate-900 mt-1">
                {formatCurrency(paymentBreakdown.CASH || 0, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-800 uppercase">Bank Transfer</span>
              <div className="font-mono font-bold text-lg text-blue-950 mt-1">
                {formatCurrency(paymentBreakdown.BANK_TRANSFER || 0, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase">On Credit (Farmer Tab)</span>
              <div className="font-mono font-bold text-lg text-slate-900 mt-1">
                {formatCurrency(paymentBreakdown.ON_CREDIT || 0, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700 uppercase">Other Direct</span>
              <div className="font-mono font-bold text-lg text-slate-900 mt-1">
                {formatCurrency(paymentBreakdown.OTHER_DIRECT || 0, settings.currency_symbol)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Feed Products Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Top Feed Products by Sales</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {productPerformance.length} products sold
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Feed Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Total Sold (KG)</th>
                <th className="py-3 px-4">Order Frequency</th>
                <th className="py-3 px-4 text-right">Gross Revenue (KSh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productPerformance.map((prod, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-sm">{prod.name}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {prod.categoryName}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {formatNumber(prod.totalKg, 0)} KG
                  </td>
                  <td className="py-3 px-4 text-slate-600">{prod.count} units</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900">
                    {formatCurrency(prod.revenue, settings.currency_symbol)}
                  </td>
                </tr>
              ))}

              {productPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No sales recorded in selected timeframe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
