import React, { useState, useEffect } from 'react';
import {
  Purchase,
  Supplier,
  Product,
  BusinessSettings,
  UserProfile,
} from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportPurchasesCSV } from '../utils/exportImport';
import {
  Truck,
  Plus,
  Search,
  Download,
  Calendar,
  X,
  Trash2,
  Package,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PurchasesPageProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  products: Product[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  preselectedProductId?: string;
  onCreatePurchase: (params: {
    supplierId: string;
    invoiceNumber: string;
    purchaseDate?: string;
    notes?: string;
    items: Array<{
      productId: string;
      packageId?: string;
      packageName: string;
      quantity: number;
      quantityBaseUnits: number;
      costPrice: number;
    }>;
  }) => Purchase;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchases,
  suppliers,
  products,
  settings,
  currentUser,
  preselectedProductId,
  onCreatePurchase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // New Purchase Modal
  const [modalOpen, setModalOpen] = useState(!!preselectedProductId);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(
    'INV-PO-' + Math.floor(1000 + Math.random() * 9000)
  );
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Items in new purchase
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{
      productId: string;
      packageId?: string;
      packageName: string;
      quantity: number;
      sizeInBaseUnits: number;
      costPrice: number;
    }>
  >(() => {
    if (preselectedProductId) {
      const prod = products.find((p) => p.id === preselectedProductId);
      if (prod) {
        const defaultPkg = prod.packages[0];
        return [
          {
            productId: prod.id,
            packageId: defaultPkg?.id,
            packageName: defaultPkg?.package_name || '50 KG Bag',
            quantity: 10,
            sizeInBaseUnits: defaultPkg?.size_in_base_units || 50,
            costPrice: defaultPkg?.cost_price || prod.cost_price_per_base_unit * 50,
          },
        ];
      }
    }
    const firstProd = products[0];
    const defaultPkg = firstProd?.packages[0];
    return [
      {
        productId: firstProd?.id || '',
        packageId: defaultPkg?.id,
        packageName: defaultPkg?.package_name || '50 KG Bag',
        quantity: 20,
        sizeInBaseUnits: defaultPkg?.size_in_base_units || 50,
        costPrice: defaultPkg?.cost_price || 2000,
      },
    ];
  });

  const filteredPurchases = purchases.filter((p) => {
    if (supplierFilter !== 'ALL' && p.supplier_id !== supplierFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.invoice_number.toLowerCase().includes(term) ||
      p.supplier_name.toLowerCase().includes(term) ||
      p.created_by.toLowerCase().includes(term)
    );
  });

  // Add line item in new purchase
  const handleAddLineItem = () => {
    const prod = products[0];
    const pkg = prod?.packages[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: prod?.id || '',
        packageId: pkg?.id,
        packageName: pkg?.package_name || '50 KG Bag',
        quantity: 10,
        sizeInBaseUnits: pkg?.size_in_base_units || 50,
        costPrice: pkg?.cost_price || 2000,
      },
    ]);
  };

  // Handle line item product change
  const handleProductChange = (index: number, newProdId: string) => {
    const prod = products.find((p) => p.id === newProdId);
    if (!prod) return;
    const pkg = prod.packages[0];

    const updated = [...purchaseItems];
    updated[index] = {
      productId: prod.id,
      packageId: pkg?.id,
      packageName: pkg?.package_name || `${prod.base_unit} Unit`,
      quantity: 10,
      sizeInBaseUnits: pkg?.size_in_base_units || 1,
      costPrice: pkg?.cost_price || prod.cost_price_per_base_unit * (pkg?.size_in_base_units || 1),
    };
    setPurchaseItems(updated);
  };

  // Submit Purchase
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'STAFF') {
      alert('Permission denied. Cashiers cannot record supplier restocks.');
      return;
    }

    if (purchaseItems.length === 0) {
      alert('Please add at least one feed product to restock.');
      return;
    }

    try {
      onCreatePurchase({
        supplierId: selectedSupplierId,
        invoiceNumber,
        purchaseDate,
        notes: purchaseNotes || undefined,
        items: purchaseItems.map((item) => ({
          productId: item.productId,
          packageId: item.packageId,
          packageName: item.packageName,
          quantity: item.quantity,
          quantityBaseUnits: item.quantity * item.sizeInBaseUnits,
          costPrice: item.costPrice,
        })),
      });

      alert(`Restock purchase ${invoiceNumber} saved! Inventory increased.`);
      setModalOpen(false);
      setInvoiceNumber('INV-PO-' + Math.floor(1000 + Math.random() * 9000));
      setPurchaseNotes('');
    } catch (err: any) {
      alert(err?.message || 'Error recording restock');
    }
  };

  const isStaff = currentUser.role === 'STAFF';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Supplier Purchases & Restock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record feed delivery notes, stock acquisitions, and miller purchase invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPurchasesCSV(filteredPurchases)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {!isStaff && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Restock</span>
            </button>
          )}
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
            placeholder="Search by invoice number, supplier name, or recorder..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="w-full md:w-56 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Invoice / Delivery #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Items Received</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((purchase) => {
                const isExpanded = expandedPurchaseId === purchase.id;

                return (
                  <React.Fragment key={purchase.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        {purchase.invoice_number}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(purchase.purchase_date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{purchase.supplier_name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {purchase.items.length} line item{purchase.items.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-slate-400 text-[11px] block font-mono">
                          (
                          {purchase.items.reduce((sum, i) => sum + i.quantity_base_units, 0)}{' '}
                          KG total)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900">
                        {formatCurrency(purchase.total_cost, settings.currency_symbol)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">{purchase.created_by}</td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setExpandedPurchaseId(isExpanded ? null : purchase.id)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'View'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="py-3 px-6">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 max-w-2xl space-y-2 text-xs">
                            <div className="font-bold text-slate-800">
                              Received Stock Items ({purchase.invoice_number}):
                            </div>
                            <div className="divide-y divide-slate-100">
                              {purchase.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="py-1.5 flex justify-between items-center text-slate-700"
                                >
                                  <div>
                                    <span className="font-semibold">{item.product_name}</span>
                                    <span className="text-[11px] text-slate-400 ml-1">
                                      ({item.quantity} × {item.package_name})
                                    </span>
                                  </div>
                                  <div className="font-mono font-bold text-slate-900">
                                    {formatCurrency(item.line_total, settings.currency_symbol)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {purchase.notes && (
                              <div className="pt-2 border-t border-slate-100 text-slate-500 italic">
                                Note: {purchase.notes}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No supplier purchase records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Restock Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Record Stock Restock / Purchase</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="mt-4 space-y-4 text-xs">
              {/* Supplier & Invoice info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Invoice / Delivery # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase">Items to Restock:</span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Line</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {purchaseItems.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const lineTotal = item.quantity * item.costPrice;

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="col-span-5">
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            {products
                              .filter((p) => p.active)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                            Packaging
                          </label>
                          <select
                            value={item.packageId || ''}
                            onChange={(e) => {
                              const pkg = prod?.packages.find((p) => p.id === e.target.value);
                              if (pkg) {
                                const updated = [...purchaseItems];
                                updated[idx] = {
                                  ...updated[idx],
                                  packageId: pkg.id,
                                  packageName: pkg.package_name,
                                  sizeInBaseUnits: pkg.size_in_base_units,
                                  costPrice: pkg.cost_price || (prod?.cost_price_per_base_unit || 40) * pkg.size_in_base_units,
                                };
                                setPurchaseItems(updated);
                              }
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            {prod?.packages.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.package_name} ({pkg.size_in_base_units} {prod.base_unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                            Qty (Bags)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx] = {
                                ...updated[idx],
                                quantity: Math.max(1, parseInt(e.target.value) || 1),
                              };
                              setPurchaseItems(updated);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                            Unit Cost (KSh)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.costPrice}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx] = {
                                ...updated[idx],
                                costPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              };
                              setPurchaseItems(updated);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-12 flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-500">
                            Base Units Added:{' '}
                            <strong className="text-slate-800">
                              {item.quantity * item.sizeInBaseUnits} {prod?.base_unit || 'KG'}
                            </strong>
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">
                              Line Total: {formatCurrency(lineTotal, settings.currency_symbol)}
                            </span>
                            {purchaseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex justify-between items-center font-bold">
                <span className="text-blue-950 uppercase tracking-wider text-xs">
                  Grand Purchase Total:
                </span>
                <span className="font-mono text-base text-blue-900">
                  {formatCurrency(
                    purchaseItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0),
                    settings.currency_symbol
                  )}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Notes / Lorry #</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Delivered by driver John KBZ 123A"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save & Update Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
