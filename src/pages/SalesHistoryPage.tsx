import React, { useState, useMemo } from 'react';
import { Sale, BusinessSettings, UserProfile } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportSalesCSV } from '../utils/exportImport';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  Ban,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SalesHistoryPageProps {
  sales: Sale[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  onShowReceipt: (sale: Sale) => void;
  onVoidSale: (saleId: string, reason: string) => void;
}

export const SalesHistoryPage: React.FC<SalesHistoryPageProps> = ({
  sales,
  settings,
  currentUser,
  onShowReceipt,
  onVoidSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'VOIDED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Void confirmation modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return sales.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (paymentFilter !== 'ALL' && s.payment_method !== paymentFilter) return false;

      if (!term) return true;
      return (
        s.receipt_number.toLowerCase().includes(term) ||
        s.customer_name.toLowerCase().includes(term) ||
        (s.customer_phone && s.customer_phone.includes(term)) ||
        s.created_by.toLowerCase().includes(term)
      );
    });
  }, [sales, statusFilter, paymentFilter, searchTerm]);

  // Handle Void
  const handleInitiateVoid = (sale: Sale) => {
    if (currentUser.role === 'STAFF') {
      alert('Permission denied. Cashiers cannot void sales. Contact a Manager or Admin.');
      return;
    }
    setSaleToVoid(sale);
    setVoidModalOpen(true);
  };

  const handleConfirmVoid = (reason?: string) => {
    if (!saleToVoid || !reason) return;
    try {
      onVoidSale(saleToVoid.id, reason);
      setVoidModalOpen(false);
      setSaleToVoid(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to void sale');
    }
  };

  const canVoid = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Records & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            View completed transactions, reprint receipts, or process manager returns
          </p>
        </div>

        <button
          onClick={() => exportSalesCSV(filteredSales)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receipt number, customer name, phone, or cashier..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full md:w-40 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed Only</option>
          <option value="VOIDED">Voided Only</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full md:w-44 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">All Payment Types</option>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="ON_CREDIT">On Credit (Tab)</option>
          <option value="OTHER_DIRECT">Other Direct</option>
        </select>
      </div>

      {/* Sales List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Total (KSh)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const isVoided = sale.status === 'VOIDED';
                const isExpanded = expandedSaleId === sale.id;

                return (
                  <React.Fragment key={sale.id}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVoided ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Receipt */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        {sale.receipt_number}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateTime(sale.created_at)}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{sale.customer_name}</div>
                        {sale.customer_phone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sale.customer_phone}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          className="flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                        >
                          <span>
                            {sale.items.length} feed item{sale.items.length === 1 ? '' : 's'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Payment method */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            sale.payment_method === 'ON_CREDIT'
                              ? sale.amount_paid && sale.amount_paid >= sale.total
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.amount_paid && sale.amount_paid > 0
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sale.payment_method.replace('_', ' ')}
                          {sale.payment_method === 'ON_CREDIT' && (
                            <span className="ml-1 text-[9px]">
                              {sale.amount_paid && sale.amount_paid >= sale.total
                                ? '• PAID'
                                : sale.amount_paid && sale.amount_paid > 0
                                ? `• ${formatCurrency(sale.total - sale.amount_paid, settings.currency_symbol)} DUE`
                                : '• UNPAID'}
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <span className={isVoided ? 'text-slate-400 line-through' : 'text-slate-900'}>
                          {formatCurrency(sale.total, settings.currency_symbol)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            <AlertOctagon className="w-3 h-3" /> Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onShowReceipt(sale)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View / Reprint Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isVoided && canVoid && (
                            <button
                              onClick={() => handleInitiateVoid(sale)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Void sale and return stock to inventory"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="py-3 px-6">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 max-w-xl space-y-1.5 text-xs">
                            <div className="font-bold text-slate-800 mb-1">
                              Itemized Breakdown ({sale.receipt_number}):
                            </div>
                            {sale.items.map((i, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-slate-600 py-0.5 border-b border-slate-100 last:border-none"
                              >
                                <span>
                                  {i.quantity} × {i.product_name} ({i.package_name})
                                </span>
                                <span className="font-mono font-semibold text-slate-900">
                                  {formatCurrency(i.line_total, settings.currency_symbol)}
                                </span>
                              </div>
                            ))}
                            {isVoided && (
                              <div className="mt-2 pt-2 border-t border-rose-200 text-rose-700 text-xs">
                                <strong>Voided by:</strong> {sale.voided_by} •{' '}
                                <strong>Reason:</strong> {sale.void_reason}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales matching this search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      <ConfirmModal
        isOpen={voidModalOpen}
        title="Void Completed Sale"
        message={
          saleToVoid
            ? `Are you sure you want to void receipt "${saleToVoid.receipt_number}" for KSh ${saleToVoid.total.toLocaleString()}? This will restore ${
                saleToVoid.items.length
              } item(s) back into stock.`
            : ''
        }
        confirmText="Void Sale & Return Stock"
        isDestructive={true}
        requireReason={true}
        reasonPlaceholder="e.g. Customer returned goods, incorrect item entered by cashier"
        onConfirm={handleConfirmVoid}
        onCancel={() => {
          setVoidModalOpen(false);
          setSaleToVoid(null);
        }}
      />
    </div>
  );
};
