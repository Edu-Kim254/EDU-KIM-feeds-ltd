import React from 'react';
import { CustomerPayment, BusinessSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { CheckCircle2, Printer, X, FileText, ArrowDownRight } from 'lucide-react';

interface PaymentVoucherModalProps {
  payment: CustomerPayment | null;
  remainingBalance: number;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({
  payment,
  remainingBalance,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Payment Recorded Successfully</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action button (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 print:hidden text-xs">
          <span className="text-slate-500 font-medium">Official Payment Voucher</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </button>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-6 text-slate-800 space-y-4 text-xs">
          {/* Business Header */}
          <div className="text-center pb-3 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {settings.store_name}
            </h2>
            <div className="text-[11px] text-slate-500">{settings.tagline}</div>
            <div className="text-[11px] text-slate-500">{settings.address} • {settings.phone}</div>
            <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-bold text-[10px] uppercase tracking-wider">
              Official Credit Settlement Receipt
            </div>
          </div>

          {/* Payment Meta */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Voucher No.</div>
              <div className="font-mono font-bold text-slate-900">{payment.payment_number}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Date & Time</div>
              <div className="font-mono text-slate-700">{formatDateTime(payment.created_at)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Customer</div>
              <div className="font-bold text-slate-900">{payment.customer_name}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Received By</div>
              <div className="font-semibold text-slate-700">{payment.created_by}</div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Amount Paid & Credited
            </div>
            <div className="font-mono text-2xl font-black text-emerald-950 mt-1">
              {formatCurrency(payment.amount, settings.currency_symbol)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Method: <strong className="uppercase">{payment.payment_method.replace('_', ' ')}</strong>
              {payment.reference && <span> • Ref: {payment.reference}</span>}
            </div>
          </div>

          {/* Applied Sales Breakdown */}
          {payment.applied_sales && payment.applied_sales.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-slate-500" />
                <span>Invoices Settled by this Payment</span>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">Invoice #</th>
                      <th className="py-1.5 px-3 text-right">Applied Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.applied_sales.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-mono font-medium text-slate-800">
                          {item.receipt_number}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.amount_applied, settings.currency_symbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payment.notes && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
              <span className="font-bold text-slate-700">Notes: </span>
              {payment.notes}
            </div>
          )}

          {/* Remaining Balance Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between font-mono">
            <span className="text-slate-600 text-[11px]">Remaining Outstanding Balance:</span>
            <span
              className={`font-black text-sm ${
                remainingBalance <= 0 ? 'text-emerald-700' : 'text-amber-800'
              }`}
            >
              {remainingBalance <= 0
                ? 'KSh 0.00 (Cleared)'
                : formatCurrency(remainingBalance, settings.currency_symbol)}
            </span>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 print:pt-4">
            Thank you for doing business with {settings.store_name}.
          </div>
        </div>

        {/* Modal Close Button (hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
