import React, { useState, useMemo } from 'react';
import { Expense, BusinessSettings, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportExpensesCSV } from '../utils/exportImport';
import {
  Wallet,
  Plus,
  Search,
  Download,
  Calendar,
  X,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

interface ExpensesPageProps {
  expenses: Expense[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  onCreateExpense: (expense: {
    category: Expense['category'];
    description: string;
    amount: number;
    expenseDate?: string;
    notes?: string;
    receiptRef?: string;
  }) => Expense;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses,
  settings,
  currentUser,
  onCreateExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // New expense form
  const [category, setCategory] = useState<Expense['category']>('TRANSPORT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return expenses.filter((e) => {
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        e.description.toLowerCase().includes(term) ||
        (e.receipt_ref && e.receipt_ref.toLowerCase().includes(term)) ||
        e.created_by.toLowerCase().includes(term)
      );
    });
  }, [expenses, categoryFilter, searchTerm]);

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      alert('Description is required.');
      return;
    }

    try {
      onCreateExpense({
        category,
        description: description.trim(),
        amount: val,
        expenseDate,
        receiptRef: receiptRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setModalOpen(false);
      setDescription('');
      setAmount('');
      setReceiptRef('');
      setNotes('');
    } catch (err: any) {
      alert(err?.message || 'Error recording expense');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Operational Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track rent, transport, offloading bags, power, and shop upkeep for accurate net profit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExpensesCSV(filteredExpenses)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Filtered Expenses
          </span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(totalExpenseAmount, settings.currency_symbol)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{filteredExpenses.length} records in view</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by expense description, receipt ref, recorder..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-56 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">All Categories</option>
          <option value="RENT">Shop Rent</option>
          <option value="UTILITIES">Electricity / Water</option>
          <option value="TRANSPORT">Lorry Transport & Fuel</option>
          <option value="PACKAGING">Packaging (Sacks / Polythene)</option>
          <option value="SALARIES">Casual Labour & Offloading</option>
          <option value="MAINTENANCE">Maintenance / Repairs</option>
          <option value="LICENSES">County License / Permits</option>
          <option value="MISCELLANEOUS">Miscellaneous</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount (KSh)</th>
                <th className="py-3 px-4">Receipt Ref</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {formatDate(exp.expense_date)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{exp.description}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-sm text-rose-600">
                    {formatCurrency(exp.amount, settings.currency_symbol)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{exp.receipt_ref || '-'}</td>
                  <td className="py-3.5 px-4 text-right text-slate-600">{exp.created_by}</td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No expenses found matching this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Operational Expense</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="TRANSPORT">Lorry Transport & Fuel</option>
                  <option value="SALARIES">Casual Labour & Offloading Bags</option>
                  <option value="PACKAGING">Packaging (Gunny Bags / Sacks)</option>
                  <option value="RENT">Shop Rent</option>
                  <option value="UTILITIES">Electricity / Water</option>
                  <option value="LICENSES">County License / Permits</option>
                  <option value="MAINTENANCE">Weighing Scale / Shop Repairs</option>
                  <option value="MISCELLANEOUS">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Offloading 200 bags of Unga feeds from trailer"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Amount (KSh) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-base focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Receipt / Voucher #</label>
                  <input
                    type="text"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    placeholder="e.g. VCH-0042"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
