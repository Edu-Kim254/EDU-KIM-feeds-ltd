# Animal Feeds Shop Management System

> Production-ready Point of Sale (POS), Multi-Bag Inventory Management, Farmer Credit Ledger, and Business Analytics System tailored for animal feeds, agrovet, and farm inputs retail businesses in Kenya and East Africa.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)

---

## 🌟 Key Features

### 1. Point of Sale (POS) & Quick Checkout
- **Instant search & barcode scanning** across dairy meals, pig feeds, poultry feeds, concentrates, and veterinary inputs.
- **Multiple payment methods**: Cash, M-Pesa Paybill / Till Number, Bank Transfer, and On-Credit sales.
- **58mm / 80mm thermal receipt generator** with customizable headers, footers, and receipt numbering.
- **Sale voiding and return workflow** with manager audit logs and automatic stock reversal.

### 2. Multi-Packaging & Feed Conversion Engine
- Sell feeds in **standard manufacturer bags** (70 KG, 50 KG, 20 KG, 10 KG) or **loose retail scoops** (per KG).
- Dedicated cost and selling price per package tier with instant margin calculation.
- Automatically calculates and deducts inventory from the single unified base unit stock (KG).

### 3. Inventory Control & Physical Stock Reconciliations
- Real-time inventory tracking with **low-stock alerts** and minimum safety bag thresholds.
- Batch adjustment and physical stock counting module with variance tracking.
- Immutable inventory movement audit trail (`PURCHASE_IN`, `SALE_OUT`, `PHYSICAL_COUNT`, `SALE_VOID_REVERSAL`).

### 4. Feed Millers & Supplier Restocks
- Purchase order recording with supplier invoices, bag quantities, and cost prices.
- Automatically increments warehouse stock upon receiving orders.
- Tracks millers/suppliers, contact persons, and lifetime purchase volume.

### 5. Registered Farmers & Credit Accounts (Mkulima Ledger)
- Customer directory tracking purchase history, frequency, and contact details.
- **Farmer credit accounts**: issue feeds on credit, set limits, and track outstanding balances.
- **Payment vouchers**: record partial or full credit settlements (Cash/M-Pesa) and allocate payments against outstanding invoices.

### 6. Expenses, Accounting & Profit Analytics
- Operational expense tracking categorized by Rent, Transport/Offloading, Salaries, Utilities, Licenses, and Maintenance.
- Real-time gross profit calculation per item and per transaction.
- Daily, weekly, and monthly sales summaries with revenue, net profit, and expense breakdowns.

### 7. Supabase Cloud PostgreSQL Sync & Offline-First Resilience
- Built with an **offline-first local cache**: the shop POS continues processing sales even if the internet drops.
- Two-way real-time synchronization with Supabase PostgreSQL.
- Row Level Security (RLS) enabled across all 15 business tables.
- PostgreSQL atomic transactions (`record_sale_transaction`, `record_purchase_transaction`) to guarantee data integrity.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Build Tool**: Vite 6
- **Database**: Supabase (PostgreSQL 15+) with Row Level Security (RLS) & Realtime WebSocket channels
- **Architecture**: Single-Page Application (SPA) with Offline-First Local Cache

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A free [Supabase](https://supabase.com) account (optional, for cloud backup)

### 1. Clone the Repository
```bash
git clone https://github.com/Edu-Kim254/animal-feeds-shop-management-system.git
cd animal-feeds-shop-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials (found in **Supabase Dashboard → Project Settings → API**):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

> **Security Note**: Never commit `.env` or `.env.local` to Git. Only public anon/publishable keys are exposed to the client. Keep service role keys and database passwords private.

### 4. Database Setup (Supabase)
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Open the file `supabase/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. All 15 database tables, foreign keys, RLS policies, and atomic transaction functions will be created automatically.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory, ready to be hosted on Vercel, Netlify, Cloud Run, or any static hosting service.

---

## 📁 Project Structure

```
├── public/                 # Static assets & icons
├── src/
│   ├── components/         # Reusable UI modules
│   │   ├── common/         # Receipt modal, toasts, badges
│   │   ├── layout/         # Header, sidebar, mobile navigation
│   │   └── supabase/       # Cloud sync dashboard & schema preview
│   ├── lib/                # Supabase client & URL normalization
│   ├── pages/              # Application pages
│   │   ├── DashboardPage.tsx     # KPI metrics & quick stats
│   │   ├── POSPage.tsx           # Cashier checkout & receipting
│   │   ├── ProductsPage.tsx      # Feeds catalog & package pricing
│   │   ├── InventoryPage.tsx     # Stock levels, movements & restock
│   │   ├── StockCountPage.tsx    # Physical audit & count variance
│   │   ├── SalesHistoryPage.tsx  # Receipts, refunds & voiding
│   │   ├── CustomersPage.tsx     # Farmer credit ledger & vouchers
│   │   ├── SuppliersPage.tsx     # Millers & purchase orders
│   │   ├── ExpensesPage.tsx      # Operating expenditure logs
│   │   ├── ReportsPage.tsx       # Profit & loss, sales trends
│   │   ├── UsersPage.tsx         # Staff accounts & permissions
│   │   └── SettingsPage.tsx      # Shop branding, receipt headers & cloud sync
│   ├── services/
│   │   ├── store.ts              # Core local business logic & state
│   │   └── supabaseSync.ts       # Two-way Supabase replication engine
│   ├── types.ts            # TypeScript interfaces & domain types
│   ├── utils/              # Thermal print formatting, CSV exports
│   ├── App.tsx             # Root component & realtime listeners
│   └── main.tsx            # React application entry point
├── supabase/
│   └── schema.sql          # PostgreSQL migration script & RLS policies
├── .env.example            # Sample environment variables documentation
├── .gitignore              # Production git exclusion rules
├── package.json            # Project manifest & dependencies
└── vite.config.ts          # Vite build configuration
```

---

## 🔒 Security Best Practices

- **Zero Hardcoded Secrets**: No database passwords or private service-role keys exist in this codebase.
- **Row Level Security (RLS)**: PostgreSQL policies prevent unauthorized data mutations.
- **URL Normalization**: Built-in sanitization prevents double-path routing errors against PostgREST.
- **Client Fallback**: Gracefully falls back to browser localStorage if offline, syncing when the connection is restored.

---

## 📄 License
This project is licensed under the MIT License.
