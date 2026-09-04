import React, { useState, useEffect } from 'react';
import { Customer, Sale, BusinessSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
} from 'lucide-react';

interface UnpaidSaleItem {
  sale: Sale;
  paid: number;
  remainingDue: number;
}

interface RecordPaymentModalProps {
  customer: Customer | null;
  settings: BusinessSettings;
  unpaidSales: UnpaidSaleItem[];
  currentBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT';
    reference?: string;
    notes?: string;
    specificSaleId?: string;
  }) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  customer,
  settings,
  unpaidSales,
  currentBalance,
  isOpen,
  onClose,
  onConfirmPayment,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT'>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('AUTO_FIFO');
  const [error, setError] = useState<string | null>(null);

  // Initialize amount with full balance when opened
  useEffect(() => {
    if (isOpen && customer) {
      setAmount(currentBalance > 0 ? String(currentBalance) : '');
      setPaymentMethod('CASH');
      setReference('');
      setNotes('');
      setSelectedSaleId('AUTO_FIFO');
      setError(null);
    }
  }, [isOpen, customer, currentBalance]);

  if (!isOpen || !customer) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, currentBalance - parsedAmount);

  const handleQuickAmount = (val: number) => {
    setAmount(String(Math.round(val)));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    try {
      onConfirmPayment({
        customerId: customer.id,
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        specificSaleId: selectedSaleId === 'AUTO_FIFO' ? undefined : selectedSaleId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Record Customer Payment</h3>
              <p className="text-xs text-slate-300">
                Credit Settlement for <span className="text-white font-semibold">{customer.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-200/70 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Total Outstanding Credit Balance
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-amber-950 mt-0.5">
              {formatCurrency(currentBalance, settings.currency_symbol)}
            </div>
          </div>
          {currentBalance > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/60 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unpaidSales.length} Unpaid {unpaidSales.length === 1 ? 'Sale' : 'Sales'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Balance Cleared</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Allocation Target Selection */}
          {unpaidSales.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Allocate Payment Towards:
              </label>
              <select
                value={selectedSaleId}
                onChange={(e) => {
                  setSelectedSaleId(e.target.value);
                  if (e.target.value !== 'AUTO_FIFO') {
                    const found = unpaidSales.find((u) => u.sale.id === e.target.value);
                    if (found) {
                      setAmount(String(found.remainingDue));
                    }
                  } else {
                    setAmount(String(currentBalance));
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="AUTO_FIFO">
                  Oldest Invoices First (Auto FIFO Settlement) - Total Due: {formatCurrency(currentBalance, settings.currency_symbol)}
                </option>
                {unpaidSales.map((item) => (
                  <option key={item.sale.id} value={item.sale.id}>
                    Invoice #{item.sale.receipt_number} ({formatDate(item.sale.created_at)}) - Due: {formatCurrency(item.remainingDue, settings.currency_symbol)} (Total: {formatCurrency(item.sale.total, settings.currency_symbol)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 uppercase">
                Payment Amount ({settings.currency_symbol}) <span className="text-rose-500">*</span>
              </label>
              {currentBalance > 0 && (
                <span className="text-slate-500 text-[11px]">
                  Max Due: <strong className="font-mono text-slate-800">{formatCurrency(currentBalance, settings.currency_symbol)}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400 text-sm">
                {settings.currency_symbol}
              </span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="Enter amount to pay"
                className="w-full pl-12 pr-4 py-2.5 text-base font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"
              />
            </div>

            {/* Quick Amount Shortcuts */}
            {currentBalance > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(currentBalance)}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition-colors"
                >
                  Pay Full ({formatCurrency(currentBalance, settings.currency_symbol)})
                </button>
                {currentBalance > 100 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(currentBalance / 2)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    50% ({formatCurrency(Math.round(currentBalance / 2), settings.currency_symbol)})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className={`w-4 h-4 mb-1 ${paymentMethod === 'CASH' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('OTHER_DIRECT')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  paymentMethod === 'OTHER_DIRECT'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className={`w-4 h-4 mb-1 ${paymentMethod === 'OTHER_DIRECT' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>M-Pesa / Mobile</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className={`w-4 h-4 mb-1 ${paymentMethod === 'BANK_TRANSFER' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Bank / EFT</span>
              </button>
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Reference / Receipt / Tx ID
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. M-Pesa QHJ9981 / Slip #12"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Notes / Memo
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in cash at front desk"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Live Calculation Preview */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Starting Credit Balance:</span>
              <span>{formatCurrency(currentBalance, settings.currency_symbol)}</span>
            </div>
            <div className="flex items-center justify-between text-blue-700 font-bold text-[11px]">
              <span>Payment Being Applied:</span>
              <span>- {formatCurrency(parsedAmount, settings.currency_symbol)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900 text-xs">
              <span>Remaining Balance After Payment:</span>
              <span className={newBalance === 0 ? 'text-emerald-700' : 'text-amber-800'}>
                {newBalance === 0 ? '0.00 (Fully Paid)' : formatCurrency(newBalance, settings.currency_symbol)}
              </span>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedAmount <= 0}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Confirm & Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
