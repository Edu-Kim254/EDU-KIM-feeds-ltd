import React, { useState, useRef } from 'react';
import { Sale, BusinessSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose,
}) => {
  const [thermalMode, setThermalMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const isVoided = sale.status === 'VOIDED';

  const handlePrint = () => {
    window.print();
  };

  const generateReceiptText = () => {
    const lines = [
      `*${settings.shop_name.toUpperCase()}*`,
      settings.tagline || 'Animal Feeds & Farm Supplies',
      settings.location ? `Location: ${settings.location}` : '',
      settings.phone ? `Tel: ${settings.phone}` : '',
      '--------------------------------',
      `Receipt No: ${sale.receipt_number}`,
      `Date/Time: ${formatDateTime(sale.created_at)}`,
      `Cashier: ${sale.created_by || 'Admin'}`,
      `Customer: ${sale.customer_name || 'Walk-in'}`,
      sale.customer_phone ? `Phone: ${sale.customer_phone}` : '',
      '--------------------------------',
      'ITEMS PURCHASED:',
      ...sale.items.map(
        (item) =>
          `• ${item.product_name} (${item.package_name})\n  ${item.quantity} x ${formatCurrency(item.unit_price, settings.currency_symbol)} = ${formatCurrency(item.line_total, settings.currency_symbol)}`
      ),
      '--------------------------------',
      sale.discount > 0 ? `Subtotal: ${formatCurrency(sale.subtotal, settings.currency_symbol)}` : '',
      sale.discount > 0 ? `Discount: -${formatCurrency(sale.discount, settings.currency_symbol)}` : '',
      `*TOTAL AMOUNT: ${formatCurrency(sale.total, settings.currency_symbol)}*`,
      `Paid via: ${sale.payment_method.replace('_', ' ')}`,
      sale.payment_method === 'ON_CREDIT'
        ? `Balance Due: ${formatCurrency(Math.max(0, sale.total - (sale.amount_paid ?? 0)), settings.currency_symbol)}`
        : '',
      '--------------------------------',
      settings.receipt_footer || 'Thank you for your business!',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateReceiptText());
    let phone = (sale.customer_phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '254' + phone.substring(1);
    } else if (phone.startsWith('7') || phone.startsWith('1')) {
      phone = '254' + phone;
    }
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Receipt Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setThermalMode(!thermalMode)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {thermalMode ? 'Switch to Standard A4' : 'Switch to Thermal (80mm)'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            {isVoided ? (
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                <AlertOctagon className="w-3.5 h-3.5" /> Voided Receipt
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Receipt
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              title="Copy receipt text to clipboard (for SMS)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Text
                </>
              )}
            </button>

            <button
              onClick={handleWhatsAppShare}
              title="Send formatted receipt via WhatsApp"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </button>

            <button
              onClick={handlePrint}
              title="Print on thermal or office printer (or Save as PDF)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto flex justify-center">
          <div
            ref={receiptRef}
            id="printable-receipt"
            className={`bg-white p-6 shadow-sm border border-slate-200 text-slate-900 ${
              thermalMode ? 'w-[320px] font-mono text-xs' : 'w-full text-sm'
            }`}
          >
            {/* Business Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-base tracking-tight uppercase">{settings.shop_name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{settings.tagline}</p>
              <p className="text-xs text-slate-600">{settings.location}</p>
              <p className="text-xs text-slate-600">Tel: {settings.phone}</p>
              {settings.email && <p className="text-xs text-slate-600">{settings.email}</p>}
            </div>

            {/* Void Notice */}
            {isVoided && (
              <div className="my-3 p-2 bg-rose-50 border border-rose-300 text-rose-700 text-center font-bold text-xs uppercase tracking-widest rounded">
                *** VOIDED / CANCELLED ***
                <div className="text-[10px] font-normal normal-case mt-0.5">
                  Reason: {sale.void_reason}
                </div>
              </div>
            )}

            {/* Receipt Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold font-mono">{sale.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{sale.created_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium">{sale.customer_name || 'Walk-in'}</span>
              </div>
              {sale.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{sale.customer_phone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="pb-1 font-semibold">Item & Package</th>
                    <th className="pb-1 text-right font-semibold">Qty</th>
                    <th className="pb-1 text-right font-semibold">Price</th>
                    <th className="pb-1 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.product_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.package_name}</div>
                      </td>
                      <td className="py-1.5 text-right font-medium">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">
                        {item.unit_price.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-bold font-mono">
                        {item.line_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono">{formatCurrency(sale.subtotal, settings.currency_symbol)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(sale.discount, settings.currency_symbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 text-slate-900">
                <span>TOTAL:</span>
                <span className="font-mono text-base text-emerald-800">
                  {formatCurrency(sale.total, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-800 uppercase tracking-wide">
                  {sale.payment_method.replace('_', ' ')}
                </span>
              </div>
              {sale.payment_method === 'ON_CREDIT' && (
                <>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Amount Paid:</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      {formatCurrency(sale.amount_paid ?? 0, settings.currency_symbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-0.5">
                    <span className="text-amber-800">Credit Balance Due:</span>
                    <span className="font-mono text-amber-900">
                      {formatCurrency(
                        Math.max(0, sale.total - (sale.amount_paid ?? 0)),
                        settings.currency_symbol
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-4 space-y-1">
              <p className="font-semibold text-xs text-slate-800">{settings.receipt_footer}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                Goods once sold in good condition are non-returnable without inspection.
              </p>
              <div className="pt-2">
                <div className="inline-block tracking-widest text-slate-300 text-xs font-mono">
                  * {sale.receipt_number} *
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
