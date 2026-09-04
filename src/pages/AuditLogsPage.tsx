import React, { useState, useMemo } from 'react';
import { AuditLog, BusinessSettings } from '../types';
import { formatDateTime } from '../utils/formatters';
import { History, Search, Shield, Filter } from 'lucide-react';

interface AuditLogsPageProps {
  logs: AuditLog[];
  settings: BusinessSettings;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return logs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entity_name !== entityFilter) return false;
      if (!term) return true;
      return (
        log.action.toLowerCase().includes(term) ||
        log.entity_name.toLowerCase().includes(term) ||
        log.user_name.toLowerCase().includes(term) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(term))
      );
    });
  }, [logs, entityFilter, searchTerm]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          System Audit Trail & Compliance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Tamper-evident logs of stock counts, pricing updates, sales voiding, and cash reconciliations
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by user, action, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="w-full md:w-56 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">All Entities</option>
          <option value="SALE">Sales</option>
          <option value="PRODUCT">Products & Prices</option>
          <option value="INVENTORY">Inventory & Stock</option>
          <option value="PURCHASE">Purchases</option>
          <option value="STOCK_COUNT">Physical Counts</option>
          <option value="SETTINGS">Settings</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold font-sans">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-800">{log.user_name}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action.includes('VOID')
                          ? 'bg-rose-100 text-rose-800'
                          : log.action.includes('ADJUST')
                          ? 'bg-amber-100 text-amber-800'
                          : log.action.includes('CREATE')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-sans font-semibold text-slate-700">
                    {log.entity_name}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-600 max-w-md truncate">
                    {log.details ? (
                      <span title={JSON.stringify(log.details, null, 2)}>
                        {typeof log.details === 'object'
                          ? Object.entries(log.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ')
                          : String(log.details)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No audit records matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
