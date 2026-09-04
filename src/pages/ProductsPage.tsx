import React, { useState, useMemo } from 'react';
import {
  Product,
  ProductCategory,
  ProductPackage,
  UserProfile,
  BusinessSettings,
} from '../types';
import { formatCurrency, formatStockDisplay } from '../utils/formatters';
import { StockBadge } from '../components/common/StockBadge';
import { exportProductsCSV, parseProductCSV, CSVImportResult } from '../utils/exportImport';
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  Tag,
  Edit2,
  Package,
  DollarSign,
  Archive,
  AlertCircle,
  X,
  Trash2,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ProductsPageProps {
  products: Product[];
  categories: ProductCategory[];
  currentUser: UserProfile;
  settings: BusinessSettings;
  onSaveProduct: (product: Partial<Product>) => Product;
  onUpdatePrice: (params: {
    productId: string;
    packageId?: string;
    newSellingPrice: number;
    newCostPrice?: number;
    reason: string;
  }) => void;
  onArchiveProduct: (productId: string) => void;
  onQuickStockAdjust: (productId: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  categories,
  currentUser,
  settings,
  onSaveProduct,
  onUpdatePrice,
  onArchiveProduct,
  onQuickStockAdjust,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modals state
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [priceUpdateModalOpen, setPriceUpdateModalOpen] = useState(false);
  const [priceUpdateTarget, setPriceUpdateTarget] = useState<{
    product: Product;
    packageItem?: ProductPackage;
    currentSelling: number;
    currentCost: number;
  } | null>(null);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState('Supplier wholesale adjustment');

  // CSV Import state
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVImportResult | null>(null);
  const [csvRawText, setCsvRawText] = useState('');

  // Filtering
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      if (!p.active) return false;
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      if (stockStatusFilter === 'out_of_stock' && p.current_stock > 0) return false;
      if (stockStatusFilter === 'low_stock' && (p.current_stock <= 0 || p.current_stock > p.min_stock_level)) return false;
      if (stockStatusFilter === 'in_stock' && p.current_stock <= p.min_stock_level) return false;

      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.subcategory?.toLowerCase().includes(term)
      );
    });
  }, [products, categoryFilter, stockStatusFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingProduct({
      sku: 'FEED-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      category_id: categories[0]?.id || 'cat-raw-materials',
      brand: 'Pasture Feeds',
      base_unit: 'KG',
      selling_price_per_base_unit: 50,
      cost_price_per_base_unit: 40,
      min_stock_level: 200,
      current_stock: 0,
      packages: [
        {
          id: 'pkg-init-50kg',
          product_id: '',
          package_name: '50 KG Bag',
          size_in_base_units: 50,
          selling_price: 2500,
          cost_price: 2000,
          is_default: true,
          active: true,
        },
        {
          id: 'pkg-init-1kg',
          product_id: '',
          package_name: '1 KG Loose',
          size_in_base_units: 1,
          selling_price: 50,
          cost_price: 40,
          is_default: false,
          active: true,
        },
      ],
    });
    setEditProductModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(JSON.parse(JSON.stringify(product)));
    setEditProductModalOpen(true);
  };

  // Submit Product Save
  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      onSaveProduct(editingProduct);
      setEditProductModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert(err?.message || 'Error saving product');
    }
  };

  // Add package row in editing product
  const handleAddPackageRow = () => {
    if (!editingProduct) return;
    const newPkg: ProductPackage = {
      id: 'pkg-custom-' + Date.now(),
      product_id: editingProduct.id || '',
      package_name: '10 KG Bag',
      size_in_base_units: 10,
      selling_price: (editingProduct.selling_price_per_base_unit || 50) * 10,
      cost_price: (editingProduct.cost_price_per_base_unit || 40) * 10,
      is_default: false,
      active: true,
    };
    setEditingProduct({
      ...editingProduct,
      packages: [...(editingProduct.packages || []), newPkg],
    });
  };

  // Open Price Update Modal
  const handleOpenPriceModal = (product: Product, pkg?: ProductPackage) => {
    const currentSelling = pkg ? pkg.selling_price : product.selling_price_per_base_unit;
    const currentCost = pkg ? pkg.cost_price : product.cost_price_per_base_unit;

    setPriceUpdateTarget({
      product,
      packageItem: pkg,
      currentSelling,
      currentCost,
    });
    setNewSellingPrice(currentSelling);
    setNewCostPrice(currentCost);
    setPriceReason('Supplier wholesale price revision');
    setPriceUpdateModalOpen(true);
  };

  // Submit Price Update
  const handlePriceUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceUpdateTarget) return;

    try {
      onUpdatePrice({
        productId: priceUpdateTarget.product.id,
        packageId: priceUpdateTarget.packageItem?.id,
        newSellingPrice,
        newCostPrice,
        reason: priceReason,
      });
      setPriceUpdateModalOpen(false);
      setPriceUpdateTarget(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update price');
    }
  };

  // Handle CSV Upload preview
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvRawText(text);
      const parsed = parseProductCSV(text);
      setCsvPreview(parsed);
      setCsvImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm CSV Import
  const handleConfirmCSVImport = () => {
    if (!csvPreview || csvPreview.parsedProducts.length === 0) return;

    let successCount = 0;
    for (const p of csvPreview.parsedProducts) {
      try {
        onSaveProduct(p);
        successCount++;
      } catch (err) {
        console.warn('Failed to import product', p.name, err);
      }
    }
    alert(`Successfully imported ${successCount} products into inventory!`);
    setCsvImportModalOpen(false);
    setCsvPreview(null);
  };

  const isStaff = currentUser.role === 'STAFF';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Feed Products & Packaging
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Maintain raw materials, formulated feeds, bag sizes, and pricing tiers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportProductsCSV(products.filter((p) => p.active))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {!isStaff && (
            <label className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import CSV</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
            </label>
          )}

          {!isStaff && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by feed name, SKU, brand..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={stockStatusFilter}
          onChange={(e) => setStockStatusFilter(e.target.value as any)}
          className="w-full md:w-40 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Stock Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">SKU & Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Packages & Selling Prices</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const category = categories.find((c) => c.id === product.category_id);
                const formattedStock = formatStockDisplay(product);

                return (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* SKU & Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-slate-400 font-bold uppercase">
                        {product.sku}
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        Brand: {product.brand || 'Pasture Feeds'}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${category?.color || '#16a34a'}15`,
                          color: category?.color || '#16a34a',
                        }}
                      >
                        {category?.name || 'General'}
                      </span>
                      {product.subcategory && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{product.subcategory}</div>
                      )}
                    </td>

                    {/* Stock Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <StockBadge product={product} />
                      </div>
                      <div className="font-bold text-slate-800">{formattedStock.primary}</div>
                      <div className="text-slate-400 text-[11px] font-mono">{formattedStock.subtext}</div>
                    </td>

                    {/* Packages & Prices list */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {product.packages
                          .filter((pkg) => pkg.active)
                          .map((pkg) => (
                            <button
                              key={pkg.id}
                              onClick={() => !isStaff && handleOpenPriceModal(product, pkg)}
                              title={!isStaff ? 'Click to change price' : undefined}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                                !isStaff ? 'hover:border-emerald-400 cursor-pointer' : ''
                              } bg-slate-50 border-slate-200`}
                            >
                              <span className="font-medium text-slate-700">{pkg.package_name}:</span>
                              <span className="font-mono font-bold text-slate-900">
                                {formatCurrency(pkg.selling_price, settings.currency_symbol)}
                              </span>
                            </button>
                          ))}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Base: {formatCurrency(product.selling_price_per_base_unit, settings.currency_symbol)}/{product.base_unit} (Cost: {formatCurrency(product.cost_price_per_base_unit, settings.currency_symbol)})
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isStaff && (
                          <button
                            onClick={() => handleOpenPriceModal(product)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Update Base Pricing"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {!isStaff && (
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Product Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {!isStaff && (
                          <button
                            onClick={() => onQuickStockAdjust(product.id)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Adjust Physical Stock"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        )}
                        {currentUser.role === 'ADMIN' && (
                          <button
                            onClick={() => {
                              if (confirm(`Archive product "${product.name}"? Historical sales will be preserved.`)) {
                                onArchiveProduct(product.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Archive Product"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No products matching your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Product Modal */}
      {editProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct.id ? 'Edit Feed Product' : 'Add New Feed Product'}
              </h3>
              <button
                onClick={() => setEditProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Layers Complete Mash 50kg"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={editingProduct.category_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    placeholder="e.g. Unga Farm Care"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Base Unit</label>
                  <select
                    value={editingProduct.base_unit || 'KG'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, base_unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="L">Litres (L)</option>
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="BAG">Bag (Standard)</option>
                  </select>
                </div>
              </div>

              {/* Base Prices & Min stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Selling Price / Base Unit
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingProduct.selling_price_per_base_unit || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        selling_price_per_base_unit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cost Price / Base Unit
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingProduct.cost_price_per_base_unit || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        cost_price_per_base_unit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.min_stock_level || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        min_stock_level: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Packages Configuration Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Packaging Breakdown
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configure package sizes sold (e.g. 50 KG Bag, 10 KG, 1 KG Loose)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPackageRow}
                    className="flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Package Size</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editingProduct.packages?.map((pkg, idx) => (
                    <div
                      key={pkg.id || idx}
                      className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={pkg.package_name}
                          placeholder="e.g. 50 KG Bag"
                          onChange={(e) => {
                            const updated = [...(editingProduct.packages || [])];
                            updated[idx] = { ...updated[idx], package_name: e.target.value };
                            setEditingProduct({ ...editingProduct, packages: updated });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          value={pkg.size_in_base_units}
                          placeholder="Size (KG)"
                          onChange={(e) => {
                            const updated = [...(editingProduct.packages || [])];
                            updated[idx] = {
                              ...updated[idx],
                              size_in_base_units: parseFloat(e.target.value) || 1,
                            };
                            setEditingProduct({ ...editingProduct, packages: updated });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                          title="Size in Base Units"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={pkg.selling_price}
                          placeholder="Price (KSh)"
                          onChange={(e) => {
                            const updated = [...(editingProduct.packages || [])];
                            updated[idx] = {
                              ...updated[idx],
                              selling_price: parseFloat(e.target.value) || 0,
                            };
                            setEditingProduct({ ...editingProduct, packages: updated });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                          title="Selling Price"
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        <label className="inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pkg.is_default || false}
                            onChange={(e) => {
                              const updated = (editingProduct.packages || []).map((p, i) => ({
                                ...p,
                                is_default: i === idx ? e.target.checked : false,
                              }));
                              setEditingProduct({ ...editingProduct, packages: updated });
                            }}
                          />
                          <span>Default</span>
                        </label>
                      </div>
                      <div className="col-span-1 text-right">
                        {(editingProduct.packages?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.packages?.filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, packages: updated });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Revision Modal (with price change audit logging) */}
      {priceUpdateModalOpen && priceUpdateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Feed Price</h3>
              <button
                onClick={() => setPriceUpdateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePriceUpdateSubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {priceUpdateTarget.product.name}
                </div>
                <div className="text-slate-500 font-medium">
                  {priceUpdateTarget.packageItem
                    ? priceUpdateTarget.packageItem.package_name
                    : `Base Unit Price (${priceUpdateTarget.product.base_unit})`}
                </div>
                <div className="mt-2 flex justify-between font-mono">
                  <span className="text-slate-400">Current Selling:</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(priceUpdateTarget.currentSelling, settings.currency_symbol)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Selling Price (KSh) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-sm focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Cost / Purchase Price (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Price Revision <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                  placeholder="e.g. Raw material corn price increase from miller"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: Updating price creates a permanent audit log entry and will not affect past receipts.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPriceUpdateModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Confirm & Apply Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {csvImportModalOpen && csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Import Feed Products via CSV</h3>
              <button
                onClick={() => setCsvImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex justify-between">
                <span>Valid rows ready to import:</span>
                <span className="font-bold font-mono">{csvPreview.importedCount}</span>
              </div>

              {csvPreview.errors.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <div className="font-bold mb-1">Warnings / Errors ({csvPreview.errors.length}):</div>
                  <div className="max-h-28 overflow-y-auto space-y-0.5 text-[11px]">
                    {csvPreview.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample parsed products preview */}
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {csvPreview.parsedProducts.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{p.sku}</span>
                    </div>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(p.selling_price_per_base_unit || 0, settings.currency_symbol)}/{p.base_unit}
                    </span>
                  </div>
                ))}
                {csvPreview.parsedProducts.length > 5 && (
                  <div className="p-2 text-center text-slate-400 text-[11px]">
                    ...and {csvPreview.parsedProducts.length - 5} more items
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCsvImportModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvPreview.importedCount === 0}
                  onClick={handleConfirmCSVImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  Import {csvPreview.importedCount} Products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
