import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet, useLocation, useNavigate, Navigate } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { AuthGuard, useAuth } from './components/AuthGuard';
import { useState, useEffect, lazy, Suspense, ComponentType } from 'react';
import { useSettings } from './hooks/useQueries';
import Navigation from './components/Navigation';
import InvoiceHistory from './pages/InvoiceHistory';
import ViewInvoice from './pages/ViewInvoice';
import Unauthorized from './pages/Unauthorized';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import GstReports from './pages/GstReports';

const LazyDashboard = lazy(() => import('./pages/Dashboard'));
const LazyCreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const LazySettings = lazy(() => import('./pages/Settings'));
const LazyLedger = lazy(() => import('./pages/Ledger'));
const LazyProfitLoss = lazy(() => import('./pages/ProfitLoss'));

const withSuspense = (Component: ComponentType<any>) => {
  const WrappedComponent = (props: any) => (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs font-bold">Loading panel...</div>}>
      <Component {...props} />
    </Suspense>
  );
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

const DashboardComponent = withSuspense(LazyDashboard);
const CreateInvoiceComponent = withSuspense(LazyCreateInvoice);
const SettingsComponent = withSuspense(LazySettings);
const LedgerComponent = withSuspense(LazyLedger);
const ProfitLossComponent = withSuspense(LazyProfitLoss);
import Employees from './pages/Employees';
import JobWork from './pages/JobWork';
import Production from './pages/Production';
import Collections from './pages/Collections';
import EmployeeLedger from './pages/EmployeeLedger';
import EmployeePayments from './pages/EmployeePayments';
import ProductionReports from './pages/ProductionReports';
import ConsumptionLogs from './pages/ConsumptionLogs';
import FinishedGoodsLogs from './pages/FinishedGoodsLogs';
import StockLedger from './pages/StockLedger';
import OutstandingReport from './pages/OutstandingReport';
import Profile from './pages/Profile';
import SalesOrders from './pages/SalesOrders';
import ProductionPlanning from './pages/ProductionPlanning';
import PurchasePlanning from './pages/PurchasePlanning';
import { PurchaseInvoiceHistory } from './pages/PurchaseInvoiceHistory';
import StockAlerts from './pages/StockAlerts';
import CashBook from './pages/CashBook';
import BankBook from './pages/BankBook';


// Layout component with Navigation
function Layout() {
  return (
    <AuthGuard>
      <LayoutContent />
    </AuthGuard>
  );
}

import { hasDeptAccess, getRoleName } from './utils/auth';

function LayoutContent() {
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');

    const checkRouteAccess = () => {
      const roleName = getRoleName(user);
      
      if (roleName === 'Master Admin') return true; 

      // Define allowed operational routes for Manager / Connected Admin
      const MANAGER_ALLOWED_ROUTES = [
        '/',
        '/create',
        '/history',
        '/invoice',
        '/ledger',
        '/purchases',
        '/inventory',
        '/gst',
        '/profit-loss',
        '/employees',
        '/job-work',
        '/production',
        '/collections',
        '/employee-ledger',
        '/employee-payments',
        '/production-reports',
        '/profile',
        '/unauthorized',
        '/sales',
        '/sales-orders',
        '/production-planning',
        '/purchase-planning',
        '/finance/purchase-invoices',
        '/consumption-logs',
        '/inventory-transactions',
        '/stock-alerts',
        '/cash-book',
        '/bank-book'
      ];

      // Helper to check settings permissions based on path and tab parameters
      const checkSettingsPermissions = () => {
        // Backup / System Config / general settings
        if (pathname.startsWith('/backup') || pathname.startsWith('/system-config') || pathname.startsWith('/settings/backup')) {
          return !!(user.permissions && user.permissions.canBackupRestore);
        }
        // Security / Permission Matrix / User Management
        if (pathname.startsWith('/security') || pathname.startsWith('/permission-matrix') || pathname.startsWith('/user-management') || pathname.startsWith('/users') || pathname.startsWith('/permissions')) {
          return !!(user.permissions && user.permissions.canManageStaff);
        }
        // Audit Logs
        if (pathname.startsWith('/audit-logs')) {
          return !!(user.permissions && user.permissions.canViewLogs);
        }
        // Settings page check (with tab query parameter)
        if (pathname.startsWith('/settings')) {
          if (pathname.startsWith('/settings/costing')) {
            return !!(user.permissions && user.permissions.canBackupRestore);
          }
          if (pathname.startsWith('/settings/profile')) {
            return !!(user.permissions && user.permissions.canBackupRestore);
          }
          if (!tab || tab === 'general') {
            return !!(user.permissions && user.permissions.canBackupRestore);
          }
          if (tab === 'branding' || tab === 'users') {
            return !!(user.permissions && user.permissions.canManageStaff);
          }
          if (tab === 'logs') {
            return !!(user.permissions && user.permissions.canViewLogs);
          }
          if (tab === 'raw-materials' || tab === 'vendors') {
            return true;
          }
          return false;
        }
        return false;
      };

      if (roleName === 'Admin') {
        const isAllowedOperational = MANAGER_ALLOWED_ROUTES.some(
          p => pathname === p || (p !== '/' && pathname.startsWith(p))
        );
        if (isAllowedOperational) return true;
        return checkSettingsPermissions();
      }

      if (roleName === 'Staff') {
        const staffAllowedPaths = [
          '/', 
          '/profile', 
          '/unauthorized', 
          '/inventory', 
          '/inventory/finished-goods-logs', 
          '/production', 
          '/collections', 
          '/employee-ledger', 
          '/employee-payments',
          '/sales-orders',
          '/production-planning',
          '/purchase-planning'
        ];
        const isAllowedOperational = staffAllowedPaths.some(
          p => pathname === p || (p !== '/' && pathname.startsWith(p))
        );
        return isAllowedOperational;
      }

      // Unknown roles/routes: deny by default
      return false;
    };

    if (!checkRouteAccess()) {
      navigate({ to: '/unauthorized', replace: true });
    }
  }, [user, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (settings?.themeColors) {
      const root = document.documentElement;
      if (settings.themeColors === 'maroon-saffron') {
        root.style.setProperty('--primary', '123 15 26');
        root.style.setProperty('--maroon', '123 15 26');
        root.style.setProperty('--saffron', '212 160 23');
        root.style.setProperty('--gold', '212 160 23');
      } else if (settings.themeColors === 'blue-gold') {
        root.style.setProperty('--primary', '30 58 138');
        root.style.setProperty('--maroon', '30 58 138');
        root.style.setProperty('--saffron', '212 160 23');
        root.style.setProperty('--gold', '212 160 23');
      } else if (settings.themeColors === 'emerald-mint') {
        root.style.setProperty('--primary', '16 124 65');
        root.style.setProperty('--maroon', '16 124 65');
        root.style.setProperty('--saffron', '167 243 208');
        root.style.setProperty('--gold', '212 160 23');
      } else if (settings.themeColors === 'charcoal-rose') {
        root.style.setProperty('--primary', '31 41 55');
        root.style.setProperty('--maroon', '31 41 55');
        root.style.setProperty('--saffron', '225 29 72');
        root.style.setProperty('--gold', '212 160 23');
      }
    }
  }, [settings?.themeColors]);

  return (
    <div className="min-h-screen khadi-texture mandala-watermark flex flex-col">
      <Navigation />
      <div className="flex-grow flex flex-col min-h-screen">
        <main className="container mx-auto px-4 py-6 max-w-7xl mt-20 flex-grow animate-in fade-in-50 duration-200">
          <Outlet />
        </main>

        {/* Attribution Footer */}
        <footer className="text-center py-8 text-sm text-[#3A1F12]/60 dark:text-[#F8F2E8]/60">
          <p>
            © {new Date().getFullYear()} {settings?.companyName || "Gujarat Art & Crafts"}. All rights reserved.
          </p>
        </footer>
      </div>
      <Toaster />
    </div>
  );
}

// Create root route with layout
const rootRoute = createRootRoute({
  component: Layout,
});

// Create routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardComponent,
});

const createInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: () => <Navigate to="/sales" replace />,
});

const salesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales',
  component: CreateInvoiceComponent,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: InvoiceHistory,
});

const viewInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoice/$id',
  component: ViewInvoice,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: Unauthorized,
});

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger',
  component: LedgerComponent,
  validateSearch: (search: Record<string, unknown>): { tab?: string; vendorName?: string } => {
    return {
      tab: (search.tab as string) || undefined,
      vendorName: (search.vendorName as string) || undefined,
    };
  },
});

const purchasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchases',
  component: Purchases,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: Inventory,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

const gstRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gst',
  component: GstReports,
});

const profitLossRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profit-loss',
  component: ProfitLossComponent,
});

const employeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employees',
  component: Employees,
});

const jobWorkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/job-work',
  component: JobWork,
});

const productionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production',
  component: Production,
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections',
  component: Collections,
});

const employeeLedgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employee-ledger',
  component: EmployeeLedger,
});

const employeePaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employee-payments',
  component: EmployeePayments,
});

const productionReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production-reports',
  component: ProductionReports,
});

const consumptionLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production/consumption-logs',
  component: () => <Navigate to="/consumption-logs" replace />,
});

const consumptionLogsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/consumption-logs',
  component: ConsumptionLogs,
});

const finishedGoodsLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory/finished-goods-logs',
  component: FinishedGoodsLogs,
});

const stockLedgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory/stock-movements',
  component: () => <Navigate to="/inventory-transactions" replace />,
});

const stockTransactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory-transactions',
  component: StockLedger,
});

const stockAlertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stock-alerts',
  component: StockAlerts,
});

const outstandingReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales/outstanding-report',
  component: OutstandingReport,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: Profile,
});

const backupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/backup',
  component: () => <Navigate to="/settings/backup" search={{ tab: 'general' }} replace />,
});

const securityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/security',
  component: () => <Navigate to="/users" search={{ tab: 'users' }} replace />,
});

const permissionMatrixRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permission-matrix',
  component: () => <Navigate to="/permissions" search={{ tab: 'users' }} replace />,
});

const userManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-management',
  component: () => <Navigate to="/users" search={{ tab: 'users' }} replace />,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: 'users'
  })
});

const permissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permissions',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: 'users'
  })
});

const costingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/costing',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: 'general'
  })
});

const backupNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/backup',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: 'general'
  })
});

const cashBookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cash-book',
  component: CashBook,
});

const bankBookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bank-book',
  component: BankBook,
});

const companyProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/profile',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: 'general'
  })
});

const auditLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit-logs',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || 'logs'
  })
});

const systemConfigRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system-config',
  component: SettingsComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || 'general'
  })
});

const salesOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales-orders',
  component: SalesOrders,
});

const productionPlanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production-planning',
  component: ProductionPlanning,
});

const purchasePlanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchase-planning',
  component: PurchasePlanning,
});

const purchaseInvoiceHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/finance/purchase-invoices',
  component: PurchaseInvoiceHistory,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  createInvoiceRoute,
  salesRoute,
  historyRoute,
  viewInvoiceRoute,
  settingsRoute,
  unauthorizedRoute,
  ledgerRoute,
  purchasesRoute,
  inventoryRoute,
  gstRoute,
  profitLossRoute,
  employeesRoute,
  jobWorkRoute,
  productionRoute,
  collectionsRoute,
  employeeLedgerRoute,
  employeePaymentsRoute,
  productionReportsRoute,
  consumptionLogsRoute,
  consumptionLogsNewRoute,
  finishedGoodsLogsRoute,
  stockLedgerRoute,
  stockTransactionsRoute,
  stockAlertsRoute,
  outstandingReportRoute,
  profileRoute,
  backupRoute,
  securityRoute,
  permissionMatrixRoute,
  userManagementRoute,
  usersRoute,
  permissionsRoute,
  costingRoute,
  backupNewRoute,
  cashBookRoute,
  bankBookRoute,
  companyProfileRoute,
  auditLogsRoute,
  systemConfigRoute,
  salesOrdersRoute,
  productionPlanningRoute,
  purchasePlanningRoute,
  purchaseInvoiceHistoryRoute,
]);

// Create router
const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => <Navigate to="/unauthorized" replace />,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
