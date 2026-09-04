import React, { useState, useMemo } from 'react';
import { Customer, Sale, CustomerPayment, BusinessSettings, UserProfile } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { exportCustomersCSV } from '../utils/exportImport';
import { RecordPaymentModal } from '../components/customers/RecordPaymentModal';
import { PaymentVoucherModal } from '../components/customers/PaymentVoucherModal';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Download,
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  ArrowDownRight,
  Printer,
  History,
  Clock,
  Eye,
  Edit2,
} from 'lucide-react';

interface CustomersPageProps {
  customers: Customer[];
  sales: Sale[];
  customerPayments?: CustomerPayment[];
  settings: BusinessSettings;
  currentUser?: UserProfile;
  onSaveCustomer: (customer: Partial<Customer>) => Customer;
  onRecordPayment?: (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT';
    reference?: string;
    notes?: string;
    specificSaleId?: string;
  }) => { payment: CustomerPayment; remainingBalance: number };
  onShowReceipt: (sale: Sale) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  sales,
  customerPayments = [],
  settings,
  currentUser,
  onSaveCustomer,
  onRecordPayment,
  onShowReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'CREDIT' | 'SETTLED'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  // Customer Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Customer History Modal
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState<Customer | null>(null);
  const [historyTab, setHistoryTab] = useState<'SALES' | 'PAYMENTS'>('SALES');

  // Record Payment Modal
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // Payment Confirmation Voucher Modal
  const [activeVoucher, setActiveVoucher] = useState<{
    payment: CustomerPayment;
    remainingBalance: number;
  } | null>(null);

  // Credit balance calculation helper
  const getCustomerCreditBalance = (customerId: string): number => {
    return sales
      .filter((s) => s.status !== 'VOIDED' && s.customer_id === customerId)
      .reduce((sum, s) => {
        if (s.payment_method === 'ON_CREDIT') {
          const paid = s.amount_paid ?? 0;
          return sum + Math.max(0, s.total - paid);
        }
        if (s.amount_paid !== undefined && s.amount_paid < s.total) {
          return sum + Math.max(0, s.total - s.amount_paid);
        }
        return sum;
      }, 0);
  };

  // Unpaid sales breakdown helper
  const getCustomerUnpaidSales = (customerId: string) => {
    return sales
      .filter((s) => s.status !== 'VOIDED' && s.customer_id === customerId)
      .map((s) => {
        const paid = s.amount_paid ?? (s.payment_method === 'ON_CREDIT' ? 0 : s.total);
        const remainingDue = Math.max(0, s.total - paid);
        return { sale: s, paid, remainingDue };
      })
      .filter((item) => item.remainingDue > 0.001)
      .sort((a, b) => new Date(a.sale.created_at).getTime() - new Date(b.sale.created_at).getTime());
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.location && c.location.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      const balance = getCustomerCreditBalance(c.id);
      if (filterTab === 'CREDIT') return balance > 0.001;
      if (filterTab === 'SETTLED') return balance <= 0.001;
      return true;
    });
  }, [customers, searchTerm, filterTab, sales]);

  // Overall metric totals
  const totalOutstandingCredit = useMemo(() => {
    return customers.reduce((sum, c) => sum + getCustomerCreditBalance(c.id), 0);
  }, [customers, sales]);

  const customersWithCreditCount = useMemo(() => {
    return customers.filter((c) => getCustomerCreditBalance(c.id) > 0.001).length;
  }, [customers, sales]);

  const totalSpentAcrossAll = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  }, [customers]);

  const handleOpenAdd = () => {
    setEditingCustomer({
      name: '',
      phone: '',
      location: '',
      email: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setModalOpen(true);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name?.trim()) return;
    try {
      onSaveCustomer(editingCustomer);
      setModalOpen(false);
      setEditingCustomer(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save customer');
    }
  };

  const handleConfirmPayment = (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'OTHER_DIRECT';
    reference?: string;
    notes?: string;
    specificSaleId?: string;
  }) => {
    if (!onRecordPayment) return;
    const result = onRecordPayment(params);
    if (result && result.payment) {
      setActiveVoucher({
        payment: result.payment,
        remainingBalance: result.remainingBalance,
      });
    }
  };

  // Selected customer sales and payments for history modal
  const customerSales = useMemo(() => {
    if (!viewHistoryCustomer) return [];
    return sales
      .filter((s) => s.customer_id === viewHistoryCustomer.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sales, viewHistoryCustomer]);

  const customerPaymentsList = useMemo(() => {
    if (!viewHistoryCustomer) return [];
    return customerPayments
      .filter((p) => p.customer_id === viewHistoryCustomer.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [customerPayments, viewHistoryCustomer]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Accounts & Credit Ledger
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor customer accounts, compute unpaid credit balances, and record payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCustomersCSV(filteredCustomers, getCustomerCreditBalance)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            title="Download full customer directory with Credit Balances"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {customers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Registered farmers & buyers</div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            totalOutstandingCredit > 0
              ? 'bg-amber-50/70 border-amber-200/80'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] uppercase font-bold tracking-wider ${
                totalOutstandingCredit > 0 ? 'text-amber-800' : 'text-slate-400'
              }`}
            >
              Total Credit Outstanding
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                totalOutstandingCredit > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              totalOutstandingCredit > 0 ? 'text-amber-950' : 'text-slate-900'
            }`}
          >
            {formatCurrency(totalOutstandingCredit, settings.currency_symbol)}
          </div>
          <div
            className={`text-[11px] mt-0.5 font-medium ${
              totalOutstandingCredit > 0 ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            {customersWithCreditCount > 0
              ? `${customersWithCreditCount} accounts with unpaid balances`
              : 'All credit accounts settled'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Active Credit Tabs</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {customersWithCreditCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {customers.length > 0
              ? `${Math.round((customersWithCreditCount / customers.length) * 100)}% of customer base`
              : '0%'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Lifetime Sales</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(totalSpentAcrossAll, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total customer orders value</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by farmer name, phone number, or farm location..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card Grid</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Accounts ({customers.length})
          </button>

          <button
            onClick={() => setFilterTab('CREDIT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterTab === 'CREDIT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Has Unpaid Credit ({customersWithCreditCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('SETTLED')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterTab === 'SETTLED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Balance / Settled ({customers.length - customersWithCreditCount})</span>
          </button>
        </div>
      </div>

      {/* TABLE VIEW (Primary format with explicit Credit Balance column) */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Customer / Farmer</th>
                  <th className="py-3 px-4">Location / Farm</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  {/* CREDIT BALANCE COLUMN */}
                  <th className="py-3 px-4 text-right bg-amber-50/40 border-x border-amber-100/60 text-amber-900 font-black">
                    Credit Balance
                  </th>
                  <th className="py-3 px-4">Last Purchase</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const creditBalance = getCustomerCreditBalance(customer.id);
                  const hasDue = creditBalance > 0.001;

                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDue ? 'bg-amber-50/10' : ''
                      }`}
                    >
                      {/* Customer Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {customer.name}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-600">
                        {customer.location ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{customer.location}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {customer.total_orders}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(customer.total_spent, settings.currency_symbol)}
                      </td>

                      {/* CREDIT BALANCE COLUMN */}
                      <td className="py-3 px-4 text-right bg-amber-50/30 border-x border-amber-100/60 font-mono">
                        {hasDue ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100/90 text-amber-950 font-black rounded-lg border border-amber-300 text-xs shadow-xs">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>{formatCurrency(creditBalance, settings.currency_symbol)}</span>
                            </span>
                            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5">
                              Unpaid Due
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>0.00</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                              Settled
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Last Purchase */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {customer.last_purchase_date
                          ? formatDate(customer.last_purchase_date)
                          : 'None yet'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* RECORD PAYMENT BUTTON */}
                          <button
                            onClick={() => setPaymentCustomer(customer)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                              hasDue
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Record payment against unpaid balance"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>

                          <button
                            onClick={() => {
                              setViewHistoryCustomer(customer);
                              setHistoryTab('SALES');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View order and payment history"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit customer info"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <div className="font-semibold text-slate-600">No customers found</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Try adjusting your search terms or filter selection.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRID CARD VIEW */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const creditBalance = getCustomerCreditBalance(customer.id);
            const hasDue = creditBalance > 0.001;

            return (
              <div
                key={customer.id}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                  hasDue
                    ? 'border-amber-200 hover:border-amber-400'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{customer.name}</h3>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{customer.phone}</span>
                        </div>
                      )}
                      {customer.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{customer.location}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenEdit(customer)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-semibold p-1"
                    >
                      Edit
                    </button>
                  </div>

                  {/* CREDIT BALANCE CARD BOX */}
                  <div
                    className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between ${
                      hasDue
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Credit Balance Due
                      </span>
                      <div
                        className={`font-mono text-lg font-black mt-0.5 ${
                          hasDue ? 'text-amber-900' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(creditBalance, settings.currency_symbol)}
                      </div>
                    </div>

                    {hasDue ? (
                      <span className="px-2 py-0.5 bg-amber-200/70 border border-amber-300 text-amber-900 rounded-md text-[10px] font-black uppercase">
                        Unpaid Due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-[10px] font-bold uppercase">
                        Settled
                      </span>
                    )}
                  </div>

                  {/* Orders & Total Spent Box */}
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Spent</span>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(customer.total_spent, settings.currency_symbol)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Orders</span>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {customer.total_orders}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setViewHistoryCustomer(customer);
                      setHistoryTab('SALES');
                    }}
                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Orders & Receipts</span>
                  </button>

                  {/* RECORD PAYMENT BUTTON */}
                  <button
                    onClick={() => setPaymentCustomer(customer)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-xs ${
                      hasDue
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentCustomer && (
        <RecordPaymentModal
          customer={paymentCustomer}
          settings={settings}
          unpaidSales={getCustomerUnpaidSales(paymentCustomer.id)}
          currentBalance={getCustomerCreditBalance(paymentCustomer.id)}
          isOpen={!!paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Official Payment Confirmation Voucher */}
      {activeVoucher && (
        <PaymentVoucherModal
          payment={activeVoucher.payment}
          remainingBalance={activeVoucher.remainingBalance}
          settings={settings}
          isOpen={!!activeVoucher}
          onClose={() => setActiveVoucher(null)}
        />
      )}

      {/* Add / Edit Customer Modal */}
      {modalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Customer / Farmer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="e.g. Samuel Kariuki"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="e.g. 0722 000 000"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Farm Location / Village
                </label>
                <input
                  type="text"
                  value={editingCustomer.location || ''}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, location: e.target.value })
                  }
                  placeholder="e.g. Kikuyu, Kiambu County"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="e.g. Buys 5 bags Layers Mash every fortnight"
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase & Payment History Modal */}
      {viewHistoryCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewHistoryCustomer.name}'s Account History
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>
                    Credit Due:{' '}
                    <strong
                      className={`font-mono ${
                        getCustomerCreditBalance(viewHistoryCustomer.id) > 0
                          ? 'text-amber-800 font-bold'
                          : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrency(
                        getCustomerCreditBalance(viewHistoryCustomer.id),
                        settings.currency_symbol
                      )}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total Spent:{' '}
                    <strong className="font-mono text-slate-800">
                      {formatCurrency(viewHistoryCustomer.total_spent, settings.currency_symbol)}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewHistoryCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs: Sales vs Payments */}
            <div className="flex items-center gap-2 mt-4 border-b border-slate-200 pb-2 text-xs">
              <button
                onClick={() => setHistoryTab('SALES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  historyTab === 'SALES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Sales & Orders ({customerSales.length})</span>
              </button>

              <button
                onClick={() => setHistoryTab('PAYMENTS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  historyTab === 'PAYMENTS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Recorded Payments ({customerPaymentsList.length})</span>
              </button>
            </div>

            {/* Sales Tab */}
            {historyTab === 'SALES' && (
              <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {customerSales.map((sale) => {
                  const isCredit = sale.payment_method === 'ON_CREDIT';
                  const paid = sale.amount_paid ?? (isCredit ? 0 : sale.total);
                  const remaining = Math.max(0, sale.total - paid);

                  return (
                    <div key={sale.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{sale.receipt_number}</span>
                          {isCredit && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                remaining <= 0.001
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {remaining <= 0.001
                                ? 'Credit Paid Off'
                                : `Credit Due: ${formatCurrency(remaining, settings.currency_symbol)}`}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{formatDate(sale.created_at)}</div>
                        <div className="text-slate-600 mt-1">
                          {sale.items.map((i) => `${i.quantity} × ${i.product_name}`).join(', ')}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm text-slate-900">
                          {formatCurrency(sale.total, settings.currency_symbol)}
                        </div>
                        <button
                          onClick={() => {
                            setViewHistoryCustomer(null);
                            onShowReceipt(sale);
                          }}
                          className="text-blue-600 font-semibold hover:underline mt-1 inline-block"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  );
                })}

                {customerSales.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    No sales recorded for this customer yet.
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {historyTab === 'PAYMENTS' && (
              <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {customerPaymentsList.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{p.payment_number}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded">
                          {p.payment_method.replace('_', ' ')}
                        </span>
                        {p.reference && (
                          <span className="text-[10px] text-slate-500 font-mono">Ref: {p.reference}</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{formatDateTime(p.created_at)}</div>
                      {p.notes && <div className="text-slate-600 italic mt-0.5">{p.notes}</div>}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-emerald-700">
                        + {formatCurrency(p.amount, settings.currency_symbol)}
                      </div>
                      <button
                        onClick={() => {
                          setActiveVoucher({
                            payment: p,
                            remainingBalance: getCustomerCreditBalance(viewHistoryCustomer.id),
                          });
                        }}
                        className="text-blue-600 font-semibold hover:underline mt-1 inline-block"
                      >
                        View Voucher
                      </button>
                    </div>
                  </div>
                ))}

                {customerPaymentsList.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    No payments recorded for this customer yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
