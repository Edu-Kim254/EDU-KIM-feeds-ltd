import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  Menu,
} from 'lucide-react';
import { Product } from '../../types';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMoreMenu: () => void;
  products: Product[];
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
  products,
}) => {
  const lowStockCount = products.filter(
    (p) => p.active && p.current_stock <= p.min_stock_level
  ).length;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {/* Dashboard */}
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg transition-colors ${
          currentTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Dashboard</span>
      </button>

      {/* Products */}
      <button
        onClick={() => onSelectTab('products')}
        className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg transition-colors ${
          currentTab === 'products' ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Products</span>
      </button>

      {/* Raised Prominent "NEW SALE" POS button */}
      <button
        onClick={() => onSelectTab('pos')}
        className="flex flex-col items-center justify-center -mt-5"
        title="Open POS Screen to make a sale"
      >
        <div
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
            currentTab === 'pos'
              ? 'bg-blue-600 text-white ring-4 ring-blue-100'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <ShoppingCart className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-blue-700 mt-0.5">New Sale</span>
      </button>

      {/* Inventory */}
      <button
        onClick={() => onSelectTab('inventory')}
        className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg relative transition-colors ${
          currentTab === 'inventory' ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <div className="relative">
          <Package className="w-5 h-5" />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full">
              {lowStockCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Inventory</span>
      </button>

      {/* More / Menu */}
      <button
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg text-slate-500 hover:text-slate-800"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
