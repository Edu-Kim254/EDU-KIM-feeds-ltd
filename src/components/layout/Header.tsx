import React from 'react';
import { UserProfile } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { Menu, ShoppingCart, UserCheck, Shield, Cloud, Moon, Sun } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

interface HeaderProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onOpenMobileMenu: () => void;
  onQuickNewSale: () => void;
  onOpenSupabaseSetup?: () => void;
  currentTab: string;
  theme?: 'midnight' | 'classic';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenMobileMenu,
  onQuickNewSale,
  onOpenSupabaseSetup,
  currentTab,
  theme = 'midnight',
  onToggleTheme,
}) => {
  const isCloudActive = isSupabaseConfigured();
  // Format readable title from current tab
  const tabTitles: Record<string, string> = {
    dashboard: 'Business Dashboard',
    pos: 'Point of Sale (New Sale)',
    sales: 'Sales Records & Receipts',
    products: 'Product Catalog & Pricing',
    inventory: 'Inventory & Stock Management',
    purchases: 'Supplier Purchases & Restock',
    customers: 'Customer Accounts',
    suppliers: 'Supplier Accounts',
    expenses: 'Operational Expenses',
    reports: 'Business Performance Reports',
    'audit-logs': 'System Audit Trail',
    users: 'Staff & Role Permissions',
    settings: 'Business & System Settings',
  };

  const title = tabTitles[currentTab] || 'Management System';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile hamburger & Screen title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
            {title}
          </h2>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2.5">
        {onOpenSupabaseSetup && (
          <button
            onClick={onOpenSupabaseSetup}
            title={isCloudActive ? 'Supabase Cloud Connected (Click to manage)' : 'Supabase Cloud: Local Cache Active (Click to set up)'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
              isCloudActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${isCloudActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {isCloudActive ? 'Supabase: Connected' : 'Supabase: Set Up'}
            </span>
          </button>
        )}
        <OfflineIndicator />
        <PWAInstallButton />

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={theme === 'midnight' ? 'Switch to Classic Light Theme' : 'Switch to Midnight Cashier Station (Dark)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
              theme === 'midnight'
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {theme === 'midnight' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/30" />
                <span className="hidden md:inline">Midnight POS</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Classic</span>
              </>
            )}
          </button>
        )}

        {/* Quick New Sale button */}
        {currentTab !== 'pos' && (
          <button
            onClick={onQuickNewSale}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">+ New Sale</span>
          </button>
        )}

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        {/* User profile & Role switcher */}
        <div className="relative group">
          <button
            className="flex items-center space-x-3 p-1 rounded-xl hover:bg-slate-50 transition-colors text-left focus:outline-none"
            title="Switch User / Role"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {currentUser.name}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {currentUser.role === 'ADMIN'
                  ? 'Shop Owner (Admin)'
                  : currentUser.role === 'MANAGER'
                  ? 'Store Manager'
                  : 'Cashier / Staff'}
              </p>
            </div>

            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-sm shrink-0">
              {currentUser.name.charAt(0)}
            </div>
          </button>

          {/* Role selector dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block hover:block z-50">
            <div className="px-3 py-2 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 mb-1">
              Switch Account / Role
            </div>
            {allUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onSwitchUser(u)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex flex-col transition-colors ${
                  u.id === currentUser.id
                    ? 'bg-blue-50 text-blue-800 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : u.role === 'MANAGER'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
