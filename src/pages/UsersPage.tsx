import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { UserCheck, Plus, Shield, User, X, CheckCircle2 } from 'lucide-react';

interface UsersPageProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onSaveUser: (user: Partial<UserProfile>) => UserProfile;
  onSwitchUser: (user: UserProfile) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({
  users,
  currentUser,
  onSaveUser,
  onSwitchUser,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);

  const handleOpenAdd = () => {
    setEditingUser({
      name: '',
      email: '',
      username: '',
      role: 'STAFF',
      active: true,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name?.trim() || !editingUser.username?.trim()) return;
    try {
      onSaveUser(editingUser);
      setModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      alert(err?.message || 'Error saving user');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Staff & Role Permissions (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Control cashier checkout rights, manager stock audit privileges, and administrator ownership
          </p>
        </div>

        {currentUser.role === 'ADMIN' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Staff User</span>
          </button>
        )}
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-slate-700" />
            <span>Admin (Shop Owner)</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Unlimited access: Product pricing, profit margins, staff management, settings, and database backups.
          </p>
        </div>

        <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Store Manager</span>
          </div>
          <p className="text-xs text-blue-800 mt-1">
            Operational authority: Physical stock count reconciliation, supplier restock, and sale voiding approvals.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <UserCheck className="w-4 h-4 text-slate-700" />
            <span>Cashier (Staff)</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Checkout desk: Point of Sale ringing, loose kg weighing calculations, and receipt thermal printing.
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 font-bold text-slate-800 text-xs">
          Registered Store Accounts ({users.length})
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;

            return (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {u.role}
                      </span>
                      {isSelf && (
                        <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                          Logged In
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5 font-mono">
                      @{u.username} • {u.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isSelf && (
                    <button
                      onClick={() => onSwitchUser(u)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Switch to this User
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {modalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Staff Account</h3>
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
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="e.g. Grace Wanjiku"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="e.g. gracew"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="e.g. grace@pasturefeeds.co.ke"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Role Assignment <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingUser.role || 'STAFF'}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                  }
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="STAFF">Cashier / Staff (POS & Sales)</option>
                  <option value="MANAGER">Store Manager (Stock Audit & Restock)</option>
                  <option value="ADMIN">Administrator / Owner (Full Control)</option>
                </select>
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
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
