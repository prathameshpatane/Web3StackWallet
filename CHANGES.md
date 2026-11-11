# Web3StackWallet — Changelog & Technical Resolution Log

This document details all technical issues identified, troubleshot, and resolved across the **Web3StackWallet** platform, covering both the Next.js frontend (`cryptovault/`) and the Django REST backend (`cryptovault-backend/`).

---

## 1. Frontend Enhancements & Fixes (`cryptovault/`)

### A. Missing Pages & Route Implementation (Fixed 404 Errors)
* **New Page — Profile & Security Settings (`/settings`)**:
  - Implemented `cryptovault/src/app/(dashboard)/settings/page.tsx`.
  - **User Profile Management**: Allows updating First Name, Last Name, Mobile Number, and Username.
  - **Account Status Card**: Displays live KYC verification status badge, USD cash balance, and account creation date.
  - **Password Change Module**: Secure form with validation for current password, new password, and password confirmation.
* **New Page — Notification Center (`/notifications`)**:
  - Implemented `cryptovault/src/app/(dashboard)/notifications/page.tsx`.
  - **Multi-Level Filtering**: Filter notifications by read status (`All`, `Unread`, `Read`) and event categories (`KYC`, `Buy Orders`, `Sell Orders`, `Withdrawals`, `System Announcements`).
  - **Interactive Actions**: Individual mark-as-read toggle, bulk "Mark all as read" button, and actionable deep links taking users directly to related dashboard pages (`/wallet`, `/kyc`, `/buy-sell`).

### B. Navigation & Header Improvements
* **Header Notification Bell**: Updated `cryptovault/src/components/NotificationBell.tsx` to use Next.js `<Link>` for fast client-side navigation with auto-closing dropdowns.
* **Layout Titles**: Registered `/settings` and `/notifications` inside `PAGE_TITLES` in `cryptovault/src/app/(dashboard)/layout.tsx`.
* **Dynamic Admin Redirect**: Updated `cryptovault/src/app/admin/page.tsx` to replace hardcoded external Vercel URLs with dynamic environment variables (`NEXT_PUBLIC_ADMIN_URL` or fallback to `${NEXT_PUBLIC_API_URL}/admin/`).

### C. Portfolio Visuals & Re-render Bug Fixes (`/portfolio`)
* **Deterministic Color Palette**: Replaced non-deterministic `Math.random()` color assignments with a dedicated token palette (`COIN_COLORS`) in `cryptovault/src/app/(dashboard)/portfolio/page.tsx`, eliminating color flicker between re-renders.
* **Filter Toggle**: Added an interactive toggle between "Owned Assets Only" and "Show All Supported Assets".
* **Fixed Unreachable Empty State**: Corrected empty state logic which was previously dead code because zero-balance wallets were provisioned for all coins.
* **Number Formatting Hardening**: Enhanced `fmt()` to handle `null`, `undefined`, and string amounts safely without returning `NaN`.

### D. Next.js 16 Build & Dev Performance
* **Removed Obsolete Middleware**: Deleted empty `src/middleware.ts` passthrough that triggered Next.js 16 deprecation warnings.
* **Build Concurrency Fix**: Configured `experimental: { cpus: 1 }` in `cryptovault/next.config.ts` to prevent Windows filesystem locking race conditions (`EPERM`) during static prerendering.
* **Developer Script**: Added `"dev": "next dev --webpack"` in `cryptovault/package.json` for smooth Windows local development.

---

## 2. Backend Enhancements & Security Fixes (`cryptovault-backend/`)

### A. Authentication & User Profile Management
* **Password Change Endpoint**: Created `ChangePasswordView` at `/api/auth/change-password/` with `ChangePasswordSerializer` enforcing Django's standard password validators (`cryptovault-backend/users/views.py`, `serializers.py`, `urls.py`).
* **Name Fields Support**: Updated `UserSerializer` and `ProfileView.update` to support retrieving and updating `first_name` and `last_name`.
* **Frontend Integration**: Added `updateProfile` and `changePassword` methods to `cryptovault/src/lib/api.ts` and wired them to Zustand store in `cryptovault/src/store/authStore.ts`.

### B. KYC Verification & Admin Synchronization
* **Detail View Status Sync**: Fixed `KYCAdmin.save_model` in `cryptovault-backend/kyc/admin.py` to synchronize `user.is_kyc_verified` and `user.kyc_status` during single-record admin detail edits (previously only handled in bulk actions).
* **Automated KYC Notifications**: Added automatic `Notification` triggers for both approvals and rejections with rejection reason details.

### C. Buy & Sell Order Workflows
* **Decimal Precision**: Fixed `_approve_buy_request` in `cryptovault-backend/wallet/admin.py` to use `decimal.Decimal('0.001')` instead of floating-point multiplication, preventing runtime `TypeError`.
* **Buy Notifications**: Added automated user notifications upon admin approval and rejection of buy requests.
* **Sell Notifications**: Added automated user notification dispatch inside `sell_coin` atomic transaction in `cryptovault-backend/wallet/views.py`.

### D. Withdrawal Processing & Refund Signals
* **Automated Cancellation Refund & Notification**: Extended `refund_on_withdrawal_cancel` pre-save signal in `cryptovault-backend/transactions/signals.py` to dispatch an automatic notification to the user when an admin cancels a withdrawal and refunds USD back to their cash balance.
* **Admin Actions**: Synchronized withdrawal approval and cancellation notifications in `cryptovault-backend/transactions/admin.py`.

### E. Automatic Wallet Provisioning & Admin Coin Management
* **User Detail Inline Table**: Added `UserWalletInline` to `cryptovault-backend/users/admin.py`, displaying a live table of all 20 cryptocurrencies directly on every User's admin page with directly editable balances, USD value calculations, and wallet addresses.
* **Inline Table Editing in User Wallets**: Added `list_editable = ('balance',)` to `WalletAdmin` in `cryptovault-backend/wallet/admin.py` allowing bulk edits directly in the list table.
* **Graceful Add / Update Handling**: Implemented `UserWalletAdminForm` and `save_model` in `WalletAdmin` so selecting an existing user and coin updates their balance seamlessly instead of failing with a unique constraint error.
* **Bulk Wallet Initialization Action**: Added `initialize_all_wallets` action in `UserAdmin` to ensure all 20 coins exist for any selected user with a single click.
* **Missing Coin Provisioning**: Updated `WalletListView.get_queryset` in `cryptovault-backend/wallet/views.py` to automatically bulk-create 0-balance `UserWallet` records for any newly active coins missing for a user.

### F. Database Configuration & Schema Migration
* **Dual Database Fallback**: Enhanced `cryptovault-backend/core/settings.py` to automatically fall back to local `BASE_DIR / 'db.sqlite3'` when `DATABASE_URL` is omitted, while retaining production support for Neon Serverless PostgreSQL with `ssl_require=True` and `DISABLE_SERVER_SIDE_CURSORS = True`.
* **Schema Alignment**: Aligned local SQLite schema columns from legacy INR fields (`inr_balance`, `current_price_inr`) to modern USD fields.
* **Migration 0006**: Generated missing migration `cryptovault-backend/wallet/migrations/0006_alter_userwallet_wallet_address.py` to ensure schema integrity across all environments.
* **Windows Console Encoding**: Resolved CP1252 `UnicodeEncodeError` in `cryptovault-backend/users/management/commands/initialize_wallets.py`.

---

## 3. Automated Test Suite Addition

Implemented a 12-test automated unit test suite across all four backend domains:

| Test File | Test Case | Functionality Verified |
|---|---|---|
| `users/tests.py` | `test_user_registration_and_login` | User creation, JWT token generation, email-based auth |
| `users/tests.py` | `test_user_profile_update` | Updating first name, last name, and mobile number |
| `users/tests.py` | `test_change_password` | Incorrect password rejection, password change, new password auth |
| `wallet/tests.py` | `test_wallet_auto_provisioning` | Automatic wallet creation for active coins |
| `wallet/tests.py` | `test_buy_request_and_admin_approval` | Buy request submission, admin approval, balance crediting, notification |
| `wallet/tests.py` | `test_buy_request_rejection_action` | Admin bulk rejection, rejection reason, notification |
| `wallet/tests.py` | `test_sell_coin_flow` | Coin debit, USD cash balance credit, transaction log, notification |
| `kyc/tests.py` | `test_kyc_submission_and_status` | Initial submission, status endpoint retrieval |
| `kyc/tests.py` | `test_kyc_approval_sync` | Flag synchronization (`is_kyc_verified=True`), notification |
| `kyc/tests.py` | `test_kyc_rejection_and_resubmission` | Rejection handling, rejection notice, resubmission flow |
| `transactions/tests.py` | `test_withdraw_inr_flow` | USD debit, pending withdrawal transaction, INR calculation |
| `transactions/tests.py` | `test_withdrawal_cancellation_refund_signal` | Pre-save auto-refund signal, USD restoration, refund notification |
| `wallet/tests.py` | `test_admin_add_or_update_wallet` | Admin graceful add or update of existing user coin wallet balance |

**Test Result**: `Ran 13 tests in 15.764s — OK (0 failures, 0 errors)`.

---

## 4. Live Coin Prices & Real-Time Portfolio Updates
* **Backend Stale-Price Auto Refresh**: Added `auto_refresh_if_stale(120)` in `cryptovault-backend/coins/views.py`. When `MarketListView` or `WalletListView` is called, prices older than 2 minutes are automatically synchronized from CoinGecko in the background without blocking users.
* **Automatic Portfolio Recalculation**: `WalletListView` recalculates `value_in_usd` and `value_in_inr` using live coin rates dynamically.
* **Frontend 25-Second Polling & Manual Sync**: Implemented periodic background synchronization and a manual "Sync Live" button on the user dashboard.

---

## 5. Admin Panel Coin Balance Management Options
* **User Profile Inline Editing**: Added `UserWalletInline` on `UserAdmin` (`Users > Users > [User]`) with auto-provisioning of all 20 coins upon opening the user's page, allowing direct balance modification.
* **Inline Editable Table in User Wallets**: Added `list_editable = ('balance',)` on `WalletAdmin` (`Wallet > User wallets`), allowing quick bulk edits across all users and coins directly in the table.
* **Duplicate Prevention & Graceful Updates**: Integrated `UserWalletAdminForm` and `save_model` so adding an existing user + coin updates the balance seamlessly instead of failing with a unique constraint error.
* **Bulk Admin Actions**: Added `add_10_coins`, `add_100_coins`, and `reset_balance_zero` actions in `WalletAdmin`.

---

## 6. Attractive Web3 User Dashboard Redesign
* **Glassmorphism Hero Banner**: Aurora gradient glow, dynamic greeting, KYC verification chip, and live net worth display with instant **USD ↔ INR** currency switcher.
* **Live Market Ticker Strip**: Real-time scrolling horizontal strip of top cryptocurrencies with price and 24h percentage badges.
* **4 Stat Metric Cards**: Glassmorphism cards with hover elevation showing USD Cash Balance, Total Crypto Portfolio, 24h Crypto P&L, and Active Holdings Count.
* **Interactive Asset Table**: Tab toggling between "My Holdings" and "All 20 Crypto Assets", live search filtering, coin badges, real-time USD/INR values, and direct "Buy" / "Sell" quick actions.
* **Recent Activity Feed**: Real-time snapshot of the user's latest buy, sell, and withdrawal transactions with status pills.
* **Live Pulse Indicator**: Animated glowing emerald green radar dot indicating real-time data connection.

---

## 7. Verification & Production Build Status

- **Django System Check**: `python manage.py check` — **0 issues**.
- **Backend Test Suite**: 13 of 13 tests passed.
- **Frontend TypeScript Check**: `npx tsc --noEmit` — **0 errors**.
- **Next.js Production Build**: All 18 application routes compiled and prerendered cleanly.

