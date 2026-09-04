import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  Truck,
  Users,
  Building2,
  Wallet,
  BarChart3,
  UserCheck,
  Settings,
  History,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, Product } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  products: Product[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  products,
}) => {
  // Calculate low stock alert count
  const lowStockCount = products.filter(
    (p) => p.active && p.current_stock <= p.min_stock_level
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'New Sale (POS)', icon: ShoppingCart, highlight: true },
    { id: 'sales', label: 'Sales History', icon: Receipt },
    { id: 'products', label: 'Products & Pricing', icon: ShoppingBag },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'purchases', label: 'Purchases (Restock)', icon: Truck },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Building2 },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Logs', icon: History },
    { id: 'users', label: 'Users & Staff', icon: UserCheck, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white text-slate-900 flex flex-col shrink-0 border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
          <div className="w-4 h-4 border-2 border-white rounded-xs"></div>
        </div>
        <div className="overflow-hidden min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-900 truncate">
            Pasture Feeds
          </h1>
          <p className="text-xs text-blue-600 font-semibold tracking-wide">POS & Inventory</p>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Main Section Header */}
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Main Menu
        </div>

        {navItems.map((item, index) => {
          // Check role permissions for restricted tabs
          if (item.adminOnly && currentUser.role !== 'ADMIN') {
            return null;
          }

          const isActive = currentTab === item.id;
          const Icon = item.icon;

          // Section divider before management modules
          const isManagementHeader = item.id === 'purchases';
          const isSystemHeader = item.id === 'reports';

          return (
            <React.Fragment key={item.id}>
              {isManagementHeader && (
                <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Operations
                </div>
              )}
              {isSystemHeader && (
                <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Analytics & Admin
                </div>
              )}

              {item.highlight ? (
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl font-medium text-sm transition-all mb-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-white" />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  <span className="text-[10px] bg-blue-700 text-blue-100 uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                    POS
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200"
                      title={`${item.badge} low-stock products`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {item.badge}
                    </span>
                  )}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Sleek Interface Storage / Status Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Catalog Stock Health</span>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                {products.length} Items
              </span>
            </div>
            <p className="text-sm font-semibold">
              {lowStockCount === 0
                ? 'All Stock Healthy'
                : `${lowStockCount} Product${lowStockCount > 1 ? 's' : ''} Low`}
            </p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${
                    products.length > 0
                      ? Math.max(15, Math.min(100, Math.round(((products.length - lowStockCount) / products.length) * 100)))
                      : 100
                  }%`,
                }}
              ></div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="truncate text-slate-300 font-medium">{currentUser.name}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {currentUser.role}
              </span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>
    </aside>
  );
};
