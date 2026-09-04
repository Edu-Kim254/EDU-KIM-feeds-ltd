import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { appStore } from './services/store';
import { Sale, Product, UserProfile } from './types';
import { downloadCSV } from './utils/exportImport';
import { getSupabaseClient } from './lib/supabase';
import { downloadAllFromSupabase, uploadAllToSupabase } from './services/supabaseSync';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Common Components
import { ReceiptModal } from './components/common/ReceiptModal';
import { Toast } from './components/common/Toast';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { StockCountPage } from './pages/StockCountPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  // Sync state with appStore
  const [, setTick] = useState(0);
  useEffect(() => {
    return appStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  // Automatic Supabase Cloud Initial Sync & Realtime Subscription
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isMounted = true;

    const initCloud = async () => {
      try {
        const result = await downloadAllFromSupabase();
        if (!isMounted) return;

        if (result.success && result.data) {
          const cloudProds = result.data.products || [];
          if (cloudProds.length > 0) {
            // Populate store from Supabase Cloud
            appStore.importFromSupabase(result.data);
          } else {
            // Connected database has 0 products: upload initial seed catalog
            await uploadAllToSupabase({
              settings: appStore.settings,
              users: appStore.users,
              categories: appStore.categories,
              suppliers: appStore.suppliers,
              products: appStore.products,
              customers: appStore.customers,
              sales: appStore.sales,
              customerPayments: appStore.customerPayments,
              purchases: appStore.purchases,
              expenses: appStore.expenses,
              movements: appStore.movements,
            });
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync attempt:', err);
      }
    };

    initCloud();

    // Subscribe to real-time events from Supabase Cloud
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async () => {
          const res = await downloadAllFromSupabase();
          if (res.success && res.data && isMounted) {
            appStore.importFromSupabase(res.data);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          const res = await downloadAllFromSupabase();
          if (res.success && res.data && isMounted) {
            appStore.importFromSupabase(res.data);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        async () => {
          const res = await downloadAllFromSupabase();
          if (res.success && res.data && isMounted) {
            appStore.importFromSupabase(res.data);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Store collections
  const settings = appStore.settings;
  const users = appStore.users;
  const currentUser = appStore.currentUser;
  const categories = appStore.categories;
  const products = appStore.products;
  const suppliers = appStore.suppliers;
  const customers = appStore.customers;
  const sales = appStore.sales;
  const purchases = appStore.purchases;
  const expenses = appStore.expenses;
  const movements = appStore.movements;
  const priceHistories = appStore.priceHistories;
  const auditLogs = appStore.auditLogs;
  const stockCounts = appStore.stockCounts;
  const customerPayments = appStore.customerPayments;

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'shop' | 'users' | 'backup' | 'supabase'>('shop');

  // Sub-flow routing parameters
  const [preselectedRestockProductId, setPreselectedRestockProductId] = useState<string | undefined>();
  const [preselectedAdjustProductId, setPreselectedAdjustProductId] = useState<string | undefined>();

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Receipt Preview Modal
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);

  // ================= ACTION HANDLERS =================

  const handleCreateSale = (params: any) => {
    try {
      const newSale = appStore.createSale(params);
      showToast(`Sale ${newSale.receipt_number} completed! Total: KSh ${newSale.total.toLocaleString()}`, 'success');
      setActiveReceiptSale(newSale);
      return newSale;
    } catch (err: any) {
      showToast(err.message || 'Failed to complete sale', 'error');
      throw err;
    }
  };

  const handleVoidSale = (saleId: string, reason: string) => {
    try {
      const voided = appStore.voidSale(saleId, reason);
      showToast(`Sale ${voided.receipt_number} voided and stock restored to inventory.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to void sale', 'error');
      throw err;
    }
  };

  const handleSaveProduct = (productData: Partial<Product>) => {
    try {
      const saved = appStore.saveProduct(productData);
      showToast(`Product "${saved.name}" saved successfully.`, 'success');
      return saved;
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
      throw err;
    }
  };

  const handleUpdatePrice = (params: any) => {
    try {
      appStore.updateProductPrice(params);
      showToast('Price updated successfully and logged in price history.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update price', 'error');
      throw err;
    }
  };

  const handleAdjustStock = (params: any) => {
    try {
      appStore.adjustStock(params);
      showToast('Stock quantity adjusted successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
      throw err;
    }
  };

  const handleCommitStockCount = (params: any) => {
    try {
      const session = appStore.commitStockCount(params);
      showToast(`Stock count reconciled successfully (${session.items.length} items evaluated).`, 'success');
      return session;
    } catch (err: any) {
      showToast(err.message || 'Failed to reconcile stock session', 'error');
      throw err;
    }
  };

  const handleCreatePurchase = (params: any) => {
    try {
      const purchase = appStore.createPurchase(params);
      showToast(`Restock invoice ${purchase.invoice_number} saved and inventory increased!`, 'success');
      return purchase;
    } catch (err: any) {
      showToast(err.message || 'Failed to record restock', 'error');
      throw err;
    }
  };

  const handleSaveCustomer = (custData: any) => {
    try {
      const cust = appStore.saveCustomer(custData);
      showToast(`Customer account for "${cust.name}" saved.`, 'success');
      return cust;
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
      throw err;
    }
  };

  const handleSaveSupplier = (supData: any) => {
    try {
      const sup = appStore.saveSupplier(supData);
      showToast(`Supplier "${sup.name}" saved.`, 'success');
      return sup;
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
      throw err;
    }
  };

  const handleCreateExpense = (expData: any) => {
    try {
      const exp = appStore.createExpense(expData);
      showToast(`Expense for KSh ${exp.amount.toLocaleString()} recorded.`, 'success');
      return exp;
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
      throw err;
    }
  };

  const handleUpdateSettings = (newSettings: any) => {
    try {
      appStore.updateSettings(newSettings);
      showToast('Business settings updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
      throw err;
    }
  };

  const handleSaveUser = (userData: any) => {
    try {
      const u = appStore.saveUser(userData);
      showToast(`Staff account for ${u.name} (${u.role}) saved.`, 'success');
      return u;
    } catch (err: any) {
      showToast(err.message || 'Failed to save staff user', 'error');
      throw err;
    }
  };

  const handleSwitchUser = (user: UserProfile) => {
    appStore.setCurrentUser(user);
    showToast(`Switched active session to ${user.name} (${user.role})`, 'info');
  };

  const handleResetData = () => {
    appStore.resetToSampleData();
    showToast('Database reset to Kenya feeds catalog.', 'info');
  };

  const handleExportFullBackup = () => {
    const jsonStr = appStore.exportDatabaseJSON();
    downloadCSV(`pasture_feeds_backup_${new Date().toISOString().slice(0, 10)}.json`, jsonStr);
    showToast('Database backup downloaded successfully.', 'success');
  };

  const handleImportFullBackup = (jsonStr: string) => {
    try {
      appStore.importDatabaseJSON(jsonStr);
      showToast('Database restored successfully from backup!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to restore backup', 'error');
      throw err;
    }
  };

  // Quick Restock shortcut
  const handleQuickRestock = (productId: string) => {
    setPreselectedRestockProductId(productId);
    setCurrentTab('purchases');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setPreselectedRestockProductId(undefined);
            setPreselectedAdjustProductId(undefined);
          }}
          currentUser={currentUser}
          products={products}
        />
      </div>

      {/* Mobile Sidebar Modal Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-xs">
          <div className="w-72 h-full bg-white shadow-2xl flex flex-col">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
                setPreselectedRestockProductId(undefined);
                setPreselectedAdjustProductId(undefined);
              }}
              currentUser={currentUser}
              products={products}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          allUsers={users}
          onSwitchUser={handleSwitchUser}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickNewSale={() => setCurrentTab('pos')}
          onOpenSupabaseSetup={() => {
            setSettingsTab('supabase');
            setCurrentTab('settings');
          }}
          currentTab={currentTab}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardPage
              products={products}
              sales={sales}
              purchases={purchases}
              expenses={expenses}
              categories={categories}
              settings={settings}
              currentUser={currentUser}
              onNavigateToTab={(tab) => {
                setCurrentTab(tab);
                setPreselectedRestockProductId(undefined);
              }}
              onQuickRestock={handleQuickRestock}
            />
          )}

          {currentTab === 'pos' && (
            <POSPage
              products={products}
              categories={categories}
              customers={customers}
              settings={settings}
              currentUser={currentUser}
              onCompleteSale={handleCreateSale}
              onSaveCustomer={handleSaveCustomer}
            />
          )}

          {currentTab === 'sales' && (
            <SalesHistoryPage
              sales={sales}
              settings={settings}
              currentUser={currentUser}
              onShowReceipt={(sale) => setActiveReceiptSale(sale)}
              onVoidSale={handleVoidSale}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage
              products={products}
              categories={categories}
              settings={settings}
              currentUser={currentUser}
              priceHistories={priceHistories}
              onSaveProduct={handleSaveProduct}
              onUpdatePrice={handleUpdatePrice}
              onQuickRestock={handleQuickRestock}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPage
              products={products}
              categories={categories}
              movements={movements}
              settings={settings}
              currentUser={currentUser}
              onAdjustStock={handleAdjustStock}
              onNavigateToStockCount={() => setCurrentTab('stock-count')}
              onQuickRestock={handleQuickRestock}
              preselectedAdjustProductId={preselectedAdjustProductId}
            />
          )}

          {currentTab === 'stock-count' && (
            <StockCountPage
              products={products}
              stockCountHistory={stockCounts}
              settings={settings}
              currentUser={currentUser}
              onCommitCount={handleCommitStockCount}
              onBack={() => setCurrentTab('inventory')}
            />
          )}

          {currentTab === 'purchases' && (
            <PurchasesPage
              purchases={purchases}
              suppliers={suppliers}
              products={products}
              settings={settings}
              currentUser={currentUser}
              preselectedProductId={preselectedRestockProductId}
              onCreatePurchase={handleCreatePurchase}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersPage
              customers={customers}
              sales={sales}
              customerPayments={customerPayments}
              settings={settings}
              currentUser={currentUser}
              onSaveCustomer={handleSaveCustomer}
              onRecordPayment={(params) => {
                const res = appStore.recordCustomerPayment(params);
                showToast(
                  `Payment of KSh ${params.amount.toLocaleString()} recorded successfully!`,
                  'success'
                );
                return res;
              }}
              onShowReceipt={(sale) => setActiveReceiptSale(sale)}
            />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersPage
              suppliers={suppliers}
              purchases={purchases}
              settings={settings}
              currentUser={currentUser}
              onSaveSupplier={handleSaveSupplier}
              onQuickRestockFromSupplier={(supId) => {
                setCurrentTab('purchases');
              }}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesPage
              expenses={expenses}
              settings={settings}
              currentUser={currentUser}
              onCreateExpense={handleCreateExpense}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsPage
              sales={sales}
              purchases={purchases}
              expenses={expenses}
              products={products}
              categories={categories}
              settings={settings}
            />
          )}

          {currentTab === 'audit-logs' && (
            <AuditLogsPage logs={auditLogs} settings={settings} />
          )}

          {currentTab === 'users' && (
            <UsersPage
              users={users}
              currentUser={currentUser}
              onSaveUser={handleSaveUser}
              onSwitchUser={handleSwitchUser}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              settings={settings}
              users={users}
              currentUser={currentUser}
              categories={categories}
              suppliers={suppliers}
              products={products}
              customers={customers}
              sales={sales}
              customerPayments={customerPayments}
              purchases={purchases}
              expenses={expenses}
              movements={movements}
              onUpdateSettings={handleUpdateSettings}
              onResetData={handleResetData}
              onExportFullBackup={handleExportFullBackup}
              onImportFullBackup={handleImportFullBackup}
              onCloudDataPulled={(cloudData) => {
                appStore.importFromSupabase(cloudData);
                showToast('Cloud database synchronized successfully with POS!', 'success');
              }}
              onToast={(msg, type) => showToast(msg, type)}
              initialTab={settingsTab}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setPreselectedRestockProductId(undefined);
          }}
          onOpenMoreMenu={() => setMobileMenuOpen(true)}
          products={products}
        />
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        sale={activeReceiptSale}
        settings={settings}
        isOpen={!!activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
