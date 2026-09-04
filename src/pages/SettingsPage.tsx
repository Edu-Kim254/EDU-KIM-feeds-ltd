import React, { useState } from 'react';
import {
  BusinessSettings,
  UserProfile,
  Product,
  ProductCategory,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  InventoryMovement,
  CustomerPayment,
} from '../types';
import {
  Settings,
  Store,
  Users,
  Database,
  Save,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Moon,
  Sun,
} from 'lucide-react';
import { SupabaseSettingsTab } from '../components/supabase/SupabaseSettingsTab';

interface SettingsPageProps {
  settings: BusinessSettings;
  users: UserProfile[];
  currentUser: UserProfile;
  categories: ProductCategory[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  customerPayments: CustomerPayment[];
  purchases: Purchase[];
  expenses: Expense[];
  movements: InventoryMovement[];
  onUpdateSettings: (settings: Partial<BusinessSettings>) => void;
  onResetData: () => void;
  onExportFullBackup: () => void;
  onImportFullBackup: (jsonStr: string) => void;
  onCloudDataPulled: (cloudData: any) => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialTab?: 'shop' | 'users' | 'backup' | 'supabase';
  theme?: 'midnight' | 'classic';
  onToggleTheme?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  users,
  currentUser,
  categories,
  suppliers,
  products,
  customers,
  sales,
  customerPayments,
  purchases,
  expenses,
  movements,
  onUpdateSettings,
  onResetData,
  onExportFullBackup,
  onImportFullBackup,
  onCloudDataPulled,
  onToast,
  initialTab = 'shop',
  theme = 'midnight',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'users' | 'backup' | 'supabase'>(initialTab);

  // Local form state
  const [shopName, setShopName] = useState(settings.shop_name);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol);
  const [taxRate, setTaxRate] = useState(String(settings.tax_rate_percentage));
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer_note);
  const [lowStockDefault, setLowStockDefault] = useState(
    String(settings.low_stock_default_threshold)
  );

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      shop_name: shopName,
      phone,
      email,
      address,
      currency_symbol: currencySymbol,
      tax_rate_percentage: parseFloat(taxRate) || 0,
      receipt_footer_note: receiptFooter,
      low_stock_default_threshold: parseFloat(lowStockDefault) || 100,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (
          confirm(
            'Importing will replace existing products, inventory, and records. Are you sure you want to proceed?'
          )
        ) {
          try {
            onImportFullBackup(content);
            alert('Database backup imported successfully!');
          } catch (err: any) {
            alert('Import error: ' + err.message);
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const isStaff = currentUser.role === 'STAFF';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Shop Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage shop branding, thermal receipt headers, team roles, and data backups
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('shop')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'shop'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop & Receipt</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Backup & Reset</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'supabase'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Supabase Cloud DB</span>
        </button>
      </div>

      {/* TAB 1: SHOP & RECEIPT SETTINGS */}
      {activeTab === 'shop' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          {/* Theme & Display Mode */}
          {onToggleTheme && (
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Interface Theme & Eye Comfort
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Theme 4: Midnight Cashier
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-contrast dark mode tailored for continuous cashier counter shifts without screen glare.
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleTheme}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  theme === 'midnight'
                    ? 'bg-indigo-950 text-indigo-200 border-indigo-700/80 hover:bg-indigo-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'
                }`}
              >
                {theme === 'midnight' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/40" />
                    <span>Active: Midnight Cashier</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Active: Classic Light</span>
                  </>
                )}
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Shop settings saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveShopSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Shop Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isStaff}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Official Phone / Customer Care <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isStaff}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Shop Physical Address / Location
                </label>
                <input
                  type="text"
                  disabled={isStaff}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  disabled={isStaff}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  disabled={isStaff}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Default Re-order Threshold (KG)
                </label>
                <input
                  type="number"
                  disabled={isStaff}
                  value={lowStockDefault}
                  onChange={(e) => setLowStockDefault(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Thermal Receipt Footer Note
                </label>
                <input
                  type="text"
                  disabled={isStaff}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="e.g. Asanteni kwa kukuza mifugo nasi! Feeds sold cannot be returned once opened."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {!isStaff && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: TEAM & USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Shop Staff & Role Permissions</h3>
            <p className="text-xs text-slate-500">
              Role-Based Access Control: Admins, Store Managers, and Cashiers
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'MANAGER'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.id === currentUser.id && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Active Session
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Username: <span className="font-mono text-slate-600">{u.username}</span>
                  </div>
                </div>

                <div className="text-right text-slate-500">
                  {u.role === 'ADMIN' && 'Full privileges (Pricing, Voiding, Settings)'}
                  {u.role === 'MANAGER' && 'Stock count, restock, and sale voiding'}
                  {u.role === 'STAFF' && 'POS checkouts and receipt printing'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & DATA MANAGEMENT */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database Backup & Export</h3>
              <p className="text-xs text-slate-500">
                Download all local shop records, inventory balances, customers, and transactions as a JSON file.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onExportFullBackup}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Backup (.JSON)</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs shadow-xs cursor-pointer">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Restore Backup (.JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Reset to Standard Kenyan Animal Feeds Demo Data</span>
            </div>
            <p className="text-xs text-rose-700">
              This resets all feeds, packaging sizes (50kg, 20kg, loose kg), suppliers, and sample sales to default.
            </p>
            <div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to reset all data back to the default Kenya feeds inventory?'
                    )
                  ) {
                    onResetData();
                    alert('Shop data reset to default seed catalog.');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE CLOUD DATABASE */}
      {activeTab === 'supabase' && (
        <SupabaseSettingsTab
          settings={settings}
          users={users}
          categories={categories}
          suppliers={suppliers}
          products={products}
          customers={customers}
          sales={sales}
          customerPayments={customerPayments}
          purchases={purchases}
          expenses={expenses}
          movements={movements}
          onCloudDataPulled={onCloudDataPulled}
          onToast={onToast}
        />
      )}
    </div>
  );
};
