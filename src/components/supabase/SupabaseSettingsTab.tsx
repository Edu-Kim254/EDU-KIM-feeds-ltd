import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  Code2,
  KeyRound,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
} from '../../lib/supabase';
import {
  uploadAllToSupabase,
  downloadAllFromSupabase,
  SyncProgress,
} from '../../services/supabaseSync';
import {
  BusinessSettings,
  Product,
  ProductCategory,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  InventoryMovement,
  CustomerPayment,
  UserProfile,
} from '../../types';

interface SupabaseSettingsTabProps {
  settings: BusinessSettings;
  users: UserProfile[];
  categories: ProductCategory[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  customerPayments: CustomerPayment[];
  purchases: Purchase[];
  expenses: Expense[];
  movements: InventoryMovement[];
  onCloudDataPulled: (cloudData: any) => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SupabaseSettingsTab: React.FC<SupabaseSettingsTabProps> = ({
  settings,
  users,
  categories,
  suppliers,
  products,
  customers,
  sales,
  customerPayments,
  purchases,
  expenses,
  movements,
  onCloudDataPulled,
  onToast,
}) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.anonKey);

  // Connection testing state
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
    tablesFound?: boolean;
  }>({ tested: false });

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'upload' | 'download' | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  // UI toggles
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Check initial connection on mount if configured
  useEffect(() => {
    if (config.isConfigured) {
      handleTestConnection(false);
    }
  }, []);

  const handleTestConnection = async (showToastFeedback = true) => {
    setTesting(true);
    const result = await testSupabaseConnection();
    setTesting(false);
    setConnectionStatus({
      tested: true,
      success: result.success,
      message: result.message,
      tablesFound: result.tablesFound,
    });

    if (showToastFeedback) {
      if (result.success && result.tablesFound) {
        onToast('Supabase connection verified! Database is ready.', 'success');
      } else if (result.success && !result.tablesFound) {
        onToast('Supabase connected, but SQL tables are not yet created.', 'info');
      } else {
        onToast(result.message, 'error');
      }
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.startsWith('https://')) {
      onToast('Supabase URL must start with https://', 'error');
      return;
    }
    if (keyInput.trim().length < 20) {
      onToast('Supabase Anon Key is too short. Please provide the full anon key.', 'error');
      return;
    }

    saveSupabaseConfig(urlInput, keyInput);
    const newConfig = getSupabaseConfig();
    setConfig(newConfig);
    onToast('Supabase configuration saved! Testing connection...', 'info');
    handleTestConnection(true);
  };

  const handleClearCredentials = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setConfig(getSupabaseConfig());
    setConnectionStatus({ tested: false });
    onToast('Supabase credentials disconnected. Offline storage is active.', 'info');
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    onToast('Complete Supabase SQL schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const handleUploadAll = async () => {
    if (!config.isConfigured) {
      onToast('Please configure Supabase URL and Anon Key before syncing.', 'error');
      return;
    }

    setSyncing(true);
    setSyncType('upload');
    setProgress({ stage: 'Initiating upload to Supabase...', current: 0, total: 11, percentage: 5 });

    try {
      const result = await uploadAllToSupabase(
        {
          settings,
          users,
          categories,
          suppliers,
          products,
          customers,
          sales,
          customerPayments,
          purchases,
          expenses,
          movements,
        },
        (p) => setProgress(p)
      );

      setSyncing(false);
      if (result.success) {
        onToast('All shop data, feeds catalog, and transactions synced to Supabase!', 'success');
      } else {
        onToast(result.message, 'error');
      }
    } catch (err: any) {
      setSyncing(false);
      onToast(err.message || 'Sync failed', 'error');
    }
  };

  const handleDownloadAll = async () => {
    if (!config.isConfigured) {
      onToast('Please configure Supabase URL and Anon Key first.', 'error');
      return;
    }

    setSyncing(true);
    setSyncType('download');
    setProgress({ stage: 'Fetching all tables from Supabase...', current: 1, total: 1, percentage: 50 });

    try {
      const result = await downloadAllFromSupabase();
      setSyncing(false);
      if (result.success && result.data) {
        onCloudDataPulled(result.data);
        onToast('POS updated with latest data from Supabase Cloud!', 'success');
      } else {
        onToast(result.message, 'error');
      }
    } catch (err: any) {
      setSyncing(false);
      onToast(err.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. STATUS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                config.isConfigured && connectionStatus.success && connectionStatus.tablesFound
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : config.isConfigured && connectionStatus.success && !connectionStatus.tablesFound
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : config.isConfigured
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {config.isConfigured && connectionStatus.success ? (
                <Cloud className="w-6 h-6" />
              ) : (
                <CloudOff className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Supabase Cloud PostgreSQL</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    config.isConfigured && connectionStatus.success && connectionStatus.tablesFound
                      ? 'bg-emerald-100 text-emerald-800'
                      : config.isConfigured && connectionStatus.success && !connectionStatus.tablesFound
                      ? 'bg-amber-100 text-amber-800'
                      : config.isConfigured && connectionStatus.tested && !connectionStatus.success
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {config.isConfigured && connectionStatus.success && connectionStatus.tablesFound
                    ? 'Connected & Ready'
                    : config.isConfigured && connectionStatus.success && !connectionStatus.tablesFound
                    ? 'Connected • Schema Pending'
                    : config.isConfigured && connectionStatus.tested && !connectionStatus.success
                    ? 'Connection Error'
                    : 'Local Cache Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {config.isConfigured
                  ? `Connected to: ${config.url.replace('https://', '').split('.')[0]}.supabase.co (${
                      config.source === 'env' ? 'Configured via .env' : 'Configured via App Settings'
                    })`
                  : 'Offline-First architecture is active. Sales, customer accounts, and stock are saved locally in high-speed browser cache.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.isConfigured && (
              <button
                type="button"
                onClick={() => handleTestConnection(true)}
                disabled={testing || syncing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Connection test result banner */}
        {connectionStatus.tested && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              connectionStatus.success && connectionStatus.tablesFound
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : connectionStatus.success && !connectionStatus.tablesFound
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {connectionStatus.success && connectionStatus.tablesFound ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{connectionStatus.message}</p>
              {connectionStatus.success && !connectionStatus.tablesFound && (
                <button
                  onClick={handleCopySchema}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Schema & Open Editor</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. CREDENTIALS FORM */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Supabase API Credentials</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Obtain your Project URL and public anon key from your Supabase dashboard (Project Settings → API).
          </p>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Supabase Project URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://your-project-ref.supabase.co"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Supabase Public Anon Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              {config.isConfigured && (
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. STEP-BY-STEP SETUP GUIDE & SQL SCHEMA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span>Database Schema & Migration (PostgreSQL)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copy the complete SQL migration script to set up all 15 tables, indexes, and Row Level Security.
            </p>
          </div>

          <button
            onClick={handleCopySchema}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              copiedSchema
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {copiedSchema ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema (1-Click)'}</span>
          </button>
        </div>

        {/* 3 Steps Visual Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Create Project</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">supabase.com</a>, create a free project and select any preferred region.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Execute SQL Script</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Open <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">SQL Editor</a> in Supabase, paste the copied schema, and click <strong>Run</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Sync Shop Records</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Enter your credentials above and click <strong>Push Local Data to Supabase</strong> to seed all feeds and sales!
            </p>
          </div>
        </div>

        {/* Collapsible Schema Preview */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowSchemaPreview(!showSchemaPreview)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview SQL DDL Statements (15 tables, RLS & Indexes)</span>
            </span>
            {showSchemaPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSchemaPreview && (
            <div className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed border-t border-slate-800">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 4. CLOUD SYNCHRONIZATION HUB */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Data Synchronization Hub</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Push local demo feeds, Kenyan bag sizes, and customers to Supabase, or pull cloud transactions down to your POS.
          </p>
        </div>

        {/* Summary Grid of local items ready for cloud push */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Feeds & Products</span>
            <span className="text-lg font-black text-slate-900">{products.length} Items</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered Farmers</span>
            <span className="text-lg font-black text-slate-900">{customers.length} Accounts</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sales & Invoices</span>
            <span className="text-lg font-black text-slate-900">{sales.length} Receipts</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Feed Millers</span>
            <span className="text-lg font-black text-slate-900">{suppliers.length} Suppliers</span>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {syncing && progress && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>{progress.stage}</span>
              </span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Sync Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={syncing || !config.isConfigured}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {syncing && syncType === 'upload' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>{syncing && syncType === 'upload' ? 'Pushing Data to Supabase...' : 'Push All Local Data to Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={syncing || !config.isConfigured}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {syncing && syncType === 'download' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <DownloadCloud className="w-4 h-4 text-slate-500" />
            )}
            <span>{syncing && syncType === 'download' ? 'Pulling Cloud Data...' : 'Pull Cloud Data into POS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
