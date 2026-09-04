import React, { useState, useMemo } from 'react';
import {
  Product,
  ProductCategory,
  ProductPackage,
  Customer,
  BusinessSettings,
  Sale,
} from '../types';
import { formatCurrency, formatStockDisplay } from '../utils/formatters';
import { StockBadge } from '../components/common/StockBadge';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  CreditCard,
  Banknote,
  FileText,
} from 'lucide-react';

interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  packageId: string;
  packageName: string;
  sizeInBaseUnits: number;
  baseUnit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  maxAvailableBaseUnits: number;
}

interface POSPageProps {
  products: Product[];
  categories: ProductCategory[];
  customers: Customer[];
  settings: BusinessSettings;
  onCompleteSale: (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: Array<{
      productId: string;
      packageId: string;
      quantity: number;
      unitPrice: number;
    }>;
    discount?: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'ON_CREDIT' | 'OTHER_DIRECT';
    notes?: string;
  }) => Sale;
  onQuickAddCustomer: (customer: Partial<Customer>) => Customer;
  onShowReceipt: (sale: Sale) => void;
}

export const POSPage: React.FC<POSPageProps> = ({
  products,
  categories,
  customers,
  settings,
  onCompleteSale,
  onQuickAddCustomer,
  onShowReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'ON_CREDIT' | 'OTHER_DIRECT'>('CASH');
  const [saleNotes, setSaleNotes] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLocation, setNewCustLocation] = useState('');

  // Filtered active products
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return activeProducts.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      if (!matchCat) return false;

      if (!term) return true;

      const inName = p.name.toLowerCase().includes(term);
      const inSku = p.sku.toLowerCase().includes(term);
      const inBrand = p.brand?.toLowerCase().includes(term);
      const inBarcode = p.barcode?.toLowerCase().includes(term);
      const inSubcat = p.subcategory?.toLowerCase().includes(term);

      return inName || inSku || inBrand || inBarcode || inSubcat;
    });
  }, [activeProducts, selectedCategory, searchTerm]);

  // Handle adding package to cart
  const handleAddToCart = (product: Product, pkg: ProductPackage) => {
    setErrorMessage('');
    const cartItemId = `${product.id}-${pkg.id}`;

    // Calculate current allocated base units in cart for this product
    const currentAllocated = cart
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.quantity * i.sizeInBaseUnits, 0);

    const neededBaseUnits = pkg.size_in_base_units;
    const willAllocate = currentAllocated + neededBaseUnits;

    if (!settings.allow_negative_stock && willAllocate > product.current_stock) {
      setErrorMessage(
        `Cannot add "${product.name} (${pkg.package_name})": Only ${product.current_stock} ${product.base_unit} in stock.`
      );
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            productId: product.id,
            productName: product.name,
            packageId: pkg.id,
            packageName: pkg.package_name,
            sizeInBaseUnits: pkg.size_in_base_units,
            baseUnit: product.base_unit,
            unitPrice: pkg.selling_price,
            costPrice: pkg.cost_price || (product.cost_price_per_base_unit * pkg.size_in_base_units),
            quantity: 1,
            maxAvailableBaseUnits: product.current_stock,
          },
        ];
      }
    });
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setErrorMessage('');
    setCart((prev) => {
      const item = prev.find((i) => i.cartItemId === cartItemId);
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.cartItemId !== cartItemId);
      }

      // Check stock limit for this product
      if (!settings.allow_negative_stock) {
        const totalOtherAllocated = prev
          .filter((i) => i.productId === item.productId && i.cartItemId !== cartItemId)
          .reduce((sum, i) => sum + i.quantity * i.sizeInBaseUnits, 0);

        const totalProposed = totalOtherAllocated + newQty * item.sizeInBaseUnits;
        if (totalProposed > item.maxAvailableBaseUnits) {
          setErrorMessage(
            `Insufficient stock for "${item.productName}". Maximum available: ${item.maxAvailableBaseUnits} ${item.baseUnit}.`
          );
          return prev;
        }
      }

      return prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i));
    });
  };

  // Remove single item from cart
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  // Barcode scanned
  const handleBarcodeScanned = (scannedCode: string) => {
    const term = scannedCode.trim().toLowerCase();
    const match = activeProducts.find(
      (p) =>
        p.sku.toLowerCase() === term ||
        (p.barcode && p.barcode.toLowerCase() === term)
    );

    if (match) {
      // Find default package or largest package
      const defaultPkg = match.packages.find((p) => p.is_default) || match.packages[0];
      if (defaultPkg) {
        handleAddToCart(match, defaultPkg);
      }
    } else {
      setErrorMessage(`No product found matching barcode/SKU: ${scannedCode}`);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - (discount || 0));

  // Handle Complete Sale
  const handleCompleteSaleSubmit = () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Please add items before checking out.');
      return;
    }

    try {
      let finalCustName = walkInName;
      let finalCustPhone = walkInPhone;

      if (selectedCustomerId) {
        const cust = customers.find((c) => c.id === selectedCustomerId);
        if (cust) {
          finalCustName = cust.name;
          finalCustPhone = cust.phone;
        }
      }

      const createdSale = onCompleteSale({
        customerId: selectedCustomerId || undefined,
        customerName: finalCustName,
        customerPhone: finalCustPhone || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          packageId: i.packageId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discount: discount || 0,
        paymentMethod,
        notes: saleNotes || undefined,
      });

      // Clear cart
      setCart([]);
      setDiscount(0);
      setSaleNotes('');
      setSelectedCustomerId('');
      setWalkInName('Walk-in Customer');
      setWalkInPhone('');
      setErrorMessage('');

      // Open receipt automatically
      onShowReceipt(createdSale);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete sale.');
    }
  };

  // Handle Quick Add Customer submit
  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust = onQuickAddCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      location: newCustLocation.trim(),
    });

    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustLocation('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* LEFT COLUMN: Catalog / Product Picker */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
        {/* Top Controls: Search Bar & Barcode Scan */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feed by name, SKU, brand, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shrink-0 shadow-sm"
            title="Scan barcode with camera or manual scanner"
          >
            <Scan className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>
        </div>

        {/* Category Pills Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Feeds ({activeProducts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Product Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.current_stock <= 0;
            const formattedStock = formatStockDisplay(product);

            return (
              <div
                key={product.id}
                className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        {product.sku}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {product.name}
                      </h4>
                    </div>
                    <StockBadge product={product} size="sm" />
                  </div>

                  {/* Stock display */}
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{formattedStock.primary}</span>
                  </div>
                </div>

                {/* Packaging Buttons Options */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Package Size:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {product.packages
                      .filter((pkg) => pkg.active)
                      .map((pkg) => {
                        const canAfford =
                          settings.allow_negative_stock ||
                          product.current_stock >= pkg.size_in_base_units;

                        return (
                          <button
                            key={pkg.id}
                            disabled={!canAfford}
                            onClick={() => handleAddToCart(product, pkg)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                              canAfford
                                ? 'bg-blue-50 hover:bg-blue-600 text-blue-900 hover:text-white border border-blue-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            <span className="font-medium">{pkg.package_name}</span>
                            <span className="font-mono font-bold">
                              {formatCurrency(pkg.selling_price, settings.currency_symbol)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              No matching feeds or farm inputs found. Try another search.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart & Checkout Pane */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-50 shrink-0 h-full border-t lg:border-t-0 border-slate-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Current Cart</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="p-3.5 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Customer
            </label>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Walk-in Customer (General)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || c.location || 'Account'})
              </option>
            ))}
          </select>

          {!selectedCustomerId && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Walk-in name"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300" />
              <p className="font-semibold text-sm text-slate-600">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Click on package sizes from the left catalog to add feeds to this sale.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.quantity * item.unitPrice;

              return (
                <div
                  key={item.cartItemId}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-slate-900 text-xs truncate">
                        {item.productName}
                      </h5>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        {item.packageName} @ {formatCurrency(item.unitPrice, settings.currency_symbol)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.cartItemId)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Stepper & Line Total */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                        className="p-1 text-slate-600 hover:bg-white rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold font-mono text-xs px-2 text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                        className="p-1 text-slate-600 hover:bg-white rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatCurrency(lineTotal, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Payment & Checkout Summary Footer */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
          {/* Discount & Payment Method */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Discount (KSh)
              </label>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-semibold focus:border-emerald-600 outline-none bg-white"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ON_CREDIT">On Credit (Store Tab)</option>
                <option value="OTHER_DIRECT">Other Direct</option>
              </select>
            </div>
          </div>

          {/* Subtotal & Total Display */}
          <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(subtotal, settings.currency_symbol)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(discount, settings.currency_symbol)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Payable Total:</span>
              <span className="font-mono text-xl font-extrabold text-blue-600">
                {formatCurrency(total, settings.currency_symbol)}
              </span>
            </div>
          </div>

          {/* Big Checkout Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleCompleteSaleSubmit}
            className={`w-full py-3 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
              cart.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Complete Sale & Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onScan={handleBarcodeScanned}
        onClose={() => setScannerOpen(false)}
      />

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Customer Account</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomerSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. John Kamau"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Farm / Village Location
                </label>
                <input
                  type="text"
                  value={newCustLocation}
                  onChange={(e) => setNewCustLocation(e.target.value)}
                  placeholder="e.g. Githunguri Dairy Cooperative"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
