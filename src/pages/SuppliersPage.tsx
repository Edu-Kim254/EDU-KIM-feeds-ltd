import React, { useState } from 'react';
import { Supplier, Purchase, BusinessSettings, UserProfile } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Truck,
  X,
  User,
} from 'lucide-react';

interface SuppliersPageProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  settings: BusinessSettings;
  currentUser: UserProfile;
  onSaveSupplier: (supplier: Partial<Supplier>) => Supplier;
  onQuickRestockFromSupplier: (supplierId: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({
  suppliers,
  purchases,
  settings,
  currentUser,
  onSaveSupplier,
  onQuickRestockFromSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      (s.location && s.location.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setEditingSupplier({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      location: '',
      notes: '',
      active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier({ ...sup });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name?.trim()) return;
    try {
      onSaveSupplier(editingSupplier);
      setModalOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      alert(err?.message || 'Error saving supplier');
    }
  };

  const isStaff = currentUser.role === 'STAFF';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Feed Suppliers & Millers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Wholesale suppliers, grain millers, premix distributors, and logistics partners
          </p>
        </div>

        {!isStaff && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier company, contact person, or location..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Grid of suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{sup.name}</h3>
                  {sup.contact_person && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.contact_person}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                  )}
                  {sup.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.location}</span>
                    </div>
                  )}
                </div>

                {!isStaff && (
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-semibold p-1"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Volume stats */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  Total Restock Volume
                </span>
                <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                  {formatCurrency(sup.total_purchases_amount, settings.currency_symbol)}
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                {sup.notes || 'Verified supplier'}
              </span>

              {!isStaff && (
                <button
                  onClick={() => onQuickRestockFromSupplier(sup.id)}
                  className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>+ Restock Order</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Supplier / Miller Company <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  placeholder="e.g. Unga Farm Care (EA) Ltd"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contact_person || ''}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })
                  }
                  placeholder="e.g. Peter Njoroge (Sales Rep)"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingSupplier.phone || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                  placeholder="e.g. 020 6978000 / 0711 000 000"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Depot / Location</label>
                <input
                  type="text"
                  value={editingSupplier.location || ''}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, location: e.target.value })
                  }
                  placeholder="e.g. Commercial Street, Industrial Area, Nairobi"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  value={editingSupplier.notes || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                  placeholder="e.g. Delivery every Tuesday and Thursday morning"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
